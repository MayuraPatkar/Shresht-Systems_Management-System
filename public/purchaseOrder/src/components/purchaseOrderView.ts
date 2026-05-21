// @ts-nocheck
(function () {
    async function generatePurchaseOrderViewPreview(purchaseOrder: any) {
        // Fetch company data from database
        let companyData = null;
        if ((window as any).companyConfig && (window as any).companyConfig.getCompanyInfo) {
            companyData = await (window as any).companyConfig.getCompanyInfo();
        } else {
            companyData = {
                company: "SHRESHT SYSTEMS",
                address: "3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113",
                phone: { ph1: "7204657707", ph2: "9901730305" },
                GSTIN: "29AGCPN4093N1ZS",
                email: "shreshtsystems@gmail.com",
                website: "www.shreshtsystems.com"
            };
        }
        const bank = companyData.bank_details || {};
        const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));
        const numberToWords = (window as any).numberToWords || (() => "Amount In Words");

        const purchaseOrderId = purchaseOrder.purchase_order_no;
        const purchaseDate = purchaseOrder.purchase_date;
        const purchaseInvoiceId = purchaseOrder.purchase_invoice_no || purchaseOrderId;
        const snapshot = purchaseOrder.supplier_snapshot || {};
        const supplierName = snapshot.name || "";
        const supplierAddress = snapshot.address?.line1 || "";
        const supplierPhone = snapshot.phone || "";
        const GSTIN = snapshot.gstin || "";
        
        let totalPrice = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalTax = 0;
        let totalTaxableValue = 0;
        let roundOff = 0;
        let sno = 0;

        let itemsHTML = "";
        let hasTax = (purchaseOrder.items || []).some((item: any) => parseFloat(item.rate || 0) > 0);

        (purchaseOrder.items || []).forEach((item: any) => {
            const description = item.description || "-";
            const hsnSac = item.hsn_sac || item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.gst_rate || item.rate || 0);

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
                totalTax = totalCGST + totalSGST;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${++sno}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(taxableValue, 2)}</td>
                        <td>${rate.toFixed(2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = taxableValue;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${++sno}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
        });

        const grandTotal = totalPrice;
        roundOff = Math.round(grandTotal) - grandTotal;
        const totalAmount = grandTotal + roundOff;

        let totalsHTML = `
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
                    <p>₹ ${formatIndian(totalAmount, 2)}</p>
                </div>
            </div>
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
                    <img src="../assets/icon.png" alt="${companyData.company} Logo">
                </div>
                <div class="quotation-brand-text">
                    <h1>${companyData.company.toUpperCase()}</h1>
                    <p class="quotation-tagline">CCTV & Energy Solutions</p>
                </div>
            </div>
            <div class="company-details">
                <p>${companyData.address}</p>
                <p>Ph: ${companyData.phone.ph1}${companyData.phone.ph2 ? ' / ' + companyData.phone.ph2 : ''}</p>
                <p>GSTIN: ${companyData.GSTIN}</p>
                <p>Email: ${companyData.email}</p>
                <p>Website: ${companyData.website}</p>
            </div>
        </div>

            <div class="second-section">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <p>Purchase Order-${purchaseOrderId}</p>
                <div style="text-align:right;"> 
                            <p><strong>Date:</strong> ${formattedDate || ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(new Date()) : new Date().toLocaleDateString())}</p>
                        </div>
                        </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Purchase From:</strong></p>
                    <p>${supplierName}</p>
                    <p>${supplierAddress}</p>
                    <p>Ph: ${supplierPhone}</p>
                    <p>GSTIN: ${GSTIN}</p>
                </div>
                <div class="order-info">
                    <p><strong>Purchase Invoice ID:</strong> ${purchaseInvoiceId}</p>
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
                    <th>Unit Price</th>
                    ${hasTax ? `
                        <th>Taxable Value (₹)</th>
                        <th>Tax Rate (%)</th>` : ""}
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal + roundOff)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.name || companyData.company}</p>
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
                <p>For ${companyData.company.toUpperCase()}</p>
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
    }

    // Print handlers
    const initializeView = () => {
        const printBtn = document.getElementById('print-project');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                const contentEl = document.getElementById('view-preview-content');
                const content = contentEl ? contentEl.innerHTML : '';
                if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation) {
                    const poId = document.getElementById('view-purchase-invoice-iD')?.textContent || 'Document';
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
                    const poId = document.getElementById('view-purchase-invoice-iD')?.textContent || 'Document';
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
            
            const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

            // Fill Project Details
            const viewInvoiceId = document.getElementById('view-purchase-invoice-iD');
            if (viewInvoiceId) viewInvoiceId.textContent = purchaseOrder.purchase_invoice_no || purchaseOrder.purchase_order_no || '-';
            
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
            if (viewAddress) viewAddress.textContent = snapshot.address?.line1 || '-';
            
            const viewPhone = document.getElementById('view-supplier-phone');
            if (viewPhone) viewPhone.textContent = snapshot.phone || '-';
            
            const viewEmail = document.getElementById('view-supplier-email');
            if (viewEmail) viewEmail.textContent = snapshot.email || '-';
            
            const viewGstin = document.getElementById('view-buyerGSTIN');
            if (viewGstin) viewGstin.textContent = snapshot.gstin || '-';

            // Item List - clear and populate
            const viewItemsTableBody = document.querySelector("#view-items-table tbody");
            const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
            
            if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";
            if (viewSpecificationsTableBody) viewSpecificationsTableBody.innerHTML = "";

            let itemNumber = 1;
            let totalTaxable = 0;
            let totalTaxAmount = 0;

            (purchaseOrder.items || []).forEach((item: any) => {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unit_price || 0);
                const rate = parseFloat(item.gst_rate || item.rate || 0);
                const taxableValue = qty * unitPrice;
                const taxAmount = (taxableValue * rate) / 100;

                totalTaxable += taxableValue;
                totalTaxAmount += taxAmount;

                if (viewItemsTableBody) {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.brand || item.company || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.category || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${qty}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(unitPrice, 2)}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-gray-900">${rate}%</td>
                    `;
                    viewItemsTableBody.appendChild(row);
                }

                if (viewSpecificationsTableBody) {
                    const specRow = document.createElement("tr");
                    specRow.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
                    `;
                    viewSpecificationsTableBody.appendChild(specRow);
                }
                
                itemNumber++;
            });

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

            // Generate HTML preview for printing
            await generatePurchaseOrderViewPreview(purchaseOrder);

            // Hide other sections, show view section
            const viewPreview = document.getElementById('view-preview');
            if (viewPreview) viewPreview.style.display = 'none';
            
            const home = document.getElementById('home');
            if (home) home.style.display = 'none';
            
            const newSection = document.getElementById('new');
            if (newSection) newSection.style.display = 'none';
            
            const viewSection = document.getElementById('view');
            if (viewSection) viewSection.style.display = 'block';

        } catch (error) {
            console.error("Error fetching purchase order:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to fetch purchase order. Please try again later.");
            }
        }
    }

    (window as any).viewPurchaseOrder = viewPurchaseOrder;
    (window as any).generatePurchaseOrderViewPreview = generatePurchaseOrderViewPreview;
})();
