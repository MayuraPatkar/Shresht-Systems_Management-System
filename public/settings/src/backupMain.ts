/**
 * Backup Page Main Coordinator
 */

declare var settingsBackup: any;
declare var settingsPreferences: any;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize required modules
    settingsBackup.init();
    settingsPreferences.init();

    // Load initial data
    settingsBackup.checkBackupToolsStatus();
    settingsBackup.loadLastBackupStatus();
    settingsPreferences.loadPreferences();
});

// Backward compatibility wrapper functions
(window as any).initBackupModule = () => settingsBackup.init();
(window as any).checkBackupToolsStatus = () => settingsBackup.checkBackupToolsStatus();
(window as any).loadLastBackupStatus = () => settingsBackup.loadLastBackupStatus();
(window as any).loadPreferences = () => settingsPreferences.loadPreferences();
