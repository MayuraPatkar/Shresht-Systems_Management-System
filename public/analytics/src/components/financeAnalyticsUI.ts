/**
 * Finance Analytics UI Controller
 */

declare var analyticsApi: any;
declare var chartRenderer: any;
declare var coreGlobal: any;

class FinanceAnalyticsUI {
    private activeFilters: any = {
        dateRange: 'thismonth',
        startDate: '',
        endDate: '',
        branch: '',
        paymentMethod: '',
        customer: '',
        supplier: '',
        voucherType: '',
        gstType: '',
        account: ''
    };

    private dashboardData: any = null;
    
    // Pagination states
    private pagTableCustomersPage = 1;
    private pagTableVendorsPage = 1;
    private itemsPerPage = 5;

    init() {
        // Guard access check
        if (!this.checkUserPermission()) {
            this.renderAccessDenied();
            return;
        }

        this.bindEvents();
        this.fetchDropdownFilters();
        this.fetchDashboardData();
    }

    private checkUserPermission(): boolean {
        try {
            const role = coreGlobal.getCookie('role') || 'user';
            return role === 'admin' || role === 'manager';
        } catch {
            return true; 
        }
    }

    private renderAccessDenied() {
        const container = document.getElementById('dashboard-content');
        if (container) {
            container.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 shadow-sm max-w-lg mx-auto mt-12 fade-in">
                    <div class="p-5 bg-rose-50 text-rose-500 rounded-full h-20 w-20 flex items-center justify-center border border-rose-100">
                        <i class="fas fa-user-lock text-3xl"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight">Access Denied</h2>
                        <p class="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                            You do not have the required permissions to view the Finance Analytics dashboard. Please contact your system administrator.
                        </p>
                    </div>
                    <a href="/stock" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-95">
                        Back to Core Manager
                    </a>
                </div>
            `;
        }
    }

    private bindEvents() {
        // Date pills
        const datePills = document.querySelectorAll('.btn-date-filter');
        datePills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                datePills.forEach(p => p.classList.remove('bg-blue-600', 'text-white'));
                datePills.forEach(p => p.classList.add('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100'));
                
                pill.classList.remove('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100');
                pill.classList.add('bg-blue-600', 'text-white');

                const range = pill.getAttribute('data-range') || 'thismonth';
                this.activeFilters.dateRange = range;

                const customContainer = document.getElementById('custom-date-container');
                if (range === 'custom') {
                    customContainer?.classList.remove('hidden');
                    customContainer?.classList.add('flex');
                } else {
                    customContainer?.classList.remove('flex');
                    customContainer?.classList.add('hidden');
                    this.fetchDashboardData();
                }
            });
        });

        // Apply custom date range
        document.getElementById('btn-apply-custom-date')?.addEventListener('click', () => {
            const startVal = (document.getElementById('filter-start-date') as HTMLInputElement).value;
            const endVal = (document.getElementById('filter-end-date') as HTMLInputElement).value;
            
            if (startVal && endVal) {
                this.activeFilters.startDate = startVal;
                this.activeFilters.endDate = endVal;
                this.fetchDashboardData();
            }
        });

        // Dropdown Filters
        ['branch', 'paymentMethod', 'customer', 'supplier', 'account'].forEach(field => {
            const el = document.getElementById(`filter-${field}`);
            el?.addEventListener('change', (e) => {
                this.activeFilters[field] = (e.target as HTMLSelectElement).value;
                this.fetchDashboardData();
            });
        });

        // Reset empty state
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Table Paginations
        document.querySelector('#pag-customers .btn-prev')?.addEventListener('click', () => {
            if (this.pagTableCustomersPage > 1) {
                this.pagTableCustomersPage--;
                this.renderCustomersTable();
            }
        });
        document.querySelector('#pag-customers .btn-next')?.addEventListener('click', () => {
            const maxPage = Math.ceil((this.dashboardData?.tables?.topCustomers?.length || 0) / this.itemsPerPage);
            if (this.pagTableCustomersPage < maxPage) {
                this.pagTableCustomersPage++;
                this.renderCustomersTable();
            }
        });

        document.querySelector('#pag-vendors .btn-prev')?.addEventListener('click', () => {
            if (this.pagTableVendorsPage > 1) {
                this.pagTableVendorsPage--;
                this.renderVendorsTable();
            }
        });
        document.querySelector('#pag-vendors .btn-next')?.addEventListener('click', () => {
            const maxPage = Math.ceil((this.dashboardData?.tables?.vendorExpenses?.length || 0) / this.itemsPerPage);
            if (this.pagTableVendorsPage < maxPage) {
                this.pagTableVendorsPage++;
                this.renderVendorsTable();
            }
        });

        // Exports
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.exportPDF());
        document.getElementById('btn-export-excel')?.addEventListener('click', () => this.exportExcel());
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());

        // Adapt charts on window resize
        window.addEventListener('resize', () => {
            if (this.dashboardData) {
                this.renderSVGVisualizations();
            }
        });
    }

    private resetFilters() {
        this.activeFilters = {
            dateRange: 'thismonth',
            startDate: '',
            endDate: '',
            branch: '',
            paymentMethod: '',
            customer: '',
            supplier: '',
            voucherType: '',
            gstType: '',
            account: ''
        };

        // Reset date pills
        const datePills = document.querySelectorAll('.btn-date-filter');
        datePills.forEach(p => p.classList.remove('bg-blue-600', 'text-white'));
        datePills.forEach(p => p.classList.add('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100'));
        const defaultPill = document.querySelector('.btn-date-filter[data-range="thismonth"]');
        defaultPill?.classList.remove('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100');
        defaultPill?.classList.add('bg-blue-600', 'text-white');

        document.getElementById('custom-date-container')?.classList.add('hidden');

        // Reset selects
        ['branch', 'paymentMethod', 'customer', 'supplier', 'account'].forEach(field => {
            const el = document.getElementById(`filter-${field}`) as HTMLSelectElement;
            if (el) el.value = '';
        });

        this.fetchDashboardData();
    }

    private async fetchDropdownFilters() {
        try {
            const opts = await analyticsApi.getFinanceFiltersOptions();
            
            this.populateSelect('filter-branch', opts.branches);
            this.populateSelect('filter-paymentMethod', opts.paymentMethods);
            this.populateSelect('filter-customer', opts.customers);
            this.populateSelect('filter-supplier', opts.suppliers);
            this.populateSelect('filter-account', opts.accounts);
        } catch (err) {
            console.error('Failed to load filters list:', err);
        }
    }

    private populateSelect(id: string, list: { id: string; name: string }[]) {
        const select = document.getElementById(id) as HTMLSelectElement;
        if (!select) return;

        const firstOpt = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOpt);

        (list || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.name;
            select.appendChild(opt);
        });
    }

    private async fetchDashboardData() {
        this.setLoading(true);
        document.getElementById('error-banner')?.classList.add('hidden');
        document.getElementById('empty-state')?.classList.add('hidden');

        try {
            const data = await analyticsApi.getFinanceData(this.activeFilters);
            this.dashboardData = data;

            if (!data || !data.kpis || data.kpis.revenue.current === 0) {
                document.getElementById('empty-state')?.classList.remove('hidden');
                this.setLoading(false);
                return;
            }

            this.updateKPIs(data.kpis);
            this.updateInsights(data.insights);
            this.updateRatios(data.ratios);
            this.updateForecast(data.forecast);
            
            // Render tables (paginated)
            this.pagTableCustomersPage = 1;
            this.pagTableVendorsPage = 1;
            this.renderCustomersTable();
            this.renderVendorsTable();

            // Render custom SVG visualizations
            this.renderSVGVisualizations();

            this.setLoading(false);
        } catch (err) {
            console.error('Error loading finance data:', err);
            document.getElementById('error-banner')?.classList.remove('hidden');
            this.setLoading(false);
        }
    }

    private setLoading(isLoading: boolean) {
        const main = document.querySelector('main');
        if (isLoading) {
            main?.classList.add('opacity-60', 'pointer-events-none');
        } else {
            main?.classList.remove('opacity-60', 'pointer-events-none');
        }
    }

    private updateKPIs(kpis: any) {
        const map = [
            { id: 'revenue', key: 'revenue', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'expenses', key: 'expenses', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'gross-profit', key: 'grossProfit', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'net-profit', key: 'netProfit', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'cash-hand', key: 'cashInHand', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'bank-balance', key: 'bankBalance', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'receivables', key: 'receivables', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'payables', key: 'payables', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'gst-payable', key: 'gstPayable', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'gst-collected', key: 'gstCollected', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'profit-margin', key: 'profitMargin', format: (val: number) => `${val.toFixed(1)}%` },
            { id: 'expense-ratio', key: 'expenseRatio', format: (val: number) => `${val.toFixed(1)}%` },
            { id: 'cash-flow', key: 'cashFlow', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'working-capital', key: 'workingCapital', format: (val: number) => `₹${Math.round(val).toLocaleString()}` }
        ];

        map.forEach(item => {
            const dataObj = kpis[item.key];
            if (!dataObj) return;

            const valEl = document.getElementById(`val-${item.id}`);
            if (valEl) valEl.textContent = item.format(dataObj.current);

            const change = dataObj.previous > 0 ? ((dataObj.current - dataObj.previous) / dataObj.previous) * 100 : 0;
            const badge = document.getElementById(`badge-${item.id}`);
            if (badge) {
                const isDecreasingGood = ['expenses', 'payables', 'gstPayable', 'expenseRatio'].includes(item.key);
                const isUp = change >= 0;

                let colorClass = 'text-emerald-600 bg-emerald-50';
                if ((isUp && isDecreasingGood) || (!isUp && !isDecreasingGood)) {
                    colorClass = 'text-rose-600 bg-rose-50';
                }

                badge.className = `flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold ${colorClass}`;
                badge.innerHTML = `
                    <i class="fas ${isUp ? 'fa-caret-up' : 'fa-caret-down'}"></i>
                    <span>${Math.abs(change).toFixed(1)}%</span>
                `;
            }
        });
    }

    private updateInsights(insights: { text: string; type: string }[]) {
        const grid = document.getElementById('insights-grid');
        if (!grid) return;

        grid.innerHTML = '';
        if (!insights || insights.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-center text-xs text-slate-400 font-semibold py-4">No critical insights identified.</p>`;
            return;
        }

        insights.forEach(ins => {
            const card = document.createElement('div');
            
            let bg = 'bg-blue-50/40 border-blue-100 text-blue-700';
            let icon = 'fa-info-circle text-blue-500';
            if (ins.type === 'warning') {
                bg = 'bg-amber-50/40 border-amber-100 text-amber-800';
                icon = 'fa-triangle-exclamation text-amber-500';
            } else if (ins.type === 'success') {
                bg = 'bg-emerald-50/40 border-emerald-100 text-emerald-800';
                icon = 'fa-circle-check text-emerald-500';
            }

            card.className = `flex items-start gap-3 border ${bg} rounded-xl p-3.5 text-[11px] font-medium leading-relaxed`;
            card.innerHTML = `
                <i class="fas ${icon} mt-0.5 text-sm flex-shrink-0"></i>
                <span>${ins.text}</span>
            `;
            grid.appendChild(card);
        });
    }

    private updateRatios(ratios: any) {
        document.getElementById('ratio-current')!.textContent = `${ratios.currentRatio.toFixed(2)}x`;
        document.getElementById('ratio-quick')!.textContent = `${ratios.quickRatio.toFixed(2)}x`;
        document.getElementById('ratio-gross-margin')!.textContent = `${ratios.grossMargin.toFixed(1)}%`;
        document.getElementById('ratio-net-margin')!.textContent = `${ratios.netMargin.toFixed(1)}%`;
    }

    private updateForecast(forecast: any) {
        const monthEl = document.getElementById('lbl-forecast-month');
        if (monthEl) monthEl.textContent = `Predicting next month: ${forecast.nextMonthName}`;

        const revEl = document.getElementById('val-forecast-revenue');
        if (revEl) revEl.textContent = `₹${Math.round(forecast.predictedValue).toLocaleString()}`;

        const expEl = document.getElementById('val-forecast-expenses');
        if (expEl) expEl.textContent = `₹${Math.round(forecast.expectedExpenses).toLocaleString()}`;

        const profitEl = document.getElementById('val-forecast-profit');
        if (profitEl) profitEl.textContent = `₹${Math.round(forecast.expectedProfit).toLocaleString()}`;
    }

    private renderCustomersTable() {
        const list = this.dashboardData?.tables?.topCustomers || [];
        const tbody = document.getElementById('table-customers-rows');
        if (!tbody) return;

        tbody.innerHTML = '';
        const start = (this.pagTableCustomersPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageItems = list.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 font-semibold">No records found.</td></tr>`;
            return;
        }

        pageItems.forEach((item: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-750';
            tr.innerHTML = `
                <td class="py-2.5 pr-2 font-semibold text-slate-800">${item.customer}</td>
                <td class="py-2.5 px-2 text-right font-bold">₹${Math.round(item.revenue).toLocaleString()}</td>
                <td class="py-2.5 px-2 text-right text-rose-600 font-bold">₹${Math.round(item.outstanding).toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right text-slate-500">${item.invoicesCount}</td>
            `;
            tbody.appendChild(tr);
        });

        const totalPages = Math.ceil(list.length / this.itemsPerPage) || 1;
        const span = document.querySelector('#pag-customers span');
        if (span) span.textContent = `Page ${this.pagTableCustomersPage} of ${totalPages}`;
    }

    private renderVendorsTable() {
        const list = this.dashboardData?.tables?.vendorExpenses || [];
        const tbody = document.getElementById('table-vendors-rows');
        if (!tbody) return;

        tbody.innerHTML = '';
        const start = (this.pagTableVendorsPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageItems = list.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 font-semibold">No records found.</td></tr>`;
            return;
        }

        pageItems.forEach((item: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-750';
            tr.innerHTML = `
                <td class="py-2.5 pr-2 font-semibold text-slate-800">${item.supplier}</td>
                <td class="py-2.5 px-2 text-right font-bold">₹${Math.round(item.expense).toLocaleString()}</td>
                <td class="py-2.5 px-2 text-right text-rose-600 font-bold">₹${Math.round(item.outstanding).toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right text-slate-500">${item.billsCount}</td>
            `;
            tbody.appendChild(tr);
        });

        const totalPages = Math.ceil(list.length / this.itemsPerPage) || 1;
        const span = document.querySelector('#pag-vendors span');
        if (span) span.textContent = `Page ${this.pagTableVendorsPage} of ${totalPages}`;
    }

    private renderSVGVisualizations() {
        if (!this.dashboardData) return;
        const charts = this.dashboardData.charts;

        // 1. Revenue vs Expense Comparison (Monthly)
        chartRenderer.renderLineOrAreaChart(
            'chart-revenue-expense', 
            (charts.revenueExpense || []).map((d: any) => ({ label: d.month, value: d.value, value2: d.value2 })), 
            { isArea: false, label1: 'Revenue', label2: 'Expenses', unit: '₹', color1: '#3b82f6', color2: '#ef4444' }
        );

        // 2. Cash Flow (Inflow vs Outflow)
        chartRenderer.renderLineOrAreaChart(
            'chart-cash-flow', 
            (charts.cashFlow || []).map((d: any) => ({ label: d.month, value: d.value, value2: d.value2 })), 
            { isArea: true, label1: 'Inflows', label2: 'Outflows', unit: '₹', color1: '#10b981', color2: '#f59e0b' }
        );

        // 3. Receivable Aging (Donut)
        chartRenderer.renderPieOrDonutChart(
            'chart-receivable-aging', 
            (charts.receivableAging || []).map((d: any) => ({ name: d.label, value: d.value })), 
            { isDonut: true }
        );

        // 4. Payable Aging (Donut)
        chartRenderer.renderPieOrDonutChart(
            'chart-payable-aging', 
            (charts.payableAging || []).map((d: any) => ({ name: d.label, value: d.value })), 
            { isDonut: true }
        );

        // 5. GST collected vs Claimed
        chartRenderer.renderLineOrAreaChart(
            'chart-gst', 
            (charts.gstAnalytics || []).map((d: any) => ({ label: d.month, value: d.value, value2: d.value2 })), 
            { isArea: false, label1: 'Collected', label2: 'Paid Input Claim', unit: '₹', color1: '#06b6d4', color2: '#ec4899' }
        );

        // 6. Department Budgets Variance
        chartRenderer.renderBarChart(
            'chart-budgets', 
            (charts.budgets || []).map((d: any) => ({ name: d.name, value: d.value2 })), 
            { color: '#6366f1', unit: '₹' }
        );

        // 7. Linear Regression Forecast
        const histData = charts.revenueExpense || [];
        const forecastObj = this.dashboardData.forecast;

        const forecastHistory = histData.map((d: any) => ({
            month: d.month,
            value: d.value 
        }));
        
        const predictedPoint = {
            month: forecastObj.nextMonthName,
            value: forecastObj.predictedValue
        };

        chartRenderer.renderForecastChart(
            'chart-forecast', 
            forecastHistory, 
            predictedPoint, 
            { color: '#3b82f6', unit: '₹' }
        );

        // 8. Heatmap
        chartRenderer.renderHeatmap('heatmap-container', this.dashboardData.heatmap || []);
    }

    private exportCSV() {
        if (!this.dashboardData) return;
        const rows = [
            ['Finance Performance Executive Report'],
            ['Date Range', this.activeFilters.dateRange],
            [],
            ['KPI Metric', 'Current Value (INR)'],
            ['Total Sales Revenue', this.dashboardData.kpis.revenue.current],
            ['Total Vendor Expenses', this.dashboardData.kpis.expenses.current],
            ['Gross Profit Balance', this.dashboardData.kpis.grossProfit.current],
            ['Net Profit Balance', this.dashboardData.kpis.netProfit.current],
            ['Petty Cash Balance', this.dashboardData.kpis.cashInHand.current],
            ['Bank Ledger Balance', this.dashboardData.kpis.bankBalance.current],
            ['Outstanding Receivables', this.dashboardData.kpis.receivables.current],
            ['Outstanding Payables', this.dashboardData.kpis.payables.current],
            ['GST Liability Payable', this.dashboardData.kpis.gstPayable.current],
            ['GST Collected Output', this.dashboardData.kpis.gstCollected.current],
            ['Profit Margin %', this.dashboardData.kpis.profitMargin.current],
            ['Expense Ratio %', this.dashboardData.kpis.expenseRatio.current],
            ['Net Cash Flow Value', this.dashboardData.kpis.cashFlow.current],
            ['Working Capital Surplus', this.dashboardData.kpis.workingCapital.current],
            [],
            ['Ratios', 'Rate Index'],
            ['Current Ratio', this.dashboardData.ratios.currentRatio],
            ['Quick Ratio', this.dashboardData.ratios.quickRatio],
            ['Gross Margin %', this.dashboardData.ratios.grossMargin],
            ['Net Margin %', this.dashboardData.ratios.netMargin]
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SSMS_Finance_Analytics_${this.activeFilters.dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private exportExcel() {
        this.exportCSV(); 
    }

    private exportPDF() {
        window.print();
    }
}

declare var financeAnalyticsUI: any;
(window as any).financeAnalyticsUI = new FinanceAnalyticsUI();
