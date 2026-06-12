/**
 * Service Details View and Payments Controller
 */

declare class CalculationEngine {
    constructor(items: any[], nonItems: any[]);
    calculate(): any;
}
declare const SectionRenderers: any;
declare const DocumentBuilder: any;
declare function showToast(message: string, type?: 'success' | 'error'): void;

(function () {
    // Shared Globals/Helpers
    const electronAPI = (window as any).electronAPI;
    const serviceApi = (window as any).serviceApi;
    const formatDateDisplay = (window as any).formatDateDisplay;
    const formatDateIndian = (window as any).formatDateIndian;
    const formatIndian = (window as any).formatIndian;
    const showConfirm = (window as any).showConfirm;

    let serviceId: string | null = null;
    let selectedService: Service | null = null;

    // Payment State Variables
    let currentPaymentIndex: number | null = null;
    let isEditingPayment = false;
    let isDeletePending = false;

    // DOM Elements
    const $headerTitle = document.getElementById('header-title');
    const $headerServiceId = document.getElementById('header-service-id');
    const $headerInvoiceId = document.getElementById('header-invoice-id');
    const $headerServiceDate = document.getElementById('header-service-date');
    const $headerServiceStage = document.getElementById('header-service-stage');
    const $headerNextDate = document.getElementById('header-next-date');
    const $headerAmount = document.getElementById('details-header-amount');
    const $headerStatusBadge = document.getElementById('details-payment-status-badge');

    const $detailsCustomerName = document.getElementById('details-customer-name');
    const $detailsProjectName = document.getElementById('details-project-name');
    const $detailsInvoiceLink = document.getElementById('details-invoice-link');
    const $detailsServiceDate = document.getElementById('details-service-date');

    const $itemsTbody = document.getElementById('details-items-tbody');
    const $chargesTbody = document.getElementById('details-charges-tbody');
    const $paymentsTbody = document.getElementById('details-payments-tbody');

    const $metaCustomerName = document.getElementById('meta-customer-name');
    const $metaCustomerPhone = document.getElementById('meta-customer-phone');
    const $metaCustomerAddress = document.getElementById('meta-customer-address');

    const $metaSubtotal = document.getElementById('meta-subtotal');
    const $metaTax = document.getElementById('meta-tax');
    const $metaGrandTotal = document.getElementById('meta-grand-total');
    const $metaPaid = document.getElementById('meta-paid');
    const $metaDue = document.getElementById('meta-due');

    const $metaNextMonths = document.getElementById('meta-next-months');
    const $metaNextDate = document.getElementById('meta-next-date');
    const $metaServiceStatus = document.getElementById('meta-service-status');

    const $paymentModal = document.getElementById('payment-modal');
    const $paymentModalTitle = document.getElementById('payment-modal-title');
    const $modalDueAmount = document.getElementById('modal-due-amount');
    const $modalPaidAmount = document.getElementById('modal-paid-amount') as HTMLInputElement;
    const $modalPaymentDate = document.getElementById('modal-payment-date') as HTMLInputElement;
    const $modalPaymentMode = document.getElementById('modal-payment-mode') as HTMLSelectElement;
    const $extraPaymentDetails = document.getElementById('extra-payment-details');
    const $savePaymentBtn = document.getElementById('save-payment-btn');
    const $savePaymentBtnText = document.getElementById('save-payment-btn-text');

    const $shortcutsModal = document.getElementById('shortcuts-modal');

    // ============================================================================
    // UTILITY HELPERS
    // ============================================================================
    function formatDateShort(dateStr: string | Date | undefined): string {
        if (!dateStr) return 'N/A';
        return formatDateDisplay ? formatDateDisplay(dateStr) : new Date(dateStr).toLocaleDateString('en-IN');
    }

    function formatNumber(num: number | string): string {
        return parseFloat(String(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatCurrency(num: number | string): string {
        return `₹ ${formatNumber(num)}`;
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

    function showToast(message: string, type: 'success' | 'error' = 'success') {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        const iconEl = toast?.querySelector('i');

        if (!toast || !msgEl || !iconEl) return;

        toast.className = `fixed bottom-6 right-6 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`;
        iconEl.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        msgEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // ============================================================================
    // INIT & ROUTING
    // ============================================================================
    document.addEventListener('DOMContentLoaded', async () => {
        const params = new URLSearchParams(window.location.search);
        serviceId = params.get('id');

        if (!serviceId) {
            showToast('Service ID not provided in URL', 'error');
            setTimeout(() => {
                window.location.href = '/service';
            }, 1500);
            return;
        }

        initEventListeners();
        await loadServiceDetails();
    });

    function initEventListeners() {
        // Back / Home
        document.getElementById('home-btn')?.addEventListener('click', () => {
            window.location.href = '/service';
        });

        // Edit Service
        document.getElementById('details-edit-btn')?.addEventListener('click', () => {
            if (serviceId) {
                window.location.href = `/service?id=${serviceId}&edit=true`;
            }
        });

        // Print/PDF Buttons
        document.getElementById('details-print-btn')?.addEventListener('click', () => {
            if (serviceId) printService(serviceId, 'print');
        });
        document.getElementById('details-pdf-btn')?.addEventListener('click', () => {
            if (serviceId) printService(serviceId, 'savePDF');
        });

        // Schedule Action Buttons
        document.getElementById('details-record-btn')?.addEventListener('click', () => {
            if (selectedService && selectedService.invoice_id) {
                window.location.href = `/service?new=true&invoice=${selectedService.invoice_id}`;
            }
        });

        document.getElementById('details-pause-btn')?.addEventListener('click', () => {
            if (selectedService && selectedService.invoice_id) {
                toggleServiceStatus(selectedService.invoice_id);
            }
        });

        document.getElementById('details-close-btn')?.addEventListener('click', () => {
            if (selectedService && selectedService.invoice_id) {
                closeServiceSchedule(selectedService.invoice_id);
            }
        });

        // Shortcuts
        document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
            $shortcutsModal?.classList.remove('hidden');
        });
        document.getElementById('close-shortcuts-btn')?.addEventListener('click', () => {
            $shortcutsModal?.classList.add('hidden');
        });

        // Invoice Link click verification
        $detailsInvoiceLink?.addEventListener('click', () => {
            if (selectedService && selectedService.invoice_id) {
                window.location.href = `/invoice?view=${selectedService.invoice_id}`;
            }
        });

        // Payment Modal Events
        const triggerPaymentModal = () => {
            if (serviceId) openPaymentModal(serviceId);
        };
        document.getElementById('details-add-payment-btn')?.addEventListener('click', triggerPaymentModal);
        document.getElementById('details-header-payment-btn')?.addEventListener('click', triggerPaymentModal);
        document.getElementById('close-payment-btn')?.addEventListener('click', () => {
            $paymentModal?.classList.add('hidden');
            resetPaymentModalState();
        });
        document.getElementById('modal-fill-amount')?.addEventListener('click', () => {
            if (selectedService) {
                const total = selectedService.total_amount_with_tax || 0;
                const paid = selectedService.total_paid_amount || 0;
                let due = total - paid;
                if (isEditingPayment && currentPaymentIndex !== null && selectedService.payments && selectedService.payments[currentPaymentIndex]) {
                    due += Number(selectedService.payments[currentPaymentIndex].paid_amount || 0);
                }
                if ($modalPaidAmount) $modalPaidAmount.value = String(Math.max(0, due).toFixed(2));
            }
        });
        $modalPaymentMode?.addEventListener('change', updateExtraPaymentDetailsFields);
        $savePaymentBtn?.addEventListener('click', savePayment);

        // Escape keys listener
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                $paymentModal?.classList.add('hidden');
                $shortcutsModal?.classList.add('hidden');
                resetPaymentModalState();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                document.getElementById('details-edit-btn')?.click();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                document.getElementById('details-print-btn')?.click();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                document.getElementById('home-btn')?.click();
            }
        });
    }

    // ============================================================================
    // LOAD & RENDER DATA
    // ============================================================================
    async function loadServiceDetails() {
        if (!serviceId) return;

        try {
            selectedService = await serviceApi.fetchServiceDetails(serviceId);
            if (!selectedService) {
                showToast('Failed to load service details', 'error');
                return;
            }
            renderServiceDetails();
        } catch (error) {
            console.error('Error loading service details:', error);
            showToast('Error loading service data', 'error');
        }
    }

    function renderServiceDetails() {
        if (!selectedService) return;

        const service = selectedService;
        const invoice = service.invoice_details || {};
        const isVirtual = service.service_id === '-';

        // Show/hide actions based on whether it is a real service or a virtual/scheduled one
        const $editBtn = document.getElementById('details-edit-btn');
        const $printBtn = document.getElementById('details-print-btn');
        const $pdfBtn = document.getElementById('details-pdf-btn');
        const $addPaymentBtn = document.getElementById('details-add-payment-btn');
        const $headerPaymentBtn = document.getElementById('details-header-payment-btn');

        if (isVirtual) {
            if ($editBtn) $editBtn.classList.add('hidden');
            if ($printBtn) $printBtn.classList.add('hidden');
            if ($pdfBtn) $pdfBtn.classList.add('hidden');
            if ($addPaymentBtn) $addPaymentBtn.classList.add('hidden');
            if ($headerPaymentBtn) $headerPaymentBtn.classList.add('hidden');
        } else {
            if ($editBtn) $editBtn.classList.remove('hidden');
            if ($printBtn) $printBtn.classList.remove('hidden');
            if ($pdfBtn) $pdfBtn.classList.remove('hidden');
            if ($addPaymentBtn) $addPaymentBtn.classList.remove('hidden');
            if ($headerPaymentBtn) $headerPaymentBtn.classList.remove('hidden');
        }

        // Title and header details
        if ($headerTitle) {
            $headerTitle.textContent = isVirtual ? `Service Schedule - ${service.invoice_id}` : `Service ${service.service_id}`;
        }
        if ($headerServiceId) $headerServiceId.textContent = service.service_id;
        if ($headerInvoiceId) $headerInvoiceId.textContent = service.invoice_id;
        if ($headerServiceDate) $headerServiceDate.textContent = formatDateShort(service.service_date);
        if ($headerServiceStage) $headerServiceStage.textContent = getStageLabel(service.service_stage);
        if ($headerNextDate) $headerNextDate.textContent = formatDateShort(service.next_service_date);
        if ($headerAmount) $headerAmount.textContent = formatCurrency(service.total_amount_with_tax || 0);

        // Service Info Card
        if ($detailsCustomerName) $detailsCustomerName.textContent = invoice.customer_name || service.customer_name || '-';
        if ($detailsProjectName) $detailsProjectName.textContent = invoice.project_name || service.project_name || '-';
        if ($detailsInvoiceLink) $detailsInvoiceLink.textContent = service.invoice_id;
        if ($detailsServiceDate) $detailsServiceDate.textContent = formatDateShort(service.service_date);

        // Render items table
        if ($itemsTbody) {
            if (service.items && service.items.length > 0) {
                $itemsTbody.innerHTML = service.items.map((item, i) => `
                    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-800">
                        <td class="px-4 py-2 text-xs font-semibold">${i + 1}</td>
                        <td class="px-4 py-2 text-xs font-semibold">${escapeHtml(item.description)}</td>
                        <td class="px-4 py-2 text-xs font-semibold text-right">${item.quantity}</td>
                        <td class="px-4 py-2 text-xs font-semibold text-right">${formatCurrency(item.unit_price)}</td>
                        <td class="px-4 py-2 text-xs font-semibold text-right">${item.rate}%</td>
                        <td class="px-4 py-2 text-xs font-bold text-right text-slate-900">${formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
                    </tr>
                `).join('');
            } else {
                $itemsTbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No items registered</td></tr>';
            }
        }

        // Render other charges table
        if ($chargesTbody) {
            if (service.non_items && service.non_items.length > 0) {
                $chargesTbody.innerHTML = service.non_items.map((c, i) => `
                    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-800">
                        <td class="px-4 py-2 text-xs font-semibold">${i + 1}</td>
                        <td class="px-4 py-2 text-xs font-semibold">${escapeHtml(c.description)}</td>
                        <td class="px-4 py-2 text-xs font-bold text-right">${formatCurrency(c.price)}</td>
                        <td class="px-4 py-2 text-xs font-semibold text-right">${c.rate}%</td>
                    </tr>
                `).join('');
            } else {
                $chargesTbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">No other charges</td></tr>';
            }
        }

        // Render payments history table
        if ($paymentsTbody) {
            if (service.payments && service.payments.length > 0) {
                $paymentsTbody.innerHTML = service.payments.map((p, index) => `
                    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-850">
                        <td class="px-4 py-3 text-xs font-semibold">${formatDateIndian(p.payment_date) || '-'}</td>
                        <td class="px-4 py-3 text-xs font-semibold">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${p.payment_mode === 'Cash' ? 'bg-amber-50 text-amber-700 border-amber-200' : p.payment_mode === 'UPI' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : p.payment_mode === 'Bank Transfer' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}">
                                ${escapeHtml(p.payment_mode)}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-xs font-extrabold text-emerald-600">${formatCurrency(p.paid_amount)}</td>
                        <td class="px-4 py-3 text-xs font-medium text-slate-600">${escapeHtml(p.extra_details || '-')}</td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <button type="button" class="edit-payment-btn text-blue-600 hover:text-blue-800 p-1" data-index="${index}" title="Edit Payment">
                                    <i class="fas fa-edit text-xs"></i>
                                </button>
                                <button type="button" class="delete-payment-btn text-red-650 hover:text-red-800 p-1" data-index="${index}" title="Delete Payment">
                                    <i class="fas fa-trash text-xs"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Attach handlers
                $paymentsTbody.querySelectorAll('.edit-payment-btn').forEach((btn: any) => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.index, 10);
                        editPayment(idx);
                    });
                });
                $paymentsTbody.querySelectorAll('.delete-payment-btn').forEach((btn: any) => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.index, 10);
                        deletePayment(idx);
                    });
                });
            } else {
                $paymentsTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">No payments recorded</td></tr>';
            }
        }

        // Sidebar associated metadata details
        if ($metaCustomerName) $metaCustomerName.textContent = invoice.customer_name || service.customer_name || '-';
        if ($metaCustomerPhone) $metaCustomerPhone.textContent = invoice.customer_phone || '-';
        if ($metaCustomerAddress) $metaCustomerAddress.textContent = invoice.customer_address || '-';

        // Financial summary details
        const subtotal = service.total_amount_no_tax || 0;
        const tax = service.total_tax || 0;
        const total = service.total_amount_with_tax || 0;
        const paid = service.total_paid_amount || 0;
        const due = Math.max(0, total - paid);

        if ($metaSubtotal) $metaSubtotal.textContent = formatCurrency(subtotal);
        if ($metaTax) $metaTax.textContent = formatCurrency(tax);
        if ($metaGrandTotal) $metaGrandTotal.textContent = formatCurrency(total);
        if ($metaPaid) $metaPaid.textContent = formatCurrency(paid);
        if ($metaDue) $metaDue.textContent = formatCurrency(due);

        // Status badge
        if ($headerStatusBadge) {
            const isPaid = paid >= total || total === 0;
            if (isPaid) {
                $headerStatusBadge.textContent = total === 0 ? 'No Charge' : 'Paid';
                $headerStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200';
            } else if (paid > 0) {
                $headerStatusBadge.textContent = 'Partial';
                $headerStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-200';
            } else {
                $headerStatusBadge.textContent = 'Unpaid';
                $headerStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200';
            }
        }

        // Schedule metadata details
        if ($metaNextMonths) $metaNextMonths.textContent = `${service.next_service_month || 0} months`;
        if ($metaNextDate) $metaNextDate.textContent = formatDateShort(service.next_service_date);
        if ($metaServiceStatus) {
            const status = service.service_status || 'Scheduled';
            $metaServiceStatus.textContent = status;
            $metaServiceStatus.className = 'font-bold text-xs uppercase ' + (
                status === 'Completed' ? 'text-green-600' :
                status === 'Paused' ? 'text-yellow-600' : 'text-blue-600'
            );
        }

        // Update Pause/Resume button state
        const isPaused = (service.invoice_details as any)?.service_status === 'Paused';
        const $pauseIcon = document.getElementById('details-pause-icon');
        const $pauseText = document.getElementById('details-pause-text');
        if ($pauseIcon) {
            $pauseIcon.className = `fas fa-${isPaused ? 'play' : 'pause'} text-xs text-amber-500`;
        }
        if ($pauseText) {
            $pauseText.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }

    // ============================================================================
    // SERVICE SCHEDULE ACTIONS
    // ============================================================================
    async function toggleServiceStatus(invoiceId: string) {
        const invoice = selectedService?.invoice_details as any;
        const isPaused = invoice?.service_status === 'Paused';
        const action = isPaused ? 'resume' : 'pause';
        const message = isPaused
            ? 'Are you sure you want to resume this service schedule?'
            : 'Are you sure you want to pause this service schedule? No reminders will be sent while paused.';

        const confirmed = await confirmAction(message);
        if (confirmed) {
            try {
                await serviceApi.toggleStatus(invoiceId);
                showToast(`Service ${action}d successfully`);
                await loadServiceDetails();
            } catch (error) {
                console.error(`Error ${action}ing service:`, error);
                showToast(`Failed to ${action} service`, 'error');
            }
        }
    }

    async function closeServiceSchedule(invoiceId: string) {
        const confirmed = await confirmAction('Are you sure you want to close this service schedule? No further services will be scheduled.');
        if (confirmed) {
            try {
                await serviceApi.closeServiceSchedule(invoiceId);
                showToast('Service schedule closed');
                window.location.href = '/service';
            } catch (error) {
                console.error('Error closing service:', error);
                showToast('Failed to close service', 'error');
            }
        }
    }

    function confirmAction(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI && electronAPI.showAlert2) {
                electronAPI.showAlert2(message, 'Confirm Action');
                electronAPI.receiveAlertResponse((response: string) => {
                    resolve(response === 'Yes');
                });
            } else {
                resolve(confirm(message));
            }
        });
    }

    // ============================================================================
    // PRINT & PDF EXPORT
    // ============================================================================
    async function printService(id: string, action = 'print') {
        try {
            const service = await serviceApi.fetchServiceDetails(id);
            let html = await generateDocumentHTML(service);

            // Strip contenteditable attributes for clean print/pdf
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            html = tempDiv.innerHTML;

            if (electronAPI && electronAPI.handlePrintEvent) {
                electronAPI.handlePrintEvent(html, action, `Service-${id}`);
            } else {
                showToast('Print API not available', 'error');
            }
        } catch (error) {
            console.error('Error printing:', error);
            showToast('Failed to print service report', 'error');
        }
    }

    async function generateDocumentHTML(serviceData: Service) {
        const invoice = serviceData.invoice_details || {};

        const items = (serviceData.items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        const nonItems = (serviceData.non_items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        const calcEngine = new CalculationEngine(items, nonItems);
        const calculation = calcEngine.calculate();

        const buyerInfo = SectionRenderers.renderBuyerDetails({
            name: invoice.customer_name || serviceData.customer_name,
            address: invoice.customer_address,
            phone: invoice.customer_phone,
            title: "Bill To:"
        });

        const infoSection = SectionRenderers.renderInfoSection([
            { label: "Project", value: invoice.project_name || serviceData.project_name },
            { label: "Invoice Ref", value: serviceData.invoice_id },
            { label: "Date", value: formatDateShort(serviceData.service_date) },
            { label: "Stage", value: getStageLabel(serviceData.service_stage) }
        ]);

        const builder = new DocumentBuilder('invoice');

        builder.addSection(await SectionRenderers.renderHeader());
        builder.addSection(SectionRenderers.renderTitle('Service Report', serviceData.service_id));

        builder.addSection(`
            <div class="third-section">
                ${buyerInfo}
                ${infoSection}
            </div>
        `);

        builder.addSection(SectionRenderers.renderItemsTable(
            calculation.renderableItems.map((i: any) => i.html).join(''),
            null,
            calculation.hasTax
        ));

        builder.addSection(await SectionRenderers.renderInvoiceFifthSection(
            calculation.totals.total,
            calculation.totals,
            calculation.hasTax
        ));

        builder.addSection(await SectionRenderers.renderSignatory());
        builder.addSection(SectionRenderers.renderFooter("This is a computer generated document."));

        return builder.wrapInContainer(builder.build());
    }

    // ============================================================================
    // PAYMENT MODAL MANAGEMENT
    // ============================================================================
    function openPaymentModal(svcId: string, paymentIndex: number | null = null, paymentData: ServicePayment | null = null) {
        if (!selectedService) return;

        currentPaymentIndex = paymentIndex;
        isEditingPayment = paymentIndex !== null && paymentData !== null;

        const total = selectedService.total_amount_with_tax || 0;
        const paid = selectedService.total_paid_amount || 0;

        // In edit mode, add back the original payment amount to calculate proper due
        const originalPaymentAmount = isEditingPayment && paymentData ? Number(paymentData.paid_amount || 0) : 0;
        const due = total - paid + originalPaymentAmount;

        if ($paymentModalTitle) {
            $paymentModalTitle.textContent = isEditingPayment ? 'Edit Record Payment' : 'Record Payment';
        }

        if ($modalDueAmount) {
            $modalDueAmount.textContent = `₹ ${formatNumber(due)}`;
        }

        if (!isEditingPayment && due <= 0) {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1('There is no outstanding due on this service.');
            } else {
                alert('There is no outstanding due on this service.');
            }
            return;
        }

        $paymentModal?.classList.remove('hidden');

        if (isEditingPayment && paymentData) {
            if ($modalPaidAmount) $modalPaidAmount.value = String(paymentData.paid_amount);
            if ($modalPaymentDate) $modalPaymentDate.value = paymentData.payment_date?.split('T')[0] || '';
            if ($modalPaymentMode) $modalPaymentMode.value = paymentData.payment_mode || 'Cash';

            updateExtraPaymentDetailsFields();

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

            if ($savePaymentBtnText) $savePaymentBtnText.textContent = 'Update Payment';
        } else {
            if ($modalPaidAmount) $modalPaidAmount.value = '';
            if ($modalPaymentDate) {
                $modalPaymentDate.value = (window as any).getTodayForInput
                    ? (window as any).getTodayForInput()
                    : new Date().toISOString().split('T')[0];
            }
            if ($modalPaymentMode) $modalPaymentMode.value = 'Cash';
            updateExtraPaymentDetailsFields();

            if ($savePaymentBtnText) $savePaymentBtnText.textContent = 'Save Payment';
        }

        $modalPaidAmount?.focus();
    }

    function resetPaymentModalState() {
        currentPaymentIndex = null;
        isEditingPayment = false;
        if ($modalPaidAmount) $modalPaidAmount.value = '';
    }

    function updateExtraPaymentDetailsFields() {
        if (!$extraPaymentDetails || !$modalPaymentMode) return;

        const mode = $modalPaymentMode.value;
        if (mode === 'Cash') {
            $extraPaymentDetails.innerHTML = `
                <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                </label>
                <input type="text" id="cash-location" placeholder="Enter cash location"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'UPI') {
            $extraPaymentDetails.innerHTML = `
                <label for="upi-transaction-id" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-mobile-alt text-gray-500 mr-1"></i>UPI Transaction ID
                </label>
                <input type="text" id="upi-transaction-id" placeholder="Enter transaction ID"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Cheque') {
            $extraPaymentDetails.innerHTML = `
                <label for="cheque-number" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-money-check text-gray-500 mr-1"></i>Cheque Number
                </label>
                <input type="text" id="cheque-number" placeholder="Enter cheque number"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Bank Transfer') {
            $extraPaymentDetails.innerHTML = `
                <label for="bank-details" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-university text-gray-500 mr-1"></i>Bank Transfer Details
                </label>
                <input type="text" id="bank-details" placeholder="Enter Bank Ref/UTR"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        }
    }

    async function editPayment(paymentIndex: number) {
        if (!selectedService || !selectedService.payments || paymentIndex >= selectedService.payments.length) {
            showToast('Payment record not found', 'error');
            return;
        }
        const paymentData = selectedService.payments[paymentIndex];
        if (serviceId) openPaymentModal(serviceId, paymentIndex, paymentData);
    }

    function deletePayment(paymentIndex: number) {
        if (!serviceId || isDeletePending) return;
        isDeletePending = true;

        if (electronAPI && electronAPI.showAlert2) {
            electronAPI.showAlert2(
                'Are you sure you want to delete this payment? This action cannot be undone.',
                'Delete Payment'
            );

            electronAPI.receiveAlertResponse(async (response: string) => {
                isDeletePending = false;
                if (response === "Yes") {
                    try {
                        await serviceApi.deletePayment(serviceId!, paymentIndex);
                        showToast('Payment deleted successfully');
                        await loadServiceDetails();
                    } catch (error: any) {
                        console.error('Error deleting payment:', error);
                        showToast(error.message || 'Failed to delete payment', 'error');
                    }
                }
            });
        } else {
            try {
                if (confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
                    deletePaymentConfirmed(paymentIndex);
                }
            } finally {
                isDeletePending = false;
            }
        }
    }

    async function deletePaymentConfirmed(paymentIndex: number) {
        try {
            await serviceApi.deletePayment(serviceId!, paymentIndex);
            showToast('Payment deleted successfully');
            await loadServiceDetails();
        } catch (error: any) {
            console.error('Error deleting payment:', error);
            showToast(error.message || 'Failed to delete payment', 'error');
        }
    }

    async function savePayment() {
        if (!serviceId || !selectedService) return;

        const amount = parseFloat($modalPaidAmount.value) || 0;
        const date = $modalPaymentDate.value;
        const mode = $modalPaymentMode.value;

        if (amount <= 0 || isNaN(amount)) {
            showToast('Please enter a valid amount greater than 0', 'error');
            $modalPaidAmount?.focus();
            return;
        }

        if (!date) {
            showToast('Please select a payment date', 'error');
            return;
        }

        const today = new Date();
        const enteredDate = new Date(date + 'T00:00:00');
        if (enteredDate > today) {
            showToast('Payment date cannot be in the future', 'error');
            return;
        }

        const total = selectedService.total_amount_with_tax || 0;
        const paid = selectedService.total_paid_amount || 0;
        const originalPaymentAmount = isEditingPayment && currentPaymentIndex !== null && selectedService.payments ? Number(selectedService.payments[currentPaymentIndex].paid_amount || 0) : 0;
        const due = Number((total - paid + originalPaymentAmount).toFixed(2));

        if (amount > due) {
            showToast(`Paid amount cannot exceed due amount (₹ ${formatNumber(due)})`, 'error');
            $modalPaidAmount?.focus();
            return;
        }

        // Collect extra info
        let extraInfo = '';
        if (mode === 'Cash') {
            extraInfo = (document.getElementById('cash-location') as HTMLInputElement)?.value || '';
        } else if (mode === 'UPI') {
            extraInfo = (document.getElementById('upi-transaction-id') as HTMLInputElement)?.value || '';
        } else if (mode === 'Cheque') {
            extraInfo = (document.getElementById('cheque-number') as HTMLInputElement)?.value || '';
        } else if (mode === 'Bank Transfer') {
            extraInfo = (document.getElementById('bank-details') as HTMLInputElement)?.value || '';
        }

        if (!extraInfo.trim()) {
            showToast(`Please enter details for method: ${mode}`, 'error');
            return;
        }

        if ($savePaymentBtn) ($savePaymentBtn as HTMLButtonElement).disabled = true;
        if ($savePaymentBtnText) $savePaymentBtnText.textContent = 'Saving...';

        try {
            if (isEditingPayment && currentPaymentIndex !== null) {
                await serviceApi.updatePayment({
                    serviceId,
                    paymentIndex: currentPaymentIndex,
                    paidAmount: amount,
                    paymentDate: date,
                    paymentMode: mode,
                    paymentExtra: extraInfo
                });
            } else {
                await serviceApi.savePayment({
                    serviceId,
                    paidAmount: amount,
                    paymentDate: date,
                    paymentMode: mode,
                    paymentExtra: extraInfo
                });
            }

            showToast(isEditingPayment ? 'Payment updated successfully' : 'Payment recorded successfully');
            $paymentModal?.classList.add('hidden');
            resetPaymentModalState();
            await loadServiceDetails();

        } catch (error: any) {
            console.error('Error saving payment:', error);
            showToast(error.message || 'Failed to save payment', 'error');
        } finally {
            if ($savePaymentBtn) ($savePaymentBtn as HTMLButtonElement).disabled = false;
        }
    }
})();
