/**
 * @file Admin panel script for handling information display, credential changes, and data backup/restore.
 * @summary This script manages the client-side logic for an admin settings page. It fetches and displays
 * admin information, allows for changing usernames and passwords, and provides functionality
 * for exporting and restoring database collections or the entire database.
 */

// --- CORE EVENT LISTENERS ---

/**
 * Fetches initial admin information once the DOM is fully loaded.
 * This ensures that the elements the script needs to populate are available.
 */
document.addEventListener("DOMContentLoaded", () => {
    fetchAdminInfo();
    checkBackupToolsStatus();
});

/**
 * Check if backup tools are available on the system.
 * This helps inform users if MongoDB tools need to be installed.
 */
function checkBackupToolsStatus() {
    fetch('/settings/backup/status')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tools = data.tools;
                const allToolsAvailable = Object.values(tools).every(available => available);
                
                if (!allToolsAvailable) {
                    console.warn('Some MongoDB tools are not available:', tools);
                    const statusElement = document.getElementById("backup-status");
                    if (statusElement) {
                        statusElement.className = "text-orange-700 font-medium";
                        statusElement.innerText = "Warning: Some MongoDB backup tools are not installed. Native backup will be used.";
                    }
                }
            }
        })
        .catch(err => {
            console.error('Failed to check backup tools status:', err);
        });
}

// --- DATA FETCHING AND DISPLAY ---

/**
 * Fetches administrative information from the server via a GET request.
 * Populates the 'admin-info-section' with the retrieved data, including
 * contact details, GSTIN, and bank information. Handles potential network
 * or server errors by displaying an alert to the user.
 */
function fetchAdminInfo() {
    fetch("/admin/admin-info")
        .then((response) => {
            // Check if the response is successful (status code 200-299)
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then((data) => {
            // Populate the admin info section with data from the server
            document.getElementById("admin-address").textContent = `Address: ${data.address}`;
            document.getElementById("admin-contact1").textContent = `Contact: ${data.phone.ph1}`;
            document.getElementById("admin-contact2").textContent = `Contact: ${data.phone.ph2}`;
            document.getElementById("admin-email").textContent = `Email: ${data.email}`;
            document.getElementById("admin-website").textContent = `Website: ${data.website}`;
            document.getElementById("admin-gstin").textContent = `GSTIN: ${data.GSTIN}`;
            document.getElementById("bank-name").textContent = `Bank Name: ${data.bank_details.bank_name}`;
            
            // Check if account-holder element exists before setting it
            const accountHolderElement = document.getElementById("account-holder");
            if (accountHolderElement && data.bank_details.account_holder) {
                accountHolderElement.textContent = `Account Holder: ${data.bank_details.account_holder}`;
            }
            
            document.getElementById("account-number").textContent = `Account No: ${data.bank_details.accountNo}`;
            document.getElementById("ifsc-code").textContent = `IFSC Code: ${data.bank_details.IFSC_code}`;
            document.getElementById("branch-name").textContent = `Branch: ${data.bank_details.branch}`;
        })
        .catch((error) => {
            // Log the error and show an alert to the user if the fetch fails
            console.error("Error loading admin info:", error);
            window.electronAPI.showAlert1("Failed to load admin information. Please try again.");
        });
}

// --- UI NAVIGATION AND SECTION TOGGLING ---

/**
 * Manages the visibility of different sections in the admin panel.
 * It ensures that only one section is visible at a time.
 * @param {string} sectionId The ID of the section to display.
 */
function toggleSection(sectionId) {
    const sections = ["admin-info-section", "change-credentials-section", "data-backup-section"];
    sections.forEach((id) => {
        const sectionElement = document.getElementById(id);
        if (sectionElement) {
            // Display the target section as a block container, hide others with fade animation
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

/**
 * Attaches click event listeners to the main navigation buttons.
 * Each button calls toggleSection to display the corresponding content.
 */
document.getElementById("admin-info-button").addEventListener("click", () => {
    toggleSection("admin-info-section");
});

document.getElementById("change-password-button1").addEventListener("click", () => {
    toggleSection("change-credentials-section");
});

document.getElementById("data-control-button").addEventListener("click", () => {
    toggleSection("data-backup-section");
});

/**
 * Handles the logout button click.
 * Clears session storage and redirects to the login page.
 */
document.getElementById("logout-button").addEventListener("click", () => {
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = '/';
});

// --- USER CREDENTIAL MANAGEMENT ---

/**
 * Handles the "Change Username" button click.
 * It retrieves the new username, validates it, and sends a POST request
 * to the server to update it.
 */
document.getElementById("change-username-button").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();

    // Basic validation to ensure the username is not empty
    if (!username) {
        window.electronAPI.showAlert1("Username cannot be empty.");
        return;
    }

    // Send the new username to the server
    fetch("/admin/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    })
        .then(response => response.json())
        .then(data => window.electronAPI.showAlert1(data.message))
        .catch((error) => {
            console.error("Error changing username:", error);
            window.electronAPI.showAlert1("Failed to change username. Please try again.");
        });
});

/**
 * Handles the "Change Password" button click.
 * It validates the input fields (old password, new password, confirm password)
 * and sends a POST request to the server to update the password.
 */
document.getElementById("change-password-button").addEventListener("click", () => {
    const oldPassword = document.getElementById("old-password").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    // Ensure all fields are filled
    if (!oldPassword || !newPassword || !confirmPassword) {
        window.electronAPI.showAlert1("All password fields are required.");
        return;
    }

    // Ensure the new password and confirmation match
    if (newPassword !== confirmPassword) {
        window.electronAPI.showAlert1("New password and confirm password do not match.");
        return;
    }

    // Send the old and new passwords to the server for verification and update
    fetch("/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
    })
        .then(response => response.json())
        .then(data => window.electronAPI.showAlert1(data.message))
        .catch((error) => {
            console.error("Error changing password:", error);
            window.electronAPI.showAlert1("Failed to change password. Please try again.");
        });
});

// --- DATA BACKUP AND RESTORE ---

/**
 * Handles the "Export Data" button click.
 * It identifies which data set (e.g., 'customers', 'inventory') is selected
 * and sends a GET request to the server to trigger the export process.
 */
document.getElementById("export-data-button").addEventListener("click", () => {
    const selectedElement = document.querySelector('input[name="export-data"]:checked');
    const statusElement = document.getElementById("backup-status");
    
    if (!selectedElement) {
        window.electronAPI.showAlert1("Please select a data type to export.");
        return;
    }
    
    const selected = selectedElement.value;
    statusElement.innerText = `Exporting ${selected} data...`;
    statusElement.className = "text-blue-700 font-medium"; // Blue for processing

    fetch(`/settings/backup/export/${selected}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium"; // Green for success
                statusElement.innerText = data.message;
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB)`;
                }
            } else {
                statusElement.className = "text-red-700 font-medium"; // Red for failure
                statusElement.innerText = `Export failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-red-700 font-medium"; // Red for error
            statusElement.innerText = `Export failed: ${err.message}`;
            console.error('Export error:', err);
        });
});

/**
 * Handles the "Restore Collection" button click.
 * It takes the selected backup file and collection name, packages them into
 * a FormData object, and sends a POST request to restore the specific collection.
 */
document.getElementById("restore-collection-button").addEventListener("click", () => {
    const fileInput = document.getElementById("restore-collection-file");
    const statusElement = document.getElementById("backup-status");

    if (fileInput.files.length === 0) {
        window.electronAPI.showAlert1("Please select a backup file.");
        return;
    }

    // Validate file type
    const file = fileInput.files[0];
    const allowedExtensions = ['.json', '.bson', '.gz', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
        window.electronAPI.showAlert1(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
        window.electronAPI.showAlert1("File size exceeds 100MB limit.");
        return;
    }

    // Validate collection selection
    const collectionSelect = document.getElementById("collection-select");
    if (!collectionSelect || !collectionSelect.value) {
        window.electronAPI.showAlert1("Please select a collection to restore.");
        return;
    }

    // Use FormData to handle file uploads
    const formData = new FormData();
    formData.append("backupFile", fileInput.files[0]);
    formData.append("collection", collectionSelect.value);

    statusElement.innerText = "Restoring collection...";
    statusElement.className = "text-blue-700 font-medium";

    fetch("/settings/backup/restore-collection", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium";
                statusElement.innerText = data.message;
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
                // Clear file input
                fileInput.value = "";
            } else {
                statusElement.className = "text-red-700 font-medium";
                statusElement.innerText = `Restore failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-red-700 font-medium";
            statusElement.innerText = `Restore failed: ${err.message}`;
            console.error('Restore error:', err);
        });
});

/**
 * Handles the "Google Drive Backup" button click.
 * Shows a notification that cloud backup is not yet implemented.
 */
document.getElementById("google-drive-backup")?.addEventListener("click", () => {
    window.electronAPI.showAlert1("Cloud backup feature is coming soon! Currently, you can use local export/restore.");
});

/**
 * Handles the "Restore Database" button click.
 * It takes the selected backup file and sends it as FormData in a POST request
 * to restore the entire database.
 */
document.getElementById("restore-database-button").addEventListener("click", () => {
    const fileInput = document.getElementById("restore-database-file");
    const statusElement = document.getElementById("backup-status");

    if (fileInput.files.length === 0) {
        window.electronAPI.showAlert1("Please select a backup file.");
        return;
    }

    // Validate file type (only BSON formats for database restore)
    const file = fileInput.files[0];
    const allowedExtensions = ['.bson', '.gz', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
        window.electronAPI.showAlert1(`Invalid file type for database restore. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
        window.electronAPI.showAlert1("File size exceeds 100MB limit.");
        return;
    }

    const formData = new FormData();
    formData.append("backupFile", fileInput.files[0]);

    statusElement.innerText = "Restoring database...";
    statusElement.className = "text-blue-700 font-medium";

    fetch("/settings/backup/restore-database", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium";
                statusElement.innerText = data.message;
                if (data.warning) {
                    statusElement.innerText += ` Warning: ${data.warning}`;
                }
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
                // Clear file input
                fileInput.value = "";
            } else {
                statusElement.className = "text-red-700 font-medium";
                statusElement.innerText = `Database restore failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-orange-700 font-medium";
            statusElement.innerText = `Database restore failed: ${err.message}`;
            console.error('Database restore error:', err);
        });
});

// ==================== NEW SETTINGS FUNCTIONALITY ====================

// Global variable to store original admin data
let originalAdminData = null;

// Add new navigation buttons event listeners
document.getElementById("preferences-button")?.addEventListener("click", () => {
    toggleSection("preferences-section");
    loadPreferences();
});

document.getElementById("security-button")?.addEventListener("click", () => {
    toggleSection("security-section");
    loadSecuritySettings();
});

document.getElementById("notifications-button")?.addEventListener("click", () => {
    toggleSection("notifications-section");
    loadNotificationSettings();
});

document.getElementById("about-button")?.addEventListener("click", () => {
    toggleSection("about-section");
    loadSystemInfo();
    loadDatabaseStats();
});

// Update toggleSection to include new sections
function toggleSectionExtended(sectionId) {
    const sections = [
        "admin-info-section",
        "change-credentials-section",
        "data-backup-section",
        "preferences-section",
        "security-section",
        "notifications-section",
        "about-section"
    ];
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

// Override the original toggleSection
toggleSection = toggleSectionExtended;

// ==================== COMPANY INFO EDITING ====================

// Edit company info button
document.getElementById("edit-company-info-button")?.addEventListener("click", () => {
    enterEditMode();
});

// Save company info button
document.getElementById("save-company-info-button")?.addEventListener("click", () => {
    saveCompanyInfo();
});

// Cancel edit button
document.getElementById("cancel-edit-company-button")?.addEventListener("click", () => {
    exitEditMode();
});

function enterEditMode() {
    // Hide view mode, show edit mode
    document.getElementById("company-view-mode").classList.add("hidden");
    document.getElementById("bank-view-mode").classList.add("hidden");
    document.getElementById("company-edit-mode").classList.remove("hidden");
    document.getElementById("bank-edit-mode").classList.remove("hidden");
    
    // Hide edit button, show save/cancel
    document.getElementById("edit-company-info-button").classList.add("hidden");
    document.getElementById("edit-company-actions").classList.remove("hidden");
    document.getElementById("edit-company-actions").classList.add("flex");
    
    // Populate edit fields with current data
    if (originalAdminData) {
        document.getElementById("edit-company").value = originalAdminData.company || '';
        document.getElementById("edit-address").value = originalAdminData.address || '';
        document.getElementById("edit-state").value = originalAdminData.state || '';
        document.getElementById("edit-phone1").value = originalAdminData.phone?.ph1 || '';
        document.getElementById("edit-phone2").value = originalAdminData.phone?.ph2 || '';
        document.getElementById("edit-email").value = originalAdminData.email || '';
        document.getElementById("edit-website").value = originalAdminData.website || '';
        document.getElementById("edit-gstin").value = originalAdminData.GSTIN || '';
        
        document.getElementById("edit-bank-name").value = originalAdminData.bank_details?.bank_name || '';
        document.getElementById("edit-account-holder").value = originalAdminData.bank_details?.name || '';
        document.getElementById("edit-account-number").value = originalAdminData.bank_details?.accountNo || '';
        document.getElementById("edit-ifsc").value = originalAdminData.bank_details?.IFSC_code || '';
        document.getElementById("edit-branch").value = originalAdminData.bank_details?.branch || '';
    }
}

function exitEditMode() {
    // Show view mode, hide edit mode
    document.getElementById("company-view-mode").classList.remove("hidden");
    document.getElementById("bank-view-mode").classList.remove("hidden");
    document.getElementById("company-edit-mode").classList.add("hidden");
    document.getElementById("bank-edit-mode").classList.add("hidden");
    
    // Show edit button, hide save/cancel
    document.getElementById("edit-company-info-button").classList.remove("hidden");
    document.getElementById("edit-company-actions").classList.add("hidden");
    document.getElementById("edit-company-actions").classList.remove("flex");
}

function saveCompanyInfo() {
    const updatedData = {
        company: document.getElementById("edit-company").value.trim(),
        address: document.getElementById("edit-address").value.trim(),
        state: document.getElementById("edit-state").value.trim(),
        phone: {
            ph1: document.getElementById("edit-phone1").value.trim(),
            ph2: document.getElementById("edit-phone2").value.trim()
        },
        email: document.getElementById("edit-email").value.trim(),
        website: document.getElementById("edit-website").value.trim(),
        GSTIN: document.getElementById("edit-gstin").value.trim(),
        bank_details: {
            bank_name: document.getElementById("edit-bank-name").value.trim(),
            name: document.getElementById("edit-account-holder").value.trim(),
            accountNo: document.getElementById("edit-account-number").value.trim(),
            IFSC_code: document.getElementById("edit-ifsc").value.trim(),
            branch: document.getElementById("edit-branch").value.trim()
        }
    };
    
    // Validate required fields
    if (!updatedData.company || !updatedData.address || !updatedData.phone.ph1 || !updatedData.email) {
        window.electronAPI.showAlert1("Please fill in all required fields (Company, Address, Phone 1, Email)");
        return;
    }
    
    fetch("/settings/company-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.electronAPI.showAlert1("Company information updated successfully!");
                originalAdminData = data.admin;
                updateAdminDisplay(data.admin);
                exitEditMode();
            } else {
                window.electronAPI.showAlert1(`Failed to update: ${data.message}`);
            }
        })
        .catch(error => {
            console.error("Error updating company info:", error);
            window.electronAPI.showAlert1("Failed to update company information. Please try again.");
        });
}

function updateAdminDisplay(data) {
    document.getElementById("admin-company-name").textContent = data.company || 'Shresht Systems';
    document.getElementById("admin-address").textContent = `Address: ${data.address}`;
    document.getElementById("admin-state").textContent = `State: ${data.state}`;
    document.getElementById("admin-contact1").textContent = `Contact: ${data.phone.ph1}`;
    document.getElementById("admin-contact2").textContent = `Contact: ${data.phone.ph2}`;
    document.getElementById("admin-email").textContent = `Email: ${data.email}`;
    document.getElementById("admin-website").textContent = `Website: ${data.website}`;
    document.getElementById("admin-gstin").textContent = `GSTIN: ${data.GSTIN}`;
    document.getElementById("bank-name").textContent = `Bank Name: ${data.bank_details.bank_name}`;
    
    const accountHolderElement = document.getElementById("account-holder");
    if (accountHolderElement && data.bank_details.name) {
        accountHolderElement.textContent = `Account Holder: ${data.bank_details.name}`;
    }
    
    document.getElementById("account-number").textContent = `Account No: ${data.bank_details.accountNo}`;
    document.getElementById("ifsc-code").textContent = `IFSC Code: ${data.bank_details.IFSC_code}`;
    document.getElementById("branch-name").textContent = `Branch: ${data.bank_details.branch}`;
}

// Update fetchAdminInfo to store original data
const originalFetchAdminInfo = fetchAdminInfo;
fetchAdminInfo = function() {
    fetch("/admin/admin-info")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then((data) => {
            originalAdminData = data;
            updateAdminDisplay(data);
        })
        .catch((error) => {
            console.error("Error loading admin info:", error);
            window.electronAPI.showAlert1("Failed to load admin information. Please try again.");
        });
};

// ==================== SYSTEM PREFERENCES ====================

function loadPreferences() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                const s = data.settings;
                
                // General settings
                document.getElementById("pref-currency").value = s.preferences?.currency || '₹';
                document.getElementById("pref-decimal").value = s.preferences?.decimal_places || 2;
                document.getElementById("pref-date-format").value = s.preferences?.date_format || 'DD/MM/YYYY';
                document.getElementById("pref-time-format").value = s.preferences?.time_format || '12h';
                
                // Tax settings
                document.getElementById("pref-gst-rate").value = s.tax?.default_gst_rate || 18;
                document.getElementById("pref-tax-included").checked = s.tax?.tax_included || false;
                document.getElementById("pref-enable-gst").checked = s.tax?.enable_gst !== false;
                
                // Numbering
                document.getElementById("pref-invoice-prefix").value = s.numbering?.invoice_prefix || 'INV';
                document.getElementById("pref-invoice-start").value = s.numbering?.invoice_start || 1;
                document.getElementById("pref-quotation-prefix").value = s.numbering?.quotation_prefix || 'QUO';
                document.getElementById("pref-quotation-start").value = s.numbering?.quotation_start || 1;
                
                // Theme
                document.getElementById("pref-theme").value = s.branding?.theme || 'light';
                
                // Backup settings
                document.getElementById("backup-auto-enabled").checked = s.backup?.auto_backup_enabled || false;
                document.getElementById("backup-frequency").value = s.backup?.backup_frequency || 'daily';
                document.getElementById("backup-time").value = s.backup?.backup_time || '02:00';
                document.getElementById("backup-retention").value = s.backup?.retention_days || 30;
                
                if (s.backup?.last_backup) {
                    const lastBackup = new Date(s.backup.last_backup).toLocaleString();
                    document.getElementById("last-backup-time").textContent = lastBackup;
                } else {
                    document.getElementById("last-backup-time").textContent = "Never";
                }
                
                // Update logo preview if exists
                if (s.branding?.logo_path) {
                    document.getElementById("logo-preview").src = s.branding.logo_path;
                }
            }
        })
        .catch(err => {
            console.error('Failed to load preferences:', err);
        });
}

document.getElementById("save-preferences-button")?.addEventListener("click", () => {
    const preferences = {
        preferences: {
            currency: document.getElementById("pref-currency").value,
            decimal_places: parseInt(document.getElementById("pref-decimal").value),
            date_format: document.getElementById("pref-date-format").value,
            time_format: document.getElementById("pref-time-format").value
        },
        tax: {
            default_gst_rate: parseFloat(document.getElementById("pref-gst-rate").value),
            tax_included: document.getElementById("pref-tax-included").checked,
            enable_gst: document.getElementById("pref-enable-gst").checked
        },
        numbering: {
            invoice_prefix: document.getElementById("pref-invoice-prefix").value,
            invoice_start: parseInt(document.getElementById("pref-invoice-start").value),
            quotation_prefix: document.getElementById("pref-quotation-prefix").value,
            quotation_start: parseInt(document.getElementById("pref-quotation-start").value)
        },
        branding: {
            theme: document.getElementById("pref-theme").value
        },
        backup: {
            auto_backup_enabled: document.getElementById("backup-auto-enabled").checked,
            backup_frequency: document.getElementById("backup-frequency").value,
            backup_time: document.getElementById("backup-time").value,
            retention_days: parseInt(document.getElementById("backup-retention").value)
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
        });
});

// Logo upload handler
document.getElementById("logo-upload")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("logo", file);
    
    fetch('/settings/logo/upload', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById("logo-preview").src = data.logo_path + '?t=' + Date.now();
                window.electronAPI.showAlert1("Logo uploaded successfully!");
            } else {
                window.electronAPI.showAlert1(`Upload failed: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('Failed to upload logo:', err);
            window.electronAPI.showAlert1("Failed to upload logo. Please try again.");
        });
});

// ==================== SECURITY SETTINGS ====================

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

document.getElementById("save-security-button")?.addEventListener("click", () => {
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
        });
});

// ==================== NOTIFICATION SETTINGS ====================

function loadNotificationSettings() {
    fetch('/settings/preferences')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                const n = data.settings.notifications || {};
                
                document.getElementById("notif-stock-enabled").checked = n.enable_stock_alerts !== false;
                document.getElementById("notif-stock-threshold").value = n.low_stock_threshold || 10;
                document.getElementById("notif-invoice-enabled").checked = n.enable_invoice_reminders !== false;
                document.getElementById("notif-invoice-days").value = n.invoice_reminder_days || 7;
                document.getElementById("notif-service-enabled").checked = n.enable_service_reminders !== false;
                document.getElementById("notif-service-days").value = n.service_reminder_days || 3;
                document.getElementById("notif-email-enabled").checked = n.enable_email_notifications || false;
            }
        })
        .catch(err => {
            console.error('Failed to load notification settings:', err);
        });
}

document.getElementById("save-notifications-button")?.addEventListener("click", () => {
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
        });
});

// ==================== SYSTEM INFO & STATS ====================

function loadSystemInfo() {
    fetch('/settings/system-info')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.system) {
                const s = data.system;
                document.getElementById("app-name").textContent = s.app_name || 'Shresht Systems Management';
                document.getElementById("app-version").textContent = s.app_version || '1.0.0';
                document.getElementById("node-version").textContent = s.node_version || '-';
                document.getElementById("platform").textContent = s.platform || '-';
                document.getElementById("total-memory").textContent = s.total_memory || '-';
                document.getElementById("free-memory").textContent = s.free_memory || '-';
                document.getElementById("arch").textContent = s.arch || '-';
                document.getElementById("uptime").textContent = s.uptime || '-';
            }
        })
        .catch(err => {
            console.error('Failed to load system info:', err);
        });
}

function loadDatabaseStats() {
    fetch('/settings/database/stats')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.stats) {
                const s = data.stats;
                document.getElementById("db-size").textContent = s.database_size_mb + ' MB';
                document.getElementById("storage-size").textContent = s.storage_size_mb + ' MB';
                document.getElementById("total-docs").textContent = s.total_documents.toLocaleString();
                
                // Update collection counts
                const collections = s.collections || {};
                document.getElementById("count-invoices").textContent = collections.invoices || 0;
                document.getElementById("count-quotations").textContent = collections.quotations || 0;
                document.getElementById("count-purchases").textContent = collections.purchaseorders || 0;
                document.getElementById("count-waybills").textContent = collections.waybills || 0;
                document.getElementById("count-stock").textContent = collections.stocks || 0;
                document.getElementById("count-services").textContent = collections.services || 0;
                document.getElementById("count-employees").textContent = collections.employees || 0;
                document.getElementById("count-attendence").textContent = collections.attendencebooks || 0;
            }
        })
        .catch(err => {
            console.error('Failed to load database stats:', err);
        });
}

document.getElementById("refresh-stats-button")?.addEventListener("click", () => {
    loadDatabaseStats();
    window.electronAPI.showAlert1("Statistics refreshed!");
});
