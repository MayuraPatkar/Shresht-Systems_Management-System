/**
 * Service Module Form and Items Component
 */

declare function showToast(message: string, type?: 'success' | 'error'): void;

(function () {
    // Shared Globals/Helpers
    const serviceApi = (window as any).serviceApi;
    const updateURL = (window as any).updateURL;
    const navigateTo = (window as any).navigateTo;
    const escapeHtml = (window as any).escapeHtml || function (str: string | undefined): string {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    const getStageLabel = (window as any).getStageLabel || function (stage: number | string): string {
        const s = Number(stage) || 1;
        const suffixes = ['st', 'nd', 'rd'];
        const suffix = s <= 3 ? suffixes[s - 1] : 'th';
        return `${s}${suffix} Service`;
    };

    let itemCounter = 0;

    // Helper to format number
    function formatNumber(num: number | string): string {
        return parseFloat(String(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function showSection(sectionId: string) {
        document.querySelectorAll('.detail-section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');
    }

    // ============================================================================
    // FORM MANAGEMENT
    // ============================================================================
    function showNewForm(invoiceId: string | null = null) {
        resetForm();

        const ServiceState = (window as any).ServiceState;
        const dateInput = document.getElementById('service-date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput
                ? (window as any).getTodayForInput()
                : new Date().toISOString().split('T')[0];
        }

        ServiceState.isEditing = false;

        const titleEl = document.getElementById('form-title');
        if (titleEl) titleEl.textContent = 'New Service';

        const subtitleEl = document.getElementById('form-subtitle');
        if (subtitleEl) subtitleEl.textContent = 'Create a service entry';

        const iconEl = document.getElementById('form-icon');
        if (iconEl) {
            iconEl.className = 'w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center';
            iconEl.innerHTML = '<i class="fas fa-plus text-white text-xl"></i>';
        }

        showSection('section-form');

        // Focus first input
        const formSection = document.getElementById('section-form');
        if (formSection) {
            const firstInput = formSection.querySelector('input, select, textarea') as HTMLElement;
            if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }

        updateURL({ new: 'true', invoice: invoiceId });

        // Pre-select invoice if provided
        if (invoiceId) {
            selectInvoice(invoiceId);
            const clearInvBtn = document.getElementById('clear-invoice-btn');
            if (clearInvBtn) clearInvBtn.style.display = 'none';
        } else {
            const clearInvBtn = document.getElementById('clear-invoice-btn');
            if (clearInvBtn) clearInvBtn.style.display = '';
        }

        // Generate service ID
        generateServiceId();
    }

    async function editService(serviceId: string) {
        try {
            const ServiceState = (window as any).ServiceState;
            const service = await serviceApi.fetchServiceDetails(serviceId);

            resetForm();
            ServiceState.isEditing = true;
            ServiceState.selectedServiceId = serviceId;

            const titleEl = document.getElementById('form-title');
            if (titleEl) titleEl.textContent = 'Edit Service';

            const subtitleEl = document.getElementById('form-subtitle');
            if (subtitleEl) subtitleEl.textContent = `Editing ${serviceId}`;

            const iconEl = document.getElementById('form-icon');
            if (iconEl) {
                iconEl.className = 'w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center';
                iconEl.innerHTML = '<i class="fas fa-edit text-white text-xl"></i>';
            }

            // Populate form
            const sIdInput = document.getElementById('form-service-id') as HTMLInputElement;
            if (sIdInput) sIdInput.value = service.service_id;

            const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
            if (invIdInput) invIdInput.value = service.invoice_id;

            const stageInput = document.getElementById('form-service-stage') as HTMLInputElement;
            if (stageInput) stageInput.value = String(service.service_stage);

            const isEditInput = document.getElementById('form-is-editing') as HTMLInputElement;
            if (isEditInput) isEditInput.value = 'true';

            const dateInput = document.getElementById('service-date') as HTMLInputElement;
            if (dateInput) dateInput.value = service.service_date?.split('T')[0] || '';

            // Show selected invoice info
            selectInvoice(service.invoice_id);
            const clearInvBtn = document.getElementById('clear-invoice-btn');
            if (clearInvBtn) clearInvBtn.style.display = 'none';

            // Populate items
            if (service.items && service.items.length > 0) {
                service.items.forEach((item: any) => addItemRow(item));
            }

            // Populate charges (non-items)
            if (service.non_items && service.non_items.length > 0) {
                service.non_items.forEach((item: any) => addChargeRow(item));
            }

            updateLiveTotals();
            showSection('section-form');

        } catch (error) {
            console.error('Error loading service for edit:', error);
            showToast('Failed to load service', 'error');
        }
    }

    function resetForm() {
        const ServiceState = (window as any).ServiceState;
        const form = document.getElementById('service-form') as HTMLFormElement;
        if (form) form.reset();

        const setValue = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) el.value = val;
        };

        setValue('form-service-id', '');
        setValue('form-invoice-id', '');
        setValue('form-service-stage', '');
        setValue('form-is-editing', 'false');
        setValue('next-service-month', '');

        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) itemsContainer.innerHTML = '';

        const chargesContainer = document.getElementById('charges-container');
        if (chargesContainer) chargesContainer.innerHTML = '';

        document.getElementById('selected-invoice-info')?.classList.add('hidden');
        document.getElementById('invoice-selection-wrapper')?.classList.remove('hidden');
        const clearInvBtn = document.getElementById('clear-invoice-btn');
        if (clearInvBtn) clearInvBtn.style.display = '';

        const invSearch = document.getElementById('invoice-search') as HTMLInputElement;
        if (invSearch) invSearch.value = '';

        // Reset to step 1
        ServiceState.currentFormStep = 1;
        updateFormStep();
        updateLiveTotals();
    }

    async function generateServiceId() {
        try {
            const serviceId = await serviceApi.generateServiceId();
            const sIdInput = document.getElementById('form-service-id') as HTMLInputElement;
            if (sIdInput) sIdInput.value = serviceId;
        } catch (error) {
            console.error('Error generating service ID:', error);
        }
    }

    // ============================================================================
    // INVOICE PICKER
    // ============================================================================
    function initInvoiceSearch() {
        const searchInput = document.getElementById('invoice-search') as HTMLInputElement;
        const dropdown = document.getElementById('invoice-dropdown');
        let debounceTimer: any;

        if (!searchInput || !dropdown) return;

        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim().toLowerCase();
                if (query.length < 1) {
                    dropdown.classList.add('hidden');
                    return;
                }

                const ServiceState = (window as any).ServiceState;
                const matches = ServiceState.allInvoices.filter((inv: any) => {
                    const searchable = [inv.invoice_id, inv.customer_name, inv.project_name]
                        .filter(Boolean).join(' ').toLowerCase();
                    return searchable.includes(query);
                }).slice(0, 10);

                if (matches.length === 0) {
                    dropdown.innerHTML = '<div class="p-4 text-gray-500 text-center">No invoices found</div>';
                } else {
                    dropdown.innerHTML = matches.map((inv: any) => `
                        <div class="invoice-option" data-invoice-id="${inv.invoice_id}">
                            <div class="inv-id">${inv.invoice_id}</div>
                            <div class="inv-details">${escapeHtml(inv.customer_name || '')} • ${escapeHtml(inv.project_name || '')}</div>
                        </div>
                    `).join('');

                    // Add click handlers
                    dropdown.querySelectorAll('.invoice-option').forEach((opt: any) => {
                        opt.addEventListener('click', () => {
                            selectInvoice(opt.dataset.invoiceId);
                            dropdown.classList.add('hidden');
                        });
                    });
                }

                dropdown.classList.remove('hidden');
            }, 200);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                searchInput.dispatchEvent(new Event('input'));
            }
        });

        document.addEventListener('click', (e: any) => {
            if (!e.target.closest('#invoice-selection-wrapper')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    async function selectInvoice(invoiceId: string) {
        const ServiceState = (window as any).ServiceState;
        const invoice = ServiceState.allInvoices.find((inv: any) => inv.invoice_id === invoiceId);
        if (!invoice) {
            // Try fetching from server
            try {
                const response = await fetch(`/invoice/${invoiceId}`);
                if (!response.ok) throw new Error('Invoice not found');
                const data = await response.json();
                populateInvoiceInfo(data.invoice);
            } catch (error) {
                console.error('Error fetching invoice:', error);
                showToast('Invoice not found', 'error');
                return;
            }
        } else {
            populateInvoiceInfo(invoice);
        }
    }

    function populateInvoiceInfo(invoice: any) {
        const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
        if (invIdInput) invIdInput.value = invoice.invoice_id;

        const stageInput = document.getElementById('form-service-stage') as HTMLInputElement;
        if (stageInput) stageInput.value = String((invoice.service_stage || 0) + 1);

        const setText = (id: string, text: string) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('selected-inv-id', invoice.invoice_id);
        setText('info-customer', invoice.customer_name || '-');
        setText('info-project', invoice.project_name || '-');
        setText('info-phone', invoice.customer_phone || '-');
        setText('info-stage', getStageLabel((invoice.service_stage || 0) + 1));

        // Set the invoice's service_month as the default for next service month
        const nextMonthInput = document.getElementById('next-service-month') as HTMLInputElement;
        if (nextMonthInput) nextMonthInput.value = String(invoice.service_month || 0);

        document.getElementById('selected-invoice-info')?.classList.remove('hidden');
        document.getElementById('invoice-selection-wrapper')?.classList.add('hidden');
    }

    // ============================================================================
    // ITEMS MANAGEMENT
    // ============================================================================
    function addItemRow(data: any = {}) {
        itemCounter++;
        const container = document.getElementById('items-container');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'item-row';
        row.dataset.itemId = String(itemCounter);

        row.innerHTML = `
            <div style="position: relative; flex: 1; z-index: 10;">
                <input type="text" placeholder="Description" class="item-desc" value="${escapeHtml(data.description || '')}" style="width: 100%;">
                <ul class="suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 9999; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 200px; overflow-y: auto; margin-top: 4px; list-style: none; padding: 0;"></ul>
            </div>
            <input type="text" placeholder="HSN" class="item-hsn" value="${escapeHtml(data.HSN_SAC || '')}">
            <input type="number" placeholder="Qty" class="item-qty" value="${data.quantity || ''}" min="0.000001" step="any">
            <input type="number" placeholder="Price" class="item-price" value="${data.unit_price || ''}" min="0">
            <input type="number" placeholder="Tax%" class="item-tax" value="${data.rate || ''}" min="0" max="100">
            <button type="button" class="text-red-500 hover:text-red-700 remove-item-btn" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.appendChild(row);

        const qtyInput = row.querySelector('.item-qty') as HTMLInputElement;
        if (qtyInput) {
            qtyInput.setAttribute('step', 'any');
            qtyInput.addEventListener('keypress', function (event) {
                if (event.key === 'e' || event.key === 'E' || event.key === '-' || event.key === '+') event.preventDefault();
            });
            qtyInput.addEventListener('input', function () {
                let sanitized = qtyInput.value.replace(/[^0-9.]/g, '');
                const parts = sanitized.split('.');
                if (parts.length > 2) {
                    sanitized = parts[0] + '.' + parts.slice(1).join('');
                }
                if (qtyInput.value !== sanitized) qtyInput.value = sanitized;
                updateLiveTotals();
            });
        }

        // Setup autocomplete for description field
        const descInput = row.querySelector('.item-desc') as HTMLInputElement;
        const suggestionsList = row.querySelector('.suggestions') as HTMLElement;
        let selectedIndex = -1;

        if (descInput && suggestionsList) {
            descInput.addEventListener('input', function () {
                const query = descInput.value.toLowerCase().trim();
                suggestionsList.innerHTML = '';
                selectedIndex = -1;

                if (query.length === 0) {
                    suggestionsList.style.display = 'none';
                    return;
                }

                const stockItems = (window as any).stockItems || [];
                const filtered = stockItems.filter((item: string) => item.toLowerCase().includes(query));

                if (filtered.length === 0) {
                    suggestionsList.style.display = 'none';
                    return;
                }

                // Use fixed positioning to avoid overflow clipping
                const inputRect = descInput.getBoundingClientRect();
                suggestionsList.style.position = 'fixed';
                suggestionsList.style.top = (inputRect.bottom + 4) + 'px';
                suggestionsList.style.left = inputRect.left + 'px';
                suggestionsList.style.width = inputRect.width + 'px';
                suggestionsList.style.display = 'block';

                filtered.slice(0, 10).forEach((item: string, index: number) => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    li.addEventListener('click', async () => {
                        descInput.value = item;
                        suggestionsList.style.display = 'none';
                        await fillStockItemData(item, row);
                        updateLiveTotals();
                    });
                    suggestionsList.appendChild(li);
                });
            });

            descInput.addEventListener('keydown', async function (event) {
                const items = suggestionsList.querySelectorAll('li');
                if (items.length === 0) return;

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    selectedIndex = (selectedIndex + 1) % items.length;
                    updateSuggestionSelection(items, selectedIndex);
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    updateSuggestionSelection(items, selectedIndex);
                } else if (event.key === 'Enter' && selectedIndex >= 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const selectedItem = items[selectedIndex].textContent || '';
                    descInput.value = selectedItem;
                    suggestionsList.style.display = 'none';
                    await fillStockItemData(selectedItem, row);
                    updateLiveTotals();
                    selectedIndex = -1;
                } else if (event.key === 'Escape') {
                    suggestionsList.style.display = 'none';
                    selectedIndex = -1;
                }
            });

            descInput.addEventListener('blur', function () {
                // Delay hiding to allow click on suggestion
                setTimeout(() => {
                    suggestionsList.style.display = 'none';
                }, 200);
            });
        }

        // Event listeners for live totals
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateLiveTotals);
        });

        row.querySelector('.remove-item-btn')?.addEventListener('click', () => {
            row.remove();
            updateLiveTotals();
        });

        // Focus on description field for new items
        if (!data.description && descInput) {
            setTimeout(() => descInput.focus(), 50);
        }
    }

    // Update suggestion selection styling
    function updateSuggestionSelection(items: NodeListOf<HTMLLIElement>, selectedIndex: number) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    // Fetch and fill stock item data
    async function fillStockItemData(itemName: string, row: HTMLDivElement) {
        try {
            const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
            if (response.ok) {
                const stockData = await response.json();
                if (stockData) {
                    const hsnInput = row.querySelector('.item-hsn') as HTMLInputElement;
                    const priceInput = row.querySelector('.item-price') as HTMLInputElement;
                    const taxInput = row.querySelector('.item-tax') as HTMLInputElement;

                    if (hsnInput) hsnInput.value = stockData.HSN_SAC || '';
                    if (priceInput) priceInput.value = stockData.unit_price || '';
                    if (taxInput) taxInput.value = stockData.GST || '';
                }
            }
        } catch (error) {
            console.error('Error fetching stock item data:', error);
        }
    }

    function addChargeRow(data: any = {}) {
        const container = document.getElementById('charges-container');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'item-row';
        row.style.gridTemplateColumns = '1fr 100px 80px 40px';

        row.innerHTML = `
            <input type="text" placeholder="Description" class="charge-desc" value="${escapeHtml(data.description || '')}">
            <input type="number" placeholder="Amount" class="charge-amount" value="${data.price || ''}" min="0">
            <input type="number" placeholder="Tax%" class="charge-tax" value="${data.rate || ''}" min="0" max="100">
            <button type="button" class="text-red-500 hover:text-red-700 remove-charge-btn" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.appendChild(row);

        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateLiveTotals);
        });

        row.querySelector('.remove-charge-btn')?.addEventListener('click', () => {
            row.remove();
            updateLiveTotals();
        });
    }

    // ============================================================================
    // LIVE TOTALS
    // ============================================================================
    function updateLiveTotals() {
        let subtotal = 0;
        let tax = 0;

        document.querySelectorAll('#items-container .item-row').forEach(row => {
            const qty = parseFloat((row.querySelector('.item-qty') as HTMLInputElement)?.value) || 0;
            const price = parseFloat((row.querySelector('.item-price') as HTMLInputElement)?.value) || 0;
            const rate = parseFloat((row.querySelector('.item-tax') as HTMLInputElement)?.value) || 0;

            const lineTotal = qty * price;
            subtotal += lineTotal;
            tax += lineTotal * (rate / 100);
        });

        document.querySelectorAll('#charges-container .item-row').forEach(row => {
            const amount = parseFloat((row.querySelector('.charge-amount') as HTMLInputElement)?.value) || 0;
            const rate = parseFloat((row.querySelector('.charge-tax') as HTMLInputElement)?.value) || 0;

            subtotal += amount;
            tax += amount * (rate / 100);
        });

        const liveSubtotal = document.getElementById('live-subtotal');
        if (liveSubtotal) liveSubtotal.textContent = `₹ ${formatNumber(subtotal)}`;

        const liveTax = document.getElementById('live-tax');
        if (liveTax) liveTax.textContent = `₹ ${formatNumber(tax)}`;

        const liveTotal = document.getElementById('live-total');
        if (liveTotal) liveTotal.textContent = `₹ ${formatNumber(subtotal + tax)}`;
    }

    function collectFormData(): Service {
        const items: ServiceItem[] = [];
        document.querySelectorAll('#items-container .item-row').forEach(row => {
            const desc = (row.querySelector('.item-desc') as HTMLInputElement)?.value?.trim();
            if (!desc) return;

            items.push({
                description: desc,
                HSN_SAC: (row.querySelector('.item-hsn') as HTMLInputElement)?.value?.trim() || '',
                quantity: parseFloat((row.querySelector('.item-qty') as HTMLInputElement)?.value) || 0,
                unit_price: parseFloat((row.querySelector('.item-price') as HTMLInputElement)?.value) || 0,
                rate: parseFloat((row.querySelector('.item-tax') as HTMLInputElement)?.value) || 0
            });
        });

        const nonItems: ServiceNonItem[] = [];
        document.querySelectorAll('#charges-container .item-row').forEach(row => {
            const desc = (row.querySelector('.charge-desc') as HTMLInputElement)?.value?.trim();
            if (!desc) return;

            nonItems.push({
                description: desc,
                price: parseFloat((row.querySelector('.charge-amount') as HTMLInputElement)?.value) || 0,
                rate: parseFloat((row.querySelector('.charge-tax') as HTMLInputElement)?.value) || 0
            });
        });

        // Calculate totals
        let subtotal = 0;
        let tax = 0;
        items.forEach(item => {
            const lineTotal = item.quantity * item.unit_price;
            subtotal += lineTotal;
            tax += lineTotal * (item.rate / 100);
        });
        nonItems.forEach(item => {
            subtotal += item.price;
            tax += item.price * (item.rate / 100);
        });

        const sIdInput = document.getElementById('form-service-id') as HTMLInputElement;
        const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
        const dateInput = document.getElementById('service-date') as HTMLInputElement;
        const stageInput = document.getElementById('form-service-stage') as HTMLInputElement;
        const nextMonthInput = document.getElementById('next-service-month') as HTMLInputElement;

        return {
            service_id: sIdInput?.value || '',
            invoice_id: invIdInput?.value || '',
            service_date: dateInput?.value || '',
            service_stage: parseInt(stageInput?.value) || 1,
            next_service_month: parseInt(nextMonthInput?.value) || 0,
            items,
            non_items: nonItems,
            total_amount_no_tax: subtotal,
            total_tax: tax,
            total_amount_with_tax: subtotal + tax,
            notes: `Service stage ${stageInput?.value || 1} completed`,
            declaration: '',
            terms_and_conditions: ''
        };
    }

    // ============================================================================
    // FORM STEP NAVIGATION
    // ============================================================================
    function updateFormStep() {
        const ServiceState = (window as any).ServiceState;
        const step = ServiceState.currentFormStep;

        document.querySelectorAll('.form-step').forEach((el, i) => {
            el.classList.toggle('active', i + 1 === step);
        });

        const stepIndicator = document.getElementById('form-step-indicator');
        if (stepIndicator) stepIndicator.textContent = `Step ${step} of 2`;

        const prevBtn = document.getElementById('form-prev-btn') as HTMLButtonElement;
        if (prevBtn) prevBtn.disabled = step === 1;

        // Toggle buttons
        document.getElementById('form-next-btn')?.classList.toggle('hidden', step === 2);
        document.getElementById('form-save-btn')?.classList.toggle('hidden', step === 1);
        document.getElementById('form-print-btn')?.classList.toggle('hidden', step === 1);
        document.getElementById('form-pdf-btn')?.classList.toggle('hidden', step === 1);
    }

    async function nextFormStep() {
        const ServiceState = (window as any).ServiceState;
        if (ServiceState.currentFormStep === 1) {
            // Validate
            const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
            if (!invIdInput?.value) {
                showToast('Please select an invoice', 'error');
                return;
            }

            const dateInput = document.getElementById('service-date') as HTMLInputElement;
            if (!dateInput?.value) {
                showToast('Please select a service date', 'error');
                return;
            }

            // Validate items
            const items = document.querySelectorAll('#items-container .item-row');
            let isValid = true;
            for (const [index, row] of Array.from(items).entries()) {
                const price = row.querySelector('.item-price') as HTMLInputElement;
                if (price && (!price.value || parseFloat(price.value) <= 0)) {
                    showToast(`Item #${index + 1}: Unit Price must be greater than 0`, 'error');
                    isValid = false;
                    break; // Stop at first error
                }
            }
            if (!isValid) return;

            // Generate preview
            await generatePreview();
        }

        ServiceState.currentFormStep = Math.min(2, ServiceState.currentFormStep + 1);
        updateFormStep();
    }

    function prevFormStep() {
        const ServiceState = (window as any).ServiceState;
        ServiceState.currentFormStep = Math.max(1, ServiceState.currentFormStep - 1);
        updateFormStep();
    }

    async function generatePreview() {
        const ServiceState = (window as any).ServiceState;
        const data = collectFormData();
        const invoice = ServiceState.allInvoices.find((inv: any) => inv.invoice_id === data.invoice_id) || {};
        data.invoice_details = invoice;

        try {
            // Read generated HTML from the print engine attached to view
            const printService = (window as any).printService;
            // Since we need HTML for preview without triggering print, we call serviceView's internal generateDocumentHTML if exposed, 
            // but we can just use the printService wrapper or generate preview directly using DocumentBuilder.
            // Let's replicate generateDocumentHTML here or fetch it if exposed.
            // In serviceView, we did not expose generateDocumentHTML but we can generate it using the global builders.
            const html = await generatePreviewHTML(data);
            const previewEl = document.getElementById('preview-content');
            if (previewEl) previewEl.innerHTML = html;
        } catch (error) {
            console.error('Error generating preview:', error);
            const previewEl = document.getElementById('preview-content');
            if (previewEl) previewEl.innerHTML = '<p class="text-red-500">Error generating preview</p>';
        }
    }

    async function generatePreviewHTML(serviceData: Service) {
        const ServiceState = (window as any).ServiceState;
        const invoice = serviceData.invoice_details || ServiceState.allInvoices.find((inv: any) => inv.invoice_id === serviceData.invoice_id) || {};

        const items = (serviceData.items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        const nonItems = (serviceData.non_items || []).map(item => ({
            ...item,
            rate: item.rate || 0
        }));

        const calcEngine = new (window as any).CalculationEngine(items, nonItems);
        const calculation = calcEngine.calculate();

        const buyerInfo = (window as any).SectionRenderers.renderBuyerDetails({
            name: invoice.customer_name || serviceData.customer_name,
            address: invoice.customer_address,
            phone: invoice.customer_phone,
            title: "Bill To:"
        });

        function formatDateShort(dateStr: string | undefined): string {
            if (!dateStr) return 'N/A';
            const formatDateDisplay = (window as any).formatDateDisplay;
            return formatDateDisplay ? formatDateDisplay(dateStr) : new Date(dateStr).toLocaleDateString('en-IN');
        }

        const infoSection = (window as any).SectionRenderers.renderInfoSection([
            { label: "Project", value: invoice.project_name || serviceData.project_name },
            { label: "Invoice Ref", value: serviceData.invoice_id },
            { label: "Date", value: formatDateShort(serviceData.service_date) },
            { label: "Stage", value: getStageLabel(serviceData.service_stage) }
        ]);

        const builder = new (window as any).DocumentBuilder('invoice');

        builder.addSection(await (window as any).SectionRenderers.renderHeader());
        builder.addSection((window as any).SectionRenderers.renderTitle('Service Report', serviceData.service_id));

        builder.addSection(`
            <div class="third-section">
                ${buyerInfo}
                ${infoSection}
            </div>
        `);

        builder.addSection((window as any).SectionRenderers.renderItemsTable(
            calculation.renderableItems.map((i: any) => i.html).join(''),
            null,
            calculation.hasTax
        ));

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
    // SAVE SERVICE
    // ============================================================================
    async function saveService() {
        const btn = document.getElementById('form-save-btn') as HTMLButtonElement;
        if (!btn || btn.disabled) return;

        btn.disabled = true;

        try {
            const data = collectFormData();
            const isEditing = (document.getElementById('form-is-editing') as HTMLInputElement)?.value === 'true';

            if (isEditing) {
                await serviceApi.updateService(data);
            } else {
                await serviceApi.saveService(data);
            }

            // Update next service status
            const nextServiceSelect = document.getElementById('next-service-select') as HTMLSelectElement;
            const nextService = nextServiceSelect?.value || '';
            await serviceApi.updateNextService(data.invoice_id, nextService);

            showToast('Service saved successfully!');

            // Reload data and show view
            const loadAllData = (window as any).loadAllData;
            if (loadAllData) await loadAllData();

            navigateTo('view', data.service_id);

        } catch (error: any) {
            console.error('Error saving service:', error);
            showToast(error.message || 'Failed to save service', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    // Expose functions globally
    (window as any).showNewForm = showNewForm;
    (window as any).editService = editService;
    (window as any).resetForm = resetForm;
    (window as any).generateServiceId = generateServiceId;
    (window as any).initInvoiceSearch = initInvoiceSearch;
    (window as any).addItemRow = addItemRow;
    (window as any).addChargeRow = addChargeRow;
    (window as any).nextFormStep = nextFormStep;
    (window as any).prevFormStep = prevFormStep;
    (window as any).saveService = saveService;
})();
