/**
 * GST Report Module
 * Handles monthly GST reporting from invoices
 */

// GST report state
let gstReportData = {
    summary: null,
    hsnBreakdown: [],
    invoices: []
};

/**
 * Initialize GST report section
 */
function initGSTReport() {
    // Populate year dropdown
    populateYearDropdown();

    // Set current month
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('gst-month').value = currentMonth;

    // Set up event handlers
    document.getElementById('generate-gst-report')?.addEventListener('click', generateGSTReport);
    document.getElementById('print-gst-report')?.addEventListener('click', printGSTReport);
    document.getElementById('save-gst-pdf')?.addEventListener('click', saveGSTReportPDF);
}

/**
 * Populate year dropdown with recent years
 */
function populateYearDropdown() {
    const yearSelect = document.getElementById('gst-year');
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
 * Generate GST report for selected month/year
 */
async function generateGSTReport() {
    const month = document.getElementById('gst-month').value;
    const year = document.getElementById('gst-year').value;

    const tbody = document.getElementById('gst-report-body');

    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-green-600 text-2xl"></i>
                <p class="text-gray-500 mt-2">Generating GST report...</p>
            </td>
        </tr>
    `;

    try {
        // Try to fetch from reports API first
        const response = await fetch(`/reports/gst?month=${month}&year=${year}`);
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
                hsnBreakdown: (report.hsn_breakdown || []).map(item => ({
                    hsn: item.hsn_sac || 'N/A',
                    description: item.description || `GST @ ${item.rate || 0}%`,
                    taxableValue: item.taxable_value || 0,
                    cgst: item.cgst || 0,
                    sgst: item.sgst || 0
                })),
                invoices: (report.invoice_breakdown || []).map(inv => ({
                    invoice_id: inv.invoice_id,
                    date: inv.invoice_date,
                    customer: inv.customer_name || 'Unknown',
                    taxableValue: inv.taxable_value || 0,
                    cgst: inv.cgst || 0,
                    sgst: inv.sgst || 0,
                    total: inv.total_value || 0
                }))
            };
            gstReportData = mappedReport;
            renderGSTReport(mappedReport);
        } else {
            // Fallback: Generate from invoices
            await generateGSTReportFromInvoices(month, year);
        }
    } catch (error) {
        console.error('Error generating GST report:', error);
        // Try fallback
        await generateGSTReportFromInvoices(month, year);
    }
}

/**
 * Generate GST report from invoices (fallback)
 */
async function generateGSTReportFromInvoices(month, year) {
    const tbody = document.getElementById('gst-report-body');

    try {
        // Fetch all invoices
        const response = await fetch('/invoice/all');
        const invoices = await response.json();

        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No invoices found</p>
                    </td>
                </tr>
            `;
            document.getElementById('gst-report-summary').style.display = 'none';
            document.getElementById('gst-invoice-details').style.display = 'none';
            return;
        }

        // Filter invoices by month and year
        const filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.invoice_date || inv.date || inv.createdAt);
            return invoiceDate.getMonth() + 1 === parseInt(month) &&
                invoiceDate.getFullYear() === parseInt(year);
        });

        if (filteredInvoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No invoices found for the selected month</p>
                    </td>
                </tr>
            `;
            document.getElementById('gst-report-summary').style.display = 'none';
            document.getElementById('gst-invoice-details').style.display = 'none';
            return;
        }

        // Calculate HSN-wise breakdown
        const hsnMap = new Map();
        let totalTaxableValue = 0;
        let totalCGST = 0;
        let totalSGST = 0;

        filteredInvoices.forEach(invoice => {
            const items = invoice.items || [];
            items.forEach(item => {
                const hsn = item.hsn_sac || item.hsn || 'N/A';
                const taxableValue = parseFloat(item.rate) || 0;
                const gstRate = parseFloat(item.gst) || 18; // Default 18%
                const cgst = (taxableValue * gstRate / 2) / 100;
                const sgst = (taxableValue * gstRate / 2) / 100;

                if (hsnMap.has(hsn)) {
                    const existing = hsnMap.get(hsn);
                    existing.taxableValue += taxableValue;
                    existing.cgst += cgst;
                    existing.sgst += sgst;
                } else {
                    hsnMap.set(hsn, {
                        hsn: hsn,
                        description: item.description || item.item_name || 'Item',
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

        const hsnBreakdown = Array.from(hsnMap.values());

        const reportData = {
            summary: {
                totalTaxableValue,
                totalCGST,
                totalSGST,
                totalGST: totalCGST + totalSGST
            },
            hsnBreakdown,
            invoices: filteredInvoices.map(inv => ({
                invoice_id: inv.invoice_id || inv._id,
                date: inv.invoice_date || inv.date,
                customer: inv.buyer_name || inv.buyer?.name || 'Unknown',
                taxableValue: inv.subtotal || inv.sub_total || 0,
                cgst: (inv.tax || 0) / 2,
                sgst: (inv.tax || 0) / 2,
                total: inv.grand_total || inv.grandTotal || 0
            }))
        };

        gstReportData = reportData;
        renderGSTReport(reportData);

    } catch (error) {
        console.error('Error fetching invoices:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to fetch invoice data</p>
                    <button onclick="generateGSTReport()" class="mt-2 text-blue-600 hover:underline">Retry</button>
                </td>
            </tr>
        `;
    }
}

/**
 * Render GST report data
 * @param {Object} data - Report data with summary, hsnBreakdown, and invoices
 */
function renderGSTReport(data) {
    const { summary, hsnBreakdown, invoices } = data;

    // Update summary
    if (summary) {
        document.getElementById('summary-taxable').textContent = formatCurrency(summary.totalTaxableValue || 0);
        document.getElementById('summary-cgst').textContent = formatCurrency(summary.totalCGST || 0);
        document.getElementById('summary-sgst').textContent = formatCurrency(summary.totalSGST || 0);
        document.getElementById('summary-total-gst').textContent = formatCurrency(summary.totalGST || 0);
        document.getElementById('gst-report-summary').style.display = 'grid';
    }

    // Render HSN breakdown table
    const tbody = document.getElementById('gst-report-body');

    if (!hsnBreakdown || hsnBreakdown.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                    <p>No HSN/SAC data found</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = hsnBreakdown.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 border-b font-medium">${item.hsn}</td>
                <td class="px-4 py-3 border-b">${item.description}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.taxableValue)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.cgst)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(item.sgst)}</td>
                <td class="px-4 py-3 border-b text-right font-medium">${formatCurrency(item.cgst + item.sgst)}</td>
            </tr>
        `).join('');

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

    // Render invoice details
    const invoiceTbody = document.getElementById('gst-invoice-body');
    if (invoices && invoices.length > 0) {
        document.getElementById('gst-invoice-details').style.display = 'block';

        invoiceTbody.innerHTML = invoices.map(inv => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 border-b font-medium">${inv.invoice_id}</td>
                <td class="px-4 py-3 border-b">${formatDateIndian(inv.date)}</td>
                <td class="px-4 py-3 border-b">${inv.customer}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(inv.taxableValue)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(inv.cgst)}</td>
                <td class="px-4 py-3 border-b text-right">${formatCurrency(inv.sgst)}</td>
                <td class="px-4 py-3 border-b text-right font-medium">${formatCurrency(inv.total)}</td>
            </tr>
        `).join('');
    } else {
        document.getElementById('gst-invoice-details').style.display = 'none';
    }

    // Show print/PDF buttons
    document.getElementById('print-gst-report').style.display = 'flex';
    document.getElementById('save-gst-pdf').style.display = 'flex';
}

/**
 * Get month name from number
 * @param {number} month - Month number (1-12)
 * @returns {string} Month name
 */
function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
}

/**
 * Generate printable GST report HTML
 * @returns {string} HTML content
 */
function generateGSTReportHTML() {
    const month = document.getElementById('gst-month').value;
    const year = document.getElementById('gst-year').value;
    const { summary, hsnBreakdown, invoices } = gstReportData;

    // HSN breakdown table
    const hsnTableContent = hsnBreakdown.map(item => `
        <tr>
            <td>${item.hsn}</td>
            <td>${item.description}</td>
            <td class="text-right">${formatCurrency(item.taxableValue)}</td>
            <td class="text-right">${formatCurrency(item.cgst)}</td>
            <td class="text-right">${formatCurrency(item.sgst)}</td>
            <td class="text-right">${formatCurrency(item.cgst + item.sgst)}</td>
        </tr>
    `).join('');

    // Invoice details table
    const invoiceTableContent = invoices.map(inv => `
        <tr>
            <td>${inv.invoice_id}</td>
            <td>${formatDateIndian(inv.date)}</td>
            <td>${inv.customer}</td>
            <td class="text-right">${formatCurrency(inv.taxableValue)}</td>
            <td class="text-right">${formatCurrency(inv.cgst)}</td>
            <td class="text-right">${formatCurrency(inv.sgst)}</td>
            <td class="text-right">${formatCurrency(inv.total)}</td>
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
        
        <h3 style="margin: 30px 0 15px; font-size: 16px; color: #374151;">HSN/SAC Wise Breakdown</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>HSN/SAC</th>
                    <th>Description</th>
                    <th class="text-right">Taxable Value</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total Tax</th>
                </tr>
            </thead>
            <tbody>
                ${hsnTableContent}
                <tr class="total-row">
                    <td colspan="2">Total</td>
                    <td class="text-right">${formatCurrency(summary.totalTaxableValue)}</td>
                    <td class="text-right">${formatCurrency(summary.totalCGST)}</td>
                    <td class="text-right">${formatCurrency(summary.totalSGST)}</td>
                    <td class="text-right">${formatCurrency(summary.totalGST)}</td>
                </tr>
            </tbody>
        </table>
        
        <h3 style="margin: 30px 0 15px; font-size: 16px; color: #374151;">Invoice Details</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th class="text-right">Taxable Value</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${invoiceTableContent}
            </tbody>
        </table>
    `;

    const subtitle = `Period: ${getMonthName(parseInt(month))} ${year}`;

    return generatePrintableReport('Monthly GST Report', content, { subtitle });
}

/**
 * Print GST report
 */
function printGSTReport() {
    const html = generateGSTReportHTML();
    printReport(html, 'gst-report');
}

/**
 * Save GST report as PDF
 */
function saveGSTReportPDF() {
    const html = generateGSTReportHTML();
    const month = document.getElementById('gst-month').value;
    const year = document.getElementById('gst-year').value;
    const filename = `gst-report-${getMonthName(parseInt(month))}-${year}`;
    saveReportPDF(html, filename);
}

/**
 * Load a saved GST report into the view
 * @param {Object} report - Complete report object from database
 */
window.loadSavedGSTReport = function (report) {
    if (!report || !report.data) return;

    const data = report.data;
    const params = report.parameters || {};

    // Set parameters
    if (params.month) document.getElementById('gst-month').value = params.month;
    if (params.year) document.getElementById('gst-year').value = params.year;

    // Set global data
    gstReportData = {
        summary: {
            totalTaxableValue: data.summary.total_taxable_value || 0,
            totalCGST: data.summary.total_cgst || 0,
            totalSGST: data.summary.total_sgst || 0,
            totalGST: data.summary.total_tax || 0
        },
        hsnBreakdown: (data.hsn_breakdown || []).map(item => ({
            hsn: item.hsn_sac || 'N/A',
            description: item.description || `GST @ ${item.rate || 0}%`,
            taxableValue: item.taxable_value || 0,
            cgst: item.cgst || 0,
            sgst: item.sgst || 0
        })),
        invoices: (data.invoice_breakdown || []).map(inv => ({
            invoice_id: inv.invoice_id,
            date: inv.invoice_date,
            customer: inv.customer_name || 'Unknown',
            taxableValue: inv.taxable_value || 0,
            cgst: inv.cgst || 0,
            sgst: inv.sgst || 0,
            total: inv.total_value || 0
        }))
    };

    // Render report
    renderGSTReport(gstReportData);
};
