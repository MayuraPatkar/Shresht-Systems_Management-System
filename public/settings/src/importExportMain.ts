/**
 * Import/Export Page Main Coordinator
 */

declare var settingsBackup: any;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize required modules
    settingsBackup.init();
});

// Backward compatibility wrapper functions
(window as any).initBackupModule = () => settingsBackup.init();
