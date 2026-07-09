/**
 * Data Backup and Restore Management Component
 */

declare var settingsApi: any;

class SettingsBackup {
    init(): void {
        document.getElementById("export-data-button")?.addEventListener("click", () => this.handleExportData());
        document.getElementById("restore-collection-button")?.addEventListener("click", () => this.handleRestoreCollection());
        document.getElementById("restore-database-button")?.addEventListener("click", () => this.handleRestoreDatabase());
        document.getElementById("manual-backup-button")?.addEventListener("click", () => this.handleManualBackup());
        document.getElementById("manual-backup-open-folder")?.addEventListener("click", () => this.handleOpenBackupFolder());
        document.getElementById("status-backup-shortcut-button")?.addEventListener("click", () => this.handleManualBackup());

        // Google Drive UI listeners
        document.getElementById("gdrive-connect-btn")?.addEventListener("click", () => this.handleGoogleDriveConnect());
        document.getElementById("gdrive-disconnect-btn")?.addEventListener("click", () => this.handleGoogleDriveDisconnect());
        document.getElementById("gdrive-backup-btn")?.addEventListener("click", () => this.handleCloudBackup({ isCloudOnly: true }));
        document.getElementById("manual-backup-cloud")?.addEventListener("click", () => this.handleCloudBackup({ isCloudOnly: true }));
        document.getElementById("manual-backup-both")?.addEventListener("click", () => this.handleCloudBackup({ isCloudOnly: false }));

        // Restore Source Radio Buttons
        const restoreRadios = document.getElementsByName("restore-source");
        restoreRadios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                this.toggleRestoreSource(target.value);
            });
        });

        // Auto Upload Checkboxes
        const autoUploadCheckboxes = ["gdrive-notconnected-auto-upload", "gdrive-connected-auto-upload"];
        autoUploadCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                (window as any).electronAPI.googleDriveToggleAutoUpload(target.checked)
                    .then(() => this.loadLastBackupStatus());
            });
        });

        // History Tabs
        const historyTabButtons = document.querySelectorAll("#history-tabs button");
        historyTabButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const target = e.target as HTMLButtonElement;
                const tab = target.getAttribute("data-tab") || "local";
                this.switchHistoryTab(tab, target);
            });
        });

        // Register Google Drive progress handler
        (window as any).electronAPI.onGoogleDriveProgress((data: any) => this.handleProgressUpdate(data));

        // Export collections checkboxes change events setup
        const exportCheckboxes = document.querySelectorAll('input[name="export-data"]');
        exportCheckboxes.forEach(cb => {
            cb.addEventListener("change", (e) => {
                const checkbox = e.target as HTMLInputElement;
                const card = checkbox.closest('.collection-card');
                if (card) {
                    card.classList.toggle('selected', checkbox.checked);
                }
                this.updateExportButtonState();
            });
        });
        this.updateExportButtonState();

        // Restore Collection Form interactivity
        const collectionSelect = document.getElementById("collection-select") as HTMLSelectElement;
        collectionSelect?.addEventListener("change", () => this.updateRestoreCollectionButtonState());

        const collFileInput = document.getElementById("restore-collection-file") as HTMLInputElement;
        const collFileName = document.getElementById("restore-collection-file-name");
        const collFileRemove = document.getElementById("restore-collection-file-remove");
        const collFileIcon = document.querySelector("#restore-collection-file-name")?.closest('.flex')?.querySelector("i");
        collFileInput?.addEventListener("change", () => {
            if (collFileInput.files && collFileInput.files.length > 0) {
                const file = collFileInput.files[0];
                if (collFileName) collFileName.textContent = `📄 ${file.name}`;
                if (collFileRemove) collFileRemove.classList.remove("hidden");
                const sizeKb = (file.size / 1024).toFixed(1);
                const sizeEl = document.getElementById("restore-collection-file-size");
                if (sizeEl) sizeEl.textContent = `${sizeKb} KB`;
                if (collFileIcon) {
                    collFileIcon.className = "fas fa-file-code text-purple-500 text-sm";
                }
            } else {
                if (collFileName) collFileName.textContent = "No file selected";
                if (collFileRemove) collFileRemove.classList.add("hidden");
                const sizeEl = document.getElementById("restore-collection-file-size");
                if (sizeEl) sizeEl.textContent = "";
                if (collFileIcon) {
                    collFileIcon.className = "fas fa-file-code text-sm";
                }
            }
            this.updateRestoreCollectionButtonState();
        });

        collFileRemove?.addEventListener("click", () => {
            if (collFileInput) collFileInput.value = "";
            if (collFileName) collFileName.textContent = "No file selected";
            collFileRemove.classList.add("hidden");
            const sizeEl = document.getElementById("restore-collection-file-size");
            if (sizeEl) sizeEl.textContent = "";
            if (collFileIcon) {
                collFileIcon.className = "fas fa-file-code text-sm";
            }
            this.updateRestoreCollectionButtonState();
        });

        // Restore Database Form interactivity
        const dbFileInput = document.getElementById("restore-database-file") as HTMLInputElement;
        const dbFileName = document.getElementById("restore-database-file-name");
        const dbFileRemove = document.getElementById("restore-database-file-remove");
        const dbFileIcon = document.querySelector("#restore-database-file-name")?.closest('.flex')?.querySelector("i");
        dbFileInput?.addEventListener("change", () => {
            if (dbFileInput.files && dbFileInput.files.length > 0) {
                const file = dbFileInput.files[0];
                if (dbFileName) dbFileName.textContent = `📄 ${file.name}`;
                if (dbFileRemove) dbFileRemove.classList.remove("hidden");
                const sizeKb = (file.size / 1024).toFixed(1);
                const sizeEl = document.getElementById("restore-database-file-size");
                if (sizeEl) sizeEl.textContent = `${sizeKb} KB`;
                if (dbFileIcon) {
                    dbFileIcon.className = "fas fa-database text-purple-500 text-sm";
                }
            } else {
                if (dbFileName) dbFileName.textContent = "No file selected";
                if (dbFileRemove) dbFileRemove.classList.add("hidden");
                const sizeEl = document.getElementById("restore-database-file-size");
                if (sizeEl) sizeEl.textContent = "";
                if (dbFileIcon) {
                    dbFileIcon.className = "fas fa-database text-sm";
                }
            }
            this.updateRestoreDatabaseButtonState();
        });

        dbFileRemove?.addEventListener("click", () => {
            if (dbFileInput) dbFileInput.value = "";
            if (dbFileName) dbFileName.textContent = "No file selected";
            dbFileRemove.classList.add("hidden");
            const sizeEl = document.getElementById("restore-database-file-size");
            if (sizeEl) sizeEl.textContent = "";
            if (dbFileIcon) {
                dbFileIcon.className = "fas fa-database text-sm";
            }
            this.updateRestoreDatabaseButtonState();
        });

        this.updateRestoreCollectionButtonState();
        this.updateRestoreDatabaseButtonState();

        // === Credentials accordion toggle ===
        const credsToggle = document.getElementById("gdrive-credentials-toggle");
        const credsBody = document.getElementById("gdrive-credentials-body");
        const credsChevron = document.getElementById("gdrive-creds-chevron");
        credsToggle?.addEventListener("click", () => {
            const isHidden = credsBody?.classList.contains("hidden");
            credsBody?.classList.toggle("hidden", !isHidden);
            credsChevron?.classList.toggle("rotate-180", isHidden ?? false);
        });

        // === Show/Hide secret ===
        const toggleSecretBtn = document.getElementById("gdrive-toggle-secret");
        const secretInput = document.getElementById("gdrive-client-secret") as HTMLInputElement;
        toggleSecretBtn?.addEventListener("click", () => {
            const isPassword = secretInput.type === "password";
            secretInput.type = isPassword ? "text" : "password";
            const icon = toggleSecretBtn.querySelector("i");
            if (icon) {
                icon.classList.toggle("fa-eye", !isPassword);
                icon.classList.toggle("fa-eye-slash", isPassword);
            }
        });

        // === Save credentials button ===
        document.getElementById("gdrive-save-credentials-btn")?.addEventListener("click", () => this.handleSaveCredentials());

        // === Setup guide link ===
        document.getElementById("gdrive-setup-guide-link")?.addEventListener("click", (e) => {
            e.preventDefault();
            (window as any).electronAPI.openExternal("https://console.cloud.google.com");
        });

        // Load initial status and history lists
        this.loadLastBackupStatus();
        this.loadLocalBackupsHistory();
        this.loadCloudBackupsHistory();
        this.loadCredentialsStatus();
    }

    checkBackupToolsStatus(): void {
        settingsApi.getBackupStatus()
            .then((data: { success: boolean; tools: Record<string, boolean> }) => {
                if (data.success) {
                    const tools = data.tools;
                    const allToolsAvailable = Object.values(tools).every(available => available);
                    if (!allToolsAvailable) {
                        console.warn('Some MongoDB tools are not available:', tools);
                    }
                }
            })
            .catch((err: any) => {
                console.error('Failed to check backup tools status:', err);
            });
    }

    loadLastBackupStatus(): void {
        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                if (data.success && data.settings) {
                    const s = data.settings;
                    const statusElement = document.getElementById("backup-status");
                    const shortcutBtn = document.getElementById("status-backup-shortcut-button");

                    if (statusElement) {
                        if (s.backup?.last_backup) {
                            const lastBackupDate = new Date(s.backup.last_backup);
                            if (!isNaN(lastBackupDate.getTime())) {
                                statusElement.innerHTML = `Last backup: <span class="font-semibold">${lastBackupDate.toLocaleString()}</span>`;
                                statusElement.className = "text-green-700 font-medium";
                                if (shortcutBtn) shortcutBtn.classList.add("hidden");
                            }
                        } else {
                            statusElement.textContent = "No backup performed yet.";
                            statusElement.className = "text-slate-700 font-semibold text-sm";
                            if (shortcutBtn) shortcutBtn.classList.remove("hidden");
                        }
                    }

                    // Fetch Google Drive connection status
                    (window as any).electronAPI.googleDriveGetStatus()
                        .then((gStatus: any) => {
                            this.renderGoogleDriveStatus(gStatus, s);
                        })
                        .catch((gErr: any) => {
                            console.error("Failed to load Google Drive status:", gErr);
                        });
                }
            })
            .catch((err: any) => {
                console.error('Failed to load last backup status:', err);
            });
    }

    private handleExportData(): void {
        const checkedElements = Array.from(document.querySelectorAll('input[name="export-data"]:checked')) as HTMLInputElement[];
        const exportButton = document.getElementById("export-data-button") as HTMLButtonElement;

        if (checkedElements.length === 0) {
            this.showToast("Please select at least one data type to export.", "error");
            return;
        }

        const originalContent = exportButton.innerHTML;
        exportButton.disabled = true;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

        let loadingToast: HTMLElement | null = null;
        const progressTimeout = setTimeout(() => {
            loadingToast = this.showLoadingToast("Exporting selected collections... please wait.");
        }, 1000);

        const displayNames: Record<string, string> = {
            'customers': 'Customers', 'quotations': 'Quotation', 'suppliers': 'Suppliers',
            'purchaseorders': 'Purchase Order', 'invoices': 'Invoice', 'ewaybills': 'E-Way Bill',
            'services': 'Service', 'purchases': 'Purchases', 'payments': 'Payments', 'stocks': 'Stock'
        };
        const getDisplayName = (value: string) => displayNames[value] || value;

        const promises = checkedElements.map(el => {
            return settingsApi.exportData(el.value)
                .then((data: { success: boolean; cancelled?: boolean; message?: string; fileSize?: number }) => {
                    return { name: el.value, success: data.success, cancelled: !!data.cancelled, message: data.message || '', fileSize: data.fileSize || 0 };
                })
                .catch((err: any) => {
                    return { name: el.value, success: false, cancelled: false, message: err.message, fileSize: 0 };
                });
        });

        Promise.all(promises)
            .then(results => {
                const successExports = results.filter(r => r.success && !r.cancelled);
                const failedExports = results.filter(r => !r.success && !r.cancelled);
                const cancelledExports = results.filter(r => r.cancelled);

                const parts: string[] = [];
                if (successExports.length > 0) {
                    parts.push(`Exported: ${successExports.map(s => `${getDisplayName(s.name)} (${(s.fileSize / 1024).toFixed(2)} KB)`).join(', ')}.`);
                }
                if (failedExports.length > 0) {
                    parts.push(`Failed: ${failedExports.map(f => `${getDisplayName(f.name)} - ${f.message}`).join(', ')}.`);
                }
                if (cancelledExports.length > 0) {
                    parts.push(`Cancelled: ${cancelledExports.map(c => getDisplayName(c.name)).join(', ')}.`);
                }

                if (parts.length > 0) {
                    const hasFailures = failedExports.length > 0;
                    this.showToast(parts.join(' '), hasFailures ? 'error' : 'success');
                }
            })
            .catch((err: any) => {
                this.showToast(`Export failed: ${err.message}`, 'error');
                console.error('Export error:', err);
            })
            .finally(() => {
                clearTimeout(progressTimeout);
                if (loadingToast) {
                    loadingToast.remove();
                }
                exportButton.disabled = false;
                exportButton.innerHTML = originalContent;
                this.updateExportButtonState();
            });
    }

    private handleRestoreCollection(): void {
        const fileInput = document.getElementById("restore-collection-file") as HTMLInputElement;

        if (!fileInput.files || fileInput.files.length === 0) {
            this.showToast("Please select a backup file.", "error");
            return;
        }

        const file = fileInput.files[0];
        const allowedExtensions = ['.json', '.bson', '.gz', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            this.showToast(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`, "error");
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            this.showToast("File size exceeds 100MB limit.", "error");
            return;
        }

        const collectionSelect = document.getElementById("collection-select") as HTMLSelectElement;
        if (!collectionSelect || !collectionSelect.value || collectionSelect.value === "Choose collection") {
            this.showToast("Please select a collection to restore.", "error");
            return;
        }

        const formData = new FormData();
        formData.append("backupFile", file);
        formData.append("collection", collectionSelect.value);

        const restoreButton = document.getElementById("restore-collection-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        let loadingToast: HTMLElement | null = null;
        const progressTimeout = setTimeout(() => {
            loadingToast = this.showLoadingToast(`Restoring collection "${collectionSelect.value}"... please wait.`);
        }, 1000);

        settingsApi.restoreCollection(formData)
            .then((data: { success: boolean; message: string; fileSize?: number }) => {
                if (data.success) {
                    let msg = data.message;
                    if (data.fileSize) {
                        msg += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                    }
                    this.showToast(msg, "success");
                    fileInput.value = "";
                    const collFileName = document.getElementById("restore-collection-file-name");
                    const collFileRemove = document.getElementById("restore-collection-file-remove");
                    const sizeEl = document.getElementById("restore-collection-file-size");
                    if (collFileName) collFileName.textContent = "No file selected";
                    if (collFileRemove) collFileRemove.classList.add("hidden");
                    if (sizeEl) sizeEl.textContent = "";
                    const fileIcon = document.querySelector("#restore-collection-file-name")?.closest('.flex')?.querySelector("i");
                    if (fileIcon) {
                        fileIcon.className = "fas fa-file-code text-sm";
                    }
                } else {
                    this.showToast(`Restore failed: ${data.message}`, "error");
                }
            })
            .catch((err: any) => {
                this.showToast(`Restore failed: ${err.message}`, "error");
                console.error('Restore error:', err);
            })
            .finally(() => {
                clearTimeout(progressTimeout);
                if (loadingToast) {
                    loadingToast.remove();
                }
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
                this.updateRestoreCollectionButtonState();
            });
    }

    private handleRestoreDatabase(): void {
        const fileInput = document.getElementById("restore-database-file") as HTMLInputElement;

        if (!fileInput.files || fileInput.files.length === 0) {
            this.showToast("Please select a backup file.", "error");
            return;
        }

        const file = fileInput.files[0];
        const allowedExtensions = ['.bson', '.gz', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            this.showToast(`Invalid file type for database restore. Allowed types: ${allowedExtensions.join(', ')}`, "error");
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            this.showToast("File size exceeds 100MB limit.", "error");
            return;
        }

        (window as any).electronAPI.showMessageBox({
            type: "warning",
            title: "Restore Database?",
            message: "This operation will permanently replace all existing data.\n\nThis action cannot be undone.",
            buttons: ["Cancel", "Restore Database"],
            cancelId: 0,
            defaultId: 1
        }).then((choice: any) => {
            if (choice.response === 1) {
                this.performDatabaseRestore(file);
            }
        });
    }

    private performDatabaseRestore(file: File): void {
        const formData = new FormData();
        formData.append("backupFile", file);

        const restoreButton = document.getElementById("restore-database-button") as HTMLButtonElement;
        const originalContent = restoreButton ? restoreButton.innerHTML : '';
        if (restoreButton) {
            restoreButton.disabled = true;
            restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';
        }

        let loadingToast: HTMLElement | null = null;
        const progressTimeout = setTimeout(() => {
            loadingToast = this.showLoadingToast("Restoring database... please wait.");
        }, 1000);

        settingsApi.restoreDatabase(formData)
            .then((data: { success: boolean; message: string; warning?: string; fileSize?: number }) => {
                if (data.success) {
                    let msg = data.message;
                    if (data.warning) {
                        msg += ` Warning: ${data.warning}`;
                    }
                    if (data.fileSize) {
                        msg += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                    }
                    this.showToast(msg, "success");
                    const fileInput = document.getElementById("restore-database-file") as HTMLInputElement;
                    if (fileInput) fileInput.value = "";
                    const dbFileName = document.getElementById("restore-database-file-name");
                    const dbFileRemove = document.getElementById("restore-database-file-remove");
                    const sizeEl = document.getElementById("restore-database-file-size");
                    if (dbFileName) dbFileName.textContent = "No file selected";
                    if (dbFileRemove) dbFileRemove.classList.add("hidden");
                    if (sizeEl) sizeEl.textContent = "";
                    const fileIcon = document.querySelector("#restore-database-file-name")?.closest('.flex')?.querySelector("i");
                    if (fileIcon) {
                        fileIcon.className = "fas fa-database text-sm";
                    }
                } else {
                    this.showToast(`Database restore failed: ${data.message}`, "error");
                }
            })
            .catch((err: any) => {
                this.showToast(`Database restore failed: ${err.message}`, "error");
                console.error('Database restore error:', err);
            })
            .finally(() => {
                clearTimeout(progressTimeout);
                if (loadingToast) {
                    loadingToast.remove();
                }
                if (restoreButton) {
                    restoreButton.disabled = false;
                    restoreButton.innerHTML = originalContent;
                }
                this.updateRestoreDatabaseButtonState();
            });
    }

    private handleManualBackup(): void {
        const manualButton = document.getElementById("manual-backup-button") as HTMLButtonElement;
        if (!manualButton) return;

        const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;
        const currentInputValue = backupLocationInput ? backupLocationInput.value.trim() : "";

        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const savedLocation = data.settings?.backup?.backup_location || "";
                const normalizedSaved = (savedLocation === './backups' || savedLocation === '.\\backups') ? "" : savedLocation.trim();

                if (!currentInputValue) {
                    (window as any).electronAPI.showAlert1("Please configure a backup location before creating a backup.");
                    return;
                }

                if (currentInputValue !== normalizedSaved) {
                    (window as any).electronAPI.showAlert1("Please save your backup location before creating a backup.");
                    return;
                }

                const originalContent = manualButton.innerHTML;
                manualButton.disabled = true;
                manualButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating backup...';

                settingsApi.triggerManualBackup()
                    .then((backupData: { success: boolean; message?: string; path?: string; fileSize?: number }) => {
                        if (backupData.success) {
                            let msg = `Backup created: ${backupData.path || ''}`;
                            if (backupData.fileSize) {
                                msg += ` (${(backupData.fileSize / 1024).toFixed(2)} KB)`;
                            }
                            (window as any).electronAPI.showAlert1(msg);
                            this.loadLastBackupStatus();
                        } else {
                            (window as any).electronAPI.showAlert1(`Backup failed: ${backupData.message || 'Unknown error'}`);
                        }
                    })
                    .catch((err: any) => {
                        (window as any).electronAPI.showAlert1(`Backup failed: ${err.message}`);
                        console.error('Manual backup error:', err);
                    })
                    .finally(() => {
                        manualButton.disabled = false;
                        manualButton.innerHTML = originalContent;
                    });
            })
            .catch((err: any) => {
                console.error('Failed to check preferences:', err);
                (window as any).electronAPI.showAlert1("Failed to verify backup settings. Please try again.");
            });
    }

    private handleOpenBackupFolder(): void {
        const openButton = document.getElementById("manual-backup-open-folder") as HTMLButtonElement;
        if (!openButton || !(window as any).electronAPI || !(window as any).electronAPI.openBackupFolder) {
            (window as any).electronAPI.showAlert1('Open folder not available in this environment');
            return;
        }

        const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;
        const currentInputValue = backupLocationInput ? backupLocationInput.value.trim() : "";

        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const savedLocation = data.settings?.backup?.backup_location || "";
                const normalizedSaved = (savedLocation === './backups' || savedLocation === '.\\backups') ? "" : savedLocation.trim();

                if (!currentInputValue) {
                    (window as any).electronAPI.showAlert1("Please configure a backup location before opening backup folder.");
                    return;
                }

                if (currentInputValue !== normalizedSaved) {
                    (window as any).electronAPI.showAlert1("Please save your backup location before opening backup folder.");
                    return;
                }

                openButton.disabled = true;
                openButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';

                (window as any).electronAPI.openBackupFolder()
                    .then((result: { success: boolean; message?: string }) => {
                        if (!result || !result.success) {
                            const msg = (result && result.message) ? result.message : 'Failed to open backup folder';
                            (window as any).electronAPI.showAlert1(msg);
                        }
                    })
                    .catch((err: any) => {
                        console.error('Open backup folder error:', err);
                        (window as any).electronAPI.showAlert1('Failed to open backup folder: ' + (err.message || err));
                    })
                    .finally(() => {
                        openButton.disabled = false;
                        openButton.innerHTML = '<i class="fas fa-folder-open"></i> Open Backup Folder';
                    });
            })
            .catch((err: any) => {
                console.error('Failed to check preferences:', err);
                (window as any).electronAPI.showAlert1("Failed to verify backup settings. Please try again.");
            });
    }

    // Google Drive Connect/Disconnect handlers
    private handleGoogleDriveConnect(): void {
        (window as any).electronAPI.googleDriveLogin()
            .then((res: any) => {
                if (res.success) {
                    (window as any).electronAPI.showAlert1(`Successfully connected Google Account: ${res.email}`);
                    this.loadLastBackupStatus();
                    this.loadCloudBackupsHistory();
                } else if (res.message) {
                    (window as any).electronAPI.showAlert1(res.message);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Failed to connect Google Drive: ${err.message || err}`);
            });
    }

    private handleGoogleDriveDisconnect(): void {
        (window as any).electronAPI.googleDriveDisconnect()
            .then((res: any) => {
                if (res.success) {
                    (window as any).electronAPI.showAlert1("Disconnected Google Account successfully.");
                    this.loadLastBackupStatus();
                    this.loadCloudBackupsHistory();
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to disconnect: ${res.error}`);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Error disconnecting: ${err.message || err}`);
            });
    }

    // Manual Cloud and Both Backup triggers
    private handleCloudBackup(options: { isCloudOnly: boolean }): void {
        const stageLabel = document.getElementById("gdrive-progress-stage");
        const pctLabel = document.getElementById("gdrive-progress-pct");
        const progressBar = document.getElementById("gdrive-progress-bar");
        const progressWrapper = document.getElementById("gdrive-progress-wrapper");

        if (progressWrapper) progressWrapper.classList.remove("hidden");
        if (stageLabel) stageLabel.textContent = "Starting cloud backup...";
        if (pctLabel) pctLabel.textContent = "0%";
        if (progressBar) progressBar.style.width = "0%";

        (window as any).electronAPI.googleDriveBackup(options)
            .then((res: any) => {
                if (res.success) {
                    (window as any).electronAPI.showAlert1(`Cloud Backup created and uploaded successfully! File ID: ${res.fileId}`);
                    this.loadLastBackupStatus();
                    this.loadCloudBackupsHistory();
                    this.loadLocalBackupsHistory();
                } else {
                    (window as any).electronAPI.showAlert1(`Cloud backup failed: ${res.error}`);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Backup failed: ${err.message || err}`);
            })
            .finally(() => {
                setTimeout(() => {
                    if (progressWrapper) progressWrapper.classList.add("hidden");
                }, 2000);
            });
    }

    // Toggle source views
    private toggleRestoreSource(source: string): void {
        const localSec = document.getElementById("restore-local-section");
        const driveSec = document.getElementById("restore-gdrive-section");
        
        if (source === "local") {
            localSec?.classList.remove("hidden");
            driveSec?.classList.add("hidden");
        } else {
            localSec?.classList.add("hidden");
            driveSec?.classList.remove("hidden");
            this.loadCloudBackupsHistory();
        }
    }

    private switchHistoryTab(tab: string, targetButton: HTMLButtonElement): void {
        const localContent = document.getElementById("history-local-content");
        const cloudContent = document.getElementById("history-cloud-content");
        
        // Toggle tab highlights
        const buttons = document.querySelectorAll("#history-tabs button");
        buttons.forEach(b => {
            b.classList.remove("bg-white", "text-slate-805", "shadow-sm");
            b.classList.add("text-slate-650");
        });
        
        targetButton.classList.add("bg-white", "text-slate-805", "shadow-sm");
        targetButton.classList.remove("text-slate-650");

        if (tab === "local") {
            localContent?.classList.remove("hidden");
            cloudContent?.classList.add("hidden");
            this.loadLocalBackupsHistory();
        } else {
            localContent?.classList.add("hidden");
            cloudContent?.classList.remove("hidden");
            this.loadCloudBackupsHistory();
        }
    }

    // Progress updates
    private handleProgressUpdate(data: { progress: number; stage: string; error?: string }): void {
        const stageLabel = document.getElementById("gdrive-progress-stage");
        const pctLabel = document.getElementById("gdrive-progress-pct");
        const progressBar = document.getElementById("gdrive-progress-bar");
        const progressWrapper = document.getElementById("gdrive-progress-wrapper");

        if (progressWrapper) progressWrapper.classList.remove("hidden");

        const stages: Record<string, string> = {
            "creating_local": "Creating local archive database backup...",
            "authenticating": "Connecting to Google Drive service...",
            "uploading": "Uploading compressed archive to Drive...",
            "downloading": "Downloading backup archive from Google Drive...",
            "restoring": "Extracting and restoring database records...",
            "completed": "Backup operation finished successfully!",
            "failed": `Operation failed: ${data.error || 'Unknown Error'}`
        };

        if (stageLabel) stageLabel.textContent = stages[data.stage] || "Processing...";
        if (pctLabel) pctLabel.textContent = `${data.progress}%`;
        if (progressBar) progressBar.style.width = `${data.progress}%`;
    }

    // Google Drive Status Rendering
    private renderGoogleDriveStatus(gStatus: any, pref: any): void {
        const notConnectedCard = document.getElementById("gdrive-not-connected-state");
        const connectedCard = document.getElementById("gdrive-connected-state");

        const backupBtn = document.getElementById("gdrive-backup-btn") as HTMLButtonElement;
        const restoreBtn = document.getElementById("gdrive-restore-btn") as HTMLButtonElement;
        
        const manualCloudBtn = document.getElementById("manual-backup-cloud") as HTMLButtonElement;
        const manualBothBtn = document.getElementById("manual-backup-both") as HTMLButtonElement;

        const isConnected = !!(gStatus && gStatus.connected);

        if (isConnected) {
            notConnectedCard?.classList.add("hidden");
            connectedCard?.classList.remove("hidden");

            const emailEl = document.getElementById("gdrive-email");
            if (emailEl) emailEl.textContent = gStatus.email;

            const folderEl = document.getElementById("gdrive-folder-name");
            if (folderEl) folderEl.textContent = gStatus.folder;

            const storageEl = document.getElementById("gdrive-storage-used");
            if (storageEl) {
                const mb = (gStatus.storageUsed / (1024 * 1024)).toFixed(1);
                storageEl.textContent = `${mb} MB`;
            }

            const lastUploadEl = document.getElementById("gdrive-connected-last-backup");
            if (lastUploadEl) {
                lastUploadEl.textContent = gStatus.lastBackup ? new Date(gStatus.lastBackup).toLocaleString() : "Never";
            }

            const autoUploadCheck = document.getElementById("gdrive-connected-auto-upload") as HTMLInputElement;
            if (autoUploadCheck) autoUploadCheck.checked = !!gStatus.autoUpload;

            if (backupBtn) backupBtn.disabled = false;
            if (restoreBtn) restoreBtn.disabled = false;
            
            if (manualCloudBtn) {
                manualCloudBtn.disabled = false;
                manualCloudBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
            if (manualBothBtn) {
                manualBothBtn.disabled = false;
                manualBothBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
        } else {
            notConnectedCard?.classList.remove("hidden");
            connectedCard?.classList.add("hidden");

            const lastUploadEl = document.getElementById("gdrive-notconnected-last-backup");
            if (lastUploadEl) {
                const lastB = pref.backup?.google_drive_last_backup;
                lastUploadEl.textContent = lastB ? new Date(lastB).toLocaleString() : "Never";
            }

            const autoUploadCheck = document.getElementById("gdrive-notconnected-auto-upload") as HTMLInputElement;
            if (autoUploadCheck) autoUploadCheck.checked = !!pref.backup?.google_drive_auto_upload;

            if (backupBtn) backupBtn.disabled = true;
            if (restoreBtn) restoreBtn.disabled = true;

            if (manualCloudBtn) {
                manualCloudBtn.disabled = true;
                manualCloudBtn.classList.add("opacity-50", "cursor-not-allowed");
            }
            if (manualBothBtn) {
                manualBothBtn.disabled = true;
                manualBothBtn.classList.add("opacity-50", "cursor-not-allowed");
            }
        }
    }

    // Fetch and render Local backups
    private loadLocalBackupsHistory(): void {
        const listBody = document.getElementById("local-backups-history-list");
        if (!listBody) return;

        settingsApi.getLocalBackups()
            .then((res: { success: boolean; files: any[] }) => {
                if (res.success && res.files && res.files.length > 0) {
                    listBody.innerHTML = "";
                    res.files.forEach(f => {
                        const tr = document.createElement("tr");
                        tr.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
                        
                        const sizeKb = (f.size / 1024).toFixed(2);
                        const dateStr = new Date(f.createdTime).toLocaleString();

                        tr.innerHTML = `
                            <td class="py-3 px-4 font-semibold text-slate-700 truncate max-w-[240px]" title="${f.name}">${f.name}</td>
                            <td class="py-3 px-4 text-slate-500">${dateStr}</td>
                            <td class="py-3 px-4 text-slate-650">${sizeKb} KB</td>
                            <td class="py-3 px-4 text-right">
                                <button type="button" class="btn-delete-local text-red-650 hover:text-red-750 font-bold ml-3 cursor-pointer" data-file="${f.name}">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </td>
                        `;
                        listBody.appendChild(tr);
                    });

                    // Attach delete events
                    listBody.querySelectorAll(".btn-delete-local").forEach(btn => {
                        btn.addEventListener("click", (e) => {
                            const target = e.currentTarget as HTMLButtonElement;
                            const filename = target.getAttribute("data-file") || "";
                            this.deleteLocalBackup(filename);
                        });
                    });
                } else {
                    listBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="py-6 text-center text-slate-400 font-medium">No local backups found in configured directory.</td>
                        </tr>
                    `;
                }
            })
            .catch((err: any) => {
                listBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="py-6 text-center text-red-500 font-medium">Failed to load local backups: ${err.message || err}</td>
                    </tr>
                `;
            });
    }

    private deleteLocalBackup(filename: string): void {
        (window as any).electronAPI.showMessageBox({
            type: "warning",
            title: "Delete Local Backup",
            message: `Are you sure you want to permanently delete local backup file: ${filename}?`,
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
            defaultId: 1
        }).then((choice: any) => {
            if (choice.response === 1) {
                settingsApi.deleteLocalBackup(filename)
                    .then((res: any) => {
                        if (res.success) {
                            (window as any).electronAPI.showAlert1("Local backup deleted successfully.");
                            this.loadLocalBackupsHistory();
                        } else {
                            (window as any).electronAPI.showAlert1(`Failed to delete: ${res.message}`);
                        }
                    })
                    .catch((err: any) => {
                        (window as any).electronAPI.showAlert1(`Delete failed: ${err.message}`);
                    });
            }
        });
    }

    // Fetch and render Google Drive backups
    private loadCloudBackupsHistory(): void {
        const restoreList = document.getElementById("gdrive-restore-list");
        const historyList = document.getElementById("cloud-backups-history-list");

        if (!restoreList && !historyList) return;

        (window as any).electronAPI.googleDriveList()
            .then((res: any) => {
                if (res.success && res.files && res.files.length > 0) {
                    if (restoreList) {
                        restoreList.innerHTML = "";
                        res.files.forEach((f: any) => {
                            const tr = document.createElement("tr");
                            tr.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
                            
                            const sizeKb = (f.size / 1024).toFixed(2);
                            const dateStr = new Date(f.createdTime).toLocaleString();

                            tr.innerHTML = `
                                <td class="py-3 px-4 font-semibold text-slate-700 truncate max-w-[240px]">${f.name}</td>
                                <td class="py-3 px-4 text-slate-500">${dateStr}</td>
                                <td class="py-3 px-4 text-slate-650">${sizeKb} KB</td>
                                <td class="py-3 px-4 text-right">
                                    <button type="button" class="btn-restore-cloud bg-purple-600 text-white px-2.5 py-1 rounded font-semibold hover:bg-purple-700 transition text-[10px] cursor-pointer" data-id="${f.id}" data-name="${f.name}">
                                        <i class="fas fa-undo"></i> Restore
                                    </button>
                                </td>
                            `;
                            restoreList.appendChild(tr);
                        });

                        // Attach restore click handlers
                        restoreList.querySelectorAll(".btn-restore-cloud").forEach(btn => {
                            btn.addEventListener("click", (e) => {
                                const target = e.currentTarget as HTMLButtonElement;
                                const fileId = target.getAttribute("data-id") || "";
                                const filename = target.getAttribute("data-name") || "";
                                this.restoreCloudBackup(fileId, filename);
                            });
                        });
                    }

                    if (historyList) {
                        historyList.innerHTML = "";
                        res.files.forEach((f: any) => {
                            const tr = document.createElement("tr");
                            tr.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
                            
                            const sizeKb = (f.size / 1024).toFixed(2);
                            const dateStr = new Date(f.createdTime).toLocaleString();

                            tr.innerHTML = `
                                <td class="py-3 px-4 font-semibold text-slate-700 truncate max-w-[240px]">${f.name}</td>
                                <td class="py-3 px-4 text-slate-500">${dateStr}</td>
                                <td class="py-3 px-4 text-slate-650">${sizeKb} KB</td>
                                <td class="py-3 px-4 text-right">
                                    <button type="button" class="btn-download-cloud text-purple-650 hover:text-purple-750 font-bold cursor-pointer" data-id="${f.id}" data-name="${f.name}">
                                        <i class="fas fa-download"></i> Download
                                    </button>
                                    <button type="button" class="btn-delete-cloud text-red-650 hover:text-red-750 font-bold ml-3 cursor-pointer" data-id="${f.id}">
                                        <i class="fas fa-trash-alt"></i> Delete
                                    </button>
                                </td>
                            `;
                            historyList.appendChild(tr);
                        });

                        // Attach action handlers
                        historyList.querySelectorAll(".btn-download-cloud").forEach(btn => {
                            btn.addEventListener("click", (e) => {
                                const target = e.currentTarget as HTMLButtonElement;
                                const fileId = target.getAttribute("data-id") || "";
                                const filename = target.getAttribute("data-name") || "";
                                this.downloadCloudBackup(fileId, filename);
                            });
                        });

                        historyList.querySelectorAll(".btn-delete-cloud").forEach(btn => {
                            btn.addEventListener("click", (e) => {
                                const target = e.currentTarget as HTMLButtonElement;
                                const fileId = target.getAttribute("data-id") || "";
                                this.deleteCloudBackup(fileId);
                            });
                        });
                    }
                } else {
                    const fallbackHtml = `
                        <tr>
                            <td colspan="4" class="py-6 text-center text-slate-400 font-medium">No backups found in Google Drive MyApp Backups folder.</td>
                        </tr>
                    `;
                    if (restoreList) restoreList.innerHTML = fallbackHtml;
                    if (historyList) historyList.innerHTML = fallbackHtml;
                }
            })
            .catch((err: any) => {
                const errHtml = `
                    <tr>
                        <td colspan="4" class="py-6 text-center text-red-500 font-medium">Failed to fetch backups list. Make sure Google Account is connected.</td>
                    </tr>
                `;
                if (restoreList) restoreList.innerHTML = errHtml;
                if (historyList) historyList.innerHTML = errHtml;
            });
    }

    private restoreCloudBackup(fileId: string, filename: string): void {
        (window as any).electronAPI.showMessageBox({
            type: "warning",
            title: "Restore Cloud Backup",
            message: `Are you sure you want to restore database from cloud backup: ${filename}? This will REPLACE ALL existing database records!`,
            buttons: ["Cancel", "Restore"],
            cancelId: 0,
            defaultId: 1
        }).then((choice: any) => {
            if (choice.response === 1) {
                const stageLabel = document.getElementById("gdrive-progress-stage");
                const pctLabel = document.getElementById("gdrive-progress-pct");
                const progressBar = document.getElementById("gdrive-progress-bar");
                const progressWrapper = document.getElementById("gdrive-progress-wrapper");

                if (progressWrapper) progressWrapper.classList.remove("hidden");
                if (stageLabel) stageLabel.textContent = "Downloading backup...";
                if (pctLabel) pctLabel.textContent = "10%";
                if (progressBar) progressBar.style.width = "10%";

                (window as any).electronAPI.googleDriveRestore(fileId, filename)
                    .then((res: any) => {
                        if (res.success) {
                            (window as any).electronAPI.showAlert1(`Database successfully restored from: ${filename}. Please restart the application for changes to take full effect.`);
                            this.loadLastBackupStatus();
                        } else {
                            (window as any).electronAPI.showAlert1(`Restore failed: ${res.error}`);
                        }
                    })
                    .catch((err: any) => {
                        (window as any).electronAPI.showAlert1(`Restore operation failed: ${err.message || err}`);
                    })
                    .finally(() => {
                        setTimeout(() => {
                            if (progressWrapper) progressWrapper.classList.add("hidden");
                        }, 2000);
                    });
            }
        });
    }

    private downloadCloudBackup(fileId: string, filename: string): void {
        (window as any).electronAPI.googleDriveDownload(fileId, filename)
            .then((res: any) => {
                if (res.success) {
                    (window as any).electronAPI.showAlert1(`Successfully downloaded cloud backup file to:\n${res.filePath}`);
                } else if (res.message) {
                    // download cancelled or skipped
                } else {
                    (window as any).electronAPI.showAlert1(`Download failed: ${res.error}`);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Download failed: ${err.message || err}`);
            });
    }

    private deleteCloudBackup(fileId: string): void {
        (window as any).electronAPI.showMessageBox({
            type: "warning",
            title: "Delete Cloud Backup",
            message: "Are you sure you want to permanently delete this backup file from Google Drive?",
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
            defaultId: 1
        }).then((choice: any) => {
            if (choice.response === 1) {
                (window as any).electronAPI.googleDriveDelete(fileId)
                    .then((res: any) => {
                        if (res.success) {
                            (window as any).electronAPI.showAlert1("Cloud backup deleted successfully.");
                            this.loadCloudBackupsHistory();
                        } else {
                            (window as any).electronAPI.showAlert1(`Failed to delete: ${res.error}`);
                        }
                    })
                    .catch((err: any) => {
                        (window as any).electronAPI.showAlert1(`Delete failed: ${err.message || err}`);
                    });
            }
        });
    }

    // ===== Credential Management =====

    private loadCredentialsStatus(): void {
        (window as any).electronAPI.googleDriveGetCredentials()
            .then((res: any) => {
                const badge = document.getElementById("gdrive-creds-status-badge");
                const clientIdInput = document.getElementById("gdrive-client-id") as HTMLInputElement;
                const credsBody = document.getElementById("gdrive-credentials-body");
                const credsChevron = document.getElementById("gdrive-creds-chevron");

                if (res.configured) {
                    // Show "Configured" badge
                    badge?.classList.remove("hidden");
                    // Pre-fill the client ID field
                    if (clientIdInput) clientIdInput.value = res.clientId || "";
                    // Keep accordion closed (credentials already set)
                    credsBody?.classList.add("hidden");
                    if (credsChevron) credsChevron.classList.remove("rotate-180");
                } else {
                    // Auto-open the accordion so user knows they need to fill it in
                    badge?.classList.add("hidden");
                    credsBody?.classList.remove("hidden");
                    if (credsChevron) credsChevron.classList.add("rotate-180");
                }
            })
            .catch((err: any) => {
                console.error("Failed to load Google credentials status:", err);
            });
    }

    private handleSaveCredentials(): void {
        const clientIdInput = document.getElementById("gdrive-client-id") as HTMLInputElement;
        const clientSecretInput = document.getElementById("gdrive-client-secret") as HTMLInputElement;
        const saveBtn = document.getElementById("gdrive-save-credentials-btn") as HTMLButtonElement;
        const statusEl = document.getElementById("gdrive-creds-save-status");

        const clientId = (clientIdInput?.value || "").trim();
        const clientSecret = (clientSecretInput?.value || "").trim();

        if (!clientId || !clientSecret) {
            if (statusEl) {
                statusEl.textContent = "⚠ Both Client ID and Client Secret are required.";
                statusEl.classList.remove("hidden", "text-green-600");
                statusEl.classList.add("text-red-500");
            }
            return;
        }

        const originalHtml = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        (window as any).electronAPI.googleDriveSaveCredentials(clientId, clientSecret)
            .then((res: any) => {
                if (res.success) {
                    if (statusEl) {
                        statusEl.textContent = "✓ Credentials saved securely.";
                        statusEl.classList.remove("hidden", "text-red-500");
                        statusEl.classList.add("text-green-600");
                    }
                    // Clear the secret field for security
                    if (clientSecretInput) clientSecretInput.value = "";
                    this.loadCredentialsStatus();
                } else {
                    if (statusEl) {
                        statusEl.textContent = `⚠ ${res.error}`;
                        statusEl.classList.remove("hidden", "text-green-600");
                        statusEl.classList.add("text-red-500");
                    }
                }
            })
            .catch((err: any) => {
                if (statusEl) {
                    statusEl.textContent = `⚠ Save failed: ${err.message || err}`;
                    statusEl.classList.remove("hidden", "text-green-600");
                    statusEl.classList.add("text-red-500");
                }
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalHtml;
                // Hide status after 5 seconds
                setTimeout(() => {
                    statusEl?.classList.add("hidden");
                }, 5000);
            });
    }

    updateExportButtonState(): void {
        const checkedElements = Array.from(document.querySelectorAll('input[name="export-data"]:checked')) as HTMLInputElement[];
        const exportButton = document.getElementById("export-data-button") as HTMLButtonElement;
        const btnText = document.getElementById("export-btn-text");
        
        if (exportButton) {
            if (checkedElements.length === 0) {
                exportButton.disabled = true;
                exportButton.classList.add("opacity-50", "pointer-events-none");
                if (btnText) btnText.textContent = "Export Selected Data";
            } else {
                exportButton.disabled = false;
                exportButton.classList.remove("opacity-50", "pointer-events-none");
                const count = checkedElements.length;
                if (btnText) {
                    btnText.textContent = `Export ${count} Collection${count > 1 ? 's' : ''}`;
                }
            }
        }
    }

    updateRestoreCollectionButtonState(): void {
        const collectionSelect = document.getElementById("collection-select") as HTMLSelectElement;
        const fileInput = document.getElementById("restore-collection-file") as HTMLInputElement;
        const restoreButton = document.getElementById("restore-collection-button") as HTMLButtonElement;
        
        const isCollectionSelected = collectionSelect && collectionSelect.value && collectionSelect.value !== "";
        const isFileSelected = fileInput && fileInput.files && fileInput.files.length > 0;
        
        if (restoreButton) {
            if (isCollectionSelected && isFileSelected) {
                restoreButton.disabled = false;
                restoreButton.classList.remove("opacity-50", "pointer-events-none");
                restoreButton.className = "w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 active:scale-[0.98] transition shadow-sm hover:shadow-purple-500/20 text-xs cursor-pointer flex items-center justify-center gap-1.5 btn-transition";
            } else {
                restoreButton.disabled = true;
                restoreButton.classList.add("opacity-50", "pointer-events-none");
                restoreButton.className = "w-full px-4 py-2.5 bg-transparent text-purple-650 border border-purple-200 hover:bg-purple-50/50 rounded-lg font-semibold transition text-xs cursor-pointer flex items-center justify-center gap-1.5 opacity-50 pointer-events-none btn-transition";
            }
        }
    }

    updateRestoreDatabaseButtonState(): void {
        const fileInput = document.getElementById("restore-database-file") as HTMLInputElement;
        const restoreButton = document.getElementById("restore-database-button") as HTMLButtonElement;
        
        const isFileSelected = fileInput && fileInput.files && fileInput.files.length > 0;
        
        if (restoreButton) {
            if (isFileSelected) {
                restoreButton.disabled = false;
                restoreButton.classList.remove("opacity-50", "pointer-events-none");
                restoreButton.className = "w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:scale-[0.98] transition shadow-sm hover:shadow-red-500/20 text-xs cursor-pointer flex items-center justify-center gap-1.5 btn-transition";
            } else {
                restoreButton.disabled = true;
                restoreButton.classList.add("opacity-50", "pointer-events-none");
                restoreButton.className = "w-full px-4 py-2.5 bg-transparent text-red-650 border border-red-200 hover:bg-red-50/50 rounded-lg font-semibold transition text-xs cursor-pointer flex items-center justify-center gap-1.5 opacity-50 pointer-events-none btn-transition";
            }
        }
    }

    showToast(message: string, type: 'success' | 'error' = 'success'): void {
        const existingToast = document.getElementById('global-toast');
        if (existingToast) {
            existingToast.remove();
        }
        const toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all duration-200';
        
        if (type === 'error') {
            toast.style.background = '#ef4444';
            toast.innerHTML = `<i class="fas fa-exclamation-circle text-base"></i><span>${message}</span>`;
        } else {
            toast.style.background = '#10b981';
            toast.innerHTML = `<i class="fas fa-check-circle text-base"></i><span>${message}</span>`;
        }
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        document.body.appendChild(toast);
        
        // Force reflow
        toast.offsetHeight;
        
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => {
                toast.remove();
            }, 200);
        }, 3000);
    }

    showLoadingToast(message: string): HTMLElement {
        const existingToast = document.getElementById('global-toast');
        if (existingToast) {
            existingToast.remove();
        }
        const toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all duration-200 bg-purple-650';
        toast.innerHTML = `<i class="fas fa-spinner fa-spin text-base"></i><span>${message}</span>`;
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        document.body.appendChild(toast);
        toast.offsetHeight;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        return toast;
    }
}

declare var settingsBackup: any;
(window as any).settingsBackup = new SettingsBackup();
