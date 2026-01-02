/**
 * @file Settings Page Main Coordinator
 * @summary Main controller for the settings page. Handles section navigation and module initialization.
 * 
 * Module Structure:
 * - settings_admin.js: Admin info, company details, credentials, logout
 * - settings_backup.js: Data backup/restore functionality
 * - settings_preferences.js: Preferences, security, notification settings
 * - settings_system.js: System info and database statistics
 */

// --- INITIALIZATION ---

/**
 * Initialize all settings modules once the DOM is fully loaded
 */
document.addEventListener("DOMContentLoaded", () => {
    // Initialize all modules
    initAdminModule();
    initBackupModule();
    initPreferencesModule();
    initSystemModule();
    
    // Load initial data
    fetchAdminInfo();
    checkBackupToolsStatus();
});

// --- UI NAVIGATION AND SECTION TOGGLING ---

/**
 * Manages the visibility of different sections in the admin panel.
 * It ensures that only one section is visible at a time.
 * @param {string} sectionId The ID of the section to display.
 */
function toggleSection(sectionId) {
    const sections = [
        "admin-info-section",
        "change-credentials-section",
        "data-backup-section",
        "preferences-section",
        "security-section",
        "notifications-section",
        "integrations-section",
        "about-section"
    ];
    
    // Cleanup when leaving about section
    const currentAboutSection = document.getElementById("about-section");
    if (currentAboutSection && !currentAboutSection.classList.contains('hidden') && sectionId !== "about-section") {
        if (typeof cleanupSystemModule === 'function') {
            cleanupSystemModule();
        }
    }
    
    sections.forEach((id) => {
        const sectionElement = document.getElementById(id);
        if (sectionElement) {
            if (id === sectionId) {
                sectionElement.classList.remove('hidden');
                sectionElement.classList.add('fade-in');
            } else {
                sectionElement.classList.add('hidden');
                sectionElement.classList.remove('fade-in');
            }
        }
    });
}

// --- NAVIGATION BUTTON EVENT LISTENERS ---

// Admin Info section
document.getElementById("admin-info-button")?.addEventListener("click", () => {
    toggleSection("admin-info-section");
});

// Change Credentials section
document.getElementById("change-password-button1")?.addEventListener("click", () => {
    toggleSection("change-credentials-section");
});

// Data Backup section
document.getElementById("data-control-button")?.addEventListener("click", () => {
    toggleSection("data-backup-section");
    if (typeof loadLastBackupStatus === 'function') {
        loadLastBackupStatus();
    }
});

// Preferences section
document.getElementById("preferences-button")?.addEventListener("click", () => {
    toggleSection("preferences-section");
    loadPreferences();
});

// Security section
document.getElementById("security-button")?.addEventListener("click", () => {
    toggleSection("security-section");
    loadSecuritySettings();
});

// Notifications section
document.getElementById("notifications-button")?.addEventListener("click", () => {
    toggleSection("notifications-section");
    loadNotificationSettings();
});

// Integrations/WhatsApp section
document.getElementById("integrations-button")?.addEventListener("click", () => {
    toggleSection("integrations-section");
    loadWhatsAppStatus();
});

// About section
document.getElementById("about-button")?.addEventListener("click", () => {
    toggleSection("about-section");
    loadSystemInfo();
    loadDatabaseStats();
    loadChangelog();
    startSystemInfoUpdates();
});
