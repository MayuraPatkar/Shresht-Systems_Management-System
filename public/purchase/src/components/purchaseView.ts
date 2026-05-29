// @ts-nocheck
(function () {
    let currentPurchase: any = null;
    let isEditingInline = false;
    Object.defineProperty(window, 'isEditingInline', {
        get: () => isEditingInline,
        set: (val) => { isEditingInline = val; },
        configurable: true
    });

    function showAlert(msg: string) {
        if ((window as any).electronAPI && (window as any).electronAPI.showAlert1) {
            (window as any).electronAPI.showAlert1(msg);
        } else {
            alert(msg);
        }
    }

    async function viewPurchase(purchaseId: string) {
        try {
            let data;
            if ((window as any).purchaseApi) {
                data = await (window as any).purchaseApi.fetchPurchaseById(purchaseId);
            } else {
                const response = await fetch(`/purchase/${purchaseId}`);
                if (!response.ok) throw new Error("Failed to fetch purchase");
                data = await response.json();
            }
            
            const purchase = data.purchase;
            isEditingInline = false;
            renderPurchaseDetails(purchase);
        } catch (error) {
            console.error("Error fetching purchase:", error);
            showAlert("Failed to fetch purchase details.");
        }
    }

    function renderPurchaseDetails(purchase: any) {
        currentPurchase = purchase;
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

        // Fill Project Details
        const viewInvoiceId = document.getElementById('view-purchase-invoice-iD');
        if (viewInvoiceId) viewInvoiceId.textContent = purchase.purchase_invoice_no || purchase.purchase_no || '-';
        
        const viewDate = document.getElementById('view-purchase-date');
        if (viewDate) {
            viewDate.textContent = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchase.purchase_date) : 
                new Date(purchase.purchase_date).toLocaleDateString();
        }

        // Buyer/Supplier Details
        const snapshot = purchase.supplier_snapshot || {};
        const viewName = document.getElementById('view-supplier-name');
        if (viewName) viewName.textContent = snapshot.name || '-';
        
        const viewAddress = document.getElementById('view-supplier-address');
        if (viewAddress) {
            const addr = snapshot.address || {};
            const addressParts = [];
            if (addr.line1) addressParts.push(addr.line1);
            if (addr.line2) addressParts.push(addr.line2);
            if (addr.city) addressParts.push(addr.city);
            if (addr.state || addr.pincode) {
                const statePin = [addr.state, addr.pincode].filter(Boolean).join(" - ");
                addressParts.push(statePin);
            }
            viewAddress.textContent = addressParts.join(", ") || '-';
        }
        
        const viewPhone = document.getElementById('view-supplier-phone');
        if (viewPhone) viewPhone.textContent = snapshot.phone || '-';
        
        const viewEmail = document.getElementById('view-supplier-email');
        if (viewEmail) viewEmail.textContent = snapshot.email || '-';
        
        const viewGstin = document.getElementById('view-buyerGSTIN');
        if (viewGstin) viewGstin.textContent = snapshot.gstin || '-';

        // Toggle edit/view fields and buttons
        const editFields = document.querySelectorAll(".edit-field");
        const viewFields = document.querySelectorAll(".view-field");
        const actionHeaders = document.querySelectorAll(".action-header");
        const dangerZoneSection = document.getElementById("danger-zone-section");
        
        if (isEditingInline) {
            editFields.forEach(el => el.classList.remove("hidden"));
            viewFields.forEach(el => el.classList.add("hidden"));
            actionHeaders.forEach(el => el.classList.remove("hidden"));
            if (dangerZoneSection) dangerZoneSection.classList.add("hidden");
            
            // Populating supplier edit fields
            const addr = snapshot.address || {};
            (document.getElementById('edit-purchase-invoice-id') as HTMLInputElement).value = purchase.purchase_invoice_no || purchase.purchase_no || '';
            (document.getElementById('edit-purchase-date') as HTMLInputElement).value = purchase.purchase_date ? purchase.purchase_date.split('T')[0] : '';
            (document.getElementById('edit-supplier-name') as HTMLInputElement).value = snapshot.name || '';
            (document.getElementById('edit-supplier-address-line1') as HTMLInputElement).value = addr.line1 || '';
            (document.getElementById('edit-supplier-address-line2') as HTMLInputElement).value = addr.line2 || '';
            (document.getElementById('edit-supplier-address-city') as HTMLInputElement).value = addr.city || '';
            (document.getElementById('edit-supplier-address-state') as HTMLSelectElement).value = addr.state || 'Karnataka';
            (document.getElementById('edit-supplier-address-pincode') as HTMLInputElement).value = addr.pincode || '';
            (document.getElementById('edit-supplier-phone') as HTMLInputElement).value = snapshot.phone || '';
            (document.getElementById('edit-supplier-email') as HTMLInputElement).value = snapshot.email || '';
            (document.getElementById('edit-buyerGSTIN') as HTMLInputElement).value = snapshot.gstin || '';
        } else {
            editFields.forEach(el => el.classList.add("hidden"));
            viewFields.forEach(el => el.classList.remove("hidden"));
            actionHeaders.forEach(el => el.classList.add("hidden"));
            if (dangerZoneSection) dangerZoneSection.classList.remove("hidden");
        }

        // Item Lists - clear and populate
        const viewItemsInfoTableBody = document.querySelector("#view-items-info-table tbody");
        const viewItemsFinanceTableBody = document.querySelector("#view-items-finance-table tbody");
        const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
        
        if (viewItemsInfoTableBody) viewItemsInfoTableBody.innerHTML = "";
        if (viewItemsFinanceTableBody) viewItemsFinanceTableBody.innerHTML = "";
        if (viewSpecificationsTableBody) viewSpecificationsTableBody.innerHTML = "";

        let itemNumber = 1;
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let totalQty = 0;

        (purchase.items || []).forEach((item: any) => {
            if (isEditingInline) {
                addInlineRow(item);
            } else {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unit_price || 0);
                const rate = parseFloat(item.gst_rate || item.rate || 0);
                const taxableValue = qty * unitPrice;
                const taxAmount = (taxableValue * rate) / 100;

                totalQty += qty;
                totalTaxable += taxableValue;
                totalTaxAmount += taxAmount;

                if (viewItemsInfoTableBody) {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.brand || item.company || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.category || '-'}</td>
                    `;
                    viewItemsInfoTableBody.appendChild(row);
                }

                if (viewItemsFinanceTableBody) {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${qty}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.unit || 'pc'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">₹ ${formatIndian(unitPrice, 2)}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">${rate}%</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">₹ ${formatIndian(taxableValue + taxAmount, 2)}</td>
                    `;
                    viewItemsFinanceTableBody.appendChild(row);
                }

                if (viewSpecificationsTableBody) {
                    const specRow = document.createElement("tr");
                    specRow.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    specRow.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
                    `;
                    viewSpecificationsTableBody.appendChild(specRow);
                }
                
                itemNumber++;
            }
        });

        if (!isEditingInline) {
            // Set footer totals row in finance table
            const viewItemsFinanceTableFoot = document.querySelector("#view-items-finance-table tfoot") as HTMLTableSectionElement | null;
            if (viewItemsFinanceTableFoot) {
                viewItemsFinanceTableFoot.innerHTML = `
                    <tr>
                        <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxAmount, 2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(totalTaxable + totalTaxAmount, 2)}</td>
                    </tr>
                `;
            }

            // Set totals card
            const viewSubtotal = document.getElementById('view-subtotal');
            if (viewSubtotal) viewSubtotal.textContent = `₹ ${formatIndian(totalTaxable, 2)}`;
            
            const viewTax = document.getElementById('view-tax');
            if (viewTax) viewTax.textContent = `₹ ${formatIndian(totalTaxAmount, 2)}`;
            
            const grandTotal = totalTaxable + totalTaxAmount;
            const roundOff = Math.round(grandTotal) - grandTotal;
            const totalAmount = grandTotal + roundOff;
            
            const totalPaid = Number(purchase.total_paid_amount || 0);
            const balanceDue = totalAmount - totalPaid;
            
            const viewGrandTotal = document.getElementById('view-grand-total');
            if (viewGrandTotal) viewGrandTotal.textContent = `₹ ${formatIndian(totalAmount, 2)}`;

            const viewPaidAmount = document.getElementById('view-paid-amount');
            if (viewPaidAmount) viewPaidAmount.textContent = `₹ ${formatIndian(totalPaid, 2)}`;

            const viewBalanceDue = document.getElementById('view-balance-due');
            if (viewBalanceDue) viewBalanceDue.textContent = `₹ ${formatIndian(balanceDue, 2)}`;
        }

        // Hide other sections, show view section
        const home = document.getElementById('home');
        if (home) home.style.display = 'none';
        
        const newSection = document.getElementById('new');
        if (newSection) newSection.style.display = 'none';
        
        const viewSection = document.getElementById('view');
        if (viewSection) viewSection.style.display = 'block';

        // Update header elements visibility contextually
        if (typeof (window as any).updateHeaderVisibility === 'function') {
            (window as any).updateHeaderVisibility();
        }
    }

    function calculateInlineTotals() {
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let totalQty = 0;
        
        const rows = document.querySelectorAll("#view-items-finance-table tbody tr");
        rows.forEach(row => {
            const qtyInput = row.querySelector(".inline-edit-qty") as HTMLInputElement;
            const priceInput = row.querySelector(".inline-edit-price") as HTMLInputElement;
            const rateInput = row.querySelector(".inline-edit-rate") as HTMLInputElement;
            const rowTotalSpan = row.querySelector(".inline-edit-row-total") as HTMLSpanElement;
            
            if (qtyInput && priceInput && rateInput) {
                const qty = parseFloat(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const rate = parseFloat(rateInput.value) || 0;
                
                const taxable = qty * price;
                const tax = (taxable * rate) / 100;
                const rowTotal = taxable + tax;
                
                totalQty += qty;
                totalTaxable += taxable;
                totalTaxAmount += tax;
                
                if (rowTotalSpan) {
                    const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));
                    rowTotalSpan.textContent = formatIndian(rowTotal, 2);
                }
            }
        });
        
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

        // Set footer totals row in finance table
        const viewItemsFinanceTableFoot = document.querySelector("#view-items-finance-table tfoot") as HTMLTableSectionElement | null;
        if (viewItemsFinanceTableFoot) {
            const isEditing = (window as any).isEditingInline;
            viewItemsFinanceTableFoot.innerHTML = `
                <tr>
                    <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                    <td class="px-4 py-3"></td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                    <td class="px-4 py-3"></td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxAmount, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(totalTaxable + totalTaxAmount, 2)}</td>
                    ${isEditing ? '<td class="px-4 py-3 action-cell"></td>' : ''}
                </tr>
            `;
        }
        
        const viewSubtotal = document.getElementById('view-subtotal');
        if (viewSubtotal) viewSubtotal.textContent = `₹ ${formatIndian(totalTaxable, 2)}`;
        
        const viewTax = document.getElementById('view-tax');
        if (viewTax) viewTax.textContent = `₹ ${formatIndian(totalTaxAmount, 2)}`;
        
        const grandTotal = totalTaxable + totalTaxAmount;
        const roundOff = Math.round(grandTotal) - grandTotal;
        const totalAmount = grandTotal + roundOff;
        
        const totalPaid = Number(currentPurchase?.total_paid_amount || 0);
        const balanceDue = totalAmount - totalPaid;
        
        const viewGrandTotal = document.getElementById('view-grand-total');
        if (viewGrandTotal) viewGrandTotal.textContent = `₹ ${formatIndian(totalAmount, 2)}`;

        const viewPaidAmount = document.getElementById('view-paid-amount');
        if (viewPaidAmount) viewPaidAmount.textContent = `₹ ${formatIndian(totalPaid, 2)}`;

        const viewBalanceDue = document.getElementById('view-balance-due');
        if (viewBalanceDue) viewBalanceDue.textContent = `₹ ${formatIndian(balanceDue, 2)}`;
    }

    function addInlineRow(item: any = {}) {
        const viewItemsInfoTableBody = document.querySelector("#view-items-info-table tbody");
        const viewItemsFinanceTableBody = document.querySelector("#view-items-finance-table tbody");
        const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
        if (!viewItemsInfoTableBody || !viewItemsFinanceTableBody || !viewSpecificationsTableBody) return;
        
        const itemNumber = viewItemsInfoTableBody.children.length + 1;
        
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const rate = parseFloat(item.gst_rate || item.rate || 0);
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));
        
        const infoRow = document.createElement("tr");
        infoRow.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-desc w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.description || ''}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-hsn w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.hsn_sac || item.HSN_SAC || ''}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-brand w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.brand || item.company || ''}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-category w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.category || ''}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 action-cell">
                <button type="button" class="inline-delete-row-btn text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Row">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        const financeRow = document.createElement("tr");
        financeRow.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900 font-medium">
                <span class="inline-finance-desc-text">${item.description || '-'}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="number" step="any" min="0" class="inline-edit-qty w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" value="${qty}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <select class="inline-edit-unit w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pc" ${item.unit === 'pc' ? 'selected' : ''}>pc</option>
                    <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                    <option value="L" ${item.unit === 'L' ? 'selected' : ''}>L</option>
                    <option value="m" ${item.unit === 'm' ? 'selected' : ''}>m</option>
                </select>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="number" step="any" min="0" class="inline-edit-price w-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" value="${unitPrice}">
            </td>
            <td class="px-4 py-3 text-sm font-semibold text-gray-900">
                <input type="number" step="any" min="0" class="inline-edit-rate w-16 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" value="${rate}">
            </td>
            <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                ₹ <span class="inline-edit-row-total">${formatIndian(qty * unitPrice * (1 + rate / 100), 2)}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 action-cell">
                <button type="button" class="inline-delete-row-btn text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Row">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        const specRow = document.createElement("tr");
        specRow.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
        specRow.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <span class="inline-spec-desc-text">${item.description || '-'}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-specification w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.specification || ''}">
            </td>
        `;

        const deleteRow = (index: number) => {
            infoRow.remove();
            financeRow.remove();
            specRow.remove();
            renumberRows();
            calculateInlineTotals();
        };

        infoRow.querySelector(".inline-delete-row-btn")?.addEventListener("click", () => {
            const index = Array.from(viewItemsInfoTableBody.children).indexOf(infoRow);
            deleteRow(index);
        });

        financeRow.querySelector(".inline-delete-row-btn")?.addEventListener("click", () => {
            const index = Array.from(viewItemsFinanceTableBody.children).indexOf(financeRow);
            deleteRow(index);
        });
        
        viewItemsInfoTableBody.appendChild(infoRow);
        viewItemsFinanceTableBody.appendChild(financeRow);
        viewSpecificationsTableBody.appendChild(specRow);
        
        calculateInlineTotals();
    }

    function renumberRows() {
        const viewItemsInfoTableBody = document.querySelector("#view-items-info-table tbody");
        const viewItemsFinanceTableBody = document.querySelector("#view-items-finance-table tbody");
        const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
        if (!viewItemsInfoTableBody || !viewItemsFinanceTableBody || !viewSpecificationsTableBody) return;
        
        Array.from(viewItemsInfoTableBody.children).forEach((row, i) => {
            const tdNo = row.querySelector("td:first-child");
            if (tdNo) tdNo.textContent = (i + 1).toString();
        });
        
        Array.from(viewItemsFinanceTableBody.children).forEach((row, i) => {
            const tdNo = row.querySelector("td:first-child");
            if (tdNo) tdNo.textContent = (i + 1).toString();
        });
        
        Array.from(viewSpecificationsTableBody.children).forEach((row, i) => {
            const tdNo = row.querySelector("td:first-child");
            if (tdNo) tdNo.textContent = (i + 1).toString();
        });
    }

    async function saveInlineChanges() {
        if (!currentPurchase) return;

        const invoiceId = (document.getElementById('edit-purchase-invoice-id') as HTMLInputElement).value.trim();
        const date = (document.getElementById('edit-purchase-date') as HTMLInputElement).value.trim();
        const name = (document.getElementById('edit-supplier-name') as HTMLInputElement).value.trim();

        if (!invoiceId) {
            showAlert("Purchase Invoice ID is required.");
            return;
        }
        if (!date) {
            showAlert("Purchase Date is required.");
            return;
        }
        if (!name) {
            showAlert("Supplier Name is required.");
            return;
        }

        const infoRows = document.querySelectorAll("#view-items-info-table tbody tr");
        const financeRows = document.querySelectorAll("#view-items-finance-table tbody tr");
        const specRows = document.querySelectorAll("#view-specifications-table tbody tr");
        
        if (infoRows.length === 0) {
            showAlert("At least one item is required.");
            return;
        }

        const items: any[] = [];
        let totalVal = 0;

        for (let i = 0; i < infoRows.length; i++) {
            const infoRow = infoRows[i];
            const finRow = financeRows[i];
            const specRow = specRows[i];
            
            const desc = (infoRow.querySelector(".inline-edit-desc") as HTMLInputElement).value.trim();
            const qty = parseFloat((finRow.querySelector(".inline-edit-qty") as HTMLInputElement).value) || 0;
            const price = parseFloat((finRow.querySelector(".inline-edit-price") as HTMLInputElement).value) || 0;
            const rate = parseFloat((finRow.querySelector(".inline-edit-rate") as HTMLInputElement).value) || 0;
            const unit = (finRow.querySelector(".inline-edit-unit") as HTMLSelectElement).value;
            const hsn = (infoRow.querySelector(".inline-edit-hsn") as HTMLInputElement).value.trim();
            const brand = (infoRow.querySelector(".inline-edit-brand") as HTMLInputElement).value.trim();
            const category = (infoRow.querySelector(".inline-edit-category") as HTMLInputElement).value.trim();
            const spec = specRow ? (specRow.querySelector(".inline-edit-specification") as HTMLInputElement).value.trim() : "";

            if (!desc) {
                showAlert(`Description for Item ${i + 1} is required.`);
                return;
            }
            if (qty <= 0) {
                showAlert(`Quantity for Item ${i + 1} must be greater than 0.`);
                return;
            }
            if (price < 0) {
                showAlert(`Price for Item ${i + 1} cannot be negative.`);
                return;
            }

            const taxableValue = qty * price;
            const taxAmount = (taxableValue * rate) / 100;
            totalVal += (taxableValue + taxAmount);

            items.push({
                description: desc,
                hsn_sac: hsn,
                brand: brand,
                category: category,
                quantity: qty,
                unit: unit,
                unit_price: price,
                gst_rate: rate,
                rate: rate,
                specification: spec,
                taxable_value: taxableValue,
                total: taxableValue + taxAmount
            });
        }

        const roundOff = Math.round(totalVal) - totalVal;
        const roundedTotal = totalVal + roundOff;

        const payload = {
            purchase_no: currentPurchase.purchase_no,
            purchase_invoice_no: invoiceId,
            purchase_date: date,
            supplier_id: currentPurchase.supplier_id || "",
            supplier_snapshot: {
                name: name,
                address: {
                    line1: (document.getElementById('edit-supplier-address-line1') as HTMLInputElement).value.trim(),
                    line2: (document.getElementById('edit-supplier-address-line2') as HTMLInputElement).value.trim(),
                    city: (document.getElementById('edit-supplier-address-city') as HTMLInputElement).value.trim(),
                    state: (document.getElementById('edit-supplier-address-state') as HTMLSelectElement).value,
                    pincode: (document.getElementById('edit-supplier-address-pincode') as HTMLInputElement).value.trim()
                },
                phone: (document.getElementById('edit-supplier-phone') as HTMLInputElement).value.trim(),
                email: (document.getElementById('edit-supplier-email') as HTMLInputElement).value.trim(),
                gstin: (document.getElementById('edit-buyerGSTIN') as HTMLInputElement).value.trim()
            },
            items: items,
            totals: {
                grand_total: roundedTotal
            }
        };

        try {
            let success = false;
            if ((window as any).sendDocumentToServer) {
                success = await (window as any).sendDocumentToServer("/purchase/save-purchase", payload);
            } else {
                const response = await fetch("/purchase/save-purchase", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                success = response.ok;
            }

            if (success) {
                showAlert("Purchase saved successfully!");
                isEditingInline = false;
                currentPurchase = payload;
                renderPurchaseDetails(currentPurchase);
                
                // Refresh list
                if ((window as any).purchaseApi) {
                    const data = await (window as any).purchaseApi.fetchRecentPurchases();
                    if ((window as any).allPurchases) {
                        (window as any).allPurchases = data.purchases;
                    }
                    if ((window as any).applyPurchaseFilters) {
                        (window as any).applyPurchaseFilters();
                    } else if ((window as any).purchaseTable && (window as any).purchaseTable.renderPurchases) {
                        (window as any).purchaseTable.renderPurchases(data.purchases);
                    }
                }
            } else {
                showAlert("Failed to save purchase.");
            }
        } catch (error) {
            console.error("Error saving purchase inline:", error);
            showAlert("Failed to save purchase. Please try again later.");
        }
    }

    function handleDelete(id: string) {
        if ((window as any).deleteDocument) {
            (window as any).deleteDocument('purchase', id, 'Purchase', async () => {
                isEditingInline = false;
                const viewSection = document.getElementById('view');
                if (viewSection) viewSection.style.display = 'none';
                
                const home = document.getElementById('home');
                if (home) home.style.display = 'block';

                if (typeof (window as any).updateHeaderVisibility === 'function') {
                    (window as any).updateHeaderVisibility();
                }

                if ((window as any).purchaseApi) {
                    try {
                        const data = await (window as any).purchaseApi.fetchRecentPurchases();
                        if ((window as any).allPurchases) {
                            (window as any).allPurchases = data.purchases;
                        }
                        if ((window as any).applyPurchaseFilters) {
                            (window as any).applyPurchaseFilters();
                        } else if ((window as any).purchaseTable && (window as any).purchaseTable.renderPurchases) {
                            (window as any).purchaseTable.renderPurchases(data.purchases);
                        }
                    } catch (err) {
                        console.error("Error refreshing after delete", err);
                    }
                }
            });
        } else {
            console.error("deleteDocument utility not available");
        }
    }

    function setupListeners() {
        const editBtn = document.getElementById("view-edit-btn");
        if (editBtn) {
            editBtn.addEventListener("click", () => {
                if (currentPurchase) {
                    isEditingInline = true;
                    renderPurchaseDetails(currentPurchase);
                }
            });
        }

        const cancelBtn = document.getElementById("view-cancel-btn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                if (currentPurchase) {
                    isEditingInline = false;
                    renderPurchaseDetails(currentPurchase);
                }
            });
        }

        const deleteBtn = document.getElementById("view-delete-btn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                if (currentPurchase) {
                    handleDelete(currentPurchase.purchase_no);
                }
            });
        }

        const saveBtn = document.getElementById("view-save-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                saveInlineChanges();
            });
        }

        const viewPaymentBtn = document.getElementById("view-payment-btn");
        if (viewPaymentBtn) {
            viewPaymentBtn.addEventListener("click", () => {
                if (currentPurchase) {
                    let totalTaxable = 0;
                    let totalTaxAmount = 0;
                    (currentPurchase.items || []).forEach((item: any) => {
                        const qty = parseFloat(item.quantity || 0);
                        const unitPrice = parseFloat(item.unit_price || 0);
                        const rate = parseFloat(item.gst_rate || item.rate || 0);
                        const taxableValue = qty * unitPrice;
                        const taxAmount = (taxableValue * rate) / 100;
                        totalTaxable += taxableValue;
                        totalTaxAmount += taxAmount;
                    });
                    
                    const calcGrandTotal = totalTaxable + totalTaxAmount;
                    const roundOff = Math.round(calcGrandTotal) - calcGrandTotal;
                    const totalAmount = calcGrandTotal + roundOff;

                    const storedGrandTotal = Number(currentPurchase.totals?.grand_total || totalAmount);

                    const totalPaid = Number(currentPurchase.total_paid_amount || 0);
                    const balanceDue = storedGrandTotal - totalPaid;

                    if (currentPurchase.payment_status === 'PAID' || balanceDue <= 0) {
                        showAlert("This purchase is already fully paid.");
                        return;
                    }

                    const refId = currentPurchase.purchase_invoice_no || currentPurchase.purchase_no;
                    const refType = 'Purchase';
                    const partyType = 'Supplier';
                    const partyId = currentPurchase.supplier_id || '';
                    const partyName = encodeURIComponent(currentPurchase.supplier_snapshot?.name || '');

                    const url = `/payment/payment.html?new=true&direction=OUT&amount=${balanceDue}&ref_type=${refType}&ref_id=${refId}&party_type=${partyType}&party_id=${partyId}&party_name=${partyName}`;
                    window.location.href = url;
                }
            });
        }

        const addRowBtn = document.getElementById("add-inline-item-btn");
        if (addRowBtn) {
            addRowBtn.addEventListener("click", () => {
                addInlineRow({});
            });
        }

        const infoTableBody = document.querySelector("#view-items-info-table tbody");
        if (infoTableBody) {
            infoTableBody.addEventListener("input", (e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains("inline-edit-desc")) {
                    const tr = target.closest("tr");
                    if (tr) {
                        const index = Array.from(tr.parentNode.children).indexOf(tr);
                        
                        // Sync with Finance Table Description
                        const financeRows = document.querySelectorAll("#view-items-finance-table tbody tr");
                        if (financeRows[index]) {
                            const finDesc = financeRows[index].querySelector(".inline-finance-desc-text");
                            if (finDesc) {
                                finDesc.textContent = (target as HTMLInputElement).value || "-";
                            }
                        }
                        
                        // Sync with Specifications Table Description
                        const specRows = document.querySelectorAll("#view-specifications-table tbody tr");
                        if (specRows[index]) {
                            const specDesc = specRows[index].querySelector(".inline-spec-desc-text");
                            if (specDesc) {
                                specDesc.textContent = (target as HTMLInputElement).value || "-";
                            }
                        }
                    }
                }
            });
        }

        const financeTableBody = document.querySelector("#view-items-finance-table tbody");
        if (financeTableBody) {
            financeTableBody.addEventListener("input", (e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains("inline-edit-qty") || 
                    target.classList.contains("inline-edit-price") || 
                    target.classList.contains("inline-edit-rate")) {
                    calculateInlineTotals();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupListeners);
    } else {
        setupListeners();
    }

    (window as any).viewPurchase = viewPurchase;
})();
