// Utility function to show a toast or alert
function showStatus(msg, isError = false) {
    // You can replace this with a custom toast/snackbar if you have one
    window.electronAPI?.showAlert1
        ? window.electronAPI.showAlert1(msg)
        : alert(msg);
}

// Fetch and display total unpaid projects
async function fetchUnpaidProjects() {
    try {
        const res = await fetch('/invoice/unpaid-projects');
        const data = await res.json();
        document.getElementById('total-unpaid').textContent = data.total || 0;
    } catch (err) {
        showStatus('Failed to fetch unpaid projects.', true);
    }
}

// Manual payment reminder
document.getElementById('manual-reminder-form').onsubmit = async (e) => {
    e.preventDefault();
    const phone = document.getElementById('manual-phone').value.trim();
    const invoiceId = document.getElementById('manual-invoice-id').value.trim();
    if (!phone) return showStatus('Enter a phone number.', true);

    try {
        const res = await fetch('/comms/send-manual-reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, invoiceId: invoiceId })
        });
        const data = await res.json();
        showStatus(data.message || 'Manual reminder sent!');
    } catch (err) {
        showStatus('Failed to send manual reminder.', true);
    }
};