/**
 * Comms Module Forms Logic - Redesigned Tabbed Action Center
 */

declare var commsUtils: any;
declare var commsApi: any;

class CommsForms {
    private activeTab: string = 'message';
    private selectedCustomer: any = null;
    private customerQuotations: any[] = [];
    private customerInvoices: any[] = [];
    private selectedQuotation: any = null;
    private selectedInvoice: any = null;
    private selectedReminderInvoice: any = null;
    private allInvoices: any[] = [];

    init() {
        this.setupTabs();
        this.setupCustomerAutocomplete();
        this.setupQuotationSelectListener();
        this.setupInvoiceSelectListener();
        this.setupReminderInvoiceSelectListener();
        this.setupMessageCharCounter();
        this.setupMessageSubmit();
        this.setupQuotationSubmit();
        this.setupInvoiceSubmit();
        this.setupReminderSubmit();
        
        // Initial setup
        this.renderRecentLogs();
        this.loadReminderStats();
    }

    private setupTabs() {
        const tabsContainer = document.getElementById('action-tabs');
        if (!tabsContainer) return;

        const tabs = tabsContainer.querySelectorAll('button');
        tabs.forEach(tab => {
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
        });
    }

    private setupCustomerAutocomplete() {
        const input = document.getElementById('customer-search-input') as HTMLInputElement;
        const suggestionsList = document.getElementById('customer-search-suggestions') as HTMLUListElement;
        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
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

    private async selectCustomer(customer: any) {
        this.selectedCustomer = customer;
        const input = document.getElementById('customer-search-input') as HTMLInputElement;
        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        const suggestionsList = document.getElementById('customer-search-suggestions') as HTMLUListElement;

        const name = customer.customer?.name || `${customer.customer?.first_name || ''} ${customer.customer?.last_name || ''}`.trim();
        if (input) input.value = name;
        if (phoneInput) phoneInput.value = customer.customer?.phone || '';
        if (suggestionsList) {
            suggestionsList.style.display = 'none';
            suggestionsList.innerHTML = '';
        }

        // Load customer documents
        try {
            const data = await commsApi.getCustomerDetails(customer._id);
            this.customerQuotations = data.quotations || [];
            this.customerInvoices = data.invoices || [];

            // Populate selectors
            this.populateQuotationSelect();
            this.populateInvoiceSelect();
            this.populateReminderInvoiceSelect();

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
        this.selectedQuotation = null;
        this.selectedInvoice = null;
        this.selectedReminderInvoice = null;

        const phoneInput = document.getElementById('customer-phone-input') as HTMLInputElement;
        if (phoneInput) phoneInput.value = '';

        this.populateQuotationSelect();
        this.populateInvoiceSelect();
        this.populateReminderInvoiceSelect();
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
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const hasCustomer = !!this.selectedCustomer && commsUtils.validatePhone(phone);

        // Message submit
        const msgTextarea = document.getElementById('message-content-input') as HTMLTextAreaElement;
        const msgText = msgTextarea ? msgTextarea.value.trim() : '';
        const btnMsg = document.getElementById('btn-send-message') as HTMLButtonElement;
        if (btnMsg) {
            btnMsg.disabled = !hasCustomer || !msgText || msgText.length > 1000;
        }

        // Quotation submit
        const btnQuo = document.getElementById('btn-send-quotation') as HTMLButtonElement;
        if (btnQuo) {
            btnQuo.disabled = !hasCustomer || !this.selectedQuotation;
        }

        // Invoice submit
        const btnInv = document.getElementById('btn-send-invoice') as HTMLButtonElement;
        if (btnInv) {
            btnInv.disabled = !hasCustomer || !this.selectedInvoice;
        }

        // Single reminder submit
        const btnRem = document.getElementById('btn-send-single-reminder') as HTMLButtonElement;
        if (btnRem) {
            btnRem.disabled = !hasCustomer || !this.selectedReminderInvoice;
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
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const contentInput = document.getElementById('message-content-input') as HTMLTextAreaElement;
            const content = contentInput.value.trim();
            const btn = document.getElementById('btn-send-message') as HTMLButtonElement;

            if (!phone || !content || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();

            try {
                commsUtils.setLoading(btn, true);
                const res = await commsApi.sendMessage({
                    phoneNumber: formattedPhone,
                    message: content
                });

                commsUtils.showNotification(res.message || 'Message sent successfully!', 'success');
                this.addLog('message', customerName, phone, `Sent: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`, 'success');
                
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
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const select = document.getElementById('quotation-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-quotation') as HTMLButtonElement;

            if (!phone || !this.selectedQuotation || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const quoNo = this.selectedQuotation.quotation_no;

            try {
                commsUtils.setLoading(btn, true);
                const res = await commsApi.sendQuotation({
                    phone: formattedPhone,
                    quotationId: quoNo
                });

                commsUtils.showNotification(res.message || 'Quotation sent successfully!', 'success');
                this.addLog('quotation', customerName, phone, `Quotation ${quoNo} shared`, 'success');
                
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
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const select = document.getElementById('invoice-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-invoice') as HTMLButtonElement;

            if (!phone || !this.selectedInvoice || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const invNo = this.selectedInvoice.invoice_id;

            try {
                commsUtils.setLoading(btn, true);
                const res = await commsApi.sendInvoice({
                    phone: formattedPhone,
                    invoiceId: invNo
                });

                commsUtils.showNotification(res.message || 'Invoice sent successfully!', 'success');
                this.addLog('invoice', customerName, phone, `Invoice ${invNo} sent`, 'success');
                
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
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const select = document.getElementById('reminder-invoice-select') as HTMLSelectElement;
            const btn = document.getElementById('btn-send-single-reminder') as HTMLButtonElement;

            if (!phone || !this.selectedReminderInvoice || !this.selectedCustomer) return;

            const formattedPhone = commsUtils.formatPhoneNumber(phone);
            const customerName = this.selectedCustomer.customer?.name || `${this.selectedCustomer.customer?.first_name || ''} ${this.selectedCustomer.customer?.last_name || ''}`.trim();
            const invNo = this.selectedReminderInvoice.invoice_id;

            try {
                commsUtils.setLoading(btn, true);
                const res = await commsApi.sendManualReminder({
                    phoneNumber: formattedPhone,
                    invoiceId: invNo
                });

                commsUtils.showNotification(res.message || 'Payment reminder sent successfully!', 'success');
                this.addLog('reminder', customerName, phone, `Reminder for ${invNo} sent`, 'success');
                
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

    private hidePreviews() {
        const qContainer = document.getElementById('quotation-preview-container');
        const iContainer = document.getElementById('invoice-preview-container');
        const rContainer = document.getElementById('reminder-preview-container');

        if (qContainer) qContainer.classList.add('hidden');
        if (iContainer) iContainer.classList.add('hidden');
        if (rContainer) rContainer.classList.add('hidden');
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
}

(window as any).commsForms = new CommsForms();
