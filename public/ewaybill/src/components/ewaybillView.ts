/**
 * E-Way Bill Module View and Preview Component
 */

(function () {
    // Local references to global helpers to avoid compile-time collisions
    const formatIndian = (window as any).formatIndian;
    const formatDateIndian = (window as any).formatDateIndian;
    const formatDate = (window as any).formatDate;
    const numberToWords = (window as any).numberToWords;
    const companyConfig = (window as any).companyConfig;
    const electronAPI = (window as any).electronAPI;

    // Helper function to format address JSON or objects nicely
    const formatAddress = (address: any): string => {
        if (!address) return '-';
        
        // If it's a string, try to parse it if it looks like a JSON object
        if (typeof address === 'string') {
            const trimmed = address.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    address = JSON.parse(trimmed);
                } catch (e) {
                    // Keep as string if parsing fails
                }
            }
        }
        
        if (typeof address === 'object' && address !== null) {
            const parts = [
                address.line1,
                address.line2,
                address.city,
                address.state && address.pincode ? `${address.state} - ${address.pincode}` : (address.state || address.pincode)
            ];
            return parts.filter(Boolean).map(p => String(p).trim()).join(', ');
        }
        
        return String(address || '-');
    };

    // Generate HTML for preview, returns the HTML string.
    // If targetElementId is provided, it also updates that element's innerHTML.
    async function generateViewPreviewHTML(wayBill: EWayBill, targetElementId: string | null = "view-preview-content"): Promise<string> {
        // Build items table rows
        let itemsHTML = "";
        let sno = 0;
        (wayBill.items || []).forEach((item: EWayBillItem) => {
            const description = item.description || "-";
            const hsnCode = item.hsn_sac || "-";
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unit_price || 0);
            const gstRate = Number(item.gst_rate || 0);

            const taxableValue = qty * unitPrice;
            const cgst = (taxableValue * (gstRate / 2)) / 100;
            const sgst = (taxableValue * (gstRate / 2)) / 100;
            const rowTotal = taxableValue + cgst + sgst;

            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnCode}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${gstRate > 0 ? gstRate.toFixed(2) + '%' : '0%'}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>`;
        });

        // Totals calculation
        const previewTotals = wayBill.totals || {};
        let totalTaxableValue = previewTotals.taxable_value !== undefined ? previewTotals.taxable_value : (wayBill.total_taxable_value || 0);
        let totalCGST = previewTotals.cgst !== undefined ? previewTotals.cgst : (wayBill.cgst || 0);
        let totalSGST = previewTotals.sgst !== undefined ? previewTotals.sgst : (wayBill.sgst || 0);

        // If totals not provided in object (e.g. during preview before save), calculate them
        if (!totalTaxableValue && wayBill.items && wayBill.items.length > 0) {
            totalTaxableValue = 0;
            totalCGST = 0;
            totalSGST = 0;
            (wayBill.items || []).forEach((item: EWayBillItem) => {
                const qty = Number(item.quantity || 0);
                const unitPrice = Number(item.unit_price || 0);
                const gstRate = Number(item.gst_rate || 0);
                const taxableValue = qty * unitPrice;
                totalTaxableValue += taxableValue;
                if (gstRate > 0) {
                    const cgst = (taxableValue * (gstRate / 2)) / 100;
                    const sgst = (taxableValue * (gstRate / 2)) / 100;
                    totalCGST += cgst;
                    totalSGST += sgst;
                }
            });
        }

        const totalTax = totalCGST + totalSGST;
        const grandTotal = previewTotals.grand_total !== undefined ? previewTotals.grand_total : (wayBill.total_invoice_value || Math.round(totalTaxableValue + totalTax));

        // Build paginated pages
        const itemRows = itemsHTML.split('</tr>').filter(r => r.trim().length > 0).map(r => r + '</tr>');
        const ITEMS_PER_PAGE = 15;
        const SUMMARY_SECTION_ROW_COUNT = 8;

        const pages: string[] = [];
        let currentPageHTML = '';
        let currentCount = 0;

        itemRows.forEach((row, idx) => {
            const isLast = idx === itemRows.length - 1;
            const req = 1;

            if (currentCount > 0 && ((!isLast && currentCount + req > ITEMS_PER_PAGE) || (isLast && currentCount + req + SUMMARY_SECTION_ROW_COUNT > ITEMS_PER_PAGE))) {
                pages.push(currentPageHTML);
                currentPageHTML = '';
                currentCount = 0;
            }
            currentPageHTML += row;
            currentCount += req;
        });
        if (currentPageHTML !== '') pages.push(currentPageHTML);
        if (pages.length === 0 && itemsHTML === '') pages.push(''); // Handle empty case

        // Company and header info
        const company = companyConfig ? await companyConfig.getCompanyInfo() : {};
        const companyName = company?.company_name || 'Company Name';
        let companyAddress = '';
        if (company?.address) {
            if (typeof company.address === 'object') {
                const addressParts = [
                    company.address.line1,
                    company.address.line2,
                    company.address.city,
                    company.address.state && company.address.pincode ? `${company.address.state} - ${company.address.pincode}` : company.address.state || company.address.pincode
                ].filter(Boolean);
                companyAddress = addressParts.join(', ');
            } else {
                companyAddress = company.address;
            }
        }
        const companyPhone = company?.phone ? (company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '')) : '';
        const companyGSTIN = company?.gstin || company?.GSTIN || '';
        const companyEmail = company?.email || '';
        const companyWebsite = company?.website || '';

        const transport = wayBill.transport || {};
        const transportDate = wayBill.ewaybill_generated_at || new Date().toISOString();

        // Extract invoice_id - it might be a populated object or just a string
        const invoiceIdDisplay = wayBill.invoice_id ? (typeof wayBill.invoice_id === 'object' ? ((wayBill.invoice_id as any).invoice_no || (wayBill.invoice_id as any).invoice_id) : wayBill.invoice_id) : '-';

        const pagesHTML = pages.map((pageHTML, index) => {
            const isLastPage = index === pages.length - 1;

            // Construct the transport details section cleanly
            const transportDetails = `
                <div class="transport-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
                    <div>
                       <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mode</p>
                       <p class="text-sm font-medium text-gray-900">${(transport as any).mode || '-'}</p>
                    </div>
                    <div>
                       <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Vehicle No</p>
                       <p class="text-sm font-medium text-gray-900">${(transport as any).vehicle_number || '-'}</p>
                    </div>
                     <div>
                       <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transporter</p>
                       <p class="text-sm font-medium text-gray-900">${(transport as any).transporter_name || '-'}</p>
                    </div>
                    <div>
                       <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Distance</p>
                       <p class="text-sm font-medium text-gray-900">${(transport as any).distance_km ? (transport as any).distance_km + ' km' : '-'}</p>
                    </div>
                </div>
            `;

            return `
            <div class="preview-container doc-standard doc-invoice doc-quotation">
                <div class="header">
                    <div class="quotation-brand">
                        <div class="logo"><img src="../assets/icon.png" alt="${companyName} Logo"></div>
                        <div class="quotation-brand-text">
                            <h1>${companyName}</h1>
                            <p class="quotation-tagline">CCTV & Energy Solutions</p>
                        </div>
                    </div>
                    <div class="company-details">
                        <p>${companyAddress}</p>
                        <p>Ph: ${companyPhone}</p>
                        <p>GSTIN: ${companyGSTIN}</p>
                        <p>Email: ${companyEmail}</p>
                        <p>Website: ${companyWebsite}</p>
                    </div>
                </div>

                <div class="second-section">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <p>E-WAY BILL ${wayBill.ewaybill_no ? `- ${wayBill.ewaybill_no}` : ''}</p>
                        <p><strong>Date: </strong>${typeof formatDateIndian === 'function' ? formatDateIndian(transportDate) : (typeof formatDate === 'function' ? formatDate(transportDate) : '')}</p>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center; margin-top: 4px;">
                         <p><strong>Invoice ID: </strong>${invoiceIdDisplay}</p>
                         <p><strong>Status: </strong><span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #f3f4f6; font-size: 0.8em;">${wayBill.ewaybill_status || 'Draft'}</span></p>
                    </div>
                </div>

                ${index === 0 ? `
                <div class="third-section">
                    <div class="buyer-details">
                        <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">Dispatch From</p>
                        <p style="white-space: pre-line; min-height: 80px;">${formatAddress(wayBill.from_address)}</p>
                    </div>
                    <div class="order-info">
                        <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">Ship To</p>
                        <p style="white-space: pre-line; min-height: 80px;">${formatAddress(wayBill.to_address)}</p>
                    </div>
                </div>
                
                ${transportDetails}
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
                                <th>Taxable (₹)</th>
                                <th>Tax (%)</th>
                                <th>Total (₹)</th>
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
                                <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal)} Only.</span></p>
                            </div>
                        </div>
                        <div class="totals-section">
                            <div style="display: flex; width: 100%;">
                                <div class="totals-section-sub1" style="width: 50%;">
                                    <p>Taxable Value:</p>
                                    <p>Total CGST:</p>
                                    <p>Total SGST:</p>
                                    <p><strong>Grand Total:</strong></p>
                                </div>
                                <div class="totals-section-sub2" style="width: 50%;">
                                    <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                                    <p>₹ ${formatIndian(totalCGST, 2)}</p>
                                    <p>₹ ${formatIndian(totalSGST, 2)}</p>
                                    <p><strong>₹ ${formatIndian(grandTotal, 2)}</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sixth-section">
                     <div class="declaration">
                         <p>Certified that the particulars given above are true and correct.</p>
                    </div>
                </div>

                <div class="eighth-section">
                    <p>For ${companyName}</p>
                    <div class="eighth-section-space"></div>
                    <p><strong>Authorized Signatory</strong></p>
                </div>
                ` : ''}

                <div class="ninth-section">
                    <p>This is a computer-generated document.</p>
                </div>
            </div>
            `;
        }).join('');

        // If target provided, update it
        if (targetElementId) {
            const target = document.getElementById(targetElementId);
            if (target) target.innerHTML = pagesHTML;
        }

        return pagesHTML;
    }

    // Print and Save as PDF handlers
    document.getElementById("printProject")?.addEventListener("click", () => {
        const previewContentEl = document.getElementById("view-preview-content");
        const previewContent = previewContentEl ? previewContentEl.innerHTML : "";
        if (electronAPI && electronAPI.handlePrintEvent) {
            electronAPI.handlePrintEvent(previewContent, "print");
        } else {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1("Print functionality is not available.");
            } else {
                alert("Print functionality is not available.");
            }
        }
    });

    document.getElementById("saveProjectPDF")?.addEventListener("click", () => {
        const previewContentEl = document.getElementById("view-preview-content");
        const previewContent = previewContentEl ? previewContentEl.innerHTML : "";
        if (electronAPI && electronAPI.handlePrintEvent) {
            const idEl = document.getElementById('view-ewaybill-no');
            const name = idEl && idEl.textContent !== '-' ? `EWayBill-${idEl.textContent.replace(/\s+/g, '')}` : 'EWayBill';
            electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        } else {
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1("Print functionality is not available.");
            } else {
                alert("Print functionality is not available.");
            }
        }
    });

    async function viewWayBill(wayBillId: string): Promise<void> {
        try {
            const waybill = await (window as any).ewaybillApi.getEWayBillDetails(wayBillId);
            let sno = 0;

            // Hide other sections, show view section
            const homeEl = document.getElementById('home');
            if (homeEl) homeEl.style.display = 'none';
            const newEl = document.getElementById('new');
            if (newEl) newEl.style.display = 'none';
            const viewEl = document.getElementById('view');
            if (viewEl) viewEl.style.display = 'flex';
            const homeBtn = document.getElementById('new-waybill-btn');
            if (homeBtn) homeBtn.style.display = 'none';
            const previewBtn = document.getElementById('view-preview');
            if (previewBtn) previewBtn.style.display = 'none';

            // Fill E-Way Bill Details
            const viewWbNoEl = document.getElementById('view-ewaybill-no');
            if (viewWbNoEl) viewWbNoEl.textContent = waybill.ewaybill_no || '-';

            // Handle populated invoice_id - it might be an object with invoice_id/invoice_no property or just a string
            const invoiceId = waybill.invoice_id ? (typeof waybill.invoice_id === 'object' ? ((waybill.invoice_id as any).invoice_no || (waybill.invoice_id as any).invoice_id) : waybill.invoice_id) : '-';
            const viewInvoiceIdEl = document.getElementById('view-invoice-id');
            if (viewInvoiceIdEl) viewInvoiceIdEl.textContent = invoiceId;

            const viewWbStatusEl = document.getElementById('view-ewaybill-status');
            if (viewWbStatusEl) viewWbStatusEl.textContent = waybill.ewaybill_status || '-';

            const viewDateEl = document.getElementById('view-waybill-date');
            if (viewDateEl) {
                viewDateEl.textContent = waybill.ewaybill_generated_at ? (typeof formatDateIndian === 'function' ? formatDateIndian(waybill.ewaybill_generated_at) : waybill.ewaybill_generated_at) : '-';
            }

            // Address Details
            const viewFromAddrEl = document.getElementById('view-from-address');
            if (viewFromAddrEl) viewFromAddrEl.textContent = formatAddress(waybill.from_address);
            const viewToAddrEl = document.getElementById('view-to-address');
            if (viewToAddrEl) viewToAddrEl.textContent = formatAddress(waybill.to_address);

            // Transportation Details
            const transport = waybill.transport || {};
            const viewTransportModeEl = document.getElementById('view-transport-mode');
            if (viewTransportModeEl) viewTransportModeEl.textContent = (transport as any).mode || '-';
            const viewVehicleNoEl = document.getElementById('view-vehicle-number');
            if (viewVehicleNoEl) viewVehicleNoEl.textContent = (transport as any).vehicle_number || '-';
            const viewTransporterIdEl = document.getElementById('view-transporter-id');
            if (viewTransporterIdEl) viewTransporterIdEl.textContent = (transport as any).transporter_id || '-';
            const viewTransporterNameEl = document.getElementById('view-transporter-name');
            if (viewTransporterNameEl) viewTransporterNameEl.textContent = (transport as any).transporter_name || '-';
            const viewDistanceKmEl = document.getElementById('view-distance-km');
            if (viewDistanceKmEl) viewDistanceKmEl.textContent = (transport as any).distance_km ? `${(transport as any).distance_km} km` : '-';

            // Item List
            const viewItemsTableBody = document.querySelector("#view-items-table tbody") as HTMLTableSectionElement | null;
            if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";

            (waybill.items || []).forEach((item: EWayBillItem) => {
                const row = document.createElement("tr");
                const taxableValue = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.gst_rate || '0'}%</td>
                    <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(taxableValue, 2)}</td>
                `;
                if (viewItemsTableBody) viewItemsTableBody.appendChild(row);
            });

            // Set totals
            const setTextContent = (id: string, value: string) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };

            const totals = waybill.totals || {};
            const totalTaxable = totals.taxable_value !== undefined ? totals.taxable_value : (waybill.total_taxable_value || 0);
            const cgst = totals.cgst !== undefined ? totals.cgst : (waybill.cgst || 0);
            const sgst = totals.sgst !== undefined ? totals.sgst : (waybill.sgst || 0);
            const grandTotal = totals.grand_total !== undefined ? totals.grand_total : (waybill.total_invoice_value || 0);

            setTextContent('view-total-taxable', `₹ ${formatIndian(totalTaxable, 2)}`);
            setTextContent('view-cgst', `₹ ${formatIndian(cgst, 2)}`);
            setTextContent('view-sgst', `₹ ${formatIndian(sgst, 2)}`);
            setTextContent('view-total-invoice', `₹ ${formatIndian(grandTotal, 2)}`);

            await generateViewPreviewHTML(waybill);

            // Danger Zone logic for view page
            const dangerZoneSection = document.getElementById('danger-zone-section');
            if (dangerZoneSection) {
                const userRole = sessionStorage.getItem('userRole') || 'user';
                if (userRole === 'admin' || userRole === 'manager') {
                    dangerZoneSection.classList.remove('hidden');
                } else {
                    dangerZoneSection.classList.add('hidden');
                }
            }

            const archiveBtn = document.getElementById('archiveEwaybillBtn') as HTMLButtonElement | null;
            const deleteBtn = document.getElementById('deleteEwaybillBtn') as HTMLButtonElement | null;

            if (archiveBtn) {
                const newArchiveBtn = archiveBtn.cloneNode(true) as HTMLButtonElement;
                archiveBtn.parentNode?.replaceChild(newArchiveBtn, archiveBtn);

                if (waybill.is_archived) {
                    newArchiveBtn.innerHTML = '<i class="fas fa-box-open"></i> Restore from Archive';
                    newArchiveBtn.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer";
                } else {
                    newArchiveBtn.innerHTML = '<i class="fas fa-archive"></i> Archive E-Way Bill';
                    newArchiveBtn.className = "bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer";
                }

                newArchiveBtn.addEventListener('click', async () => {
                    try {
                        if (waybill.is_archived) {
                            await (window as any).ewaybillApi.restoreEWayBill(waybill._id);
                            if (electronAPI && electronAPI.showAlert1) {
                                electronAPI.showAlert1('E-Way Bill restored from archive.');
                            }
                        } else {
                            await (window as any).ewaybillApi.archiveEWayBill(waybill._id);
                            if (electronAPI && electronAPI.showAlert1) {
                                electronAPI.showAlert1('E-Way Bill archived successfully.');
                            }
                        }
                        const homeBtn = document.getElementById('home-btn');
                        if (homeBtn) {
                            homeBtn.click();
                        } else {
                            window.location.href = '/ewaybill';
                        }
                    } catch (err) {
                        console.error('Archive/Restore action failed:', err);
                        if (electronAPI && electronAPI.showAlert1) {
                            electronAPI.showAlert1('Failed to perform archive/restore action.');
                        }
                    }
                });
            }

            if (deleteBtn) {
                const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
                deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);

                newDeleteBtn.addEventListener('click', () => {
                    const message = 'Are you sure you want to delete this e-way bill?';
                    if (electronAPI?.showAlert2) {
                        electronAPI.showAlert2(message);
                        electronAPI.receiveAlertResponse(async (response: string) => {
                            if (response === "Yes") {
                                try {
                                    await (window as any).ewaybillApi.deleteEWayBill(waybill._id);
                                    if (electronAPI.showAlert1) {
                                        electronAPI.showAlert1('E-Way Bill deleted successfully.');
                                    }
                                    const homeBtn = document.getElementById('home-btn');
                                    if (homeBtn) {
                                        homeBtn.click();
                                    } else {
                                        window.location.href = '/ewaybill';
                                    }
                                } catch (err) {
                                    console.error('Delete failed:', err);
                                    if (electronAPI.showAlert1) {
                                        electronAPI.showAlert1('Failed to delete e-way bill.');
                                    }
                                }
                            }
                        });
                    } else {
                        if (confirm(message)) {
                            (async () => {
                                try {
                                    await (window as any).ewaybillApi.deleteEWayBill(waybill._id);
                                    alert('E-Way Bill deleted successfully.');
                                    const homeBtn = document.getElementById('home-btn');
                                    if (homeBtn) {
                                        homeBtn.click();
                                    } else {
                                        window.location.href = '/ewaybill';
                                    }
                                } catch (err) {
                                    console.error('Delete failed:', err);
                                    alert('Failed to delete e-way bill.');
                                }
                            })();
                        }
                    }
                });
            }

        } catch (error) {
            console.error("Error fetching e-way bill:", error);
            if (electronAPI && electronAPI.showAlert1) {
                electronAPI.showAlert1("Failed to fetch e-way bill. Please try again later.");
            } else {
                alert("Failed to fetch e-way bill. Please try again later.");
            }
        }
    }

    // Expose functions globally
    (window as any).viewWayBill = viewWayBill;
    (window as any).generateViewPreviewHTML = generateViewPreviewHTML;
})();
