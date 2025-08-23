// Fetch and populate admin information
document.addEventListener("DOMContentLoaded", () => {
    fetchAdminInfo();
});

// Fetch admin information from the server
function fetchAdminInfo() {
    fetch("/admin/admin-info")
        .then((response) => response.json())
        .then((data) => {
            // Populate the admin info section
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
            console.error("Error loading admin info:", error);
            window.electronAPI.showAlert1("Failed to load admin information. Please try again.");
        });
}

// Toggle visibility of sections
function toggleSection(sectionId) {
    const sections = ["admin-info-section", "change-credentials-section", "data-backup-section"];
    sections.forEach((id) => {
        document.getElementById(id).style.display = id === sectionId ? "flex" : "none";
    });
}

// Event listeners for navigation buttons
document.getElementById("admin-info-button").addEventListener("click", () => {
    toggleSection("admin-info-section");
});

document.getElementById("change-password-button1").addEventListener("click", () => {
    toggleSection("change-credentials-section");
});

document.getElementById("data-control-button").addEventListener("click", () => {
    toggleSection("data-backup-section");
});

// Change Username
document.getElementById("change-username-button").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();

    if (!username) {
        window.electronAPI.showAlert1("Username cannot be empty.");
        return;
    }

    fetch("/admin/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    })
        .then((response) => response.json())
        .then((data) => window.electronAPI.showAlert1(data.message))
        .catch((error) => {
            console.error("Error changing username:", error);
            window.electronAPI.showAlert1("Failed to change username. Please try again.");
        });
});

// Change Password
document.getElementById("change-password-button").addEventListener("click", () => {
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

    fetch("/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
    })
        .then((response) => response.json())
        .then((data) => window.electronAPI.showAlert1(data.message))
        .catch((error) => {
            console.error("Error changing password:", error);
            window.electronAPI.showAlert1("Failed to change password. Please try again.");
        });
});

// Export Data
document.getElementById("export-data-button").addEventListener("click", () => {
    const selected = document.querySelector('input[name="export-data"]:checked').value;
    document.getElementById("backup-status").innerText = `Exporting ${selected} data...`;

    fetch(`settings/backup/export/${selected}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("backup-status").innerText = data.message;
        })
        .catch(err => {
            document.getElementById("backup-status").innerText = "Export failed!";
            console.error(err);
        });
});

document.getElementById("restore-button").addEventListener("click", () => {
    const fileInput = document.getElementById("restore-file");
    if (fileInput.files.length === 0) {
        alert("Please select a backup file.");
        return;
    }

    const formData = new FormData();
    formData.append("backupFile", fileInput.files[0]);

    document.getElementById("backup-status").innerText = "Restoring backup...";

    fetch("/settings/backup/restore", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            document.getElementById("backup-status").innerText = data.message;
        })
        .catch(err => {
            document.getElementById("backup-status").innerText = "Restore failed!";
            console.error(err);
        });
});
