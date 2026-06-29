// @ts-nocheck
document.addEventListener('DOMContentLoaded', () => {
    setupPageListeners();
    clearFilters();
});

let statementData: any[] = [];
let statementTotals: any = {};
let filterStartDateStr = '';
let filterEndDateStr = '';

function setupPageListeners() {
    document.getElementById('generate-stock-report')?.addEventListener('click', () => generateStatement());
    document.getElementById('clear-stock-filters')?.addEventListener('click', () => clearFilters());
    document.getElementById('print-stock-report')?.addEventListener('click', () => printStatement());
    document.getElementById('save-stock-pdf')?.addEventListener('click', () => saveStatementPDF());
    document.getElementById('home-btn')?.addEventListener('click', () => window.location.href = '/stock');
    document.getElementById('refresh-btn')?.addEventListener('click', () => generateStatement());
}

function clearFilters() {
    const endDate = new Date();
    const startDate = new Date();
    // Default to start of current month
    startDate.setDate(1);

    const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
    if (startDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
    }

    const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
    if (endDateInput) {
        endDateInput.value = endDate.toISOString().split('T')[0];
    }

    statementData = [];
    statementTotals = {};

    const tbody = document.getElementById('stock-report-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="px-6 py-14 text-center text-slate-400">
                    <i class="fas fa-chart-line text-4xl text-slate-300 mb-3 block"></i>
                    Choose filters and generate a report
                </td>
            </tr>
        `;
    }

    document.getElementById('print-stock-report')!.style.display = 'none';
    document.getElementById('save-stock-pdf')!.style.display = 'none';
    document.getElementById('statement-summary-section')!.style.display = 'none';
    document.getElementById('statement-subtitle')!.textContent = 'Select dates to load statement data';
}

async function generateStatement() {
    const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
    const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
    const startVal = startDateInput?.value;
    const endVal = endDateInput?.value;

    if (!startVal || !endVal) {
        reportsUtils.showNotification('Start Date and End Date are required.', 'error');
        return;
    }

    filterStartDateStr = startVal;
    filterEndDateStr = endVal;

    const generateBtn = document.getElementById('generate-stock-report') as HTMLButtonElement;
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    }

    try {
        const params = new URLSearchParams();
        params.append('start_date', startVal);
        params.append('end_date', endVal);

        const result = await reportsApi.getStockStatement(params);
        if (result && result.success && result.data) {
            statementData = result.data;
            statementTotals = result.totals || {};
            renderStatementTable();
            renderSummaryBlocks();
            
            // Show print and PDF buttons
            document.getElementById('print-stock-report')!.style.display = 'inline-block';
            document.getElementById('save-stock-pdf')!.style.display = 'inline-block';
            document.getElementById('statement-summary-section')!.style.display = 'grid';

            const startFormatted = formatDateString(startVal);
            const endFormatted = formatDateString(endVal);
            document.getElementById('statement-subtitle')!.textContent = `Statement for period ${startFormatted} to ${endFormatted}`;
        } else {
            reportsUtils.showNotification(result.error || 'Failed to fetch statement report', 'error');
        }
    } catch (error: any) {
        console.error('Failed to generate statement:', error);
        reportsUtils.showNotification('Error generating stock statement report.', 'error');
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Generate Statement';
        }
    }
}

function formatDateString(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('en-IN');
}

function renderStatementTable() {
    const tbody = document.getElementById('stock-report-tbody');
    if (!tbody) return;

    if (statementData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="px-6 py-14 text-center text-slate-400">
                    No items found for stock statement.
                </td>
            </tr>
        `;
        return;
    }

    let rowsHTML = statementData.map((row, idx) => {
        return `
            <tr class="hover:bg-slate-50">
                <td class="text-center font-medium text-slate-500 border-r border-slate-200">${row.slNo || (idx + 1)}</td>
                <td class="font-semibold text-slate-700 pl-4 border-r border-slate-200">${row.itemName}</td>
                
                <!-- Opening -->
                <td class="text-right border-r border-slate-200">${row.opening.qty}</td>
                <td class="text-right text-slate-500 border-r border-slate-200">${formatCurrencyValue(row.opening.rate)}</td>
                <td class="text-right font-medium text-slate-600 border-r border-slate-200">${formatCurrencyValue(row.opening.amount)}</td>
                
                <!-- Purchase -->
                <td class="text-right border-r border-slate-200">${row.purchase.qty}</td>
                <td class="text-right text-slate-500 border-r border-slate-200">${formatCurrencyValue(row.purchase.rate)}</td>
                <td class="text-right font-medium text-emerald-600 border-r border-slate-200">${formatCurrencyValue(row.purchase.amount)}</td>
                
                <!-- Sales -->
                <td class="text-right border-r border-slate-200">${row.sales.qty}</td>
                <td class="text-right text-slate-500 border-r border-slate-200">${formatCurrencyValue(row.sales.rate)}</td>
                <td class="text-right font-medium text-blue-600 border-r border-slate-200">${formatCurrencyValue(row.sales.amount)}</td>
                
                <!-- Closing -->
                <td class="text-right border-r border-slate-200">${row.closing.qty}</td>
                <td class="text-right text-slate-500 border-r border-slate-200">${formatCurrencyValue(row.closing.rate)}</td>
                <td class="text-right font-bold text-slate-800">${formatCurrencyValue(row.closing.amount)}</td>
            </tr>
        `;
    }).join('');

    // Add TOTAL row at the bottom
    rowsHTML += `
        <tr class="bg-slate-100 font-extrabold border-t-2 border-slate-300">
            <td colspan="2" class="text-center text-slate-700 border-r border-slate-200 py-3 uppercase tracking-wider">TOTAL</td>
            
            <!-- Opening Amount -->
            <td colspan="2" class="border-r border-slate-200"></td>
            <td class="text-right text-slate-700 border-r border-slate-200 py-3">${formatCurrencyValue(statementTotals.openingAmount || 0)}</td>
            
            <!-- Purchase Amount -->
            <td colspan="2" class="border-r border-slate-200"></td>
            <td class="text-right text-emerald-700 border-r border-slate-200 py-3">${formatCurrencyValue(statementTotals.purchaseAmount || 0)}</td>
            
            <!-- Sales Amount -->
            <td colspan="2" class="border-r border-slate-200"></td>
            <td class="text-right text-blue-700 border-r border-slate-200 py-3">${formatCurrencyValue(statementTotals.salesAmount || 0)}</td>
            
            <!-- Closing Amount -->
            <td colspan="2" class="border-r border-slate-200"></td>
            <td class="text-right text-slate-800 py-3">${formatCurrencyValue(statementTotals.closingAmount || 0)}</td>
        </tr>
    `;

    tbody.innerHTML = rowsHTML;
}

function renderSummaryBlocks() {
    const totalSalesEl = document.getElementById('summary-total-sales');
    if (totalSalesEl) {
        totalSalesEl.textContent = formatCurrencyValue(statementTotals.salesAmount || 0);
    }
    const totalPurchaseEl = document.getElementById('summary-total-purchase');
    if (totalPurchaseEl) {
        totalPurchaseEl.textContent = formatCurrencyValue(statementTotals.purchaseAmount || 0);
    }
}

function formatCurrencyValue(amount: number): string {
    return reportsUtils.formatCurrency(amount);
}

function generatePrintableHTML(): string {
    const startFormatted = formatDateString(filterStartDateStr);
    const endFormatted = formatDateString(filterEndDateStr);

    let rowsHTML = statementData.map((row, idx) => {
        return `
            <tr>
                <td style="text-align: center;">${row.slNo || (idx + 1)}</td>
                <td style="font-weight: bold;">${row.itemName}</td>
                
                <td style="text-align: right;">${row.opening.qty}</td>
                <td style="text-align: right; color: #555;">${formatCurrencyValue(row.opening.rate)}</td>
                <td style="text-align: right; font-weight: bold;">${formatCurrencyValue(row.opening.amount)}</td>
                
                <td style="text-align: right;">${row.purchase.qty}</td>
                <td style="text-align: right; color: #555;">${formatCurrencyValue(row.purchase.rate)}</td>
                <td style="text-align: right; font-weight: bold; color: #15803d;">${formatCurrencyValue(row.purchase.amount)}</td>
                
                <td style="text-align: right;">${row.sales.qty}</td>
                <td style="text-align: right; color: #555;">${formatCurrencyValue(row.sales.rate)}</td>
                <td style="text-align: right; font-weight: bold; color: #1d4ed8;">${formatCurrencyValue(row.sales.amount)}</td>
                
                <td style="text-align: right;">${row.closing.qty}</td>
                <td style="text-align: right; color: #555;">${formatCurrencyValue(row.closing.rate)}</td>
                <td style="text-align: right; font-weight: bold; color: #111827;">${formatCurrencyValue(row.closing.amount)}</td>
            </tr>
        `;
    }).join('');

    rowsHTML += `
        <tr class="total-row" style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
            <td colspan="2" style="text-align: center; font-weight: bold; text-transform: uppercase;">TOTAL</td>
            
            <td colspan="2"></td>
            <td style="text-align: right; font-weight: bold;">${formatCurrencyValue(statementTotals.openingAmount || 0)}</td>
            
            <td colspan="2"></td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">${formatCurrencyValue(statementTotals.purchaseAmount || 0)}</td>
            
            <td colspan="2"></td>
            <td style="text-align: right; font-weight: bold; color: #1d4ed8;">${formatCurrencyValue(statementTotals.salesAmount || 0)}</td>
            
            <td colspan="2"></td>
            <td style="text-align: right; font-weight: bold; color: #111827;">${formatCurrencyValue(statementTotals.closingAmount || 0)}</td>
        </tr>
    `;

    const summaryHTML = `
        <div style="margin: 20px 0; display: flex; gap: 20px; justify-content: flex-end;">
            <div style="padding: 12px 20px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: right; min-width: 200px;">
                <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Sales</div>
                <div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 4px;">${formatCurrencyValue(statementTotals.salesAmount || 0)}</div>
            </div>
            <div style="padding: 12px 20px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: right; min-width: 200px;">
                <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Purchase</div>
                <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 4px;">${formatCurrencyValue(statementTotals.purchaseAmount || 0)}</div>
            </div>
        </div>
    `;

    const content = `
        <style>
            .nested-print-table th {
                text-align: center !important;
                font-size: 10px !important;
                padding: 6px 2px !important;
                font-weight: bold !important;
                border: 1px solid #64748b !important;
                background-color: #f8fafc !important;
            }
            .nested-print-table td {
                font-size: 11px !important;
                padding: 6px 8px !important;
                border: 1px solid #cbd5e1 !important;
            }
        </style>
        
        <table class="report-table nested-print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 4%;">SL NO</th>
                    <th rowspan="2" style="width: 24%; text-align: left; padding-left: 10px;">PARTICULARS</th>
                    <th colspan="3" style="width: 18%;">OPENING STOCK</th>
                    <th colspan="3" style="width: 18%;">PURCHASE</th>
                    <th colspan="3" style="width: 18%;">SALES</th>
                    <th colspan="3" style="width: 18%;">CLOSING STOCK</th>
                </tr>
                <tr>
                    <th>QTY</th>
                    <th>RATE</th>
                    <th>AMOUNT</th>
                    <th>QTY</th>
                    <th>RATE</th>
                    <th>AMOUNT</th>
                    <th>QTY</th>
                    <th>RATE</th>
                    <th>AMOUNT</th>
                    <th>QTY</th>
                    <th>RATE</th>
                    <th>AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            </tbody>
        </table>
        
        ${summaryHTML}
    `;

    return reportsUtils.generatePrintableReport('Stock Statement', content, {
        subtitle: `AS ON ${formatDateString(filterEndDateStr)} (Period: ${startFormatted} to ${endFormatted})`
    });
}

function printStatement() {
    const html = generatePrintableHTML();
    reportsUtils.printReport(html, 'stock-statement');
}

function saveStatementPDF() {
    const html = generatePrintableHTML();
    const filename = `stock-statement-${new Date().getTime()}`;
    reportsUtils.saveReportPDF(html, filename);
}
