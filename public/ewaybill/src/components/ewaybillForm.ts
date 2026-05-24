/**
 * E-Way Bill Module Form Component
 */

(function () {
    // Global variables (set on window for keyboard shortcuts)
    (window as any).currentStep = 1;
    (window as any).totalSteps = 6;

    // Change step function - made global for keyboard shortcuts
    const changeStep = async function (step: number) {
        const currentStepEl = document.getElementById(`step-${(window as any).currentStep}`);
        if (currentStepEl) currentStepEl.classList.remove("active");

        (window as any).currentStep = step;

        const nextStepEl = document.getElementById(`step-${(window as any).currentStep}`);
        if (nextStepEl) {
            nextStepEl.classList.add("active");

            // Focus first input
            const firstInput = nextStepEl.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 50);
            }
        }

        updateNavigation();
        const indicator = document.getElementById("step-indicator");
        if (indicator) {
            indicator.textContent = `Step ${(window as any).currentStep} of ${(window as any).totalSteps}`;
        }

        // Generate preview when reaching the last step
        if ((window as any).currentStep === (window as any).totalSteps) {
            await generatePreview();
        }
    };
    (window as any).changeStep = changeStep;

    function updateNavigation() {
        const isUpdateMode = sessionStorage.getItem('currentTab-status') === 'update';
        const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement | null;
        const nextBtn = document.getElementById("next-btn") as HTMLButtonElement | null;

        if (prevBtn) {
            if (isUpdateMode && (window as any).currentStep === 2) {
                prevBtn.disabled = true;
            } else {
                prevBtn.disabled = (window as any).currentStep === 1;
            }
        }
        if (nextBtn) {
            nextBtn.disabled = (window as any).currentStep === (window as any).totalSteps;
        }
    }

    // Setup navigation button listeners
    document.addEventListener('DOMContentLoaded', function () {
        // Next button - replace with cloned node to clear any previously attached handlers
        const nextBtnOld = document.getElementById("next-btn") as HTMLButtonElement | null;
        let nextBtn: HTMLButtonElement | null = null;
        if (nextBtnOld) {
            nextBtn = nextBtnOld.cloneNode(true) as HTMLButtonElement;
            nextBtnOld.parentNode?.replaceChild(nextBtn, nextBtnOld);
        }
        if (nextBtn) {
            nextBtn.addEventListener("click", async () => {
                if (nextBtn.dataset.processing === "1") return;
                nextBtn.dataset.processing = "1";
                try {
                    if (typeof (window as any).validateCurrentStep === 'function') {
                        const ok = await (window as any).validateCurrentStep();
                        if (!ok) return;
                    }

                    // Advance to the next step after passing validation
                    if ((window as any).currentStep < (window as any).totalSteps) {
                        (window as any).changeStep((window as any).currentStep + 1);
                    }
                } finally {
                    delete nextBtn.dataset.processing;
                }
            });
        }

        // Previous button - replace with cloned node to clear any previously attached handlers
        const prevBtnOld = document.getElementById("prev-btn") as HTMLButtonElement | null;
        let prevBtn: HTMLButtonElement | null = null;
        if (prevBtnOld) {
            prevBtn = prevBtnOld.cloneNode(true) as HTMLButtonElement;
            prevBtnOld.parentNode?.replaceChild(prevBtn, prevBtnOld);
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (prevBtn.dataset.processing === '1') return;
                prevBtn.dataset.processing = '1';
                try {
                    if ((window as any).currentStep > 1) {
                        (window as any).changeStep((window as any).currentStep - 1);
                    }
                } finally {
                    delete prevBtn.dataset.processing;
                }
            });
        }
    });

    // Set default waybill date
    document.addEventListener('DOMContentLoaded', async () => {
        const dateInput = document.getElementById('waybill-date') as HTMLInputElement | null;
        if (dateInput && !dateInput.value) {
            dateInput.value = typeof (window as any).getTodayForInput === 'function' ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
        }
    });

    // Function to fetch and import invoice data
    async function importInvoiceData(invoiceId: string): Promise<boolean> {
        const ewaybillApi = (window as any).ewaybillApi;
        const companyConfig = (window as any).companyConfig;
        const electronAPI = (window as any).electronAPI;

        try {
            const invoice = await ewaybillApi.fetchInvoice(invoiceId);

            if (!invoice) {
                throw new Error('Invoice data not found');
            }

            // Clear existing items
            const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement | null;
            const itemsContainer = document.getElementById("items-container");
            if (itemsTableBody) itemsTableBody.innerHTML = "";
            if (itemsContainer) itemsContainer.innerHTML = "";

            // Populate items from invoice (use items_original or items_duplicate)
            const items = invoice.items_original || invoice.items_duplicate || [];
            let sno = 1;

            for (const item of items) {
                let stockId = item.stock_id || '';

                // If stock_id is missing, try to fetch it from stock based on description
                if (!stockId && item.description) {
                    try {
                        const fetchFn = (window as any).fetchStockData;

                        if (fetchFn) {
                            const stockData = await fetchFn(item.description);
                            if (stockData && stockData._id) {
                                stockId = stockData._id;
                            }
                        }
                    } catch (error) {
                        console.warn('Could not fetch stock data for item:', item.description);
                    }
                }

                addItemFromData({
                    description: item.description || '',
                    hsn_sac: item.HSN_SAC || item.hsn_sac || '',
                    quantity: item.quantity || 0,
                    unit_price: item.unit_price || 0,
                    gst_rate: item.rate || item.gst_rate || 0,
                    stock_id: stockId
                }, sno);
                sno++;
            }

            // Populate addresses
            const fromAddressEl = document.getElementById('from-address') as HTMLTextAreaElement | null;
            const toAddressEl = document.getElementById('to-address') as HTMLTextAreaElement | null;

            // Fetch company info for from_address
            if (fromAddressEl && companyConfig) {
                try {
                    const company = await companyConfig.getCompanyInfo();
                    if (company) {
                        let fromAddress = company.company || '';
                        if (company.address) fromAddress += '\n' + company.address;
                        if (company.phone) {
                            const phone = company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '');
                            fromAddress += '\nPhone: ' + phone;
                        }
                        if (company.GSTIN) fromAddress += '\nGSTIN: ' + company.GSTIN;
                        fromAddressEl.value = fromAddress;
                    }
                } catch (companyErr) {
                    console.warn('Could not fetch company info for from_address:', companyErr);
                }
            }

            // Use customer details as to_address
            if (toAddressEl && invoice.customer_name) {
                let toAddress = invoice.customer_name || '';
                if (invoice.customer_address) toAddress += '\n' + invoice.customer_address;
                if (invoice.customer_phone) toAddress += '\nPhone: ' + invoice.customer_phone;
                if (invoice.customer_GSTIN) toAddress += '\nGSTIN: ' + invoice.customer_GSTIN;
                toAddressEl.value = toAddress;
            }

            // Store invoice MongoDB _id for reference
            const formEl = document.getElementById('waybill-form');
            if (formEl) {
                formEl.dataset.invoiceId = invoice._id;
            }

            return true;
        } catch (error) {
            console.error('Error importing invoice:', error);
            const invoiceIdInput = document.getElementById('invoice-id') as HTMLInputElement | null;
            if (invoiceIdInput) {
                showInlineError(invoiceIdInput, 'Failed to import invoice. Please check the Invoice ID.');
            } else if (typeof electronAPI !== 'undefined' && electronAPI.showAlert1) {
                electronAPI.showAlert1('Failed to import invoice. Please check the Invoice ID.');
            } else {
                alert('Failed to import invoice. Please check the Invoice ID.');
            }
            return false;
        }
    }

    // Show an inline error message below an input field
    function showInlineError(input: HTMLElement, message: string) {
        if (!input.id) {
            input.id = 'input-val-' + Math.random().toString(36).substring(2, 11);
        }
        clearInlineError(input);

        // Apply error borders
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        // Accessibility
        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        // Create error message node
        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'error-message-inline';
        errorMsg.style.cssText = 'font-size: 11px; font-weight: 600; color: #dc2626; margin-top: 4px; transition: all 0.2s ease-in-out;';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            parent.appendChild(errorMsg);
        }

        // Auto-clear on user input
        const clearHandler = () => {
            clearInlineError(input);
            input.removeEventListener('input', clearHandler);
            input.removeEventListener('change', clearHandler);
        };
        input.addEventListener('input', clearHandler);
        input.addEventListener('change', clearHandler);
    }

    // Clear an inline error message for an input
    function clearInlineError(input: HTMLElement) {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');

        const errorId = `${input.id}-error`;
        const errorMsg = document.getElementById(errorId);
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    // Clear all inline errors in the current step
    function clearStepErrors(stepNumber: number) {
        const stepEl = document.getElementById(`step-${stepNumber}`);
        if (!stepEl) return;
        const errorMsgs = stepEl.querySelectorAll('.error-message-inline');
        errorMsgs.forEach(el => el.remove());

        const errorInputs = stepEl.querySelectorAll('[aria-invalid="true"]');
        errorInputs.forEach(input => {
            (input as HTMLElement).style.borderColor = '';
            (input as HTMLElement).style.boxShadow = '';
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });
    }

    // Validate current step
    const validateCurrentStep = async function (): Promise<boolean> {
        const ewaybillApi = (window as any).ewaybillApi;
        const electronAPI = (window as any).electronAPI;

        // Step 1: Invoice ID is required - fetch and populate data
        if ((window as any).currentStep === 1) {
            clearStepErrors(1);
            const invoiceId = document.getElementById('invoice-id') as HTMLInputElement | null;
            if (!invoiceId || !invoiceId.value.trim()) {
                if (invoiceId) {
                    showInlineError(invoiceId, 'Please enter an Invoice ID.');
                    invoiceId.focus();
                }
                return false;
            }

            // Check if e-way bill already exists for this invoice (only for new e-way bills)
            const formEl = document.getElementById('waybill-form');
            const isEditing = formEl?.dataset?.ewaybillId;
            if (!isEditing) {
                const exists = await ewaybillApi.checkInvoiceExists(invoiceId.value.trim());
                if (exists) {
                    showInlineError(invoiceId, 'An E-Way Bill already exists for this Invoice. Each invoice can only have one E-Way Bill.');
                    invoiceId.focus();
                    return false;
                }
            }

            // Try to import invoice data
            const imported = await importInvoiceData(invoiceId.value.trim());
            if (!imported) {
                return false;
            }
        }

        // Step 2: E-Way Bill Number is required
        if ((window as any).currentStep === 2) {
            clearStepErrors(2);
            const ewaybillNo = document.getElementById('ewaybill-no') as HTMLInputElement | null;
            if (!ewaybillNo || !ewaybillNo.value.trim()) {
                if (ewaybillNo) {
                    showInlineError(ewaybillNo, 'Please enter an E-Way Bill Number.');
                    ewaybillNo.focus();
                }
                return false;
            }

            // Check if e-way bill number already exists
            // When editing, exclude the current e-waybill from duplicate check
            const formEl = document.getElementById('waybill-form');
            const currentEWayBillId = formEl?.dataset?.ewaybillId;
            const exists = await ewaybillApi.checkEWayBillNoExists(
                ewaybillNo.value.trim(),
                currentEWayBillId || null
            );
            if (exists) {
                showInlineError(ewaybillNo, 'An E-Way Bill with this number already exists. Please enter a unique E-Way Bill Number.');
                ewaybillNo.focus();
                return false;
            }
        }

        // Step 3: Address details must be filled
        if ((window as any).currentStep === 3) {
            clearStepErrors(3);
            const fromAddress = document.getElementById('from-address') as HTMLTextAreaElement | null;
            const toAddress = document.getElementById('to-address') as HTMLTextAreaElement | null;
            let isValid = true;
            let firstInvalidInput: HTMLElement | null = null;

            if (!fromAddress || !fromAddress.value.trim()) {
                if (fromAddress) {
                    showInlineError(fromAddress, 'Please enter the From Address.');
                    if (!firstInvalidInput) firstInvalidInput = fromAddress;
                }
                isValid = false;
            }
            if (!toAddress || !toAddress.value.trim()) {
                if (toAddress) {
                    showInlineError(toAddress, 'Please enter the To Address.');
                    if (!firstInvalidInput) firstInvalidInput = toAddress;
                }
                isValid = false;
            }

            if (!isValid) {
                firstInvalidInput?.focus();
                return false;
            }
        }

        // Step 4: Transportation mode is required
        if ((window as any).currentStep === 4) {
            clearStepErrors(4);
            const transportMode = document.getElementById('transport-mode') as HTMLSelectElement | null;
            if (!transportMode || !transportMode.value.trim()) {
                if (transportMode) {
                    showInlineError(transportMode, 'Please select a Transportation Mode.');
                    transportMode.focus();
                }
                return false;
            }
        }

        // Step 5: Items check
        if ((window as any).currentStep === 5) {
            clearStepErrors(5);
            const itemCards = document.querySelectorAll('#items-container .item-card');
            if (itemCards.length === 0) {
                if (typeof electronAPI !== 'undefined' && electronAPI.showAlert1) {
                    electronAPI.showAlert1('Please add at least one item.');
                } else {
                    alert('Please add at least one item.');
                }
                return false;
            }

            let isValid = true;
            let firstInvalidInput: HTMLElement | null = null;

            for (let i = 0; i < itemCards.length; i++) {
                const card = itemCards[i] as HTMLElement;
                const desc = card.querySelector('.item-field.description input[type="text"]') as HTMLInputElement | null;
                const qty = card.querySelector('.item-field.qty input') as HTMLInputElement | null;
                const price = card.querySelector('.item-field.price input') as HTMLInputElement | null;

                if (desc) {
                    if (!desc.value.trim()) {
                        showInlineError(desc, 'Description is required.');
                        if (!firstInvalidInput) firstInvalidInput = desc;
                        isValid = false;
                    }
                }

                if (qty) {
                    const qtyVal = Number(qty.value);
                    if (!qty.value.trim() || isNaN(qtyVal) || qtyVal <= 0) {
                        showInlineError(qty, 'Quantity must be greater than 0.');
                        if (!firstInvalidInput) firstInvalidInput = qty;
                        isValid = false;
                    }
                }

                if (price) {
                    const priceVal = Number(price.value);
                    if (!price.value.trim() || isNaN(priceVal) || priceVal <= 0) {
                        showInlineError(price, 'Unit Price must be greater than 0.');
                        if (!firstInvalidInput) firstInvalidInput = price;
                        isValid = false;
                    }
                }
            }

            if (!isValid) {
                firstInvalidInput?.focus();
                return false;
            }
        }

        return true;
    };
    (window as any).validateCurrentStep = validateCurrentStep;

    // Open an e-way bill for editing
    async function openWayBill(wayBillId: string) {
        const ewaybillApi = (window as any).ewaybillApi;
        const electronAPI = (window as any).electronAPI;

        try {
            const wayBill = await ewaybillApi.getEWayBillDetails(wayBillId);

            const homeEl = document.getElementById('home');
            if (homeEl) homeEl.style.display = 'none';
            const newEl = document.getElementById('new');
            if (newEl) newEl.style.display = 'block';
            const newWaybillBtn = document.getElementById('new-waybill-btn');
            if (newWaybillBtn) newWaybillBtn.style.display = 'none';
            const viewPreviewBtn = document.getElementById('view-preview');
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'block';

            if ((window as any).currentStep === 1) {
                (window as any).changeStep(2);
            }

            // Store the MongoDB _id for updates
            const formEl = document.getElementById('waybill-form');
            if (formEl) {
                formEl.dataset.ewaybillId = wayBill._id;
            }

            // Store invoice ID from populated object or direct value
            if (wayBill.invoice_id) {
                if (typeof wayBill.invoice_id === 'object' && wayBill.invoice_id._id) {
                    if (formEl) formEl.dataset.invoiceId = wayBill.invoice_id._id;
                    // Also populate the input if it exists
                    const invoiceIdInput = document.getElementById('invoice-id') as HTMLInputElement | null;
                    if (invoiceIdInput) invoiceIdInput.value = wayBill.invoice_id.invoice_id || '';
                } else {
                    if (formEl) formEl.dataset.invoiceId = wayBill.invoice_id as string;
                }
            }

            // Populate form fields based on new schema
            const ewaybillNoInput = document.getElementById('ewaybill-no') as HTMLInputElement | null;
            if (ewaybillNoInput) ewaybillNoInput.value = wayBill.ewaybill_no || '';

            const ewaybillStatusSelect = document.getElementById('ewaybill-status') as HTMLSelectElement | null;
            if (ewaybillStatusSelect) ewaybillStatusSelect.value = wayBill.ewaybill_status || 'Draft';

            const wbDateEl = document.getElementById('waybill-date') as HTMLInputElement | null;
            if (wbDateEl && wayBill.ewaybill_generated_at) {
                const dt = new Date(wayBill.ewaybill_generated_at);
                wbDateEl.value = typeof (window as any).formatDateInput === 'function' ? (window as any).formatDateInput(dt) : dt.toISOString().split('T')[0];
            }

            const fromAddressEl = document.getElementById('from-address') as HTMLTextAreaElement | null;
            if (fromAddressEl) fromAddressEl.value = wayBill.from_address || '';

            const toAddressEl = document.getElementById('to-address') as HTMLTextAreaElement | null;
            if (toAddressEl) toAddressEl.value = wayBill.to_address || '';

            // Transport details
            const transport = wayBill.transport || {};
            const transportModeSelect = document.getElementById('transport-mode') as HTMLSelectElement | null;
            if (transportModeSelect) transportModeSelect.value = transport.mode || 'Road';

            const vehicleNumberInput = document.getElementById('vehicle-number') as HTMLInputElement | null;
            if (vehicleNumberInput) vehicleNumberInput.value = transport.vehicle_number || '';

            const transporterIdInput = document.getElementById('transporter-id') as HTMLInputElement | null;
            if (transporterIdInput) transporterIdInput.value = transport.transporter_id || '';

            const transporterNameInput = document.getElementById('transporter-name') as HTMLInputElement | null;
            if (transporterNameInput) transporterNameInput.value = transport.transporter_name || '';

            const distanceKmInput = document.getElementById('distance-km') as HTMLInputElement | null;
            if (distanceKmInput) distanceKmInput.value = transport.distance_km ? String(transport.distance_km) : '';

            // Populate items
            const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement | null;
            if (itemsTableBody) itemsTableBody.innerHTML = "";
            const itemsContainer = document.getElementById("items-container");
            if (itemsContainer) itemsContainer.innerHTML = "";
            let sno = 1;

            (wayBill.items || []).forEach((item: EWayBillItem) => {
                addItemFromData(item, sno);
                sno++;
            });
        } catch (error) {
            console.error('Error opening e-way bill:', error);
            if (typeof electronAPI !== 'undefined' && electronAPI.showAlert1) {
                electronAPI.showAlert1('Failed to load e-way bill.');
            } else {
                alert('Failed to load e-way bill.');
            }
        }
    }

    // Expose openWayBill globally for home list edit button
    (window as any).openWayBill = openWayBill;

    // Setup add item button listener after DOM loads
    document.addEventListener('DOMContentLoaded', function () {
        const addItemBtnOld = document.getElementById('add-item-btn') as HTMLButtonElement | null;
        if (addItemBtnOld) {
            const addItemBtn = addItemBtnOld.cloneNode(true) as HTMLButtonElement;
            addItemBtnOld.parentNode?.replaceChild(addItemBtn, addItemBtnOld);
            addItemBtn.addEventListener('click', () => {
                if (addItemBtn.dataset.processing === '1') return;
                addItemBtn.dataset.processing = '1';
                try {
                    addItem();
                } finally {
                    delete addItemBtn.dataset.processing;
                }
            });
        }
    });

    // Helper function to add item with data
    function addItemFromData(item: EWayBillItem, itemSno: number, insertIndex?: number) {
        const itemsContainer = document.getElementById("items-container");
        const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement | null;

        if (!itemsContainer || !itemsTableBody) return;

        // Create card
        const card = document.createElement("div");
        card.className = "item-card";
        card.setAttribute("draggable", "true");
        card.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-number">${itemSno}</div>
            <div class="item-field description">
                <div style="position: relative;">
                    <input type="hidden" class="stock-id" value="${item.stock_id || ''}">
                    <input type="text" value="${item.description || ''}" placeholder="Enter item description" required>
                    <ul class="suggestions"></ul>
                </div>
            </div>
            <div class="item-field hsn">
                <input type="text" value="${item.hsn_sac || ''}" placeholder="Code" required>
            </div>
            <div class="item-field qty">
                <input type="number" value="${item.quantity || ''}" placeholder="0" min="1" required>
            </div>
            <div class="item-field price">
                <input type="number" value="${item.unit_price || ''}" placeholder="0.00" step="0.01" required>
            </div>
            <div class="item-field rate">
                <input type="number" value="${item.gst_rate || ''}" placeholder="0" min="0" step="0.01">
            </div>
            <div class="item-actions">
                <button type="button" class="remove-item-btn" title="Remove Item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < itemsContainer.children.length) {
            itemsContainer.insertBefore(card, itemsContainer.children[insertIndex]);
        } else {
            itemsContainer.appendChild(card);
        }

        // Create hidden table row
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><div class="item-number">${itemSno}</div></td>
            <td>
                <input type="hidden" class="stock-id" value="${item.stock_id || ''}">
                <input type="text" value="${item.description || ''}" placeholder="Item Description" required>
                <ul class="suggestions"></ul>
            </td>
            <td><input type="text" value="${item.hsn_sac || ''}" placeholder="HSN/SAC" required></td>
            <td><input type="number" value="${item.quantity || ''}" placeholder="Qty" min="1" required></td>
            <td><input type="number" value="${item.unit_price || ''}" placeholder="Unit Price" required></td>
            <td><input type="number" value="${item.gst_rate || ''}" placeholder="GST Rate" min="0" step="0.01" required></td>
            <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;

        if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < itemsTableBody.children.length) {
            itemsTableBody.insertBefore(row, itemsTableBody.children[insertIndex]);
        } else {
            itemsTableBody.appendChild(row);
        }

        // Sync card inputs with table inputs
        const cardInputs = card.querySelectorAll('input');
        const rowInputs = row.querySelectorAll('input');
        cardInputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                rowInputs[index].value = input.value;
            });
        });

        // Integer validation for quantity inputs
        const qtyInputs = [card.querySelector('.item-field.qty input') as HTMLInputElement | null, row.querySelector('td:nth-child(4) input') as HTMLInputElement | null];
        qtyInputs.forEach(input => {
            if (input) {
                input.setAttribute('step', '1');
                input.addEventListener('keypress', function (event: KeyboardEvent) {
                    if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                });
                input.addEventListener('input', function () {
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
            }
        });

        // Setup autocomplete for description input - use global functions
        const cardDescriptionInput = card.querySelector('.item-field.description input[type="text"]') as HTMLInputElement | null;
        const cardSuggestions = card.querySelector('.item-field.description .suggestions') as HTMLUListElement | null;
        const rowDescriptionInput = row.querySelector('td:nth-child(2) input[type="text"]') as HTMLInputElement | null;
        const rowSuggestions = row.querySelector('td:nth-child(2) .suggestions') as HTMLUListElement | null;

        const showSuggestions = (window as any).showSuggestions;
        const handleKeyboardNavigation = (window as any).handleKeyboardNavigation;

        if (cardDescriptionInput && cardSuggestions && showSuggestions && handleKeyboardNavigation) {
            cardDescriptionInput.addEventListener('input', function () {
                showSuggestions(cardDescriptionInput, cardSuggestions);
            });
            cardDescriptionInput.addEventListener('keydown', function (event: KeyboardEvent) {
                handleKeyboardNavigation(event, cardDescriptionInput, cardSuggestions);
            });
        }
        if (rowDescriptionInput && rowSuggestions && showSuggestions && handleKeyboardNavigation) {
            rowDescriptionInput.addEventListener('input', function () {
                showSuggestions(rowDescriptionInput, rowSuggestions);
                if (cardDescriptionInput) cardDescriptionInput.value = rowDescriptionInput.value;
            });
            rowDescriptionInput.addEventListener('keydown', function (event: KeyboardEvent) {
                handleKeyboardNavigation(event, rowDescriptionInput, rowSuggestions);
            });
        }

        // Add remove button event listeners
        const cardRemoveBtn = card.querySelector(".remove-item-btn") as HTMLButtonElement | null;
        const tableRemoveBtn = row.querySelector(".remove-item-btn") as HTMLButtonElement | null;

        cardRemoveBtn?.addEventListener("click", function () {
            card.remove();
            row.remove();
            renumberItems();
        });

        tableRemoveBtn?.addEventListener("click", function () {
            card.remove();
            row.remove();
            renumberItems();
        });

        if (typeof insertIndex === 'number') {
            renumberItems();
        }
    }

    // Add a new empty item
    function addItem(insertIndex?: number) {
        if ((addItem as any)._processing) return;
        (addItem as any)._processing = true;
        try {
            const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement | null;
            const itemSno = itemsTableBody ? itemsTableBody.rows.length + 1 : 1;

            addItemFromData({
                description: '',
                stock_id: '',
                hsn_sac: '',
                quantity: 0,
                unit_price: 0,
                gst_rate: 0
            }, itemSno, insertIndex);
        } finally {
            setTimeout(() => { delete (addItem as any)._processing; }, 50);
        }
    }

    // Close suggestions dropdowns on click outside
    document.addEventListener('click', function (event: MouseEvent) {
        if (!window.location.pathname.toLowerCase().includes('/ewaybill')) return;
        const allSuggestions = document.querySelectorAll('#items-container .suggestions, #items-table .suggestions') as NodeListOf<HTMLUListElement>;
        allSuggestions.forEach(suggestionsList => {
            const parentInput = suggestionsList.previousElementSibling as HTMLInputElement | null;
            const target = event.target as Node | null;
            if (parentInput && target && !parentInput.contains(target) && !suggestionsList.contains(target)) {
                suggestionsList.style.display = 'none';
            }
        });
    });

    // Renumber items after deletion
    function renumberItems() {
        const cards = document.querySelectorAll("#items-container .item-card");
        const rows = document.querySelectorAll("#items-table tbody tr") as NodeListOf<HTMLTableRowElement>;

        cards.forEach((card, index) => {
            const numberDiv = card.querySelector('.item-number');
            if (numberDiv) {
                numberDiv.textContent = String(index + 1);
            }
        });

        rows.forEach((row, index) => {
            const badge = row.querySelector('td:first-child .item-number');
            if (badge) {
                badge.textContent = String(index + 1);
            } else {
                const numberCell = row.querySelector('td:first-child');
                if (numberCell) numberCell.textContent = String(index + 1);
            }
        });
    }

    async function generatePreview() {
        const ewaybillNo = (document.getElementById("ewaybill-no") as HTMLInputElement | null)?.value || "";
        const ewaybillStatus = (document.getElementById("ewaybill-status") as HTMLSelectElement | null)?.value as any || "Draft";
        const invoiceIdInput = document.getElementById("invoice-id") as HTMLInputElement | null;
        const formEl = document.getElementById('waybill-form');
        const invoiceId = invoiceIdInput?.value || formEl?.dataset?.invoiceId || "";
        const fromAddress = (document.getElementById("from-address") as HTMLTextAreaElement | null)?.value || "";
        const toAddress = (document.getElementById("to-address") as HTMLTextAreaElement | null)?.value || "";
        const transportMode = (document.getElementById("transport-mode") as HTMLSelectElement | null)?.value as any || "";
        const vehicleNumber = (document.getElementById("vehicle-number") as HTMLInputElement | null)?.value || "";
        const transporterId = (document.getElementById("transporter-id") as HTMLInputElement | null)?.value || "";
        const transporterName = (document.getElementById("transporter-name") as HTMLInputElement | null)?.value || "";
        const distanceKm = (document.getElementById("distance-km") as HTMLInputElement | null)?.value || "";

        // Collect items from table
        const rows = document.querySelectorAll("#items-table tbody tr") as NodeListOf<HTMLTableRowElement>;
        const items = Array.from(rows).map(row => {
            const stockIdInput = row.querySelector('.stock-id') as HTMLInputElement | null;
            const descInput = row.cells[1].querySelector("input[type=text]") as HTMLInputElement | null;
            const hsnInput = row.cells[2].querySelector("input") as HTMLInputElement | null;
            const qtyInput = row.cells[3].querySelector("input") as HTMLInputElement | null;
            const priceInput = row.cells[4].querySelector("input") as HTMLInputElement | null;
            const rateInput = row.cells[5].querySelector("input") as HTMLInputElement | null;

            return {
                stock_id: stockIdInput ? stockIdInput.value : null,
                description: descInput ? descInput.value : "-",
                hsn_sac: hsnInput ? hsnInput.value : "-",
                quantity: qtyInput ? qtyInput.value : "0",
                unit_price: priceInput ? priceInput.value : "0",
                gst_rate: rateInput ? rateInput.value : "0"
            };
        });

        // Calculate totals
        let totalTaxableValue = 0;
        let cgst = 0;
        let sgst = 0;
        items.forEach(item => {
            const qty = parseFloat(item.quantity || '0');
            const unitPrice = parseFloat(item.unit_price || '0');
            const gstRate = parseFloat(item.gst_rate || '0');
            const taxableValue = qty * unitPrice;
            const tax = (taxableValue * gstRate) / 100;
            totalTaxableValue += taxableValue;
            cgst += tax / 2;
            sgst += tax / 2;
        });
        const totalInvoiceValue = Math.round(totalTaxableValue + cgst + sgst);

        const waybillDateInput = document.getElementById('waybill-date') as HTMLInputElement | null;
        const waybillDate = waybillDateInput?.value || (typeof (window as any).getTodayForInput === 'function' ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0]);

        const wayBillObj: EWayBill = {
            ewaybill_no: ewaybillNo,
            ewaybill_status: ewaybillStatus,
            invoice_id: invoiceId,
            ewaybill_generated_at: waybillDate,
            from_address: fromAddress,
            to_address: toAddress,
            transport: {
                mode: transportMode,
                vehicle_number: vehicleNumber,
                transporter_id: transporterId,
                transporter_name: transporterName,
                distance_km: Number(distanceKm) || 0
            },
            items: items.map(it => ({
                stock_id: it.stock_id,
                description: it.description,
                hsn_sac: it.hsn_sac,
                quantity: Number(it.quantity) || 0,
                unit_price: Number(it.unit_price) || 0,
                gst_rate: Number(it.gst_rate) || 0
            })),
            total_taxable_value: totalTaxableValue,
            cgst,
            sgst,
            total_invoice_value: totalInvoiceValue
        };

        const generateViewPreviewHTML = (window as any).generateViewPreviewHTML;
        if (generateViewPreviewHTML) {
            const pagesHTML = await generateViewPreviewHTML(wayBillObj, null); // Pass null so it doesn't write to view-preview-content
            const previewContent = document.getElementById("preview-content");
            if (previewContent) {
                previewContent.innerHTML = pagesHTML;
            }
        }
    }

    // Function to collect form data and send to server
    async function sendToServer(data: EWayBillFormPayload): Promise<boolean> {
        const ewaybillApi = (window as any).ewaybillApi;
        return await ewaybillApi.saveEWayBill(data);
    }

    // Event listener for the "Save" button
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const wasNewWayBill = sessionStorage.getItem('currentTab-status') !== 'update';
            const wayBillData = collectFormData();
            const ok = await sendToServer(wayBillData);
            const electronAPI = (window as any).electronAPI;

            if (ok) {
                if (typeof electronAPI !== 'undefined' && electronAPI.showAlert1) {
                    electronAPI.showAlert1("E-Way Bill saved successfully!");
                } else {
                    alert("E-Way Bill saved successfully!");
                }
                if (wasNewWayBill) {
                    sessionStorage.removeItem('currentTab-status');
                    window.location.href = '/ewaybill';
                }
            }
        });
    }

    // Function to collect form data
    function collectFormData(): EWayBillFormPayload {
        const waybillDateInput = document.getElementById('waybill-date') as HTMLInputElement | null;
        const rawDate = waybillDateInput?.value || (typeof (window as any).getTodayForInput === 'function' ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0]);
        let waybillDateISO = rawDate;
        try {
            const d = new Date(rawDate);
            waybillDateISO = d.toISOString();
        } catch (err) {
            waybillDateISO = rawDate;
        }

        // Get _id if editing existing document
        const formEl = document.getElementById('waybill-form');
        const existingId = formEl?.dataset?.ewaybillId || '';

        const rows = document.querySelectorAll("#items-table tbody tr") as NodeListOf<HTMLTableRowElement>;

        return {
            _id: existingId,
            invoiceId: formEl?.dataset?.invoiceId || '',
            eWayBillNo: (document.getElementById("ewaybill-no") as HTMLInputElement | null)?.value || '',
            eWayBillStatus: ((document.getElementById("ewaybill-status") as HTMLSelectElement | null)?.value as any) || 'Draft',
            eWayBillDate: waybillDateISO,
            fromAddress: (document.getElementById("from-address") as HTMLTextAreaElement | null)?.value || '',
            toAddress: (document.getElementById("to-address") as HTMLTextAreaElement | null)?.value || '',
            transportMode: ((document.getElementById("transport-mode") as HTMLSelectElement | null)?.value as any) || '',
            vehicleNumber: (document.getElementById("vehicle-number") as HTMLInputElement | null)?.value || '',
            transporterId: (document.getElementById("transporter-id") as HTMLInputElement | null)?.value || '',
            transporterName: (document.getElementById("transporter-name") as HTMLInputElement | null)?.value || '',
            distanceKm: Number((document.getElementById("distance-km") as HTMLInputElement | null)?.value) || 0,
            items: Array.from(rows).map(row => ({
                stock_id: (row.querySelector("td:nth-child(2) input.stock-id") as HTMLInputElement | null)?.value || '',
                description: (row.querySelector("td:nth-child(2) input[type='text']") as HTMLInputElement | null)?.value || '',
                hsn_sac: (row.querySelector("td:nth-child(3) input") as HTMLInputElement | null)?.value || '',
                quantity: (row.querySelector("td:nth-child(4) input") as HTMLInputElement | null)?.value || '',
                unit_price: (row.querySelector("td:nth-child(5) input") as HTMLInputElement | null)?.value || '',
                gst_rate: (row.querySelector("td:nth-child(6) input") as HTMLInputElement | null)?.value || '',
            })),
        };
    }

    // Initialize drag-drop reordering for waybill items
    document.addEventListener('DOMContentLoaded', function () {
        const itemReorder = (window as any).itemReorder;
        if (itemReorder && typeof itemReorder.initDragDrop === 'function') {
            itemReorder.initDragDrop('items-container', renumberItems);
        }
    });
})();
