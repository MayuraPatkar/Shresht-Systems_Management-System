document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

document.addEventListener("DOMContentLoaded", function () {
    fetch("/admin/admin-info")
        .then(response => response.json())
        .then(data => {
            // Populate the admin info section
            document.getElementById('address').textContent = `Address: ${data.address}`;
            document.getElementById('contact1').textContent = `Contact: ${data.phone.ph1}`;
            document.getElementById('contact2').textContent = `Contact: ${data.phone.ph2}`;
            document.getElementById('email').textContent = `Email: ${data.email}`;
            document.getElementById('website').textContent = `Website: ${data.website}`;
            document.getElementById('GSTIN').textContent = `GSTIN: ${data.GSTIN}`;
            document.getElementById('bankName').textContent = `Bank Name: ${data.bank_details.bank_name}`;
            document.getElementById('accNo').textContent = `Account No: ${data.bank_details.accountNo}`;
            document.getElementById('IFSC').textContent = `IFSC Code: ${data.bank_details.IFSC_code}`;
            document.getElementById('branch').textContent = `Branch: ${data.bank_details.branch}`;
        })
        .catch(error => console.error("Error loading data:", error));
});


// Change Username
document.getElementById("change-username").addEventListener("click", function () {
    const username = document.getElementById("username").value;
    fetch("/admin/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
    })
    .then(response => response.json())
    .then(data => window.electronAPI.showAlert1(data.message))
    .catch(error => console.error("Error changing username:", error));
});

// Change Password
document.getElementById("change-password").addEventListener("click", function () {
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
        window.electronAPI.showAlert1("New password and confirm password do not match.");
        return;
    }

    fetch("/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
    })
    .then(response => response.json())
    .then(data => window.electronAPI.showAlert1(data.message))
    .catch(error => console.error("Error changing password:", error));
});

// Export Data
document.getElementById("export-button").addEventListener("click", function () {
    const format = document.querySelector("input[name='export-format']:checked").value;
    window.location.href = `/admin/export-data?format=${format}`;
});