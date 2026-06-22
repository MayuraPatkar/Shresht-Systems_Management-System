/**
 * System Preferences and Security Settings Component
 */

declare var settingsApi: any;

class SettingsPreferences {
    init(): void {
        document.getElementById("save-preferences-button")?.addEventListener("click", () => this.savePreferences());
        document.getElementById("save-security-button")?.addEventListener("click", () => this.saveSecuritySettings());
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
    }

    private updateAutoBackupFieldsState(): void {
        const autoBackupCheckbox = document.getElementById("backup-auto-enabled") as HTMLInputElement;
        if (!autoBackupCheckbox) return;

        const isEnabled = autoBackupCheckbox.checked;
        const fieldsToToggle = [
            "backup-frequency",
            "backup-retention",
            "backup-location",
            "backup-browse"
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
                    if (purchasePrefInput) purchasePrefInput.value = s.numbering?.purchase_prefix || 'PO';
 
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

    private savePreferences(): void {
        const saveButton = document.getElementById("save-preferences-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;

        const autoBackupEnabled = (document.getElementById("backup-auto-enabled") as HTMLInputElement).checked;
        const backupLocation = (document.getElementById("backup-location") as HTMLInputElement).value;

        if (autoBackupEnabled && !backupLocation.trim()) {
            (window as any).electronAPI.showAlert1("Please select a backup location before enabling auto backup.");
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const preferences: SystemPreferences = {
            numbering: {
                invoice_prefix: (document.getElementById("pref-invoice-prefix") as HTMLInputElement).value,
                quotation_prefix: (document.getElementById("pref-quotation-prefix") as HTMLInputElement).value,
                purchase_prefix: (document.getElementById("pref-purchase-prefix") as HTMLInputElement).value,
                service_prefix: (document.getElementById("pref-service-prefix") as HTMLInputElement).value,
            },
            notifications: {
                stock_inactive_months: parseInt((document.getElementById("pref-stock-inactive-months") as HTMLInputElement).value) || 3,
            },
            backup: {
                auto_backup_enabled: autoBackupEnabled,
                backup_frequency: (document.getElementById("backup-frequency") as HTMLSelectElement).value,
                retention_days: parseInt((document.getElementById("backup-retention") as HTMLInputElement).value),
                backup_location: backupLocation
            }
        };

        settingsApi.savePreferences(preferences)
            .then((data: { success: boolean; message?: string }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Preferences saved successfully!");
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to save: ${data.message}`);
                }
            })
            .catch((err: any) => {
                console.error('Failed to save preferences:', err);
                (window as any).electronAPI.showAlert1("Failed to save preferences. Please try again.");
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
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

        const security = {
            security: {
                session_timeout: parseInt((document.getElementById("security-session-timeout") as HTMLInputElement).value),
                max_login_attempts: parseInt((document.getElementById("security-max-attempts") as HTMLInputElement).value),
                lockout_duration: parseInt((document.getElementById("security-lockout-duration") as HTMLInputElement).value)
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
                (window as any).electronAPI.showAlert1("Failed to save security settings. Please try again.");
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
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

                    const verifyTokenInput = document.getElementById('whatsapp-verify-token') as HTMLInputElement;
                    if (wa.verifyToken && verifyTokenInput) {
                        verifyTokenInput.value = wa.verifyToken;
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
        const verifyToken = (document.getElementById('whatsapp-verify-token') as HTMLInputElement).value.trim();

        if (!phoneNumberId) {
            (window as any).electronAPI.showAlert1('Please enter the Phone Number ID');
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        const savePhoneId = settingsApi.updateWhatsAppPreferences({ phoneNumberId, verifyToken, enabled: true });

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
}

declare var settingsPreferences: any;
(window as any).settingsPreferences = new SettingsPreferences();
