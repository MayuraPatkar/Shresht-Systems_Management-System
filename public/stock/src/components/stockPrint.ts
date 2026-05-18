/**
 * Stock print content generation and print modal handling.
 */

/**
 * Generate formatted HTML content for stock printing
 * @param type - Type filter value
 * @param category - Category filter value
 * @param status - Status filter value
 * @returns Formatted HTML for printing
 */
function generateStockPrintContent(type: string, category: string, status: string): string {
    // Filter data based on print modal selections and exclude deleted items
    let filteredData = currentStockData.filter(item => {
        return !(item.deletion && item.deletion.is_deleted === true) && !((item as any).is_deleted === true);
    });

    // Apply type filter
    if (type !== 'all') {
        filteredData = filteredData.filter(item => item.item_type === type);
    }

    // Apply category filter
    if (category !== 'all') {
        filteredData = filteredData.filter(item => item.category === category);
    }

    // Apply status filter
    if (status !== 'all') {
        filteredData = filteredData.filter(item => {
            const quantity = Number(item.stock_quantity) || 0;
            const minQuantity = Number(item.min_stock_quantity) || 0;
            const isActive = item.is_active !== false;

            if (status === 'Inactive') return !isActive;
            if (status === 'In Stock') return isActive && quantity >= minQuantity;
            if (status === 'Low Stock') return isActive && quantity > 0 && quantity < minQuantity;
            if (status === 'Out of Stock') return isActive && quantity === 0;
            return true;
        });
    }

    let itemsHTML = '';
    let totalValue = 0;
    let totalQuantity = 0;

    filteredData.forEach((item, index) => {
        const itemName = item.item_name;
        const brand = item.brand;
        const itemCategory = item.category;
        const purchasePrice = parseFloat(String(item.purchase_price)) || 0;
        const qty = Number(item.stock_quantity) || 0;
        const gst = item.gst_rate || 0;
        const minQuantity = Number(item.min_stock_quantity) || 0;

        const value = qty * purchasePrice;
        totalQuantity += qty;
        totalValue += value;

        // Determine status
        let statusText = 'In Stock';
        let statusClass = 'stock-status-normal';
        const isActive = item.is_active !== false;

        if (!isActive) {
            statusText = 'Inactive';
            statusClass = 'stock-status-inactive';
        } else if (qty < 0) {
            statusText = 'Negative Stock';
            statusClass = 'stock-status-negative';
        } else if (qty === 0) {
            statusText = 'Out of Stock';
            statusClass = 'stock-status-out';
        } else if (qty < minQuantity) {
            statusText = 'Low Stock';
            statusClass = 'stock-status-low';
        }

        itemsHTML += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHtml(itemName)}</td>
                <td>${escapeHtml(brand)}</td>
                <td>${escapeHtml(itemCategory)}</td>
                <td class="text-right">₹${formatIndian(purchasePrice, 2)}</td>
                <td class="text-center">${qty}</td>
                <td class="text-center">${gst}%</td>
                <td class="text-right">₹${formatIndian(value, 2)}</td>
                <td class="text-center"><span class="${statusClass}">${escapeHtml(statusText)}</span></td>
            </tr>
        `;
    });

    const currentDate = window.formatDateDisplay ? window.formatDateDisplay(new Date()) : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Stock Report</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 9pt;
                    line-height: 1.3;
                    color: #000;
                }

                .stock-print-container {
                    width: 100%;
                    max-width: 100%;
                    overflow: hidden;
                }

                .stock-print-header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #2563eb;
                }

                .stock-print-header h1 {
                    font-size: 20pt;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 4px;
                }

                .stock-print-header .company-name {
                    font-size: 12pt;
                    color: #374151;
                    margin-bottom: 5px;
                }

                .stock-print-header .report-date {
                    font-size: 9pt;
                    color: #6b7280;
                }

                .stock-print-filters {
                    background-color: #f3f4f6;
                    padding: 8px 12px;
                    margin-bottom: 12px;
                    border-radius: 3px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 8pt;
                }

                .stock-print-filters strong {
                    color: #1f2937;
                }

                .stock-print-filters span {
                    color: #2563eb;
                    font-weight: 600;
                }

                .stock-print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    table-layout: fixed;
                }

                .stock-print-table thead {
                    background-color: #2563eb;
                    color: white;
                }

                .stock-print-table thead th {
                    padding: 8px 4px;
                    font-weight: 600;
                    text-align: left;
                    font-size: 8pt;
                    border: 1px solid #1e40af;
                    word-wrap: break-word;
                }

                .stock-print-table tbody td {
                    padding: 6px 4px;
                    border: 1px solid #d1d5db;
                    font-size: 8pt;
                    word-wrap: break-word;
                    vertical-align: top;
                }

                .stock-print-table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                }

                .stock-status-normal {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #dcfce7;
                    color: #166534;
                    white-space: nowrap;
                }

                .stock-status-low {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fef3c7;
                    color: #92400e;
                    white-space: nowrap;
                }

                .stock-status-out {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fee2e2;
                    color: #991b1b;
                    white-space: nowrap;
                }

                .stock-status-negative {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fecaca;
                    color: #7f1d1d;
                    white-space: nowrap;
                }

                .stock-status-inactive {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #e5e7eb;
                    color: #6b7280;
                    white-space: nowrap;
                }

                .stock-print-summary {
                    margin-top: 15px;
                    padding: 12px;
                    background-color: #f3f4f6;
                    border-radius: 3px;
                    display: flex;
                    justify-content: space-around;
                }

                .stock-summary-item {
                    text-align: center;
                }

                .stock-summary-item .label {
                    font-size: 8pt;
                    color: #6b7280;
                    margin-bottom: 4px;
                }

                .stock-summary-item .value {
                    font-size: 12pt;
                    font-weight: bold;
                    color: #1f2937;
                }

                .stock-print-footer {
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 7pt;
                    color: #6b7280;
                }

                /* Text utilities */
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="stock-print-container">
                <div class="stock-print-header">
                    <h1>STOCK REPORT</h1>
                    <div class="company-name">SHRESHT SYSTEMS</div>
                    <div class="report-date">Generated on: ${currentDate}</div>
                </div>
                
                <div class="stock-print-filters">
                    <div><strong>Type:</strong> <span>${escapeHtml(type === 'all' ? 'All Types' : type)}</span></div>
                    <div><strong>Category:</strong> <span>${escapeHtml(category === 'all' ? 'All Categories' : category)}</span></div>
                    <div><strong>Status:</strong> <span>${escapeHtml(status === 'all' ? 'All Status' : status)}</span></div>
                </div>
                
                <table class="stock-print-table">
                    <thead>
                        <tr>
                            <th style="width: 3%;">#</th>
                            <th style="width: 26%;">Item Name</th>
                            <th style="width: 13%;">Brand</th>
                            <th style="width: 11%;">Category</th>
                            <th style="width: 11%; text-align: right;">Price</th>
                            <th style="width: 6%; text-align: center;">Qty</th>
                            <th style="width: 6%; text-align: center;">GST</th>
                            <th style="width: 13%; text-align: right;">Value</th>
                            <th style="width: 11%; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML || '<tr><td colspan="9" style="text-align: center; padding: 15px; color: #6b7280;">No stock items to display</td></tr>'}
                    </tbody>
                </table>
                
                <div class="stock-print-summary">
                    <div class="stock-summary-item">
                        <div class="label">Total Items</div>
                        <div class="value">${filteredData.length}</div>
                    </div>
                    <div class="stock-summary-item">
                        <div class="label">Total Quantity</div>
                        <div class="value">${totalQuantity}</div>
                    </div>
                    <div class="stock-summary-item">
                        <div class="label">Total Stock Value</div>
                        <div class="value">₹ ${formatIndian(totalValue, 2)}</div>
                    </div>
                </div>
                
                <div class="stock-print-footer">
                    <p>This is a computer-generated stock report | Shresht Systems | Ph: 7204657707 / 9901730305</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ─── Print Modal Event Listeners ─────────────────────────────────────────────

document.getElementById('closePrintModalBtn')?.addEventListener('click', () => hideModal('printModal'));
document.getElementById('cancelPrintBtn')?.addEventListener('click', () => hideModal('printModal'));

// Print action
document.getElementById('printBtn')?.addEventListener('click', () => {
    // show print modal
    showModal('printModal');
});

document.getElementById('finalPrintBtn')?.addEventListener('click', () => {
    const type = (document.getElementById('printTypeFilter') as HTMLSelectElement | null)?.value || 'all';
    const category = (document.getElementById('printCategoryFilter') as HTMLSelectElement | null)?.value || 'all';
    const status = (document.getElementById('printStatusFilter') as HTMLSelectElement | null)?.value || 'all';

    // Generate properly styled print content
    const content = generateStockPrintContent(type, category, status);

    if (typeof window.handlePrint === 'function') {
        window.handlePrint(content, 'print', 'StockReport');
    } else if (window.electronAPI && typeof window.electronAPI.handlePrintEvent === 'function') {
        window.electronAPI.handlePrintEvent(content, 'print', 'StockReport');
    } else {
        // Direct window print fallback as last resort
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.print();
        } else {
            console.error('Failed to open print window');
            alert('Printing failed. Please ensure popups are allowed.');
        }
    }
    hideModal('printModal');
});
