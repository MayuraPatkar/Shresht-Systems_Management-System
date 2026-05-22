// @ts-nocheck
(function () {
    // Define totalSteps globally for purchaseOrder
    (window as any).totalSteps = 4;

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

    async function fetchSuppliers() {
        try {
            const response = await fetch("/api/suppliers");
            if (!response.ok) throw new Error("Failed to fetch suppliers");
            const resData = await response.json();
            supplierData = resData || [];
            supplierNames = supplierData.map(c => c.supplier_name);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to fetch suppliers list.");
            }
        }
    }

    function initSupplierAutocomplete() {
        const input = document.getElementById("supplier-name") as HTMLInputElement;
        if (!input) return;

        let suggestionsContainer = document.getElementById("supplier-suggestions");
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement("ul");
            suggestionsContainer.id = "supplier-suggestions";
            suggestionsContainer.className = "suggestions supplier-suggestions";

            const parent = input.parentElement;
            if (parent) {
                parent.style.position = 'relative';
                parent.appendChild(suggestionsContainer);
            }
        }

        input.addEventListener("input", function () {
            showSupplierSuggestions(input, suggestionsContainer);
        });

        input.addEventListener("focus", function () {
            showSupplierSuggestions(input, suggestionsContainer);
        });

        input.addEventListener("click", function () {
            showSupplierSuggestions(input, suggestionsContainer);
        });

        input.addEventListener("keydown", function (event) {
            handleSupplierKeyboardNavigation(event, input, suggestionsContainer);
        });

        document.addEventListener("click", function (event) {
            if (event.target !== input && !suggestionsContainer.contains(event.target as Node)) {
                suggestionsContainer.style.display = "none";
            }
        });
    }

    function showSupplierSuggestions(input: HTMLInputElement, suggestionsContainer: HTMLElement) {
        const value = input.value.trim().toLowerCase();
        suggestionsContainer.innerHTML = "";
        selectedSupplierIndex = -1;

        const filteredSuppliers = value.length === 0
            ? supplierData
            : supplierData.filter(supplier =>
                (supplier.supplier_name || "").toLowerCase().includes(value)
            );

        if (filteredSuppliers.length > 0) {
            filteredSuppliers.forEach((supplier, index) => {
                const li = document.createElement("li");

                const nameSpan = document.createElement("span");
                nameSpan.className = "font-semibold";
                nameSpan.textContent = supplier.supplier_name;

                const addressSpan = document.createElement("span");
                addressSpan.className = "text-xs text-gray-500 ml-2 block truncate";

                const addr = supplier.billing_address;
                const formattedAddr = addr
                    ? [addr.line1, addr.line2, addr.city].filter(Boolean).join(", ")
                    : "";
                addressSpan.textContent = formattedAddr;

                li.appendChild(nameSpan);
                if (formattedAddr) {
                    li.appendChild(addressSpan);
                }

                li.dataset.index = index.toString();

                li.addEventListener("click", () => {
                    fillSupplierDetails(supplier);
                    suggestionsContainer.style.display = "none";
                });

                suggestionsContainer.appendChild(li);
            });
            suggestionsContainer.style.display = "block";
        } else {
            suggestionsContainer.style.display = "none";
        }
    }

    function handleSupplierKeyboardNavigation(event: KeyboardEvent, input: HTMLInputElement, suggestionsContainer: HTMLElement) {
        const items = Array.from(suggestionsContainer.querySelectorAll("li"));
        if (items.length === 0 || suggestionsContainer.style.display === "none") return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            selectedSupplierIndex = (selectedSupplierIndex + 1) % items.length;
            updateSupplierSelection(items);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            selectedSupplierIndex = (selectedSupplierIndex - 1 + items.length) % items.length;
            updateSupplierSelection(items);
        } else if (event.key === "Enter") {
            if (selectedSupplierIndex > -1 && selectedSupplierIndex < items.length) {
                event.preventDefault();
                event.stopPropagation();
                items[selectedSupplierIndex].click();
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            suggestionsContainer.style.display = "none";
        }
    }

    function updateSupplierSelection(items: HTMLLIElement[]) {
        items.forEach((item, index) => {
            if (index === selectedSupplierIndex) {
                item.classList.add("active");
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove("active");
            }
        });
    }

    function fillSupplierDetails(supplier: any) {
        (document.getElementById("supplier-name") as HTMLInputElement).value = supplier.supplier_name || "";

        const addr = supplier.billing_address || {};
        (document.getElementById("supplier-address-line1") as HTMLInputElement).value = addr.line1 || "";
        (document.getElementById("supplier-address-line2") as HTMLInputElement).value = addr.line2 || "";
        (document.getElementById("supplier-address-city") as HTMLInputElement).value = addr.city || "";
        (document.getElementById("supplier-address-state") as HTMLSelectElement).value = addr.state || "Karnataka";
        (document.getElementById("supplier-address-pincode") as HTMLInputElement).value = addr.pincode || "";

        (document.getElementById("supplier-phone") as HTMLInputElement).value = supplier.phone || "";
        (document.getElementById("supplier-email") as HTMLInputElement).value = supplier.email || "";
        (document.getElementById("supplier-GSTIN") as HTMLInputElement).value = supplier.gstin || "";
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
                    if (unitSelect) unitSelect.value = unitVal;
                }

                if (tr) {
                    const hsnInput = tr.querySelector('td:nth-child(3) input') as HTMLInputElement;
                    const brandInput = tr.querySelector('td:nth-child(4) input') as HTMLInputElement;
                    const typeSelect = tr.querySelector('td:nth-child(5) select') as HTMLSelectElement;
                    const categoryInput = tr.querySelector('td:nth-child(6) input') as HTMLInputElement;
                    const unitSelect = tr.querySelector('td:nth-child(8) select') as HTMLSelectElement;
                    const priceInput = tr.querySelector('td:nth-child(9) input') as HTMLInputElement;
                    const gstInput = tr.querySelector('td:nth-child(10) input') as HTMLInputElement;

                    if (hsnInput) hsnInput.value = hsnVal;
                    if (brandInput) brandInput.value = brandVal;
                    if (typeSelect) typeSelect.value = typeVal;
                    if (categoryInput) categoryInput.value = categoryVal;
                    if (unitSelect) unitSelect.value = unitVal;
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

            (document.getElementById("purchase-invoice-id") as HTMLInputElement).value = purchaseOrder.purchase_invoice_no || purchaseOrder.purchase_order_no || "";
            const snapshot = purchaseOrder.supplier_snapshot || {};
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
                                <input type="number" placeholder="Qty" min="1" value="${quantity}" required>
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
                        <div class="item-row-2">
                            <div class="row-spacer"></div>
                            <div class="item-field">
                                <div style="position: relative;">
                                    <input type="text" placeholder="Brand" class="item-company" value="${company}">
                                    <ul class="suggestions"></ul>
                                </div>
                            </div>
                            <div class="item-field">
                                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="Material" ${type === 'Material' ? 'selected' : ''}>Material</option>
                                    <option value="Asset" ${type === 'Asset' ? 'selected' : ''}>Asset</option>
                                </select>
                            </div>
                            <div class="item-field">
                                <div style="position: relative;">
                                    <input type="text" placeholder="Category" class="item-category" value="${category}">
                                    <ul class="suggestions"></ul>
                                </div>
                            </div>
                            <div class="item-field">
                                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                                    <option value="" disabled ${!unit ? 'selected' : ''}>Select Unit</option>
                                    <option value="pc" ${unit === 'pc' ? 'selected' : ''}>Piece (pc)</option>
                                    <option value="kg" ${unit === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                                    <option value="L" ${unit === 'L' ? 'selected' : ''}>Litre (L)</option>
                                    <option value="m" ${unit === 'm' ? 'selected' : ''}>Metre (m)</option>
                                </select>
                            </div>
                            <div class="row-spacer"></div>
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
                            <td><input type="text" placeholder="Brand" value="${company}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td>
                                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="Material" ${type === 'Material' ? 'selected' : ''}>Material</option>
                                    <option value="Asset" ${type === 'Asset' ? 'selected' : ''}>Asset</option>
                                </select>
                            </td>
                            <td><input type="text" placeholder="Category" value="${category}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                            <td><input type="number" placeholder="Qty" min="1" value="${quantity}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
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
                        const row2Inputs = card.querySelectorAll('.item-row-2 input');
                        const row2Selects = card.querySelectorAll('.item-row-2 select');
                        const tableInputs = row.querySelectorAll('input');
                        const tableSelects = row.querySelectorAll('select');

                        const inputMapping = [
                            { card: row1Inputs[0], table: tableInputs[0] }, // description
                            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
                            { card: row2Inputs[0], table: tableInputs[2] }, // company
                            { card: row2Selects[0], table: tableSelects[0] }, // type
                            { card: row2Inputs[1], table: tableInputs[3] }, // category
                            { card: row2Selects[1], table: tableSelects[1] }, // unit
                            { card: row1Inputs[2], table: tableInputs[4] }, // qty
                            { card: row1Inputs[3], table: tableInputs[5] }, // unit_price
                            { card: row1Inputs[4], table: tableInputs[6] }, // rate
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

                        // Add Integer validation for quantity inputs
                        const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(7) input')];
                        qtyInputs.forEach(inp => {
                            if (inp) {
                                inp.setAttribute('step', '1');
                                inp.addEventListener('keypress', function (event: Event) {
                                    const e = event as KeyboardEvent;
                                    if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') e.preventDefault();
                                });
                                inp.addEventListener('input', function (this: HTMLInputElement) {
                                    this.value = this.value.replace(/[^0-9]/g, '');
                                });
                            }
                        });

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
            return await (window as any).sendDocumentToServer("/purchaseOrder/save-purchase-order", data);
        }

        // Fallback if documentManager isn't loaded
        try {
            const response = await fetch("/purchaseOrder/save-purchase-order", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to save purchase order");
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

            const qty = parseFloat((tr.querySelector("td:nth-child(7) input") as HTMLInputElement)?.value || "0");
            const unit = (tr.querySelector("td:nth-child(8) select") as HTMLSelectElement)?.value || "";
            const unitPrice = parseFloat((tr.querySelector("td:nth-child(9) input") as HTMLInputElement)?.value || "0");
            const rate = parseFloat((tr.querySelector("td:nth-child(10) input") as HTMLInputElement)?.value || "0");

            const taxableValue = qty * unitPrice;
            const taxAmount = (taxableValue * rate) / 100;
            totalVal += (taxableValue + taxAmount);

            return {
                description: (tr.querySelector("td:nth-child(2) input") as HTMLInputElement)?.value || "",
                hsn_sac: (tr.querySelector("td:nth-child(3) input") as HTMLInputElement)?.value || "",
                brand: (tr.querySelector("td:nth-child(4) input") as HTMLInputElement)?.value || "",
                item_type: (tr.querySelector("td:nth-child(5) select") as HTMLSelectElement)?.value || "Material",
                category: (tr.querySelector("td:nth-child(6) input") as HTMLInputElement)?.value || "",
                quantity: parseFloat((tr.querySelector("td:nth-child(7) input") as HTMLInputElement)?.value || "0") || "",
                unit: unit,
                unit_price: parseFloat((tr.querySelector("td:nth-child(9) input") as HTMLInputElement)?.value || "0") || "",
                gst_rate: parseFloat((tr.querySelector("td:nth-child(10) input") as HTMLInputElement)?.value || "0") || "",
                specification: specRow ? (specRow.querySelector("td:nth-child(3) input") as HTMLInputElement)?.value || "" : "",
                taxable_value: taxableValue,
                total: taxableValue + taxAmount
            };
        });

        const roundOff = Math.round(totalVal) - totalVal;
        const roundedTotal = totalVal + roundOff;

        return {
            purchase_order_no: (document.getElementById("id") as HTMLInputElement)?.value || "",
            purchase_invoice_no: (document.getElementById("purchase-invoice-id") as HTMLInputElement)?.value || "",
            purchase_date: (document.getElementById("purchase-date") as HTMLInputElement)?.value || "",
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
                    <input type="number" placeholder="Qty" min="1" required>
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
            <div class="item-row-2">
                <div class="row-spacer"></div>
                <div class="item-field">
                    <div style="position: relative;">
                        <input type="text" placeholder="Brand" class="item-company">
                        <ul class="suggestions"></ul>
                    </div>
                </div>
                <div class="item-field">
                    <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="Material" selected>Material</option>
                        <option value="Asset">Asset</option>
                    </select>
                </div>
                <div class="item-field">
                    <div style="position: relative;">
                        <input type="text" placeholder="Category" class="item-category">
                        <ul class="suggestions"></ul>
                    </div>
                </div>
                <div class="item-field">
                    <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 item-unit">
                        <option value="" disabled selected>Select Unit</option>
                        <option value="pc">Piece (pc)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="L">Litre (L)</option>
                        <option value="m">Metre (m)</option>
                    </select>
                </div>
                <div class="row-spacer"></div>
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
            <td><input type="text" placeholder="Brand" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td>
                <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="Material" selected>Material</option>
                    <option value="Asset">Asset</option>
                </select>
            </td>
            <td><input type="text" placeholder="Category" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
            <td><input type="number" placeholder="Qty" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
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
        const row2Inputs = card.querySelectorAll('.item-row-2 input');
        const row2Selects = card.querySelectorAll('.item-row-2 select');
        const tableInputs = row.querySelectorAll('input');
        const tableSelects = row.querySelectorAll('select');

        const inputMapping = [
            { card: row1Inputs[0], table: tableInputs[0] }, // description
            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
            { card: row2Inputs[0], table: tableInputs[2] }, // company
            { card: row2Selects[0], table: tableSelects[0] }, // type
            { card: row2Inputs[1], table: tableInputs[3] }, // category
            { card: row2Selects[1], table: tableSelects[1] }, // unit
            { card: row1Inputs[2], table: tableInputs[4] }, // qty
            { card: row1Inputs[3], table: tableInputs[5] }, // unit_price
            { card: row1Inputs[4], table: tableInputs[6] }, // rate
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

        // Integer validation for quantity
        const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(7) input')];
        qtyInputs.forEach(inp => {
            if (inp) {
                inp.setAttribute('step', '1');
                inp.addEventListener('keypress', function (event: Event) {
                    const e = event as KeyboardEvent;
                    if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') e.preventDefault();
                });
                inp.addEventListener('input', function (this: HTMLInputElement) {
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
            }
        });

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
        const brandInput = card.querySelector('.item-company') as HTMLInputElement | null;
        const unitSelect = card.querySelector('.item-unit') as HTMLSelectElement | null;
        const removeBtn = card.querySelector('.remove-item-btn') as HTMLButtonElement | null;
        const descInput = card.querySelector('.item_name') as HTMLInputElement | null;

        if (gstInput && brandInput) {
            gstInput.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault();
                    brandInput.focus();
                }
            });
            brandInput.addEventListener('keydown', (event: KeyboardEvent) => {
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
                { id: 'purchase-invoice-id', name: 'Purchase Invoice ID' },
                { id: 'purchase-date', name: 'Purchase Date' },
                { id: 'supplier-name', name: 'Supplier Name' },
                { id: 'supplier-address-line1', name: 'Address Line 1' },
                { id: 'supplier-address-city', name: 'City' },
                { id: 'supplier-address-state', name: 'State' },
                { id: 'supplier-address-pincode', name: 'Pincode' },
            ];
            for (const f of fields) {
                const el = document.getElementById(f.id) as HTMLInputElement;
                if (!el || !el.value.trim()) {
                    if (el) showFieldError(el, `${f.name} is required`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = el;
                }
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
                const qty = row.querySelector('td:nth-child(7) input') as HTMLInputElement;
                const unit = row.querySelector('td:nth-child(8) select') as HTMLSelectElement;
                const price = row.querySelector('td:nth-child(9) input') as HTMLInputElement;

                const card = cards[i] as HTMLElement | undefined;
                const cardDesc = card?.querySelector('.item_name') as HTMLInputElement | undefined;
                const cardQty = card?.querySelector('.item-field.qty input') as HTMLInputElement | undefined;
                const cardUnit = card?.querySelector('.item-unit') as HTMLSelectElement | undefined;
                const cardPrice = card?.querySelector('input[placeholder="Unit Price"]') as HTMLInputElement | undefined;

                if (!desc || !desc.value.trim()) {
                    if (desc) showFieldError(desc, `Description is required.`);
                    if (cardDesc) showFieldError(cardDesc, `Description is required.`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = desc || cardDesc || null;
                }
                if (!qty || Number(qty.value) <= 0) {
                    if (qty) showFieldError(qty, `Quantity must be greater than 0.`);
                    if (cardQty) showFieldError(cardQty, `Quantity must be greater than 0.`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = qty || cardQty || null;
                }
                if (!unit || !unit.value) {
                    if (unit) showFieldError(unit, `Unit is required.`);
                    if (cardUnit) showFieldError(cardUnit, `Unit is required.`);
                    isValid = false;
                    if (!firstInvalidEl) firstInvalidEl = unit || cardUnit || null;
                }
                if (!price || Number(price.value) <= 0) {
                    if (price) showFieldError(price, `Unit Price must be greater than 0.`);
                    if (cardPrice) showFieldError(cardPrice, `Unit Price must be greater than 0.`);
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
        fetchSuppliers();
        fetchCompanyAndCategorySuggestions();
        fetchStockNames();
        initSupplierAutocomplete();
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

                if (currentStep < totalSteps) {
                    // Populate specifications when moving from step 2 to 3
                    if (currentStep === 2) {
                        await populateSpecifications();
                    }
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
    (window as any).populateSpecifications = populateSpecifications;
    (window as any).addPurchaseOrderItem = addPurchaseOrderItem;
    (window as any).renumberItems = renumberItems;
    (window as any).closeAllSuggestions = closeAllSuggestions;

    // Create shim for generatePreview to map to the new view function
    (window as any).generatePreview = async () => {
        if (typeof (window as any).generatePurchaseOrderViewPreview === 'function') {
            const formData = collectFormData();
            await (window as any).generatePurchaseOrderViewPreview(formData);
        }
    };
})();
