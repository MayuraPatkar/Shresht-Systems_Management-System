import { google } from "googleapis";
import fs from "fs";
import path from "path";
import secureStore from "./secureStore";
import logger from "./logger";

const REDIRECT_URI = "http://localhost/oauth2callback";

export class GoogleDriveService {
    /** Build an OAuth2 client using credentials stored in secureStore */
    private static async buildOAuthClient(): Promise<any> {
        const creds = await secureStore.getGoogleCredentials();
        if (!creds || !creds.clientId || !creds.clientSecret) {
            throw new Error("Google credentials not configured. Please enter your Client ID and Client Secret in the Cloud Backup settings.");
        }
        return new google.auth.OAuth2(creds.clientId, creds.clientSecret, REDIRECT_URI);
    }

    static async getAuthUrl(): Promise<string> {
        const client = await this.buildOAuthClient();
        return client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/userinfo.email"
            ]
        });
    }

    static async getOAuthClientWithTokens(): Promise<any> {
        const creds = await secureStore.getGoogleCredentials();
        if (!creds || !creds.clientId || !creds.clientSecret) {
            throw new Error("Google credentials not configured. Please enter your Client ID and Client Secret in the Cloud Backup settings.");
        }

        const tokens = await secureStore.getGoogleDriveTokens();
        if (!tokens) {
            throw new Error("Google account not connected. Please authenticate first.");
        }

        const client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, REDIRECT_URI);
        client.setCredentials(tokens);

        // Automatically save refreshed tokens
        client.on("tokens", async (newTokens: any) => {
            const currentTokens = await secureStore.getGoogleDriveTokens();
            const merged = { ...currentTokens, ...newTokens };
            await secureStore.setGoogleDriveTokens(merged);
            logger.info("Google OAuth tokens refreshed and saved securely.");
        });

        return client;
    }

    static async exchangeCodeForTokens(code: string): Promise<any> {
        const client = await this.buildOAuthClient();
        const { tokens } = await client.getToken(code);
        await secureStore.setGoogleDriveTokens(tokens);
        return tokens;
    }

    static async getUserEmail(client: any): Promise<string> {
        const oauth2 = google.oauth2({ version: "v2", auth: client });
        const userInfo = await oauth2.userinfo.get();
        return userInfo.data.email || "";
    }

    static async getOrCreateFolder(client: any, folderName: string): Promise<string> {
        const drive = google.drive({ version: "v3", auth: client });

        // Query folder
        const response = await drive.files.list({
            q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            spaces: "drive"
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id!;
        }

        // Create folder if it doesn't exist
        const fileMetadata = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder"
        };

        const folder = await drive.files.create({
            requestBody: fileMetadata,
            fields: "id"
        });

        logger.info(`Google Drive folder '${folderName}' created successfully.`);
        return folder.data.id!;
    }

    static async uploadBackupFile(
        client: any,
        filePath: string,
        folderId: string,
        onProgress?: (progress: number) => void
    ): Promise<string> {
        const drive = google.drive({ version: "v3", auth: client });
        const fileName = path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        const totalSize = fileStats.size;

        const media = {
            mimeType: "application/gzip",
            body: fs.createReadStream(filePath)
        };

        const requestBody = {
            name: fileName,
            parents: [folderId]
        };

        const response = await drive.files.create(
            {
                requestBody,
                media,
                fields: "id"
            },
            {
                onUploadProgress: (evt) => {
                    if (onProgress && totalSize > 0) {
                        const pct = Math.min(100, Math.round((evt.bytesRead / totalSize) * 100));
                        onProgress(pct);
                    }
                }
            }
        );

        return response.data.id!;
    }

    static async listBackups(client: any, folderId: string): Promise<any[]> {
        const drive = google.drive({ version: "v3", auth: client });
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "files(id, name, createdTime, size)",
            orderBy: "createdTime desc"
        });

        return (response.data.files || []).map(f => ({
            id: f.id,
            name: f.name,
            createdTime: f.createdTime,
            size: parseInt(f.size || "0", 10)
        }));
    }

    static async downloadBackupFile(client: any, fileId: string, destPath: string): Promise<void> {
        const drive = google.drive({ version: "v3", auth: client });
        const destStream = fs.createWriteStream(destPath);

        const response = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "stream" }
        );

        return new Promise((resolve, reject) => {
            response.data
                .on("end", () => {
                    resolve();
                })
                .on("error", (err) => {
                    reject(err);
                })
                .pipe(destStream);
        });
    }

    static async deleteBackupFile(client: any, fileId: string): Promise<void> {
        const drive = google.drive({ version: "v3", auth: client });
        await drive.files.delete({ fileId });
    }

    static async getStorageUsed(client: any): Promise<number> {
        const drive = google.drive({ version: "v3", auth: client });
        const response = await drive.about.get({
            fields: "storageQuota"
        });
        const quota = response.data.storageQuota;
        return quota ? parseInt(quota.usage || "0", 10) : 0;
    }
}
