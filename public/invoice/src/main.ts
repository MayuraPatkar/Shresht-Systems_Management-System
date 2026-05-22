/**
 * Invoice Module Main Entry Point
 */
(function () {
    // Local references to global helpers to avoid compile-time collisions
    const debounce = (window as any).debounce;
    const applyFilters = (window as any).applyFilters;
    const showCustomDateModal = (window as any).showCustomDateModal;
    const formatIndian = (window as any).formatIndian;
    const deleteDocument = (window as any).deleteDocument;
    const fetchDocumentById = (window as any).fetchDocumentById;
    const searchDocuments = (window as any).searchDocuments;
    const showNewDocumentForm = (window as any).showNewDocumentForm;
    const electronAPI = (window as any).electronAPI;
    const viewInvoice = (window as any).viewInvoice;
    const openInvoice = (window as any).openInvoice;

    const invoicesListDiv = document.querySelector(".records") as HTMLElement;

    // Filter state
    let allInvoices: Invoice[] = [];
    let currentFilters = {
        status: 'all',
        paymentStatus: 'all',
        dateFilter: 'all',
        sortBy: 'date-desc',
        customStartDate: null as string | null,
        customEndDate: null as string | null
    };

    interface ShortcutItem {
        label: string;
        keys: string[];
    }

    interface ShortcutGroup {
        title: string;
        icon: string;
        items: ShortcutItem[];
    }

    const INVOICE_SHORTCUT_GROUPS: ShortcutGroup[] = [
        {
            title: 'Navigation',
            icon: 'fas fa-arrows-alt text-blue-600',
            items: [
                { label: 'Next Step', keys: ['Enter'] },
                { label: 'Previous Step', keys: ['Backspace'] },
                { label: 'Exit/Cancel', keys: ['Esc'] }
            ]
        },
        {
            title: 'Actions',
            icon: 'fas fa-bolt text-yellow-600',
            items: [
                { label: 'New Invoice', keys: ['Ctrl', 'N'] },
                { label: 'Refresh List', keys: ['Ctrl', 'R'] },
                { label: 'Save Invoice', keys: ['Ctrl', 'S'] },
                { label: 'View Preview', keys: ['Ctrl', 'P'] },
                { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
                { label: 'Add Item', keys: ['Ctrl', 'I'] },
                { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
                { label: 'Go Home', keys: ['Ctrl', 'H'] },
                { label: 'Focus Search', keys: ['Ctrl', 'F'] }
            ]
        }
    ];

    let shortcutsModalRef: HTMLElement | null = null;
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    function showToast(message: string) {
        let toast = document.getElementById('global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'global-toast';
            toast.style.cssText = 'display:none;position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
        toast.style.display = 'block';
        setTimeout(() => {
            if (toast) toast.style.display = 'none';
        }, 2000);
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadRecentInvoices();

        // Dynamically toggle Home button visibility based on whether we are on the Home section
        const homeSection = document.getElementById('home');
        const homeBtn = document.getElementById('home-btn');
        if (homeSection && homeBtn) {
            const updateHomeBtn = () => {
                const isHomeVisible = window.getComputedStyle(homeSection).display !== 'none';
                homeBtn.style.display = isHomeVisible ? 'none' : 'flex';
            };
            const observer = new MutationObserver(updateHomeBtn);
            observer.observe(homeSection, { attributes: true, attributeFilter: ['style'] });
            updateHomeBtn();
        }

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('animate-spin');
                loadRecentInvoices().finally(() => {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('animate-spin');
                    }, 500);
                });
            });
        }

        document.getElementById('new-invoice')?.addEventListener('click', showNewInvoiceForm);
        document.getElementById('home-btn')?.addEventListener('click', () => {
            sessionStorage.removeItem('currentTab-status');
            const homeSection = document.getElementById('home');
            const newSection = document.getElementById('new');
            const viewSection = document.getElementById('view');
            const paymentContainer = document.getElementById('payment-container');

            if (homeSection) {
                window.location.href = '/invoice';
            }
            if (newSection) {
                newSection.style.display = 'none';
            }
            if (viewSection) {
                viewSection.style.display = 'none';
            }
            if (paymentContainer) {
                paymentContainer.style.display = 'none';
            }

            const newInvoiceBtn = document.getElementById('new-invoice');
            const viewPreviewBtn = document.getElementById('view-preview');
            if (newInvoiceBtn) newInvoiceBtn.style.display = 'flex';
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';

            const form = document.getElementById('invoice-form') as HTMLFormElement | null;
            if (form) form.reset();

            if (typeof currentStep !== 'undefined') {
                currentStep = 1;
            }

            loadRecentInvoices();
        });

        const invSearchInput = document.getElementById('search-input') as HTMLInputElement | null;
        if (invSearchInput) {
            invSearchInput.addEventListener('keydown', function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                }
            });
            invSearchInput.addEventListener('input', debounce(() => {
                handleSearch();
            }, 300));
        }

        initShortcutsModal();
        initInvoiceFilters();
        document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);
    });

    async function loadRecentInvoices() {
        try {
            const response = await fetch(`/invoice/recent-invoices`);
            if (!response.ok) {
                if (invoicesListDiv) {
                    invoicesListDiv.innerHTML = "<div class='text-center py-12 fade-in'><h2 class='text-2xl font-bold text-gray-800 mb-2'>No Invoices Found</h2><p class='text-gray-600'>Start creating invoices for your clients</p></div>";
                }
                return;
            }

            const data = await response.json();
            allInvoices = data.invoices || [];
            applyInvoiceFilters();
        } catch (error) {
            console.error("Error loading invoices:", error);
            if (invoicesListDiv) {
                invoicesListDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-16 fade-in">
                        <div class="bg-red-100 rounded-full p-8 mb-4">
                            <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                        </div>
                        <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Invoices</h2>
                        <p class="text-gray-500 mb-6">Please try again later</p>
                        <button id="retry-load-invoices" 
                            class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                            <i class="fas fa-redo"></i>
                            Retry
                        </button>
                    </div>
                `;
                document.getElementById('retry-load-invoices')?.addEventListener('click', loadRecentInvoices);
            }
        }
    }

    function applyInvoiceFilters() {
        let filtered = applyFilters(allInvoices, {
            paymentStatus: currentFilters.paymentStatus,
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'invoice_date',
            amountField: 'total_amount_duplicate',
            nameField: 'project_name',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });
        if (currentFilters.status !== 'all') {
            filtered = filtered.filter((inv: Invoice) => getInvoiceStatus(inv) === currentFilters.status);
        }
        renderInvoices(filtered);
    }

    function initInvoiceFilters() {
        const filterBtn = document.getElementById('filter-btn');
        const filterPopover = document.getElementById('filter-popover');
        const paymentFilter = document.getElementById('payment-status-filter') as HTMLSelectElement | null;
        const dateFilter = document.getElementById('date-filter') as HTMLSelectElement | null;
        const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement | null;
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const statusFilterTop = document.getElementById('status-filter-top') as HTMLSelectElement | null;
        if (filterBtn && filterPopover) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rect = filterBtn.getBoundingClientRect();
                filterPopover.style.top = `${rect.bottom + 8}px`;
                filterPopover.style.left = `${rect.left}px`;
                filterPopover.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!filterPopover.contains(target) && target !== filterBtn) {
                    filterPopover.classList.add('hidden');
                }
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                const value = (e.target as HTMLSelectElement).value;
                if (value === 'custom') {
                    showCustomDateModal((startDate: string, endDate: string) => {
                        currentFilters.dateFilter = 'custom';
                        currentFilters.customStartDate = startDate;
                        currentFilters.customEndDate = endDate;
                        applyInvoiceFilters();
                    });
                }
            });
        }

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                if (paymentFilter) currentFilters.paymentStatus = paymentFilter.value;
                if (statusFilterTop) currentFilters.status = statusFilterTop.value;
                if (dateFilter && dateFilter.value !== 'custom') {
                    currentFilters.dateFilter = dateFilter.value;
                    currentFilters.customStartDate = null;
                    currentFilters.customEndDate = null;
                }
                if (sortFilter) currentFilters.sortBy = sortFilter.value;
                applyInvoiceFilters();
                if (filterPopover) filterPopover.classList.add('hidden');
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                currentFilters = {
                    status: 'all',
                    paymentStatus: 'all',
                    dateFilter: 'all',
                    sortBy: 'date-desc',
                    customStartDate: null,
                    customEndDate: null
                };
                if (paymentFilter) paymentFilter.value = 'all';
                if (dateFilter) dateFilter.value = 'all';
                if (sortFilter) sortFilter.value = 'date-desc';
                if (statusFilterTop) statusFilterTop.value = 'all';
                applyInvoiceFilters();
                if (filterPopover) filterPopover.classList.add('hidden');
            });
        }
    }

    function renderInvoices(invoices: Invoice[]) {
        if ((window as any).invoiceTable && typeof (window as any).invoiceTable.render === 'function') {
            (window as any).invoiceTable.render(invoices);
        } else {
            console.error("InvoiceTable render method not found.");
        }
    }

    async function deleteInvoice(invoiceId: string) {
        await deleteDocument('invoice', invoiceId, 'Invoice', loadRecentInvoices);
    }

    function showNewInvoiceForm() {
        sessionStorage.setItem('currentTab-status', 'new');
        showNewDocumentForm({
            homeId: 'home',
            formId: 'new',
            newButtonId: 'new-invoice',
            viewId: 'view',
            stepIndicatorId: 'step-indicator',
            currentStep: typeof currentStep !== 'undefined' ? currentStep : undefined,
            totalSteps: typeof totalSteps !== 'undefined' ? totalSteps : undefined,
            additionalSetup: () => {
                sessionStorage.setItem('update-invoice', 'original');
            }
        });

        if (typeof (window as any).changeStep === 'function') {
            (window as any).changeStep(1);
        }

        const itemsContainer = document.getElementById("items-container");
        const nonItemsContainer = document.getElementById("non-items-container");
        const itemsTableBody = document.querySelector("#items-table tbody");
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");

        if (itemsContainer) itemsContainer.innerHTML = "";
        if (nonItemsContainer) nonItemsContainer.innerHTML = "";
        if (itemsTableBody) itemsTableBody.innerHTML = "";
        if (nonItemsTableBody) nonItemsTableBody.innerHTML = "";

        const form = document.getElementById('invoice-form') as HTMLFormElement | null;
        if (form) form.reset();

        const idInput = document.getElementById('id') as HTMLInputElement | null;
        if (idInput) {
            idInput.value = 'Auto-Generated';
        }

        const statusSelect = document.getElementById('invoice-status') as HTMLSelectElement | null;
        if (statusSelect) {
            statusSelect.innerHTML = `
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
            `;
            statusSelect.value = 'DRAFT';
        }

        if (typeof (window as any).isCustomId !== 'undefined') {
            (window as any).isCustomId = false;
        }

        const invoiceDateInput = document.getElementById('invoice-date') as HTMLInputElement | null;
        if (invoiceDateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            invoiceDateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    }

    async function handleSearch() {
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const query = searchInput ? searchInput.value.trim() : '';
        if (!query) {
            await loadRecentInvoices();
            return;
        }

        // We wrap createInvoiceCard helper to support searchDocuments
        const cardCreator = (invoice: Invoice) => {
            if ((window as any).invoiceTable && typeof (window as any).invoiceTable.createInvoiceCard === 'function') {
                return (window as any).invoiceTable.createInvoiceCard(invoice);
            }
            return document.createElement("div");
        };

        await searchDocuments('invoice', query, invoicesListDiv, cardCreator,
            `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                <p class="text-gray-500">No invoices match your search</p>
            </div>`);
    }

    async function payment(id: string, editIndex: number | null = null, editData: PaymentRecord | null = null) {
        const invoiceId = id;

        (window as any).paymentEditMode = editIndex !== null;
        (window as any).paymentEditIndex = editIndex;
        (window as any).paymentEditOriginalAmount = editData ? editData.paid_amount : 0;

        const viewEl = document.getElementById('view');
        if (viewEl && window.getComputedStyle(viewEl).display !== 'none') {
            (window as any).paymentReturnView = 'view';
        } else {
            (window as any).paymentReturnView = 'home';
        }

        try {
            const response = await fetchDocumentById('invoice', invoiceId);
            if (!response || !response.invoice) {
                electronAPI.showAlert1('Invoice not found.');
                return;
            }

            const invoice = response.invoice as Invoice;
            const totalAmount = invoice.total_amount_duplicate || invoice.total_amount_original || 0;
            const paidAmount = invoice.total_paid_amount || 0;
            const dueAmount = (window as any).paymentEditMode
                ? (totalAmount - paidAmount + (window as any).paymentEditOriginalAmount)
                : (totalAmount - paidAmount);

            if (!(window as any).paymentEditMode && (!dueAmount || dueAmount <= 0)) {
                electronAPI.showAlert1('There is no outstanding due on this invoice.');
                return;
            }

            const viewPreview = document.getElementById('view-preview');
            const home = document.getElementById('home');
            const newSec = document.getElementById('new');
            const view = document.getElementById('view');
            const paymentContainer = document.getElementById('payment-container');

            if (viewPreview) viewPreview.style.display = 'none';
            if (home) home.style.display = 'none';
            if (newSec) newSec.style.display = 'none';
            if (view) view.style.display = 'none';
            if (paymentContainer) paymentContainer.style.display = 'flex';

            (window as any).currentPaymentInvoiceId = invoiceId;

            const modalTitle = document.querySelector('#payment-container h2');
            const paymentBtn = document.getElementById('payment-btn');
            if ((window as any).paymentEditMode) {
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit text-blue-600 mr-2"></i>Edit Payment';
                if (paymentBtn) paymentBtn.innerHTML = '<i class="fas fa-save"></i> Update Payment';
            } else {
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-money-bill-wave text-green-600 mr-2"></i>Add Payment';
                if (paymentBtn) paymentBtn.innerHTML = '<i class="fas fa-save"></i> Save Payment';
            }

            const paidAmountInput = document.getElementById('paid-amount') as HTMLInputElement | null;
            if (paidAmountInput) {
                const newPaidAmountInput = paidAmountInput.cloneNode(true) as HTMLInputElement;
                if (paidAmountInput.parentNode) {
                    paidAmountInput.parentNode.replaceChild(newPaidAmountInput, paidAmountInput);
                }

                newPaidAmountInput.value = editData ? String(editData.paid_amount) : '';

                newPaidAmountInput.addEventListener('input', function () {
                    const val = parseFloat(this.value);
                    if (val > dueAmount) {
                        this.setCustomValidity(`Amount cannot exceed due amount (₹ ${formatIndian(dueAmount, 2)})`);
                        this.reportValidity();
                        this.classList.add('border-red-500', 'focus:ring-red-500');
                        this.classList.remove('border-gray-300', 'focus:ring-blue-500');
                    } else {
                        this.setCustomValidity('');
                        this.classList.remove('border-red-500', 'focus:ring-red-500');
                        this.classList.add('border-gray-300', 'focus:ring-blue-500');
                    }
                });
            }

            const paymentModeSelect = document.getElementById('payment-mode') as HTMLSelectElement | null;
            if (paymentModeSelect) {
                paymentModeSelect.value = editData ? editData.payment_mode : 'Cash';
                paymentModeSelect.dispatchEvent(new Event('change'));
            }

            const paymentDateInput = document.getElementById('payment-date') as HTMLInputElement | null;
            if (paymentDateInput) {
                if (editData && editData.payment_date) {
                    const editDate = new Date(editData.payment_date);
                    paymentDateInput.value = (window as any).formatDateInput ? (window as any).formatDateInput(editDate) : editDate.toISOString().split('T')[0];
                } else {
                    const today = (window as any).getTodayForInput ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
                    paymentDateInput.value = today;
                }
            }

            setTimeout(() => {
                if (editData && editData.extra_details) {
                    const extraFieldInput = document.querySelector('#extra-payment-details input') as HTMLInputElement | null;
                    if (extraFieldInput) {
                        extraFieldInput.value = editData.extra_details;
                    }
                }
            }, 50);

            const dueAmountElement = document.getElementById('payment-due-amount');
            if (dueAmountElement) {
                dueAmountElement.textContent = `₹ ${formatIndian(dueAmount, 2)}`;
            }

            const autofillBtn = document.getElementById('autofill-full-amount');
            if (autofillBtn) {
                const newAutofillBtn = autofillBtn.cloneNode(true);
                if (autofillBtn.parentNode) {
                    autofillBtn.parentNode.replaceChild(newAutofillBtn, autofillBtn);
                }

                newAutofillBtn.addEventListener('click', () => {
                    const currentPaidInput = document.getElementById('paid-amount') as HTMLInputElement | null;
                    if (currentPaidInput && dueAmount > 0) {
                        currentPaidInput.value = dueAmount.toFixed(2);
                        currentPaidInput.classList.add('ring-2', 'ring-green-500');
                        setTimeout(() => {
                            currentPaidInput.classList.remove('ring-2', 'ring-green-500');
                        }, 500);
                    }
                });
            }

            setTimeout(() => {
                const firstInput = document.getElementById('paid-amount');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        } catch (error) {
            console.error('Error fetching invoice for payment:', error);
            electronAPI.showAlert1('Failed to fetch invoice details.');
        }
    }

    async function editPayment(invoiceId: string, paymentIndex: number) {
        try {
            const response = await fetchDocumentById('invoice', invoiceId);
            if (!response || !response.invoice) {
                electronAPI.showAlert1('Invoice not found.');
                return;
            }

            const invoice = response.invoice as Invoice;
            if (!invoice.payments || paymentIndex >= invoice.payments.length) {
                electronAPI.showAlert1('Payment not found.');
                return;
            }

            const paymentData = invoice.payments[paymentIndex];
            payment(invoiceId, paymentIndex, paymentData);
        } catch (error) {
            console.error('Error fetching payment for edit:', error);
            electronAPI.showAlert1('Failed to fetch payment details.');
        }
    }

    async function deletePayment(invoiceId: string, paymentIndex: number) {
        electronAPI.showAlert2(
            'Are you sure you want to delete this payment? This action cannot be undone.',
            'Delete Payment'
        );

        electronAPI.receiveAlertResponse(async (response: string) => {
            if (response === "Yes") {
                try {
                    const res = await fetch(`/invoice/delete-payment/${invoiceId}/${paymentIndex}`, {
                        method: 'DELETE'
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        electronAPI.showAlert1(`Error: ${data.message || 'Failed to delete payment.'}`);
                        return;
                    }

                    electronAPI.showAlert1('Payment deleted successfully.');

                    const userRole = sessionStorage.getItem('userRole');
                    if (typeof viewInvoice === 'function') {
                        viewInvoice(invoiceId, userRole);
                    }
                } catch (error) {
                    console.error('Error deleting payment:', error);
                    electronAPI.showAlert1('Failed to delete payment.');
                }
            }
        });
    }

    document.getElementById('close-payment-modal')?.addEventListener('click', () => {
        const payContainer = document.getElementById('payment-container');
        if (payContainer) payContainer.style.display = 'none';

        if ((window as any).paymentReturnView === 'view') {
            const viewEl = document.getElementById('view');
            if (viewEl) viewEl.style.display = 'block';
            const userRole = sessionStorage.getItem('userRole');
            if (typeof viewInvoice === 'function' && (window as any).currentPaymentInvoiceId) {
                viewInvoice((window as any).currentPaymentInvoiceId, userRole);
            }
        } else {
            const homeEl = document.getElementById('home');
            if (homeEl) homeEl.style.display = 'block';
            loadRecentInvoices();
        }
    });

    document.getElementById('payment-mode')?.addEventListener('change', function (this: HTMLSelectElement) {
        const mode = this.value;
        const extraField = document.getElementById('extra-payment-details');

        if (!extraField) return;

        extraField.innerHTML = '';

        if (mode === 'Cash') {
            extraField.innerHTML = `
                <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                </label>
                <input type="text" id="cash-location" placeholder="Enter cash location"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'UPI') {
            extraField.innerHTML = `
                <label for="upi-transaction-id" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-mobile-alt text-gray-500 mr-1"></i>UPI Transaction ID
                </label>
                <input type="text" id="upi-transaction-id" placeholder="Enter UPI transaction ID"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Cheque') {
            extraField.innerHTML = `
                <label for="cheque-number" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-money-check text-gray-500 mr-1"></i>Cheque Number
                </label>
                <input type="text" id="cheque-number" placeholder="Enter cheque number"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Bank Transfer') {
            extraField.innerHTML = `
                <label for="bank-details" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-university text-gray-500 mr-1"></i>Bank Details
                </label>
                <input type="text" id="bank-details" placeholder="Enter bank details"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        }
    });

    document.getElementById('payment-btn')?.addEventListener('click', async () => {
        const paymentBtn = document.getElementById('payment-btn') as HTMLButtonElement | null;
        if (!paymentBtn || paymentBtn.disabled) return;

        const paidAmountInput = document.getElementById("paid-amount") as HTMLInputElement | null;
        const paidAmount = parseFloat(paidAmountInput?.value || '0') || 0;
        const paymentDateInput = document.getElementById("payment-date") as HTMLInputElement | null;
        const paymentDate = paymentDateInput ? paymentDateInput.value : '';
        const paymentModeSelect = document.getElementById("payment-mode") as HTMLSelectElement | null;
        const paymentMode = paymentModeSelect ? paymentModeSelect.value : '';

        let dueAmount: number | null = null;
        try {
            const invResp = await fetchDocumentById('invoice', (window as any).currentPaymentInvoiceId);
            if (invResp && invResp.invoice) {
                const invoice = invResp.invoice as Invoice;
                const totalAmount = invoice.total_amount_duplicate || invoice.total_amount_original || 0;
                const paidSoFar = invoice.total_paid_amount || 0;
                const adjustedDue = (window as any).paymentEditMode
                    ? (totalAmount - paidSoFar + (window as any).paymentEditOriginalAmount)
                    : (totalAmount - paidSoFar);
                dueAmount = Number(adjustedDue.toFixed(2));
            }
        } catch (err) {
            console.error('Error fetching invoice for validation:', err);
        }

        if (!(window as any).currentPaymentInvoiceId) {
            electronAPI.showAlert1('Invoice not selected for payment.');
            return;
        }

        if (!paymentDate) {
            electronAPI.showAlert1('Please select a payment date.');
            return;
        }

        const today = new Date();
        const enteredDate = new Date(paymentDate + 'T00:00:00');
        if (isNaN(enteredDate.getTime())) {
            electronAPI.showAlert1('Invalid payment date.');
            return;
        }
        if (enteredDate > today) {
            electronAPI.showAlert1('Payment date cannot be in the future.');
            return;
        }

        if (!paymentMode) {
            electronAPI.showAlert1('Please select a payment method.');
            return;
        }

        if (paidAmount <= 0 || isNaN(paidAmount)) {
            electronAPI.showAlert1('Please enter a valid paid amount greater than 0.');
            paidAmountInput?.focus();
            return;
        }

        if (dueAmount !== null && paidAmount > dueAmount) {
            electronAPI.showAlert1(`Paid amount cannot exceed due amount (₹ ${formatIndian(dueAmount, 2)}).`);
            paidAmountInput?.focus();
            return;
        }

        let extraInfo = '';
        if (paymentMode === 'Cash') {
            const cashLocInput = document.getElementById('cash-location') as HTMLInputElement | null;
            extraInfo = cashLocInput ? cashLocInput.value : '';
            if (!extraInfo.trim()) {
                electronAPI.showAlert1('Please enter cash location.');
                return;
            }
        } else if (paymentMode === 'UPI') {
            const upiIdInput = document.getElementById('upi-transaction-id') as HTMLInputElement | null;
            extraInfo = upiIdInput ? upiIdInput.value : '';
            if (!extraInfo.trim()) {
                electronAPI.showAlert1('Please enter UPI transaction ID.');
                return;
            }
        } else if (paymentMode === 'Cheque') {
            const chequeNumInput = document.getElementById('cheque-number') as HTMLInputElement | null;
            extraInfo = chequeNumInput ? chequeNumInput.value : '';
            if (!extraInfo.trim()) {
                electronAPI.showAlert1('Please enter cheque number.');
                return;
            }
        } else if (paymentMode === 'Bank Transfer') {
            const bankDetailsInput = document.getElementById('bank-details') as HTMLInputElement | null;
            extraInfo = bankDetailsInput ? bankDetailsInput.value : '';
            if (!extraInfo.trim()) {
                electronAPI.showAlert1('Please enter bank details.');
                return;
            }
        }

        interface PaymentSubmitData {
            invoiceId: string;
            paidAmount: number;
            paymentDate: string;
            paymentMode: string;
            paymentExtra: string;
            paymentIndex?: number;
        }

        const submitData: PaymentSubmitData = {
            invoiceId: (window as any).currentPaymentInvoiceId,
            paidAmount: paidAmount,
            paymentDate: paymentDate,
            paymentMode: paymentMode,
            paymentExtra: extraInfo,
        };

        if ((window as any).paymentEditMode) {
            submitData.paymentIndex = (window as any).paymentEditIndex;
        }

        paymentBtn.disabled = true;
        const originalBtnText = paymentBtn.innerHTML;
        paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const endpoint = (window as any).paymentEditMode ? "/invoice/update-payment" : "/invoice/save-payment";
            const method = (window as any).paymentEditMode ? "PUT" : "POST";

            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
                paymentBtn.disabled = false;
                paymentBtn.innerHTML = originalBtnText;
            } else {
                electronAPI.showAlert1((window as any).paymentEditMode ? "Payment Updated!" : "Payment Saved!");

                (window as any).paymentEditMode = false;
                (window as any).paymentEditIndex = null;
                (window as any).paymentEditOriginalAmount = 0;

                if (paidAmountInput) paidAmountInput.value = '';
                const paymentDateEl = document.getElementById('payment-date') as HTMLInputElement | null;
                if (paymentDateEl) paymentDateEl.value = (window as any).getTodayForInput ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
                if (paymentModeSelect) paymentModeSelect.value = '';
                const extraField = document.getElementById('extra-payment-details');
                if (extraField) {
                    extraField.innerHTML = `
                        <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                        </label>
                        <input type="text" id="cash-location" placeholder="Enter cash location"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    `;
                }

                paymentBtn.disabled = false;
                paymentBtn.innerHTML = originalBtnText;

                const paymentContainer = document.getElementById('payment-container');
                if (paymentContainer) paymentContainer.style.display = 'none';

                if ((window as any).paymentReturnView === 'view') {
                    const viewEl = document.getElementById('view');
                    if (viewEl) viewEl.style.display = 'block';
                    const userRole = sessionStorage.getItem('userRole');
                    if (typeof viewInvoice === 'function' && (window as any).currentPaymentInvoiceId) {
                        viewInvoice((window as any).currentPaymentInvoiceId, userRole);
                    }
                } else {
                    const homeEl = document.getElementById('home');
                    if (homeEl) homeEl.style.display = 'block';
                    loadRecentInvoices();
                }
            }
        } catch (error) {
            console.error("Error:", error);
            electronAPI.showAlert1("Failed to connect to server.");
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;
        }
    });

    function initShortcutsModal() {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
        const shortcutsBtn = document.getElementById('shortcuts-btn');
        const closeBtn = document.getElementById('close-shortcuts');
        const contentContainer = document.getElementById('shortcuts-content');

        if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
            return;
        }

        contentContainer.innerHTML = INVOICE_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

        shortcutsBtn.addEventListener('click', () => {
            showShortcutsModal();
        });

        closeBtn.addEventListener('click', () => {
            hideShortcutsModal();
        });

        shortcutsModalRef.addEventListener('click', (event) => {
            if (event.target === shortcutsModalRef) {
                hideShortcutsModal();
            }
        });
    }

    function renderShortcutSection(section: ShortcutGroup) {
        const sectionHeader = `
            <div class="shortcuts-section">
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="${section.icon}"></i>
                    ${section.title}
                </h3>
                <div class="space-y-1">
                    ${section.items.map(renderShortcutRow).join('')}
                </div>
            </div>
        `;
        return sectionHeader;
    }

    function renderShortcutRow(item: ShortcutItem) {
        return `
            <div class="shortcut-row">
                <span class="text-xs font-semibold text-slate-600">${item.label}</span>
                ${renderShortcutKeys(item.keys)}
            </div>
        `;
    }

    function renderShortcutKeys(keys: string[]) {
        const keyCaps = keys.map((key, index) => {
            const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
            const separator = index > 0 ? '<span class="text-slate-300 font-medium">+</span>' : '';
            return `${separator}<kbd>${displayKey}</kbd>`;
        }).join('');
        return `<div class="shortcut-keys">${keyCaps}</div>`;
    }

    function showShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.remove('hidden');
        shortcutsModalRef.offsetHeight;
        shortcutsModalRef.classList.remove('opacity-0');
    }

    function hideShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.add('opacity-0');
        setTimeout(() => {
            shortcutsModalRef?.classList.add('hidden');
        }, 200);
    }

    function isSectionVisible(sectionId: string) {
        const el = document.getElementById(sectionId);
        if (!el) return false;
        return window.getComputedStyle(el).display !== 'none';
    }

    function isFormActive() {
        return isSectionVisible('new');
    }

    function isExistingDocument() {
        const status = sessionStorage.getItem('currentTab-status');
        return status === 'update' || status === 'clone';
    }

    function isPreviewStepActive() {
        if (typeof currentStep === 'undefined' || typeof totalSteps === 'undefined') {
            return false;
        }
        return currentStep === totalSteps;
    }

    async function runOnPreviewStep(callback: () => void) {
        if (typeof callback !== 'function') {
            return;
        }

        if (!isFormActive()) {
            return;
        }

        if (isPreviewStepActive()) {
            if (typeof (window as any).generatePreview === 'function') {
                await (window as any).generatePreview();
            }
            callback();
            return;
        }

        const navigateToPreview = async () => {
            const nextBtn = document.getElementById('next-btn');
            if (!nextBtn) {
                return;
            }

            const stepBefore = typeof currentStep !== 'undefined' ? currentStep : 0;
            nextBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            const stepAfter = typeof currentStep !== 'undefined' ? currentStep : 0;
            if (stepAfter === stepBefore) {
                return;
            }

            if (isPreviewStepActive()) {
                if (typeof (window as any).generatePreview === 'function') {
                    await (window as any).generatePreview();
                }
                callback();
                return;
            }

            await navigateToPreview();
        };

        await navigateToPreview();
    }

    function isItemsStepActive() {
        if (typeof currentStep === 'undefined') {
            return false;
        }
        return currentStep === 5;
    }

    function isHomeScreenActive() {
        const homeSectionVisible = isSectionVisible('home');
        return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
    }

    function triggerAddEntry() {
        if (!isFormActive()) {
            return false;
        }

        const itemsBtn = document.getElementById('add-item-btn');
        if (itemsBtn && isItemsStepActive()) {
            itemsBtn.click();
            return true;
        }

        const nonItemBtn = document.getElementById('add-non-item-btn');
        if (nonItemBtn && typeof currentStep !== 'undefined' && currentStep === 6) {
            nonItemBtn.click();
            return true;
        }

        return false;
    }

    function triggerPrintAction() {
        const formPrintBtn = document.getElementById('print-btn');
        if (formPrintBtn && isFormActive()) {
            runOnPreviewStep(() => formPrintBtn.click());
            return true;
        }

        const viewPrintBtn = document.getElementById('printProject');
        if (viewPrintBtn && isSectionVisible('view')) {
            viewPrintBtn.click();
            return true;
        }

        return false;
    }

    function isTypingContext() {
        const active = document.activeElement;
        if (!active) return false;
        const tagName = active.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || (active as any).isContentEditable || tagName === 'SELECT';
    }

    function handleQuotationKeyboardShortcuts(event: KeyboardEvent) {
        const keyLower = event.key.toLowerCase();
        const isModifierPressed = event.ctrlKey || event.metaKey;
        const homeButton = document.getElementById('home-btn');

        const paymentContainer = document.getElementById('payment-container');
        const isPaymentOpen = paymentContainer && paymentContainer.style.display !== 'none';

        if (isPaymentOpen) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                document.getElementById('close-payment-modal')?.click();
                return;
            }

            if (event.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                document.getElementById('payment-btn')?.click();
                return;
            }

            if (event.key === 'Tab') {
                const focusableElements = paymentContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) {
                            event.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            event.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
                return;
            }

            if (isModifierPressed || event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            return;
        }

        if (!shortcutsModalRef) {
            shortcutsModalRef = document.getElementById('shortcuts-modal');
        }

        if (!event.altKey && isModifierPressed) {
            switch (keyLower) {
                case 'n': {
                    const newBtn = document.getElementById('new-invoice');
                    if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        newBtn.click();
                    }
                    break;
                }
                case 'r': {
                    const refreshBtn = document.getElementById('refresh-btn');
                    if (refreshBtn && window.getComputedStyle(refreshBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        refreshBtn.click();
                    }
                    break;
                }
                case 's': {
                    const saveBtn = document.getElementById('save-btn');
                    if (saveBtn && isFormActive()) {
                        if (isExistingDocument() || isPreviewStepActive()) {
                            event.preventDefault();
                            event.stopPropagation();
                            runOnPreviewStep(() => saveBtn.click());
                        }
                    }
                    break;
                }
                case 'p': {
                    const isShift = event.shiftKey;
                    if (isShift) {
                        if (triggerPrintAction()) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    } else {
                        const previewBtn = document.getElementById('view-preview');
                        if (previewBtn && window.getComputedStyle(previewBtn).display !== 'none') {
                            event.preventDefault();
                            event.stopPropagation();
                            previewBtn.click();
                        }
                    }
                    break;
                }
                case 'i': {
                    if (triggerAddEntry()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    break;
                }
                case 'h': {
                    if (homeButton) {
                        event.preventDefault();
                        event.stopPropagation();
                        homeButton.click();
                        setTimeout(() => {
                            window.location.reload();
                        }, 150);
                    }
                    break;
                }
                case 'f': {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        event.preventDefault();
                        event.stopPropagation();
                        searchInput.focus();
                        (searchInput as HTMLInputElement).select();
                    }
                    break;
                }
                default:
                    break;
            }
            return;
        }

        if (event.altKey) {
            return;
        }

        if (event.key === 'Escape') {
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                event.preventDefault();
                event.stopPropagation();
                hideShortcutsModal();
                return;
            }

            if (isHomeScreenActive()) {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = '/dashboard';
                return;
            }

            event.stopPropagation();
            return;
        }

        if (event.key === '?' && !isTypingContext()) {
            event.preventDefault();
            event.stopPropagation();
            showShortcutsModal();
            return;
        }

        if (isTypingContext()) {
            return;
        }

        if (event.key === 'Enter') {
            if (isHomeScreenActive()) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (isFormActive()) {
                const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
                if (nextBtn && !nextBtn.disabled) {
                    event.preventDefault();
                    event.stopPropagation();
                    nextBtn.click();
                }
                return;
            }
        }

        if (event.key === 'Backspace' && isFormActive()) {
            const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
            if (prevBtn && !prevBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                prevBtn.click();
            }
        }
    }

    // Expose functions globally for payment and delete actions
    (window as any).payment = payment;
    (window as any).editPayment = editPayment;
    (window as any).deletePayment = deletePayment;
    (window as any).deleteInvoice = deleteInvoice;
    (window as any).loadRecentInvoices = loadRecentInvoices;
})();
