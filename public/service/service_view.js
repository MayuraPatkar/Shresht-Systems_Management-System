// Service View - View individual service records and service history

// Helper: Get descriptive service stage label
function getServiceStageLabel(stage) {
    // Normalize stage to a number (1-based); fall back to 1 if invalid
    let s = Number(stage) || 0;
    // If s === 0 then no service yet; but label will show '1st Service' for stage 1
    const stages = [
        '1st Service',
        '2nd Service',
        '3rd Service',
        '4th Service',
        '5th Service',
        '6th Service',
        '7th Service',
        '8th Service',
        '9th Service',
        '10th Service'
    ];
    // Treat stage as 1-based: index into array by stage-1
    const index = Math.max(0, s - 1);
    const displayStage = s > 0 ? s : 1;
    return stages[index] || `${displayStage}th Service`;
}

// Helper: Format date to Indian format
function formatDateIndian(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Helper: Format currency in Indian style
function formatIndianCurrency(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// View individual service record
async function viewService(serviceId) {
    try {
        // Fetch service data
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) throw new Error("Failed to fetch service");
        
        const data = await response.json();
        const service = data.service;
        const invoice = service.invoice_details;
        
        // Show view section
        document.getElementById('view').style.display = 'block';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        
        // Populate service details
        document.getElementById('view-service-id').textContent = service.service_id;
        
        // Make invoice ID clickable
        const invoiceIdElement = document.getElementById('view-invoice-id');
        invoiceIdElement.textContent = service.invoice_id;
        invoiceIdElement.style.cursor = 'pointer';
        invoiceIdElement.addEventListener('click', () => {
            navigateTo(`/invoice?view=${service.invoice_id}`);
        });
        
        document.getElementById('view-service-date').textContent = formatDateIndian(service.service_date);
        
        // Set service stage badge with color
        const stageBadge = document.getElementById('view-service-stage');
        const stageLabel = getServiceStageLabel(service.service_stage);
        stageBadge.textContent = stageLabel;
        
        const stageBadgeColors = [
            'bg-blue-100 text-blue-700',
            'bg-green-100 text-green-700',
            'bg-purple-100 text-purple-700',
            'bg-orange-100 text-orange-700',
            'bg-teal-100 text-teal-700'
        ];
        // Determine index safely even if service_stage is 0 or undefined
        const len = stageBadgeColors.length;
        const idx = Math.max(0, ((((Number(service.service_stage) || 0) - 1) % len) + len) % len);
        const badgeColor = stageBadgeColors[idx];
        stageBadge.className = `inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeColor}`;
        
        // Populate customer details from invoice
        if (invoice) {
            document.getElementById('view-customer-name').textContent = invoice.customer_name || 'N/A';
            document.getElementById('view-customer-phone').textContent = invoice.customer_phone || 'N/A';
            document.getElementById('view-customer-address').textContent = invoice.customer_address || 'N/A';
            document.getElementById('view-customer-gstin').textContent = invoice.customer_gstin || 'N/A';
            document.getElementById('view-project-name').textContent = invoice.project_name || 'N/A';
        }
        
        // Normalize notes if they contain a 0 stage (legacy entries)
        const rawNotes = service.notes || 'No notes';
        const normalizedNotes = rawNotes.replace(/Service stage\s+(\d+)/gi, (match, p1) => {
            const num = Number(p1);
            return `Service stage ${num === 0 ? (service.service_stage || 1) : num}`;
        });
        document.getElementById('view-notes').textContent = normalizedNotes;
        
        // Populate items table
        const itemsTableBody = document.getElementById("view-items-tbody");
        itemsTableBody.innerHTML = "";
        
        if (service.items && service.items.length > 0) {
            service.items.forEach((item, index) => {
                const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
                const gstAmount = (itemTotal * (item.rate || 0)) / 100;
                const totalWithGst = itemTotal + gstAmount;
                
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="px-4 py-3 text-gray-800">${index + 1}</td>
                    <td class="px-4 py-3 text-gray-800">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-gray-800">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-right text-gray-800">${item.quantity || 0}</td>
                    <td class="px-4 py-3 text-right text-gray-800">${formatIndianCurrency(item.unit_price)}</td>
                    <td class="px-4 py-3 text-right text-gray-800">${item.rate || 0}%</td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900">${formatIndianCurrency(totalWithGst)}</td>
                `;
                itemsTableBody.appendChild(row);
            });
        } else {
            itemsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">No items</td>
                </tr>
            `;
        }
        
        // Populate non-items table
        const nonItemsSection = document.getElementById('view-non-items-section');
        const nonItemsTableBody = document.getElementById("view-non-items-tbody");
        
        if (service.non_items && service.non_items.length > 0) {
            nonItemsSection.style.display = 'block';
            nonItemsTableBody.innerHTML = "";
            
            service.non_items.forEach((item, index) => {
                const gstAmount = ((item.price || 0) * (item.rate || 0)) / 100;
                const totalWithGst = (item.price || 0) + gstAmount;
                
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="px-4 py-3 text-gray-800">${index + 1}</td>
                    <td class="px-4 py-3 text-gray-800">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-right text-gray-800">${formatIndianCurrency(item.price)}</td>
                    <td class="px-4 py-3 text-right text-gray-800">${item.rate || 0}%</td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900">${formatIndianCurrency(totalWithGst)}</td>
                `;
                nonItemsTableBody.appendChild(row);
            });
        } else {
            nonItemsSection.style.display = 'none';
        }
        
        // Set totals
        document.getElementById('view-subtotal').textContent = formatIndianCurrency(service.total_amount_no_tax);
        document.getElementById('view-tax').textContent = formatIndianCurrency(service.total_tax);
        document.getElementById('view-grand-total').textContent = formatIndianCurrency(service.total_amount_with_tax);
        
        // Generate print preview using existing generateServicePreview
        generateServicePreview(service, invoice);
        
        // Attach button handlers
        document.getElementById('print-service-btn').addEventListener('click', () => {
            const content = document.getElementById('view-service-preview-content').innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEvent) {
                window.electronAPI.handlePrintEvent(content, "print", `Service-${service.service_id}`);
            } else {
                console.error('Print functionality not available');
            }
        });
        
        document.getElementById('save-service-pdf-btn').addEventListener('click', () => {
            const content = document.getElementById('view-service-preview-content').innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEvent) {
                window.electronAPI.handlePrintEvent(content, "savePDF", `Service-${service.service_id}`);
            } else {
                console.error('PDF save functionality not available');
            }
        });
        
        document.getElementById('view-service-history-btn').addEventListener('click', () => {
            viewServiceHistory(service.invoice_id);
        });
        
        document.getElementById('close-view-btn').addEventListener('click', () => {
            showHome();
        });
        
    } catch (error) {
        console.error("Error viewing service:", error);
        window.electronAPI?.showAlert1("Failed to load service details");
    }
}

// Generate print preview for service (matching invoice design exactly)
async function generateServicePreview(service, invoice) {
    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};
    
    const previewContent = document.getElementById('view-service-preview-content');
    
    const serviceDate = formatDateIndian(service.service_date);
    const stageLabel = getServiceStageLabel(service.service_stage);
    
    // Calculate totals
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalPrice = 0;
    let hasTax = false;
    
    // Build items HTML
    let itemsHTML = '';
    let sno = 1;
    
    if (service.items && service.items.length > 0) {
        hasTax = service.items.some(item => parseFloat(item.rate || 0) > 0) || 
                  (service.non_items && service.non_items.some(item => parseFloat(item.rate || 0) > 0));
        
        service.items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);

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
                        <td>${sno++}</td>
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
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
        });
    }
    
    // Build non-items HTML
    if (service.non_items && service.non_items.length > 0) {
        service.non_items.forEach(item => {
            const description = item.description || "-";
            const price = parseFloat(item.price || 0);
            const rate = parseFloat(item.rate || 0);

            totalTaxableValue += price;

            if (hasTax) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;
                const rowTotal = price + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${rate.toFixed(2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = price;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
        });
    }
    
    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;
    
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
                <p>₹ ${formatIndian(finalTotal, 2)}</p>
            </div>
        </div>`;
    
    // Split items into pages
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
    
    // Generate pages HTML
    const pagesHTML = itemPages.map((pageHTML, index) => {
        const isLastPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-standard doc-invoice doc-quotation">
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
                <p>SERVICE RECEIPT - ${stageLabel.toUpperCase()}</p>
            </div>
            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Customer Details:</strong></p>
                    <p>${invoice?.customer_name || 'N/A'}</p>
                    <p>${invoice?.customer_address || 'N/A'}</p>
                    <p>Ph. ${invoice?.customer_phone || 'N/A'}</p>
                </div>
                <div class="order-info">
                    <p><strong>Project:</strong> ${invoice?.project_name || 'N/A'}</p>
                    <p><strong>Service ID:</strong> ${service.service_id}</p>
                    <p><strong>Invoice ID:</strong> ${service.invoice_id}</p>
                    <p><strong>Service Date:</strong> ${serviceDate}</p>
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(finalTotal)} Only.</span></p>
                        </div>
                        <h3>Payment Details:</h3>
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
                    <p>We declare that this service receipt shows the actual service charges and that all particulars are true and correct.</p>
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    <h3>Terms & Conditions:</h3>
                    <p>1. Payment should be made within 15 days from the date of service.</p>
                    <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                    <p>3. All services are subject to our standard terms and conditions.</p>
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${company.company.toUpperCase()}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated service receipt.</p>
            </div>
        </div>
        `;
    }).join('');
    
    previewContent.innerHTML = pagesHTML;
}

// View service history for an invoice (modal)
async function viewServiceHistory(invoiceId) {
    try {
        const response = await fetch(`/service/history/${invoiceId}`);
        if (!response.ok) throw new Error("Failed to fetch service history");
        
        const data = await response.json();
        const services = data.services || [];
        
        // Show modal
        const modal = document.getElementById('service-history-modal');
        const timeline = document.getElementById('service-history-timeline');
        
        modal.style.display = 'flex';
        timeline.innerHTML = '';
        
        if (services.length === 0) {
            timeline.style.overflowY = 'hidden';
            timeline.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-history text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl font-semibold text-gray-600">No service history found for this invoice</p>
                </div>
            `;
            return;
        }
        
        // Enable scrolling when there's content
        timeline.style.overflowY = 'auto';
        
        // Build timeline
        const timelineHTML = services.map((service, index) => {
            const isLast = index === services.length - 1;
            const serviceStage = service.service_stage || 0;
            const stageLabel = getServiceStageLabel(serviceStage);
            const serviceDate = service.service_date ? formatDateIndian(service.service_date) : 'N/A';
            const grandTotal = formatIndianCurrency(service.total_amount_with_tax || 0);
            
            const stageBadgeColors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-teal-500'
            ];
            const colorIndex = Math.max(0, (serviceStage - 1) % stageBadgeColors.length);
            const dotColor = stageBadgeColors[colorIndex];
            const badgeColorName = dotColor.split('-')[1] || 'blue';
            
            return `
                <div class="flex gap-4 mb-6 ${isLast ? '' : 'pb-6 border-l-2 border-gray-200 ml-4'}">
                    <div class="relative">
                        <div class="w-8 h-8 rounded-full ${dotColor} flex items-center justify-center shadow-lg -ml-[17px]">
                            <i class="fas fa-wrench text-white text-sm"></i>
                        </div>
                    </div>
                    <div class="flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">${stageLabel}</h3>
                                <p class="text-sm text-gray-600">Service ID: <span class="font-semibold text-blue-600">${service.service_id || 'N/A'}</span></p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold bg-${badgeColorName}-100 text-${badgeColorName}-700">
                                ${stageLabel}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Service Date</p>
                                <p class="font-semibold text-gray-800">${serviceDate}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</p>
                                <p class="font-semibold text-green-600 text-lg">${grandTotal}</p>
                            </div>
                        </div>
                        ${service.notes ? `
                        <div class="mb-4">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                            <p class="text-sm text-gray-700">${service.notes}</p>
                        </div>
                        ` : ''}
                        <button data-service-id="${service.service_id}" 
                            class="view-service-details-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        timeline.innerHTML = `
            <div class="mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-2">Service History for Invoice: ${invoiceId}</h3>
                <p class="text-gray-600">${services.length} service(s) completed</p>
            </div>
            <div class="mt-6">
                ${timelineHTML}
            </div>
        `;
        
    } catch (error) {
        console.error("Error fetching service history:", error);
        window.electronAPI?.showAlert1("Failed to load service history");
    }
}

// Close modal event listener
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-history-modal')?.addEventListener('click', () => {
        document.getElementById('service-history-modal').style.display = 'none';
    });
    
    // Click outside modal to close
    document.getElementById('service-history-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'service-history-modal') {
            document.getElementById('service-history-modal').style.display = 'none';
        }
    });
    
    // Event delegation for dynamically created "View Details" buttons in service history modal
    document.getElementById('service-history-timeline')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-service-details-btn');
        if (btn) {
            const serviceId = btn.dataset.serviceId;
            if (serviceId) {
                // Close the modal first
                document.getElementById('service-history-modal').style.display = 'none';
                // Then view the service
                viewService(serviceId);
            }
        }
    });
});

// Make functions globally available
window.viewService = viewService;
window.viewServiceHistory = viewServiceHistory;
window.getServiceStageLabel = getServiceStageLabel;

// Original generatePreview function (for form preview - keep existing functionality)
async function generatePreview() {
    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};
    
    const serviceId = document.getElementById('service-id')?.value || '';
    const invoiceId = document.getElementById('invoice-id')?.value || '';
    const serviceStage = parseInt(document.getElementById('service-stage')?.value || 0);
    const name = document.getElementById("name")?.value || "";
    const address = document.getElementById("address")?.value || "";
    const phone = document.getElementById("phone")?.value || "";
    const email = document.getElementById("email")?.value || "";
    const projectName = document.getElementById("project-name")?.value || "";
    const serviceDate = document.getElementById("date")?.value || new Date().toISOString().split('T')[0];

    // Service reference number (Invoice ID + Service Stage)
    const serviceReference = `${invoiceId}-S${serviceStage + 1}`;

    // Get items and calculate totals
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');

    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let sno = 0;

    // Check if rate column is populated
    let hasTax = false;
    if (itemsTable && itemsTable.rows) {
        hasTax = Array.from(itemsTable.rows).some(row => {
            const rateInput = row.cells[5]?.querySelector("input");
            return rateInput && parseFloat(rateInput.value) > 0;
        });
    }

    // Process regular items
    let itemsHTML = '';
    if (itemsTable && itemsTable.rows) {
        for (const row of itemsTable.rows) {
            const description = row.cells[1]?.querySelector("input")?.value || "-";
            const hsnSac = row.cells[2]?.querySelector("input")?.value || "-";
            const qty = parseFloat(row.cells[3]?.querySelector("input")?.value || "0");
            const unitPrice = parseFloat(row.cells[4]?.querySelector("input")?.value || "0");
            const rate = parseFloat(row.cells[5]?.querySelector("input")?.value || "0");

            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;

            if (hasTax && rate > 0) {
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
                        <td>${sno + 1}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(taxableValue, 2)}</td>
                        <td>${rate.toFixed(2)}%</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = taxableValue;
                totalPrice += rowTotal;
                itemsHTML += `
                    <tr>
                        <td>${sno + 1}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
            sno++;
        }
    }

    // Process non-items
    if (nonItemsTable && nonItemsTable.rows) {
        const nonItems = Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
            descriptions: row.querySelector('input[placeholder="Item Description"]')?.value || '',
            price: row.querySelector('input[placeholder="Price"]')?.value || '0',
            rate: row.querySelector('input[placeholder="Rate"]')?.value || '0',
        }));

        for (const item of nonItems) {
            const description = item.descriptions || '-';
            const price = Number(item.price) || 0;
            const rate = Number(item.rate) || 0;

            if (!description || description === '-') continue;

            let rowTotal = price;
            totalTaxableValue += price;

            if (hasTax && rate > 0) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                rowTotal += cgstValue + sgstValue;
            }

            totalPrice += rowTotal;

            if (hasTax) {
                itemsHTML += `
                    <tr>
                        <td>${sno + 1}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${rate || '-'}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                itemsHTML += `
                    <tr>
                        <td>${sno + 1}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
            sno++;
        }
    }

    const grandTotal = Math.round(totalPrice);

    // Build totals HTML - using same structure as invoice/quotation
    let totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                <p>Taxable Value:</p>
                ${hasTax ? `
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                ${hasTax ? `
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(grandTotal, 2)}</p>
            </div>
        </div>`;

    // Split items into rows for pagination
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

    // Generate pages
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
                <p>SERVICE RECEIPT - ${serviceReference}</p>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Customer Details:</strong></p>
                    <p>${name}</p>
                    <p>${address}</p>
                    <p>Ph. ${phone}</p>
                    ${email ? `<p>Email: ${email}</p>` : ''}
                </div>
                <div class="info-section">
                    <p><strong>Service ID:</strong> ${serviceId}</p>
                    <p><strong>Invoice Ref:</strong> ${invoiceId}</p>
                    <p><strong>Project:</strong> ${projectName || '-'}</p>
                    <p><strong>Service Date:</strong> ${new Date(serviceDate).toLocaleDateString('en-IN')}</p>
                    <p><strong>Service Stage:</strong> ${serviceStage + 1}</p>
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
                            <th>Tax Rate (%)</th>` : ''}
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal)} Only.</span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg" alt="qr-code" />
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
                    <p>This service receipt confirms payment received for the services described above. All particulars are true and correct.</p>
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    <h4>Service Notes:</h4>
                    <p>1. This is service receipt for stage ${serviceStage + 1}</p>
                    <p>2. Service performed as per schedule and agreement</p>
                    <p>3. Next service will be scheduled as per contract terms</p>
                    <p>4. For any queries, please contact us at the above contact details</p>
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${company.company.toUpperCase()}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated service receipt.</p>
            </div>
        </div>
        `;
    }).join('');

    const previewContainer = document.getElementById("preview-content");
    if (!previewContainer) {
        console.error("Preview container not found");
        return;
    }

    previewContainer.innerHTML = pagesHTML;
}
