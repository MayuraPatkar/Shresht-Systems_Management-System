// @ts-nocheck
(function () {
    // Define totalSteps globally for purchaseOrder
    (window as any).totalSteps = 3;

    // Bind currentStep property on window to sync with the global declarative currentStep
    declare let currentStep: number;
    if (typeof (window as any).currentStep === 'undefined') {
        Object.defineProperty(window, 'currentStep', {
            get: () => currentStep,
            set: (val) => { currentStep = val; },
            configurable: true
        });
    }

    let purchaseOrderId = '';
    let totalAmount = 0;

    // Autocomplete data
    let supplierData: any[] = [];
    let supplierNames: string[] = [];
    let selectedSupplierIndex = -1;
    let companySuggestionList: string[] = [];
    let categorySuggestionList: string[] = [];
    let stockNames: string[] = [];
    let isAutofillInProgressPO = false;
    let POItemSelectedIndex = -1;

    // Helper functions for autocomplete
    function closeAllSuggestions() {
        const allSuggestions = document.querySelectorAll('.suggestions');
        allSuggestions.forEach((ul: HTMLElement) => {
            ul.style.display = 'none';
        });
    }

    async function fetchStockNames() {
        try {
            const response = await fetch('/stock/get-names');
            if (response.ok) {
                stockNames = await response.json();
            }
        } catch (error) {
            console.error("Error fetching stock names:", error);
        }
    }

    async function fetchCompanyAndCategorySuggestions() {
        try {
            const response = await fetch("/stock/all");
            if (!response.ok) throw new Error("Failed to fetch stock items");
            const data = await response.json();

            // Extract unique companies and categories
            const companies = new Set<string>();
            const categories = new Set<string>();

            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    if (item.company && item.company.trim() !== '') {
                        companies.add(item.company.trim());
                    }
                    if (item.category && item.category.trim() !== '') {
                        categories.add(item.category.trim());
                    }
                });
            }

            companySuggestionList = Array.from(companies).sort();
            categorySuggestionList = Array.from(categories).sort();
        } catch (error) {
            console.error("Error fetching generic suggestions:", error);
        }
    }

    function setupGenericAutocomplete(input: HTMLInputElement, dataList: string[]) {
        let currentFocus = -1;

        let suggestionsContainer = input.nextElementSibling as HTMLElement;
        if (!suggestionsContainer || !suggestionsContainer.classList.contains('suggestions')) {
            suggestionsContainer = document.createElement('ul');
            suggestionsContainer.className = 'suggestions';
            input.parentNode?.insertBefore(suggestionsContainer, input.nextSibling);
        }

        input.addEventListener('input', function () {
            if (isAutofillInProgressPO) return;
            const val = this.value;
            closeAllSuggestions();
            if (!val) return false;
            currentFocus = -1;
            suggestionsContainer.innerHTML = '';

            let hasMatches = false;

            for (let i = 0; i < dataList.length; i++) {
                if (dataList[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                    hasMatches = true;
                    const li = document.createElement('li');
                    li.innerHTML = "<strong>" + dataList[i].substr(0, val.length) + "</strong>";
                    li.innerHTML += dataList[i].substr(val.length);
                    li.innerHTML += "<input type='hidden' value='" + dataList[i] + "'>";
                    li.addEventListener('click', function (e) {
                        input.value = this.getElementsByTagName("input")[0].value;
                        closeAllSuggestions();

                        // Trigger input event to sync card/table inputs if needed
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                    suggestionsContainer.appendChild(li);
                }
            }

            if (hasMatches) {
                suggestionsContainer.style.display = 'block';
            }
        });

        input.addEventListener('keydown', function (e) {
            let x = suggestionsContainer.getElementsByTagName("li");
            if (e.key === "ArrowDown") {
                e.preventDefault();
                e.stopPropagation();
                currentFocus++;
                addActive(x);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                currentFocus--;
                addActive(x);
            } else if (e.key === "Enter") {
                if (currentFocus > -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (x) (x[currentFocus] as HTMLElement).click();
                }
            }
        });

        function addActive(x: HTMLCollectionOf<HTMLLIElement>) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("active");

            x[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(x: HTMLCollectionOf<HTMLLIElement>) {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove("active");
            }
        }

        input.addEventListener('blur', function () {
            setTimeout(closeAllSuggestions, 200);
        });

        input.addEventListener('focus', function () {
            if (this.value) {
                this.dispatchEvent(new Event('input'));
            } else if (dataList.length > 0) {
                // Show all if empty
                closeAllSuggestions();
                currentFocus = -1;
                suggestionsContainer.innerHTML = '';

                for (let i = 0; i < Math.min(dataList.length, 10); i++) {
                    const li = document.createElement('li');
                    li.innerHTML = dataList[i];
                    li.innerHTML += "<input type='hidden' value='" + dataList[i] + "'>";
                    li.addEventListener('click', function (e) {
                        input.value = this.getElementsByTagName("input")[0].value;
                        closeAllSuggestions();
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                    suggestionsContainer.appendChild(li);
                }
                suggestionsContainer.style.display = 'block';
            }
        });
    }

    function renderSupplierProfileCard() {
        const container = document.getElementById('supplier-profile-card-container');
        if (!container) return;

        const supplierSearchInput = document.getElementById('supplier-search-input') as HTMLInputElement | null;
        const supplierIdInput = document.getElementById('supplier-id') as HTMLInputElement | null;
        const line1 = (document.getElementById('supplier-address-line1') as HTMLInputElement | null)?.value || '';
        const line2 = (document.getElementById('supplier-address-line2') as HTMLInputElement | null)?.value || '';
        const city = (document.getElementById('supplier-address-city') as HTMLInputElement | null)?.value || '';
        const state = (document.getElementById('supplier-address-state') as HTMLSelectElement | null)?.value || '';
        const pincode = (document.getElementById('supplier-address-pincode') as HTMLInputElement | null)?.value || '';
        const phone = (document.getElementById('supplier-phone') as HTMLInputElement | null)?.value || '';
        const email = (document.getElementById('supplier-email') as HTMLInputElement | null)?.value || '';
        const gstin = (document.getElementById('supplier-GSTIN') as HTMLInputElement | null)?.value || '';

        const hasSupplierSelected = supplierIdInput && supplierIdInput.value.trim() !== '';

        if (!hasSupplierSelected || !supplierSearchInput || !supplierSearchInput.value.trim()) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-center fade-in">
                    <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 mb-3">
                        <i class="fas fa-truck text-xl"></i>
                    </div>
                    <p class="text-sm font-semibold text-gray-700">No Supplier Selected</p>
                    <p class="text-xs text-gray-400 mt-1 max-w-sm">Please search and select a supplier profile in the search input above to view details.</p>
                </div>
            `;
            container.classList.remove('hidden');
            return;
        }

        const fullAddress = [line1, line2, city, state, pincode].filter(val => val.trim() !== '').join(', ');

        container.innerHTML = `
            <div class="bg-purple-50/40 rounded-xl p-5 border border-purple-100 flex flex-col md:flex-row gap-6 md:justify-between items-start fade-in">
                <div class="space-y-3 flex-1 w-full">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-base font-bold text-gray-900">${supplierSearchInput.value}</h3>
                    </div>
                    <div class="text-sm text-gray-600 space-y-2">
                        <p class="flex items-start gap-2">
                            <i class="fas fa-map-marker-alt text-purple-500 mt-1 flex-shrink-0 w-4 text-center"></i>
                            <span class="leading-relaxed">${fullAddress || 'No Address Provided'}</span>
                        </p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-purple-100/50 w-full">
                            <p class="flex items-center gap-2">
                                <i class="fas fa-phone text-purple-500 flex-shrink-0 w-4 text-center"></i>
                                <span>${phone || 'No Phone Number'}</span>
                            </p>
                            <p class="flex items-center gap-2">
                                <i class="fas fa-envelope text-purple-500 flex-shrink-0 w-4 text-center"></i>
                                <span class="break-all">${email || 'No Email Address'}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-3 border border-purple-100 flex flex-col justify-center items-start min-w-[180px] w-full md:w-auto shadow-sm">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GSTIN</span>
                    <span class="text-sm font-bold text-gray-800 mt-1">${gstin || 'N/A'}</span>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    }

    function setupSupplierAutocomplete() {
        const input = document.getElementById('supplier-search-input') as HTMLInputElement;
        const suggestionsList = document.getElementById('supplier-suggestions') as HTMLElement;
        if (!input || !suggestionsList) return;

        let debounceTimer: any;
        let selectedIndex = -1;
        let currentSuppliers: any[] = [];

        async function fetchSuppliers(query: string) {
            try {
                const response = await fetch(`/api/suppliers?search=${encodeURIComponent(query)}`);
                return await response.json();
            } catch (err) {
                console.error('Failed to fetch suppliers:', err);
                return [];
            }
        }

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim();
            
            // Clear hidden ID when input changes manually
            const idInput = document.getElementById('supplier-id') as HTMLInputElement | null;
            if (idInput) idInput.value = '';
            
            // Instantly re-render profile card to show empty placeholder
            renderSupplierProfileCard();
            
            if (query.length < 2) {
                suggestionsList.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                currentSuppliers = await fetchSuppliers(query);
                suggestionsList.innerHTML = '';
                selectedIndex = -1;

                if (currentSuppliers.length === 0) {
                    suggestionsList.style.display = 'none';
                    return;
                }

                suggestionsList.style.display = 'block';
                
                currentSuppliers.forEach((supplier, index) => {
                    const li = document.createElement('li');
                    li.className = 'px-4 py-2.5 hover:bg-purple-50/70 cursor-pointer border-b border-gray-100 last:border-0 transition-colors duration-150';
                    
                    const name = supplier.supplier_name || 'Unknown';
                    const phone = supplier.phone || '';
                    const email = supplier.email || '';
                    const gstin = supplier.gstin || '';
                    
                    let metaParts: string[] = [];
                    if (phone) metaParts.push(`<span class="inline-flex items-center"><i class="fas fa-phone text-gray-400 mr-1 text-[10px]"></i>${phone}</span>`);
                    if (email) metaParts.push(`<span class="inline-flex items-center"><i class="fas fa-envelope text-gray-400 mr-1 text-[10px]"></i>${email}</span>`);
                    if (gstin) metaParts.push(`<span class="inline-flex items-center bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-purple-100">GSTIN: ${gstin}</span>`);
                    
                    li.innerHTML = `
                        <div class="font-medium text-gray-800 text-sm">${name}</div>
                        ${metaParts.length > 0 ? `<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gray-500">${metaParts.join('<span class="text-gray-300">•</span>')}</div>` : ''}
                    `;
                    
                    li.onclick = () => selectSupplier(supplier);
                    suggestionsList.appendChild(li);
                });
            }, 300);
        });

        input.addEventListener('keydown', (e) => {
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
                    selectSupplier(currentSuppliers[selectedIndex]);
                } else if (currentSuppliers.length > 0) {
                    selectSupplier(currentSuppliers[0]);
                }
            }
        });

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

        function selectSupplier(supplier: any) {
            input.value = supplier.supplier_name || '';
            
            // Populate other fields
            const idInput = document.getElementById('supplier-id') as HTMLInputElement | null;
            const nameInput = document.getElementById('supplier-name') as HTMLInputElement | null;
            const line1Input = document.getElementById('supplier-address-line1') as HTMLInputElement | null;
            const line2Input = document.getElementById('supplier-address-line2') as HTMLInputElement | null;
            const cityInput = document.getElementById('supplier-address-city') as HTMLInputElement | null;
            const stateInput = document.getElementById('supplier-address-state') as HTMLSelectElement | null;
            const pincodeInput = document.getElementById('supplier-address-pincode') as HTMLInputElement | null;
            const phoneInput = document.getElementById('supplier-phone') as HTMLInputElement | null;
            const emailInput = document.getElementById('supplier-email') as HTMLInputElement | null;
            const gstinInput = document.getElementById('supplier-GSTIN') as HTMLInputElement | null;

            if (idInput) idInput.value = supplier._id || '';
            if (nameInput) nameInput.value = supplier.supplier_name || '';
            
            if (supplier.billing_address) {
                const billing = supplier.billing_address;
                if (line1Input) line1Input.value = billing.line1 || '';
                if (line2Input) line2Input.value = billing.line2 || '';
                if (cityInput) cityInput.value = billing.city || '';
                if (stateInput) stateInput.value = billing.state || 'Karnataka';
                if (pincodeInput) pincodeInput.value = billing.pincode || '';
            } else {
                if (line1Input) line1Input.value = supplier.address?.line1 || '';
                if (line2Input) line2Input.value = supplier.address?.line2 || '';
                if (cityInput) cityInput.value = supplier.address?.city || '';
                if (stateInput) stateInput.value = supplier.address?.state || 'Karnataka';
                if (pincodeInput) pincodeInput.value = supplier.address?.pincode || '';
            }
            if (phoneInput) phoneInput.value = supplier.phone || '';
            if (emailInput) emailInput.value = supplier.email || '';
            if (gstinInput) gstinInput.value = supplier.gstin || '';

            suggestionsList.style.display = 'none';

            // Render profile card
            renderSupplierProfileCard();
        }
    }

    function showSuggestionsPO(input: HTMLInputElement, suggestionsList: HTMLUListElement) {
        if (isAutofillInProgressPO) return;
        closeAllSuggestions();

        const value = input.value.toLowerCase().trim();
        suggestionsList.innerHTML = "";

        if (!value) {
            suggestionsList.style.display = "none";
            return;
        }

        POItemSelectedIndex = -1; // Reset index when showing new suggestions
        const filteredData = stockNames.filter((name: string) => name && name.toLowerCase().includes(value));

        filteredData.forEach((name: string) => {
            const li = document.createElement("li");
            li.textContent = name;
            li.addEventListener("click", async () => {
                input.value = name;
                suggestionsList.style.display = "none";
                isAutofillInProgressPO = true;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                isAutofillInProgressPO = false;
                await fillPurchaseOrderItem(name, input);
            });
            suggestionsList.appendChild(li);
        });

        if (filteredData.length > 0) {
            suggestionsList.style.display = "block";
        } else {
            suggestionsList.style.display = "none";
        }
    }

    async function handleKeyboardNavigationPO(event: KeyboardEvent, input: HTMLInputElement, suggestionsList: HTMLUListElement) {
        const items = Array.from(suggestionsList.querySelectorAll("li"));
        if (items.length === 0 || suggestionsList.style.display === "none") return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            POItemSelectedIndex = (POItemSelectedIndex + 1) % items.length;
            input.value = items[POItemSelectedIndex].textContent || "";
            updateSelection();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            POItemSelectedIndex = (POItemSelectedIndex - 1 + items.length) % items.length;
            input.value = items[POItemSelectedIndex].textContent || "";
            updateSelection();
        } else if (event.key === "Enter") {
            if (POItemSelectedIndex >= 0 && items[POItemSelectedIndex]) {
                event.preventDefault();
                event.stopPropagation();

                const selectedItem = items[POItemSelectedIndex].textContent || "";
                input.value = selectedItem;
                suggestionsList.style.display = "none";

                isAutofillInProgressPO = true;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                isAutofillInProgressPO = false;

                const parent = input.closest('.item-card') || input.closest('tr');
                if (parent) {
                    await fillPurchaseOrderItem(selectedItem, parent);
                }

                POItemSelectedIndex = -1;
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            suggestionsList.style.display = "none";
        }

        function updateSelection() {
            items.forEach((item, index) => {
                const isSelected = index === POItemSelectedIndex;
                item.classList.toggle("selected", isSelected);
                if (isSelected) {
                    item.scrollIntoView({ block: 'nearest' });
                }
            });
        }
    }

    async function fillPurchaseOrderItem(itemName: string, element: HTMLElement) {
        try {
            isAutofillInProgressPO = true;

            const stockData = await (window as any).fetchStockData(itemName);

            if (stockData) {
                let card = element.closest('.item-card') as HTMLDivElement | null;
                let tr = element.closest('tr') as HTMLTableRowElement | null;

                if (card && !tr) {
                    const cardIndex = Array.from(document.querySelectorAll('#items-container .item-card')).indexOf(card);
                    tr = document.querySelector(`#items-table tbody tr:nth-child(${cardIndex + 1})`) as HTMLTableRowElement;
                } else if (tr && !card) {
                    const trIndex = Array.from(document.querySelectorAll('#items-table tbody tr')).indexOf(tr);
                    card = document.querySelector(`#items-container .item-card:nth-child(${trIndex + 1})`) as HTMLDivElement;
                }

                const hsnVal = stockData.hsn_sac ?? stockData.HSN_SAC ?? stockData.hsn_code ?? '';
                const brandVal = stockData.brand ?? stockData.company ?? '';
                const typeVal = stockData.item_type ?? stockData.type ?? 'Material';
                const categoryVal = stockData.category ?? '';
                const unitVal = stockData.unit || '';

                let unitPriceVal = '';
                const rawPrice = stockData.purchase_price ?? stockData.unit_price ?? stockData.unitPrice ?? stockData.mrp;
                if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
                    const parsed = parseFloat(rawPrice);
                    if (!isNaN(parsed)) {
                        unitPriceVal = parsed.toFixed(2);
                    }
                }

                let gstVal = '';
                const rawGst = stockData.gst_rate ?? stockData.GST ?? stockData.gst;
                if (rawGst !== undefined && rawGst !== null && rawGst !== '') {
                    gstVal = rawGst.toString();
                }

                if (card) {
                    const hsnInput = card.querySelector('.item-field.hsn input') as HTMLInputElement;
                    const brandInput = card.querySelector('.item-company') as HTMLInputElement;
                    const typeSelect = card.querySelector('.item-row-2 select') as HTMLSelectElement;
                    const categoryInput = card.querySelector('.item-category') as HTMLInputElement;
                    const priceInput = card.querySelector('input[placeholder="Unit Price"]') as HTMLInputElement;
                    const gstInput = card.querySelector('input[placeholder="GST %"]') as HTMLInputElement;
                    const unitSelect = card.querySelector('.item-unit') as HTMLSelectElement;

                    if (hsnInput) hsnInput.value = hsnVal;
                    if (brandInput) brandInput.value = brandVal;
                    if (typeSelect) typeSelect.value = typeVal;
                    if (categoryInput) categoryInput.value = categoryVal;
                    if (priceInput) priceInput.value = unitPriceVal;
                    if (gstInput) gstInput.value = gstVal;
                    if (unitSelect) {
                        unitSelect.value = unitVal;
                        unitSelect.dispatchEvent(new Event('change'));
                    }
                }

                if (tr) {
                    const hsnInput = tr.querySelector('td:nth-child(3) input') as HTMLInputElement;
                    const unitSelect = tr.querySelector('td:nth-child(5) select') as HTMLSelectElement;
                    const priceInput = tr.querySelector('td:nth-child(6) input') as HTMLInputElement;
                    const gstInput = tr.querySelector('td:nth-child(7) input') as HTMLInputElement;

                    if (hsnInput) hsnInput.value = hsnVal;
                    if (unitSelect) {
                        unitSelect.value = unitVal;
                        unitSelect.dispatchEvent(new Event('change'));
                    }
                    if (priceInput) priceInput.value = unitPriceVal;
                    if (gstInput) gstInput.value = gstVal;
                }
            }
        } catch (error) {
            console.error("Error filling purchase order item:", error);
        } finally {
            isAutofillInProgressPO = false;
        }
    }

    function setupPOQuantityDecimalSupport(card: HTMLElement, row: HTMLElement): void {
        const cardUnitSelect = card.querySelector('.item-unit') as HTMLSelectElement | null;
        const tableUnitSelect = row.querySelector('.item-unit') as HTMLSelectElement | null;
        const cardQtyInput = card.querySelector('.item-field.qty input') as HTMLInputElement | null;
        const tableQtyInput = row.querySelector('td:nth-child(4) input') as HTMLInputElement | null;

        if (!cardQtyInput || !tableQtyInput) return;

        function applyConstraints(unit: string) {
            const isPc = unit === 'pc';
            [cardQtyInput, tableQtyInput].forEach(input => {
                if (!input) return;
                if (isPc) {
                    input.setAttribute('step', '1');
                    input.setAttribute('min', '1');
                    input.setAttribute('data-integer-only', 'true');
                } else {
                    input.setAttribute('step', '0.01');
                    input.setAttribute('min', '0.01');
                    input.removeAttribute('data-integer-only');
                }
            });
        }

        function handleUnitChange(unitValue: string) {
            applyConstraints(unitValue);
            if (unitValue === 'pc') {
                [cardQtyInput, tableQtyInput].forEach(input => {
                    if (input && input.value !== '') {
                        const rounded = Math.round(parseFloat(input.value)) || 1;
                        input.value = String(rounded < 1 ? 1 : rounded);
                    }
                });
            }
        }

        if (cardUnitSelect) {
            cardUnitSelect.addEventListener('change', () => handleUnitChange(cardUnitSelect.value));
        }
        if (tableUnitSelect) {
            tableUnitSelect.addEventListener('change', () => handleUnitChange(tableUnitSelect.value));
        }

        // Keypress and input validators that adapt dynamically based on unit attribute
        [cardQtyInput, tableQtyInput].forEach(input => {
            if (!input) return;

            input.addEventListener('keypress', (event: KeyboardEvent) => {
                const isIntegerOnly = input.getAttribute('data-integer-only') === 'true';
                if (isIntegerOnly) {
                    if (event.key.length === 1 && (event.key < '0' || event.key > '9')) {
                        event.preventDefault();
                    }
                } else {
                    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
                        event.preventDefault();
                    }
                }
            });

            input.addEventListener('input', () => {
                const isIntegerOnly = input.getAttribute('data-integer-only') === 'true';
                if (isIntegerOnly) {
                    input.value = input.value.replace(/[^0-9]/g, '');
                } else {
                    let sanitized = input.value.replace(/[^0-9.]/g, '');
                    const parts = sanitized.split('.');
                    if (parts.length > 2) {
                        sanitized = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (input.value !== sanitized) {
                        input.value = sanitized;
                    }
                }
            });
        });

        // Initial run
        const initialUnit = cardUnitSelect?.value || tableUnitSelect?.value || 'pc';
        applyConstraints(initialUnit);
    }

    async function openPurchaseOrder(id: string) {
        try {
            let data;
            if ((window as any).purchaseOrderApi) {
                data = await (window as any).purchaseOrderApi.fetchPurchaseOrderById(id);
            } else {
                const response = await fetch(`/purchaseOrder/${id}`);
                if (!response.ok) throw new Error("Failed to fetch purchase order");
                data = await response.json();
            }

            const purchaseOrder = data.purchaseOrder;

            const isClone = sessionStorage.getItem('currentTab-status') === 'clone';

            if (isClone) {
                if ((window as any).purchaseOrderApi) {
                    const newIdData = await (window as any).purchaseOrderApi.generateId();
                    (document.getElementById("id") as HTMLInputElement).value = newIdData.purchase_order_no;
                    purchaseOrderId = newIdData.purchase_order_no;
                } else {
                    await getId();
                }
                const today = (window as any).getTodayForInput ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
                (document.getElementById("purchase-date") as HTMLInputElement).value = today;
            } else {
                (document.getElementById("id") as HTMLInputElement).value = purchaseOrder.purchase_order_no || "";
                purchaseOrderId = purchaseOrder.purchase_order_no;

                const purchaseDateStr = purchaseOrder.purchase_date;
                const formattedPurchaseDate = (window as any).formatDateInput ?
                    (window as any).formatDateInput(purchaseDateStr) :
                    new Date(purchaseDateStr).toISOString().split('T')[0];
                (document.getElementById("purchase-date") as HTMLInputElement).value = formattedPurchaseDate;
            }

            const snapshot = purchaseOrder.supplier_snapshot || {};
            (document.getElementById("supplier-id") as HTMLInputElement).value = purchaseOrder.supplier_id || "";
            (document.getElementById("supplier-search-input") as HTMLInputElement).value = snapshot.name || "";
            (document.getElementById("supplier-name") as HTMLInputElement).value = snapshot.name || "";
            const addr = snapshot.address || {};
            (document.getElementById("supplier-address-line1") as HTMLInputElement).value = addr.line1 || "";
            (document.getElementById("supplier-address-line2") as HTMLInputElement).value = addr.line2 || "";
            (document.getElementById("supplier-address-city") as HTMLInputElement).value = addr.city || "";
            (document.getElementById("supplier-address-state") as HTMLSelectElement).value = addr.state || "Karnataka";
            (document.getElementById("supplier-address-pincode") as HTMLInputElement).value = addr.pincode || "";
            (document.getElementById("supplier-phone") as HTMLInputElement).value = snapshot.phone || "";
            (document.getElementById("supplier-email") as HTMLInputElement).value = snapshot.email || "";
            (document.getElementById("supplier-GSTIN") as HTMLInputElement).value = snapshot.gstin || "";

            // Render supplier profile card
            renderSupplierProfileCard();

            const itemsContainer = document.getElementById("items-container");
            const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];

            if (itemsContainer) itemsContainer.innerHTML = "";
            if (itemsTable) itemsTable.innerHTML = "";

            let sno = 1;
            (purchaseOrder.items || []).forEach((item: any) => {
                const description = item.description || "";
                const hsnSac = item.hsn_sac || item.HSN_SAC || "";
                const company = item.brand || item.company || "";
                const type = item.item_type || item.type || "Material";
                const category = item.category || "";
                const quantity = item.quantity || "";
                const unit = item.unit || "";
                const unitPrice = item.unit_price || "";
                const rate = item.gst_rate || item.rate || "";

                if (itemsContainer) {
                    const card = document.createElement("div");
                    card.className = "item-card";
                    card.setAttribute("draggable", "true");

                    card.innerHTML = `
                        <div class="drag-handle" title="Drag to reorder">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <div class="item-row-1">
                            <div class="item-number">${sno}</div>
                            <div class="item-field description">
                                <div style="position: relative;">
                                    <input type="text" placeholder="Description" class="item_name" value="${description}" required>
                                    <ul class="suggestions"></ul>
                                </div>
                            </div>
                            <div class="item-field hsn">
                                <input type="text" placeholder="HSN/SAC" value="${hsnSac}" required>
                            </div>
                            <div class="item-field qty">
                                <input type="number" placeholder="Qty" value="${quantity}" required>
                            </div>
                            <div class="item-field unit">
                                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                                    <option value="" disabled ${!unit ? 'selected' : ''}>Select Unit</option>
                                    <option value="pc" ${unit === 'pc' ? 'selected' : ''}>Piece (pc)</option>
                                    <option value="kg" ${unit === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                                    <option value="L" ${unit === 'L' ? 'selected' : ''}>Litre (L)</option>
                                    <option value="m" ${unit === 'm' ? 'selected' : ''}>Metre (m)</option>
                                </select>
                            </div>
                            <div class="item-field rate">
                                <input type="number" placeholder="Unit Price" step="0.01" value="${unitPrice}" required>
                            </div>
                            <div class="item-field rate">
                                <input type="number" placeholder="GST %" min="0" step="0.01" value="${rate}">
                            </div>
                            <div class="item-actions">
                                <button type="button" class="remove-item-btn" title="Remove Item">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    itemsContainer.appendChild(card);

                    setupCardTabNavigation(card);

                    const cardInput = card.querySelector(".item_name") as HTMLInputElement;
                    const cardSuggestions = card.querySelector(".suggestions") as HTMLUListElement;

                    if (cardInput && cardSuggestions) {
                        cardInput.addEventListener("input", function () {
                            showSuggestionsPO(cardInput, cardSuggestions);
                        });
                        cardInput.addEventListener("keydown", function (event) {
                            handleKeyboardNavigationPO(event, cardInput, cardSuggestions);
                        });
                    }

                    const cardCompany = card.querySelector(".item-company") as HTMLInputElement;
                    const cardCategory = card.querySelector(".item-category") as HTMLInputElement;
                    if (cardCompany) setupGenericAutocomplete(cardCompany, companySuggestionList);
                    if (cardCategory) setupGenericAutocomplete(cardCategory, categorySuggestionList);

                    // Create hidden table row
                    if (itemsTable) {
                        const row = document.createElement("tr");
                        row.dataset.specification = item.specification || "";

                        row.innerHTML = `
                            <td class="text-center"><div class="item-number">${sno}</div></td>
                            <td>
                                <div style="position: relative;">
                                    <input type="text" placeholder="Item Description" class="item_name w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" value="${description}" required>
                                    <ul class="suggestions"></ul>
                                </div>
                            </td>
                            <td><input type="text" placeholder="HSN/SAC" value="${hsnSac}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td><input type="number" placeholder="Qty" value="${quantity}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td>
                                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                                    <option value="" disabled ${!unit ? 'selected' : ''}>Select Unit</option>
                                    <option value="pc" ${unit === 'pc' ? 'selected' : ''}>Piece (pc)</option>
                                    <option value="kg" ${unit === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                                    <option value="L" ${unit === 'L' ? 'selected' : ''}>Litre (L)</option>
                                    <option value="m" ${unit === 'm' ? 'selected' : ''}>Metre (m)</option>
                                </select>
                            </td>
                            <td><input type="number" placeholder="Unit Price" value="${unitPrice}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td><input type="number" placeholder="Rate" min="0.01" step="0.01" value="${rate}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                        `;
                        itemsTable.appendChild(row);

                        const tableInput = row.querySelector(".item_name") as HTMLInputElement;
                        const tableSuggestions = row.querySelector(".suggestions") as HTMLUListElement;

                        if (tableInput && tableSuggestions) {
                            tableInput.addEventListener("input", function () {
                                showSuggestionsPO(tableInput, tableSuggestions);
                                if (cardInput) cardInput.value = tableInput.value;
                            });
                            tableInput.addEventListener("keydown", function (event) {
                                handleKeyboardNavigationPO(event, tableInput, tableSuggestions);
                            });
                        }

                        // Sync card inputs with table inputs
                        const row1Inputs = card.querySelectorAll('.item-row-1 input');
                        const row1Selects = card.querySelectorAll('.item-row-1 select');
                        const tableInputs = row.querySelectorAll('input');
                        const tableSelects = row.querySelectorAll('select');

                        const inputMapping = [
                            { card: row1Inputs[0], table: tableInputs[0] }, // description
                            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
                            { card: row1Selects[0], table: tableSelects[0] }, // unit
                            { card: row1Inputs[2], table: tableInputs[2] }, // qty
                            { card: row1Inputs[3], table: tableInputs[3] }, // unit_price
                            { card: row1Inputs[4], table: tableInputs[4] }, // rate
                        ];

                        inputMapping.forEach(({ card: cInput, table: tInput }) => {
                            if (cInput && tInput) {
                                cInput.addEventListener("input", () => { (tInput as HTMLInputElement).value = (cInput as HTMLInputElement).value; });
                                tInput.addEventListener("input", () => { (cInput as HTMLInputElement).value = (tInput as HTMLInputElement).value; });
                                if (cInput.tagName === 'SELECT' || tInput.tagName === 'SELECT') {
                                    cInput.addEventListener("change", () => { (tInput as HTMLInputElement).value = (cInput as HTMLInputElement).value; });
                                    tInput.addEventListener("change", () => { (cInput as HTMLInputElement).value = (tInput as HTMLInputElement).value; });
                                }
                            }
                        });

                        // Set up dynamic decimal and integer validation for quantity inputs
                        setupPOQuantityDecimalSupport(card, row);

                        // Remove button handlers
                        const cardRemoveBtn = card.querySelector(".remove-item-btn");
                        if (cardRemoveBtn) {
                            cardRemoveBtn.addEventListener("click", function () {
                                card.remove();
                                row.remove();
                                renumberItems();
                            });
                        }
                        const tableRemoveBtn = row.querySelector(".remove-item-btn");
                        if (tableRemoveBtn) {
                            tableRemoveBtn.addEventListener("click", function () {
                                card.remove();
                                row.remove();
                                renumberItems();
                            });
                        }
                    }
                }

                sno++;
            });

            if (typeof (window as any).changeStep === 'function') {
                (window as any).changeStep(1);
            }

            // Show new section
            const viewSection = document.getElementById("view");
            if (viewSection) viewSection.style.display = "none";
            const homeSection = document.getElementById("home");
            if (homeSection) homeSection.style.display = "none";
            const newSection = document.getElementById("new");
            if (newSection) newSection.style.display = "block";

            // Hide Search bar, Filter button, and View Preview button
            const searchFilterContainer = document.getElementById('search-filter-container');
            if (searchFilterContainer) searchFilterContainer.style.display = 'none';
            const viewPreview = document.getElementById('view-preview');
            if (viewPreview) viewPreview.style.display = 'none';

            // If drag drop available, initialize it
            if ((window as any).itemReorder && typeof (window as any).itemReorder.initDragDrop === 'function') {
                (window as any).itemReorder.initDragDrop('items-container', renumberItems);
            }

            if (typeof (window as any).markPurchaseOrderFormClean === 'function') {
                (window as any).markPurchaseOrderFormClean();
            }

        } catch (error) {
            console.error("Error fetching purchase order:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to fetch purchase order. Please try again later.");
            }
        }
    }

    async function getId() {
        try {
            if ((window as any).purchaseOrderApi) {
                const data = await (window as any).purchaseOrderApi.generateId();
                (document.getElementById('id') as HTMLInputElement).value = data.purchase_order_no;
                purchaseOrderId = data.purchase_order_no;
                if (purchaseOrderId && typeof (window as any).generatePreview === 'function') {
                    (window as any).generatePreview();
                }
            } else {
                const response = await fetch("/purchaseOrder/generate-id");
                if (!response.ok) throw new Error("Failed to fetch purchase order id");
                const data = await response.json();
                (document.getElementById('id') as HTMLInputElement).value = data.purchase_order_no;
                purchaseOrderId = data.purchase_order_no;
                if (purchaseOrderId && typeof (window as any).generatePreview === 'function') {
                    (window as any).generatePreview();
                }
            }
        } catch (error) {
            console.error("Error fetching purchase order id:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to fetch purchase order id. Please try again later.");
            }
        }
    }

    async function sendToServer(data: any) {
        if ((window as any).sendDocumentToServer) {
            const res = await (window as any).sendDocumentToServer("/purchaseOrder/save-purchase-order", data);
            if (res) {
                if (typeof (window as any).markPurchaseOrderFormClean === 'function') {
                    (window as any).markPurchaseOrderFormClean();
                }
            }
            return res;
        }

        // Fallback if documentManager isn't loaded
        try {
            const response = await fetch("/purchaseOrder/save-purchase-order", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to save purchase order");
            
            if (typeof (window as any).markPurchaseOrderFormClean === 'function') {
                (window as any).markPurchaseOrderFormClean();
            }
            return true;
        } catch (error) {
            console.error("Error saving purchase order:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to save purchase order. Please try again later.");
            }
            return false;
        }
    }

    function collectFormData() {
        let totalVal = 0;
        const itemsList = Array.from(document.querySelectorAll("#items-table tbody tr")).map((row, index) => {
            const specRow = document.querySelector(`#items-specifications-table tbody tr:nth-child(${index + 1})`);
            const tr = row as HTMLElement;

            const qty = parseFloat((tr.querySelector("td:nth-child(4) input") as HTMLInputElement)?.value || "0");
            const unit = (tr.querySelector("td:nth-child(5) select") as HTMLSelectElement)?.value || "";
            const unitPrice = parseFloat((tr.querySelector("td:nth-child(6) input") as HTMLInputElement)?.value || "0");
            const rate = parseFloat((tr.querySelector("td:nth-child(7) input") as HTMLInputElement)?.value || "0");

            const taxableValue = qty * unitPrice;
            const taxAmount = (taxableValue * rate) / 100;
            totalVal += (taxableValue + taxAmount);

            return {
                description: (tr.querySelector("td:nth-child(2) input") as HTMLInputElement)?.value || "",
                hsn_sac: (tr.querySelector("td:nth-child(3) input") as HTMLInputElement)?.value || "",
                quantity: parseFloat((tr.querySelector("td:nth-child(4) input") as HTMLInputElement)?.value || "0") || "",
                unit: unit,
                unit_price: parseFloat((tr.querySelector("td:nth-child(6) input") as HTMLInputElement)?.value || "0") || "",
                gst_rate: parseFloat((tr.querySelector("td:nth-child(7) input") as HTMLInputElement)?.value || "0") || "",
                specification: specRow ? (specRow.querySelector("td:nth-child(3) input") as HTMLInputElement)?.value || "" : "",
                taxable_value: taxableValue,
                total: taxableValue + taxAmount
            };
        });

        const roundOff = Math.round(totalVal) - totalVal;
        const roundedTotal = totalVal + roundOff;

        return {
            purchase_order_no: (document.getElementById("id") as HTMLInputElement)?.value || "",
            purchase_invoice_no: "",
            purchase_date: (document.getElementById("purchase-date") as HTMLInputElement)?.value || "",
            supplier_id: (document.getElementById("supplier-id") as HTMLInputElement)?.value || "",
            supplier_snapshot: {
                name: (document.getElementById("supplier-name") as HTMLInputElement)?.value || "",
                address: {
                    line1: (document.getElementById("supplier-address-line1") as HTMLInputElement)?.value || "",
                    line2: (document.getElementById("supplier-address-line2") as HTMLInputElement)?.value || "",
                    city: (document.getElementById("supplier-address-city") as HTMLInputElement)?.value || "",
                    state: (document.getElementById("supplier-address-state") as HTMLSelectElement)?.value || "Karnataka",
                    pincode: (document.getElementById("supplier-address-pincode") as HTMLInputElement)?.value || ""
                },
                phone: (document.getElementById("supplier-phone") as HTMLInputElement)?.value || "",
                email: (document.getElementById("supplier-email") as HTMLInputElement)?.value || "",
                gstin: (document.getElementById("supplier-GSTIN") as HTMLInputElement)?.value || ""
            },
            items: itemsList,
            totals: {
                grand_total: roundedTotal
            }
        };
    }

    async function populateSpecifications() {
        const itemsTableBody = document.querySelector("#items-table tbody");
        const specificationsContainer = document.getElementById("specifications-container");
        const specificationsTableBody = document.querySelector("#items-specifications-table tbody");

        if (!itemsTableBody || !specificationsContainer || !specificationsTableBody) return;

        specificationsContainer.innerHTML = "";
        specificationsTableBody.innerHTML = "";

        const rows = Array.from(itemsTableBody.rows);

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const descriptionInput = row.cells[1].querySelector("input");
            const description = descriptionInput ? descriptionInput.value : "";
            let existingSpecification = row.dataset.specification || '';

            // Try to fetch specification from stock if not already present
            if (!existingSpecification && description.trim()) {
                try {
                    if ((window as any).fetchStockData) {
                        const stockData = await (window as any).fetchStockData(description);
                        if (stockData && stockData.specifications) {
                            existingSpecification = stockData.specifications;
                            row.dataset.specification = existingSpecification;
                        }
                    }
                } catch (error) {
                    // No stock data found
                }
            }

            // Create card
            const card = document.createElement("div");
            card.className = "spec-card";
            card.setAttribute("draggable", "true");
            card.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="item-number">${index + 1}</div>
                <div class="spec-field description">
                    <input type="text" value="${description}" readonly>
                </div>
                <div class="spec-field specification">
                    <input type="text" placeholder="Enter specifications" value="${existingSpecification}">
                </div>
            `;
            specificationsContainer.appendChild(card);

            // Create hidden table row
            const specRow = document.createElement("tr");
            specRow.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td><input type="text" value="${description}" readonly></td>
                <td><input type="text" placeholder="Enter specifications" value="${existingSpecification}"></td>
            `;
            specificationsTableBody.appendChild(specRow);

            // Sync card input with table input
            const cardInput = card.querySelector('.specification input') as HTMLInputElement;
            const rowInput = specRow.querySelector('td:nth-child(3) input') as HTMLInputElement;
            if (cardInput && rowInput) {
                cardInput.addEventListener('input', () => {
                    rowInput.value = cardInput.value;
                    row.dataset.specification = cardInput.value;
                });
            }
        }
    }

    function addPurchaseOrderItem(insertIndex?: number) {
        const container = document.getElementById("items-container");
        const tableBody = document.querySelector("#items-table tbody");
        if (!container || !tableBody) return;

        const addItemBtn = document.getElementById("add-item-btn");
        if (addItemBtn) {
            clearFieldError(addItemBtn);
        }


        const itemNumber = tableBody.children.length + 1;

        // Create card element
        const card = document.createElement("div");
        card.className = "item-card";
        card.setAttribute("draggable", "true");

        card.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-row-1">
                <div class="item-number">${itemNumber}</div>
                <div class="item-field description">
                    <div style="position: relative;">
                        <input type="text" placeholder="Description" class="item_name" required>
                        <ul class="suggestions"></ul>
                    </div>
                </div>
                <div class="item-field hsn">
                    <input type="text" placeholder="HSN/SAC" required>
                </div>
                <div class="item-field qty">
                    <input type="number" placeholder="Qty" required>
                </div>
                <div class="item-field unit">
                    <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                        <option value="" disabled selected>Select Unit</option>
                        <option value="pc">Piece (pc)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="L">Litre (L)</option>
                        <option value="m">Metre (m)</option>
                    </select>
                </div>
                <div class="item-field rate">
                    <input type="number" placeholder="Unit Price" step="0.01" required>
                </div>
                <div class="item-field rate">
                    <input type="number" placeholder="GST %" min="0" step="0.01">
                </div>
                <div class="item-actions">
                    <button type="button" class="remove-item-btn" title="Remove Item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < container.children.length) {
            container.insertBefore(card, container.children[insertIndex]);
        } else {
            container.appendChild(card);
        }

        setupCardTabNavigation(card);

        const cardInput = card.querySelector(".item_name") as HTMLInputElement;
        const cardSuggestions = card.querySelector(".suggestions") as HTMLUListElement;

        if (cardInput && cardSuggestions) {
            cardInput.addEventListener("input", function () {
                showSuggestionsPO(cardInput, cardSuggestions);
            });
            cardInput.addEventListener("keydown", function (event) {
                handleKeyboardNavigationPO(event, cardInput, cardSuggestions);
            });
        }

        const cardCompany = card.querySelector(".item-company") as HTMLInputElement;
        const cardCategory = card.querySelector(".item-category") as HTMLInputElement;
        if (cardCompany) setupGenericAutocomplete(cardCompany, companySuggestionList);
        if (cardCategory) setupGenericAutocomplete(cardCategory, categorySuggestionList);

        // Also add to hidden table
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-center"><div class="item-number">${itemNumber}</div></td>
            <td>
                <div style="position: relative;">
                    <input type="text" placeholder="Item Description" class="item_name w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                    <ul class="suggestions"></ul>
                </div>
            </td>
            <td><input type="text" placeholder="HSN/SAC" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td><input type="number" placeholder="Qty" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td>
                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                    <option value="" disabled selected>Select Unit</option>
                    <option value="pc">Piece (pc)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="L">Litre (L)</option>
                    <option value="m">Metre (m)</option>
                </select>
            </td>
            <td><input type="number" placeholder="Unit Price" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;

        if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < tableBody.children.length) {
            tableBody.insertBefore(row, tableBody.children[insertIndex]);
        } else {
            tableBody.appendChild(row);
        }

        const tableInput = row.querySelector(".item_name") as HTMLInputElement;
        const tableSuggestions = row.querySelector(".suggestions") as HTMLUListElement;

        if (tableInput && tableSuggestions) {
            tableInput.addEventListener("input", function () {
                showSuggestionsPO(tableInput, tableSuggestions);
                if (cardInput) cardInput.value = tableInput.value;
            });
            tableInput.addEventListener("keydown", function (event) {
                handleKeyboardNavigationPO(event, tableInput, tableSuggestions);
            });
        }

        // Sync card inputs with table inputs
        const row1Inputs = card.querySelectorAll('.item-row-1 input');
        const row1Selects = card.querySelectorAll('.item-row-1 select');
        const tableInputs = row.querySelectorAll('input');
        const tableSelects = row.querySelectorAll('select');

        const inputMapping = [
            { card: row1Inputs[0], table: tableInputs[0] }, // description
            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
            { card: row1Selects[0], table: tableSelects[0] }, // unit
            { card: row1Inputs[2], table: tableInputs[2] }, // qty
            { card: row1Inputs[3], table: tableInputs[3] }, // unit_price
            { card: row1Inputs[4], table: tableInputs[4] }, // rate
        ];

        inputMapping.forEach(({ card: cInput, table: tInput }) => {
            if (cInput && tInput) {
                cInput.addEventListener("input", () => { (tInput as HTMLInputElement).value = (cInput as HTMLInputElement).value; });
                tInput.addEventListener("input", () => { (cInput as HTMLInputElement).value = (tInput as HTMLInputElement).value; });
                if (cInput.tagName === 'SELECT' || tInput.tagName === 'SELECT') {
                    cInput.addEventListener("change", () => { (tInput as HTMLInputElement).value = (cInput as HTMLInputElement).value; });
                    tInput.addEventListener("change", () => { (cInput as HTMLInputElement).value = (tInput as HTMLInputElement).value; });
                }
            }
        });

        // Set up dynamic decimal and integer validation for quantity inputs
        setupPOQuantityDecimalSupport(card, row);

        // Add remove button event listeners
        const cardRemoveBtn = card.querySelector(".remove-item-btn");
        if (cardRemoveBtn) {
            cardRemoveBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                renumberItems();
            });
        }

        const tableRemoveBtn = row.querySelector(".remove-item-btn");
        if (tableRemoveBtn) {
            tableRemoveBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                renumberItems();
            });
        }

        if (typeof insertIndex === 'number') {
            renumberItems();
        }
    }

    function renumberItems() {
        const cards = document.querySelectorAll("#items-container .item-card");
        const tableRows = document.querySelectorAll("#items-table tbody tr");

        cards.forEach((card, index) => {
            const numberBadge = card.querySelector(".item-number");
            if (numberBadge) numberBadge.textContent = (index + 1).toString();
        });

        tableRows.forEach((row, index) => {
            const numberBadge = row.querySelector(".item-number");
            if (numberBadge) numberBadge.textContent = (index + 1).toString();
        });
    }

    function setupCardTabNavigation(card: HTMLDivElement) {
        const rateInputs = card.querySelectorAll('.item-row-1 .item-field.rate input');
        const gstInput = rateInputs[1] as HTMLInputElement | null;
        const unitSelect = card.querySelector('.item-unit') as HTMLSelectElement | null;
        const removeBtn = card.querySelector('.remove-item-btn') as HTMLButtonElement | null;
        const descInput = card.querySelector('.item_name') as HTMLInputElement | null;

        if (gstInput && unitSelect) {
            gstInput.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault();
                    unitSelect.focus();
                }
            });
            unitSelect.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && event.shiftKey) {
                    event.preventDefault();
                    gstInput.focus();
                }
            });
        }

        if (unitSelect && removeBtn) {
            unitSelect.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault();
                    removeBtn.focus();
                }
            });
            removeBtn.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && event.shiftKey) {
                    event.preventDefault();
                    unitSelect.focus();
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                    const cards = Array.from(document.querySelectorAll("#items-container .item-card"));
                    const cardIndex = cards.indexOf(card);
                    if (cardIndex !== -1 && cardIndex < cards.length - 1) {
                        const nextCard = cards[cardIndex + 1] as HTMLDivElement;
                        const nextDesc = nextCard.querySelector(".item_name") as HTMLInputElement | null;
                        if (nextDesc) {
                            event.preventDefault();
                            nextDesc.focus();
                        }
                    } else {
                        const addItemBtn = document.getElementById("add-item-btn");
                        if (addItemBtn) {
                            event.preventDefault();
                            addItemBtn.focus();
                        }
                    }
                }
            });
        }

        if (descInput) {
            descInput.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && event.shiftKey) {
                    const cards = Array.from(document.querySelectorAll("#items-container .item-card"));
                    const cardIndex = cards.indexOf(card);
                    if (cardIndex > 0) {
                        const prevCard = cards[cardIndex - 1] as HTMLDivElement;
                        const prevRemoveBtn = prevCard.querySelector(".remove-item-btn") as HTMLButtonElement | null;
                        if (prevRemoveBtn) {
                            event.preventDefault();
                            prevRemoveBtn.focus();
                        }
                    }
                }
            });
        }
    }

    // Inline validation error helpers
    function showFieldError(input: HTMLElement, message: string) {
        clearFieldError(input);

        // Apply error borders and focus ring classes
        input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        // Accessibility attributes
        input.setAttribute('aria-invalid', 'true');

        // Create error message node
        const errorMsg = document.createElement('div');
        errorMsg.className = 'text-[11px] font-semibold text-red-600 mt-1 transition-all duration-200 ease-in-out error-message-inline';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            parent.appendChild(errorMsg);
        }

        // Attach listeners to clear error when edited
        const clearListener = () => {
            clearFieldError(input);
            input.removeEventListener('input', clearListener);
            input.removeEventListener('change', clearListener);
        };
        input.addEventListener('input', clearListener);
        input.addEventListener('change', clearListener);
    }

    function clearFieldError(input: HTMLElement) {
        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');

        const parent = input.parentElement;
        if (parent) {
            const inlineErrors = parent.querySelectorAll('.error-message-inline');
            inlineErrors.forEach(err => err.remove());
        }
    }

    function clearAllErrors() {
        const errorInputs = document.querySelectorAll('#purchase-order [aria-invalid="true"]');
        errorInputs.forEach(el => {
            clearFieldError(el as HTMLElement);
        });

        const looseErrors = document.querySelectorAll('#purchase-order .error-message-inline');
        looseErrors.forEach(el => el.remove());
    }

    // Step Validation Overrides
    window.validateCurrentStep = async function () {
        const currentStep = (window as any).currentStep;

        // Step 1: Supplier details
        if (currentStep === 1) {
            clearAllErrors();
            let isValid = true;
            let firstInvalidEl: HTMLElement | null = null;

            const fields = [
                { id: 'purchase-date', name: 'Purchase Date' },
            ];
            for (const f of fields) {
                const el = document.getElementById(f.id) as HTMLInputElement;
                if (!el || !el.value.trim()) {
                    if (el) showFieldError(el, `${f.name} is required`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = el;
                }
            }

            const supplierSearch = document.getElementById('supplier-search-input') as HTMLInputElement;
            const supplierId = document.getElementById('supplier-id') as HTMLInputElement;
            if (!supplierSearch.value.trim()) {
                showFieldError(supplierSearch, 'Please search and select a Supplier.');
                isValid = false;
                if (!firstInvalidEl) firstInvalidEl = supplierSearch;
            } else if (!supplierId || !supplierId.value.trim()) {
                showFieldError(supplierSearch, 'Please select a valid, existing supplier profile from the suggestions list.');
                isValid = false;
                if (!firstInvalidEl) firstInvalidEl = supplierSearch;
            }

            // Validate date year limit (maximum 4-digit year)
            const dateEl = document.getElementById('purchase-date') as HTMLInputElement;
            if (dateEl && dateEl.value) {
                const parts = dateEl.value.split('-');
                if (parts[0] && parts[0].length > 4) {
                    showFieldError(dateEl, "Please enter a valid 4-digit year for the Purchase Date.");
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = dateEl;
                }
            }

            // Validate phone
            const supplierPhone = document.getElementById('supplier-phone') as HTMLInputElement;
            if (supplierPhone && supplierPhone.value.trim()) {
                const cleanedPhone = supplierPhone.value.replace(/\D/g, '');
                if (cleanedPhone.length !== 10) {
                    showFieldError(supplierPhone, 'Please enter a valid 10-digit Supplier Phone Number.');
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = supplierPhone;
                }
            }

            // Validate email
            const supplierEmail = document.getElementById('supplier-email') as HTMLInputElement;
            if (supplierEmail && supplierEmail.value.trim()) {
                const cleanedEmail = supplierEmail.value.trim().replace(/\s+/g, '');
                const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRe.test(cleanedEmail)) {
                    showFieldError(supplierEmail, 'Please enter a valid Supplier Email address.');
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = supplierEmail;
                }
            }

            // Validate GSTIN
            const supplierGstin = document.getElementById('supplier-GSTIN') as HTMLInputElement;
            if (supplierGstin && supplierGstin.value.trim()) {
                if (supplierGstin.value.trim().length !== 15) {
                    showFieldError(supplierGstin, 'GSTIN must be exactly 15 characters.');
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = supplierGstin;
                }
            }

            if (!isValid) {
                if (firstInvalidEl) firstInvalidEl.focus();
                return false;
            }
        }

        // Step 2: Items
        if (currentStep === 2) {
            clearAllErrors();
            const itemsTable = document.querySelector('#items-table tbody') as HTMLTableSectionElement;
            if (!itemsTable || itemsTable.rows.length === 0) {
                const addItemBtn = document.getElementById('add-item-btn');
                if (addItemBtn) {
                    showFieldError(addItemBtn, 'Please add at least one item.');
                    addItemBtn.focus();
                }
                return false;
            }

            let isValid = true;
            let firstInvalidEl: HTMLElement | null = null;
            const cards = document.querySelectorAll('#items-container .item-card');

            for (let i = 0; i < itemsTable.rows.length; i++) {
                const row = itemsTable.rows[i];
                const desc = row.querySelector('td:nth-child(2) input') as HTMLInputElement;
                const qty = row.querySelector('td:nth-child(4) input') as HTMLInputElement;
                const unit = row.querySelector('td:nth-child(5) select') as HTMLSelectElement;
                const price = row.querySelector('td:nth-child(6) input') as HTMLInputElement;

                const card = cards[i] as HTMLElement | undefined;
                const cardDesc = card?.querySelector('.item_name') as HTMLInputElement | undefined;
                const cardQty = card?.querySelector('.item-field.qty input') as HTMLInputElement | undefined;
                const cardUnit = card?.querySelector('.item-unit') as HTMLSelectElement | undefined;
                const cardPrice = card?.querySelector('input[placeholder="Unit Price"]') as HTMLInputElement | undefined;

                if (!desc || !desc.value.trim()) {
                    if (desc) showFieldError(desc, `required.`);
                    if (cardDesc) showFieldError(cardDesc, `required.`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = desc || cardDesc || null;
                }
                if (!qty || Number(qty.value) <= 0) {
                    if (qty) showFieldError(qty, `Required`);
                    if (cardQty) showFieldError(cardQty, `Required`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = qty || cardQty || null;
                }
                if (!unit || !unit.value) {
                    if (unit) showFieldError(unit, `required.`);
                    if (cardUnit) showFieldError(cardUnit, `required.`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = unit || cardUnit || null;
                }
                if (!price || Number(price.value) <= 0) {
                    if (price) showFieldError(price, `Required`);
                    if (cardPrice) showFieldError(cardPrice, `Required`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = price || cardPrice || null;
                }
            }

            if (!isValid) {
                if (firstInvalidEl) firstInvalidEl.focus();
                return false;
            }
        }

        return true;
    };


    // Replace default next button handler
    const initializeForm = () => {
        // Run fetch operations
        fetchCompanyAndCategorySuggestions();
        fetchStockNames();
        setupSupplierAutocomplete();
        renderSupplierProfileCard();
        clearAllErrors();


        // Setup phone integer validation
        const supplierPhone = document.getElementById('supplier-phone') as HTMLInputElement;
        if (supplierPhone) {
            supplierPhone.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '');
            });
        }

        // Setup purchase date validation (max 4-digit year limit)
        const purchaseDate = document.getElementById('purchase-date') as HTMLInputElement;
        if (purchaseDate) {
            purchaseDate.addEventListener('input', function () {
                const val = this.value;
                if (val) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                        parts[0] = parts[0].substring(0, 4);
                        this.value = parts.join('-');
                    }
                }
            });
        }

        // Add item button override
        const addItemBtn = document.getElementById('add-item-btn');
        if (addItemBtn) {
            const newAddItemBtn = addItemBtn.cloneNode(true);
            if (addItemBtn.parentNode) addItemBtn.parentNode.replaceChild(newAddItemBtn, addItemBtn);

            newAddItemBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                addPurchaseOrderItem();
            });

            newAddItemBtn.addEventListener('keydown', (event: Event) => {
                const keyEvent = event as KeyboardEvent;
                if (keyEvent.key === 'Tab' && keyEvent.shiftKey) {
                    const cards = document.querySelectorAll("#items-container .item-card");
                    if (cards.length > 0) {
                        const lastCard = cards[cards.length - 1] as HTMLDivElement;
                        const lastRemoveBtn = lastCard.querySelector(".remove-item-btn") as HTMLButtonElement | null;
                        if (lastRemoveBtn) {
                            keyEvent.preventDefault();
                            lastRemoveBtn.focus();
                        }
                    }
                }
            });
        }

        // Next button override
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            if (nextBtn.parentNode) nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

            newNextBtn.addEventListener('click', async () => {
                if (typeof (window as any).validateCurrentStep === 'function') {
                    const ok = await (window as any).validateCurrentStep();
                    if (!ok) return;
                }

                const currentStep = (window as any).currentStep;
                const totalSteps = (window as any).totalSteps;

                if (currentStep === totalSteps) {
                    const saveBtn = document.getElementById('save-btn');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                    return;
                }

                if (currentStep < totalSteps) {
                    if (typeof (window as any).changeStep === 'function') {
                        (window as any).changeStep(currentStep + 1);
                    }
                }

                // Generate preview on last step
                if ((window as any).currentStep === totalSteps) {
                    const idInput = document.getElementById('id') as HTMLInputElement;
                    if (!idInput || !idInput.value) {
                        await getId();
                    } else if (typeof (window as any).generatePurchaseOrderViewPreview === 'function') {
                        const formData = collectFormData();
                        await (window as any).generatePurchaseOrderViewPreview(formData);
                    }
                }
            });
        }

        // Save button
        const saveBtn = document.getElementById("save-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", async () => {
                const purchaseOrderData = collectFormData();
                const wasNewPurchaseOrder = sessionStorage.getItem('currentTab-status') !== 'update';
                const ok = await sendToServer(purchaseOrderData);
                if (ok) {
                    if ((window as any).electronAPI) {
                        (window as any).electronAPI.showAlert1("Purchase Order saved successfully!");
                    }
                    if (wasNewPurchaseOrder) {
                        sessionStorage.removeItem('currentTab-status');
                        window.location.href = '/purchaseOrder/purchaseOrder.html';
                    }
                }
            });
        }

        // Drag-drop initialization
        if ((window as any).itemReorder && typeof (window as any).itemReorder.initDragDrop === 'function') {
            (window as any).itemReorder.initDragDrop('items-container', renumberItems);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeForm);
    } else {
        initializeForm();
    }

    // Expose functionality to window
    (window as any).openPurchaseOrder = openPurchaseOrder;
    (window as any).getId = getId;
    (window as any).renderSupplierProfileCard = renderSupplierProfileCard;
    (window as any).populateSpecifications = populateSpecifications;
    (window as any).addPurchaseOrderItem = addPurchaseOrderItem;
    (window as any).renumberItems = renumberItems;
    (window as any).closeAllSuggestions = closeAllSuggestions;
    (window as any).collectPurchaseOrderFormData = collectFormData;

    // Create shim for generatePreview to map to the new view function
    (window as any).generatePreview = async () => {
        if (typeof (window as any).generatePurchaseOrderViewPreview === 'function') {
            const formData = collectFormData();
            await (window as any).generatePurchaseOrderViewPreview(formData);
        }
    };
})();
