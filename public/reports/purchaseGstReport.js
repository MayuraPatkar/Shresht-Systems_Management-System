/**
 * Purchase GST Report Module
 * Handles monthly GST reporting from purchase orders
 */

// Purchase GST report state
let purchaseGstReportData = {
    summary: null,
    taxRateBreakdown: [],
    purchases: []
};

/**
 * Initialize Purchase GST report section
 */
function initPurchaseGSTReport() {
    // Populate year dropdown
    populatePurchaseGstYearDropdown();

    // Set current month
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('purchase-gst-month').value = currentMonth;

    // Set up event handlers
    document.getElementById('generate-purchase-gst-report')?.addEventListener('click', generatePurchaseGSTReport);
    document.getElementById('print-purchase-gst-report')?.addEventListener('click', printPurchaseGSTReport);
    document.getElementById('save-purchase-gst-pdf')?.addEventListener('click', savePurchaseGSTReportPDF);

    // Reset state and UI
    purchaseGstReportData = { summary: null, taxRateBreakdown: [], purchases: [] };
    document.getElementById('purchase-gst-report-summary').style.display = 'none';
    document.getElementById('purchase-gst-details').style.display = 'none';
    document.getElementById('print-purchase-gst-report').style.display = 'none';
    document.getElementById('save-purchase-gst-pdf').style.display = 'none';

    // Reset table to initial state
    document.getElementById('purchase-gst-report-body').innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-4xl text-gray-300 mb-3"></i>
                <p>Select month and year to generate report</p>
            </td>
        </tr>
    `;
}

/**
 * Populate year dropdown with recent years
 */
function populatePurchaseGstYearDropdown() {
    const yearSelect = document.getElementById('purchase-gst-year');
    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = '';
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

/**
 * Generate Purchase GST report for selected month/year
 */
async function generatePurchaseGSTReport() {
    const month = document.getElementById('purchase-gst-month').value;
    const year = document.getElementById('purchase-gst-year').value;

    const tbody = document.getElementById('purchase-gst-report-body');

    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-orange-600 text-2xl"></i>
                <p class="text-gray-500 mt-2">Generating Purchase GST report...</p>
            </td>
        </tr>
    `;

    try {
        // Fetch from reports API
        const response = await fetch(`/reports/purchase-gst?month=${month}&year=${year}`);
        const data = await response.json();

        if (data.success && data.report) {
            // Map backend response to frontend expected structure
            const report = data.report;
            const mappedReport = {
                summary: {
                    totalTaxableValue: report.summary.total_taxable_value || 0,
                    totalCGST: report.summary.total_cgst || 0,
                    totalSGST: report.summary.total_sgst || 0,
                    totalGST: report.summary.total_tax || 0
                },
                taxRateBreakdown: (report.tax_rate_breakdown || []).map(item => ({
                    rate: item.rate,
                    description: item.description,
                    taxableValue: item.taxable_value || 0,
                    cgst: item.cgst || 0,
                    sgst: item.sgst || 0
                })),
                purchases: (report.purchase_breakdown || []).map(po => ({
                    purchase_order_id: po.purchase_order_id,
                    purchase_invoice_id: po.purchase_invoice_id,
                    date: po.purchase_date,
                    supplier: po.supplier_name || 'Unknown',
                    taxableValue: po.taxable_value || 0,
                    cgst: po.cgst || 0,
                    sgst: po.sgst || 0,
                    total: po.total_value || 0
                }))
            };
            purchaseGstReportData = mappedReport;

            // Check for empty data
            if (!purchaseGstReportData.purchases || purchaseGstReportData.purchases.length === 0) {
                if (window.electronAPI && window.electronAPI.showAlert1) {
                    window.electronAPI.showAlert1('No data found for the selected period.');
                } else {
                    alert('No data found for the selected period.');
                }
                // Reset UI completely
                document.getElementById('purchase-gst-report-body').innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-gray-500">
                            <i class="fas fa-shopping-cart text-4xl text-gray-300 mb-3"></i>
                            <p>No data found for the selected period</p>
                        </td>
                    </tr>
                `;
                document.getElementById('purchase-gst-report-summary').style.display = 'none';
                document.getElementById('purchase-gst-details').style.display = 'none';
                document.getElementById('print-purchase-gst-report').style.display = 'none';
                document.getElementById('save-purchase-gst-pdf').style.display = 'none';
                return;
            }

            renderPurchaseGSTReport(mappedReport);
        } else {
            // Fallback: Generate from purchase orders client-side
            await generatePurchaseGSTReportFromPurchases(month, year);
        }
    } catch (error) {
        console.error('Error generating Purchase GST report:', error);
        // Try fallback
        await generatePurchaseGSTReportFromPurchases(month, year);
    }
}

/**
 * Generate Purchase GST report from purchase orders (fallback)
 */
async function generatePurchaseGSTReportFromPurchases(month, year) {
    const tbody = document.getElementById('purchase-gst-report-body');

    try {
        // Fetch recent purchase orders
        const response = await fetch('/purchase-order/recent-purchase-orders');
        const data = await response.json();
        const purchaseOrders = data.purchaseOrder || [];

        if (!purchaseOrders || purchaseOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No purchase orders found</p>
                    </td>
                </tr>
            `;
            document.getElementById('purchase-gst-report-summary').style.display = 'none';
            document.getElementById('purchase-gst-details').style.display = 'none';
            return;
        }

        // Filter by month and year
        const filteredPurchases = purchaseOrders.filter(po => {
            const poDate = new Date(po.purchase_date || po.createdAt);
            return poDate.getMonth() + 1 === parseInt(month) &&
                poDate.getFullYear() === parseInt(year);
        });

        if (filteredPurchases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No purchase orders found for the selected month</p>
                    </td>
                </tr>
            `;
            document.getElementById('purchase-gst-report-summary').style.display = 'none';
            document.getElementById('purchase-gst-details').style.display = 'none';
            return;
        }

        // Calculate tax-rate-wise breakdown
        const rateMap = new Map();
        let totalTaxableValue = 0;
        let totalCGST = 0;
        let totalSGST = 0;

        filteredPurchases.forEach(po => {
            const items = po.items || [];
            items.forEach(item => {
                const gstRate = parseFloat(item.rate) || 0;
                const taxableValue = (item.quantity || 0) * (item.unit_price || 0);
                const cgst = (taxableValue * gstRate / 2) / 100;
                const sgst = (taxableValue * gstRate / 2) / 100;

                const rateKey = gstRate.toString();
                if (rateMap.has(rateKey)) {
                    const existing = rateMap.get(rateKey);
                    existing.taxableValue += taxableValue;
                    existing.cgst += cgst;
                    existing.sgst += sgst;
                } else {
                    rateMap.set(rateKey, {
                        rate: gstRate,
                        description: `GST @ ${gstRate}%`,
                        taxableValue: taxableValue,
                        cgst: cgst,
                        sgst: sgst
                    });
                }

                totalTaxableValue += taxableValue;
                totalCGST += cgst;
                totalSGST += sgst;
            });
        });

        // Convert to array and sort by rate (descending)
        const taxRateBreakdown = Array.from(rateMap.values()).sort((a, b) => b.rate - a.rate);

        const reportData = {
            summary: {
                totalTaxableValue,
                totalCGST,
                totalSGST,
                totalGST: totalCGST + totalSGST
            },
            taxRateBreakdown,
            purchases: filteredPurchases.map(po => ({
                purchase_order_id: po.purchase_order_id || po._id,
                purchase_invoice_id: po.purchase_invoice_id,
                date: po.purchase_date,
                supplier: po.supplier_name || 'Unknown',
                taxableValue: po.total_amount || 0,
                cgst: 0,
                sgst: 0,
                total: po.total_amount || 0
            }))
        };

        purchaseGstReportData = reportData;
        renderPurchaseGSTReport(reportData);

    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to fetch purchase order data</p>
                    <button onclick="generatePurchaseGSTReport()" class="mt-2 text-blue-600 hover:underline">Retry</button>
                </td>
            </tr>
        `;
    }
}

/**
 * Render Purchase GST report data
 * @param {Object} data - Report data with summary, taxRateBreakdown, and purchases
 */
function renderPurchaseGSTReport(data) {
    const { summary, taxRateBreakdown, purchases } = data;

    // Update summary
    if (summary) {
        document.getElementById('purchase-summary-taxable').textContent = formatCurrency(summary.totalTaxableValue || 0);
        document.getElementById('purchase-summary-cgst').textContent = formatCurrency(summary.totalCGST || 0);
        document.getElementById('purchase-summary-sgst').textContent = formatCurrency(summary.totalSGST || 0);
        document.getElementById('purchase-summary-total-gst').textContent = formatCurrency(summary.totalGST || 0);
        document.getElementById('purchase-gst-report-summary').style.display = 'grid';
    }

    // Render Tax Rate Breakdown table
    const tbody = document.getElementById('purchase-gst-report-body');

    if (!taxRateBreakdown || taxRateBreakdown.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                    <p>No data found</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = taxRateBreakdown.map(item => {
            const rateValue = item.rate !== undefined ? `${item.rate}%` : 'N/A';

            return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 border-b font-medium">${rateValue}</td>
                <td class="px-4 py-3 border-b">${item.description}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.taxableValue)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.cgst)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.sgst)}</td>
                <td class="px-4 py-3 border-b text-right font-medium">${formatCurrency(item.cgst + item.sgst)}</td>
            </tr>
        `}).join('');

        // Add total row
        tbody.innerHTML += `
            <tr class="bg-gray-100 font-bold">
                <td class="px-4 py-3 border-b" colspan="2">Total</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(summary.totalTaxableValue)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(summary.totalCGST)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(summary.totalSGST)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(summary.totalGST)}</td>
            </tr>
        `;
    }

    // Render purchase order details
    const purchaseTbody = document.getElementById('purchase-gst-details-body');
    if (purchases && purchases.length > 0) {
        document.getElementById('purchase-gst-details').style.display = 'block';

        purchaseTbody.innerHTML = purchases.map(po => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 border-b font-medium">${po.purchase_order_id}</td>
                <td class="px-4 py-3 border-b">${formatDateIndian(po.date)}</td>
                <td class="px-4 py-3 border-b">${po.supplier}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(po.taxableValue)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(po.cgst)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(po.sgst)}</td>
                <td class="px-4 py-3 border-b text-right font-medium">${formatCurrency(po.total)}</td>
            </tr>
        `).join('');
    } else {
        document.getElementById('purchase-gst-details').style.display = 'none';
    }

    // Show print/PDF buttons
    document.getElementById('print-purchase-gst-report').style.display = 'flex';
    document.getElementById('save-purchase-gst-pdf').style.display = 'flex';
}

/**
 * Generate printable Purchase GST report HTML
 * @returns {string} HTML content
 */
function generatePurchaseGSTReportHTML() {
    const month = document.getElementById('purchase-gst-month').value;
    const year = document.getElementById('purchase-gst-year').value;
    const { summary, taxRateBreakdown, purchases } = purchaseGstReportData;

    // Breakdown table
    const tableContent = taxRateBreakdown.map(item => {
        const rateValue = item.rate !== undefined ? `${item.rate}%` : 'N/A';
        return `
        <tr>
            <td>${rateValue}</td>
            <td>${item.description}</td>
            <td class="text-right">${formatCurrency(item.taxableValue)}</td>
            <td class="text-right">${formatCurrency(item.cgst)}</td>
            <td class="text-right">${formatCurrency(item.sgst)}</td>
            <td class="text-right">${formatCurrency(item.cgst + item.sgst)}</td>
        </tr>
    `}).join('');

    // Purchase order details table
    const purchaseTableContent = purchases.map(po => `
        <tr>
            <td>${po.purchase_order_id}</td>
            <td>${formatDateIndian(po.date)}</td>
            <td>${po.supplier}</td>
            <td class="text-right">${formatCurrency(po.taxableValue)}</td>
            <td class="text-right">${formatCurrency(po.cgst)}</td>
            <td class="text-right">${formatCurrency(po.sgst)}</td>
            <td class="text-right">${formatCurrency(po.total)}</td>
        </tr>
    `).join('');

    const content = `
        <div class="report-summary">
            <div class="summary-item">
                <div class="summary-label">Total Taxable Value</div>
                <div class="summary-value">${formatCurrency(summary.totalTaxableValue)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total CGST</div>
                <div class="summary-value">${formatCurrency(summary.totalCGST)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total SGST</div>
                <div class="summary-value">${formatCurrency(summary.totalSGST)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total GST</div>
                <div class="summary-value" style="color: #ea580c;">${formatCurrency(summary.totalGST)}</div>
            </div>
        </div>
        
        <h3 style="margin: 30px 0 15px; font-size: 16px; color: #374151;">Tax Rate Wise Breakdown</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Tax Rate</th>
                    <th>Description</th>
                    <th class="text-right">Taxable Value</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total Tax</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent}
                <tr class="total-row">
                    <td colspan="2">Total</td>
                    <td class="text-right">${formatCurrency(summary.totalTaxableValue)}</td>
                    <td class="text-right">${formatCurrency(summary.totalCGST)}</td>
                    <td class="text-right">${formatCurrency(summary.totalSGST)}</td>
                    <td class="text-right">${formatCurrency(summary.totalGST)}</td>
                </tr>
            </tbody>
        </table>
        
        <h3 style="margin: 30px 0 15px; font-size: 16px; color: #374151;">Purchase Order Details</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>PO No.</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th class="text-right">Taxable Value</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseTableContent}
            </tbody>
        </table>
    `;

    const subtitle = `Period: ${getMonthName(parseInt(month))} ${year}`;

    return generatePrintableReport('Monthly Purchase GST Report', content, { subtitle });
}

/**
 * Print Purchase GST report
 */
function printPurchaseGSTReport() {
    const html = generatePurchaseGSTReportHTML();
    printReport(html, 'purchase-gst-report');
}

/**
 * Save Purchase GST report as PDF
 */
function savePurchaseGSTReportPDF() {
    const html = generatePurchaseGSTReportHTML();
    const month = document.getElementById('purchase-gst-month').value;
    const year = document.getElementById('purchase-gst-year').value;
    const filename = `purchase-gst-report-${getMonthName(parseInt(month))}-${year}`;
    saveReportPDF(html, filename);
}

/**
 * Load a saved Purchase GST report into the view
 * @param {Object} report - Complete report object from database
 */
window.loadSavedPurchaseGSTReport = function (report) {
    if (!report || !report.data) return;

    const data = report.data;
    const params = report.parameters || {};

    // Set parameters
    if (params.month) document.getElementById('purchase-gst-month').value = params.month;
    if (params.year) document.getElementById('purchase-gst-year').value = params.year;

    // Set global data
    purchaseGstReportData = {
        summary: {
            totalTaxableValue: data.summary.total_taxable_value || 0,
            totalCGST: data.summary.total_cgst || 0,
            totalSGST: data.summary.total_sgst || 0,
            totalGST: data.summary.total_tax || 0
        },
        taxRateBreakdown: (data.tax_rate_breakdown || []).map(item => ({
            rate: item.rate,
            description: item.description,
            taxableValue: item.taxable_value || 0,
            cgst: item.cgst || 0,
            sgst: item.sgst || 0
        })),
        purchases: (data.purchase_breakdown || []).map(po => ({
            purchase_order_id: po.purchase_order_id,
            purchase_invoice_id: po.purchase_invoice_id,
            date: po.purchase_date,
            supplier: po.supplier_name || 'Unknown',
            taxableValue: po.taxable_value || 0,
            cgst: po.cgst || 0,
            sgst: po.sgst || 0,
            total: po.total_value || 0
        }))
    };

    // Render report
    renderPurchaseGSTReport(purchaseGstReportData);
};
