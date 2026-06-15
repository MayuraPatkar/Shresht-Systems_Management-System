/**
 * Settings Page Main Coordinator
 */

declare var settingsAdmin: any;
declare var settingsBackup: any;
declare var settingsPreferences: any;
declare var settingsSystem: any;
declare var settingsUtils: any;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize all modules
    settingsAdmin.init();
    settingsBackup.init();
    settingsPreferences.init();
    settingsSystem.init();

    // Load initial data
    settingsAdmin.fetchAdminInfo();
    settingsBackup.checkBackupToolsStatus();
    settingsSystem.loadSystemInfo();
    settingsSystem.loadDatabaseStats();

    // Set up navigation event listeners
    
    // Admin Info section
    document.getElementById("admin-info-button")?.addEventListener("click", () => {
        settingsUtils.toggleSection("admin-info-section");
        settingsSystem.loadSystemInfo();
        settingsSystem.loadDatabaseStats();
        settingsSystem.loadChangelog();
        settingsSystem.startSystemInfoUpdates();
    });

    // Data Backup section
    document.getElementById("data-control-button")?.addEventListener("click", () => {
        settingsUtils.toggleSection("data-backup-section");
        settingsBackup.loadLastBackupStatus();
    });

    // Preferences section
    document.getElementById("preferences-button")?.addEventListener("click", () => {
        settingsUtils.toggleSection("preferences-section");
        settingsPreferences.loadPreferences();
    });

    // Security section
    document.getElementById("security-button")?.addEventListener("click", () => {
        settingsUtils.toggleSection("security-section");
        settingsPreferences.loadSecuritySettings();
    });

    // Hide Integrations tab for manager role
    const userRole = sessionStorage.getItem('userRole');
    if (userRole === 'manager') {
        const integrationsBtn = document.getElementById('integrations-button');
        if (integrationsBtn) integrationsBtn.style.display = 'none';
    }

    // Integrations/WhatsApp section
    document.getElementById("integrations-button")?.addEventListener("click", () => {
        settingsUtils.toggleSection("integrations-section");
        settingsPreferences.loadWhatsAppStatus();
        settingsPreferences.loadCloudinaryStatus();
    });
});

// Legacy backward compatibility wrapper functions just in case global scripts reference them
(window as any).toggleSection = (sectionId: string) => settingsUtils.toggleSection(sectionId);
(window as any).initAdminModule = () => settingsAdmin.init();
(window as any).initBackupModule = () => settingsBackup.init();
(window as any).initPreferencesModule = () => settingsPreferences.init();
(window as any).initSystemModule = () => settingsSystem.init();
(window as any).fetchAdminInfo = () => settingsAdmin.fetchAdminInfo();
(window as any).checkBackupToolsStatus = () => settingsBackup.checkBackupToolsStatus();
(window as any).loadLastBackupStatus = () => settingsBackup.loadLastBackupStatus();
(window as any).loadPreferences = () => settingsPreferences.loadPreferences();
(window as any).loadSecuritySettings = () => settingsPreferences.loadSecuritySettings();
(window as any).loadWhatsAppStatus = () => settingsPreferences.loadWhatsAppStatus();
(window as any).loadCloudinaryStatus = () => settingsPreferences.loadCloudinaryStatus();
(window as any).loadSystemInfo = () => settingsSystem.loadSystemInfo();
(window as any).loadDatabaseStats = () => settingsSystem.loadDatabaseStats();
(window as any).loadChangelog = () => settingsSystem.loadChangelog();
(window as any).startSystemInfoUpdates = () => settingsSystem.startSystemInfoUpdates();
(window as any).cleanupSystemModule = () => settingsSystem.cleanup();
