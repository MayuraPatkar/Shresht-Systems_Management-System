/**
 * GST Report Module Component
 */

declare var reportsApi: any;
declare var reportsUtils: any;
declare var formatDateIndian: any;

class GstReportComponent {
    gstReportData: GstReportData = {
        summary: null,
        taxRateBreakdown: [],
        invoices: []
    };

    init(): void {
        this.populateYearDropdown();

        const currentMonth = new Date().getMonth() + 1;
        const monthSelect = document.getElementById('gst-month') as HTMLSelectElement;
        if (monthSelect) {
            monthSelect.value = currentMonth.toString();
        }

        document.getElementById('generate-gst-report')?.addEventListener('click', () => this.generateGSTReport());
        document.getElementById('print-gst-report')?.addEventListener('click', () => this.printGSTReport());
        document.getElementById('save-gst-pdf')?.addEventListener('click', () => this.saveGSTReportPDF());

        this.gstReportData = { summary: null, taxRateBreakdown: [], invoices: [] };

        const summaryEl = document.getElementById('gst-report-summary');
        if (summaryEl) summaryEl.style.display = 'none';

        const detailsEl = document.getElementById('gst-invoice-details');
        if (detailsEl) detailsEl.style.display = 'none';

        const printBtn = document.getElementById('print-gst-report');
        if (printBtn) printBtn.style.display = 'none';

        const saveBtn = document.getElementById('save-gst-pdf');
        if (saveBtn) saveBtn.style.display = 'none';

        const tbody = document.getElementById('gst-report-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                        <p>Select month and year to generate report</p>
                    </td>
                </tr>
            `;
        }
    }

    populateYearDropdown(): void {
        const yearSelect = document.getElementById('gst-year') as HTMLSelectElement;
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

    async generateGSTReport(): Promise<void> {
        const monthSelect = document.getElementById('gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '';
        const year = yearSelect?.value || '';

        const tbody = document.getElementById('gst-report-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-green-600 text-2xl"></i>
                    <p class="text-gray-500 mt-2">Generating GST report...</p>
                </td>
            </tr>
        `;

        try {
            const data = await reportsApi.getGstReport(month, year);

            if (data.success && data.report) {
                const report = data.report;
                const mappedReport: GstReportData = {
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
                    hsnBreakdown: (report.hsn_breakdown || []).map((item: any) => ({
                        hsn: item.hsn_sac || 'N/A',
                        description: item.description || `GST @ ${item.rate || 0}%`,
                        taxableValue: item.taxable_value || 0,
                        cgst: item.cgst || 0,
                        sgst: item.sgst || 0
                    })),
                    invoices: (report.invoice_breakdown || []).map((inv: any) => ({
                        invoice_id: inv.invoice_id,
                        date: inv.invoice_date,
                        customer: inv.customer_name || 'Unknown',
                        taxableValue: inv.taxable_value || 0,
                        cgst: inv.cgst || 0,
                        sgst: inv.sgst || 0,
                        total: inv.total_value || 0
                    }))
                };

                this.gstReportData = mappedReport;

                if (!this.gstReportData.invoices || this.gstReportData.invoices.length === 0) {
                    reportsUtils.showNotification('No data found for the selected period.', 'info');
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">
                                <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                                <p>No data found for the selected period</p>
                            </td>
                        </tr>
                    `;
                    const summaryEl = document.getElementById('gst-report-summary');
                    if (summaryEl) summaryEl.style.display = 'none';

                    const detailsEl = document.getElementById('gst-invoice-details');
                    if (detailsEl) detailsEl.style.display = 'none';

                    const printBtn = document.getElementById('print-gst-report');
                    if (printBtn) printBtn.style.display = 'none';

                    const saveBtn = document.getElementById('save-gst-pdf');
                    if (saveBtn) saveBtn.style.display = 'none';
                    return;
                }

                this.renderGSTReport(mappedReport);
            } else {
                await this.generateGSTReportFromInvoices(month, year);
            }
        } catch (error) {
            console.error('Error generating GST report:', error);
            await this.generateGSTReportFromInvoices(month, year);
        }
    }

    async generateGSTReportFromInvoices(month: string, year: string): Promise<void> {
        const tbody = document.getElementById('gst-report-body');
        if (!tbody) return;

        try {
            const invoices = await reportsApi.getAllInvoices();

            if (!invoices || invoices.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-gray-500">
                            <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                            <p>No invoices found</p>
                        </td>
                    </tr>
                `;
                const summaryEl = document.getElementById('gst-report-summary');
                if (summaryEl) summaryEl.style.display = 'none';

                const detailsEl = document.getElementById('gst-invoice-details');
                if (detailsEl) detailsEl.style.display = 'none';
                return;
            }

            const filteredInvoices = invoices.filter((inv: any) => {
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
                const summaryEl = document.getElementById('gst-report-summary');
                if (summaryEl) summaryEl.style.display = 'none';

                const detailsEl = document.getElementById('gst-invoice-details');
                if (detailsEl) detailsEl.style.display = 'none';
                return;
            }

            const rateMap = new Map<string, GstTaxRateBreakdown>();
            let totalTaxableValue = 0;
            let totalCGST = 0;
            let totalSGST = 0;

            filteredInvoices.forEach((invoice: any) => {
                const items = invoice.items_original || invoice.items || [];
                items.forEach((item: any) => {
                    const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : item.rate) || 0;
                    const taxableValue = typeof item.taxable_value === 'number' ? item.taxable_value : ((item.quantity || 0) * (item.unit_price || 0));
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

            const reportData: GstReportData = {
                summary: {
                    totalTaxableValue,
                    totalCGST,
                    totalSGST,
                    totalGST: totalCGST + totalSGST
                },
                taxRateBreakdown,
                invoices: filteredInvoices.map((inv: any) => ({
                    invoice_id: inv.invoice_no || inv.invoice_id || inv._id,
                    date: inv.invoice_date || inv.date,
                    customer: inv.customer_snapshot?.name || inv.customer_name || inv.buyer_name || inv.buyer?.name || 'Unknown',
                    taxableValue: inv.totals_original?.taxable_value || inv.totals_duplicate?.taxable_value || inv.subtotal || inv.sub_total || 0,
                    cgst: inv.totals_original?.cgst || inv.totals_duplicate?.cgst || (inv.tax || 0) / 2,
                    sgst: inv.totals_original?.sgst || inv.totals_duplicate?.sgst || (inv.tax || 0) / 2,
                    total: inv.totals_original?.grand_total || inv.totals_duplicate?.grand_total || inv.grand_total || inv.grandTotal || 0
                }))
            };

            this.gstReportData = reportData;
            this.renderGSTReport(reportData);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                        <p>Failed to fetch invoice data</p>
                        <button id="retry-gst-report" class="mt-2 text-blue-600 hover:underline">Retry</button>
                    </td>
                </tr>
            `;
            document.getElementById('retry-gst-report')?.addEventListener('click', () => this.generateGSTReport());
        }
    }

    renderGSTReport(data: GstReportData): void {
        const { summary, taxRateBreakdown, hsnBreakdown, invoices } = data;
        const breakdownList = taxRateBreakdown || hsnBreakdown || [];

        if (summary) {
            const taxEl = document.getElementById('summary-taxable');
            if (taxEl) taxEl.textContent = reportsUtils.formatCurrency(summary.totalTaxableValue || 0);

            const cgstEl = document.getElementById('summary-cgst');
            if (cgstEl) cgstEl.textContent = reportsUtils.formatCurrency(summary.totalCGST || 0);

            const sgstEl = document.getElementById('summary-sgst');
            if (sgstEl) sgstEl.textContent = reportsUtils.formatCurrency(summary.totalSGST || 0);

            const gstEl = document.getElementById('summary-total-gst');
            if (gstEl) gstEl.textContent = reportsUtils.formatCurrency(summary.totalGST || 0);

            const summaryEl = document.getElementById('gst-report-summary');
            if (summaryEl) summaryEl.style.display = 'grid';
        }

        const tbody = document.getElementById('gst-report-body');
        const tableHeader = document.querySelector('#gst-report-table thead tr th:first-child');
        const sectionTitle = document.getElementById('gst-breakdown-title');

        if (tableHeader) {
            tableHeader.textContent = 'Tax Rate';
        }
        if (sectionTitle) {
            sectionTitle.textContent = 'Tax Rate Wise Breakdown';
        }

        if (!tbody) return;

        if (!breakdownList || breakdownList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No data found</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = breakdownList.map(item => {
                const firstColValue = (item as any).rate !== undefined ? `${(item as any).rate}%` : ((item as any).hsn || (item as any).hsn_sac || 'N/A');

                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 border-b font-medium">${firstColValue}</td>
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

        const invoiceTbody = document.getElementById('gst-invoice-body');
        if (invoiceTbody && invoices && invoices.length > 0) {
            const detailsEl = document.getElementById('gst-invoice-details');
            if (detailsEl) detailsEl.style.display = 'block';

            invoiceTbody.innerHTML = invoices.map(inv => {
                const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(inv.date) : new Date(inv.date).toLocaleDateString('en-IN');
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 border-b font-medium">${inv.invoice_id}</td>
                        <td class="px-4 py-3 border-b">${formattedDate}</td>
                        <td class="px-4 py-3 border-b">${inv.customer}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(inv.taxableValue)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(inv.cgst)}</td>
                        <td class="px-4 py-3 border-b text-right">${reportsUtils.formatCurrency(inv.sgst)}</td>
                        <td class="px-4 py-3 border-b text-right font-medium">${reportsUtils.formatCurrency(inv.total)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            const detailsEl = document.getElementById('gst-invoice-details');
            if (detailsEl) detailsEl.style.display = 'none';
        }

        const printBtn = document.getElementById('print-gst-report');
        if (printBtn) printBtn.style.display = 'flex';

        const saveBtn = document.getElementById('save-gst-pdf');
        if (saveBtn) saveBtn.style.display = 'flex';
    }

    getMonthName(month: number): string {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    }

    generateGSTReportHTML(): string {
        const monthSelect = document.getElementById('gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '1';
        const year = yearSelect?.value || '';

        const { summary, taxRateBreakdown, hsnBreakdown, invoices } = this.gstReportData;
        const breakdownList = taxRateBreakdown || hsnBreakdown || [];

        const tableContent = breakdownList.map(item => {
            const rateValue = (item as any).rate !== undefined ? `${(item as any).rate}%` : 'N/A';
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

        const invoiceTableContent = invoices.map(inv => {
            const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(inv.date) : new Date(inv.date).toLocaleDateString('en-IN');
            return `
                <tr>
                    <td>${inv.invoice_id}</td>
                    <td>${formattedDate}</td>
                    <td>${inv.customer}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(inv.taxableValue)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(inv.cgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(inv.sgst)}</td>
                    <td class="text-right">${reportsUtils.formatCurrency(inv.total)}</td>
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

        const subtitle = `Period: ${this.getMonthName(parseInt(month))} ${year}`;

        return reportsUtils.generatePrintableReport('Monthly GST Report', content, { subtitle });
    }

    printGSTReport(): void {
        const html = this.generateGSTReportHTML();
        reportsUtils.printReport(html, 'gst-report');
    }

    saveGSTReportPDF(): void {
        const html = this.generateGSTReportHTML();
        const monthSelect = document.getElementById('gst-month') as HTMLSelectElement;
        const yearSelect = document.getElementById('gst-year') as HTMLSelectElement;

        const month = monthSelect?.value || '1';
        const year = yearSelect?.value || '';

        const filename = `gst-report-${this.getMonthName(parseInt(month))}-${year}`;
        reportsUtils.saveReportPDF(html, filename);
    }

    loadSavedGSTReport(report: SavedReport): void {
        if (!report || !report.data) return;

        const data = report.data;
        const params = report.parameters || {};

        const monthSelect = document.getElementById('gst-month') as HTMLSelectElement;
        if (params.month && monthSelect) monthSelect.value = params.month;

        const yearSelect = document.getElementById('gst-year') as HTMLSelectElement;
        if (params.year && yearSelect) yearSelect.value = params.year;

        this.gstReportData = {
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
            hsnBreakdown: (data.hsn_breakdown || []).map((item: any) => ({
                hsn: item.hsn_sac || 'N/A',
                description: item.description || `GST @ ${item.rate || 0}%`,
                taxableValue: item.taxable_value || 0,
                cgst: item.cgst || 0,
                sgst: item.sgst || 0
            })),
            invoices: (data.invoice_breakdown || []).map((inv: any) => ({
                invoice_id: inv.invoice_id,
                date: inv.invoice_date,
                customer: inv.customer_name || 'Unknown',
                taxableValue: inv.taxable_value || 0,
                cgst: inv.cgst || 0,
                sgst: inv.sgst || 0,
                total: inv.total_value || 0
            }))
        };

        this.renderGSTReport(this.gstReportData);
    }
}

declare var gstReportComponent: GstReportComponent;
(window as any).gstReportComponent = new GstReportComponent();
