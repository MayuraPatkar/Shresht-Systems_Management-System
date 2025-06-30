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
        const res = await fetch('/api/comms/unpaid-projects');
        const data = await res.json();
        document.getElementById('total-unpaid').textContent = data.total || 0;
    } catch (err) {
        showStatus('Failed to fetch unpaid projects.', true);
    }
}

// Send automated payment reminders
document.getElementById('send-automated-reminders').onclick = async () => {
    try {
        const res = await fetch('/api/comms/send-automated-reminders', { method: 'POST' });
        const data = await res.json();
        showStatus(data.message || 'Automated reminders sent!');
    } catch (err) {
        showStatus('Failed to send automated reminders.', true);
    }
};

// Manual payment reminder
document.getElementById('manual-reminder-form').onsubmit = async (e) => {
    e.preventDefault();
    const phone = document.getElementById('manual-phone').value.trim();
    if (!phone) return showStatus('Enter a phone number.', true);

    try {
        const res = await fetch('/api/comms/send-manual-reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        showStatus(data.message || 'Manual reminder sent!');
    } catch (err) {
        showStatus('Failed to send manual reminder.', true);
    }
};

// Send invoice
document.getElementById('send-invoice-form').onsubmit = async (e) => {
    e.preventDefault();
    const phone = document.getElementById('invoice-phone').value.trim();
    const invoiceId = document.getElementById('invoice-id').value.trim();
    if (!phone || !invoiceId) return showStatus('Fill all fields.', true);

    try {
        const res = await fetch('/api/comms/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, invoiceId })
        });
        const data = await res.json();
        showStatus(data.message || 'Invoice sent!');
    } catch (err) {
        showStatus('Failed to send invoice.', true);
    }
};

// Send quotation
document.getElementById('send-quotation-form').onsubmit = async (e) => {
    e.preventDefault();
    const phone = document.getElementById('quotation-phone').value.trim();
    const quotationId = document.getElementById('quotation-id').value.trim();
    if (!phone || !quotationId) return showStatus('Fill all fields.', true);

    try {
        const res = await fetch('/api/comms/send-quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, quotationId })
        });
        const data = await res.json();
        showStatus(data.message || 'Quotation sent!');
    } catch (err) {
        showStatus('Failed to send quotation.', true);
    }
};

// Initial load