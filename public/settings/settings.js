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
});

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
            // Display the target section as a flex container, hide others
            sectionElement.style.display = id === sectionId ? "flex" : "none";
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

    fetch(`/settings/backup/export/${selected}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.innerText = data.message;
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB)`;
                }
            } else {
                statusElement.innerText = `Export failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.innerText = "Export failed!";
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
    statusElement.style.color = "blue";

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
                statusElement.innerText = data.message;
                statusElement.style.color = "green";
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
            } else {
                statusElement.innerText = `Restore failed: ${data.message}`;
                statusElement.style.color = "red";
            }
        })
        .catch(err => {
            statusElement.innerText = "Restore failed!";
            statusElement.style.color = "red";
            console.error('Restore error:', err);
        });
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
                statusElement.innerText = data.message;
                if (data.warning) {
                    statusElement.innerText += ` Warning: ${data.warning}`;
                }
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
            } else {
                statusElement.innerText = `Database restore failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.innerText = "Database restore failed!";
            console.error('Database restore error:', err);
        });
});
