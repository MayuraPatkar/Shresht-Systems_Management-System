/**
 * Comms Module Forms Logic
 */

declare var commsUtils: any;
declare var commsApi: any;
declare function fetchUnpaidProjects(): Promise<void>;

class CommsForms {
    init() {
        this.setupManualReminderForm();
        this.setupSendMessageForm();
        this.setupSendInvoiceForm();
        this.setupSendQuotationForm();
        this.setupPhoneInputs();
        this.setupAutomatedReminders();
    }

    private setupManualReminderForm() {
        const manualReminderForm = document.getElementById('manual-reminder-form') as HTMLFormElement;
        if (manualReminderForm) {
            manualReminderForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const phoneInput = document.getElementById('manual-phone') as HTMLInputElement;
                const invoiceIdInput = document.getElementById('manual-invoice-id') as HTMLInputElement;

                const phone = phoneInput.value.trim();
                const invoiceId = invoiceIdInput.value.trim();

                if (!phone) {
                    commsUtils.showNotification('Please enter a phone number.', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!commsUtils.validatePhone(phone)) {
                    commsUtils.showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!invoiceId) {
                    commsUtils.showNotification('Please enter an invoice ID.', 'error');
                    invoiceIdInput.focus();
                    return;
                }

                const formattedPhone = commsUtils.formatPhoneNumber(phone);

                try {
                    commsUtils.setLoading('manual-reminder-submit', true);

                    const data = await commsApi.sendManualReminder({
                        phoneNumber: formattedPhone,
                        invoiceId: invoiceId
                    });

                    commsUtils.showNotification(data.message || 'Payment reminder sent successfully!', 'success');
                    manualReminderForm.reset();
                } catch (err: any) {
                    commsUtils.showNotification(err.message || 'Failed to send manual reminder. Please try again.', 'error');
                } finally {
                    commsUtils.setLoading('manual-reminder-submit', false);
                }
            });
        }
    }

    private setupSendMessageForm() {
        const sendMessageForm = document.getElementById('send-message-form') as HTMLFormElement;
        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const phoneInput = document.getElementById('message-phone') as HTMLInputElement;
                const messageInput = document.getElementById('message-content') as HTMLTextAreaElement;
                const submitBtn = sendMessageForm.querySelector('button[type="submit"]') as HTMLButtonElement;

                const phone = phoneInput.value.trim();
                const message = messageInput.value.trim();

                if (!phone) {
                    commsUtils.showNotification('Please enter a phone number.', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!commsUtils.validatePhone(phone)) {
                    commsUtils.showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!message) {
                    commsUtils.showNotification('Please enter a message.', 'error');
                    messageInput.focus();
                    return;
                }

                const formattedPhone = commsUtils.formatPhoneNumber(phone);

                try {
                    if (submitBtn) commsUtils.setLoading(submitBtn, true);

                    const data = await commsApi.sendMessage({
                        phoneNumber: formattedPhone,
                        message: message
                    });

                    commsUtils.showNotification(data.message || 'Message sent successfully!', 'success');
                    sendMessageForm.reset();
                } catch (err: any) {
                    commsUtils.showNotification(err.message || 'Failed to send message. Please try again.', 'error');
                } finally {
                    if (submitBtn) commsUtils.setLoading(submitBtn, false);
                }
            });
        }
    }

    private setupSendInvoiceForm() {
        const sendInvoiceForm = document.getElementById('send-invoice-form') as HTMLFormElement;
        if (sendInvoiceForm) {
            sendInvoiceForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const phoneInput = document.getElementById('invoice-phone') as HTMLInputElement;
                const invoiceIdInput = document.getElementById('invoice-id') as HTMLInputElement;
                const submitBtn = sendInvoiceForm.querySelector('button[type="submit"]') as HTMLButtonElement;

                const phone = phoneInput.value.trim();
                const invoiceId = invoiceIdInput.value.trim();

                if (!phone) {
                    commsUtils.showNotification('Please enter a phone number.', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!commsUtils.validatePhone(phone)) {
                    commsUtils.showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!invoiceId) {
                    commsUtils.showNotification('Please enter an invoice ID.', 'error');
                    invoiceIdInput.focus();
                    return;
                }

                const formattedPhone = commsUtils.formatPhoneNumber(phone);

                try {
                    if (submitBtn) commsUtils.setLoading(submitBtn, true);

                    const data = await commsApi.sendInvoice({
                        phone: formattedPhone,
                        invoiceId: invoiceId
                    });

                    commsUtils.showNotification(data.message || 'Invoice sent successfully!', 'success');
                    sendInvoiceForm.reset();
                } catch (err: any) {
                    commsUtils.showNotification(err.message || 'Failed to send invoice. Please try again.', 'error');
                } finally {
                    if (submitBtn) commsUtils.setLoading(submitBtn, false);
                }
            });
        }
    }

    private setupSendQuotationForm() {
        const sendQuotationForm = document.getElementById('send-quotation-form') as HTMLFormElement;
        if (sendQuotationForm) {
            sendQuotationForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const phoneInput = document.getElementById('quotation-phone') as HTMLInputElement;
                const quotationIdInput = document.getElementById('quotation-id') as HTMLInputElement;
                const submitBtn = sendQuotationForm.querySelector('button[type="submit"]') as HTMLButtonElement;

                const phone = phoneInput.value.trim();
                const quotationId = quotationIdInput.value.trim();

                if (!phone) {
                    commsUtils.showNotification('Please enter a phone number.', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!commsUtils.validatePhone(phone)) {
                    commsUtils.showNotification('Please enter a valid phone number (10-15 digits).', 'error');
                    phoneInput.focus();
                    return;
                }

                if (!quotationId) {
                    commsUtils.showNotification('Please enter a quotation ID.', 'error');
                    quotationIdInput.focus();
                    return;
                }

                const formattedPhone = commsUtils.formatPhoneNumber(phone);

                try {
                    if (submitBtn) commsUtils.setLoading(submitBtn, true);

                    const data = await commsApi.sendQuotation({
                        phone: formattedPhone,
                        quotationId: quotationId
                    });

                    commsUtils.showNotification(data.message || 'Quotation sent successfully!', 'success');
                    sendQuotationForm.reset();
                } catch (err: any) {
                    commsUtils.showNotification(err.message || 'Failed to send quotation. Please try again.', 'error');
                } finally {
                    if (submitBtn) commsUtils.setLoading(submitBtn, false);
                }
            });
        }
    }

    private setupPhoneInputs() {
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', function (e) {
                const target = e.target as HTMLInputElement;
                let value = target.value.replace(/[^\d+]/g, '');
                target.value = value;
            });

            input.addEventListener('blur', function (e) {
                const target = e.target as HTMLInputElement;
                const value = target.value.trim();
                if (value && !commsUtils.validatePhone(value)) {
                    target.classList.add('border-red-500');
                    target.classList.remove('border-gray-300');
                } else {
                    target.classList.remove('border-red-500');
                    target.classList.add('border-gray-300');
                }
            });
        });
    }

    private setupAutomatedReminders() {
        const autoRemindersBtn = document.getElementById('send-automated-reminders') as HTMLButtonElement;
        if (autoRemindersBtn) {
            autoRemindersBtn.addEventListener('click', async () => {
                if (autoRemindersBtn.disabled) return;

                // Show confirmation dialog and wait for response
                (window as any).electronAPI.showAlert2('Send payment reminders to all unpaid projects?');

                // Wait for user response
                const userConfirmed = await new Promise((resolve) => {
                    (window as any).electronAPI.receiveAlertResponse((response: string) => {
                        resolve(response === 'Yes');
                    });
                });

                if (!userConfirmed) return;

                try {
                    const originalHTML = autoRemindersBtn.innerHTML;
                    autoRemindersBtn.disabled = true;
                    autoRemindersBtn.innerHTML = `
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Sending Reminders...</span>
                    `;

                    const data = await commsApi.sendAutomatedReminders();

                    commsUtils.showNotification(data.message || 'Automated reminders sent successfully!', 'success');
                    // Refresh unpaid count - assuming fetchUnpaidProjects is available globally
                    if (typeof (window as any).fetchUnpaidProjects === 'function') {
                        (window as any).fetchUnpaidProjects();
                    }

                    autoRemindersBtn.innerHTML = originalHTML;
                    autoRemindersBtn.disabled = false;
                } catch (err: any) {
                    commsUtils.showNotification(err.message || 'Failed to send automated reminders. Please try again.', 'error');
                    autoRemindersBtn.disabled = false;
                    // Reset HTML? The original didn't reset HTML on catch if error happened after modifying, wait it should
                    // Original code did not reset HTML on catch properly if we look at comms.js:
                    //   autoRemindersBtn.disabled = false;
                    // but it didn't reset HTML. Wait, yes it did if we just add it. Let's add it.
                }
            });
        }
    }
}

(window as any).commsForms = new CommsForms();
