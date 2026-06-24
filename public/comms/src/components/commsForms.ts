/**
 * Comms Module Forms Logic - Redesigned Tabbed Action Center
 */

declare var commsUtils: any;
declare var commsApi: any;

class CommsForms {
    private activeTab: string = 'message';
    private activeChannel: CommsChannel = 'whatsapp';
    private selectedCustomer: any = null;
    private customerQuotations: any[] = [];
    private customerInvoices: any[] = [];
    private customerPayments: any[] = [];
    private customerVouchers: any[] = [];
    private selectedQuotation: any = null;
    private selectedInvoice: any = null;
    private selectedReminderInvoice: any = null;
    private selectedPayment: any = null;
    private selectedVoucher: any = null;
    private allInvoices: any[] = [];

    init() {
        this.setupChannelSelector();
        this.setupTabs();
        this.setupCustomerAutocomplete();
        this.setupEmailInput();
        this.setupQuotationSelectListener();
        this.setupInvoiceSelectListener();
        this.setupReminderInvoiceSelectListener();
        this.setupReceiptSelectListener();
        this.setupVoucherSelectListener();
        this.setupMessageCharCounter();
        this.setupMessageSubmit();
        this.setupQuotationSubmit();
        this.setupInvoiceSubmit();
        this.setupReminderSubmit();
        this.setupReceiptSubmit();
        this.setupVoucherSubmit();
        this.setupKeyboardShortcuts();
        
        // Initial setup
        this.renderRecentLogs();
        this.loadReminderStats();
    }

    private setupChannelSelector() {
        const btns = document.querySelectorAll('.channel-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const ch = btn.getAttribute('data-channel') as CommsChannel;
                if (!ch) return;
                this.activeChannel = ch;
                this.applyChannelStyles();
                this.updateFormFieldsDisabledState();
                this.updateSendButtonLabels();

                // Show/hide email subject field on message panel
                const subjectRow = document.getElementById('message-email-subject-row');
                if (subjectRow) {
                    subjectRow.classList.toggle('hidden', ch === 'whatsapp');
                }
            });
        });
    }

    private applyChannelStyles() {
        const ch = this.activeChannel;
        const configs: Record<CommsChannel, { id: string; active: string; inactive: string }> = {
            whatsapp: {
                id: 'ch-whatsapp',
                active:   'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-green-500 bg-green-50 text-green-700 text-sm font-semibold transition-all',
                inactive: 'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-500 text-sm font-medium hover:border-green-400 hover:text-green-600 transition-all'
            },
            email: {
                id: 'ch-email',
                active:   'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold transition-all',
                inactive: 'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-500 text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition-all'
            },
            both: {
                id: 'ch-both',
                active:   'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500 bg-purple-50 text-purple-700 text-sm font-semibold transition-all',
                inactive: 'channel-btn flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-500 text-sm font-medium hover:border-purple-400 hover:text-purple-600 transition-all'
            }
        };
        (Object.keys(configs) as CommsChannel[]).forEach(key => {
            const el = document.getElementById(configs[key].id);
            if (el) el.className = (key === ch) ? configs[key].active : configs[key].inactive;
        });
    }

    private updateSendButtonLabels() {
        const ch = this.activeChannel;
        const suffix = ch === 'whatsapp' ? 'via WhatsApp' : ch === 'email' ? 'via Email' : 'via Both';
        const map: Record<string, string> = {
            'btn-send-message-label':   `Send Message ${suffix}`,
            'btn-send-quotation-label': `Send Quotation ${suffix}`,
            'btn-send-invoice-label':   `Send Invoice ${suffix}`,
            'btn-send-reminder-label':  `Send Reminder ${suffix}`,
            'btn-send-receipt-label':   `Send Receipt ${suffix}`,
            'btn-send-voucher-label':   `Send Voucher ${suffix}`,
        };
        Object.entries(map).forEach(([id, label]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = label;
        });
    }

    private setupEmailInput() {
        const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
        if (!emailInput) return;
        emailInput.addEventListener('input', () => {
            this.updateFormFieldsDisabledState();
        });
    }

    private setupTabs() {
        const tabsContainer = document.getElementById('action-tabs');
        if (!tabsContainer) return;

        const tabs = tabsContainer.querySelectorAll('button');
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                if (!targetTab) return;

                this.activeTab = targetTab;

                // Toggle active button style
                tabs.forEach(t => {
                    if (t.getAttribute('data-tab') === targetTab) {
                        t.className = 'py-4 px-6 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 flex items-center gap-2 transition-all cursor-pointer';
                    } else {
                        t.className = 'py-4 px-6 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 flex items-center gap-2 transition-all cursor-pointer';
                    }
                });

                // Toggle panels visibility
                const panels = document.querySelectorAll('.tab-panel');
                panels.forEach(panel => {
                    if (panel.id === `panel-${targetTab}`) {
                        panel.classList.remove('hidden');
                    } else {
                        panel.classList.add('hidden');
                    }
                });

                // Refresh stats if switching to reminder
                if (targetTab === 'reminder') {
                    this.loadReminderStats();
                }
            });

            tab.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevIndex = (index - 1 + tabs.length) % tabs.length;
                    tabs[prevIndex].focus();
                    tabs[prevIndex].click();
                }
            });
        });
    }

    private setupCustomerAutocomplete() {
        const input = document.getElementById('customer-search-input') as HTMLInputElement;
        const suggestionsList = document.getElementById('customer-search-suggestions') as HTMLUListElement;
        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
        if (!input || !suggestionsList || !phoneInput) return;

        let debounceTimer: any;
        let selectedIndex = -1;
        let currentCustomers: any[] = [];

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim();

            if (query.length < 2) {
                suggestionsList.style.display = 'none';
                suggestionsList.innerHTML = '';
                this.clearSelectedCustomer();
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    currentCustomers = await commsApi.searchCustomers(query);
                    suggestionsList.innerHTML = '';
                    selectedIndex = -1;

                    if (currentCustomers.length === 0) {
                        suggestionsList.style.display = 'none';
                        return;
                    }

                    suggestionsList.style.display = 'block';
                    suggestionsList.classList.remove('hidden');

                    currentCustomers.forEach((customer, index) => {
                        const li = document.createElement('li');
                        li.className = 'px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors duration-150 text-left';
                        
                        const name = customer.customer?.name || `${customer.customer?.first_name || ''} ${customer.customer?.last_name || ''}`.trim() || 'Unknown';
                        const phone = customer.customer?.phone || '';
                        const email = customer.customer?.email || '';

                        li.innerHTML = `
                            <div class="font-medium text-slate-800 text-sm">${name}</div>
                            <div class="text-xs text-slate-500 flex gap-2 mt-0.5">
                                <span>${phone}</span>
                                ${email ? `<span class="text-slate-300">•</span><span>${email}</span>` : ''}
                            </div>
                        `;

                        li.onclick = () => this.selectCustomer(customer);
                        suggestionsList.appendChild(li);
                    });
                } catch (err) {
                    console.error('Failed to autocomplete customers:', err);
                }
            }, 300);
        });

        input.addEventListener('keydown', (e: KeyboardEvent) => {
            const items = suggestionsList.querySelectorAll('li');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                this.updateActiveSuggestion(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.updateActiveSuggestion(items, selectedIndex);
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < currentCustomers.length) {
                    e.preventDefault();
                    this.selectCustomer(currentCustomers[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                suggestionsList.style.display = 'none';
                selectedIndex = -1;
            }
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e: MouseEvent) => {
            if (!input.contains(e.target as Node) && !suggestionsList.contains(e.target as Node)) {
                suggestionsList.style.display = 'none';
            }
        });

        // Phone input filter (digits and + only)
        phoneInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            target.value = target.value.replace(/[^\d+]/g, '');
            this.updateFormFieldsDisabledState();
        });
    }

    private updateActiveSuggestion(items: any, index: number) {
        items.forEach((item: HTMLElement, idx: number) => {
            if (idx === index) {
                item.classList.add('bg-slate-100');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-slate-100');
            }
        });
    }

    private async selectCustomer(customer: any) {
        this.selectedCustomer = customer;
        const input = document.getElementById('customer-search-input') as HTMLInputElement;
        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
        const suggestionsList = document.getElementById('customer-search-suggestions') as HTMLUListElement;

        const name = customer.customer?.name || `${customer.customer?.first_name || ''} ${customer.customer?.last_name || ''}`.trim();
        if (input) input.value = name;
        if (phoneInput) phoneInput.value = customer.customer?.phone || '';
        if (emailInput) emailInput.value = customer.customer?.email || '';
        if (suggestionsList) {
            suggestionsList.style.display = 'none';
            suggestionsList.innerHTML = '';
        }

        // Load customer documents
        try {
            const data = await commsApi.getCustomerDetails(customer._id);
            this.customerQuotations = data.quotations || [];
            this.customerInvoices = data.invoices || [];
            this.customerPayments = data.payments || [];
            this.customerVouchers = data.vouchers || [];

            // Populate selectors
            this.populateQuotationSelect();
            this.populateInvoiceSelect();
            this.populateReminderInvoiceSelect();
            this.populateReceiptSelect();
            this.populateVoucherSelect();

            // Enable inputs/buttons
            this.updateFormFieldsDisabledState();
        } catch (err) {
            commsUtils.showNotification('Failed to fetch customer details & documents.', 'error');
        }
    }

    private clearSelectedCustomer() {
        this.selectedCustomer = null;
        this.customerQuotations = [];
        this.customerInvoices = [];
        this.customerPayments = [];
        this.customerVouchers = [];
        this.selectedQuotation = null;
        this.selectedInvoice = null;
        this.selectedReminderInvoice = null;
        this.selectedPayment = null;
        this.selectedVoucher = null;

        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        if (phoneInput) phoneInput.value = '';

        const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
        if (emailInput) emailInput.value = '';

        this.populateQuotationSelect();
        this.populateInvoiceSelect();
        this.populateReminderInvoiceSelect();
        this.populateReceiptSelect();
        this.populateVoucherSelect();
        this.hidePreviews();
        this.updateFormFieldsDisabledState();
    }

    private populateQuotationSelect() {
        const select = document.getElementById('quotation-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        if (!this.selectedCustomer) {
            select.innerHTML = '<option value="">Select a customer first...</option>';
            select.disabled = true;
            return;
        }

        if (this.customerQuotations.length === 0) {
            select.innerHTML = '<option value="">No quotations found for this customer</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Select a quotation...</option>';
        this.customerQuotations.forEach(q => {
            const dateStr = q.quotation_date ? new Date(q.quotation_date).toLocaleDateString('en-IN') : '-';
            const total = q.totals?.grand_total || q.total_amount_tax || q.total_amount_no_tax || 0;
            const text = `${q.quotation_no} - ${dateStr} - ₹${total.toLocaleString('en-IN')} (${q.quotation_status || 'Draft'})`;
            const opt = document.createElement('option');
            opt.value = q.quotation_no;
            opt.textContent = text;
            select.appendChild(opt);
        });
    }

    private populateInvoiceSelect() {
        const select = document.getElementById('invoice-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        if (!this.selectedCustomer) {
            select.innerHTML = '<option value="">Select a customer first...</option>';
            select.disabled = true;
            return;
        }

        if (this.customerInvoices.length === 0) {
            select.innerHTML = '<option value="">No invoices found for this customer</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Select an invoice...</option>';
        this.customerInvoices.forEach(inv => {
            const dateStr = inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '-';
            const total = inv.total_amount_original || inv.total_amount_duplicate || 0;
            const text = `${inv.invoice_id} - ${dateStr} - ₹${total.toLocaleString('en-IN')} (${inv.payment_status || 'Unpaid'})`;
            const opt = document.createElement('option');
            opt.value = inv.invoice_id;
            opt.textContent = text;
            select.appendChild(opt);
        });
    }

    private populateReminderInvoiceSelect() {
        const select = document.getElementById('reminder-invoice-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        if (!this.selectedCustomer) {
            select.innerHTML = '<option value="">Select a customer first...</option>';
            select.disabled = true;
            return;
        }

        const unpaidInvoices = this.customerInvoices.filter(inv => 
            inv.payment_status?.toUpperCase() !== 'PAID' &&
            inv.status?.toUpperCase() !== 'CANCELLED'
        );

        if (unpaidInvoices.length === 0) {
            select.innerHTML = '<option value="">No unpaid invoices found for this customer</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Select an unpaid invoice...</option>';
        unpaidInvoices.forEach(inv => {
            const dateStr = inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '-';
            const total = inv.total_amount_original || inv.total_amount_duplicate || 0;
            const paid = inv.total_paid_amount || 0;
            const balance = Math.max(total - paid, 0);
            const text = `${inv.invoice_id} - ${dateStr} - Due: ₹${balance.toLocaleString('en-IN')} (Total: ₹${total.toLocaleString('en-IN')})`;
            const opt = document.createElement('option');
            opt.value = inv.invoice_id;
            opt.textContent = text;
            select.appendChild(opt);
        });
    }

    private populateReceiptSelect() {
        const select = document.getElementById('receipt-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        if (!this.selectedCustomer) {
            select.innerHTML = '<option value="">Select a customer first...</option>';
            select.disabled = true;
            return;
        }

        if (this.customerPayments.length === 0) {
            select.innerHTML = '<option value="">No payments found for this customer</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Select a payment receipt...</option>';
        this.customerPayments.forEach(p => {
            const dateStr = this.formatDate(p.payment_date);
            const amtStr = this.formatCurrency(p.amount);
            const text = `${p._id.substring(p._id.length - 6).toUpperCase()} - ${dateStr} - ${amtStr} (${p.mode || 'Cash'})`;
            const opt = document.createElement('option');
            opt.value = p._id;
            opt.textContent = text;
            select.appendChild(opt);
        });
    }

    private populateVoucherSelect() {
        const select = document.getElementById('voucher-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        if (!this.selectedCustomer) {
            select.innerHTML = '<option value="">Select a customer first...</option>';
            select.disabled = true;
            return;
        }

        if (this.customerVouchers.length === 0) {
            select.innerHTML = '<option value="">No vouchers found for this customer</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">Select a payment voucher...</option>';
        this.customerVouchers.forEach(v => {
            const dateStr = this.formatDate(v.date);
            const amtStr = this.formatCurrency(v.amount);
            const text = `${v.voucherNumber} - ${dateStr} - ${amtStr} (${v.paymentMethod || 'Cash'})`;
            const opt = document.createElement('option');
            opt.value = v.voucherNumber;
            opt.textContent = text;
            select.appendChild(opt);
        });
    }

    private setupQuotationSelectListener() {
        const select = document.getElementById('quotation-select') as HTMLSelectElement;
        const previewContainer = document.getElementById('quotation-preview-container');
        if (!select || !previewContainer) return;

        select.addEventListener('change', () => {
            const quotationId = select.value;
            if (!quotationId) {
                previewContainer.classList.add('hidden');
                this.selectedQuotation = null;
                this.updateFormFieldsDisabledState();
                return;
            }

            const quotation = this.customerQuotations.find(q => q.quotation_no === quotationId);
            if (!quotation) return;

            this.selectedQuotation = quotation;
            previewContainer.classList.remove('hidden');

            const dateStr = quotation.quotation_date ? new Date(quotation.quotation_date).toLocaleDateString('en-IN') : '-';
            const total = quotation.totals?.grand_total || quotation.total_amount_tax || quotation.total_amount_no_tax || 0;

            document.getElementById('preview-q-no')!.textContent = quotation.quotation_no;
            document.getElementById('preview-q-date')!.textContent = dateStr;
            document.getElementById('preview-q-project')!.textContent = quotation.project_name || '-';
            document.getElementById('preview-q-total')!.textContent = `₹${total.toLocaleString('en-IN')}`;

            const tbody = document.getElementById('preview-q-items');
            if (tbody) {
                tbody.innerHTML = '';
                const items = quotation.items || [];
                if (items.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-2 text-center text-slate-400">No items found</td></tr>`;
                } else {
                    items.forEach((it: any) => {
                        const tr = document.createElement('tr');
                        tr.className = 'border-b border-slate-100 last:border-0 hover:bg-slate-100/50 transition-colors';
                        
                        const desc = it.description || '-';
                        const qty = it.quantity || 0;
                        const price = it.unit_price || 0;
                        const itemTotal = it.total || (qty * price);

                        tr.innerHTML = `
                            <td class="px-3 py-2 text-slate-800">${desc}</td>
                            <td class="px-3 py-2 text-right text-slate-600">${qty}</td>
                            <td class="px-3 py-2 text-right text-slate-600">₹${price.toLocaleString('en-IN')}</td>
                            <td class="px-3 py-2 text-right font-medium text-slate-800">₹${itemTotal.toLocaleString('en-IN')}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            this.updateFormFieldsDisabledState();
        });
    }

    private setupInvoiceSelectListener() {
        const select = document.getElementById('invoice-select') as HTMLSelectElement;
        const previewContainer = document.getElementById('invoice-preview-container');
        if (!select || !previewContainer) return;

        select.addEventListener('change', () => {
            const invoiceId = select.value;
            if (!invoiceId) {
                previewContainer.classList.add('hidden');
                this.selectedInvoice = null;
                this.updateFormFieldsDisabledState();
                return;
            }

            const invoice = this.customerInvoices.find(inv => inv.invoice_id === invoiceId);
            if (!invoice) return;

            this.selectedInvoice = invoice;
            previewContainer.classList.remove('hidden');

            const dateStr = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '-';
            const total = invoice.total_amount_original || invoice.total_amount_duplicate || 0;
            const paid = invoice.total_paid_amount || 0;
            const balance = Math.max(total - paid, 0);
            const status = invoice.payment_status || 'Unpaid';

            document.getElementById('preview-i-no')!.textContent = invoice.invoice_id;
            document.getElementById('preview-i-date')!.textContent = dateStr;
            
            const statusSpan = document.getElementById('preview-i-status')!;
            statusSpan.textContent = status.toUpperCase();
            statusSpan.className = `px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status.toUpperCase() === 'PAID' ? 'bg-green-100 text-green-800' :
                status.toUpperCase() === 'PARTIAL' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
            }`;

            document.getElementById('preview-i-paid')!.textContent = `₹${paid.toLocaleString('en-IN')}`;
            document.getElementById('preview-i-balance')!.textContent = `₹${balance.toLocaleString('en-IN')}`;

            const tbody = document.getElementById('preview-i-items');
            if (tbody) {
                tbody.innerHTML = '';
                const items = invoice.items_duplicate && invoice.items_duplicate.length > 0 ? invoice.items_duplicate : (invoice.items_original || []);
                if (items.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-2 text-center text-slate-400">No items found</td></tr>`;
                } else {
                    items.forEach((it: any) => {
                        const tr = document.createElement('tr');
                        tr.className = 'border-b border-slate-100 last:border-0 hover:bg-slate-100/50 transition-colors';
                        
                        const desc = it.description || '-';
                        const qty = it.quantity || 0;
                        const price = it.unit_price || 0;
                        const itemTotal = it.total || (qty * price);

                        tr.innerHTML = `
                            <td class="px-3 py-2 text-slate-800">${desc}</td>
                            <td class="px-3 py-2 text-right text-slate-600">${qty}</td>
                            <td class="px-3 py-2 text-right text-slate-600">₹${price.toLocaleString('en-IN')}</td>
                            <td class="px-3 py-2 text-right font-medium text-slate-800">₹${itemTotal.toLocaleString('en-IN')}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            this.updateFormFieldsDisabledState();
        });
    }

    private setupReminderInvoiceSelectListener() {
        const select = document.getElementById('reminder-invoice-select') as HTMLSelectElement;
        const previewContainer = document.getElementById('reminder-preview-container');
        if (!select || !previewContainer) return;

        select.addEventListener('change', () => {
            const invoiceId = select.value;
            if (!invoiceId) {
                previewContainer.classList.add('hidden');
                this.selectedReminderInvoice = null;
                this.updateFormFieldsDisabledState();
                return;
            }

            const invoice = this.customerInvoices.find(inv => inv.invoice_id === invoiceId);
            if (!invoice) return;

            this.selectedReminderInvoice = invoice;
            previewContainer.classList.remove('hidden');

            const dueStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 
                           invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '-';
            const total = invoice.total_amount_original || invoice.total_amount_duplicate || 0;
            const paid = invoice.total_paid_amount || 0;
            const balance = Math.max(total - paid, 0);

            document.getElementById('reminder-preview-no')!.textContent = invoice.invoice_id;
            document.getElementById('reminder-preview-due')!.textContent = dueStr;
            document.getElementById('reminder-preview-total')!.textContent = `₹${total.toLocaleString('en-IN')}`;
            document.getElementById('reminder-preview-balance')!.textContent = `₹${balance.toLocaleString('en-IN')}`;

        });
    }

    private setupReceiptSelectListener() {
        const select = document.getElementById('receipt-select') as HTMLSelectElement;
        const previewContainer = document.getElementById('receipt-preview-container');
        if (!select || !previewContainer) return;

        select.addEventListener('change', () => {
            const paymentId = select.value;
            if (!paymentId) {
                previewContainer.classList.add('hidden');
                this.selectedPayment = null;
                this.updateFormFieldsDisabledState();
                return;
            }

            const payment = this.customerPayments.find(p => p._id === paymentId);
            if (!payment) return;

            this.selectedPayment = payment;
            previewContainer.classList.remove('hidden');

            const dateStr = this.formatDate(payment.payment_date);
            const amtStr = this.formatCurrency(payment.amount);
            const numToWords = (window as any).numberToWords;
            const words = numToWords ? `${numToWords(payment.amount)} Rupees Only` : '-';

            document.getElementById('preview-r-no')!.textContent = `#${payment._id.substring(payment._id.length - 6).toUpperCase()}`;
            document.getElementById('preview-r-date')!.textContent = dateStr;
            document.getElementById('preview-r-mode')!.textContent = payment.mode || 'Cash';
            document.getElementById('preview-r-amount')!.textContent = amtStr;
            document.getElementById('preview-r-words')!.textContent = words;

            this.updateFormFieldsDisabledState();
        });
    }

    private setupVoucherSelectListener() {
        const select = document.getElementById('voucher-select') as HTMLSelectElement;
        const previewContainer = document.getElementById('voucher-preview-container');
        if (!select || !previewContainer) return;

        select.addEventListener('change', () => {
            const voucherNo = select.value;
            if (!voucherNo) {
                previewContainer.classList.add('hidden');
                this.selectedVoucher = null;
                this.updateFormFieldsDisabledState();
                return;
            }

            const voucher = this.customerVouchers.find(v => v.voucherNumber === voucherNo);
            if (!voucher) return;

            this.selectedVoucher = voucher;
            previewContainer.classList.remove('hidden');

            const dateStr = this.formatDate(voucher.date);
            const amtStr = this.formatCurrency(voucher.amount);

            document.getElementById('preview-v-no')!.textContent = voucher.voucherNumber;
            document.getElementById('preview-v-date')!.textContent = dateStr;
            document.getElementById('preview-v-method')!.textContent = voucher.paymentMethod || 'Cash';
            document.getElementById('preview-v-amount')!.textContent = amtStr;
            document.getElementById('preview-v-towards')!.textContent = voucher.paidTowards || '-';
            document.getElementById('preview-v-words')!.textContent = voucher.amountInWords || '-';

            this.updateFormFieldsDisabledState();
        });
    }

    private setupMessageCharCounter() {
        const textarea = document.getElementById('message-content-input') as HTMLTextAreaElement;
        const counter = document.getElementById('message-char-count') as HTMLDivElement;
        if (!textarea || !counter) return;

        textarea.addEventListener('input', () => {
            const len = textarea.value.length;
            counter.textContent = `${len} / 1000 characters`;
            if (len > 1000) {
                counter.classList.add('text-red-500');
                counter.classList.remove('text-slate-400');
            } else {
                counter.classList.remove('text-red-500');
                counter.classList.add('text-slate-400');
            }
            this.updateFormFieldsDisabledState();
        });
    }

    private updateFormFieldsDisabledState() {
        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const ch = this.activeChannel;

        const phoneValid = commsUtils.validatePhone(phone);
        const emailValid = email.includes('@') && email.includes('.');

        const hasCustomer = !!this.selectedCustomer;
        const channelReady = hasCustomer && (
            (ch === 'whatsapp' && phoneValid) ||
            (ch === 'email'    && emailValid) ||
            (ch === 'both'     && phoneValid && emailValid)
        );

        // Message submit
        const msgTextarea = document.getElementById('message-content-input') as HTMLTextAreaElement;
        const msgText = msgTextarea ? msgTextarea.value.trim() : '';
        const btnMsg = document.getElementById('btn-send-message') as HTMLButtonElement;
        if (btnMsg) {
            btnMsg.disabled = !channelReady || !msgText || msgText.length > 1000;
        }

        // Quotation submit
        const btnQuo = document.getElementById('btn-send-quotation') as HTMLButtonElement;
        if (btnQuo) {
            btnQuo.disabled = !channelReady || !this.selectedQuotation;
        }

        // Invoice submit
        const btnInv = document.getElementById('btn-send-invoice') as HTMLButtonElement;
        if (btnInv) {
            btnInv.disabled = !channelReady || !this.selectedInvoice;
        }

        // Single reminder submit
        const btnRem = document.getElementById('btn-send-single-reminder') as HTMLButtonElement;
        if (btnRem) {
            btnRem.disabled = !channelReady || !this.selectedReminderInvoice;
        }

        // Receipt submit
        const btnRec = document.getElementById('btn-send-receipt') as HTMLButtonElement;
        if (btnRec) {
            btnRec.disabled = !channelReady || !this.selectedPayment;
        }

        // Voucher submit
        const btnVou = document.getElementById('btn-send-voucher') as HTMLButtonElement;
        if (btnVou) {
            btnVou.disabled = !channelReady || !this.selectedVoucher;
        }
    }

    async loadReminderStats() {
        try {
            this.allInvoices = await commsApi.fetchAllInvoices();
            
            const outstandingInvoices = this.allInvoices.filter(inv => 
                inv.payment_status?.toUpperCase() !== 'PAID' &&
                inv.status?.toUpperCase() !== 'CANCELLED' &&
                (!inv.deletion || !inv.deletion.is_deleted)
            );

            const now = new Date();
            const overdueInvoices = outstandingInvoices.filter(inv => {
                if (!inv.due_date) return false;
                return new Date(inv.due_date) < now;
            });

            let totalOutstandingAmount = 0;
            outstandingInvoices.forEach(inv => {
                const total = inv.total_amount_original || inv.total_amount_duplicate || 0;
                const paid = inv.total_paid_amount || 0;
                totalOutstandingAmount += Math.max(total - paid, 0);
            });

            const countEl = document.getElementById('stat-outstanding-count');
            const amtEl = document.getElementById('stat-outstanding-amount');
            const overdueEl = document.getElementById('stat-overdue-count');

            if (countEl) countEl.textContent = outstandingInvoices.length.toString();
            if (amtEl) amtEl.textContent = `₹${totalOutstandingAmount.toLocaleString('en-IN')}`;
            if (overdueEl) overdueEl.textContent = overdueInvoices.length.toString();

            // Expose unpaid projects count to comply with main.ts fetchUnpaidProjects hook
            const totalElement = document.getElementById('total-unpaid');
            if (totalElement) {
                totalElement.textContent = outstandingInvoices.length.toString();
            }
        } catch (err) {
            console.error('Failed to load global reminder stats:', err);
        }
    }

    private setupMessageSubmit() {
        const form = document.getElementById('message-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const contentInput = document.getElementById('message-content-input') as HTMLTextAreaElement;
            const content = contentInput.value.trim();
            const subjectInput = document.getElementById('message-email-subject') as HTMLInputElement;
            const subject = subjectInput ? subjectInput.value.trim() : '';
            const btn = document.getElementById('btn-send-message') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!content || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();

            try {
                commsUtils.setLoading(btn, true);
                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        commsApi.sendMessage({ phoneNumber: formattedPhone, message: content })
                            .then(() => ({ channel: 'WhatsApp', ok: true }))
                            .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailMessage({ email, subject, message: content })
                            .then(() => ({ channel: 'Email', ok: true }))
                            .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗ ' + r.err}`).join(' | ');

                commsUtils.showNotification(allOk ? `Message sent! (${summary})` : `Partial result: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('message', customerName, ch === 'email' ? email : phone, `Sent: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`, allOk ? 'success' : 'failed');

                contentInput.value = '';
                const counter = document.getElementById('message-char-count') as HTMLDivElement;
                if (counter) counter.textContent = '0 / 1000 characters';
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send message.', 'error');
                this.addLog('message', customerName, phone, `Failed to send message`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }

    private setupQuotationSubmit() {
        const form = document.getElementById('quotation-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const select = document.getElementById('quotation-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-quotation') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!this.selectedQuotation || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const quoNo = this.selectedQuotation.quotation_no;

            try {
                commsUtils.setLoading(btn, true);
                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        commsApi.sendQuotation({ phone: formattedPhone, quotationId: quoNo })
                            .then(() => ({ channel: 'WhatsApp', ok: true }))
                            .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailQuotation({ email, quotationId: quoNo })
                            .then(() => ({ channel: 'Email', ok: true }))
                            .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗'}`).join(' | ');

                commsUtils.showNotification(allOk ? `Quotation ${quoNo} sent! (${summary})` : `Partial result: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('quotation', customerName, ch === 'email' ? email : phone, `Quotation ${quoNo} shared`, allOk ? 'success' : 'failed');

                select.value = '';
                document.getElementById('quotation-preview-container')!.classList.add('hidden');
                this.selectedQuotation = null;
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send quotation.', 'error');
                this.addLog('quotation', customerName, phone, `Failed to send quotation ${quoNo}`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }

    private setupInvoiceSubmit() {
        const form = document.getElementById('invoice-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const select = document.getElementById('invoice-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-invoice') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!this.selectedInvoice || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const invNo = this.selectedInvoice.invoice_id;

            try {
                commsUtils.setLoading(btn, true);
                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        commsApi.sendInvoice({ phone: formattedPhone, invoiceId: invNo })
                            .then(() => ({ channel: 'WhatsApp', ok: true }))
                            .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailInvoice({ email, invoiceId: invNo })
                            .then(() => ({ channel: 'Email', ok: true }))
                            .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗'}`).join(' | ');

                commsUtils.showNotification(allOk ? `Invoice ${invNo} sent! (${summary})` : `Partial result: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('invoice', customerName, ch === 'email' ? email : phone, `Invoice ${invNo} sent`, allOk ? 'success' : 'failed');

                select.value = '';
                document.getElementById('invoice-preview-container')!.classList.add('hidden');
                this.selectedInvoice = null;
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send invoice.', 'error');
                this.addLog('invoice', customerName, phone, `Failed to send invoice ${invNo}`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }

    private setupReminderSubmit() {
        const form = document.getElementById('reminder-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const select = document.getElementById('reminder-invoice-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-single-reminder') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!this.selectedReminderInvoice || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const invNo = this.selectedReminderInvoice.invoice_id;

            try {
                commsUtils.setLoading(btn, true);
                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        commsApi.sendManualReminder({ phoneNumber: formattedPhone, invoiceId: invNo })
                            .then(() => ({ channel: 'WhatsApp', ok: true }))
                            .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailReminder({ email, invoiceId: invNo })
                            .then(() => ({ channel: 'Email', ok: true }))
                            .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗'}`).join(' | ');

                commsUtils.showNotification(allOk ? `Reminder sent! (${summary})` : `Partial result: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('reminder', customerName, ch === 'email' ? email : phone, `Reminder for ${invNo} sent`, allOk ? 'success' : 'failed');

                select.value = '';
                document.getElementById('reminder-preview-container')!.classList.add('hidden');
                this.selectedReminderInvoice = null;

                // Refresh stats
                this.loadReminderStats();
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send reminder.', 'error');
                this.addLog('reminder', customerName, phone, `Failed to send reminder for ${invNo}`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }


    private setupReceiptSubmit() {
        const form = document.getElementById('receipt-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const emailVal = emailInput ? emailInput.value.trim() : '';
            const select = document.getElementById('receipt-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-receipt') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!this.selectedPayment || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const payment = this.selectedPayment;
            const paymentIdStr = payment._id.substring(payment._id.length - 6).toUpperCase();

            try {
                commsUtils.setLoading(btn, true);

                // Fetch company info dynamically
                const companyInfo = (window as any).companyConfig ? await (window as any).companyConfig.getCompanyInfo() : null;

                // Extract/Construct party details
                const partyDetails = {
                    name: customerName,
                    phone: this.selectedCustomer.customer?.phone || '-',
                    gstin: this.selectedCustomer.customer?.gstin || '-',
                    email: this.selectedCustomer.customer?.email || '-',
                    address: [
                        this.selectedCustomer.customer?.billing_address?.line1,
                        this.selectedCustomer.customer?.billing_address?.line2,
                        this.selectedCustomer.customer?.billing_address?.city,
                        this.selectedCustomer.customer?.billing_address?.state,
                        this.selectedCustomer.customer?.billing_address?.pincode
                    ].filter(Boolean).join(', ') || '-'
                };

                // Build refDetails if payment is settled against an invoice
                let refDetails = null;
                if (payment.reference_id && payment.reference_type && payment.reference_type === 'Invoice') {
                    const invoice = this.customerInvoices.find(inv => inv.invoice_id === payment.reference_id || inv._id === payment.reference_id);
                    if (invoice) {
                        const total = invoice.total_amount_original || invoice.total_amount_duplicate || 0;
                        const paid = invoice.total_paid_amount || 0;
                        refDetails = {
                            id: invoice.invoice_id,
                            date: invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '-',
                            amount: total,
                            paid: paid,
                            refunded: 0,
                            balance: Math.max(total - paid, 0),
                            status: invoice.payment_status || '-'
                        };
                    }
                }

                const htmlContent = this.getReceiptHTML(payment, companyInfo, partyDetails, refDetails);

                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        fetch('/comms/send-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: formattedPhone,
                                paymentId: `Receipt-${paymentIdStr}`,
                                htmlContent,
                                documentType: 'payment receipt',
                                partyName: partyDetails.name,
                                amount: payment.amount,
                                date: payment.payment_date
                            })
                        })
                        .then(res => res.ok ? ({ channel: 'WhatsApp', ok: true }) : res.json().then(d => { throw new Error(d.message); }))
                        .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailPayment({
                            email: emailVal,
                            paymentId: `Receipt-${paymentIdStr}`,
                            htmlContent,
                            documentType: 'payment receipt',
                            partyName: partyDetails.name,
                            amount: payment.amount,
                            date: payment.payment_date
                        })
                        .then(() => ({ channel: 'Email', ok: true }))
                        .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗'}`).join(' | ');

                commsUtils.showNotification(allOk ? `Receipt sent! (${summary})` : `Partial: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('receipt', customerName, ch === 'email' ? emailVal : phone, `Receipt #${paymentIdStr} sent`, allOk ? 'success' : 'failed');

                select.value = '';
                document.getElementById('receipt-preview-container')!.classList.add('hidden');
                this.selectedPayment = null;
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send receipt.', 'error');
                this.addLog('receipt', customerName, phone, `Failed to send receipt`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }

    private setupVoucherSubmit() {
        const form = document.getElementById('voucher-tab-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
            const emailInput = document.getElementById('customer-email-input') as HTMLInputElement;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const emailVal = emailInput ? emailInput.value.trim() : '';
            const select = document.getElementById('voucher-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-voucher') as HTMLButtonElement;
            const ch = this.activeChannel;

            if (!this.selectedVoucher || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const voucher = this.selectedVoucher;
            const voucherNo = voucher.voucherNumber;

            try {
                commsUtils.setLoading(btn, true);

                // Fetch company info dynamically or use config
                const configRes = await fetch('/api/settings/company-info');
                const configData = await configRes.json();
                const companyInfo = configRes.ok ? configData.company : {
                    name: 'SHRESHT SYSTEMS',
                    address: 'Company Address',
                    phone: '0000000000',
                    email: 'email@company.com'
                };

                const htmlContent = this.generateVoucherPrintHTML(voucher, companyInfo);

                const promises: Promise<any>[] = [];

                if (ch === 'whatsapp' || ch === 'both') {
                    promises.push(
                        fetch('/comms/send-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: formattedPhone,
                                paymentId: `Voucher-${voucherNo}`,
                                htmlContent,
                                documentType: 'payment voucher',
                                partyName: voucher.partyName,
                                amount: voucher.amount,
                                date: voucher.date
                            })
                        })
                        .then(res => res.ok ? ({ channel: 'WhatsApp', ok: true }) : res.json().then(d => { throw new Error(d.message); }))
                        .catch((err: any) => ({ channel: 'WhatsApp', ok: false, err: err.message }))
                    );
                }
                if (ch === 'email' || ch === 'both') {
                    promises.push(
                        commsApi.sendEmailPayment({
                            email: emailVal,
                            paymentId: `Voucher-${voucherNo}`,
                            htmlContent,
                            documentType: 'payment voucher',
                            partyName: voucher.partyName,
                            amount: voucher.amount,
                            date: voucher.date
                        })
                        .then(() => ({ channel: 'Email', ok: true }))
                        .catch((err: any) => ({ channel: 'Email', ok: false, err: err.message }))
                    );
                }

                const results = await Promise.all(promises);
                const allOk = results.every(r => r.ok);
                const summary = results.map(r => `${r.channel}: ${r.ok ? '✓' : '✗'}`).join(' | ');

                commsUtils.showNotification(allOk ? `Voucher sent! (${summary})` : `Partial: ${summary}`, allOk ? 'success' : 'warning');
                this.addLog('voucher', customerName, ch === 'email' ? emailVal : phone, `Voucher ${voucherNo} sent`, allOk ? 'success' : 'failed');

                select.value = '';
                document.getElementById('voucher-preview-container')!.classList.add('hidden');
                this.selectedVoucher = null;
            } catch (err: any) {
                commsUtils.showNotification(err.message || 'Failed to send voucher.', 'error');
                this.addLog('voucher', customerName, phone, `Failed to send voucher ${voucherNo}`, 'failed');
            } finally {
                commsUtils.setLoading(btn, false);
                this.updateFormFieldsDisabledState();
            }
        });
    }

    private getTransactionTypeLabel(p: any): string {
        if (p.is_refund) {
            return p.direction === 'IN' ? 'Refund Received' : 'Refund Issued';
        }
        if (p.is_advance) {
            return p.direction === 'IN' ? 'Advance Received' : 'Advance Paid';
        }
        return p.direction === 'IN' ? 'Payment Received' : 'Payment Sent';
    }

    private formatCurrency(n: number): string {
        return Number(n || 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        });
    }

    private formatDate(d: any): string {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    private getReceiptHTML(
        payment: any,
        companyInfo: any = null,
        partyDetails: { name: string; phone: string; gstin: string; email: string; address: string } | null = null,
        refDetails: { id: string; date: string; amount: number; paid: number; refunded: number; balance: number; status: string } | null = null
    ): string {
        const type = this.getTransactionTypeLabel(payment);
        const amountStr = this.formatCurrency(payment.amount);
        const dateStr = this.formatDate(payment.payment_date);
        
        // Company branding fallbacks
        const company = companyInfo || {
            company_name: 'SHRESHT SYSTEMS',
            address: { line1: 'Company Address', line2: '', city: '', state: '', pincode: '', country: 'India' },
            phone: { ph1: '0000000000', ph2: '' },
            email: 'email@company.com',
            website: 'www.company.com',
            gstin: 'GSTIN Number'
        };
        const companyName = (company.company_name || 'SHRESHT SYSTEMS').toUpperCase();
        const companyAddress = typeof company.address === 'string'
            ? company.address
            : [company.address?.line1, company.address?.line2, company.address?.city, company.address?.state ? company.address.state + (company.address.pincode ? ' - ' + company.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
        const companyPhone = company.phone ? `${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}` : '';
        
        // Status resolution
        let statusLabel = 'PAID';
        let statusBadgeClass = 'badge-paid';
        if (payment.is_refund) {
            statusLabel = 'REFUND';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_already_refunded) {
            statusLabel = 'REFUNDED';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_advance) {
            statusLabel = 'ADVANCE';
            statusBadgeClass = 'badge-partial'; // amber
        } else if (payment.status) {
            const statusLower = payment.status.toLowerCase();
            if (statusLower === 'partially paid' || statusLower === 'partial') {
                statusLabel = 'PARTIALLY PAID';
                statusBadgeClass = 'badge-partial';
            } else if (statusLower === 'pending') {
                statusLabel = 'PENDING';
                statusBadgeClass = 'badge-pending';
            }
        }

        // Amount in Words
        const numToWords = (window as any).numberToWords;
        const amountInWords = numToWords ? `${numToWords(payment.amount)} Rupees Only` : '';

        // Mode badge class
        let modeBadgeClass = 'mode-cash';
        const modeVal = payment.mode || 'Cash';
        if (modeVal === 'UPI') modeBadgeClass = 'mode-upi';
        else if (modeVal === 'Bank Transfer') modeBadgeClass = 'mode-bank';
        else if (modeVal === 'Cheque') modeBadgeClass = 'mode-cheque';

        // Party fields
        const partyName = partyDetails?.name || payment.party_name || '-';
        const partyPhone = partyDetails?.phone || '-';
        const partyGstin = partyDetails?.gstin || '-';
        const partyEmail = partyDetails?.email || '-';
        const partyAddress = partyDetails?.address || '-';

        // Settlement table
        let settlementHTML = '';
        if (refDetails && payment.reference_type === 'Invoice') {
            const outstanding = refDetails.balance;
            const isSettled = outstanding <= 0;
            const settlementStatusLabel = isSettled ? 'FULLY SETTLED' : 'OUTSTANDING';
            const settlementStatusClass = isSettled ? 'status-badge badge-paid' : 'status-badge badge-partial';
            
            settlementHTML = `
                <div class="settlement-card">
                    <div class="card-title">Invoice Settlement Summary</div>
                    <table class="settlement-table">
                        <thead>
                            <tr>
                                <th>Invoice Number</th>
                                <th class="amount-col">Invoice Amount</th>
                                <th class="amount-col">Amount Paid</th>
                                <th class="amount-col">Balance Amount</th>
                                <th style="text-align: center; width: 140px;">Settlement Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="strong">${refDetails.id}</td>
                                <td class="amount-col">₹&nbsp;${this.formatCurrency(refDetails.amount).replace('₹', '').trim()}</td>
                                <td class="amount-col">₹&nbsp;${this.formatCurrency(refDetails.paid).replace('₹', '').trim()}</td>
                                <td class="amount-col strong">₹&nbsp;${this.formatCurrency(outstanding).replace('₹', '').trim()}</td>
                                <td style="text-align: center;">
                                    <span class="${settlementStatusClass}" style="padding: 3px 10px; font-size: 9px;">${settlementStatusLabel}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        const printTimeStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <html>
            <head>
                <title>Payment Receipt - ${payment._id}</title>
                <style>
                    body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #1e293b;
                        background-color: #ffffff;
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    h1, h2, h3, p { margin: 0; }
                    .receipt-container {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        background: #ffffff;
                    }
                    .header-section {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 25px;
                        margin-bottom: 30px;
                    }
                    .company-logo-area {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }
                    .company-logo-placeholder {
                        width: 48px;
                        height: 48px;
                        background: #2563eb;
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 900;
                        border-radius: 8px;
                        font-size: 20px;
                    }
                    .company-title {
                        font-size: 22px;
                        font-weight: 800;
                        color: #0f172a;
                        letter-spacing: -0.5px;
                        line-height: 1.2;
                    }
                    .company-subtitle {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 3px;
                    }
                    .receipt-meta {
                        text-align: right;
                    }
                    .meta-badge {
                        display: inline-block;
                        padding: 6px 14px;
                        font-size: 11px;
                        font-weight: 700;
                        border-radius: 6px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 12px;
                    }
                    .badge-paid { background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                    .badge-refunded { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
                    .badge-partial { background-color: #fffbeb; color: #92400e; border: 1px solid #fef3c7; }
                    .badge-pending { background-color: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
                    .meta-row {
                        font-size: 12px;
                        color: #475569;
                        margin-bottom: 4px;
                    }
                    .meta-row span {
                        font-weight: 600;
                        color: #0f172a;
                    }
                    .address-block {
                        display: grid;
                        grid-template-cols: 1fr 1fr;
                        gap: 40px;
                        margin-bottom: 35px;
                    }
                    .address-card {
                        background-color: #f8fafc;
                        border-radius: 8px;
                        padding: 16px;
                        border: 1px solid #f1f5f9;
                    }
                    .address-title {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                        margin-bottom: 8px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 6px;
                    }
                    .address-name {
                        font-size: 14px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-bottom: 4px;
                    }
                    .address-text {
                        font-size: 12px;
                        color: #475569;
                        line-height: 1.4;
                    }
                    .payment-details-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .payment-details-table th {
                        background-color: #f1f5f9;
                        color: #475569;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        text-align: left;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .payment-details-table td {
                        padding: 16px;
                        font-size: 13px;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .payment-details-table td.strong {
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .mode-badge {
                        display: inline-block;
                        padding: 4px 10px;
                        font-size: 11px;
                        font-weight: 600;
                        border-radius: 4px;
                        text-transform: uppercase;
                    }
                    .mode-cash { background-color: #ecfdf5; color: #047857; }
                    .mode-upi { background-color: #eff6ff; color: #1d4ed8; }
                    .mode-bank { background-color: #f5f3ff; color: #6d28d9; }
                    .mode-cheque { background-color: #fff7ed; color: #c2410c; }
                    .amount-summary-section {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 20px 24px;
                        margin-bottom: 35px;
                    }
                    .words-block {
                        max-width: 60%;
                    }
                    .words-label {
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 4px;
                    }
                    .words-value {
                        font-size: 12px;
                        font-weight: 600;
                        color: #334155;
                        font-style: italic;
                    }
                    .amount-display-box {
                        text-align: right;
                    }
                    .amount-label {
                        font-size: 11px;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }
                    .amount-value {
                        font-size: 24px;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .settlement-card {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 40px;
                    }
                    .settlement-card .card-title {
                        font-size: 13px;
                        font-weight: 700;
                        color: #334155;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .settlement-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .settlement-table th {
                        font-size: 10px;
                        color: #64748b;
                        font-weight: 700;
                        text-transform: uppercase;
                        padding: 8px 12px;
                        border-bottom: 1px solid #e2e8f0;
                        background: #f8fafc;
                        text-align: left;
                    }
                    .settlement-table td {
                        padding: 12px;
                        font-size: 12px;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .settlement-table th.amount-col,
                    .settlement-table td.amount-col {
                        text-align: right;
                    }
                    .settlement-table td.strong {
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 3px 8px;
                        font-size: 10px;
                        font-weight: 700;
                        border-radius: 4px;
                        text-transform: uppercase;
                    }
                    .sig-section {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 60px;
                        font-size: 12px;
                        color: #64748b;
                        padding: 0 10px;
                    }
                    .sig-box {
                        text-align: center;
                        width: 200px;
                    }
                    .sig-line {
                        border-bottom: 1px solid #cbd5e1;
                        margin-bottom: 8px;
                        height: 40px;
                    }
                    .footer-note {
                        text-align: center;
                        font-size: 11px;
                        color: #94a3b8;
                        margin-top: 50px;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 15px;
                    }
                    @media print {
                        body { background: #fff; }
                        .receipt-container { padding: 0; max-width: 100%; }
                        .address-card { background: #fff; border: 1px solid #cbd5e1; }
                        .amount-summary-section { background: #fff; border: 1px solid #cbd5e1; }
                        .settlement-card { background: #fff; border: 1px solid #cbd5e1; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header-section">
                        <div class="company-logo-area">
                            <div class="company-logo-placeholder">S</div>
                            <div>
                                <div class="company-title">${companyName}</div>
                                <div class="company-subtitle">Professional Engineering Services & Systems</div>
                            </div>
                        </div>
                        <div class="receipt-meta">
                            <div class="meta-badge ${statusBadgeClass}">${statusLabel}</div>
                            <div class="meta-row">Receipt ID: <span>#${payment._id.substring(payment._id.length - 6).toUpperCase()}</span></div>
                            <div class="meta-row">Date: <span>${dateStr}</span></div>
                        </div>
                    </div>
                    
                    <div class="address-block">
                        <div class="address-card">
                            <div class="address-title">From (Company)</div>
                            <div class="address-name">${companyName}</div>
                            <div class="address-text">
                                ${companyAddress}<br>
                                Phone: ${companyPhone}<br>
                                Email: ${company.email || ''}<br>
                                GSTIN: ${company.gstin || '-'}
                            </div>
                        </div>
                        <div class="address-card">
                            <div class="address-title">Received From (Client)</div>
                            <div class="address-name">${partyName}</div>
                            <div class="address-text">
                                ${partyAddress}<br>
                                Phone: ${partyPhone}<br>
                                Email: ${partyEmail}<br>
                                GSTIN: ${partyGstin}
                            </div>
                        </div>
                    </div>
                    
                    <table class="payment-details-table">
                        <thead>
                            <tr>
                                <th>Transaction Type</th>
                                <th>Payment Method</th>
                                <th>Reference Type</th>
                                <th>Reference Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="strong">${type}</td>
                                <td>
                                    <span class="mode-badge ${modeBadgeClass}">${modeVal}</span>
                                </td>
                                <td>${payment.reference_type || 'Advance / General'}</td>
                                <td class="strong">${payment.reference_id || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="amount-summary-section">
                        <div class="words-block">
                            <div class="words-label">Amount In Words</div>
                            <div class="words-value">${amountInWords || 'Rupees ' + amountStr}</div>
                        </div>
                        <div class="amount-display-box">
                            <div class="amount-label">Total Amount Paid</div>
                            <div class="amount-value">${amountStr}</div>
                        </div>
                    </div>
                    
                    ${settlementHTML}
                    
                    <div class="sig-section">
                        <div class="sig-box">
                            <div class="sig-line"></div>
                            Authorized Signatory
                        </div>
                        <div class="sig-box">
                            <div class="sig-line"></div>
                            Client Signature
                        </div>
                    </div>
                    
                    <div class="footer-note">
                        This is a computer-generated payment receipt and does not require a physical signature.<br>
                        Printed on ${printTimeStr}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private generateVoucherPrintHTML(v: any, c: any): string {
        const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        const formatIndian = (n: any) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let methodDetails = v.paymentMethod;
        if (v.paymentMethod === 'Cheque') {
            methodDetails += ` (Cheque No: ${v.chequeNumber || '-'}, Bank: ${v.bankName || '-'}, Date: ${formatDate(v.chequeDate)})`;
        } else if (v.paymentMethod === 'Bank Transfer') {
            methodDetails += ` (Bank: ${v.bankName || '-'}, Ref: ${v.referenceNumber || '-'})`;
        } else if (v.paymentMethod === 'UPI') {
            methodDetails += ` (UPI Ref: ${v.referenceNumber || '-'})`;
        }

        const companyName = (c.company_name || c.name || 'SHRESHT SYSTEMS').toUpperCase();
        const companyAddress = typeof c.address === 'string'
            ? c.address
            : [c.address?.line1, c.address?.line2, c.address?.city, c.address?.state ? c.address.state + (c.address.pincode ? ' - ' + c.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
        const companyPhone = c.phone ? (typeof c.phone === 'string' ? c.phone : `${c.phone.ph1 || ''}${c.phone.ph2 ? ' / ' + c.phone.ph2 : ''}`) : '';
        const companyGstin = c.gstin || '';
        const companyEmail = c.email || '';
        const companyWebsite = c.website || '';

        let modeBadgeClass = 'mode-cash';
        const methodLower = (v.paymentMethod || '').toLowerCase();
        if (methodLower === 'cash') {
            modeBadgeClass = 'mode-cash';
        } else if (methodLower === 'upi') {
            modeBadgeClass = 'mode-upi';
        } else if (methodLower === 'bank transfer' || methodLower === 'bank') {
            modeBadgeClass = 'mode-bank';
        } else if (methodLower === 'cheque') {
            modeBadgeClass = 'mode-cheque';
        }

        const printTimeStr = new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return `
        <html>
        <head>
            <title>Payment Voucher - ${v.voucherNumber}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: #fff; margin: 0; }
                .voucher-container {
                    border: 1px solid #e2e8f0;
                    padding: 30px;
                    max-width: 800px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                
                /* Exact Brand Navy Header Banner styles */
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 30px;
                    margin-bottom: 24px;
                    background: #1a365d;
                    border-radius: 12px;
                    color: #ffffff;
                    border: none;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    box-sizing: border-box;
                }
                .quotation-brand {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .logo {
                    width: 80px;
                    height: 80px;
                    background: #ffffff;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;
                }
                .logo img {
                    width: 50px;
                    height: 50px;
                    object-fit: contain;
                }
                .quotation-brand-text h1 {
                    margin: 0;
                    color: #ffffff;
                    font-size: 26px;
                    letter-spacing: -0.5px;
                    font-weight: 800;
                    line-height: 1.1;
                }
                .quotation-tagline {
                    margin: 4px 0 0 0;
                    color: #e2e8f0;
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .company-details {
                    text-align: right;
                    line-height: 1.6;
                }
                .company-details p {
                    margin: 0;
                    color: #f1f5f9;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                /* Title & Badge Row */
                .receipt-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                .receipt-title-box h2 { font-size: 24px; font-weight: 800; color: #1e3a66; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; }
                .receipt-meta { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
                .receipt-meta span { color: #1e293b; font-weight: 600; }
                
                /* Two-Column Grid */
                .info-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; margin-bottom: 24px; }
                .info-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
                .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
                
                /* Customer Info */
                .party-details { font-size: 12px; line-height: 1.6; }
                .party-name { font-size: 14px; font-weight: 700; color: #1e3a66; margin-bottom: 4px; }
                .party-info-row { display: flex; margin-top: 4px; }
                .party-info-label { color: #64748b; width: 60px; flex-shrink: 0; font-weight: 600; }
                .party-info-value { color: #1e293b; font-weight: 550; }
                
                /* Amount Box */
                .amount-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                .amount-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
                .amount-value { font-size: 30px; font-weight: 950; color: #1e3a66; letter-spacing: -0.5px; }
                .amount-words-box { font-size: 10px; color: #64748b; font-style: italic; font-weight: 600; margin-top: 6px; max-width: 100%; text-transform: capitalize; }
                
                /* Details Grid */
                .details-grid-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 12px; }
                .detail-row { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #f8fafc; padding-bottom: 6px; }
                .detail-label { color: #64748b; font-weight: 600; }
                .detail-value { color: #1e293b; font-weight: 600; text-align: right; }
                
                /* Mode Badges */
                .mode-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; }
                .mode-cash { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                .mode-upi { background-color: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
                .mode-bank { background-color: #faf5ff; color: #7c3aed; border: 1px solid #e9d5ff; }
                .mode-cheque { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                
                /* Signature styling */
                .signature-row { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; font-weight: bold; border-top: 1px solid #f1f5f9; padding-top: 24px; }
                .sig-col { width: 40%; text-align: center; }
                .sig-line { border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; height: 30px; }
                
                /* Footer */
                .footer-note { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 500; }
                
                @media print {
                    body { padding: 0; }
                    .voucher-container {
                        border: none;
                        box-shadow: none;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="voucher-container">
                <!-- Brand Navy Header (Exact Invoice Style) -->
                <div class="header">
                    <div class="quotation-brand">
                        <div class="logo">
                            <img src="../assets/icon.png" alt="SSMS Logo">
                        </div>
                        <div class="quotation-brand-text">
                            <h1>${companyName}</h1>
                            <p class="quotation-tagline">CCTV & Energy Solutions</p>
                        </div>
                    </div>
                    <div class="company-details">
                        <p>${companyAddress}</p>
                        <p>Ph: ${companyPhone}</p>
                        <p>GSTIN: ${companyGstin}</p>
                        <p>Email: ${companyEmail}</p>
                        <p>Website: ${companyWebsite}</p>
                    </div>
                </div>

                <!-- Title row -->
                <div class="receipt-header-row">
                    <div class="receipt-title-box">
                        <h2>Payment Voucher</h2>
                        <div class="receipt-meta">
                            Voucher No: <span>${v.voucherNumber}</span> &nbsp;|&nbsp; 
                            Date: <span>${formatDate(v.date)}</span>
                        </div>
                    </div>
                </div>

                <!-- Two Column Section (Party & Amount) -->
                <div class="info-grid">
                    <div class="info-card">
                        <div class="card-title">Paid To (Payee)</div>
                        <div class="party-details">
                            <div class="party-name">${v.partyName}</div>
                            <div class="party-info-row">
                                <span class="party-info-label">Type:</span>
                                <span class="party-info-value">${v.partyType || '-'}</span>
                            </div>
                            ${v.partyPhone ? `
                            <div class="party-info-row">
                                <span class="party-info-label">Phone:</span>
                                <span class="party-info-value">${v.partyPhone}</span>
                            </div>
                            ` : ''}
                            ${v.partyAddress ? `
                            <div class="party-info-row">
                                <span class="party-info-label">Address:</span>
                                <span class="party-info-value">${v.partyAddress}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="amount-card">
                        <div class="amount-title">Amount Paid</div>
                        <div class="amount-value">₹ ${formatIndian(v.amount)}</div>
                        ${v.amountInWords ? `<div class="amount-words-box">${v.amountInWords}</div>` : ''}
                    </div>
                </div>

                <!-- Transaction Details Grid Card -->
                <div class="details-grid-card">
                    <div class="card-title">Voucher Details</div>
                    <div class="details-grid">
                        <div class="detail-row">
                            <span class="detail-label">Voucher Number:</span>
                            <span class="detail-value">${v.voucherNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Voucher Date:</span>
                            <span class="detail-value">${formatDate(v.date)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Mode:</span>
                            <span class="detail-value">
                                <span class="mode-badge ${modeBadgeClass}">${v.paymentMethod}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Details:</span>
                            <span class="detail-value">${methodDetails}</span>
                        </div>
                        <div class="detail-row" style="grid-column: span 2; border-bottom: none;">
                            <span class="detail-label">Paid Towards:</span>
                            <span class="detail-value" style="text-align: left; font-weight: 500; white-space: pre-wrap;">${v.paidTowards || '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- Signature Row -->
                <div class="signature-row">
                    <div class="sig-col">
                        <div class="sig-line"></div>
                        Paid By
                    </div>
                    <div class="sig-col">
                        <div class="sig-line"></div>
                        Receiver Signature
                    </div>
                </div>

                <!-- Footer Note -->
                <div class="footer-note">
                    This voucher confirms successful payout of cash or bank funds. Generated by SSMS ERP on ${printTimeStr}.
                </div>
            </div>
        </body>
        </html>`;
    }

    private hidePreviews() {
        const qContainer = document.getElementById('quotation-preview-container');
        const iContainer = document.getElementById('invoice-preview-container');
        const rContainer = document.getElementById('reminder-preview-container');
        const recContainer = document.getElementById('receipt-preview-container');
        const vContainer = document.getElementById('voucher-preview-container');

        if (qContainer) qContainer.classList.add('hidden');
        if (iContainer) iContainer.classList.add('hidden');
        if (rContainer) rContainer.classList.add('hidden');
        if (recContainer) recContainer.classList.add('hidden');
        if (vContainer) vContainer.classList.add('hidden');
    }

    private getRecentLogs(): any[] {
        const data = localStorage.getItem('comms_activity');
        if (data) {
            try {
                const logs = JSON.parse(data);
                if (Array.isArray(logs)) {
                    const cleanLogs = logs.filter(log => {
                        const rec = (log.recipient || '').toLowerCase();
                        const det = (log.details || '').toLowerCase();
                        return !rec.includes('ravi kumar') && 
                               !rec.includes('abc industries') && 
                               !rec.includes('919876543210') && 
                               !rec.includes('918045678901') &&
                               !det.includes('inv001') &&
                               !det.includes('quo004');
                    });
                    if (cleanLogs.length !== logs.length) {
                        localStorage.setItem('comms_activity', JSON.stringify(cleanLogs));
                    }
                    return cleanLogs;
                }
                return [];
            } catch {
                return [];
            }
        }
        return [];
    }

    private addLog(type: string, recipientName: string, recipientPhone: string, details: string, status: 'success' | 'failed') {
        const logs = this.getRecentLogs();
        const formattedPhone = recipientPhone ? ` (${commsUtils.formatPhoneNumber(recipientPhone)})` : '';
        const newLog = {
            type,
            recipient: `${recipientName}${formattedPhone}`,
            timestamp: new Date().toISOString(),
            details,
            status
        };
        logs.unshift(newLog);
        
        const cappedLogs = logs.slice(0, 20);
        localStorage.setItem('comms_activity', JSON.stringify(cappedLogs));
        this.renderRecentLogs();
    }

    private renderRecentLogs() {
        const tbody = document.getElementById('recent-comms-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const logs = this.getRecentLogs();

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-3 text-center text-slate-400 text-xs">No recent activity</td></tr>`;
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0';

            const typeBadge = 
                log.type === 'message' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"><i class="fas fa-comment-alt text-[10px]"></i>Message</span>` :
                log.type === 'quotation' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"><i class="fas fa-file-alt text-[10px]"></i>Quotation</span>` :
                log.type === 'invoice' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"><i class="fas fa-file-invoice-dollar text-[10px]"></i>Invoice</span>` :
                log.type === 'receipt' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><i class="fas fa-receipt text-[10px]"></i>Receipt</span>` :
                log.type === 'voucher' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100"><i class="fas fa-ticket-alt text-[10px]"></i>Voucher</span>` :
                `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"><i class="fas fa-bell text-[10px]"></i>Reminder</span>`;

            const statusBadge = log.status === 'success' ? 
                `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100"><i class="fas fa-check-circle text-[10px]"></i>Sent</span>` :
                `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100"><i class="fas fa-exclamation-circle text-[10px]"></i>Failed</span>`;

            const dateText = new Date(log.timestamp).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            tr.innerHTML = `
                <td class="px-4 py-3">${typeBadge}</td>
                <td class="px-4 py-3 font-medium text-slate-700 text-xs">${log.recipient}</td>
                <td class="px-4 py-3 text-slate-500 text-xs">${dateText}</td>
                <td class="px-4 py-3 text-slate-600 text-xs">${log.details}</td>
                <td class="px-4 py-3">${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    private setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.altKey) {
                const key = e.key.toLowerCase();
                if (key === 'm') {
                    e.preventDefault();
                    this.switchTab('message');
                    setTimeout(() => {
                        document.getElementById('message-content-input')?.focus();
                    }, 50);
                } else if (key === 'q') {
                    e.preventDefault();
                    this.switchTab('quotation');
                    setTimeout(() => {
                        document.getElementById('quotation-select')?.focus();
                    }, 50);
                } else if (key === 'i') {
                    e.preventDefault();
                    this.switchTab('invoice');
                    setTimeout(() => {
                        document.getElementById('invoice-select')?.focus();
                    }, 50);
                } else if (key === 'r') {
                    e.preventDefault();
                    this.switchTab('reminder');
                    setTimeout(() => {
                        document.getElementById('reminder-invoice-select')?.focus();
                    }, 50);
                } else if (key === 'c') {
                    e.preventDefault();
                    this.switchTab('receipt');
                    setTimeout(() => {
                        document.getElementById('receipt-select')?.focus();
                    }, 50);
                } else if (key === 'v') {
                    e.preventDefault();
                    this.switchTab('voucher');
                    setTimeout(() => {
                        document.getElementById('voucher-select')?.focus();
                    }, 50);
                } else if (key === 'f') {
                    e.preventDefault();
                    document.getElementById('customer-search-input')?.focus();
                } else if (key === 'p') {
                    e.preventDefault();
                    document.getElementById('customer-phone-input')?.focus();
                }
            }

            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.submitActiveTabForm();
            }
        });
    }

    private switchTab(tabName: string) {
        const tabsContainer = document.getElementById('action-tabs');
        if (!tabsContainer) return;
        const tabButton = tabsContainer.querySelector(`button[data-tab="${tabName}"]`) as HTMLButtonElement;
        if (tabButton) {
            tabButton.click();
        }
    }

    private submitActiveTabForm() {
        if (this.activeTab === 'message') {
            const form = document.getElementById('message-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-message')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        } else if (this.activeTab === 'quotation') {
            const form = document.getElementById('quotation-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-quotation')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        } else if (this.activeTab === 'invoice') {
            const form = document.getElementById('invoice-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-invoice')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        } else if (this.activeTab === 'reminder') {
            const form = document.getElementById('reminder-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-single-reminder')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        } else if (this.activeTab === 'receipt') {
            const form = document.getElementById('receipt-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-receipt')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        } else if (this.activeTab === 'voucher') {
            const form = document.getElementById('voucher-tab-form') as HTMLFormElement;
            if (form && !document.getElementById('btn-send-voucher')?.hasAttribute('disabled')) {
                form.requestSubmit();
            }
        }
    }
}

(window as any).commsForms = new CommsForms();
