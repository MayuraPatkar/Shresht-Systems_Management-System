(function () {
    (window as any).totalSteps = 7;

    const formatIndian = (window as any).formatIndian;
    const formatDateIndian = (window as any).formatDateIndian;
    const numberToWords = (window as any).numberToWords;
    const showToast = (window as any).showToast;
    const changeStep = (window as any).changeStep;
    const showSuggestions = (window as any).showSuggestions;
    const handleKeyboardNavigation = (window as any).handleKeyboardNavigation;
    const updateItemNumbers = (window as any).updateItemNumbers;

    let invoiceId = '';
    let totalAmountOriginal = 0;
    let totalAmountDuplicate = 0;
    let totalTaxOriginal = 0;
    let totalTaxDuplicate = 0;
    let currentDeclaration = "";
    let currentTermsAndConditions = "";
    let isSaving = false;

    // Setup Customer Autocomplete
    function setupCustomerAutocomplete() {
        const input = document.getElementById('buyer-name') as HTMLInputElement;
        const suggestionsList = document.getElementById('customer-suggestions') as HTMLElement;
        if (!input || !suggestionsList) return;

        let debounceTimer: any;
        let selectedIndex = -1;
        let currentCustomers: any[] = [];

        async function fetchCustomers(query: string) {
            try {
                const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
                return await response.json();
            } catch (err) {
                console.error('Failed to fetch customers:', err);
                return [];
            }
        }

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim();
            
            // Clear hidden ID when input changes manually
            const idInput = document.getElementById('buyer-customer-id') as HTMLInputElement | null;
            if (idInput) idInput.value = '';
            
            if (query.length < 2) {
                suggestionsList.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                currentCustomers = await fetchCustomers(query);
                suggestionsList.innerHTML = '';
                selectedIndex = -1;

                if (currentCustomers.length === 0) {
                    suggestionsList.style.display = 'none';
                    return;
                }

                suggestionsList.style.display = 'block';
                
                currentCustomers.forEach((customer, index) => {
                    const li = document.createElement('li');
                    li.className = 'px-4 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-0';
                    
                    const name = customer.customer?.name || customer.customer_name || 'Unknown';
                    const phone = customer.customer?.phone || '';
                    
                    li.innerHTML = `
                        <div class="font-medium text-gray-800">${name}</div>
                        ${phone ? `<div class="text-sm text-gray-500">${phone}</div>` : ''}
                    `;
                    
                    li.onclick = () => selectCustomer(customer);
                    suggestionsList.appendChild(li);
                });
            }, 300);
        });

        input.addEventListener('keydown', (e) => {
            // Prevent Enter from submitting the form or triggering next step
            if (e.key === 'Enter') {
                e.preventDefault();
            }

            const items = suggestionsList.querySelectorAll('li');
            if (items.length === 0 || suggestionsList.style.display === 'none') return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelection(items);
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0) {
                    selectCustomer(currentCustomers[selectedIndex]);
                } else if (currentCustomers.length > 0) {
                    // If they press enter without selecting, select the first suggestion
                    selectCustomer(currentCustomers[0]);
                }
            }
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e: MouseEvent) => {
            if (!input.contains(e.target as Node) && !suggestionsList.contains(e.target as Node)) {
                suggestionsList.style.display = 'none';
            }
        });

        function updateSelection(items: NodeListOf<HTMLLIElement>) {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('bg-purple-100');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-purple-100');
                }
            });
        }

        function selectCustomer(customer: any) {
            input.value = customer.customer?.name || customer.customer_name || '';
            
            // Populate other fields
            const idInput = document.getElementById('buyer-customer-id') as HTMLInputElement | null;
            const addressInput = document.getElementById('buyer-address') as HTMLInputElement | null;
            const phoneInput = document.getElementById('buyer-phone') as HTMLInputElement | null;
            const emailInput = document.getElementById('buyer-email') as HTMLInputElement | null;
            const gstinInput = document.getElementById('buyer-gstin') as HTMLInputElement | null;

            if (idInput) idInput.value = customer._id || '';
            
            if (addressInput) {
                const billing = customer.billing_address || {};
                addressInput.value = billing.line1 || customer.customer_address || '';
            }
            if (phoneInput) phoneInput.value = customer.customer?.phone || customer.customer_phone || '';
            if (emailInput) emailInput.value = customer.customer?.email || customer.customer_email || '';
            if (gstinInput) gstinInput.value = customer.gstin || customer.customer_GSTIN || '';

            suggestionsList.style.display = 'none';
        }
    }

    // Initialize listener and event listeners
    document.addEventListener('DOMContentLoaded', () => {
        setupCustomerAutocomplete();

        const viewPreviewBtn = document.getElementById("view-preview");
        if (viewPreviewBtn) {
            viewPreviewBtn.addEventListener("click", async () => {
                const navigateToPreview = async () => {
                    if (currentStep === totalSteps) {
                        await generatePreview();
                        return;
                    }

                    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
                    if (!nextBtn) return;

                    const stepBefore = currentStep;
                    nextBtn.click();

                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (currentStep === stepBefore) return;

                    if (currentStep === totalSteps) {
                        await generatePreview();
                        return;
                    }

                    await navigateToPreview();
                };

                await navigateToPreview();
            });
        }

    // Bind Numeric Input restrictions
    const phoneInput = document.getElementById('buyer-phone') as HTMLInputElement | null;
    if (phoneInput) {
        phoneInput.setAttribute('inputmode', 'numeric');
        phoneInput.setAttribute('maxlength', '10');
        phoneInput.setAttribute('pattern', '[0-9]{10}');
        phoneInput.addEventListener('input', () => {
            const cleaned = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
        });
    }

    const emailInput = document.getElementById('buyer-email') as HTMLInputElement | null;
    if (emailInput) {
        emailInput.setAttribute('maxlength', '254');
        emailInput.addEventListener('input', () => {
            const cleaned = emailInput.value.trim().replace(/\s+/g, '');
            if (emailInput.value !== cleaned) emailInput.value = cleaned;
        });
    }

    document.body.addEventListener('keypress', function (e) {
        const target = e.target as HTMLElement | null;
        if (target && (target.matches('.item-field.qty input') || target.closest('td:nth-child(4)')?.querySelector('input') === target)) {
            if (e.key === 'e' || e.key === '-' || e.key === '+') {
                e.preventDefault();
            }
        }
    });

    document.body.addEventListener('input', function (e) {
        const target = e.target as HTMLInputElement | null;
        if (target && (target.matches('.item-field.qty input') || target.closest('td:nth-child(4)')?.querySelector('input') === target)) {
            let val = target.value.replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join('');
            }
            target.value = val;
        }
    });

    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            if (isSaving) return;
            const originalText = saveBtn.innerHTML;

            try {
                isSaving = true;
                saveBtn.setAttribute('disabled', 'true');
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                const wasNewInvoice = sessionStorage.getItem('currentTab-status') !== 'update';
                const invoiceData = collectFormData();
                const response = await (window as any).sendDocumentToServer("/invoice/save-invoice", invoiceData);

                if (response) {
                    if ((window as any).electronAPI?.showAlert1) {
                        (window as any).electronAPI.showAlert1("Invoice saved successfully!");
                    }

                    if (response.invoice_id) {
                        invoiceId = response.invoice_id;
                        const idValInput = document.getElementById('id') as HTMLInputElement | null;
                        if (idValInput) idValInput.value = invoiceId;
                        sessionStorage.setItem('update-invoice', 'original');
                    }
                    if (wasNewInvoice) {
                        sessionStorage.removeItem('currentTab-status');
                        window.location.href = '/invoice';
                    }
                }
            } catch (error) {
                console.error("Save error:", error);
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Failed to save invoice.");
                }
            } finally {
                isSaving = false;
                saveBtn.removeAttribute('disabled');
                saveBtn.innerHTML = originalText;
            }
        });
    }
});

// Validate current step before navigation
const validateCurrentStep = async function (): Promise<boolean> {
    // Step 1 check is no longer needed since invoice ID is auto-generated and read-only.

    if (currentStep === 2) {
        const projectName = document.getElementById('project-name') as HTMLInputElement;
        const serviceMonths = document.getElementById('service-months') as HTMLInputElement;

        if (!projectName.value.trim()) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter the Project Name.");
            }
            projectName.focus();
            return false;
        }

        if (!serviceMonths.value || Number(serviceMonths.value) < 0) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter valid Service Months (0 or greater).");
            }
            serviceMonths.focus();
            return false;
        }
    }

    if (currentStep === 3) {
        const buyerName = document.getElementById('buyer-name') as HTMLInputElement;
        const buyerAddress = document.getElementById('buyer-address') as HTMLInputElement;
        const buyerPhone = document.getElementById('buyer-phone') as HTMLInputElement;
        const buyerEmail = document.getElementById('buyer-email') as HTMLInputElement;

        if (!buyerName.value.trim()) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter the Buyer Name.");
            }
            buyerName.focus();
            return false;
        }
        if (!buyerAddress.value.trim()) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter the Buyer Address.");
            }
            buyerAddress.focus();
            return false;
        }
        if (!buyerPhone.value.trim()) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter the Buyer Phone Number.");
            }
            buyerPhone.focus();
            return false;
        }
        const cleanedPhone = (buyerPhone.value || '').replace(/\D/g, '');
        if (cleanedPhone.length !== 10) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please enter a valid 10-digit Buyer Phone Number.");
            }
            buyerPhone.focus();
            return false;
        }
        if (buyerEmail && buyerEmail.value.trim()) {
            const cleanedEmail = buyerEmail.value.trim().replace(/\s+/g, '');
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(cleanedEmail)) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Please enter a valid Buyer Email address.");
                }
                buyerEmail.focus();
                return false;
            }
        }
        const buyerGstin = document.getElementById('buyer-gstin') as HTMLInputElement | null;
        if (buyerGstin && buyerGstin.value.trim()) {
            if (buyerGstin.value.trim().length !== 15) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("GSTIN must be exactly 15 characters.");
                }
                buyerGstin.focus();
                return false;
            }
        }
    }

    if (currentStep === 5) {
        const itemsTable = document.querySelector('#items-table tbody') as HTMLTableSectionElement | null;
        if (!itemsTable || itemsTable.rows.length === 0) {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Please add at least one item.");
            }
            return false;
        }
        for (let index = 0; index < itemsTable.rows.length; index++) {
            const row = itemsTable.rows[index];
            const desc = row.querySelector('td:nth-child(2) input') as HTMLInputElement | null;
            const qty = row.querySelector('td:nth-child(4) input') as HTMLInputElement | null;
            const price = row.querySelector('td:nth-child(5) input') as HTMLInputElement | null;

            if (!desc || !desc.value.trim()) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1(`Item #${index + 1}: Description is required.`);
                }
                desc?.focus();
                return false;
            }
            if (!qty || Number(qty.value) <= 0) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1(`Item #${index + 1}: Quantity must be greater than 0.`);
                }
                qty?.focus();
                return false;
            }
            if (!price || Number(price.value) <= 0) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1(`Item #${index + 1}: Unit Price must be greater than 0.`);
                }
                price?.focus();
                return false;
            }
        }
    }

    return true;
};

// Hook that runs before advancing a step
const beforeStepAdvance = async function (step: number): Promise<boolean> {
    if (step === 1 && sessionStorage.getItem('currentTab-status') !== 'update') {
        const quotationIdEl = document.getElementById("quotation-id") as HTMLInputElement | null;
        const quotationId = quotationIdEl?.value;
        if (!quotationId) return true;

        try {
            const response = await fetch(`/quotation/${quotationId}`);
            if (!response.ok) throw new Error('Failed to fetch quotation');
            const data = await response.json();
            const quotation = data.quotation;

            const projectNameEl = document.getElementById("project-name") as HTMLInputElement | null;
            const buyerNameEl = document.getElementById("buyer-name") as HTMLInputElement | null;
            const buyerAddressEl = document.getElementById("buyer-address") as HTMLInputElement | null;
            const buyerPhoneEl = document.getElementById("buyer-phone") as HTMLInputElement | null;
            const buyerEmailEl = document.getElementById("buyer-email") as HTMLInputElement | null;
            const buyerGstinEl = document.getElementById("buyer-gstin") as HTMLInputElement | null;

            if (projectNameEl) projectNameEl.value = quotation.project_name || '';
            if (buyerNameEl) buyerNameEl.value = quotation.customer_name || '';
            if (buyerAddressEl) buyerAddressEl.value = quotation.customer_address || '';
            if (buyerPhoneEl) buyerPhoneEl.value = quotation.customer_phone || '';
            if (buyerEmailEl) buyerEmailEl.value = quotation.customer_email || '';
            if (buyerGstinEl) buyerGstinEl.value = quotation.customer_GSTIN || '';

            const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement;
            const itemsContainer = document.getElementById("items-container") as HTMLElement;
            const nonItemsTableBody = document.querySelector("#non-items-table tbody") as HTMLTableSectionElement;
            const nonItemsContainer = document.getElementById("non-items-container") as HTMLElement;

            itemsTableBody.innerHTML = "";
            itemsContainer.innerHTML = "";
            nonItemsTableBody.innerHTML = "";
            nonItemsContainer.innerHTML = "";

            let sno = 1;
            (quotation.items || []).forEach((item: any) => {
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${sno}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description || ''}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC || ''}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity || 0}" placeholder="Qty" step="any" min="0.000001" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price || 0}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate || 0}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${sno}</div></td>
                    <td><input type="text" value="${item.description || ''}" required></td>
                    <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                    <td><input type="number" value="${item.quantity || 0}" step="any" min="0.000001" required></td>
                    <td><input type="number" value="${item.unit_price || 0}" required></td>
                    <td><input type="number" value="${item.rate || 0}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                itemsTableBody.appendChild(row);

                const cardInput = card.querySelector('.item-field.description input') as HTMLInputElement | null;
                const cardSuggestions = card.querySelector('.suggestions') as HTMLElement | null;
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', () => showSuggestions(cardInput, cardSuggestions));
                    cardInput.addEventListener('keydown', (e) => handleKeyboardNavigation(e, cardInput, cardSuggestions));
                }

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const qtyInputs = [card.querySelector('.item-field.qty input') as HTMLInputElement | null, row.querySelector('td:nth-child(4) input') as HTMLInputElement | null];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', 'any');
                        input.addEventListener('keypress', (event) => {
                            if (event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', () => {
                            let val = input.value.replace(/[^0-9.]/g, '');
                            const parts = val.split('.');
                            if (parts.length > 2) {
                                val = parts[0] + '.' + parts.slice(1).join('');
                            }
                            input.value = val;
                        });
                    }
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                        updateItemNumbers();
                    });
                }

                sno++;
            });

            (quotation.non_items || []).forEach((item: any) => {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${sno}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description || ''}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price || 0}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate || 0}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${sno}</div></td>
                    <td><input type="text" value="${item.description || ''}" required></td>
                    <td><input type="number" value="${item.price || 0}" required></td>
                    <td><input type="number" value="${item.rate || 0}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                nonItemsTableBody.appendChild(row);

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                    });
                }

                sno++;
            });

            return true;
        } catch (error) {
            console.error("Error importing quotation:", error);
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1("Failed to fetch quotation.");
            }
            return false;
        }
    }
    return true;
};

// Open invoice for editing
const openInvoice = async function (id: string) {
    try {
        const type = sessionStorage.getItem('update-invoice');
        const response = await fetch(`/invoice/${id}`);
        if (!response.ok) throw new Error("Failed to fetch invoice");

        const data = await response.json();
        const invoice = data.invoice as Invoice;

        const homeEl = document.getElementById('home');
        const newEl = document.getElementById('new');
        const newInvoiceEl = document.getElementById('new-invoice');
        const viewPreviewEl = document.getElementById('view-preview');

        if (homeEl) homeEl.style.display = 'none';
        if (newEl) newEl.style.display = 'block';
        if (newInvoiceEl) newInvoiceEl.style.display = 'none';
        if (viewPreviewEl) viewPreviewEl.style.display = 'block';

        changeStep(2);

        const formatDateForInput = (dateString?: string) => {
            if (!dateString) return "";
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const idInput = document.getElementById('id') as HTMLInputElement | null;
        if (idInput) {
            idInput.value = invoice.invoice_id;
        }

        const statusSelect = document.getElementById('invoice-status') as HTMLSelectElement | null;
        if (statusSelect) {
            statusSelect.value = getInvoiceStatus(invoice);
        }

        const quotationIdInput = document.getElementById('quotation-id') as HTMLInputElement | null;
        if (quotationIdInput) quotationIdInput.value = invoice.quotation_id || '';
        const invoiceDateInput = document.getElementById('invoice-date') as HTMLInputElement;
        if (invoiceDateInput) invoiceDateInput.value = formatDateForInput(invoice.invoice_date);
        const projectNameInput = document.getElementById('project-name') as HTMLInputElement;
        if (projectNameInput) projectNameInput.value = invoice.project_name || '';
        const poNumInput = document.getElementById('purchase-order-number') as HTMLInputElement;
        if (poNumInput) poNumInput.value = invoice.po_number || '';
        const poDateInput = document.getElementById('purchase-order-date') as HTMLInputElement;
        if (poDateInput) poDateInput.value = formatDateForInput(invoice.po_date);
        const dcNumInput = document.getElementById('delivery-challan-number') as HTMLInputElement;
        if (dcNumInput) dcNumInput.value = invoice.dc_number || '';
        const dcDateInput = document.getElementById('delivery-challan-date') as HTMLInputElement;
        if (dcDateInput) dcDateInput.value = formatDateForInput(invoice.dc_date);
        const serviceMonthsInput = document.getElementById('service-months') as HTMLInputElement;
        if (serviceMonthsInput) serviceMonthsInput.value = String(invoice.service_after_months || 0);
        const marginInput = document.getElementById('margin') as HTMLInputElement;
        if (marginInput) marginInput.value = String(invoice.margin || 0);
        const buyerCustomerIdInput = document.getElementById('buyer-customer-id') as HTMLInputElement | null;
        if (buyerCustomerIdInput) buyerCustomerIdInput.value = invoice.customer_id || '';
        const buyerNameInput = document.getElementById('buyer-name') as HTMLInputElement;
        if (buyerNameInput) buyerNameInput.value = invoice.customer_snapshot?.name || invoice.customer_name || '';
        const buyerAddressInput = document.getElementById('buyer-address') as HTMLInputElement;
        if (buyerAddressInput) buyerAddressInput.value = invoice.customer_snapshot?.billing_address?.line1 || invoice.customer_address || '';
        const buyerPhoneInput = document.getElementById('buyer-phone') as HTMLInputElement;
        if (buyerPhoneInput) buyerPhoneInput.value = invoice.customer_snapshot?.phone || invoice.customer_phone || '';
        const buyerEmailInput = document.getElementById('buyer-email') as HTMLInputElement;
        if (buyerEmailInput) buyerEmailInput.value = invoice.customer_snapshot?.email || invoice.customer_email || '';
        const buyerGstinInput = document.getElementById('buyer-gstin') as HTMLInputElement;
        if (buyerGstinInput) buyerGstinInput.value = invoice.customer_snapshot?.gstin || invoice.customer_GSTIN || '';
        const consigneeNameInput = document.getElementById('consignee-name') as HTMLInputElement;
        if (consigneeNameInput) consigneeNameInput.value = invoice.consignee?.name || invoice.consignee_name || '';
        const consigneeAddressInput = document.getElementById('consignee-address') as HTMLInputElement;
        if (consigneeAddressInput) consigneeAddressInput.value = invoice.consignee?.address?.line1 || invoice.consignee_address || '';

        currentDeclaration = invoice.declaration || "";
        currentTermsAndConditions = invoice.termsAndConditions || "";

        const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement;
        itemsTableBody.innerHTML = "";
        const itemsContainer = document.getElementById("items-container") as HTMLElement;
        itemsContainer.innerHTML = "";
        const nonItemsTableBody = document.querySelector("#non-items-table tbody") as HTMLTableSectionElement;
        nonItemsTableBody.innerHTML = "";
        const nonItemsContainer = document.getElementById("non-items-container") as HTMLElement;
        nonItemsContainer.innerHTML = "";

        let s = 1;

        if (type === 'original') {
            (invoice.items_original || []).forEach(item => {
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" step="any" min="0.000001" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${s}</div></td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="text" value="${item.HSN_SAC}" required></td>
                    <td><input type="number" value="${item.quantity}" step="any" min="0.000001" required></td>
                    <td><input type="number" value="${item.unit_price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                itemsTableBody.appendChild(row);

                const cardInput = card.querySelector('.item-field.description input') as HTMLInputElement | null;
                const cardSuggestions = card.querySelector('.suggestions') as HTMLElement | null;
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', () => showSuggestions(cardInput, cardSuggestions));
                    cardInput.addEventListener('keydown', (e) => handleKeyboardNavigation(e, cardInput, cardSuggestions));
                }

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const qtyInputs = [card.querySelector('.item-field.qty input') as HTMLInputElement | null, row.querySelector('td:nth-child(4) input') as HTMLInputElement | null];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', 'any');
                        input.addEventListener('keypress', (event) => {
                            if (event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', () => {
                            let val = input.value.replace(/[^0-9.]/g, '');
                            const parts = val.split('.');
                            if (parts.length > 2) {
                                val = parts[0] + '.' + parts.slice(1).join('');
                            }
                            input.value = val;
                        });
                    }
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                        updateItemNumbers();
                    });
                }

                s++;
            });

            (invoice.non_items_original || []).forEach(item => {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${s}</div></td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="number" value="${item.price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                nonItemsTableBody.appendChild(row);

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                    });
                }

                s++;
            });
        } else {
            (invoice.items_duplicate || []).forEach(item => {
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" step="any" min="0.000001" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${s}</td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="text" value="${item.HSN_SAC}" required></td>
                    <td><input type="number" value="${item.quantity}" step="any" min="0.000001" required></td>
                    <td><input type="number" value="${item.unit_price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                itemsTableBody.appendChild(row);

                const cardInput = card.querySelector('.item-field.description input') as HTMLInputElement | null;
                const cardSuggestions = card.querySelector('.suggestions') as HTMLElement | null;
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', () => showSuggestions(cardInput, cardSuggestions));
                    cardInput.addEventListener('keydown', (e) => handleKeyboardNavigation(e, cardInput, cardSuggestions));
                }

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const qtyInputs = [card.querySelector('.item-field.qty input') as HTMLInputElement | null, row.querySelector('td:nth-child(4) input') as HTMLInputElement | null];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', 'any');
                        input.addEventListener('keypress', (event) => {
                            if (event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', () => {
                            let val = input.value.replace(/[^0-9.]/g, '');
                            const parts = val.split('.');
                            if (parts.length > 2) {
                                val = parts[0] + '.' + parts.slice(1).join('');
                            }
                            input.value = val;
                        });
                    }
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                        updateItemNumbers();
                    });
                }

                s++;
            });

            (invoice.non_items_duplicate || []).forEach(item => {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${s}</td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="number" value="${item.price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                nonItemsTableBody.appendChild(row);

                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                const removeBtn = card.querySelector(".remove-item-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        card.remove();
                        row.remove();
                    });
                }

                s++;
            });
        }
    } catch (error) {
        console.error("Error fetching invoice:", error);
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
        }
    }
};

const getId = async function () {
    try {
        const response = await fetch("/invoice/generate-id");
        if (!response.ok) throw new Error("Failed to fetch invoice id");

        const data = await response.json();
        const idInput = document.getElementById('id') as HTMLInputElement | null;
        if (idInput) idInput.value = data.invoice_id;
        invoiceId = data.invoice_id;
        if (invoiceId) generatePreview();
    } catch (error) {
        console.error("Error fetching invoice id:", error);
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1("Failed to fetch invoice id. Please try again later.");
        }
    }
};

// Calculate Invoice calculations
const calculateInvoice = function (itemsTable: HTMLTableSectionElement) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let sno = 1;
    let itemsHTML = "";

    const hasTax = Array.from(itemsTable.rows).some(row => parseFloat((row.cells[5]?.querySelector("input") as HTMLInputElement | null)?.value || '0') > 0);

    for (let index = 0; index < itemsTable.rows.length; index++) {
        const row = itemsTable.rows[index];
        const description = (row.cells[1].querySelector("input") as HTMLInputElement).value || "-";
        const hsnSac = (row.cells[2].querySelector("input") as HTMLInputElement).value || "-";
        const qty = parseFloat((row.cells[3].querySelector("input") as HTMLInputElement).value || "0");
        const unitPrice = parseFloat((row.cells[4].querySelector("input") as HTMLInputElement).value || "0");
        const rate = parseFloat((row.cells[5].querySelector("input") as HTMLInputElement).value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
            sno++;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${sno}</td>   
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
            sno++;
        }
    }

    const nonItemsTable = document.querySelector('#non-items-table tbody') as HTMLTableSectionElement;
    if (nonItemsTable) {
        const rows = Array.from(nonItemsTable.querySelectorAll('tr'));
        for (const row of rows) {
            const description = (row.cells[1].querySelector("input") as HTMLInputElement).value || "-";
            const unitPrice = parseFloat((row.cells[2].querySelector("input") as HTMLInputElement).value || "0");
            const rate = parseFloat((row.cells[3].querySelector("input") as HTMLInputElement).value || "0");

            totalTaxableValue += unitPrice;

            if (hasTax) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (unitPrice * cgstPercent) / 100;
                const sgstValue = (unitPrice * sgstPercent) / 100;
                const rowTotal = unitPrice + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                totalPrice += rowTotal;

                itemsHTML += `
                <tr>
                    <td>${sno}</td>
                    <td>${description}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
                sno++;
            } else {
                const rowTotal = unitPrice;
                totalPrice += rowTotal;

                itemsHTML += `
                <tr>
                    <td>${sno}</td>
                    <td>${description}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
                sno++;
            }
        }
    }

    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;

    const type = sessionStorage.getItem('update-invoice');
    if (type === 'original') {
        totalAmountOriginal = Number(finalTotal.toFixed(2));
        totalTaxOriginal = Number((totalCGST + totalSGST).toFixed(2));
    } else if (type === 'duplicate') {
        totalAmountDuplicate = Number(finalTotal.toFixed(2));
        totalTaxDuplicate = Number((totalCGST + totalSGST).toFixed(2));
    }

    const totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(finalTotal, 2)}</p>
            </div>
        </div>
    `;

    return {
        totalPrice,
        totalCGST,
        totalSGST,
        totalTaxableValue,
        roundOff,
        grandTotal,
        finalTotal,
        itemsHTML,
        totalsHTML,
        hasTax
    };
};

const generatePreview = async function () {
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
        const declarationEl = previewContainer.querySelector('.declaration') as HTMLElement | null;
        const termsEl = previewContainer.querySelector('.terms-section') as HTMLElement | null;

        if (declarationEl && declarationEl.innerHTML.trim() !== "") {
            currentDeclaration = declarationEl.innerHTML;
        }
        if (termsEl && termsEl.innerHTML.trim() !== "") {
            currentTermsAndConditions = termsEl.innerHTML;
        }
    }

    const companyInfo = (await (window as any).companyConfig.getCompanyInfo()) || {};
    const company = {
        company: companyInfo.company_name || 'SHRESHT SYSTEMS',
        address: typeof companyInfo.address === 'string'
            ? companyInfo.address
            : [
                companyInfo.address?.line1,
                companyInfo.address?.line2,
                companyInfo.address?.city,
                companyInfo.address?.state ? companyInfo.address.state + (companyInfo.address.pincode ? ' - ' + companyInfo.address.pincode : '') : ''
              ].filter(Boolean).join(', '),
        phone: companyInfo.phone || { ph1: '0000000000', ph2: '' },
        GSTIN: companyInfo.gstin || '',
        email: companyInfo.email || '',
        website: companyInfo.website || '',
        bank_details: {
            name: companyInfo.bank_details?.account_holder_name || companyInfo.company_name || 'SHRESHT SYSTEMS',
            bank_name: companyInfo.bank_details?.bank_name || '',
            branch: companyInfo.bank_details?.branch || '',
            accountNo: companyInfo.bank_details?.account_number || '',
            IFSC_code: companyInfo.bank_details?.ifsc_code || ''
        }
    };
    const bank = company.bank_details;

    const idValEl = document.getElementById('id') as HTMLInputElement | null;
    if (!invoiceId && idValEl) invoiceId = idValEl.value;
    const projectName = (document.getElementById("project-name") as HTMLInputElement).value;
    const poNumber = (document.getElementById("purchase-order-number") as HTMLInputElement).value || '';
    const dcNumber = (document.getElementById("delivery-challan-number") as HTMLInputElement).value || '';
    const buyerName = (document.getElementById("buyer-name") as HTMLInputElement).value;
    const invoiceDate = (document.getElementById('invoice-date') as HTMLInputElement | null)?.value || '';
    const buyerAddress = (document.getElementById("buyer-address") as HTMLInputElement).value;
    const buyerPhone = (document.getElementById("buyer-phone") as HTMLInputElement).value;
    const buyerGSTIN = (document.getElementById("buyer-gstin") as HTMLInputElement).value || '';
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0] as HTMLTableSectionElement;

    if (!itemsTable) return;

    const {
        itemsHTML,
        totalsHTML,
        finalTotal,
        hasTax
    } = calculateInvoice(itemsTable);

    const itemRows = itemsHTML.split('</tr>').filter(row => row.trim().length > 0).map(row => row + '</tr>');

    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;

    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    itemRows.forEach((row, index) => {
        const isLastItem = index === itemRows.length - 1;
        const itemSpace = 1;
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {
            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += row;
        currentPageRowCount += itemSpace;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    const pagesHTML = itemPages.map((pageHTML, index) => {
        const isLastPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-standard doc-quotation">
            <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="${company.company} Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>${company.company.toUpperCase()}</h1>
                <p class="quotation-tagline">CCTV & Energy Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>${company.address}</p>
            <p>Ph: ${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}</p>
            <p>GSTIN: ${company.GSTIN}</p>
            <p>Email: ${company.email}</p>
            <p>Website: ${company.website}</p>
        </div>
    </div>

            <div class="second-section">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <p>INVOICE-${invoiceId}</p>
                    <p><strong>Date: </strong>${formatDateIndian(invoiceDate) || '-'}</p>
                </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Bill To:</strong></p>
                    <p>${buyerName}</p>
                    <p>${buyerAddress}</p>
                    <p>Ph. ${buyerPhone}</p>
                    ${buyerGSTIN ? `<p>GSTIN: ${buyerGSTIN}</p>` : ''}
                </div>
                <div class="info-section">
                    <p><strong>Project:</strong> ${projectName || '-'}</p>
                    <p><strong>P.O No:</strong> ${poNumber || '-'}</p>
                    <p><strong>D.C No:</strong> ${dcNumber || '-'}</p>
                </div>
            </div>
            ` : ''}

            <div class="fourth-section">
                <table>
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            ${hasTax ? `
                            <th>Taxable Value (₹)</th>
                            <th>Tax Rate (%)</th> ` : ""}
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastPage ? `<div class="continuation-text" style="text-align: center; margin: 20px 0; font-style: italic; color: #666;">Continued on next page...</div>` : ''}

            ${isLastPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(finalTotal)} Only.
                            </span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.name || company.company}</p>
                                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                                <p><strong>Account No: </strong>${bank.accountNo || ''}</p>
                                <p><strong>IFSC Code: </strong>${bank.IFSC_code || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>

            <div class="sixth-section">
                <div class="declaration" contenteditable="true">
                    ${currentDeclaration ? currentDeclaration : `<p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>`}
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    ${currentTermsAndConditions ? currentTermsAndConditions : `
                    <h4>Terms & Conditions:</h4>
                    <p>1. Payment should be made within 15 days from the date of invoice.</p>
                    <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                    <p>3. Goods once sold will not be taken back.</p>`}
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${company.company.toUpperCase()}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated invoice.</p>
            </div>
        </div>
        `;
    }).join('');

    const previewEl = document.getElementById("preview-content");
    if (previewEl) previewEl.innerHTML = pagesHTML;
};

const collectFormData = function () {
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0] as HTMLTableSectionElement;
    if (itemsTable) {
        calculateInvoice(itemsTable);
    }

    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
        const declarationEl = previewContainer.querySelector('.declaration');
        const termsEl = previewContainer.querySelector('.terms-section');

        if (declarationEl) currentDeclaration = declarationEl.innerHTML;
        if (termsEl) currentTermsAndConditions = termsEl.innerHTML;
    }

    const idInput = document.getElementById("id") as HTMLInputElement;
    const quoteIdInput = document.getElementById("quotation-id") as HTMLInputElement | null;
    const invDateInput = document.getElementById("invoice-date") as HTMLInputElement;
    const poNumInput = document.getElementById("purchase-order-number") as HTMLInputElement;
    const poDateInput = document.getElementById("purchase-order-date") as HTMLInputElement;
    const dcNumInput = document.getElementById("delivery-challan-number") as HTMLInputElement;
    const dcDateInput = document.getElementById("delivery-challan-date") as HTMLInputElement;
    const serviceMonthsInput = document.getElementById("service-months") as HTMLInputElement;
    const marginInput = document.getElementById("margin") as HTMLInputElement;
    const buyerNameInput = document.getElementById("buyer-name") as HTMLInputElement;
    const buyerAddressInput = document.getElementById("buyer-address") as HTMLInputElement;
    const buyerPhoneInput = document.getElementById("buyer-phone") as HTMLInputElement;
    const buyerEmailInput = document.getElementById("buyer-email") as HTMLInputElement;
    const buyerGstinInput = document.getElementById("buyer-gstin") as HTMLInputElement;
    const consigneeNameInput = document.getElementById("consignee-name") as HTMLInputElement;
    const consigneeAddressInput = document.getElementById("consignee-address") as HTMLInputElement;

    const buyerCustomerIdInput = document.getElementById("buyer-customer-id") as HTMLInputElement | null;
    const statusInput = document.getElementById("invoice-status") as HTMLSelectElement | null;

    return {
        type: sessionStorage.getItem('update-invoice'),
        projectName: document.getElementById("project-name") ? (document.getElementById("project-name") as HTMLInputElement).value : '',
        invoiceId: idInput ? idInput.value : '',
        status: statusInput ? statusInput.value as InvoiceStatus : undefined,
        buyerCustomerId: buyerCustomerIdInput ? buyerCustomerIdInput.value : '',
        quotationId: quoteIdInput ? quoteIdInput.value : '',
        invoiceDate: invDateInput ? invDateInput.value : '',
        poNumber: poNumInput ? poNumInput.value : '',
        poDate: poDateInput && poDateInput.value ? poDateInput.value : null,
        dcNumber: dcNumInput ? dcNumInput.value : '',
        dcDate: dcDateInput ? dcDateInput.value : '',
        serviceAfterMonths: serviceMonthsInput ? Number(serviceMonthsInput.value) || 0 : 0,
        margin: marginInput ? Number(marginInput.value) || 0 : 0,
        buyerName: buyerNameInput ? buyerNameInput.value : '',
        buyerAddress: buyerAddressInput ? buyerAddressInput.value : '',
        buyerPhone: buyerPhoneInput ? buyerPhoneInput.value : '',
        buyerEmail: buyerEmailInput ? buyerEmailInput.value : '',
        buyerGSTIN: buyerGstinInput ? buyerGstinInput.value : '',
        consigneeName: consigneeNameInput ? consigneeNameInput.value : '',
        consigneeAddress: consigneeAddressInput ? consigneeAddressInput.value : '',
        declaration: currentDeclaration,
        termsAndConditions: currentTermsAndConditions,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: (row.querySelector("td:nth-child(2) input") as HTMLInputElement).value,
            HSN_SAC: (row.querySelector("td:nth-child(3) input") as HTMLInputElement).value,
            quantity: Number((row.querySelector("td:nth-child(4) input") as HTMLInputElement).value) || 0,
            unit_price: Number((row.querySelector("td:nth-child(5) input") as HTMLInputElement).value) || 0,
            rate: Number((row.querySelector("td:nth-child(6) input") as HTMLInputElement).value) || 0,
        })),
        non_items: Array.from(document.querySelectorAll("#non-items-table tbody tr")).map(row => ({
            description: (row.querySelector("td:nth-child(2) input") as HTMLInputElement).value,
            price: Number((row.querySelector("td:nth-child(3) input") as HTMLInputElement).value) || 0,
            rate: Number((row.querySelector("td:nth-child(4) input") as HTMLInputElement).value) || 0,
        })),
        totalAmountOriginal: totalAmountOriginal,
        totalAmountDuplicate: totalAmountDuplicate,
        totalTaxOriginal: totalTaxOriginal,
        totalTaxDuplicate: totalTaxDuplicate
    };
};

// Expose functions on window for general orchestration
(window as any).validateCurrentStep = validateCurrentStep;
(window as any).beforeStepAdvance = beforeStepAdvance;
(window as any).openInvoice = openInvoice;
(window as any).calculateInvoice = calculateInvoice;
(window as any).generatePreview = generatePreview;
(window as any).getId = getId;
})();
