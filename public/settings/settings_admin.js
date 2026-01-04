/**
 * @file Admin and Company Information Management
 * @summary Handles admin info display, company details editing, user credentials, and logout
 */

// Global variable to store original admin data
let originalAdminData = null;

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
}

/**
 * Updates the admin information display with the provided data
 * @param {Object} data - Admin data from the server
 */
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

// --- COMPANY INFO EDITING ---

/**
 * Enters edit mode for company information
 */
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

/**
 * Exits edit mode and returns to view mode
 */
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

/**
 * Saves the edited company information to the server
 */
function saveCompanyInfo() {
    const saveButton = document.getElementById("save-company-info-button");
    const originalContent = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
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
        saveButton.disabled = false;
        saveButton.innerHTML = originalContent;
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updatedData.email)) {
        window.electronAPI.showAlert1("Please enter a valid email address");
        saveButton.disabled = false;
        saveButton.innerHTML = originalContent;
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
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
        });
}

// --- USER CREDENTIAL MANAGEMENT ---

/**
 * Handles username change
 */
function handleChangeUsername() {
    const username = document.getElementById("username").value.trim();

    if (!username) {
        window.electronAPI.showAlert1("Username cannot be empty.");
        return;
    }
    
    // Validate username (alphanumeric and underscore only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        window.electronAPI.showAlert1("Username must be 3-20 characters and contain only letters, numbers, and underscores.");
        return;
    }

    const changeButton = document.getElementById("change-username-button");
    const originalContent = changeButton.innerHTML;
    changeButton.disabled = true;
    changeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

    fetch("/admin/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    })
        .then(response => response.json())
        .then(data => {
            window.electronAPI.showAlert1(data.message);
        })
        .catch((error) => {
            console.error("Error changing username:", error);
            window.electronAPI.showAlert1("Failed to change username. Please try again.");
        })
        .finally(() => {
            changeButton.disabled = false;
            changeButton.innerHTML = originalContent;
        });
}

/**
 * Handles password change
 */
function handleChangePassword() {
    const oldPassword = document.getElementById("old-password").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
        window.electronAPI.showAlert1("All password fields are required.");
        return;
    }

    if (newPassword !== confirmPassword) {
        window.electronAPI.showAlert1("New password and confirm password do not match.");
        return;
    }
    
    // Basic password strength validation
    if (newPassword.length < 4) {
        window.electronAPI.showAlert1("New password must be at least 4 characters long.");
        return;
    }

    const changeButton = document.getElementById("change-password-button");
    const originalContent = changeButton.innerHTML;
    changeButton.disabled = true;
    changeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

    fetch("/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
    })
        .then(response => response.json())
        .then(data => {
            window.electronAPI.showAlert1(data.message);
            if (data.message.includes("success")) {
                // Clear password fields on success
                document.getElementById("old-password").value = "";
                document.getElementById("new-password").value = "";
                document.getElementById("confirm-password").value = "";
            }
        })
        .catch((error) => {
            console.error("Error changing password:", error);
            window.electronAPI.showAlert1("Failed to change password. Please try again.");
        })
        .finally(() => {
            changeButton.disabled = false;
            changeButton.innerHTML = originalContent;
        });
}

/**
 * Handles user logout
 */
function handleLogout() {
    window.electronAPI.showAlert2('Are you sure you want to log out?');
    window.electronAPI.receiveAlertResponse((response) => {
        if (response === 'Yes') {
            sessionStorage.clear();
            window.location.href = '/';
        }
    });
}

/**
 * Initialize admin module event listeners
 */
function initAdminModule() {
    // Company info editing
    document.getElementById("edit-company-info-button")?.addEventListener("click", enterEditMode);
    document.getElementById("save-company-info-button")?.addEventListener("click", saveCompanyInfo);
    document.getElementById("cancel-edit-company-button")?.addEventListener("click", exitEditMode);
    
    // Credential management
    document.getElementById("change-username-button")?.addEventListener("click", handleChangeUsername);
    document.getElementById("change-password-button")?.addEventListener("click", handleChangePassword);
    
    // Add keyboard navigation for username change
    document.getElementById("username")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleChangeUsername();
    });

    // Add keyboard navigation for password change
    const passwordFields = ["old-password", "new-password", "confirm-password"];
    passwordFields.forEach(id => {
        document.getElementById(id)?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleChangePassword();
        });
    });
    
    // Logout
    document.getElementById("logout-button")?.addEventListener("click", handleLogout);
}
