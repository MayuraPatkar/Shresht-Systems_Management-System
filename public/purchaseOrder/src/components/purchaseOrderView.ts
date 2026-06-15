// @ts-nocheck
(function () {
    async function generatePurchaseOrderViewPreview(purchaseOrder: any) {
        // Fetch company data from database
        let companyData: any = {};
        if ((window as any).companyConfig && (window as any).companyConfig.getCompanyInfo) {
            companyData = await (window as any).companyConfig.getCompanyInfo() || {};
        }

        const companyName = (companyData.company_name || companyData.company || "COMPANY NAME").toUpperCase();
        
        let cAddress = "";
        if (typeof companyData.address === 'string') {
            cAddress = companyData.address;
        } else if (companyData.address) {
            cAddress = [
                companyData.address.line1,
                companyData.address.line2,
                companyData.address.city,
                companyData.address.state ? companyData.address.state + (companyData.address.pincode ? ' - ' + companyData.address.pincode : '') : ''
            ].filter(Boolean).join(', ');
        } else {
            cAddress = "3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113";
        }

        const cPhone1 = companyData.phone?.ph1 || "7204657707";
        const cPhone2 = companyData.phone?.ph2;
        const cPhone = cPhone2 ? `${cPhone1} / ${cPhone2}` : cPhone1;
        const cGSTIN = companyData.gstin || companyData.GSTIN || "29AGCPN4093N1ZS";
        const cEmail = companyData.email || "shreshtsystems@gmail.com";
        const cWebsite = companyData.website || "www.shreshtsystems.com";

        const bank = companyData.bank_details || {};

        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));
        const numberToWords = (window as any).numberToWords || (() => "Amount In Words");

        const purchaseOrderId = purchaseOrder.purchase_order_no;
        const purchaseDate = purchaseOrder.purchase_date;
        const snapshot = purchaseOrder.supplier_snapshot || {};
        const supplierName = snapshot.name || "";
        const addr = snapshot.address || {};
        const addressParts = [];
        if (addr.line1) addressParts.push(addr.line1);
        if (addr.line2) addressParts.push(addr.line2);
        if (addr.city) addressParts.push(addr.city);
        if (addr.state || addr.pincode) {
            const statePin = [addr.state, addr.pincode].filter(Boolean).join(" - ");
            addressParts.push(statePin);
        }
        const supplierAddress = addressParts.join(", ") || "";
        const supplierPhone = snapshot.phone || "";
        const GSTIN = snapshot.gstin || "";
        
        let totalPrice = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalTax = 0;
        let totalTaxableValue = 0;
        let roundOff = 0;
        let sno = 0;

        let totalQtySum = 0;
        let totalUnitPriceSum = 0;
        let totalTaxableSum = 0;
        let totalItemsTaxSum = 0;
        let totalPriceSum = 0;

        let itemsHTML = "";

        (purchaseOrder.items || []).forEach((item: any) => {
            const description = item.description || "-";
            const hsnSac = item.hsn_sac || item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unit = item.unit || "pc";
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.gst_rate || item.rate || 0);

            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;
            totalQtySum += (window as any).isUnitCountedAsOne(description, item.unit) ? 1 : qty;
            totalUnitPriceSum += unitPrice;
            totalTaxableSum += taxableValue;

            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const taxAmount = cgstValue + sgstValue;
            const rowTotal = taxableValue + taxAmount;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalTax = totalCGST + totalSGST;
            totalPrice += rowTotal;
            totalItemsTaxSum += taxAmount;
            totalPriceSum += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unit}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(taxAmount, 2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        });

        const grandTotal = totalPrice;
        roundOff = Math.round(grandTotal) - grandTotal;
        const totalAmount = grandTotal + roundOff;

        let totalsHTML = `
            <div style="display: flex; width: 100%;">
                <div class="totals-section-sub1" style="width: 50%;">
                    <p>Taxable Value:</p>
                    <p>Total CGST:</p>
                    <p>Total SGST:</p>
                    <p>Grand Total:</p>
                </div>
                <div class="totals-section-sub2" style="width: 50%;">
                    <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                    <p>₹ ${formatIndian(totalCGST, 2)}</p>
                    <p>₹ ${formatIndian(totalSGST, 2)}</p>
                    <p>₹ ${formatIndian(totalAmount, 2)}</p>
                </div>
            </div>
        `;

        let totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left font-bold">TOTAL</td>
                <td class="text-center font-bold">${totalQtySum}</td>
                <td></td>
                <td></td>
                <td class="text-right font-bold">₹ ${formatIndian(totalTaxableSum, 2)}</td>
                <td></td>
                <td class="text-right font-bold">₹ ${formatIndian(totalItemsTaxSum, 2)}</td>
                <td class="text-right font-bold">₹ ${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;

        // Split items into rows for pagination
        const itemRows = itemsHTML.split('</tr>').filter((row: string) => row.trim().length > 0).map((row: string) => row + '</tr>');

        const ITEMS_PER_PAGE = 15;
        const SUMMARY_SECTION_ROW_COUNT = 8;

        const itemPages = [];
        let currentPageItemsHTML = '';
        let currentPageRowCount = 0;

        itemRows.forEach((row: string, index: number) => {
            const isLastItem = index === itemRows.length - 1;
            const itemSpace = 1; // Each row takes 1 line
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

        const formattedDate = (window as any).formatDateIndian ? 
            (window as any).formatDateIndian(purchaseDate) : 
            new Date(purchaseDate).toLocaleDateString();

        // Generate pages
        const pagesHTML = itemPages.map((pageHTML, index) => {
            const isLastPage = index === itemPages.length - 1;
            return `
        <div class="preview-container doc-standard doc-quotation">
            <div class="header">
            <div class="quotation-brand">
                <div class="logo">
                    <img src="../assets/icon.png" alt="${companyName} Logo">
                </div>
                <div class="quotation-brand-text">
                    <h1>${companyName}</h1>
                    <p class="quotation-tagline">CCTV & Energy Solutions</p>
                </div>
            </div>
            <div class="company-details">
                <p>${cAddress}</p>
                <p>Ph: ${cPhone}</p>
                <p>GSTIN: ${cGSTIN}</p>
                <p>Email: ${cEmail}</p>
                <p>Website: ${cWebsite}</p>
            </div>
            </div>

            <div class="second-section">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <p>Purchase Order - ${purchaseOrderId}</p>
                <div style="text-align:right;"> 
                            <p><strong>Date:</strong> ${formattedDate || ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(new Date()) : new Date().toLocaleDateString())}</p>
                        </div>
                        </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">From (Company)</p>
                    <p><strong>${companyName}</strong></p>
                    <p>${cAddress}</p>
                    <p>Ph: ${cPhone}</p>
                    <p>GSTIN: ${cGSTIN}</p>
                    <p>Email: ${cEmail}</p>
                </div>
                <div class="order-info">
                    <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">To (Supplier)</p>
                    <p><strong>${supplierName}</strong></p>
                    <p>${supplierAddress}</p>
                    <p>Ph: ${supplierPhone}</p>
                    <p>GSTIN: ${GSTIN}</p>
                </div>
            </div>
            ` : ''}

            <div class="fourth-section">
            <table>
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Taxable (₹)</th>
                    <th>Tax Rate (%)</th>
                    <th>Tax (₹)</th>
                    <th>Total Price (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${isLastPage ? (pageHTML + totalsRowHTML) : pageHTML}
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal + roundOff)} Only</span></p>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>

            <div class="sixth-section">
                <div class="declaration" contenteditable="true">
                    <p>We declare that this purchase order shows the actual price of the goods described and that all particulars are true and correct.</p>
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    <h4>Terms & Conditions:</h4>
                    <p>1. Goods should be delivered within the stipulated time period.</p>
                    <p>2. Quality of goods should match the specifications mentioned.</p>
                    <p>3. Payment terms as per mutual agreement.</p>
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${companyName}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated purchase order.</p>
            </div>
        </div>
        `;
        }).join('');

        const previewContent = document.getElementById("view-preview-content");
        if (previewContent) {
            previewContent.innerHTML = pagesHTML;
        }
        const formPreviewContent = document.getElementById("preview-content");
        if (formPreviewContent) {
            formPreviewContent.innerHTML = pagesHTML;
        }
    }

    // Print handlers
    const initializeView = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const hasView = document.getElementById('project-details-view');
        if (id && hasView) {
            viewPurchaseOrder(id);
        }

        const printBtn = document.getElementById('print-project');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                const contentEl = document.getElementById('view-preview-content');
                const content = contentEl ? contentEl.innerHTML : '';
                if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation) {
                    const poId = purchaseOrderId || 'Document';
                    (window as any).electronAPI.handlePrintEventQuatation(content, "print", `PurchaseOrder-${poId}`);
                } else if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEvent) {
                    (window as any).electronAPI.handlePrintEvent(content, "print");
                } else {
                    window.print();
                }
            });
        }

        const savePdfBtn = document.getElementById('save-project-pdf');
        if (savePdfBtn) {
            savePdfBtn.addEventListener('click', () => {
                const contentEl = document.getElementById('view-preview-content');
                const content = contentEl ? contentEl.innerHTML : '';
                if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation) {
                    const poId = purchaseOrderId || 'Document';
                    (window as any).electronAPI.handlePrintEventQuatation(content, "savePDF", `PurchaseOrder-${poId}`);
                } else if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEvent) {
                    (window as any).electronAPI.handlePrintEvent(content, "savePDF", "PurchaseOrder");
                } else {
                    window.print();
                }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeView);
    } else {
        initializeView();
    }

    let currentPurchaseOrder: any = null;
    let isEditingInline = false;
    function setEditingInline(val: boolean) {
        isEditingInline = val;
        
        const editBtn = document.getElementById("view-edit-btn");
        const saveBtn = document.getElementById("view-save-btn");
        const cancelBtn = document.getElementById("view-cancel-btn");
        const homeBtn = document.getElementById("home-btn");

        if (val) {
            if (editBtn) editBtn.style.display = 'none';
            if (saveBtn) { saveBtn.style.display = 'flex'; saveBtn.classList.remove('hidden'); }
            if (cancelBtn) { cancelBtn.style.display = 'flex'; cancelBtn.classList.remove('hidden'); }
            if (homeBtn) homeBtn.style.display = 'none';
        } else {
            if (editBtn) { editBtn.style.display = 'flex'; editBtn.classList.remove('hidden'); }
            if (saveBtn) { saveBtn.style.display = 'none'; saveBtn.classList.add('hidden'); }
            if (cancelBtn) { cancelBtn.style.display = 'none'; cancelBtn.classList.add('hidden'); }
            if (homeBtn) { homeBtn.style.display = 'flex'; homeBtn.classList.remove('hidden'); }
        }
    }
    Object.defineProperty(window, 'isEditingInline', {
        get: () => isEditingInline,
        set: (val) => { setEditingInline(val); },
        configurable: true
    });

    function showAlert(msg: string) {
        if ((window as any).electronAPI && (window as any).electronAPI.showAlert1) {
            (window as any).electronAPI.showAlert1(msg);
        } else {
            alert(msg);
        }
    }

    async function viewPurchaseOrder(purchaseOrderId: string) {
        try {
            let data;
            if ((window as any).purchaseOrderApi) {
                data = await (window as any).purchaseOrderApi.fetchPurchaseOrderById(purchaseOrderId);
            } else {
                const response = await fetch(`/purchaseOrder/${purchaseOrderId}`);
                if (!response.ok) throw new Error("Failed to fetch purchase order");
                data = await response.json();
            }
            
            const purchaseOrder = data.purchaseOrder;
            setEditingInline(false);
            renderPurchaseOrderDetails(purchaseOrder);
        } catch (error) {
            console.error("Error fetching purchase order:", error);
            showAlert("Failed to fetch purchase order details.");
        }
    }

    function renderPurchaseOrderDetails(purchaseOrder: any) {
        currentPurchaseOrder = purchaseOrder;
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

        // Fill Project Details
        const viewDate = document.getElementById('view-purchase-date');
        if (viewDate) {
            viewDate.textContent = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchaseOrder.purchase_date) : 
                new Date(purchaseOrder.purchase_date).toLocaleDateString();
        }

        // Buyer/Supplier Details
        const snapshot = purchaseOrder.supplier_snapshot || {};
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
        const dangerZoneSection = document.getElementById("danger-zone") || document.getElementById("danger-zone-section");
        
        if (isEditingInline) {
            editFields.forEach(el => el.classList.remove("hidden"));
            viewFields.forEach(el => el.classList.add("hidden"));
            actionHeaders.forEach(el => el.classList.remove("hidden"));
            if (dangerZoneSection) dangerZoneSection.classList.add("hidden");
            
            // Populating supplier edit fields
            const addr = snapshot.address || {};
            (document.getElementById('edit-purchase-date') as HTMLInputElement).value = purchaseOrder.purchase_date ? purchaseOrder.purchase_date.split('T')[0] : '';
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
            if (dangerZoneSection) {
                const userRole = sessionStorage.getItem('userRole') || 'user';
                if (userRole === 'admin' || userRole === 'manager') {
                    dangerZoneSection.classList.remove('hidden');
                } else {
                    dangerZoneSection.classList.add('hidden');
                }
            }
        }

        // Item List - clear and populate
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
        
        if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";
        if (viewSpecificationsTableBody) viewSpecificationsTableBody.innerHTML = "";

        let itemNumber = 1;
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let totalQty = 0;

        (purchaseOrder.items || []).forEach((item: any) => {
            if (isEditingInline) {
                addInlineRow(item);
            } else {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unit_price || 0);
                const rate = parseFloat(item.gst_rate || item.rate || 0);
                const taxableValue = qty * unitPrice;
                const taxAmount = (taxableValue * rate) / 100;
                const rowTotal = taxableValue + taxAmount;

                totalTaxable += taxableValue;
                totalTaxAmount += taxAmount;
                totalQty += (window as any).isUnitCountedAsOne(item.description, item.unit) ? 1 : qty;

                if (viewItemsTableBody) {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${qty}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.unit || 'pc'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">₹ ${formatIndian(unitPrice, 2)}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">${rate}%</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${formatIndian(rowTotal, 2)}</td>
                    `;
                    viewItemsTableBody.appendChild(row);
                }
                
                itemNumber++;
            }
        });

        if (!isEditingInline) {
            // Set footer totals row
            const viewItemsTableFoot = document.querySelector("#view-items-table tfoot");
            if (viewItemsTableFoot && (purchaseOrder.items || []).length > 0) {
                viewItemsTableFoot.innerHTML = `
                    <tr>
                        <td colspan="3" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxAmount, 2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(totalTaxable + totalTaxAmount, 2)}</td>
                    </tr>
                `;
            } else if (viewItemsTableFoot) {
                viewItemsTableFoot.innerHTML = "";
            }

            // Set totals
            const viewSubtotal = document.getElementById('view-subtotal');
            if (viewSubtotal) viewSubtotal.textContent = `₹ ${formatIndian(totalTaxable, 2)}`;
            
            const viewTax = document.getElementById('view-tax');
            if (viewTax) viewTax.textContent = `₹ ${formatIndian(totalTaxAmount, 2)}`;
            
            const grandTotal = totalTaxable + totalTaxAmount;
            const roundOff = Math.round(grandTotal) - grandTotal;
            const totalAmount = grandTotal + roundOff;
            
            const viewGrandTotal = document.getElementById('view-grand-total');
            if (viewGrandTotal) viewGrandTotal.textContent = `₹ ${formatIndian(totalAmount, 2)}`;

            const cgstEl = document.getElementById('view-cgst');
            const sgstEl = document.getElementById('view-sgst');
            const roundOffEl = document.getElementById('view-round-off');
            if (cgstEl) cgstEl.textContent = `₹ ${formatIndian(totalTaxAmount / 2, 2)}`;
            if (sgstEl) sgstEl.textContent = `₹ ${formatIndian(totalTaxAmount / 2, 2)}`;
            if (roundOffEl) roundOffEl.textContent = `₹ ${formatIndian(roundOff, 2)}`;
        }

        // Generate HTML preview for printing
        generatePurchaseOrderViewPreview(purchaseOrder);

        // Danger Zone Section Logic
        const dangerZoneSectionEl = document.getElementById("danger-zone") || document.getElementById('danger-zone-section');
        if (dangerZoneSectionEl && !isEditingInline) {
            const userRole = sessionStorage.getItem('userRole') || 'user';
            if (userRole === 'admin' || userRole === 'manager') {
                dangerZoneSectionEl.classList.remove('hidden');
            } else {
                dangerZoneSectionEl.classList.add('hidden');
            }
        }

        const archiveBtn = document.getElementById('archivePurchaseOrderBtn') as HTMLButtonElement | null;
        const deleteBtn = document.getElementById('deletePurchaseOrderBtn') as HTMLButtonElement | null;

        if (archiveBtn) {
            const newArchiveBtn = archiveBtn.cloneNode(true) as HTMLButtonElement;
            archiveBtn.parentNode?.replaceChild(newArchiveBtn, archiveBtn);

            if (purchaseOrder.is_archived) {
                newArchiveBtn.innerHTML = '<i class="fas fa-box-open"></i> Restore from Archive';
                newArchiveBtn.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer";
            } else {
                newArchiveBtn.innerHTML = '<i class="fas fa-archive"></i> Archive Purchase Order';
                newArchiveBtn.className = "bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer";
            }

            newArchiveBtn.addEventListener('click', () => {
                if (purchaseOrder.is_archived) {
                    if (typeof (window as any).handlePurchaseOrderRestoreFromArchive === 'function') {
                        (window as any).handlePurchaseOrderRestoreFromArchive(purchaseOrder.purchase_order_no);
                    }
                } else {
                    if (typeof (window as any).handlePurchaseOrderArchive === 'function') {
                        (window as any).handlePurchaseOrderArchive(purchaseOrder.purchase_order_no);
                    }
                }
            });
        }

        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
            deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);

            newDeleteBtn.addEventListener('click', () => {
                if (typeof (window as any).handlePurchaseOrderHardDelete === 'function') {
                    (window as any).handlePurchaseOrderHardDelete(purchaseOrder.purchase_order_no);
                }
            });
        }

        // Hide other sections, show view section
        const viewPreview = document.getElementById('view-preview');
        if (viewPreview) viewPreview.style.display = 'none';
        
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
        
        const rows = document.querySelectorAll("#view-items-table tbody tr");
        rows.forEach(row => {
            const qtyInput = row.querySelector(".inline-edit-qty") as HTMLInputElement;
            const priceInput = row.querySelector(".inline-edit-price") as HTMLInputElement;
            const rateInput = row.querySelector(".inline-edit-rate") as HTMLInputElement;
            
            if (qtyInput && priceInput && rateInput) {
                const qty = parseFloat(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const rate = parseFloat(rateInput.value) || 0;
                
                const taxable = qty * price;
                const tax = (taxable * rate) / 100;
                const rowTotal = taxable + tax;

                const rowTotalEl = row.querySelector(".inline-edit-row-total");
                if (rowTotalEl) rowTotalEl.textContent = `₹ ${formatIndian(rowTotal, 2)}`;
                
                const unitSelect = row.querySelector(".inline-edit-unit") as HTMLSelectElement;
                const descInput = row.querySelector(".inline-edit-desc") as HTMLInputElement;
                const unit = unitSelect ? unitSelect.value : "";
                const description = descInput ? descInput.value : "";

                totalQty += (window as any).isUnitCountedAsOne(description, unit) ? 1 : qty;
                totalTaxable += taxable;
                totalTaxAmount += tax;
            }
        });
        
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

        const viewItemsTableFoot = document.querySelector("#view-items-table tfoot");
        if (viewItemsTableFoot) {
            viewItemsTableFoot.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                    <td class="px-4 py-3"></td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxAmount, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(totalTaxable + totalTaxAmount, 2)}</td>
                    <td class="px-4 py-3 action-cell"></td>
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
        
        const viewGrandTotal = document.getElementById('view-grand-total');
        if (viewGrandTotal) viewGrandTotal.textContent = `₹ ${formatIndian(totalAmount, 2)}`;
    }

    function addInlineRow(item: any = {}) {
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        if (!viewItemsTableBody) return;
        
        const itemNumber = viewItemsTableBody.children.length + 1;
        
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const rate = parseFloat(item.gst_rate || item.rate || 0);
        const rowTotal = qty * unitPrice * (1 + rate / 100);
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-desc w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.description || ''}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <input type="text" class="inline-edit-hsn w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${item.hsn_sac || item.HSN_SAC || ''}">
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
            <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums inline-edit-row-total">
                ₹ ${formatIndian(rowTotal, 2)}
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 action-cell">
                <button type="button" class="inline-delete-row-btn text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Row">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        const deleteBtn = row.querySelector(".inline-delete-row-btn");
        deleteBtn?.addEventListener("click", () => {
            row.remove();
            renumberRows();
            calculateInlineTotals();
        });
        
        viewItemsTableBody.appendChild(row);
        calculateInlineTotals();
    }

    function renumberRows() {
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        if (!viewItemsTableBody) return;
        
        Array.from(viewItemsTableBody.children).forEach((row, i) => {
            const tdNo = row.querySelector("td:first-child");
            if (tdNo) tdNo.textContent = (i + 1).toString();
        });
    }

    async function saveInlineChanges() {
        if (!currentPurchaseOrder) return;

        const invoiceId = currentPurchaseOrder.purchase_order_no || '';
        const date = (document.getElementById('edit-purchase-date') as HTMLInputElement).value.trim();
        const name = (document.getElementById('edit-supplier-name') as HTMLInputElement).value.trim();

        if (!date) {
            showAlert("Date is required.");
            return;
        }
        if (!name) {
            showAlert("Supplier Name is required.");
            return;
        }

        const itemRows = document.querySelectorAll("#view-items-table tbody tr");
        
        if (itemRows.length === 0) {
            showAlert("At least one item is required.");
            return;
        }

        const items: any[] = [];
        let totalVal = 0;

        for (let i = 0; i < itemRows.length; i++) {
            const row = itemRows[i];
            
            const desc = (row.querySelector(".inline-edit-desc") as HTMLInputElement).value.trim();
            const qty = parseFloat((row.querySelector(".inline-edit-qty") as HTMLInputElement).value) || 0;
            const price = parseFloat((row.querySelector(".inline-edit-price") as HTMLInputElement).value) || 0;
            const rate = parseFloat((row.querySelector(".inline-edit-rate") as HTMLInputElement).value) || 0;
            const unit = (row.querySelector(".inline-edit-unit") as HTMLSelectElement).value;
            const hsn = (row.querySelector(".inline-edit-hsn") as HTMLInputElement).value.trim();
            
            // Retain original brand/category/specification from original item if matched
            const originalItem = (currentPurchaseOrder.items || [])[i] || {};
            const brand = originalItem.brand || "";
            const category = originalItem.category || "";
            const spec = originalItem.specification || "";

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
            purchase_order_no: currentPurchaseOrder.purchase_order_no,
            purchase_invoice_no: '',
            purchase_date: date,
            supplier_id: currentPurchaseOrder.supplier_id || "",
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
                success = await (window as any).sendDocumentToServer("/purchaseOrder/save-purchase-order", payload);
            } else {
                const response = await fetch("/purchaseOrder/save-purchase-order", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                success = response.ok;
            }

            if (success) {
                showAlert("Purchase Order saved successfully!");
                setEditingInline(false);
                currentPurchaseOrder = payload;
                renderPurchaseOrderDetails(currentPurchaseOrder);
                
                // Refresh list
                if ((window as any).purchaseOrderApi) {
                    const status = (window as any).statusFilter || '';
                    const deleted = !!(window as any).showDeletedItems;
                    const data = await (window as any).purchaseOrderApi.fetchRecentPurchaseOrders(status, deleted);
                    if ((window as any).allPurchaseOrders) {
                        (window as any).allPurchaseOrders = data.purchaseOrders;
                    }
                    if ((window as any).applyPurchaseOrderFilters) {
                        (window as any).applyPurchaseOrderFilters();
                    } else if ((window as any).purchaseOrderTable && (window as any).purchaseOrderTable.renderPurchaseOrders) {
                        (window as any).purchaseOrderTable.renderPurchaseOrders(data.purchaseOrders);
                    }
                }
            } else {
                showAlert("Failed to save purchase order.");
            }
        } catch (error) {
            console.error("Error saving purchase order inline:", error);
            showAlert("Failed to save purchase order. Please try again later.");
        }
    }

    function setupListeners() {

        const editBtn = document.getElementById("view-edit-btn") as HTMLButtonElement;
        if (editBtn) {
            const newEditBtn = editBtn.cloneNode(true) as HTMLButtonElement;
            editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener("click", () => {
                if (currentPurchaseOrder) {
                    setEditingInline(true);
                    renderPurchaseOrderDetails(currentPurchaseOrder);
                }
            });
        }

        const cancelBtn = document.getElementById("view-cancel-btn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                if (currentPurchaseOrder) {
                    setEditingInline(false);
                    renderPurchaseOrderDetails(currentPurchaseOrder);
                }
            });
        }

        const saveBtn = document.getElementById("view-save-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                saveInlineChanges();
            });
        }

        const addRowBtn = document.getElementById("add-inline-item-btn");
        if (addRowBtn) {
            addRowBtn.addEventListener("click", () => {
                addInlineRow({});
            });
        }

        const itemsTableBody = document.querySelector("#view-items-table tbody");
        if (itemsTableBody) {
            itemsTableBody.addEventListener("input", (e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains("inline-edit-desc")) {
                    const tr = target.closest("tr");
                    if (tr) {
                        const index = Array.from(tr.parentNode.children).indexOf(tr);
                        const specRows = document.querySelectorAll("#view-specifications-table tbody tr");
                        if (specRows[index]) {
                            const specDesc = specRows[index].querySelector(".inline-spec-desc-text");
                            if (specDesc) {
                                specDesc.textContent = (target as HTMLInputElement).value || "-";
                            }
                        }
                    }
                }
                
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

    (window as any).viewPurchaseOrder = viewPurchaseOrder;
    (window as any).generatePurchaseOrderViewPreview = generatePurchaseOrderViewPreview;
})();
