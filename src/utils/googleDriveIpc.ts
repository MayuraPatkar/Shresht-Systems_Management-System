import { ipcMain, BrowserWindow, dialog, shell } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import mongoose from "mongoose";
import { spawn } from "child_process";
import { GoogleDriveService } from "./googleDriveService";
import secureStore from "./secureStore";
import logger from "./logger";
import createBackup from "./backup";

// Helper to check if database tools are available
const checkMongoTool = (toolName: string, timeout: number = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
        const checkProcess = spawn(toolName, ['--version']);
        let resolved = false;
        checkProcess.on('error', () => { if (!resolved) { resolved = true; resolve(false); } });
        checkProcess.on('close', (code) => { if (!resolved) { resolved = true; resolve(code === 0); } });
        setTimeout(() => { if (!resolved) { resolved = true; checkProcess.kill(); resolve(false); } }, timeout);
    });
};

export function setupGoogleDriveHandlers(): void {
    const getMainWindow = () => {
        return BrowserWindow.getAllWindows()[0] || null;
    };
    
    // 1. Login Handler
    ipcMain.handle("google-drive:login", async () => {
        try {
            // Build auth URL using stored credentials (throws if not set)
            const authUrl = await GoogleDriveService.getAuthUrl();

            const authWindow = new BrowserWindow({
                width: 550,
                height: 650,
                show: true,
                parent: getMainWindow() || undefined,
                modal: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            authWindow.loadURL(authUrl);

            return new Promise((resolve, reject) => {
                let resolved = false;

                const handleCallback = async (url: string) => {
                    if (url.startsWith("http://localhost/oauth2callback")) {
                        const rawCode = /code=([^&]*)/.exec(url)?.[1];
                        const rawError = /error=([^&]*)/.exec(url)?.[1];
                        
                        resolved = true;
                        authWindow.destroy();

                        if (rawCode) {
                            try {
                                const code = decodeURIComponent(rawCode);
                                const tokens = await GoogleDriveService.exchangeCodeForTokens(code);
                                const client = await GoogleDriveService.getOAuthClientWithTokens();
                                const email = await GoogleDriveService.getUserEmail(client);

                                // Save connection status in MongoDB
                                const Settings = mongoose.model("Settings");
                                let settings = await Settings.findOne();
                                if (!settings) settings = new Settings({});
                                
                                if (!settings.backup) settings.backup = {};
                                settings.backup.google_drive_connected = true;
                                settings.backup.google_drive_email = email;
                                settings.backup.google_drive_folder_name = "MyApp Backups";
                                settings.updatedAt = new Date();
                                await settings.save();

                                resolve({ success: true, email });
                            } catch (err: any) {
                                logger.error("Failed to exchange auth code:", err);
                                reject(err);
                            }
                        } else if (rawError) {
                            reject(new Error(`Google authentication error: ${rawError}`));
                        } else {
                            reject(new Error("Authentication cancelled or returned empty code."));
                        }
                    }
                };

                authWindow.webContents.on("will-navigate", (event, url) => {
                    handleCallback(url);
                });

                authWindow.webContents.on("will-redirect", (event, url) => {
                    handleCallback(url);
                });

                authWindow.on("close", () => {
                    if (!resolved) {
                        resolve({ success: false, message: "Authentication window closed by user" });
                    }
                });
            });

        } catch (err: any) {
            logger.error("Google Drive Login failed:", err);
            return { success: false, error: err.message };
        }
    });

    // 2. Disconnect Handler
    ipcMain.handle("google-drive:disconnect", async () => {
        try {
            await secureStore.setGoogleDriveTokens({});
            
            const Settings = mongoose.model("Settings");
            const settings = await Settings.findOne();
            if (settings && settings.backup) {
                settings.backup.google_drive_connected = false;
                settings.backup.google_drive_email = "";
                settings.updatedAt = new Date();
                await settings.save();
            }

            return { success: true };
        } catch (err: any) {
            logger.error("Failed to disconnect Google Drive:", err);
            return { success: false, error: err.message };
        }
    });

    // 3. Get Status
    ipcMain.handle("google-drive:status", async () => {
        try {
            const Settings = mongoose.model("Settings");
            const settings = await Settings.findOne();
            const backup = settings?.backup || {};

            if (!backup.google_drive_connected) {
                return { success: true, connected: false };
            }

            // Verify client and fetch storage info
            try {
                const client = await GoogleDriveService.getOAuthClientWithTokens();
                const usageBytes = await GoogleDriveService.getStorageUsed(client);
                
                return {
                    success: true,
                    connected: true,
                    email: backup.google_drive_email || "Connected",
                    folder: backup.google_drive_folder_name || "MyApp Backups",
                    storageUsed: usageBytes,
                    lastBackup: backup.google_drive_last_backup || null,
                    autoUpload: !!backup.google_drive_auto_upload,
                    destination: backup.backup_destination || "local"
                };
            } catch (authErr: any) {
                // If token refresh fails, reset connection state
                logger.warn("Google Drive credentials expired or invalid, disconnecting:", authErr);
                await secureStore.setGoogleDriveTokens({});
                if (settings && settings.backup) {
                    settings.backup.google_drive_connected = false;
                    settings.backup.google_drive_email = "";
                    await settings.save();
                }
                return { success: true, connected: false, error: "Session expired. Please reconnect." };
            }

        } catch (err: any) {
            logger.error("Failed to fetch Google Drive status:", err);
            return { success: false, error: err.message };
        }
    });

    // 4. Toggle Auto Upload
    ipcMain.handle("google-drive:toggle-auto-upload", async (_event, enabled: boolean) => {
        try {
            const Settings = mongoose.model("Settings");
            const settings = await Settings.findOne();
            if (settings && settings.backup) {
                settings.backup.google_drive_auto_upload = enabled;
                await settings.save();
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // 5. Toggle Backup Destination
    ipcMain.handle("google-drive:toggle-destination", async (_event, dest: "local" | "google_drive" | "both") => {
        try {
            const Settings = mongoose.model("Settings");
            const settings = await Settings.findOne();
            if (settings && settings.backup) {
                settings.backup.backup_destination = dest;
                await settings.save();
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });

    // 6. Manual Cloud Backup
    ipcMain.handle("google-drive:backup", async (_event, options?: { isCloudOnly?: boolean }) => {
        let localPath = "";
        try {
            getMainWindow()?.webContents.send("google-drive:progress", { progress: 0, stage: "creating_local" });

            const Settings = mongoose.model("Settings");
            const settings = await Settings.findOne();
            const backupLocation = settings?.backup?.backup_location;

            if (!backupLocation) {
                throw new Error("Backup location not configured. Please set a backup location first.");
            }

            // Create local backup
            const info = await createBackup(backupLocation);
            localPath = info.backupPath;

            getMainWindow()?.webContents.send("google-drive:progress", { progress: 20, stage: "authenticating" });

            const client = await GoogleDriveService.getOAuthClientWithTokens();
            const folderId = await GoogleDriveService.getOrCreateFolder(client, "MyApp Backups");

            getMainWindow()?.webContents.send("google-drive:progress", { progress: 30, stage: "uploading" });

            // Upload
            const fileId = await GoogleDriveService.uploadBackupFile(client, localPath, folderId, (pct) => {
                // Map 0-100% upload progress to 30%-95% overall
                const overall = Math.round(30 + (pct * 0.65));
                getMainWindow()?.webContents.send("google-drive:progress", { progress: overall, stage: "uploading" });
            });

            // Update DB timestamps
            if (settings && settings.backup) {
                settings.backup.google_drive_last_backup = new Date();
                settings.backup.last_backup = new Date();
                await settings.save();
            }

            getMainWindow()?.webContents.send("google-drive:progress", { progress: 100, stage: "completed" });

            // If user wanted cloud only, clean up local file
            if (options?.isCloudOnly) {
                try {
                    fs.unlinkSync(localPath);
                } catch { /* ignore */ }
            }

            return { success: true, fileId, path: localPath };

        } catch (err: any) {
            logger.error("Cloud backup failed:", err);
            getMainWindow()?.webContents.send("google-drive:progress", { progress: 0, stage: "failed", error: err.message });
            return { success: false, error: err.message };
        }
    });

    // 7. List Backups
    ipcMain.handle("google-drive:list-backups", async () => {
        try {
            const client = await GoogleDriveService.getOAuthClientWithTokens();
            const folderId = await GoogleDriveService.getOrCreateFolder(client, "MyApp Backups");
            const files = await GoogleDriveService.listBackups(client, folderId);
            return { success: true, files };
        } catch (err: any) {
            logger.error("Failed to list cloud backups:", err);
            return { success: false, error: err.message };
        }
    });

    // 8. Restore Backup
    ipcMain.handle("google-drive:restore", async (_event, fileId: string, filename: string) => {
        const tempPath = path.join(os.tmpdir(), `shresht-cloud-restore-${Date.now()}-${filename}`);
        try {
            getMainWindow()?.webContents.send("google-drive:progress", { progress: 10, stage: "downloading" });

            const client = await GoogleDriveService.getOAuthClientWithTokens();
            await GoogleDriveService.downloadBackupFile(client, fileId, tempPath);

            getMainWindow()?.webContents.send("google-drive:progress", { progress: 60, stage: "restoring" });

            // Perform DB Restore
            const restoreAvailable = await checkMongoTool("mongorestore");
            if (!restoreAvailable) {
                throw new Error("MongoDB restore tools are not installed.");
            }

            const args = ["--db", "shreshtSystems", "--drop", `--archive=${tempPath}`];
            if (filename.endsWith(".gz")) {
                args.push("--gzip");
            }

            await new Promise<void>((resolve, reject) => {
                const restoreProcess = spawn("mongorestore", args);
                restoreProcess.on("close", (code) => {
                    if (code !== 0) {
                        reject(new Error(`mongorestore failed with exit code ${code}`));
                    } else {
                        resolve();
                    }
                });
                restoreProcess.on("error", (err) => {
                    reject(err);
                });
            });

            // Cleanup
            try { fs.unlinkSync(tempPath); } catch { /* ignore */ }

            getMainWindow()?.webContents.send("google-drive:progress", { progress: 100, stage: "completed" });
            return { success: true };

        } catch (err: any) {
            logger.error("Cloud restore failed:", err);
            try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
            getMainWindow()?.webContents.send("google-drive:progress", { progress: 0, stage: "failed", error: err.message });
            return { success: false, error: err.message };
        }
    });

    // 9. Delete Backup
    ipcMain.handle("google-drive:delete", async (_event, fileId: string) => {
        try {
            const client = await GoogleDriveService.getOAuthClientWithTokens();
            await GoogleDriveService.deleteBackupFile(client, fileId);
            return { success: true };
        } catch (err: any) {
            logger.error("Failed to delete cloud backup:", err);
            return { success: false, error: err.message };
        }
    });

    // 10. Download Backup
    ipcMain.handle("google-drive:download", async (_event, fileId: string, filename: string) => {
        try {
            const saveResult = await dialog.showSaveDialog(getMainWindow()!, {
                title: "Download Cloud Backup",
                defaultPath: path.join(appPaths().downloads || os.homedir(), filename),
                filters: [{ name: "Archive Files", extensions: ["gz", "zip", "bson"] }]
            });

            if (saveResult.canceled || !saveResult.filePath) {
                return { success: false, message: "Download cancelled" };
            }

            const client = await GoogleDriveService.getOAuthClientWithTokens();
            await GoogleDriveService.downloadBackupFile(client, fileId, saveResult.filePath);

            return { success: true, filePath: saveResult.filePath };
        } catch (err: any) {
            logger.error("Failed to download cloud backup:", err);
            return { success: false, error: err.message };
        }
    });
    // 11. Save Google Credentials (Client ID + Secret)
    ipcMain.handle("google-drive:save-credentials", async (_event, clientId: string, clientSecret: string) => {
        try {
            if (!clientId || !clientSecret) {
                return { success: false, error: "Client ID and Client Secret are both required." };
            }
            await secureStore.setGoogleCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
            logger.info("Google Drive credentials saved successfully.");
            return { success: true };
        } catch (err: any) {
            logger.error("Failed to save Google credentials:", err);
            return { success: false, error: err.message };
        }
    });

    // 12. Get Saved Google Credentials (returns masked secret)
    ipcMain.handle("google-drive:get-credentials", async () => {
        try {
            const creds = await secureStore.getGoogleCredentials();
            if (!creds) return { success: true, configured: false };
            return {
                success: true,
                configured: true,
                clientId: creds.clientId,
                // Mask secret: show first 6 chars then asterisks
                clientSecretMasked: creds.clientSecret
                    ? creds.clientSecret.substring(0, 6) + "•".repeat(Math.max(0, creds.clientSecret.length - 6))
                    : ""
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });
}

function appPaths(): any {
    return (global as any).appPaths || {};
}
