/**
 * Sales Analytics UI Controller and Logic
 */

declare var analyticsApi: any;
declare var chartRenderer: any;
declare function showAlert(message: string): void;

class SalesAnalyticsUI {
    private filters = {
        dateRange: 'thismonth',
        startDate: '',
        endDate: '',
        customer: '',
        salesperson: '',
        product: '',
        category: '',
        branch: '',
        status: ''
    };

    // Table pagination state
    private tableState = {
        customers: { data: [] as any[], page: 1, pageSize: 5 },
        products: { data: [] as any[], page: 1, pageSize: 5 },
        salespersons: { data: [] as any[], page: 1, pageSize: 5 }
    };

    // Cached full API response
    private rawData: any = null;

    init() {
        // Role check permission guard
        const role = sessionStorage.getItem('userRole') || 'admin';
        if (role.toLowerCase() === 'user') {
            this.renderPermissionDenied();
            return;
        }

        this.setupUserBadge();
        this.setupEventListeners();
        this.loadFiltersOptions();
        this.fetchData();
    }

    private setupUserBadge() {
        const role = sessionStorage.getItem('userRole') || 'admin';
        const roleEl = document.getElementById('header-user-role');
        const roleIconEl = document.getElementById('header-user-role-icon');

        if (roleEl) {
            roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            if (role.toLowerCase() === 'manager') {
                roleEl.className = 'text-sm font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200';
                if (roleIconEl) roleIconEl.className = 'fas fa-user-tie text-blue-500 text-sm';
            } else {
                roleEl.className = 'text-sm font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200';
                if (roleIconEl) roleIconEl.className = 'fas fa-user-shield text-emerald-500 text-sm';
            }
        }
    }

    private renderPermissionDenied() {
        const container = document.getElementById('dashboard-content');
        if (container) {
            container.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 shadow-sm max-w-2xl mx-auto mt-12 fade-in">
                    <div class="p-6 bg-red-50 text-red-500 rounded-full h-24 w-24 flex items-center justify-center border border-red-100">
                        <i class="fas fa-user-lock text-4xl"></i>
                    </div>
                    <div class="space-y-2">
                        <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight">Access Denied</h2>
                        <p class="text-slate-500 text-sm">
                            You do not have the required permissions to view Business Intelligence and Sales Analytics. This section is restricted to Administrators and Management roles only.
                        </p>
                    </div>
                    <a href="/dashboard" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm transition-all active:scale-95">
                        <i class="fas fa-arrow-left"></i>
                        <span>Back to Dashboard</span>
                    </a>
                </div>
            `;
        }
    }

    private setupEventListeners() {
        // Date range button clicks
        const dateButtons = document.querySelectorAll('.btn-date-filter');
        const customDateContainer = document.getElementById('custom-date-container');

        dateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                dateButtons.forEach(b => b.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-650 hover:bg-slate-100');
                btn.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white';

                const range = btn.getAttribute('data-range') || 'thismonth';
                this.filters.dateRange = range;

                if (range === 'custom') {
                    customDateContainer?.classList.remove('hidden');
                    customDateContainer?.classList.add('flex');
                } else {
                    customDateContainer?.classList.add('hidden');
                    customDateContainer?.classList.remove('flex');
                    this.fetchData();
                }
            });
        });

        // Apply custom date range
        document.getElementById('btn-apply-custom-date')?.addEventListener('click', () => {
            const start = (document.getElementById('filter-start-date') as HTMLInputElement).value;
            const end = (document.getElementById('filter-end-date') as HTMLInputElement).value;

            if (!start || !end) {
                if (typeof showAlert === 'function') showAlert('Please select both start and end dates.');
                else alert('Please select both start and end dates.');
                return;
            }

            this.filters.startDate = start;
            this.filters.endDate = end;
            this.fetchData();
        });

        // Advanced filter selects changes
        const setupFilterSelect = (id: string, key: string) => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                (this.filters as any)[key] = (e.target as HTMLSelectElement).value;
                this.fetchData();
            });
        };

        setupFilterSelect('filter-customer', 'customer');
        setupFilterSelect('filter-salesperson', 'salesperson');
        setupFilterSelect('filter-product', 'product');
        setupFilterSelect('filter-category', 'category');
        setupFilterSelect('filter-branch', 'branch');
        setupFilterSelect('filter-status', 'status');

        // Reset filters in empty state
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Table Pagination Buttons
        const bindPagination = (id: string, type: 'customers' | 'products' | 'salespersons') => {
            const pagPanel = document.getElementById(id);
            if (!pagPanel) return;

            pagPanel.querySelector('.btn-prev')?.addEventListener('click', () => {
                if (this.tableState[type].page > 1) {
                    this.tableState[type].page--;
                    this.renderTable(type);
                }
            });

            pagPanel.querySelector('.btn-next')?.addEventListener('click', () => {
                const totalPages = Math.ceil(this.tableState[type].data.length / this.tableState[type].pageSize);
                if (this.tableState[type].page < totalPages) {
                    this.tableState[type].page++;
                    this.renderTable(type);
                }
            });
        };

        bindPagination('pag-customers', 'customers');
        bindPagination('pag-products', 'products');
        bindPagination('pag-salespersons', 'salespersons');

        // Export Actions
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
            window.print();
        });
        document.getElementById('btn-export-csv')?.addEventListener('click', () => {
            this.exportData('csv');
        });
        document.getElementById('btn-export-excel')?.addEventListener('click', () => {
            this.exportData('excel');
        });
    }

    private resetFilters() {
        this.filters = {
            dateRange: 'thismonth',
            startDate: '',
            endDate: '',
            customer: '',
            salesperson: '',
            product: '',
            category: '',
            branch: '',
            status: ''
        };

        // Reset Select elements
        const resetSelect = (id: string) => {
            const el = document.getElementById(id) as HTMLSelectElement;
            if (el) el.value = '';
        };
        resetSelect('filter-customer');
        resetSelect('filter-salesperson');
        resetSelect('filter-product');
        resetSelect('filter-category');
        resetSelect('filter-branch');
        resetSelect('filter-status');

        // Date buttons
        const dateButtons = document.querySelectorAll('.btn-date-filter');
        dateButtons.forEach(btn => {
            const range = btn.getAttribute('data-range');
            if (range === 'thismonth') {
                btn.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white';
            } else {
                btn.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-650 hover:bg-slate-100';
            }
        });

        // Hide custom date range
        document.getElementById('custom-date-container')?.classList.add('hidden');

        this.fetchData();
    }

    private async loadFiltersOptions() {
        try {
            if (typeof analyticsApi === 'undefined') return;
            const res = await analyticsApi.getFiltersOptions();

            const populateSelect = (id: string, options: { id: string; name: string }[]) => {
                const select = document.getElementById(id) as HTMLSelectElement;
                if (!select) return;
                
                // Clear all but first option
                select.innerHTML = select.options[0].outerHTML;
                
                options.forEach(opt => {
                    const el = document.createElement('option');
                    el.value = opt.id;
                    el.textContent = opt.name;
                    select.appendChild(el);
                });
            };

            populateSelect('filter-customer', res.customers || []);
            populateSelect('filter-salesperson', res.salespersons || []);
            populateSelect('filter-product', res.products || []);
            populateSelect('filter-category', res.categories || []);
            populateSelect('filter-branch', res.branches || []);
            populateSelect('filter-status', res.statuses || []);

        } catch (err) {
            console.error('Failed to populate dropdown options:', err);
        }
    }

    private showSkeletons() {
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');

        // KPIs
        const vals = ['val-revenue', 'val-orders', 'val-quotations', 'val-conversion', 'val-aov', 'val-gross-profit', 'val-net-profit', 'val-growth', 'val-new-customers', 'val-returning-customers'];
        vals.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<span class="inline-block skeleton w-16 h-5 rounded mt-0.5"></span>`;
        });

        // Insights grid
        const insightsGrid = document.getElementById('insights-grid');
        if (insightsGrid) {
            insightsGrid.innerHTML = `
                <div class="skeleton h-16 rounded-xl"></div>
                <div class="skeleton h-16 rounded-xl"></div>
                <div class="skeleton h-16 rounded-xl"></div>
                <div class="skeleton h-16 rounded-xl"></div>
            `;
        }

        // Tables
        const tableBodyIds = ['table-customers-rows', 'table-products-rows', 'table-salespersons-rows'];
        tableBodyIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `
                    <tr><td colspan="5" class="py-3"><div class="skeleton h-16 rounded-xl w-full"></div></td></tr>
                `;
            }
        });

        // Comparison Table
        const compBody = document.getElementById('comparison-rows');
        if (compBody) {
            compBody.innerHTML = `
                <tr class="border-b border-slate-50"><td class="py-3" colspan="4"><div class="skeleton h-6 rounded"></div></td></tr>
                <tr class="border-b border-slate-50"><td class="py-3" colspan="4"><div class="skeleton h-6 rounded"></div></td></tr>
            `;
        }

        // Charts containers
        const chartIds = ['chart-monthly-revenue', 'chart-daily-sales', 'chart-category', 'chart-products', 'chart-salesperson', 'chart-customer', 'chart-funnel', 'chart-revenue-vs-profit', 'chart-payment-status', 'chart-monthly-growth', 'heatmap-container', 'chart-forecast'];
        chartIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `<div class="skeleton h-full w-full rounded-xl"></div>`;
            }
        });

        // Forecast values
        const fcVals = ['val-forecast-revenue', 'val-forecast-orders', 'val-forecast-growth'];
        fcVals.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<span class="inline-block skeleton w-20 h-6 rounded"></span>`;
        });
    }

    private async fetchData() {
        this.showSkeletons();

        try {
            if (typeof analyticsApi === 'undefined') return;
            const data = await analyticsApi.getSalesData(this.filters);
            this.rawData = data;

            // Check if no invoices are retrieved
            if (data.kpis.revenue.current === 0 && data.kpis.orders.current === 0) {
                this.renderEmptyState();
                return;
            }

            this.renderDashboard(data);

        } catch (err) {
            console.error('Failed to retrieve Sales Analytics data:', err);
            document.getElementById('error-banner')?.classList.remove('hidden');
        }
    }

    private renderEmptyState() {
        // Hide all normal sections
        document.getElementById('empty-state')?.classList.remove('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');
    }

    private renderDashboard(data: any) {
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');

        // 1. Render KPIs
        this.renderKPICard('revenue', data.kpis.revenue.current, data.kpis.revenue.previous, '₹', true);
        this.renderKPICard('orders', data.kpis.orders.current, data.kpis.orders.previous, '', false);
        this.renderKPICard('quotations', data.kpis.quotations.current, data.kpis.quotations.previous, '', false);
        this.renderKPICard('conversion', data.kpis.conversionRate.current, data.kpis.conversionRate.previous, '%', false, true);
        this.renderKPICard('aov', data.kpis.aov.current, data.kpis.aov.previous, '₹', true);
        this.renderKPICard('gross-profit', data.kpis.grossProfit.current, data.kpis.grossProfit.previous, '₹', true);
        this.renderKPICard('net-profit', data.kpis.netProfit.current, data.kpis.netProfit.previous, '₹', true);
        this.renderKPICard('growth', data.kpis.growth.current, data.kpis.growth.previous, '%', false, true);
        this.renderKPICard('new-customers', data.kpis.newCustomers.current, data.kpis.newCustomers.previous, '', false);
        this.renderKPICard('returning-customers', data.kpis.returningCustomers.current, data.kpis.returningCustomers.previous, '', false);

        // 2. Render Insights
        this.renderInsights(data.insights);

        // 3. Render Tables
        this.tableState.customers.data = data.tables.topCustomers || [];
        this.tableState.customers.page = 1;
        this.renderTable('customers');

        this.tableState.products.data = data.tables.topProducts || [];
        this.tableState.products.page = 1;
        this.renderTable('products');

        this.tableState.salespersons.data = data.tables.topSalespersons || [];
        this.tableState.salespersons.page = 1;
        this.renderTable('salespersons');

        // 4. Period Comparisons
        this.renderComparison(data.comparison);

        // 5. Render SVG Charts
        if (typeof chartRenderer !== 'undefined') {
            chartRenderer.renderLineOrAreaChart('chart-monthly-revenue', data.charts.monthlyRevenue.map((d: any) => ({ label: d.month, value: d.revenue })), { isArea: false, label1: 'Revenue' });
            chartRenderer.renderLineOrAreaChart('chart-daily-sales', data.charts.dailySales.map((d: any) => ({ label: d.date, value: d.value })), { isArea: true, label1: 'Sales' });
            chartRenderer.renderBarChart('chart-category', data.charts.salesByCategory, { color: '#4f46e5' });
            chartRenderer.renderHorizontalBarChart('chart-products', data.charts.topSellingProducts, { color: '#0f172a' });
            chartRenderer.renderBarChart('chart-salesperson', data.charts.revenueBySalesperson, { color: '#10b981' });
            chartRenderer.renderPieOrDonutChart('chart-customer', data.charts.salesByCustomer, { isDonut: true });
            chartRenderer.renderFunnelChart('chart-funnel', data.charts.conversionFunnel);
            
            // Revenue vs Profit Combo Line
            chartRenderer.renderLineOrAreaChart('chart-revenue-vs-profit', data.charts.revenueVsProfit.map((d: any) => ({
                label: d.month,
                value: d.revenue,
                value2: d.profit
            })), {
                color1: '#3b82f6',
                color2: '#8b5cf6',
                label1: 'Revenue',
                label2: 'Net Profit'
            });

            chartRenderer.renderPieOrDonutChart('chart-payment-status', data.charts.paymentStatus, { isDonut: false });
            chartRenderer.renderLineOrAreaChart('chart-monthly-growth', data.charts.monthlyGrowth.map((d: any) => ({
                label: d.month,
                value: d.value
            })), { color1: '#ec4899', label1: 'MoM Growth %', unit: '%' });

            // Heatmap
            chartRenderer.renderHeatmap('heatmap-container', data.heatmap);

            // Forecast Chart
            const lastActual = data.forecast.pastHistory[data.forecast.pastHistory.length - 1];
            const predictedPoint = { month: data.forecast.nextMonthName, value: data.forecast.predictedRevenue };
            chartRenderer.renderForecastChart(
                'chart-forecast', 
                data.forecast.pastHistory.map((p: any) => ({ month: p.month, value: p.value })),
                predictedPoint
            );
        }

        // 6. Forecast Cards
        document.getElementById('lbl-forecast-month')!.textContent = `Predicting next month (${data.forecast.nextMonthName})`;
        document.getElementById('val-forecast-revenue')!.textContent = `₹${data.forecast.predictedRevenue.toLocaleString()}`;
        document.getElementById('val-forecast-orders')!.textContent = data.forecast.predictedOrders.toString();
        
        const growthEl = document.getElementById('val-forecast-growth')!;
        growthEl.textContent = `${data.forecast.projectedGrowth >= 0 ? '+' : ''}${data.forecast.projectedGrowth.toFixed(1)}%`;
        if (data.forecast.projectedGrowth >= 0) growthEl.className = 'text-lg font-bold text-emerald-650';
        else growthEl.className = 'text-lg font-bold text-red-650';
    }

    private renderKPICard(id: string, current: number, previous: number, unit: string, isCurrency: boolean, isPct: boolean = false) {
        const valEl = document.getElementById(`val-${id}`);
        const badgeEl = document.getElementById(`badge-${id}`);

        if (!valEl || !badgeEl) return;

        // Render Current Value
        if (isCurrency) {
            valEl.textContent = `₹${Math.round(current).toLocaleString()}`;
        } else if (isPct) {
            valEl.textContent = `${current.toFixed(1)}%`;
        } else {
            valEl.textContent = Math.round(current).toLocaleString();
        }

        // Calculate Percentage Delta
        let delta = 0;
        if (previous > 0) {
            delta = ((current - previous) / previous) * 100;
        } else if (current > 0) {
            delta = 100; // default to 100 if previous was 0 and current is positive
        }

        // Render trend badge
        const deltaFormatted = `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`;
        badgeEl.innerHTML = `<i class="fas ${delta >= 0 ? 'fa-caret-up' : 'fa-caret-down'} mr-0.5"></i>${deltaFormatted}`;

        if (delta >= 0) {
            badgeEl.className = 'flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-emerald-650 bg-emerald-50 border border-emerald-100';
        } else {
            badgeEl.className = 'flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-red-650 bg-red-50 border border-red-100';
        }
    }

    private renderInsights(insights: { text: string; type: string }[]) {
        const grid = document.getElementById('insights-grid');
        if (!grid) return;

        grid.innerHTML = '';
        if (insights.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center text-xs text-slate-400 py-4 font-medium">No business anomalies found in this dataset.</div>
            `;
            return;
        }

        // Take up to 4 insights to maintain clean UI
        insights.slice(0, 4).forEach(insight => {
            const card = document.createElement('div');
            card.className = `flex gap-3 items-start p-3.5 border rounded-xl shadow-xs transition-all hover:scale-[1.01] duration-150`;

            let iconClass = 'fa-info-circle text-blue-500';
            let bgClass = 'bg-blue-50 border-blue-100';

            if (insight.type === 'success') {
                iconClass = 'fa-circle-check text-emerald-600';
                bgClass = 'bg-emerald-50/50 border-emerald-100';
            } else if (insight.type === 'warning') {
                iconClass = 'fa-circle-exclamation text-amber-500';
                bgClass = 'bg-amber-50/50 border-amber-150';
            }

            card.className += ` ${bgClass}`;

            card.innerHTML = `
                <i class="fas ${iconClass} text-sm mt-0.5 flex-shrink-0"></i>
                <span class="text-xs text-slate-700 font-semibold leading-relaxed">${insight.text}</span>
            `;
            grid.appendChild(card);
        });
    }

    private renderComparison(comp: any) {
        const body = document.getElementById('comparison-rows');
        if (!body) return;

        body.innerHTML = '';

        const metrics = [
            { label: 'Revenue Generated', cur: comp.currentMonth.revenue, prev: comp.lastMonth.revenue, unit: '₹', isCurrency: true },
            { label: 'Completed Sales Orders', cur: comp.currentMonth.orders, prev: comp.lastMonth.orders, unit: '', isCurrency: false },
            { label: 'Net Profit Margin', cur: comp.currentMonth.profit, prev: comp.lastMonth.profit, unit: '₹', isCurrency: true },
            { label: 'Acquired New Customers', cur: comp.currentMonth.newCustomers, prev: comp.lastMonth.newCustomers, unit: '', isCurrency: false },
            { label: 'Lead Conversion Rate', cur: comp.currentMonth.conversionRate, prev: comp.lastMonth.conversionRate, unit: '%', isCurrency: false }
        ];

        metrics.forEach(m => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs font-semibold text-slate-700';

            let curVal = '';
            let prevVal = '';

            if (m.isCurrency) {
                curVal = `₹${Math.round(m.cur).toLocaleString()}`;
                prevVal = `₹${Math.round(m.prev).toLocaleString()}`;
            } else {
                curVal = `${m.cur.toFixed(m.unit === '%' ? 1 : 0)}${m.unit}`;
                prevVal = `${m.prev.toFixed(m.unit === '%' ? 1 : 0)}${m.unit}`;
            }

            // Delta
            let pct = 0;
            if (m.prev > 0) pct = ((m.cur - m.prev) / m.prev) * 100;
            else if (m.cur > 0) pct = 100;

            const deltaText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
            const deltaColor = pct >= 0 ? 'text-emerald-600' : 'text-red-500';

            row.innerHTML = `
                <td class="py-3 pr-4 text-slate-800 font-bold">${m.label}</td>
                <td class="py-3 px-4 text-right font-extrabold text-slate-800">${curVal}</td>
                <td class="py-3 px-4 text-right text-slate-500">${prevVal}</td>
                <td class="py-3 pl-4 text-right ${deltaColor} font-extrabold flex items-center justify-end gap-1">
                    <i class="fas ${pct >= 0 ? 'fa-caret-up' : 'fa-caret-down'} text-[10px]"></i>
                    <span>${deltaText}</span>
                </td>
            `;

            body.appendChild(row);
        });
    }

    private renderTable(type: 'customers' | 'products' | 'salespersons') {
        const state = this.tableState[type];
        const tbody = document.getElementById(`table-${type}-rows`);
        const pagControl = document.getElementById(`pag-${type}`);

        if (!tbody || !pagControl) return;

        tbody.innerHTML = '';

        if (state.data.length === 0) {
            const cols = type === 'salespersons' ? 4 : 5;
            tbody.innerHTML = `
                <tr><td colspan="${cols}" class="py-6 text-center text-[10px] text-slate-400 font-semibold">No records matches filters.</td></tr>
            `;
            pagControl.querySelector('span')!.textContent = 'Page 1 of 1';
            return;
        }

        const totalPages = Math.ceil(state.data.length / state.pageSize);
        // clamp page
        if (state.page > totalPages) state.page = totalPages;
        if (state.page < 1) state.page = 1;

        const startIdx = (state.page - 1) * state.pageSize;
        const endIdx = startIdx + state.pageSize;
        const pageData = state.data.slice(startIdx, endIdx);

        pageData.forEach((row: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-150 hover:bg-slate-50 transition-colors text-[10px] font-bold text-slate-600';

            if (type === 'customers') {
                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.customer}</td>
                    <td class="py-2.5 px-2 text-right">${row.orders}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.revenue).toLocaleString()}</td>
                    <td class="py-2.5 px-2 text-right text-emerald-650">₹${Math.round(row.profit).toLocaleString()}</td>
                    <td class="py-2.5 pl-2 text-right text-red-650">₹${Math.round(row.outstanding).toLocaleString()}</td>
                `;
            } else if (type === 'products') {
                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.product.length > 20 ? row.product.slice(0, 18) + '..' : row.product}</td>
                    <td class="py-2.5 px-2 text-right">${row.quantitySold}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.revenue).toLocaleString()}</td>
                    <td class="py-2.5 px-2 text-right text-emerald-650">₹${Math.round(row.profit).toLocaleString()}</td>
                    <td class="py-2.5 pl-2 text-right ${row.stockRemaining <= 5 ? 'text-rose-600 font-black' : 'text-slate-500'}">${row.stockRemaining}</td>
                `;
            } else if (type === 'salespersons') {
                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.name}</td>
                    <td class="py-2.5 px-2 text-right">${row.orders}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.revenue).toLocaleString()}</td>
                    <td class="py-2.5 pl-2 text-right text-blue-600">${row.conversionRate.toFixed(0)}%</td>
                `;
            }

            tbody.appendChild(tr);
        });

        // Update pag controls
        pagControl.querySelector('span')!.textContent = `Page ${state.page} of ${totalPages || 1}`;

        // Disable/enable buttons
        const prevBtn = pagControl.querySelector('.btn-prev') as HTMLButtonElement;
        const nextBtn = pagControl.querySelector('.btn-next') as HTMLButtonElement;

        if (prevBtn) prevBtn.disabled = state.page === 1;
        if (nextBtn) nextBtn.disabled = state.page === totalPages || totalPages === 0;

        // Visual opacity for disabled states
        if (prevBtn) prevBtn.style.opacity = state.page === 1 ? '0.4' : '1.0';
        if (nextBtn) nextBtn.style.opacity = state.page === totalPages || totalPages === 0 ? '0.4' : '1.0';
    }

    private exportData(format: 'csv' | 'excel') {
        if (!this.rawData) {
            alert('No data available to export.');
            return;
        }

        let content = '';
        let filename = `sales_analytics_${new Date().toISOString().slice(0,10)}`;

        if (format === 'csv' || format === 'excel') {
            // Summary lines
            content += `"SALES ANALYTICS REPORT - SHRESHT SYSTEMS"\n`;
            content += `"Generated At", "${new Date().toLocaleString()}"\n`;
            content += `"Active Range Filter", "${this.filters.dateRange}"\n\n`;

            content += `"SUMMARY PERFORMANCE KEY METRICS (KPIs)"\n`;
            content += `"Metric", "Current Period", "Previous Period", "Growth"\n`;
            
            const k = this.rawData.kpis;
            const getGrowth = (c: number, p: number) => p > 0 ? `${((c - p) / p * 100).toFixed(0)}%` : '0%';

            content += `"Total Revenue", "₹${Math.round(k.revenue.current)}", "₹${Math.round(k.revenue.previous)}", "${getGrowth(k.revenue.current, k.revenue.previous)}"\n`;
            content += `"Total Sales Orders", "${k.orders.current}", "${k.orders.previous}", "${getGrowth(k.orders.current, k.orders.previous)}"\n`;
            content += `"Lead Quotations Count", "${k.quotations.current}", "${k.quotations.previous}", "${getGrowth(k.quotations.current, k.quotations.previous)}"\n`;
            content += `"Quote Conversion %", "${k.conversionRate.current.toFixed(1)}%", "${k.conversionRate.previous.toFixed(1)}%", "${getGrowth(k.conversionRate.current, k.conversionRate.previous)}"\n`;
            content += `"Average Order Value (AOV)", "₹${Math.round(k.aov.current)}", "₹${Math.round(k.aov.previous)}", "${getGrowth(k.aov.current, k.aov.previous)}"\n`;
            content += `"Net Profit (Est.)", "₹${Math.round(k.netProfit.current)}", "₹${Math.round(k.netProfit.previous)}", "${getGrowth(k.netProfit.current, k.netProfit.previous)}"\n\n`;

            // Top Customers Table
            content += `"TOP PERFORMING CUSTOMERS"\n`;
            content += `"Customer Name", "Sales Orders", "Total Revenue (₹)", "Net Profit (₹)", "Outstanding Balance (₹)"\n`;
            this.tableState.customers.data.forEach(c => {
                content += `"${c.customer}", "${c.orders}", "${Math.round(c.revenue)}", "${Math.round(c.profit)}", "${Math.round(c.outstanding)}"\n`;
            });
            content += `\n`;

            // Top Products Table
            content += `"TOP SELLING PRODUCTS"\n`;
            content += `"Product Description", "Quantity Sold", "Total Revenue (₹)", "Estimated Profit (₹)", "Stock Remaining"\n`;
            this.tableState.products.data.forEach(p => {
                content += `"${p.product}", "${p.quantitySold}", "${Math.round(p.revenue)}", "${Math.round(p.profit)}", "${p.stockRemaining}"\n`;
            });
            content += `\n`;

            // Top Salespersons Table
            content += `"SALESPERSONS PERFORMANCE RANKING"\n`;
            content += `"Salesperson Name", "Closed Orders", "Total Revenue (₹)", "Conversion Rate (%)"\n`;
            this.tableState.salespersons.data.forEach(sp => {
                content += `"${sp.name}", "${sp.orders}", "${Math.round(sp.revenue)}", "${sp.conversionRate.toFixed(1)}%"\n`;
            });

            filename += format === 'excel' ? '.csv' : '.csv';
        }

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

declare var salesAnalyticsUI: any;
(window as any).salesAnalyticsUI = new SalesAnalyticsUI();
