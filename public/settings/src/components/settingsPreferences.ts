/**
 * System Preferences and Security Settings Component
 */

declare var settingsApi: any;

class SettingsPreferences {
    init(): void {
        document.getElementById("save-security-button")?.addEventListener("click", () => this.saveSecuritySettings());
        document.getElementById("restore-security-defaults-button")?.addEventListener("click", () => this.restoreSecurityDefaults());
        document.getElementById("save-stock-button")?.addEventListener("click", () => this.saveStockSettings());
        document.getElementById("restore-stock-defaults-button")?.addEventListener("click", () => this.restoreStockDefaults());
        document.getElementById("save-numbering-button")?.addEventListener("click", () => this.saveNumberingSettings());
        document.getElementById("restore-numbering-defaults-button")?.addEventListener("click", () => this.restoreNumberingDefaults());
        document.getElementById("save-backup-location-button")?.addEventListener("click", () => this.saveBackupLocation());
        document.getElementById("restore-backup-location-defaults-button")?.addEventListener("click", () => this.restoreBackupLocationDefaults());
        document.getElementById("save-backup-schedule-button")?.addEventListener("click", () => this.saveBackupSchedule());
        document.getElementById("restore-backup-schedule-defaults-button")?.addEventListener("click", () => this.restoreBackupScheduleDefaults());
        document.getElementById("save-whatsapp-button")?.addEventListener("click", () => this.saveWhatsAppSettings());
        document.getElementById("save-cloudinary-button")?.addEventListener("click", () => this.saveCloudinarySettings());

        document.getElementById("backup-browse")?.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const result = await (window as any).electronAPI.openFileDialog({ properties: ['openDirectory'] });
                if (result && !result.canceled && Array.isArray(result.filePaths) && result.filePaths.length > 0) {
                    const locationInput = document.getElementById('backup-location') as HTMLInputElement;
                    if (locationInput) locationInput.value = result.filePaths[0];
                }
            } catch (err) {
                console.error('Directory selection cancelled or failed:', err);
            }
        });

        // Add auto backup toggle visual dimming behavior
        const autoBackupCheckbox = document.getElementById("backup-auto-enabled") as HTMLInputElement;
        if (autoBackupCheckbox) {
            autoBackupCheckbox.addEventListener("change", () => this.updateAutoBackupFieldsState());
        }

        // Add clearing behavior for masked values on focus or input
        const maskFields = ['whatsapp-token', 'cloudinary-api-secret'];
        maskFields.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            if (input) {
                const clearIfMasked = () => {
                    if (input.value === '••••••••••••••••') {
                        input.value = '';
                    }
                };
                input.addEventListener('focus', clearIfMasked);
                input.addEventListener('input', clearIfMasked);
            }
        });

        // Clear security, stock, numbering, and backup settings validation errors on typing
        const fieldsToClear = [
            "security-session-timeout", "security-max-attempts", "security-lockout-duration", 
            "pref-stock-inactive-months", "pref-invoice-prefix", "pref-quotation-prefix", 
            "pref-purchase-prefix", "pref-service-prefix", "backup-retention", "backup-location"
        ];
        fieldsToClear.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            input?.addEventListener("input", () => this.clearFieldError(input));
        });

        // Restrict security, stock, and backup inputs to numeric digits only
        const timeoutInput = document.getElementById("security-session-timeout") as HTMLInputElement;
        const attemptsInput = document.getElementById("security-max-attempts") as HTMLInputElement;
        const durationInput = document.getElementById("security-lockout-duration") as HTMLInputElement;
        const stockInactiveMonthsInput = document.getElementById("pref-stock-inactive-months") as HTMLInputElement;
        const backupRetentionInput = document.getElementById("backup-retention") as HTMLInputElement;

        if ((window as any).setupNumericInput) {
            if (timeoutInput) (window as any).setupNumericInput(timeoutInput, 4);
            if (attemptsInput) (window as any).setupNumericInput(attemptsInput, 2);
            if (durationInput) (window as any).setupNumericInput(durationInput, 2);
            if (stockInactiveMonthsInput) (window as any).setupNumericInput(stockInactiveMonthsInput, 2);
            if (backupRetentionInput) (window as any).setupNumericInput(backupRetentionInput, 3);
        }
    }

    private updateAutoBackupFieldsState(): void {
        const autoBackupCheckbox = document.getElementById("backup-auto-enabled") as HTMLInputElement;
        if (!autoBackupCheckbox) return;

        const isEnabled = autoBackupCheckbox.checked;
        const fieldsToToggle = [
            "backup-frequency",
            "backup-retention"
        ];

        fieldsToToggle.forEach(id => {
            const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
            if (el) {
                el.disabled = !isEnabled;
                if (!isEnabled) {
                    el.classList.add("opacity-50", "cursor-not-allowed");
                } else {
                    el.classList.remove("opacity-50", "cursor-not-allowed");
                }
            }
        });
    }

    loadPreferences(): void {
        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                if (data.success && data.settings) {
                    const s = data.settings;
 
                    const invoicePrefInput = document.getElementById("pref-invoice-prefix") as HTMLInputElement;
                    if (invoicePrefInput) invoicePrefInput.value = s.numbering?.invoice_prefix || 'INV';
 
                    const quotationPrefInput = document.getElementById("pref-quotation-prefix") as HTMLInputElement;
                    if (quotationPrefInput) quotationPrefInput.value = s.numbering?.quotation_prefix || 'QUO';
 
                    const purchasePrefInput = document.getElementById("pref-purchase-prefix") as HTMLInputElement;
                    if (purchasePrefInput) purchasePrefInput.value = s.numbering?.purchase_prefix || 'PUR';
 
                    const servicePrefInput = document.getElementById("pref-service-prefix") as HTMLInputElement;
                    if (servicePrefInput) servicePrefInput.value = s.numbering?.service_prefix || 'SRV';
 
                    const stockInactiveMonthsInput = document.getElementById("pref-stock-inactive-months") as HTMLInputElement;
                    if (stockInactiveMonthsInput) stockInactiveMonthsInput.value = (s.notifications?.stock_inactive_months || 3).toString();
 
                    const backupAutoEnabledInput = document.getElementById("backup-auto-enabled") as HTMLInputElement;
                    if (backupAutoEnabledInput) {
                        backupAutoEnabledInput.checked = s.backup?.auto_backup_enabled || false;
                        this.updateAutoBackupFieldsState();
                    }
 
                    const backupFrequencyInput = document.getElementById("backup-frequency") as HTMLSelectElement;
                    if (backupFrequencyInput) backupFrequencyInput.value = s.backup?.backup_frequency || 'daily';
 
                    const backupRetentionInput = document.getElementById("backup-retention") as HTMLInputElement;
                    if (backupRetentionInput) backupRetentionInput.value = (s.backup?.retention_days || 30).toString();
 
                    let location = s.backup?.backup_location || '';
                    if (location === './backups' || location === '.\\backups') {
                        location = '';
                    }
                    const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;
                    if (backupLocationInput) backupLocationInput.value = location;
                }
            })
            .catch((err: any) => {
                console.error('Failed to load preferences:', err);
            });
    }



    loadSecuritySettings(): void {
        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                if (data.success && data.settings) {
                    const s = data.settings.security || {};

                    const sessionTimeoutInput = document.getElementById("security-session-timeout") as HTMLInputElement;
                    if (sessionTimeoutInput) sessionTimeoutInput.value = (s.session_timeout || 30).toString();

                    const maxAttemptsInput = document.getElementById("security-max-attempts") as HTMLInputElement;
                    if (maxAttemptsInput) maxAttemptsInput.value = (s.max_login_attempts || 5).toString();

                    const lockoutDurationInput = document.getElementById("security-lockout-duration") as HTMLInputElement;
                    if (lockoutDurationInput) lockoutDurationInput.value = (s.lockout_duration || 15).toString();
                }
            })
            .catch((err: any) => {
                console.error('Failed to load security settings:', err);
            });
    }

    private saveSecuritySettings(): void {
        const saveButton = document.getElementById("save-security-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const sessionTimeoutInput = document.getElementById("security-session-timeout") as HTMLInputElement;
        const maxAttemptsInput = document.getElementById("security-max-attempts") as HTMLInputElement;
        const lockoutDurationInput = document.getElementById("security-lockout-duration") as HTMLInputElement;

        this.clearFieldError(sessionTimeoutInput);
        this.clearFieldError(maxAttemptsInput);
        this.clearFieldError(lockoutDurationInput);

        const sessionTimeout = parseInt(sessionTimeoutInput.value);
        const maxAttempts = parseInt(maxAttemptsInput.value);
        const lockoutDuration = parseInt(lockoutDurationInput.value);

        let hasError = false;
        if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
            this.showFieldError(sessionTimeoutInput, "Session Timeout must be a number between 5 and 1440 minutes.");
            hasError = true;
        }

        if (isNaN(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
            this.showFieldError(maxAttemptsInput, "Max Attempts must be a number between 1 and 10.");
            hasError = true;
        }

        if (isNaN(lockoutDuration) || lockoutDuration < 1 || lockoutDuration > 60) {
            this.showFieldError(lockoutDurationInput, "Lockout Duration must be a number between 1 and 60 minutes.");
            hasError = true;
        }

        if (hasError) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        const security = {
            security: {
                session_timeout: sessionTimeout,
                max_login_attempts: maxAttempts,
                lockout_duration: lockoutDuration
            }
        };

        settingsApi.savePreferences(security)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    const newTimeout = security.security.session_timeout;
                    sessionStorage.setItem('sessionTimeout', newTimeout.toString());

                    if (typeof (window as any).startSessionMonitor === 'function') {
                        (window as any).startSessionMonitor();
                    }

                    (window as any).electronAPI.showAlert1("Security settings saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save security settings:', err);
                const msg = err.message || "Failed to save security settings. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private restoreSecurityDefaults(): void {
        const sessionTimeoutInput = document.getElementById("security-session-timeout") as HTMLInputElement;
        const maxAttemptsInput = document.getElementById("security-max-attempts") as HTMLInputElement;
        const lockoutDurationInput = document.getElementById("security-lockout-duration") as HTMLInputElement;

        if (sessionTimeoutInput) {
            sessionTimeoutInput.value = "30";
            this.clearFieldError(sessionTimeoutInput);
        }
        if (maxAttemptsInput) {
            maxAttemptsInput.value = "5";
            this.clearFieldError(maxAttemptsInput);
        }
        if (lockoutDurationInput) {
            lockoutDurationInput.value = "15";
            this.clearFieldError(lockoutDurationInput);
        }

        const restoreButton = document.getElementById("restore-security-defaults-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        const security = {
            security: {
                session_timeout: 30,
                max_login_attempts: 5,
                lockout_duration: 15
            }
        };

        settingsApi.savePreferences(security)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    sessionStorage.setItem('sessionTimeout', "30");

                    if (typeof (window as any).startSessionMonitor === 'function') {
                        (window as any).startSessionMonitor();
                    }

                    (window as any).electronAPI.showAlert1("Security settings restored to defaults successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to restore defaults: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to restore defaults:', err);
                (window as any).electronAPI.showAlert1("Failed to restore default security settings. Please try again.");
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    private saveStockSettings(): void {
        const saveButton = document.getElementById("save-stock-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const stockInactiveMonthsInput = document.getElementById("pref-stock-inactive-months") as HTMLInputElement;
        this.clearFieldError(stockInactiveMonthsInput);

        const stockInactiveMonths = parseInt(stockInactiveMonthsInput.value);

        if (isNaN(stockInactiveMonths) || stockInactiveMonths < 1 || stockInactiveMonths > 24) {
            this.showFieldError(stockInactiveMonthsInput, "Inactivity Duration must be a number between 1 and 24 months.");
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        const notifications = {
            notifications: {
                stock_inactive_months: stockInactiveMonths
            }
        };

        settingsApi.savePreferences(notifications)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Stock settings saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save stock settings:', err);
                const msg = err.message || "Failed to save stock settings. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private restoreStockDefaults(): void {
        const stockInactiveMonthsInput = document.getElementById("pref-stock-inactive-months") as HTMLInputElement;
        if (stockInactiveMonthsInput) {
            stockInactiveMonthsInput.value = "3";
            this.clearFieldError(stockInactiveMonthsInput);
        }

        const restoreButton = document.getElementById("restore-stock-defaults-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        const notifications = {
            notifications: {
                stock_inactive_months: 3
            }
        };

        settingsApi.savePreferences(notifications)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Stock settings restored to defaults successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to restore defaults: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to restore stock defaults:', err);
                const msg = err.message || "Failed to restore defaults. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    private saveNumberingSettings(): void {
        const saveButton = document.getElementById("save-numbering-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const invoiceInput = document.getElementById("pref-invoice-prefix") as HTMLInputElement;
        const quotationInput = document.getElementById("pref-quotation-prefix") as HTMLInputElement;
        const purchaseInput = document.getElementById("pref-purchase-prefix") as HTMLInputElement;
        const serviceInput = document.getElementById("pref-service-prefix") as HTMLInputElement;

        this.clearFieldError(invoiceInput);
        this.clearFieldError(quotationInput);
        this.clearFieldError(purchaseInput);
        this.clearFieldError(serviceInput);

        const invoicePrefix = invoiceInput.value.trim().toUpperCase();
        const quotationPrefix = quotationInput.value.trim().toUpperCase();
        const purchasePrefix = purchaseInput.value.trim().toUpperCase();
        const servicePrefix = serviceInput.value.trim().toUpperCase();

        let hasError = false;
        if (!invoicePrefix || invoicePrefix.length > 5) {
            this.showFieldError(invoiceInput, "Invoice Prefix must be between 1 and 5 characters.");
            hasError = true;
        }
        if (!quotationPrefix || quotationPrefix.length > 5) {
            this.showFieldError(quotationInput, "Quotation Prefix must be between 1 and 5 characters.");
            hasError = true;
        }
        if (!purchasePrefix || purchasePrefix.length > 5) {
            this.showFieldError(purchaseInput, "Purchase Order Prefix must be between 1 and 5 characters.");
            hasError = true;
        }
        if (!servicePrefix || servicePrefix.length > 5) {
            this.showFieldError(serviceInput, "Service Prefix must be between 1 and 5 characters.");
            hasError = true;
        }

        if (hasError) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        // Update fields visually to uppercase
        invoiceInput.value = invoicePrefix;
        quotationInput.value = quotationPrefix;
        purchaseInput.value = purchasePrefix;
        serviceInput.value = servicePrefix;

        const numbering = {
            numbering: {
                invoice_prefix: invoicePrefix,
                quotation_prefix: quotationPrefix,
                purchase_prefix: purchasePrefix,
                service_prefix: servicePrefix
            }
        };

        settingsApi.savePreferences(numbering)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Document numbering settings saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save numbering settings:', err);
                const msg = err.message || "Failed to save numbering settings. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private restoreNumberingDefaults(): void {
        const invoiceInput = document.getElementById("pref-invoice-prefix") as HTMLInputElement;
        const quotationInput = document.getElementById("pref-quotation-prefix") as HTMLInputElement;
        const purchaseInput = document.getElementById("pref-purchase-prefix") as HTMLInputElement;
        const serviceInput = document.getElementById("pref-service-prefix") as HTMLInputElement;

        if (invoiceInput) {
            invoiceInput.value = "INV";
            this.clearFieldError(invoiceInput);
        }
        if (quotationInput) {
            quotationInput.value = "QUO";
            this.clearFieldError(quotationInput);
        }
        if (purchaseInput) {
            purchaseInput.value = "PUR";
            this.clearFieldError(purchaseInput);
        }
        if (serviceInput) {
            serviceInput.value = "SRV";
            this.clearFieldError(serviceInput);
        }

        const restoreButton = document.getElementById("restore-numbering-defaults-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        const numbering = {
            numbering: {
                invoice_prefix: "INV",
                quotation_prefix: "QUO",
                purchase_prefix: "PUR",
                service_prefix: "SRV"
            }
        };

        settingsApi.savePreferences(numbering)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Document numbering settings restored to defaults successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to restore defaults: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to restore numbering defaults:', err);
                const msg = err.message || "Failed to restore defaults. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    private saveBackupLocation(): void {
        const saveButton = document.getElementById("save-backup-location-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;

        const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;
        const autoBackupEnabledInput = document.getElementById("backup-auto-enabled") as HTMLInputElement;

        this.clearFieldError(backupLocationInput);

        const backupLocation = backupLocationInput.value;
        const autoBackupEnabled = autoBackupEnabledInput ? autoBackupEnabledInput.checked : false;

        let hasError = false;
        if (autoBackupEnabled && !backupLocation.trim()) {
            this.showFieldError(backupLocationInput, "Please select a backup location before enabling auto backup.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const locationSettings = {
            backup: {
                backup_location: backupLocation
            }
        };

        settingsApi.savePreferences(locationSettings)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Backup location saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save backup location:', err);
                const msg = err.message || "Failed to save backup location. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private restoreBackupLocationDefaults(): void {
        const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;
        const autoBackupEnabledInput = document.getElementById("backup-auto-enabled") as HTMLInputElement;

        if (autoBackupEnabledInput && autoBackupEnabledInput.checked) {
            (window as any).electronAPI.showAlert1("Disable auto backup before resetting the backup location.");
            return;
        }

        if (backupLocationInput) {
            backupLocationInput.value = "";
            this.clearFieldError(backupLocationInput);
        }

        const restoreButton = document.getElementById("restore-backup-location-defaults-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        const locationSettings = {
            backup: {
                backup_location: ""
            }
        };

        settingsApi.savePreferences(locationSettings)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Backup location restored to default successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to restore default: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to restore backup location default:', err);
                const msg = err.message || "Failed to restore default. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    private saveBackupSchedule(): void {
        const saveButton = document.getElementById("save-backup-schedule-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;

        const autoBackupEnabledInput = document.getElementById("backup-auto-enabled") as HTMLInputElement;
        const backupFrequencySelect = document.getElementById("backup-frequency") as HTMLSelectElement;
        const backupRetentionInput = document.getElementById("backup-retention") as HTMLInputElement;
        const backupLocationInput = document.getElementById("backup-location") as HTMLInputElement;

        this.clearFieldError(backupRetentionInput);
        if (backupLocationInput) {
            this.clearFieldError(backupLocationInput);
        }

        const autoBackupEnabled = autoBackupEnabledInput.checked;
        const backupFrequency = backupFrequencySelect.value;
        const retentionDays = parseInt(backupRetentionInput.value);
        const backupLocation = backupLocationInput ? backupLocationInput.value : '';

        let hasError = false;
        if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 365) {
            this.showFieldError(backupRetentionInput, "Retention must be a number between 1 and 365 days.");
            hasError = true;
        }

        if (autoBackupEnabled && !backupLocation.trim()) {
            if (backupLocationInput) {
                this.showFieldError(backupLocationInput, "Please select a backup location before enabling auto backup.");
            } else {
                (window as any).electronAPI.showAlert1("Please configure a backup location first.");
            }
            hasError = true;
        }

        if (hasError) {
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const scheduleSettings = {
            backup: {
                auto_backup_enabled: autoBackupEnabled,
                backup_frequency: backupFrequency,
                retention_days: retentionDays
            }
        };

        settingsApi.savePreferences(scheduleSettings)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Backup schedule saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save backup schedule:', err);
                const msg = err.message || "Failed to save backup schedule. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private restoreBackupScheduleDefaults(): void {
        const autoBackupEnabledInput = document.getElementById("backup-auto-enabled") as HTMLInputElement;
        const backupFrequencySelect = document.getElementById("backup-frequency") as HTMLSelectElement;
        const backupRetentionInput = document.getElementById("backup-retention") as HTMLInputElement;

        if (autoBackupEnabledInput) {
            autoBackupEnabledInput.checked = false;
            this.updateAutoBackupFieldsState();
        }
        if (backupFrequencySelect) {
            backupFrequencySelect.value = "daily";
        }
        if (backupRetentionInput) {
            backupRetentionInput.value = "30";
            this.clearFieldError(backupRetentionInput);
        }

        const restoreButton = document.getElementById("restore-backup-schedule-defaults-button") as HTMLButtonElement;
        if (!restoreButton) return;
        const originalContent = restoreButton.innerHTML;
        restoreButton.disabled = true;
        restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        const scheduleSettings = {
            backup: {
                auto_backup_enabled: false,
                backup_frequency: "daily",
                retention_days: 30
            }
        };

        settingsApi.savePreferences(scheduleSettings)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Backup schedule restored to defaults successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to restore defaults: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to restore backup schedule defaults:', err);
                const msg = err.message || "Failed to restore defaults. Please try again.";
                (window as any).electronAPI.showAlert1(msg);
            })
            .finally(() => {
                restoreButton.disabled = false;
                restoreButton.innerHTML = originalContent;
            });
    }

    loadWhatsAppStatus(): void {
        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const statusEl = document.getElementById('whatsapp-status');
                if (!statusEl) return;

                if (data.success && data.settings?.whatsapp) {
                    const wa = data.settings.whatsapp;
                    const phoneNumberIdInput = document.getElementById('whatsapp-phone-number-id') as HTMLInputElement;

                    if (wa.phoneNumberId && phoneNumberIdInput) {
                        phoneNumberIdInput.value = wa.phoneNumberId;
                    }

                    const tokenInput = document.getElementById('whatsapp-token') as HTMLInputElement;

                    if (wa.phoneNumberId && wa.storedTokenReference) {
                        statusEl.innerHTML = `
                            <i class="fas fa-check-circle text-green-500 text-sm"></i>
                            <span class="text-green-700 font-medium">WhatsApp API Configured</span>
                        `;
                        statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200';
                        if (tokenInput) {
                            tokenInput.value = '••••••••••••••••';
                        }
                    } else {
                        statusEl.innerHTML = `
                            <i class="fas fa-exclamation-circle text-yellow-500 text-sm"></i>
                            <span class="text-yellow-700 font-medium">Not Configured - Enter credentials below</span>
                        `;
                        statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200';
                        if (tokenInput) {
                            tokenInput.value = '';
                        }
                    }
                }
            })
            .catch((err: any) => {
                console.error('Failed to load WhatsApp status:', err);
                const statusEl = document.getElementById('whatsapp-status');
                if (statusEl) {
                    statusEl.innerHTML = `
                        <i class="fas fa-times-circle text-red-500 text-sm"></i>
                        <span class="text-red-700 font-medium">Error checking status</span>
                    `;
                    statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200';
                }
            });
    }

    loadCloudinaryStatus(): void {
        settingsApi.getPreferences()
            .then((data: { success: boolean; settings: SystemPreferences }) => {
                const statusEl = document.getElementById('cloudinary-status');
                if (!statusEl) return;

                if (data.success && data.settings?.cloudinary) {
                    const cl = data.settings.cloudinary;
                    const cloudNameInput = document.getElementById('cloudinary-cloud-name') as HTMLInputElement;
                    const apiKeyInput = document.getElementById('cloudinary-api-key') as HTMLInputElement;
                    const secretInput = document.getElementById('cloudinary-api-secret') as HTMLInputElement;

                    const cloudName = cl.cloudName || (cl as any).cloud_name || "";
                    const apiKey = cl.apiKey || (cl as any).api_key || "";
                    const configured = cl.configured || (cl as any).configured || false;

                    if (cloudNameInput) cloudNameInput.value = cloudName;
                    if (apiKeyInput) apiKeyInput.value = apiKey;

                    if (configured && cloudName && apiKey) {
                        statusEl.innerHTML = `
                            <i class="fas fa-check-circle text-green-500 text-sm"></i>
                            <span class="text-green-700 font-medium">Cloudinary Configured</span>
                        `;
                        statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4';
                        if (secretInput) {
                            secretInput.value = '••••••••••••••••';
                        }
                    } else {
                        statusEl.innerHTML = `
                            <i class="fas fa-exclamation-circle text-yellow-500 text-sm"></i>
                            <span class="text-yellow-700 font-medium">Not Configured - Enter credentials below</span>
                        `;
                        statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4';
                        if (secretInput) {
                            secretInput.value = '';
                        }
                    }
                }
            })
            .catch((err: any) => {
                console.error('Failed to load Cloudinary status:', err);
                const statusEl = document.getElementById('cloudinary-status');
                if (statusEl) {
                    statusEl.innerHTML = `
                        <i class="fas fa-times-circle text-red-500 text-sm"></i>
                        <span class="text-red-700 font-medium">Error checking status</span>
                    `;
                    statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4';
                }
            });
    }

    private saveWhatsAppSettings(): void {
        const saveButton = document.getElementById('save-whatsapp-button') as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const phoneNumberId = (document.getElementById('whatsapp-phone-number-id') as HTMLInputElement).value.trim();
        const token = (document.getElementById('whatsapp-token') as HTMLInputElement).value.trim();

        if (!phoneNumberId) {
            (window as any).electronAPI.showAlert1('Please enter the Phone Number ID');
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        const savePhoneId = settingsApi.updateWhatsAppPreferences({ phoneNumberId, enabled: true });

        let saveToken = Promise.resolve<{ success: boolean; message?: string }>({ success: true });
        if (token && token !== '••••••••••••••••') {
            saveToken = settingsApi.saveWhatsAppToken(token);
        }

        Promise.all([savePhoneId, saveToken])
            .then(([phoneRes, tokenRes]) => {
                if (phoneRes.success && tokenRes.success) {
                    (window as any).electronAPI.showAlert1('WhatsApp settings saved successfully!');
                    this.loadWhatsAppStatus();
                } else {
                    const errors = [];
                    if (!phoneRes.success) errors.push(phoneRes.message || 'Failed to save phone ID');
                    if (!tokenRes.success) errors.push(tokenRes.message || 'Failed to save token');
                    (window as any).electronAPI.showAlert1(`Error: ${errors.join(', ')}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save WhatsApp settings:', err);
                (window as any).electronAPI.showAlert1('Failed to save WhatsApp settings. Please try again.');
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private saveCloudinarySettings(): void {
        const saveButton = document.getElementById('save-cloudinary-button') as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const cloudName = (document.getElementById('cloudinary-cloud-name') as HTMLInputElement).value.trim();
        const apiKey = (document.getElementById('cloudinary-api-key') as HTMLInputElement).value.trim();
        const apiSecret = (document.getElementById('cloudinary-api-secret') as HTMLInputElement).value.trim();

        if (!cloudName || !apiKey || !apiSecret) {
            (window as any).electronAPI.showAlert1('Please fill in all Cloudinary fields');
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        settingsApi.updateCloudinaryPreferences({ cloudName, apiKey, apiSecret })
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1('Cloudinary settings saved successfully!');
                    this.loadCloudinaryStatus();
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save Cloudinary settings:', err);
                (window as any).electronAPI.showAlert1('Failed to save Cloudinary settings. Please try again.');
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private showFieldError(input: HTMLInputElement, message: string): void {
        this.clearFieldError(input);

        // Apply error borders and focus ring classes
        input.classList.add('border-red-500', 'focus:border-red-550', 'focus:ring-red-500/20');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        // Accessibility attributes
        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        // Create error message node
        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'text-[11px] font-semibold text-red-650 mt-1 transition-all duration-200 ease-in-out error-message-inline';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            if (parent.classList.contains('relative')) {
                parent.parentElement?.appendChild(errorMsg);
            } else {
                parent.appendChild(errorMsg);
            }
        }
    }

    private clearFieldError(input: HTMLInputElement): void {
        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');

        const errorId = `${input.id}-error`;
        const errorMsg = document.getElementById(errorId);
        if (errorMsg) {
            errorMsg.remove();
        }
    }
}

declare var settingsPreferences: any;
(window as any).settingsPreferences = new SettingsPreferences();
