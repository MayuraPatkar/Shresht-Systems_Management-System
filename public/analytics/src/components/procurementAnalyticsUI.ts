/**
 * Procurement Analytics UI Controller and Logic
 */

declare var analyticsApi: any;
declare var chartRenderer: any;
declare function showAlert(message: string): void;

class ProcurementAnalyticsUI {
    private filters = {
        dateRange: 'thismonth',
        startDate: '',
        endDate: '',
        supplier: '',
        product: '',
        category: '',
        status: '',
        branch: '',
        warehouse: '',
        buyer: ''
    };

    // Table pagination state
    private tableState = {
        suppliers: { data: [] as any[], page: 1, pageSize: 5 },
        products: { data: [] as any[], page: 1, pageSize: 5 },
        recent: { data: [] as any[], page: 1, pageSize: 5 }
    };

    // Cached response data for exports
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
                            You do not have the required permissions to view Procurement Analytics reports. This section is restricted to Administrators and Management roles only.
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

        setupFilterSelect('filter-supplier', 'supplier');
        setupFilterSelect('filter-product', 'product');
        setupFilterSelect('filter-category', 'category');
        setupFilterSelect('filter-status', 'status');
        setupFilterSelect('filter-branch', 'branch');
        setupFilterSelect('filter-warehouse', 'warehouse');
        setupFilterSelect('filter-buyer', 'buyer');

        // Reset filters in empty state
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Table Pagination Buttons
        const bindPagination = (id: string, type: 'suppliers' | 'products' | 'recent') => {
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

        bindPagination('pag-suppliers', 'suppliers');
        bindPagination('pag-products', 'products');
        bindPagination('pag-recent', 'recent');

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
            supplier: '',
            product: '',
            category: '',
            status: '',
            branch: '',
            warehouse: '',
            buyer: ''
        };

        const resetSelect = (id: string) => {
            const el = document.getElementById(id) as HTMLSelectElement;
            if (el) el.value = '';
        };
        resetSelect('filter-supplier');
        resetSelect('filter-product');
        resetSelect('filter-category');
        resetSelect('filter-status');
        resetSelect('filter-branch');
        resetSelect('filter-warehouse');
        resetSelect('filter-buyer');

        const dateButtons = document.querySelectorAll('.btn-date-filter');
        dateButtons.forEach(btn => {
            const range = btn.getAttribute('data-range');
            if (range === 'thismonth') {
                btn.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white';
            } else {
                btn.className = 'btn-date-filter px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-650 hover:bg-slate-100';
            }
        });

        document.getElementById('custom-date-container')?.classList.add('hidden');
        this.fetchData();
    }

    private async loadFiltersOptions() {
        try {
            if (typeof analyticsApi === 'undefined') return;
            const res = await analyticsApi.getProcurementFiltersOptions();

            const populateSelect = (id: string, options: { id: string; name: string }[]) => {
                const select = document.getElementById(id) as HTMLSelectElement;
                if (!select) return;
                
                select.innerHTML = select.options[0].outerHTML;
                options.forEach(opt => {
                    const el = document.createElement('option');
                    el.value = opt.id;
                    el.textContent = opt.name;
                    select.appendChild(el);
                });
            };

            populateSelect('filter-supplier', res.suppliers || []);
            populateSelect('filter-product', res.products || []);
            populateSelect('filter-category', res.categories || []);
            populateSelect('filter-branch', res.branches || []);
            populateSelect('filter-warehouse', res.warehouses || []);
            populateSelect('filter-buyer', res.buyers || []);

        } catch (err) {
            console.error('Failed to populate dropdown options:', err);
        }
    }

    private showSkeletons() {
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');

        // KPIs
        const vals = [
            'val-purchase-value', 'val-purchase-orders', 'val-avg-purchase-cost', 'val-active-suppliers', 'val-pending-orders',
            'val-completed-orders', 'val-avg-delivery-time', 'val-purchase-growth', 'val-procurement-savings', 'val-supplier-otd'
        ];
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

        // Warning alerts
        const boxOut = document.getElementById('box-out-stock');
        const boxNear = document.getElementById('box-near-reorder');
        const valReplenish = document.getElementById('val-replenish-cost');
        if (boxOut) boxOut.innerHTML = `<div class="skeleton h-4 rounded w-full"></div><div class="skeleton h-4 rounded w-4/5 mt-1"></div>`;
        if (boxNear) boxNear.innerHTML = `<div class="skeleton h-4 rounded w-full"></div><div class="skeleton h-4 rounded w-4/5 mt-1"></div>`;
        if (valReplenish) valReplenish.innerHTML = `<span class="inline-block skeleton w-24 h-6 rounded"></span>`;

        // Tables
        const tableBodyIds = ['table-suppliers-rows', 'table-products-rows', 'table-recent-rows'];
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

        // Charts
        const chartIds = [
            'chart-monthly-purchase', 'chart-daily-pos', 'chart-category', 'chart-cost-distribution', 'chart-supplier-value',
            'chart-top-products', 'chart-po-status', 'chart-cost-vs-budget', 'chart-monthly-growth', 'chart-supplier-delivery',
            'heatmap-container', 'chart-forecast'
        ];
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
            const data = await analyticsApi.getProcurementData(this.filters);
            this.rawData = data;

            // Check if no invoices/purchases are retrieved
            if (data.kpis.purchaseValue.current === 0 && data.kpis.purchaseOrders.current === 0) {
                this.renderEmptyState();
                return;
            }

            this.renderDashboard(data);

        } catch (err) {
            console.error('Failed to retrieve Procurement Analytics data:', err);
            document.getElementById('error-banner')?.classList.remove('hidden');
        }
    }

    private renderEmptyState() {
        document.getElementById('empty-state')?.classList.remove('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');
    }

    private renderDashboard(data: any) {
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('error-banner')?.classList.add('hidden');

        // 1. Render KPIs
        this.renderKPICard('purchase-value', data.kpis.purchaseValue.current, data.kpis.purchaseValue.previous, '₹', true);
        this.renderKPICard('purchase-orders', data.kpis.purchaseOrders.current, data.kpis.purchaseOrders.previous, '', false);
        this.renderKPICard('avg-purchase-cost', data.kpis.avgPurchaseCost.current, data.kpis.avgPurchaseCost.previous, '₹', true);
        this.renderKPICard('active-suppliers', data.kpis.activeSuppliers.current, data.kpis.activeSuppliers.previous, '', false);
        this.renderKPICard('pending-orders', data.kpis.pendingPOs.current, data.kpis.pendingPOs.previous, '', false);
        this.renderKPICard('completed-orders', data.kpis.completedPOs.current, data.kpis.completedPOs.previous, '', false);
        
        // Avg Delivery Lead Time Card (Lower lead time is better, so downward trend is green)
        this.renderKPICard('avg-delivery-time', data.kpis.avgDeliveryTime.current, data.kpis.avgDeliveryTime.previous, ' days', false, true, true);
        
        this.renderKPICard('purchase-growth', data.kpis.purchaseGrowth.current, data.kpis.purchaseGrowth.previous, '%', false, true);
        this.renderKPICard('procurement-savings', data.kpis.procurementSavings.current, data.kpis.procurementSavings.previous, '₹', true);
        this.renderKPICard('supplier-otd', data.kpis.supplierOTD.current, data.kpis.supplierOTD.previous, '%', false, true);

        // 2. Render Reorder Alerts
        this.renderReorderAlerts(data.reorder);

        // 3. Render Insights
        this.renderInsights(data.insights);

        // 4. Render Tables
        this.tableState.suppliers.data = data.tables.topSuppliers || [];
        this.tableState.suppliers.page = 1;
        this.renderTable('suppliers');

        this.tableState.products.data = data.tables.topProducts || [];
        this.tableState.products.page = 1;
        this.renderTable('products');

        this.tableState.recent.data = data.tables.recentPOs || [];
        this.tableState.recent.page = 1;
        this.renderTable('recent');

        // 5. Period Comparisons
        this.renderComparison(data.comparison);

        // 6. Render SVG Charts
        if (typeof chartRenderer !== 'undefined') {
            chartRenderer.renderLineOrAreaChart('chart-monthly-purchase', data.charts.monthlyPurchase, { isArea: false, label1: 'Purchase Value' });
            chartRenderer.renderLineOrAreaChart('chart-daily-pos', data.charts.dailyPOs, { isArea: true, label1: 'Spending Value' });
            chartRenderer.renderBarChart('chart-category', data.charts.purchaseByCategory, { color: '#6366f1' });
            chartRenderer.renderPieOrDonutChart('chart-cost-distribution', data.charts.costDistribution, { isDonut: true });
            chartRenderer.renderHorizontalBarChart('chart-supplier-value', data.charts.supplierPurchaseValue, { color: '#0ea5e9' });
            chartRenderer.renderBarChart('chart-top-products', data.charts.topProducts, { color: '#4f46e5' });
            chartRenderer.renderPieOrDonutChart('chart-po-status', data.charts.poStatus, { isDonut: false });
            
            // Spend vs Budget Line
            chartRenderer.renderLineOrAreaChart('chart-cost-vs-budget', data.charts.costVsBudget.map((d: any) => ({
                label: d.month,
                value: d.value,
                value2: d.value2
            })), {
                color1: '#4f46e5',
                color2: '#e2e8f0',
                label1: 'Actual Spend',
                label2: 'Allocated Budget'
            });

            chartRenderer.renderLineOrAreaChart('chart-monthly-growth', data.charts.monthlyGrowth.map((d: any) => ({
                label: d.month,
                value: d.value
            })), { color1: '#ec4899', label1: 'MoM Growth %', unit: '%' });

            chartRenderer.renderBarChart('chart-supplier-delivery', data.charts.supplierDelivery, { color: '#10b981', unit: '%' });

            // Heatmap
            chartRenderer.renderHeatmap('heatmap-container', data.heatmap);

            // Forecast Chart
            const lastActual = data.forecast.pastHistory[data.forecast.pastHistory.length - 1];
            const predictedPoint = { month: data.forecast.nextMonthName, value: data.forecast.predictedValue };
            chartRenderer.renderForecastChart(
                'chart-forecast', 
                data.forecast.pastHistory.map((p: any) => ({ month: p.month, value: p.value })),
                predictedPoint,
                { color: '#6366f1' }
            );
        }

        // 7. Forecast Cards
        document.getElementById('lbl-forecast-month')!.textContent = `Predicting next month (${data.forecast.nextMonthName})`;
        document.getElementById('val-forecast-revenue')!.textContent = `₹${data.forecast.predictedValue.toLocaleString()}`;
        document.getElementById('val-forecast-orders')!.textContent = data.forecast.expectedOrders.toString();
        
        const growthEl = document.getElementById('val-forecast-growth')!;
        growthEl.textContent = `${data.forecast.projectedGrowth >= 0 ? '+' : ''}${data.forecast.projectedGrowth.toFixed(1)}%`;
        if (data.forecast.projectedGrowth >= 0) growthEl.className = 'text-lg font-bold text-emerald-650';
        else growthEl.className = 'text-lg font-bold text-red-650';
    }

    private renderKPICard(id: string, current: number, previous: number, unit: string, isCurrency: boolean, isPct: boolean = false, invertTrend: boolean = false) {
        const valEl = document.getElementById(`val-${id}`);
        const badgeEl = document.getElementById(`badge-${id}`);

        if (!valEl || !badgeEl) return;

        // Render Current Value
        if (isCurrency) {
            valEl.textContent = `₹${Math.round(current).toLocaleString()}`;
        } else if (isPct) {
            valEl.textContent = `${current.toFixed(1)}%`;
        } else {
            valEl.textContent = current.toFixed(id === 'avg-delivery-time' ? 1 : 0) + unit;
        }

        // Calculate Percentage Delta
        let delta = 0;
        if (previous > 0) {
            delta = ((current - previous) / previous) * 100;
        } else if (current > 0) {
            delta = 100;
        }

        const deltaFormatted = `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`;
        badgeEl.innerHTML = `<i class="fas ${delta >= 0 ? 'fa-caret-up' : 'fa-caret-down'} mr-0.5"></i>${deltaFormatted}`;

        // Color arrow trend
        let isGood = delta >= 0;
        if (invertTrend) {
            isGood = delta <= 0; // lower lead delivery time is better
        }

        if (isGood) {
            badgeEl.className = 'flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-emerald-650 bg-emerald-50 border border-emerald-100';
        } else {
            badgeEl.className = 'flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-red-650 bg-red-50 border border-red-100';
        }
    }

    private renderReorderAlerts(alerts: any) {
        const boxOut = document.getElementById('box-out-stock');
        const boxNear = document.getElementById('box-near-reorder');
        const valReplenish = document.getElementById('val-replenish-cost');

        if (valReplenish) {
            valReplenish.textContent = `₹${Math.round(alerts.replenishmentCostEstimate).toLocaleString()}`;
        }

        if (boxOut) {
            boxOut.innerHTML = '';
            if (alerts.outOfStock.length === 0) {
                boxOut.innerHTML = `<div class="text-[10px] text-slate-400 font-semibold py-1">All stock codes are positive.</div>`;
            } else {
                alerts.outOfStock.slice(0, 3).forEach((item: any) => {
                    const row = document.createElement('div');
                    row.className = 'flex justify-between items-center text-[10px] text-slate-700 font-semibold';
                    row.innerHTML = `
                        <span class="truncate pr-2">${item.name}</span>
                        <span class="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold border border-red-100">Out of Stock</span>
                    `;
                    boxOut.appendChild(row);
                });
            }
        }

        if (boxNear) {
            boxNear.innerHTML = '';
            if (alerts.nearReorder.length === 0) {
                boxNear.innerHTML = `<div class="text-[10px] text-slate-400 font-semibold py-1">No items near warning levels.</div>`;
            } else {
                alerts.nearReorder.slice(0, 3).forEach((item: any) => {
                    const row = document.createElement('div');
                    row.className = 'flex justify-between items-center text-[10px] text-slate-700 font-semibold';
                    row.innerHTML = `
                        <span class="truncate pr-2">${item.name}</span>
                        <span class="text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">${item.stock} left (Min ${item.min})</span>
                    `;
                    boxNear.appendChild(row);
                });
            }
        }
    }

    private renderInsights(insights: { text: string; type: string }[]) {
        const grid = document.getElementById('insights-grid');
        if (!grid) return;

        grid.innerHTML = '';
        if (insights.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center text-xs text-slate-400 py-4 font-medium">No business alerts found.</div>
            `;
            return;
        }

        insights.slice(0, 4).forEach(insight => {
            const card = document.createElement('div');
            card.className = `flex gap-3 items-start p-3.5 border rounded-xl shadow-xs transition-all hover:scale-[1.01] duration-155`;

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
            { label: 'Purchase Spending Value', cur: comp.currentMonth.value, prev: comp.lastMonth.value, unit: '₹', isCurrency: true },
            { label: 'Issued Purchase Orders', cur: comp.currentMonth.orders, prev: comp.lastMonth.orders, unit: '', isCurrency: false },
            { label: 'Average Cost per Order', cur: comp.currentMonth.avgCost, prev: comp.lastMonth.avgCost, unit: '₹', isCurrency: true },
            { label: 'Purchasing Suppliers Count', cur: comp.currentMonth.suppliers, prev: comp.lastMonth.suppliers, unit: '', isCurrency: false },
            { label: 'Average Delivery Lead Days', cur: comp.currentMonth.deliveryTime, prev: comp.lastMonth.deliveryTime, unit: ' days', isCurrency: false, invert: true },
            { label: 'Procurement Negotiations Savings', cur: comp.currentMonth.savings, prev: comp.lastMonth.savings, unit: '₹', isCurrency: true }
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
                curVal = m.cur.toFixed(m.unit.includes('days') ? 1 : 0) + m.unit;
                prevVal = m.prev.toFixed(m.unit.includes('days') ? 1 : 0) + m.unit;
            }

            // Delta
            let pct = 0;
            if (m.prev > 0) pct = ((m.cur - m.prev) / m.prev) * 100;
            else if (m.cur > 0) pct = 100;

            const deltaText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
            
            let isGood = pct >= 0;
            if (m.invert) {
                isGood = pct <= 0; // lower lead delivery days is better
            }
            const deltaColor = isGood ? 'text-emerald-600' : 'text-red-500';

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

    private renderTable(type: 'suppliers' | 'products' | 'recent') {
        const state = this.tableState[type];
        const tbody = document.getElementById(`table-${type}-rows`);
        const pagControl = document.getElementById(`pag-${type}`);

        if (!tbody || !pagControl) return;

        tbody.innerHTML = '';

        if (state.data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5" class="py-6 text-center text-[10px] text-slate-400 font-semibold">No records matches filters.</td></tr>
            `;
            pagControl.querySelector('span')!.textContent = 'Page 1 of 1';
            return;
        }

        const totalPages = Math.ceil(state.data.length / state.pageSize);
        if (state.page > totalPages) state.page = totalPages;
        if (state.page < 1) state.page = 1;

        const startIdx = (state.page - 1) * state.pageSize;
        const endIdx = startIdx + state.pageSize;
        const pageData = state.data.slice(startIdx, endIdx);

        pageData.forEach((row: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-150 hover:bg-slate-50 transition-colors text-[10px] font-bold text-slate-600';

            if (type === 'suppliers') {
                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.supplier}</td>
                    <td class="py-2.5 px-2 text-right">${row.purchaseOrders}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.purchaseValue).toLocaleString()}</td>
                    <td class="py-2.5 px-2 text-right">${row.averageDeliveryTime} days</td>
                    <td class="py-2.5 pl-2 text-right text-emerald-650 font-black"><i class="fas fa-star text-amber-500 mr-0.5"></i>${row.rating}</td>
                `;
            } else if (type === 'products') {
                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.product.length > 20 ? row.product.slice(0, 18) + '..' : row.product}</td>
                    <td class="py-2.5 px-2 text-right">${row.purchaseQuantity}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.purchaseCost).toLocaleString()}</td>
                    <td class="py-2.5 px-2 text-right text-slate-500">${row.supplier.length > 12 ? row.supplier.slice(0, 10) + '..' : row.supplier}</td>
                    <td class="py-2.5 pl-2 text-right ${row.stockRemaining <= row.reorderLevel ? 'text-rose-600 font-black' : 'text-slate-500'}">${row.stockRemaining} (Min ${row.reorderLevel})</td>
                `;
            } else if (type === 'recent') {
                let statusColor = 'text-slate-500 bg-slate-50 border-slate-100';
                if (row.status === 'Received') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                else if (row.status === 'Cancelled' || row.status === 'Rejected') statusColor = 'text-rose-700 bg-rose-50 border-rose-100';
                else if (row.status === 'Shipped') statusColor = 'text-blue-700 bg-blue-50 border-blue-100';
                else if (row.status === 'Issued/Sent') statusColor = 'text-amber-700 bg-amber-50 border-amber-100';

                tr.innerHTML = `
                    <td class="py-2.5 pr-2 font-extrabold text-slate-800">${row.poNumber}</td>
                    <td class="py-2.5 px-2 text-right font-semibold text-slate-700">${row.supplier}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-slate-800">₹${Math.round(row.amount).toLocaleString()}</td>
                    <td class="py-2.5 pl-2 text-right">
                        <span class="inline-block px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${statusColor}">${row.status}</span>
                    </td>
                `;
            }

            tbody.appendChild(tr);
        });

        pagControl.querySelector('span')!.textContent = `Page ${state.page} of ${totalPages || 1}`;

        const prevBtn = pagControl.querySelector('.btn-prev') as HTMLButtonElement;
        const nextBtn = pagControl.querySelector('.btn-next') as HTMLButtonElement;

        if (prevBtn) prevBtn.disabled = state.page === 1;
        if (nextBtn) nextBtn.disabled = state.page === totalPages || totalPages === 0;

        if (prevBtn) prevBtn.style.opacity = state.page === 1 ? '0.4' : '1.0';
        if (nextBtn) nextBtn.style.opacity = state.page === totalPages || totalPages === 0 ? '0.4' : '1.0';
    }

    private exportData(format: 'csv' | 'excel') {
        if (!this.rawData) {
            alert('No data available to export.');
            return;
        }

        let content = '';
        let filename = `procurement_analytics_${new Date().toISOString().slice(0,10)}`;

        if (format === 'csv' || format === 'excel') {
            content += `"PROCUREMENT ANALYTICS REPORT - SHRESHT SYSTEMS"\n`;
            content += `"Generated At", "${new Date().toLocaleString()}"\n`;
            content += `"Active Range Filter", "${this.filters.dateRange}"\n\n`;

            content += `"SUMMARY PERFORMANCE KEY METRICS (KPIs)"\n`;
            content += `"Metric", "Current Period", "Previous Period", "Growth"\n`;
            
            const k = this.rawData.kpis;
            const getGrowth = (c: number, p: number) => p > 0 ? `${((c - p) / p * 100).toFixed(0)}%` : '0%';

            content += `"Total Purchases Value", "₹${Math.round(k.purchaseValue.current)}", "₹${Math.round(k.purchaseValue.previous)}", "${getGrowth(k.purchaseValue.current, k.purchaseValue.previous)}"\n`;
            content += `"Total Purchase Orders", "${k.purchaseOrders.current}", "${k.purchaseOrders.previous}", "${getGrowth(k.purchaseOrders.current, k.purchaseOrders.previous)}"\n`;
            content += `"Average Cost per Order", "₹${Math.round(k.avgPurchaseCost.current)}", "₹${Math.round(k.avgPurchaseCost.previous)}", "${getGrowth(k.avgPurchaseCost.current, k.avgPurchaseCost.previous)}"\n`;
            content += `"Active Suppliers Count", "${k.activeSuppliers.current}", "${k.activeSuppliers.previous}", "${getGrowth(k.activeSuppliers.current, k.activeSuppliers.previous)}"\n`;
            content += `"Pending POs", "${k.pendingPOs.current}", "${k.pendingPOs.previous}", "${getGrowth(k.pendingPOs.current, k.pendingPOs.previous)}"\n`;
            content += `"Completed POs", "${k.completedPOs.current}", "${k.completedPOs.previous}", "${getGrowth(k.completedPOs.current, k.completedPOs.previous)}"\n`;
            content += `"Average Lead Time", "${k.avgDeliveryTime.current.toFixed(1)} days", "${k.avgDeliveryTime.previous.toFixed(1)} days", "${getGrowth(k.avgDeliveryTime.current, k.avgDeliveryTime.previous)}"\n`;
            content += `"Negotiated Savings (Est)", "₹${Math.round(k.procurementSavings.current)}", "₹${Math.round(k.procurementSavings.previous)}", "${getGrowth(k.procurementSavings.current, k.procurementSavings.previous)}"\n`;
            content += `"Supplier On-Time Delivery %", "${k.supplierOTD.current.toFixed(1)}%", "${k.supplierOTD.previous.toFixed(1)}%", "${getGrowth(k.supplierOTD.current, k.supplierOTD.previous)}"\n\n`;

            // Top Suppliers Table
            content += `"TOP PERFORMING SUPPLIERS"\n`;
            content += `"Supplier Name", "Purchase Orders", "Spent Value (₹)", "Average Delivery Lead (Days)", "On-Time Performance Rating"\n`;
            this.tableState.suppliers.data.forEach(s => {
                content += `"${s.supplier}", "${s.purchaseOrders}", "${Math.round(s.purchaseValue)}", "${s.averageDeliveryTime}", "${s.rating}"\n`;
            });
            content += `\n`;

            // Top Products Table
            content += `"TOP PURCHASED PRODUCTS"\n`;
            content += `"Product Description", "Quantity Purchased", "Spent Value (₹)", "Primary Supplier", "Stock Remaining", "Reorder Level"\n`;
            this.tableState.products.data.forEach(p => {
                content += `"${p.product}", "${p.purchaseQuantity}", "${Math.round(p.purchaseCost)}", "${p.supplier}", "${p.stockRemaining}", "${p.reorderLevel}"\n`;
            });
            content += `\n`;

            // Recent POs
            content += `"RECENT PURCHASE ORDERS"\n`;
            content += `"PO Number", "Supplier", "Amount (₹)", "Status"\n`;
            this.tableState.recent.data.forEach(r => {
                content += `"${r.poNumber}", "${r.supplier}", "${Math.round(r.amount)}", "${r.status}"\n`;
            });

            filename += '.csv';
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

declare var procurementAnalyticsUI: any;
(window as any).procurementAnalyticsUI = new ProcurementAnalyticsUI();
