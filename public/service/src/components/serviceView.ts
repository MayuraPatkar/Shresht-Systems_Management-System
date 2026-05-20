/**
 * Service Module View and Payments Component
 */

declare class CalculationEngine {
    constructor(items: any[], nonItems: any[]);
    calculate(): any;
}
declare const SectionRenderers: any;
declare const DocumentBuilder: any;
declare function buildSimpleDocument(config: any): Promise<string>;
declare function showToast(message: string, type?: 'success' | 'error'): void;

(function () {
    // Shared Globals/Helpers
    const electronAPI = (window as any).electronAPI;
    const serviceApi = (window as any).serviceApi;
    const formatDateDisplay = (window as any).formatDateDisplay;
    const formatDateIndian = (window as any).formatDateIndian;
    const formatIndian = (window as any).formatIndian;
    const showConfirm = (window as any).showConfirm;

    // Payment State Variables local to this module view
    let currentPaymentServiceId: string | null = null;
    let currentPaymentIndex: number | null = null;
    let isEditingPayment = false;

    // ============================================================================
    // UTILITY HELPERS
    // ============================================================================
    function formatDateShort(dateStr: string | undefined): string {
        if (!dateStr) return 'N/A';
        return formatDateDisplay ? formatDateDisplay(dateStr) : new Date(dateStr).toLocaleDateString('en-IN');
    }

    function formatNumber(num: number | string): string {
        return parseFloat(String(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatCurrency(num: number | string): string {
        return formatNumber(num);
    }

    function getStageLabel(stage: number | string): string {
        const s = Number(stage) || 1;
        const suffixes = ['st', 'nd', 'rd'];
        const suffix = s <= 3 ? suffixes[s - 1] : 'th';
        return `${s}${suffix} Service`;
    }

    function escapeHtml(str: string | undefined): string {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showSection(sectionId: string) {
        document.querySelectorAll('.detail-section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');
    }

    // ============================================================================
    // VIEW SERVICE
    // ============================================================================
    async function viewService(serviceId: string) {
        try {
            const ServiceState = (window as any).ServiceState;
            const service = await serviceApi.fetchServiceDetails(serviceId);
            const invoice = service.invoice_details || {};

            ServiceState.selectedServiceId = serviceId;

            // Update view content
            const titleEl = document.getElementById('view-title');
            if (titleEl) titleEl.textContent = `Service ${serviceId}`;

            const subtitleEl = document.getElementById('view-subtitle');
            if (subtitleEl) subtitleEl.textContent = `${service.invoice_id} • ${getStageLabel(service.service_stage)}`;

            const customerEl = document.getElementById('view-customer');
            if (customerEl) customerEl.textContent = invoice.customer_name || service.customer_name || '-';

            const phoneEl = document.getElementById('view-phone');
            if (phoneEl) phoneEl.textContent = invoice.customer_phone || '-';

            const addressEl = document.getElementById('view-address');
            if (addressEl) addressEl.textContent = invoice.customer_address || '-';

            const dateEl = document.getElementById('view-date');
            if (dateEl) dateEl.textContent = formatDateShort(service.service_date);

            const projectEl = document.getElementById('view-project');
            if (projectEl) projectEl.textContent = invoice.project_name || service.project_name || '-';

            const invoiceIdEl = document.getElementById('view-invoice-id');
            if (invoiceIdEl) invoiceIdEl.textContent = service.invoice_id;

            // Items table
            const itemsTbody = document.getElementById('view-items-tbody');
            if (itemsTbody) {
                if (service.items && service.items.length > 0) {
                    itemsTbody.innerHTML = service.items.map((item: ServiceItem, i: number) => `
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-2">${i + 1}</td>
                            <td class="px-4 py-2">${escapeHtml(item.description || '')}</td>
                            <td class="px-4 py-2 text-right">${item.quantity || 0}</td>
                            <td class="px-4 py-2 text-right">₹${formatNumber(item.unit_price || 0)}</td>
                            <td class="px-4 py-2 text-right">₹${formatNumber((item.quantity || 0) * (item.unit_price || 0))}</td>
                        </tr>
                    `).join('');
                } else {
                    itemsTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">No items</td></tr>';
                }
            }

            // Totals
            const subtotalEl = document.getElementById('view-subtotal');
            if (subtotalEl) subtotalEl.textContent = `₹ ${formatNumber(service.total_amount_no_tax || 0)}`;

            const taxEl = document.getElementById('view-tax');
            if (taxEl) taxEl.textContent = `₹ ${formatNumber(service.total_tax || 0)}`;

            const totalEl = document.getElementById('view-total');
            if (totalEl) totalEl.textContent = `₹ ${formatNumber(service.total_amount_with_tax || 0)}`;

            // Payment status
            const paid = service.total_paid_amount || 0;
            const total = service.total_amount_with_tax || 0;
            const balance = Math.max(0, total - paid);
            const isPaid = paid >= total || total === 0;
            const statusEl = document.getElementById('view-payment-status');

            if (statusEl) {
                if (isPaid) {
                    statusEl.textContent = total === 0 ? 'No Charge' : 'Paid';
                    statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700';
                } else if (paid > 0) {
                    statusEl.textContent = 'Partial';
                    statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700';
                } else {
                    statusEl.textContent = 'Unpaid';
                    statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700';
                }
            }

            const balanceEl = document.getElementById('view-balance-due');
            if (balanceEl) balanceEl.textContent = `₹ ${formatNumber(balance)}`;

            // Payment History
            const paymentTbody = document.getElementById('view-payment-tbody');
            if (paymentTbody) {
                if (service.payments && service.payments.length > 0) {
                    paymentTbody.innerHTML = service.payments.map((p: ServicePayment, index: number) => `
                        <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td class="px-4 py-3 text-sm text-gray-900">${formatDateIndian(p.payment_date) || '-'}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">${p.payment_mode || '-'}</td>
                            <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(p.paid_amount, 2) || '-'}</td>
                            <td class="px-4 py-3 text-sm text-gray-700">${p.extra_details ? p.extra_details : '-'}</td>
                            <td class="px-4 py-3 text-sm">
                                <div class="flex items-center gap-2">
                                    <button type="button" class="edit-payment-btn text-blue-600 hover:text-blue-800 p-1" data-service-id="${service.service_id}" data-payment-index="${index}" title="Edit Payment">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button type="button" class="delete-payment-btn text-red-600 hover:text-red-800 p-1" data-service-id="${service.service_id}" data-payment-index="${index}" title="Delete Payment">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');

                    // Add event listeners for edit/delete buttons
                    paymentTbody.querySelectorAll('.edit-payment-btn').forEach((btn: any) => {
                        btn.addEventListener('click', () => {
                            const svcId = btn.dataset.serviceId;
                            const paymentIdx = parseInt(btn.dataset.paymentIndex, 10);
                            editPayment(svcId, paymentIdx);
                        });
                    });

                    paymentTbody.querySelectorAll('.delete-payment-btn').forEach((btn: any) => {
                        btn.addEventListener('click', () => {
                            const svcId = btn.dataset.serviceId;
                            const paymentIdx = parseInt(btn.dataset.paymentIndex, 10);
                            deletePayment(svcId, paymentIdx);
                        });
                    });
                } else {
                    paymentTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">No payments recorded</td></tr>';
                }
            }

            showSection('section-view');

            // Highlight card in list
            document.querySelectorAll('.service-card').forEach((c: any) => {
                c.classList.toggle('selected', c.dataset.serviceId === serviceId);
            });

        } catch (error) {
            console.error('Error viewing service:', error);
            showToast('Failed to load service details', 'error');
        }
    }

    // ============================================================================
    // PRINT SERVICE
    // ============================================================================
    async function printService(serviceId: string, action = 'print') {
        try {
            const service = await serviceApi.fetchServiceDetails(serviceId);
            let html = await generateDocumentHTML(service);

            // Strip contenteditable attributes for clean print/pdf
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            html = tempDiv.innerHTML;

            if (electronAPI && electronAPI.handlePrintEvent) {
                electronAPI.handlePrintEvent(html, action, `Service-${serviceId}`);
            } else {
                showToast('Print API not available', 'error');
            }
        } catch (error) {
            console.error('Error printing:', error);
            showToast('Failed to print', 'error');
        }
    }

    async function generateDocumentHTML(serviceData: Service) {
        const ServiceState = (window as any).ServiceState;
        const invoice = serviceData.invoice_details || ServiceState.allInvoices.find((inv: any) => inv.invoice_id === serviceData.invoice_id) || {};

        // Prepare items for CalculationEngine
        const items = (serviceData.items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        const nonItems = (serviceData.non_items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        // Calculate totals
        const calcEngine = new (window as any).CalculationEngine(items, nonItems);
        const calculation = calcEngine.calculate();

        // Prepare Buyer Info
        const buyerInfo = (window as any).SectionRenderers.renderBuyerDetails({
            name: invoice.customer_name || serviceData.customer_name,
            address: invoice.customer_address,
            phone: invoice.customer_phone,
            title: "Bill To:"
        });

        // Prepare Info Section
        const infoSection = (window as any).SectionRenderers.renderInfoSection([
            { label: "Project", value: invoice.project_name || serviceData.project_name },
            { label: "Invoice Ref", value: serviceData.invoice_id },
            { label: "Date", value: formatDateShort(serviceData.service_date) },
            { label: "Stage", value: getStageLabel(serviceData.service_stage) }
        ]);

        const builder = new (window as any).DocumentBuilder('invoice'); // Use invoice styling

        builder.addSection(await (window as any).SectionRenderers.renderHeader());
        builder.addSection((window as any).SectionRenderers.renderTitle('Service Report', serviceData.service_id));

        builder.addSection(`
            <div class="third-section">
                ${buyerInfo}
                ${infoSection}
            </div>
        `);

        // Render items table with totals
        builder.addSection((window as any).SectionRenderers.renderItemsTable(
            calculation.renderableItems.map((i: any) => i.html).join(''),
            null,
            calculation.hasTax
        ));

        // Render totals and payment details (Invoice Style)
        builder.addSection(await (window as any).SectionRenderers.renderInvoiceFifthSection(
            calculation.totals.total,
            calculation.totals,
            calculation.hasTax
        ));

        builder.addSection(await (window as any).SectionRenderers.renderSignatory());
        builder.addSection((window as any).SectionRenderers.renderFooter("This is a computer generated document."));

        return builder.wrapInContainer(builder.build());
    }

    // ============================================================================
    // PAYMENT MODAL
    // ============================================================================
    async function openPaymentModal(serviceId: string, paymentIndex: number | null = null, paymentData: ServicePayment | null = null) {
        currentPaymentServiceId = serviceId;
        currentPaymentIndex = paymentIndex;
        isEditingPayment = paymentIndex !== null && paymentData !== null;

        try {
            const service = await serviceApi.fetchServiceDetails(serviceId);
            const total = service.total_amount_with_tax || 0;
            const paid = service.total_paid_amount || 0;

            // In edit mode, add back the original payment amount to calculate proper due
            const originalPaymentAmount = isEditingPayment && paymentData ? Number(paymentData.paid_amount || 0) : 0;
            const due = isEditingPayment ? (total - paid + originalPaymentAmount) : (total - paid);

            const titleEl = document.getElementById('payment-modal-title');
            if (titleEl) titleEl.textContent = isEditingPayment ? 'Edit Payment' : 'Record Payment';

            const dueEl = document.getElementById('modal-due-amount');
            if (dueEl) dueEl.textContent = `₹ ${formatNumber(due)}`;

            if (!isEditingPayment && due <= 0) {
                if (electronAPI && electronAPI.showAlert1) {
                    electronAPI.showAlert1('There is no outstanding due on this service.');
                } else {
                    alert('There is no outstanding due on this service.');
                }
                return;
            }

            const modal = document.getElementById('payment-modal');
            if (modal) modal.classList.remove('hidden');

            const paidAmountInput = document.getElementById('modal-paid-amount') as HTMLInputElement;
            const paymentDateInput = document.getElementById('modal-payment-date') as HTMLInputElement;
            const paymentModeSelect = document.getElementById('modal-payment-mode') as HTMLSelectElement;
            const extraField = document.getElementById('extra-payment-details');

            if (isEditingPayment && paymentData) {
                if (paidAmountInput) paidAmountInput.value = String(paymentData.paid_amount);
                if (paymentDateInput) paymentDateInput.value = paymentData.payment_date?.split('T')[0] || '';
                if (paymentModeSelect) paymentModeSelect.value = paymentData.payment_mode || 'Cash';

                // Dispatch change event to update extra details input field
                paymentModeSelect?.dispatchEvent(new Event('change'));

                // Populate extra details based on mode
                setTimeout(() => {
                    const extraVal = paymentData.extra_details || '';
                    if (paymentData.payment_mode === 'Cash') {
                        const input = document.getElementById('cash-location') as HTMLInputElement;
                        if (input) input.value = extraVal;
                    } else if (paymentData.payment_mode === 'UPI') {
                        const input = document.getElementById('upi-transaction-id') as HTMLInputElement;
                        if (input) input.value = extraVal;
                    } else if (paymentData.payment_mode === 'Cheque') {
                        const input = document.getElementById('cheque-number') as HTMLInputElement;
                        if (input) input.value = extraVal;
                    } else if (paymentData.payment_mode === 'Bank Transfer') {
                        const input = document.getElementById('bank-details') as HTMLInputElement;
                        if (input) input.value = extraVal;
                    }
                }, 50);

                const saveBtnText = document.getElementById('save-payment-btn-text');
                if (saveBtnText) saveBtnText.textContent = 'Update Payment';

            } else {
                if (paidAmountInput) paidAmountInput.value = '';
                if (paymentDateInput) {
                    paymentDateInput.value = (window as any).getTodayForInput
                        ? (window as any).getTodayForInput()
                        : new Date().toISOString().split('T')[0];
                }
                if (paymentModeSelect) paymentModeSelect.value = 'Cash';
                if (paymentModeSelect) paymentModeSelect.dispatchEvent(new Event('change'));

                const saveBtnText = document.getElementById('save-payment-btn-text');
                if (saveBtnText) saveBtnText.textContent = 'Save Payment';
            }

            paidAmountInput?.focus();

        } catch (error) {
            console.error('Error opening payment modal:', error);
            showToast('Failed to open payment modal', 'error');
        }
    }

    async function editPayment(serviceId: string, paymentIndex: number) {
        try {
            const service = await serviceApi.fetchServiceDetails(serviceId);

            if (!service || !service.payments || paymentIndex >= service.payments.length) {
                showToast('Payment not found', 'error');
                return;
            }

            const paymentData = service.payments[paymentIndex];
            openPaymentModal(serviceId, paymentIndex, paymentData);
        } catch (error) {
            console.error('Error fetching payment for edit:', error);
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Failed to fetch payment details.');
            } else {
                alert('Failed to fetch payment details.');
            }
        }
    }

    function deletePayment(serviceId: string, paymentIndex: number) {
        if (electronAPI && electronAPI.showAlert2) {
            electronAPI.showAlert2(
                'Are you sure you want to delete this payment? This action cannot be undone.',
                'Delete Payment'
            );

            electronAPI.receiveAlertResponse(async (response: string) => {
                if (response === "Yes") {
                    try {
                        await serviceApi.deletePayment(serviceId, paymentIndex);
                        electronAPI.showAlert1('Payment deleted successfully.');

                        // Reload data and refresh view
                        const loadAllData = (window as any).loadAllData;
                        if (loadAllData) await loadAllData();

                        const ServiceState = (window as any).ServiceState;
                        if (ServiceState.selectedServiceId === serviceId) {
                            viewService(serviceId);
                        }
                    } catch (error: any) {
                        console.error('Error deleting payment:', error);
                        electronAPI.showAlert1(error.message || 'Failed to delete payment.');
                    }
                }
            });
        } else {
            if (confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
                deletePaymentConfirmed(serviceId, paymentIndex);
            }
        }
    }

    async function deletePaymentConfirmed(serviceId: string, paymentIndex: number) {
        try {
            await serviceApi.deletePayment(serviceId, paymentIndex);
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Payment deleted successfully.');
            } else {
                alert('Payment deleted successfully.');
            }

            // Reload data and refresh view
            const loadAllData = (window as any).loadAllData;
            if (loadAllData) await loadAllData();

            const ServiceState = (window as any).ServiceState;
            if (ServiceState.selectedServiceId === serviceId) {
                viewService(serviceId);
            }
        } catch (error: any) {
            console.error('Error deleting payment:', error);
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1(error.message || 'Failed to delete payment.');
            } else {
                alert(error.message || 'Failed to delete payment.');
            }
        }
    }

    async function savePayment() {
        const btn = document.getElementById('save-payment-btn') as HTMLButtonElement;
        if (!btn || btn.disabled) return;

        const paidAmountInput = document.getElementById('modal-paid-amount') as HTMLInputElement;
        const amount = parseFloat(paidAmountInput?.value) || 0;
        const paymentDateInput = document.getElementById('modal-payment-date') as HTMLInputElement;
        const paymentDate = paymentDateInput?.value;
        const paymentModeSelect = document.getElementById('modal-payment-mode') as HTMLSelectElement;
        const paymentMode = paymentModeSelect?.value;

        // Re-fetch service to get the latest due amount
        let dueAmount: number | null = null;
        let originalPaymentAmount = 0;
        try {
            if (currentPaymentServiceId) {
                const service = await serviceApi.fetchServiceDetails(currentPaymentServiceId);
                const totalAmount = service.total_amount_with_tax || 0;
                const paidSoFar = service.total_paid_amount || 0;

                // In edit mode, add back the original payment amount to due
                if (isEditingPayment && currentPaymentIndex !== null && service.payments && service.payments[currentPaymentIndex]) {
                    originalPaymentAmount = Number(service.payments[currentPaymentIndex].paid_amount || 0);
                }

                const adjustedDue = isEditingPayment
                    ? (totalAmount - paidSoFar + originalPaymentAmount)
                    : (totalAmount - paidSoFar);
                dueAmount = Number(adjustedDue.toFixed(2));
            }
        } catch (err) {
            console.error('Error fetching service for validation:', err);
        }

        // Basic validations
        if (!currentPaymentServiceId) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Service not selected for payment.');
            } else {
                alert('Service not selected for payment.');
            }
            return;
        }

        if (!paymentDate) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Please select a payment date.');
            } else {
                alert('Please select a payment date.');
            }
            return;
        }

        const today = new Date();
        const enteredDate = new Date(paymentDate + 'T00:00:00');
        if (isNaN(enteredDate.getTime())) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Invalid payment date.');
            } else {
                alert('Invalid payment date.');
            }
            return;
        }
        if (enteredDate > today) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Payment date cannot be in the future.');
            } else {
                alert('Payment date cannot be in the future.');
            }
            return;
        }

        if (!paymentMode) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Please select a payment method.');
            } else {
                alert('Please select a payment method.');
            }
            return;
        }

        if (amount <= 0 || isNaN(amount)) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('Please enter a valid paid amount greater than 0.');
            } else {
                alert('Please enter a valid paid amount greater than 0.');
            }
            paidAmountInput?.focus();
            return;
        }

        if (dueAmount !== null && amount > dueAmount) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1(`Paid amount cannot exceed due amount (₹ ${formatNumber(dueAmount)}).`);
            } else {
                alert(`Paid amount cannot exceed due amount (₹ ${formatNumber(dueAmount)}).`);
            }
            paidAmountInput?.focus();
            return;
        }

        // Extra info validations based on payment method
        let extraInfo = '';
        if (paymentMode === 'Cash') {
            const el = document.getElementById('cash-location') as HTMLInputElement;
            extraInfo = el?.value || '';
            if (!extraInfo.trim()) {
                if (electronAPI && electronAPI.showAlert1) {
                    electronAPI.showAlert1('Please enter cash location.');
                } else {
                    alert('Please enter cash location.');
                }
                return;
            }
        } else if (paymentMode === 'UPI') {
            const el = document.getElementById('upi-transaction-id') as HTMLInputElement;
            extraInfo = el?.value || '';
            if (!extraInfo.trim()) {
                if (electronAPI && electronAPI.showAlert1) {
                    electronAPI.showAlert1('Please enter UPI transaction ID.');
                } else {
                    alert('Please enter UPI transaction ID.');
                }
                return;
            }
        } else if (paymentMode === 'Cheque') {
            const el = document.getElementById('cheque-number') as HTMLInputElement;
            extraInfo = el?.value || '';
            if (!extraInfo.trim()) {
                if (electronAPI && electronAPI.showAlert1) {
                    electronAPI.showAlert1('Please enter cheque number.');
                } else {
                    alert('Please enter cheque number.');
                }
                return;
            }
        } else if (paymentMode === 'Bank Transfer') {
            const el = document.getElementById('bank-details') as HTMLInputElement;
            extraInfo = el?.value || '';
            if (!extraInfo.trim()) {
                if (electronAPI && electronAPI.showAlert1) {
                    electronAPI.showAlert1('Please enter bank details.');
                } else {
                    alert('Please enter bank details.');
                }
                return;
            }
        }

        // Disable button while processing
        btn.disabled = true;
        const btnTextEl = document.getElementById('save-payment-btn-text');
        const originalBtnText = btnTextEl?.textContent || '';
        if (btnTextEl) btnTextEl.textContent = 'Saving...';

        try {
            if (isEditingPayment && currentPaymentIndex !== null) {
                // Update existing payment
                await serviceApi.updatePayment({
                    serviceId: currentPaymentServiceId,
                    paymentIndex: currentPaymentIndex,
                    paidAmount: amount,
                    paymentDate: paymentDate,
                    paymentMode: paymentMode,
                    paymentExtra: extraInfo
                });
            } else {
                // Add new payment
                await serviceApi.savePayment({
                    serviceId: currentPaymentServiceId,
                    paidAmount: amount,
                    paymentDate: paymentDate,
                    paymentMode: paymentMode,
                    paymentExtra: extraInfo
                });
            }

            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1(isEditingPayment ? 'Payment Updated!' : 'Payment Saved!');
            } else {
                alert(isEditingPayment ? 'Payment Updated!' : 'Payment Saved!');
            }
            document.getElementById('payment-modal')?.classList.add('hidden');

            // Reset edit state
            isEditingPayment = false;
            currentPaymentIndex = null;

            // Reload data
            const loadAllData = (window as any).loadAllData;
            if (loadAllData) await loadAllData();

            const ServiceState = (window as any).ServiceState;
            if (ServiceState.selectedServiceId === currentPaymentServiceId) {
                viewService(currentPaymentServiceId);
            }

        } catch (error: any) {
            console.error('Error saving payment:', error);
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1(`Error: ${error.message || (isEditingPayment ? 'Failed to update payment' : 'Failed to save payment')}`);
            } else {
                alert(`Error: ${error.message || (isEditingPayment ? 'Failed to update payment' : 'Failed to save payment')}`);
            }
        } finally {
            btn.disabled = false;
            if (btnTextEl) btnTextEl.textContent = originalBtnText;
        }
    }

    // ============================================================================
    // HISTORY SECTION
    // ============================================================================
    async function showHistorySection(invoiceId: string) {
        showSection('section-history');
        const subtitleEl = document.getElementById('history-subtitle');
        if (subtitleEl) subtitleEl.textContent = `Invoice: ${invoiceId}`;

        const contentEl = document.getElementById('history-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <i class="fas fa-spinner fa-spin text-purple-500 text-3xl"></i>
                </div>
            `;
        }

        try {
            const services = await serviceApi.fetchHistory(invoiceId);

            if (contentEl) {
                if (services.length === 0) {
                    contentEl.innerHTML = `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-history text-4xl mb-3"></i>
                            <p>No service history found</p>
                        </div>
                    `;
                    return;
                }

                contentEl.innerHTML = services.map((svc: Service, i: number) => `
                    <div class="flex gap-4 mb-6">
                        <div class="flex flex-col items-center">
                            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                ${svc.service_stage || i + 1}
                            </div>
                            ${i < services.length - 1 ? '<div class="w-0.5 flex-1 bg-purple-200 mt-2"></div>' : ''}
                        </div>
                        <div class="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <span class="font-semibold text-gray-800">${svc.service_id}</span>
                                    <span class="text-sm text-gray-500 ml-2">${getStageLabel(svc.service_stage)}</span>
                                </div>
                                <span class="text-sm text-gray-500">${formatDateShort(svc.service_date)}</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">${svc.items?.length || 0} items • ₹${formatNumber(svc.total_amount_with_tax || 0)}</p>
                            <button class="text-blue-600 hover:text-blue-800 text-sm view-history-details-btn" data-id="${svc.service_id}">
                                View Details →
                            </button>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to avoid CSP issues with inline onclick
                document.querySelectorAll('.view-history-details-btn').forEach((btn: any) => {
                    btn.addEventListener('click', () => {
                        const navigateTo = (window as any).navigateTo;
                        if (navigateTo) navigateTo('view', btn.dataset.id);
                    });
                });
            }

        } catch (error) {
            console.error('Error loading history:', error);
            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                        <p>Failed to load service history</p>
                    </div>
                `;
            }
        }
    }

    // Expose functions globally
    (window as any).viewService = viewService;
    (window as any).printService = printService;
    (window as any).openPaymentModal = openPaymentModal;
    (window as any).editPayment = editPayment;
    (window as any).deletePayment = deletePayment;
    (window as any).savePayment = savePayment;
    (window as any).showHistorySection = showHistorySection;
})();
