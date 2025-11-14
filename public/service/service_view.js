// Service View - View individual service records and service history

// Helper: Get descriptive service stage label
function getServiceStageLabel(stage) {
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
    return stages[stage - 1] || `${stage}th Service`;
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
        const badgeColor = stageBadgeColors[(service.service_stage - 1) % stageBadgeColors.length];
        stageBadge.className = `inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeColor}`;
        
        // Populate customer details from invoice
        if (invoice) {
            document.getElementById('view-customer-name').textContent = invoice.customer_name || 'N/A';
            document.getElementById('view-customer-phone').textContent = invoice.customer_phone || 'N/A';
            document.getElementById('view-customer-address').textContent = invoice.customer_address || 'N/A';
            document.getElementById('view-customer-gstin').textContent = invoice.customer_gstin || 'N/A';
            document.getElementById('view-project-name').textContent = invoice.project_name || 'N/A';
        }
        
        document.getElementById('view-notes').textContent = service.notes || 'No notes';
        
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

// Generate print preview for service (similar to existing preview but for stored service)
function generateServicePreview(service, invoice) {
    const previewContent = document.getElementById('view-service-preview-content');
    
    const serviceDate = formatDateIndian(service.service_date);
    const stageLabel = getServiceStageLabel(service.service_stage);
    
    // Build items table HTML
    let itemsHTML = '';
    if (service.items && service.items.length > 0) {
        service.items.forEach((item, index) => {
            const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
            const gstAmount = (itemTotal * (item.rate || 0)) / 100;
            const totalWithGst = itemTotal + gstAmount;
            
            itemsHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.description || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.HSN_SAC || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity || 0}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatIndianCurrency(item.unit_price)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.rate || 0}%</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatIndianCurrency(totalWithGst)}</td>
                </tr>
            `;
        });
    }
    
    // Build non-items table HTML
    let nonItemsHTML = '';
    if (service.non_items && service.non_items.length > 0) {
        service.non_items.forEach((item, index) => {
            const gstAmount = ((item.price || 0) * (item.rate || 0)) / 100;
            const totalWithGst = (item.price || 0) + gstAmount;
            
            nonItemsHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.description || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatIndianCurrency(item.price)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.rate || 0}%</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatIndianCurrency(totalWithGst)}</td>
                </tr>
            `;
        });
    }
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 32px;">SERVICE RECEIPT</h1>
                <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">${stageLabel}</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                <div style="flex: 1;">
                    <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Service Information</h3>
                    <p style="margin: 5px 0;"><strong>Service ID:</strong> ${service.service_id}</p>
                    <p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${service.invoice_id}</p>
                    <p style="margin: 5px 0;"><strong>Service Date:</strong> ${serviceDate}</p>
                    <p style="margin: 5px 0;"><strong>Stage:</strong> ${stageLabel}</p>
                </div>
                <div style="flex: 1;">
                    <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Customer Details</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${invoice?.customer_name || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${invoice?.customer_phone || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Address:</strong> ${invoice?.customer_address || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>GSTIN:</strong> ${invoice?.customer_gstin || 'N/A'}</p>
                </div>
            </div>
            
            ${invoice?.project_name ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Project</h3>
                <p style="margin: 5px 0;"><strong>${invoice.project_name}</strong></p>
            </div>
            ` : ''}
            
            ${itemsHTML ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Service Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">S.No</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Description</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">HSN/SAC</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Qty</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Unit Price</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">GST %</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${nonItemsHTML ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Additional Charges</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">S.No</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Description</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Price</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">GST %</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nonItemsHTML}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>Subtotal (Before Tax):</strong>
                    <span>${formatIndianCurrency(service.total_amount_no_tax)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #f97316;">
                    <strong>Total Tax:</strong>
                    <span><strong>${formatIndianCurrency(service.total_tax)}</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #2563eb; font-size: 20px; color: #059669;">
                    <strong>Grand Total:</strong>
                    <strong>${formatIndianCurrency(service.total_amount_with_tax)}</strong>
                </div>
            </div>
            
            ${service.notes ? `
            <div style="margin-top: 20px;">
                <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">Notes</h3>
                <p style="margin: 0; color: #666;">${service.notes}</p>
            </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
                <p>Thank you for choosing our services!</p>
            </div>
        </div>
    `;
    
    previewContent.innerHTML = html;
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
            timeline.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-history text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl font-semibold text-gray-600">No service history found for this invoice</p>
                </div>
            `;
            return;
        }
        
        // Build timeline
        const timelineHTML = services.map((service, index) => {
            const isLast = index === services.length - 1;
            const stageLabel = getServiceStageLabel(service.service_stage);
            const serviceDate = formatDateIndian(service.service_date);
            const grandTotal = formatIndianCurrency(service.total_amount_with_tax);
            
            const stageBadgeColors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-teal-500'
            ];
            const dotColor = stageBadgeColors[(service.service_stage - 1) % stageBadgeColors.length];
            
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
                                <p class="text-sm text-gray-600">Service ID: <span class="font-semibold text-blue-600">${service.service_id}</span></p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold bg-${dotColor.split('-')[1]}-100 text-${dotColor.split('-')[1]}-700">
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
function generatePreview() {
    const serviceId = document.getElementById('service-id')?.value || '';
    const invoiceId = document.getElementById('invoice-id')?.value || '';
    const serviceStage = parseInt(document.getElementById('service-stage')?.value || 0);
    const name = document.getElementById("name")?.value || "";
    const address = document.getElementById("address")?.value || "";
    const phone = document.getElementById("phone")?.value || "";
    const email = document.getElementById("email")?.value || "";
    const projectName = document.getElementById("project-name")?.value || "";
    const serviceDate = document.getElementById("date")?.value || new Date().toISOString().split('T')[0];

    // Format date
    const formattedDate = new Date(serviceDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

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
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${hsnSac}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${qty}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(unitPrice, 2)}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(taxableValue, 2)}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${rate.toFixed(2)}%</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = taxableValue;
                totalPrice += rowTotal;
                itemsHTML += `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${hsnSac}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${qty}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(unitPrice, 2)}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
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
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${rate || '-'}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                itemsHTML += `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
            sno++;
        }
    }

    const grandTotal = totalPrice;

    const previewContainer = document.getElementById("preview-content");
    if (!previewContainer) {
        console.error("Preview container not found");
        return;
    }

    previewContainer.innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="../assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Service Receipt - ${serviceReference}</div>
        
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>Customer Details:</strong></p>
                <p>${name}</p>
                <p>${address}</p>
                <p>Phone: ${phone}</p>
                ${email ? `<p>Email: ${email}</p>` : ''}
            </div>
            <div class="info-section">
                <p><strong>Service ID:</strong> ${serviceId}</p>
                <p><strong>Invoice Reference:</strong> ${invoiceId}</p>
                <p><strong>Project Name:</strong> ${projectName}</p>
                <p><strong>Service Date:</strong> ${formattedDate}</p>
                <p><strong>Service Stage:</strong> ${serviceStage + 1}</p>
            </div>
        </div>

        ${itemsHTML ? `
        <div class="items-section" style="margin: 30px 0;">
            <h3 style="margin-bottom: 15px; font-size: 18px; font-weight: bold;">Service Items & Charges</h3>
            <table class="items-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">S.No</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">HSN/SAC</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Qty</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Unit Price</th>
                        ${hasTax ? `
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Taxable Value</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Tax %</th>
                        ` : ''}
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="third-section">
            <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
                <div style="min-width: 300px;">
                    ${hasTax ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>Taxable Value:</span>
                        <span>₹ ${formatIndian(totalTaxableValue, 2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>CGST:</span>
                        <span>₹ ${formatIndian(totalCGST, 2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>SGST:</span>
                        <span>₹ ${formatIndian(totalSGST, 2)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 2px solid #2563eb;">
                        <span style="font-weight: bold;">Total Amount:</span>
                        <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">₹ ${formatIndian(grandTotal, 2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #2563eb;">
            <p style="margin: 0;"><strong>Amount in Words:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 1.1em;">${numberToWords(grandTotal)} Rupees Only</p>
        </div>

        <div class="notes-section" style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong><i class="fas fa-info-circle"></i> Service Notes:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
                <li>This is service receipt for stage ${serviceStage + 1}</li>
                <li>Payment received on ${formattedDate}</li>
                <li>Service performed as per schedule</li>
                <li>Next service will be scheduled as per agreement</li>
            </ul>
        </div>
        
        <div class="signature">
            <p><strong>For SHRESHT SYSTEMS</strong></p>
            <div class="signature-space" style="height: 60px;"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        
        <footer>
            <p>This is a computer-generated service receipt</p>
        </footer>
    </div>`;
}
