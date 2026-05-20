/**
 * Purchase GST Report Module Component
 */

declare var reportsApi: any;
declare var reportsUtils: any;
declare var formatDateIndian: any;

class PurchaseGstReportComponent {
    purchaseGstReportData: PurchaseGstReportData = {
        summary: null,
        taxRateBreakdown: [],
        purchases: []
    };

    init(): void {
        this.populatePurchaseGstYearDropdown();

        const currentMonth = new Date().getMonth() + 1;
        const monthSelect = document.getElementById('purchase-gst-month') as HTMLSelectElement;
        if (monthSelect) {
            monthSelect.value = currentMonth.toString();
        }

        document.getElementById('generate-purchase-gst-report')?.addEventListener('click', () => this.generatePurchaseGSTReport());
        document.getElementById('print-purchase-gst-report')?.addEventListener('click', () => this.printPurchaseGSTReport());
        document.getElementById('save-purchase-gst-pdf')?.addEventListener('click', () => this.savePurchaseGSTReportPDF());

        this.purchaseGstReportData = { summary: null, taxRateBreakdown: [], purchases: [] };

        const summaryEl = document.getElementById('purchase-gst-report-summary');
        if (summaryEl) summaryEl.style.display = 'none';

        const detailsEl = document.getElementById('purchase-gst-details');
        if (detailsEl) detailsEl.style.display = 'none';

        const printBtn = document.getElementById('print-purchase-gst-report');
        if (printBtn) printBtn.style.display = 'none';

        const saveBtn = document.getElementById('save-purchase-gst-pdf');
        if (saveBtn) saveBtn.style.display = 'none';

        const tbody = document.getElementById('purchase-gst-report-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-shopping-cart text-4xl text-gray-300 mb-3"></i>
                        <p>Select month and year to generate report</p>
                    </td>
                </tr>
            `;
        }
    }

    populatePurchaseGstYearDropdown(): void {
        const yearSelect = document.getElementById('purchase-gst-year') as HTMLSelectElement;
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();

        yearSelect.innerHTML = '';
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year.toString();
            option.textContent = year.toString();
            yearSelect.appendChild(option);
        }
    }

    async generatePurchaseGSTReport(): Promise<void> {
        const monthSelect = document.getElementById('purchase-gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('purchase-gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '';
        const year = yearSelect?.value || '';

        const tbody = document.getElementById('purchase-gst-report-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-orange-600 text-2xl"></i>
                    <p class="text-gray-500 mt-2">Generating Purchase GST report...</p>
                </td>
            </tr>
        `;

        try {
            const data = await reportsApi.getPurchaseGstReport(month, year);

            if (data.success && data.report) {
                const report = data.report;
                const mappedReport: PurchaseGstReportData = {
                    summary: {
                        totalTaxableValue: report.summary.total_taxable_value || 0,
                        totalCGST: report.summary.total_cgst || 0,
                        totalSGST: report.summary.total_sgst || 0,
                        totalGST: report.summary.total_tax || 0
                    },
                    taxRateBreakdown: (report.tax_rate_breakdown || []).map((item: any) => ({
                        rate: item.rate,
                        description: item.description,
                        taxableValue: item.taxable_value || 0,
                        cgst: item.cgst || 0,
                        sgst: item.sgst || 0
                    })),
                    purchases: (report.purchase_breakdown || []).map((po: any) => ({
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

                this.purchaseGstReportData = mappedReport;

                if (!this.purchaseGstReportData.purchases || this.purchaseGstReportData.purchases.length === 0) {
                    reportsUtils.showNotification('No data found for the selected period.', 'info');
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">
                                <i class="fas fa-shopping-cart text-4xl text-gray-300 mb-3"></i>
                                <p>No data found for the selected period</p>
                            </td>
                        </tr>
                    `;
                    const summaryEl = document.getElementById('purchase-gst-report-summary');
                    if (summaryEl) summaryEl.style.display = 'none';

                    const detailsEl = document.getElementById('purchase-gst-details');
                    if (detailsEl) detailsEl.style.display = 'none';

                    const printBtn = document.getElementById('print-purchase-gst-report');
                    if (printBtn) printBtn.style.display = 'none';

                    const saveBtn = document.getElementById('save-purchase-gst-pdf');
                    if (saveBtn) saveBtn.style.display = 'none';
                    return;
                }

                this.renderPurchaseGSTReport(mappedReport);
            } else {
                await this.generatePurchaseGSTReportFromPurchases(month, year);
            }
        } catch (error) {
            console.error('Error generating Purchase GST report:', error);
            await this.generatePurchaseGSTReportFromPurchases(month, year);
        }
    }

    async generatePurchaseGSTReportFromPurchases(month: string, year: string): Promise<void> {
        const tbody = document.getElementById('purchase-gst-report-body');
        if (!tbody) return;

        try {
            const data = await reportsApi.getRecentPurchaseOrders();
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
                const summaryEl = document.getElementById('purchase-gst-report-summary');
                if (summaryEl) summaryEl.style.display = 'none';

                const detailsEl = document.getElementById('purchase-gst-details');
                if (detailsEl) detailsEl.style.display = 'none';
                return;
            }

            const filteredPurchases = purchaseOrders.filter((po: any) => {
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
                const summaryEl = document.getElementById('purchase-gst-report-summary');
                if (summaryEl) summaryEl.style.display = 'none';

                const detailsEl = document.getElementById('purchase-gst-details');
                if (detailsEl) detailsEl.style.display = 'none';
                return;
            }

            const rateMap = new Map<string, GstTaxRateBreakdown>();
            let totalTaxableValue = 0;
            let totalCGST = 0;
            let totalSGST = 0;

            filteredPurchases.forEach((po: any) => {
                const items = po.items || [];
                items.forEach((item: any) => {
                    const gstRate = parseFloat(item.rate) || 0;
                    const taxableValue = (item.quantity || 0) * (item.unit_price || 0);
                    const cgst = (taxableValue * gstRate / 2) / 100;
                    const sgst = (taxableValue * gstRate / 2) / 100;

                    const rateKey = gstRate.toString();
                    if (rateMap.has(rateKey)) {
                        const existing = rateMap.get(rateKey)!;
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

            const taxRateBreakdown = Array.from(rateMap.values()).sort((a, b) => b.rate - a.rate);

            const reportData: PurchaseGstReportData = {
                summary: {
                    totalTaxableValue,
                    totalCGST,
                    totalSGST,
                    totalGST: totalCGST + totalSGST
                },
                taxRateBreakdown,
                purchases: filteredPurchases.map((po: any) => ({
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

            this.purchaseGstReportData = reportData;
            this.renderPurchaseGSTReport(reportData);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                        <p>Failed to fetch purchase order data</p>
                        <button id="retry-purchase-gst-report" class="mt-2 text-blue-600 hover:underline">Retry</button>
                    </td>
                </tr>
            `;
            document.getElementById('retry-purchase-gst-report')?.addEventListener('click', () => this.generatePurchaseGSTReport());
        }
    }

    renderPurchaseGSTReport(data: PurchaseGstReportData): void {
        const { summary, taxRateBreakdown, purchases } = data;

        if (summary) {
            const taxEl = document.getElementById('purchase-summary-taxable');
            if (taxEl) taxEl.textContent = reportsUtils.formatCurrency(summary.totalTaxableValue || 0);

            const cgstEl = document.getElementById('purchase-summary-cgst');
            if (cgstEl) cgstEl.textContent = reportsUtils.formatCurrency(summary.totalCGST || 0);

            const sgstEl = document.getElementById('purchase-summary-sgst');
            if (sgstEl) sgstEl.textContent = reportsUtils.formatCurrency(summary.totalSGST || 0);

            const gstEl = document.getElementById('purchase-summary-total-gst');
            if (gstEl) gstEl.textContent = reportsUtils.formatCurrency(summary.totalGST || 0);

            const summaryEl = document.getElementById('purchase-gst-report-summary');
            if (summaryEl) summaryEl.style.display = 'grid';
        }

        const tbody = document.getElementById('purchase-gst-report-body');
        if (!tbody) return;

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
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(item.taxableValue)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(item.cgst)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(item.sgst)}</td>
                        <td class="px-4 py-3 border-b text-right font-medium">${reportsUtils.formatCurrency(item.cgst + item.sgst)}</td>
                    </tr>
                `;
            }).join('');

            if (summary) {
                tbody.innerHTML += `
                    <tr class="bg-gray-100 font-bold">
                        <td class="px-4 py-3 border-b" colspan="2">Total</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(summary.totalTaxableValue)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(summary.totalCGST)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(summary.totalSGST)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(summary.totalGST)}</td>
                    </tr>
                `;
            }
        }

        const purchaseTbody = document.getElementById('purchase-gst-details-body');
        if (purchaseTbody && purchases && purchases.length > 0) {
            const detailsEl = document.getElementById('purchase-gst-details');
            if (detailsEl) detailsEl.style.display = 'block';

            purchaseTbody.innerHTML = purchases.map(po => {
                const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(po.date) : new Date(po.date).toLocaleDateString('en-IN');
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 border-b font-medium">${po.purchase_order_id}</td>
                        <td class="px-4 py-3 border-b">${formattedDate}</td>
                        <td class="px-4 py-3 border-b">${po.supplier}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(po.taxableValue)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(po.cgst)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(po.sgst)}</td>
                        <td class="px-4 py-3 border-b text-right font-medium">${reportsUtils.formatCurrency(po.total)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            const detailsEl = document.getElementById('purchase-gst-details');
            if (detailsEl) detailsEl.style.display = 'none';
        }

        const printBtn = document.getElementById('print-purchase-gst-report');
        if (printBtn) printBtn.style.display = 'flex';

        const saveBtn = document.getElementById('save-purchase-gst-pdf');
        if (saveBtn) saveBtn.style.display = 'flex';
    }

    getMonthName(month: number): string {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    }

    generatePurchaseGSTReportHTML(): string {
        const monthSelect = document.getElementById('purchase-gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('purchase-gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '1';
        const year = yearSelect?.value || '';

        const { summary, taxRateBreakdown, purchases } = this.purchaseGstReportData;

        const tableContent = taxRateBreakdown.map(item => {
            const rateValue = item.rate !== undefined ? `${item.rate}%` : 'N/A';
            return `
                <tr>
                    <td>${rateValue}</td>
                    <td>${item.description}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(item.taxableValue)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(item.cgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(item.sgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(item.cgst + item.sgst)}</td>
                </tr>
            `;
        }).join('');

        const purchaseTableContent = purchases.map(po => {
            const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(po.date) : new Date(po.date).toLocaleDateString('en-IN');
            return `
                <tr>
                    <td>${po.purchase_order_id}</td>
                    <td>${formattedDate}</td>
                    <td>${po.supplier}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(po.taxableValue)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(po.cgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(po.sgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(po.total)}</td>
                </tr>
            `;
        }).join('');

        const content = `
            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-label">Total Taxable Value</div>
                    <div class="summary-value">${reportsUtils.formatCurrency(summary?.totalTaxableValue || 0)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total CGST</div>
                    <div class="summary-value">${reportsUtils.formatCurrency(summary?.totalCGST || 0)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total SGST</div>
                    <div class="summary-value">${reportsUtils.formatCurrency(summary?.totalSGST || 0)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total GST</div>
                    <div class="summary-value" style="color: #ea580c;">${reportsUtils.formatCurrency(summary?.totalGST || 0)}</div>
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
                        <td class="text-right">${reportsUtils.formatCurrency(summary?.totalTaxableValue || 0)}</td>
                        <td class="text-right">${reportsUtils.formatCurrency(summary?.totalCGST || 0)}</td>
                        <td class="text-right">${reportsUtils.formatCurrency(summary?.totalSGST || 0)}</td>
                        <td class="text-right">${reportsUtils.formatCurrency(summary?.totalGST || 0)}</td>
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

        const subtitle = `Period: ${this.getMonthName(parseInt(month))} ${year}`;

        return reportsUtils.generatePrintableReport('Monthly Purchase GST Report', content, { subtitle });
    }

    printPurchaseGSTReport(): void {
        const html = this.generatePurchaseGSTReportHTML();
        reportsUtils.printReport(html, 'purchase-gst-report');
    }

    savePurchaseGSTReportPDF(): void {
        const html = this.generatePurchaseGSTReportHTML();
        const monthSelect = document.getElementById('purchase-gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('purchase-gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '1';
        const year = yearSelect?.value || '';

        const filename = `purchase-gst-report-${this.getMonthName(parseInt(month))}-${year}`;
        reportsUtils.saveReportPDF(html, filename);
    }

    loadSavedPurchaseGSTReport(report: SavedReport): void {
        if (!report || !report.data) return;

        const data = report.data;
        const params = report.parameters || {};

        const monthSelect = document.getElementById('purchase-gst-month') as HTMLSelectElement;
        if (params.month && monthSelect) monthSelect.value = params.month;

        const yearSelect = document.getElementById('purchase-gst-year') as HTMLSelectElement;
        if (params.year && yearSelect) yearSelect.value = params.year;

        this.purchaseGstReportData = {
            summary: {
                totalTaxableValue: data.summary.total_taxable_value || 0,
                totalCGST: data.summary.total_cgst || 0,
                totalSGST: data.summary.total_sgst || 0,
                totalGST: data.summary.total_tax || 0
            },
            taxRateBreakdown: (data.tax_rate_breakdown || []).map((item: any) => ({
                rate: item.rate,
                description: item.description,
                taxableValue: item.taxable_value || 0,
                cgst: item.cgst || 0,
                sgst: item.sgst || 0
            })),
            purchases: (data.purchase_breakdown || []).map((po: any) => ({
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

        this.renderPurchaseGSTReport(this.purchaseGstReportData);
    }
}

declare var purchaseGstReportComponent: PurchaseGstReportComponent;
(window as any).purchaseGstReportComponent = new PurchaseGstReportComponent();
