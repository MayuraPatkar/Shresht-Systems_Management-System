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


                // Tax settings
                document.getElementById("pref-gst-rate").value = s.tax?.default_gst_rate || 18;
                document.getElementById("pref-tax-included").checked = s.tax?.tax_included || false;
                document.getElementById("pref-enable-gst").checked = s.tax?.enable_gst !== false;

                // Numbering
                // Numbering
                document.getElementById("pref-invoice-prefix").value = s.numbering?.invoice_prefix || 'INV';
                document.getElementById("pref-quotation-prefix").value = s.numbering?.quotation_prefix || 'QUO';
                document.getElementById("pref-purchase-prefix").value = s.numbering?.purchase_prefix || 'PO';
                document.getElementById("pref-waybill-prefix").value = s.numbering?.waybill_prefix || 'WB';
                document.getElementById("pref-service-prefix").value = s.numbering?.service_prefix || 'SRV';


                // Backup settings
                document.getElementById("backup-auto-enabled").checked = s.backup?.auto_backup_enabled || false;
                document.getElementById("backup-frequency").value = s.backup?.backup_frequency || 'daily';
                document.getElementById("backup-time").value = s.backup?.backup_time || '02:00';
                document.getElementById("backup-retention").value = s.backup?.retention_days || 30;
                document.getElementById("backup-location").value = s.backup?.backup_location || (window.process ? window.process.env.BACKUP_DIR || './backups' : './backups');
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
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const preferences = {
        tax: {
            default_gst_rate: parseFloat(document.getElementById("pref-gst-rate").value),
            tax_included: document.getElementById("pref-tax-included").checked,
            enable_gst: document.getElementById("pref-enable-gst").checked
        },
        numbering: {
            invoice_prefix: document.getElementById("pref-invoice-prefix").value,
            quotation_prefix: document.getElementById("pref-quotation-prefix").value,
            purchase_prefix: document.getElementById("pref-purchase-prefix").value,
            waybill_prefix: document.getElementById("pref-waybill-prefix").value,
            service_prefix: document.getElementById("pref-service-prefix").value,
        },
        backup: {
            auto_backup_enabled: document.getElementById("backup-auto-enabled").checked,
            backup_frequency: document.getElementById("backup-frequency").value,
            backup_time: document.getElementById("backup-time").value,
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
                document.getElementById("security-password-length").value = s.password_min_length || 8;
                document.getElementById("security-password-uppercase").checked = s.password_require_uppercase !== false;
                document.getElementById("security-password-number").checked = s.password_require_number !== false;
                document.getElementById("security-password-special").checked = s.password_require_special || false;
                document.getElementById("security-max-attempts").value = s.max_login_attempts || 5;
                document.getElementById("security-lockout-duration").value = s.lockout_duration || 15;
                document.getElementById("security-enable-2fa").checked = s.enable_2fa || false;
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
            password_min_length: parseInt(document.getElementById("security-password-length").value),
            password_require_uppercase: document.getElementById("security-password-uppercase").checked,
            password_require_number: document.getElementById("security-password-number").checked,
            password_require_special: document.getElementById("security-password-special").checked,
            max_login_attempts: parseInt(document.getElementById("security-max-attempts").value),
            lockout_duration: parseInt(document.getElementById("security-lockout-duration").value),
            enable_2fa: document.getElementById("security-enable-2fa").checked
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


}
