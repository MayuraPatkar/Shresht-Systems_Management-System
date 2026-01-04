/**
 * @file System Preferences, Security, and Notification Settings
 * @summary Handles application preferences, security settings, and notification configurations
 */

// --- SYSTEM PREFERENCES ---

/**
 * Loads preference settings from the server
 */
function loadPreferences() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                const s = data.settings;


                // Numbering
                document.getElementById("pref-invoice-prefix").value = s.numbering?.invoice_prefix || 'INV';
                document.getElementById("pref-quotation-prefix").value = s.numbering?.quotation_prefix || 'QUO';
                document.getElementById("pref-purchase-prefix").value = s.numbering?.purchase_prefix || 'PO';

                document.getElementById("pref-service-prefix").value = s.numbering?.service_prefix || 'SRV';


                // Backup settings
                document.getElementById("backup-auto-enabled").checked = s.backup?.auto_backup_enabled || false;
                document.getElementById("backup-frequency").value = s.backup?.backup_frequency || 'daily';
                document.getElementById("backup-retention").value = s.backup?.retention_days || 30;
                
                // If location is explicitly set to default './backups', treat it as empty to force user selection
                let location = s.backup?.backup_location || '';
                if (location === './backups' || location === '.\\backups') {
                    location = '';
                }
                document.getElementById("backup-location").value = location;
            }
        })
        .catch(err => {
            console.error('Failed to load preferences:', err);
        });
}

/**
 * Saves preference settings to the server
 */
function savePreferences() {
    const saveButton = document.getElementById("save-preferences-button");
    const originalContent = saveButton.innerHTML;

    // Validate backup location if auto-backup is enabled
    const autoBackupEnabled = document.getElementById("backup-auto-enabled").checked;
    const backupLocation = document.getElementById("backup-location").value;

    if (autoBackupEnabled && !backupLocation.trim()) {
        window.electronAPI.showAlert1("Please select a backup location before enabling auto backup.");
        return;
    }

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const preferences = {
        numbering: {
            invoice_prefix: document.getElementById("pref-invoice-prefix").value,
            quotation_prefix: document.getElementById("pref-quotation-prefix").value,
            purchase_prefix: document.getElementById("pref-purchase-prefix").value,
            service_prefix: document.getElementById("pref-service-prefix").value,
        },
        backup: {
            auto_backup_enabled: document.getElementById("backup-auto-enabled").checked,
            backup_frequency: document.getElementById("backup-frequency").value,
            retention_days: parseInt(document.getElementById("backup-retention").value),
            backup_location: document.getElementById("backup-location").value
        }
    };


    fetch('/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.electronAPI.showAlert1("Preferences saved successfully!");
            } else {
                window.electronAPI.showAlert1(`Failed to save: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('Failed to save preferences:', err);
            window.electronAPI.showAlert1("Failed to save preferences. Please try again.");
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

// --- SECURITY SETTINGS ---

/**
 * Loads security settings from the server
 */
function loadSecuritySettings() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                const s = data.settings.security || {};

                document.getElementById("security-session-timeout").value = s.session_timeout || 30;
                document.getElementById("security-max-attempts").value = s.max_login_attempts || 5;
                document.getElementById("security-lockout-duration").value = s.lockout_duration || 15;
            }
        })
        .catch(err => {
            console.error('Failed to load security settings:', err);
        });
}

/**
 * Saves security settings to the server
 */
function saveSecuritySettings() {
    const saveButton = document.getElementById("save-security-button");
    const originalContent = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const security = {
        security: {
            session_timeout: parseInt(document.getElementById("security-session-timeout").value),
            max_login_attempts: parseInt(document.getElementById("security-max-attempts").value),
            lockout_duration: parseInt(document.getElementById("security-lockout-duration").value)
        }
    };

    fetch('/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(security)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.electronAPI.showAlert1("Security settings saved successfully!");
            } else {
                window.electronAPI.showAlert1(`Failed to save: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('Failed to save security settings:', err);
            window.electronAPI.showAlert1("Failed to save security settings. Please try again.");
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

// --- NOTIFICATION SETTINGS ---

/**
 * Loads notification settings from the server
 */
function loadNotificationSettings() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                const n = data.settings.notifications || {};

                document.getElementById("notif-invoice-enabled").checked = n.enable_invoice_reminders !== false;
                document.getElementById("notif-invoice-days").value = n.invoice_reminder_days || 7;
                document.getElementById("notif-service-enabled").checked = n.enable_service_reminders !== false;
                document.getElementById("notif-service-days").value = n.service_reminder_days || 3;
            }
        })
        .catch(err => {
            console.error('Failed to load notification settings:', err);
        });
}

/**
 * Saves notification settings to the server
 */
function saveNotificationSettings() {
    const saveButton = document.getElementById("save-notifications-button");
    const originalContent = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const notifications = {
        notifications: {
            enable_stock_alerts: document.getElementById("notif-stock-enabled").checked,
            low_stock_threshold: parseInt(document.getElementById("notif-stock-threshold").value),
            enable_invoice_reminders: document.getElementById("notif-invoice-enabled").checked,
            invoice_reminder_days: parseInt(document.getElementById("notif-invoice-days").value),
            enable_service_reminders: document.getElementById("notif-service-enabled").checked,
            service_reminder_days: parseInt(document.getElementById("notif-service-days").value),
            enable_email_notifications: document.getElementById("notif-email-enabled").checked
        }
    };

    fetch('/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.electronAPI.showAlert1("Notification settings saved successfully!");
            } else {
                window.electronAPI.showAlert1(`Failed to save: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('Failed to save notification settings:', err);
            window.electronAPI.showAlert1("Failed to save notification settings. Please try again.");
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

// --- WHATSAPP SETTINGS ---

/**
 * Load WhatsApp configuration status
 */
function loadWhatsAppStatus() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            const statusEl = document.getElementById('whatsapp-status');
            if (data.success && data.settings?.whatsapp) {
                const wa = data.settings.whatsapp;
                const phoneNumberIdInput = document.getElementById('whatsapp-phone-number-id');

                // Fill in the phone number ID if available
                if (wa.phoneNumberId) {
                    phoneNumberIdInput.value = wa.phoneNumberId;
                }

                // Check if configured
                if (wa.phoneNumberId && wa.storedTokenReference) {
                    statusEl.innerHTML = `
                        <i class="fas fa-check-circle text-green-500 text-sm"></i>
                        <span class="text-green-700 font-medium">WhatsApp API Configured</span>
                    `;
                    statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200';
                } else {
                    statusEl.innerHTML = `
                        <i class="fas fa-exclamation-circle text-yellow-500 text-sm"></i>
                        <span class="text-yellow-700 font-medium">Not Configured - Enter credentials below</span>
                    `;
                    statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200';
                }
            }
        })
        .catch(err => {
            console.error('Failed to load WhatsApp status:', err);
            const statusEl = document.getElementById('whatsapp-status');
            statusEl.innerHTML = `
                <i class="fas fa-times-circle text-red-500 text-sm"></i>
                <span class="text-red-700 font-medium">Error checking status</span>
            `;
            statusEl.className = 'flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200';
        });
}

/**
 * Save WhatsApp settings
 */
function saveWhatsAppSettings() {
    const saveButton = document.getElementById('save-whatsapp-button');
    const originalContent = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const phoneNumberId = document.getElementById('whatsapp-phone-number-id').value.trim();
    const token = document.getElementById('whatsapp-token').value.trim();

    if (!phoneNumberId) {
        window.electronAPI.showAlert1('Please enter the Phone Number ID');
        saveButton.disabled = false;
        saveButton.innerHTML = originalContent;
        return;
    }

    // Save phone number ID first
    const savePhoneId = fetch('/settings/preferences/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId, enabled: true })
    });

    // Save token if provided (separate secure endpoint)
    let saveToken = Promise.resolve({ success: true });
    if (token) {
        saveToken = fetch('/settings/preferences/whatsapp/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        }).then(res => res.json());
    }

    Promise.all([savePhoneId.then(r => r.json()), saveToken])
        .then(([phoneRes, tokenRes]) => {
            if (phoneRes.success && tokenRes.success) {
                window.electronAPI.showAlert1('WhatsApp settings saved successfully!');
                document.getElementById('whatsapp-token').value = ''; // Clear token field
                loadWhatsAppStatus(); // Refresh status
            } else {
                const errors = [];
                if (!phoneRes.success) errors.push(phoneRes.message || 'Failed to save phone ID');
                if (!tokenRes.success) errors.push(tokenRes.message || 'Failed to save token');
                window.electronAPI.showAlert1(`Error: ${errors.join(', ')}`);
            }
        })
        .catch(err => {
            console.error('Failed to save WhatsApp settings:', err);
            window.electronAPI.showAlert1('Failed to save WhatsApp settings. Please try again.');
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

/**
 * Save Cloudinary settings
 */
function saveCloudinarySettings() {
    const saveButton = document.getElementById('save-cloudinary-button');
    const originalContent = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const cloudName = document.getElementById('cloudinary-cloud-name').value.trim();
    const apiKey = document.getElementById('cloudinary-api-key').value.trim();
    const apiSecret = document.getElementById('cloudinary-api-secret').value.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        window.electronAPI.showAlert1('Please fill in all Cloudinary fields');
        saveButton.disabled = false;
        saveButton.innerHTML = originalContent;
        return;
    }

    fetch('/settings/preferences/cloudinary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudName, apiKey, apiSecret })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.electronAPI.showAlert1('Cloudinary settings saved successfully!');
                document.getElementById('cloudinary-api-secret').value = ''; // Clear secret
            } else {
                window.electronAPI.showAlert1(`Failed to save: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('Failed to save Cloudinary settings:', err);
            window.electronAPI.showAlert1('Failed to save Cloudinary settings. Please try again.');
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

// --- EVENT LISTENERS ---

// Theme support removed: no applyTheme helper

/**
 * Initialize preferences module event listeners
 */
function initPreferencesModule() {
    // Preferences
    document.getElementById("save-preferences-button")?.addEventListener("click", savePreferences);
    document.getElementById("logo-upload")?.addEventListener("change", handleLogoUpload);
    document.getElementById("backup-browse")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            const result = await window.electronAPI.openFileDialog({ properties: ['openDirectory'] });
            // ipc returns { canceled: boolean, filePaths: [] } per Electron's showOpenDialog
            if (result && !result.canceled && Array.isArray(result.filePaths) && result.filePaths.length > 0) {
                document.getElementById('backup-location').value = result.filePaths[0];
            }
        } catch (err) {
            console.error('Directory selection cancelled or failed:', err);
        }
    });

    // Theme support removed

    // Security
    document.getElementById("save-security-button")?.addEventListener("click", saveSecuritySettings);

    // Notifications
    document.getElementById("save-notifications-button")?.addEventListener("click", saveNotificationSettings);

    // WhatsApp/Integrations
    document.getElementById("save-whatsapp-button")?.addEventListener("click", saveWhatsAppSettings);
    document.getElementById("save-cloudinary-button")?.addEventListener("click", saveCloudinarySettings);
}
