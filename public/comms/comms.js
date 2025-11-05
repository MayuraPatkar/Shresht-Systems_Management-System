// Utility function to show notifications
function showNotification(msg, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `fixed top-28 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
        } text-white font-semibold`;
    notif.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${msg}</span>
        </div>
    `;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Show loading state
function setLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId) || document.querySelector(`button[type="submit"]`);
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.classList.add('opacity-70', 'cursor-not-allowed');
        const originalText = button.innerHTML;
        button.dataset.originalText = originalText;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Sending...</span>
        `;
    } else {
        button.disabled = false;
        button.classList.remove('opacity-70', 'cursor-not-allowed');
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// Validate phone number (basic validation)
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

// Format phone number for WhatsApp (add country code if needed)
function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');

    // If doesn't start with country code, assume India (+91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
}

// Fetch and display total unpaid projects
async function fetchUnpaidProjects() {
    try {
        const res = await fetch('/invoice/unpaid-count');

        if (!res.ok) {
            throw new Error('Failed to fetch unpaid projects');
        }

        const data = await res.json();
        const totalElement = document.getElementById('total-unpaid');

        if (totalElement) {
            totalElement.textContent = data.count || 0;

            // Update button state based on count
            const autoButton = document.getElementById('send-automated-reminders');
            if (autoButton) {
                if (data.count > 0) {
                    autoButton.classList.remove('cursor-not-allowed', 'opacity-70');
                    autoButton.disabled = false;
                } else {
                    autoButton.classList.add('cursor-not-allowed', 'opacity-70');
                    autoButton.disabled = true;
                }
            }
        }
    } catch (err) {
        console.error('Error fetching unpaid projects:', err);
        showNotification('Failed to fetch unpaid projects.', 'error');
    }
}

// Manual payment reminder form
document.addEventListener('DOMContentLoaded', function () {
    // Fetch unpaid projects on load
    fetchUnpaidProjects();

    // Manual reminder form
    const manualReminderForm = document.getElementById('manual-reminder-form');
    if (manualReminderForm) {
        manualReminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('manual-phone');
            const invoiceIdInput = document.getElementById('manual-invoice-id');

            const phone = phoneInput.value.trim();
            const invoiceId = invoiceIdInput.value.trim();

            // Validation
            if (!phone) {
                showNotification('Please enter a phone number.', 'error');
                phoneInput.focus();
                return;
            }

            if (!validatePhone(phone)) {
                showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                phoneInput.focus();
                return;
            }

            if (!invoiceId) {
                showNotification('Please enter an invoice ID.', 'error');
                invoiceIdInput.focus();
                return;
            }

            const formattedPhone = formatPhoneNumber(phone);

            try {
                setLoading('manual-reminder-submit', true);

                const res = await fetch('/comms/send-manual-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: formattedPhone,
                        invoiceId: invoiceId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Payment reminder sent successfully!', 'success');
                    manualReminderForm.reset();
                } else {
                    showNotification(data.message || 'Failed to send reminder.', 'error');
                }
            } catch (err) {
                console.error('Error sending manual reminder:', err);
                showNotification('Failed to send manual reminder. Please try again.', 'error');
            } finally {
                setLoading('manual-reminder-submit', false);
            }
        });
    }

    // Send message form
    const sendMessageForm = document.getElementById('send-message-form');
    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('message-phone');
            const messageInput = document.getElementById('message-content');

            const phone = phoneInput.value.trim();
            const message = messageInput.value.trim();

            // Validation
            if (!phone) {
                showNotification('Please enter a phone number.', 'error');
                phoneInput.focus();
                return;
            }

            if (!validatePhone(phone)) {
                showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                phoneInput.focus();
                return;
            }

            if (!message) {
                showNotification('Please enter a message.', 'error');
                messageInput.focus();
                return;
            }

            const formattedPhone = formatPhoneNumber(phone);

            try {
                const submitBtn = sendMessageForm.querySelector('button[type="submit"]');
                setLoading(null, true);

                const res = await fetch('/comms/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: formattedPhone,
                        message: message
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Message sent successfully!', 'success');
                    sendMessageForm.reset();
                } else {
                    showNotification(data.message || 'Failed to send message.', 'error');
                }
            } catch (err) {
                console.error('Error sending message:', err);
                showNotification('Failed to send message. Please try again.', 'error');
            } finally {
                setLoading(null, false);
            }
        });
    }

    // Send invoice form
    const sendInvoiceForm = document.getElementById('send-invoice-form');
    if (sendInvoiceForm) {
        sendInvoiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('invoice-phone');
            const invoiceIdInput = document.getElementById('invoice-id');

            const phone = phoneInput.value.trim();
            const invoiceId = invoiceIdInput.value.trim();

            // Validation
            if (!phone) {
                showNotification('Please enter a phone number.', 'error');
                phoneInput.focus();
                return;
            }

            if (!validatePhone(phone)) {
                showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                phoneInput.focus();
                return;
            }

            if (!invoiceId) {
                showNotification('Please enter an invoice ID.', 'error');
                invoiceIdInput.focus();
                return;
            }

            const formattedPhone = formatPhoneNumber(phone);

            try {
                setLoading(null, true);

                const res = await fetch('/comms/send-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        invoiceId: invoiceId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Invoice sent successfully!', 'success');
                    sendInvoiceForm.reset();
                } else {
                    showNotification(data.message || 'Failed to send invoice.', 'error');
                }
            } catch (err) {
                console.error('Error sending invoice:', err);
                showNotification('Failed to send invoice. Please try again.', 'error');
            } finally {
                setLoading(null, false);
            }
        });
    }

    // Send quotation form
    const sendQuotationForm = document.getElementById('send-quotation-form');
    if (sendQuotationForm) {
        sendQuotationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('quotation-phone');
            const quotationIdInput = document.getElementById('quotation-id');

            const phone = phoneInput.value.trim();
            const quotationId = quotationIdInput.value.trim();

            // Validation
            if (!phone) {
                showNotification('Please enter a phone number.', 'error');
                phoneInput.focus();
                return;
            }

            if (!validatePhone(phone)) {
                showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                phoneInput.focus();
                return;
            }

            if (!quotationId) {
                showNotification('Please enter a quotation ID.', 'error');
                quotationIdInput.focus();
                return;
            }

            const formattedPhone = formatPhoneNumber(phone);

            try {
                setLoading(null, true);

                const res = await fetch('/comms/send-quotation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        quotationId: quotationId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Quotation sent successfully!', 'success');
                    sendQuotationForm.reset();
                } else {
                    showNotification(data.message || 'Failed to send quotation.', 'error');
                }
            } catch (err) {
                console.error('Error sending quotation:', err);
                showNotification('Failed to send quotation. Please try again.', 'error');
            } finally {
                setLoading(null, false);
            }
        });
    }

    // Automated reminders button
    const autoRemindersBtn = document.getElementById('send-automated-reminders');
    if (autoRemindersBtn) {
        autoRemindersBtn.addEventListener('click', async () => {
            if (autoRemindersBtn.disabled) return;
            
            // Show confirmation dialog and wait for response
            window.electronAPI.showAlert2('Send payment reminders to all unpaid projects?');
            
            // Wait for user response
            const userConfirmed = await new Promise((resolve) => {
                window.electronAPI.receiveAlertResponse((response) => {
                    resolve(response === 'Yes');
                });
            });

            // If user cancelled, do nothing
            if (!userConfirmed) {
                return;
            }

            try {
                const originalHTML = autoRemindersBtn.innerHTML;
                autoRemindersBtn.disabled = true;
                autoRemindersBtn.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Sending Reminders...</span>
                `;

                const res = await fetch('/comms/send-automated-reminders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Automated reminders sent successfully!', 'success');
                    // Refresh unpaid count
                    fetchUnpaidProjects();
                } else {
                    showNotification(data.message || 'Failed to send automated reminders.', 'error');
                }

                autoRemindersBtn.innerHTML = originalHTML;
                autoRemindersBtn.disabled = false;
            } catch (err) {
                console.error('Error sending automated reminders:', err);
                showNotification('Failed to send automated reminders. Please try again.', 'error');
                autoRemindersBtn.disabled = false;
            }
        });
    }

    // Add phone number formatting on input
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function (e) {
            // Remove non-numeric characters except +
            let value = e.target.value.replace(/[^\d+]/g, '');
            e.target.value = value;
        });

        input.addEventListener('blur', function (e) {
            const value = e.target.value.trim();
            if (value && !validatePhone(value)) {
                e.target.classList.add('border-red-500');
                e.target.classList.remove('border-gray-300');
            } else {
                e.target.classList.remove('border-red-500');
                e.target.classList.add('border-gray-300');
            }
        });
    });

    // Refresh unpaid count every 30 seconds
    setInterval(fetchUnpaidProjects, 30000);
});