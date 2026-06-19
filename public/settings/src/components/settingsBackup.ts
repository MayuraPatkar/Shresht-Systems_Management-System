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

        // Custom File Upload Visuals
        const collFileInput = document.getElementById("restore-collection-file") as HTMLInputElement;
        const collFileName = document.getElementById("restore-collection-file-name");
        collFileInput?.addEventListener("change", () => {
            if (collFileInput.files && collFileInput.files.length > 0) {
                if (collFileName) collFileName.textContent = collFileInput.files[0].name;
            } else {
                if (collFileName) collFileName.textContent = "No file selected";
            }
        });

        const dbFileInput = document.getElementById("restore-database-file") as HTMLInputElement;
        const dbFileName = document.getElementById("restore-database-file-name");
        const dbRestoreButton = document.getElementById("restore-database-button") as HTMLButtonElement;
        dbFileInput?.addEventListener("change", () => {
            if (dbFileInput.files && dbFileInput.files.length > 0) {
                if (dbFileName) dbFileName.textContent = dbFileInput.files[0].name;
                if (dbRestoreButton) {
                    dbRestoreButton.disabled = false;
                    dbRestoreButton.classList.remove("opacity-50", "pointer-events-none");
                }
            } else {
                if (dbFileName) dbFileName.textContent = "No file selected";
                if (dbRestoreButton) {
                    dbRestoreButton.disabled = true;
                    dbRestoreButton.classList.add("opacity-50", "pointer-events-none");
                }
            }
        });

        // Load initial status
        this.loadLastBackupStatus();
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
            (window as any).electronAPI.showAlert1("Please select at least one data type to export.");
            return;
        }

        const originalContent = exportButton.innerHTML;
        exportButton.disabled = true;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

        const promises = checkedElements.map(el => {
            return settingsApi.exportData(el.value)
                .then((data: { success: boolean; message?: string; fileSize?: number }) => {
                    return { name: el.value, success: data.success, message: data.message || '', fileSize: data.fileSize || 0 };
                })
                .catch((err: any) => {
                    return { name: el.value, success: false, message: err.message, fileSize: 0 };
                });
        });

        Promise.all(promises)
            .then(results => {
                const successExports = results.filter(r => r.success);
                const failedExports = results.filter(r => !r.success);

                let alertMsg = "";
                if (successExports.length > 0) {
                    alertMsg += `Exported: ${successExports.map(s => `${s.name} (${(s.fileSize / 1024).toFixed(2)} KB)`).join(', ')}. `;
                }
                if (failedExports.length > 0) {
                    alertMsg += `Failed: ${failedExports.map(f => `${f.name}: ${f.message}`).join(', ')}.`;
                }

                if (alertMsg) {
                    (window as any).electronAPI.showAlert1(alertMsg);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Export failed: ${err.message}`);
                console.error('Export error:', err);
            })
            .finally(() => {
                exportButton.disabled = false;
                exportButton.innerHTML = originalContent;
            });
    }

    private handleRestoreCollection(): void {
        const fileInput = document.getElementById("restore-collection-file") as HTMLInputElement;

        if (!fileInput.files || fileInput.files.length === 0) {
            (window as any).electronAPI.showAlert1("Please select a backup file.");
            return;
        }

        const file = fileInput.files[0];
        const allowedExtensions = ['.json', '.bson', '.gz', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            (window as any).electronAPI.showAlert1(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            (window as any).electronAPI.showAlert1("File size exceeds 100MB limit.");
            return;
        }

        const collectionSelect = document.getElementById("collection-select") as HTMLSelectElement;
        if (!collectionSelect || !collectionSelect.value || collectionSelect.value === "Choose collection") {
            (window as any).electronAPI.showAlert1("Please select a collection to restore.");
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

        settingsApi.restoreCollection(formData)
            .then((data: { success: boolean; message: string; fileSize?: number }) => {
                if (data.success) {
                    let msg = data.message;
                    if (data.fileSize) {
                        msg += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                    }
                    (window as any).electronAPI.showAlert1(msg);
                    fileInput.value = "";
                } else {
                    (window as any).electronAPI.showAlert1(`Restore failed: ${data.message}`);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Restore failed: ${err.message}`);
                console.error('Restore error:', err);
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    private handleRestoreDatabase(): void {
        const fileInput = document.getElementById("restore-database-file") as HTMLInputElement;

        if (!fileInput.files || fileInput.files.length === 0) {
            (window as any).electronAPI.showAlert1("Please select a backup file.");
            return;
        }

        const file = fileInput.files[0];
        const allowedExtensions = ['.bson', '.gz', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            (window as any).electronAPI.showAlert1(`Invalid file type for database restore. Allowed types: ${allowedExtensions.join(', ')}`);
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            (window as any).electronAPI.showAlert1("File size exceeds 100MB limit.");
            return;
        }

        (window as any).electronAPI.showAlert2(
            "Are you sure you want to restore the entire database? This will replace ALL existing data!"
        );

        (window as any).electronAPI.receiveAlertResponse((response: string | boolean) => {
            if (response === 'Yes' || response === true) {
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
                    (window as any).electronAPI.showAlert1(msg);
                    const fileInput = document.getElementById("restore-database-file") as HTMLInputElement;
                    if (fileInput) fileInput.value = "";
                } else {
                    (window as any).electronAPI.showAlert1(`Database restore failed: ${data.message}`);
                }
            })
            .catch((err: any) => {
                (window as any).electronAPI.showAlert1(`Database restore failed: ${err.message}`);
                console.error('Database restore error:', err);
            })
            .finally(() => {
                if (restoreButton) {
                    restoreButton.disabled = false;
                    restoreButton.innerHTML = originalContent;
                }
            });
    }

    private handleManualBackup(): void {
        const manualButton = document.getElementById("manual-backup-button") as HTMLButtonElement;
        if (!manualButton) return;

        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const location = data.settings?.backup?.backup_location;

                if (!location || !location.trim() || location === './backups' || location === '.\\backups') {
                    (window as any).electronAPI.showAlert1("Please configure a backup location in Data Backup tab before creating a backup.");
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

        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const location = data.settings?.backup?.backup_location;

                if (!location || !location.trim() || location === './backups' || location === '.\\backups') {
                    (window as any).electronAPI.showAlert1("Please configure a backup location in Data Backup tab before opening backup folder.");
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
}

declare var settingsBackup: any;
(window as any).settingsBackup = new SettingsBackup();
