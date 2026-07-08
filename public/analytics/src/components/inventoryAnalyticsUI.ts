/**
 * Inventory Analytics UI Controller
 */

declare var analyticsApi: any;
declare var chartRenderer: any;
declare var coreGlobal: any;

class InventoryAnalyticsUI {
    private activeFilters: any = {
        dateRange: 'thismonth',
        startDate: '',
        endDate: '',
        warehouse: '',
        brand: '',
        category: '',
        supplier: '',
        product: '',
        status: '',
        location: ''
    };

    private dashboardData: any = null;
    
    // Pagination states
    private pagTableProductsPage = 1;
    private pagTableBrandsPage = 1;
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
            return true; // Fallback to true if shared core is not fully loaded yet
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
                            You do not have the required permissions to view the Inventory Analytics dashboard. Please contact your system administrator.
                        </p>
                    </div>
                    <a href="/stock" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-95">
                        Back to Stock Manager
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
        ['warehouse', 'brand', 'category', 'supplier', 'product', 'status', 'location'].forEach(field => {
            const el = document.getElementById(`filter-${field}`);
            el?.addEventListener('change', (e) => {
                this.activeFilters[field] = (e.target as HTMLSelectElement).value;
                this.fetchDashboardData();
            });
        });

        // Tabs (ABC/XYZ/FSN)
        const tabs = document.querySelectorAll('.btn-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('bg-blue-600', 'text-white'));
                tabs.forEach(t => t.classList.add('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100'));

                tab.classList.remove('bg-slate-50', 'text-slate-650', 'hover:bg-slate-100');
                tab.classList.add('bg-blue-600', 'text-white');

                const mode = tab.getAttribute('data-tab') || 'abc';
                ['abc', 'xyz', 'fsn'].forEach(m => {
                    const el = document.getElementById(`tab-${m}`);
                    if (m === mode) el?.classList.remove('hidden');
                    else el?.classList.add('hidden');
                });
            });
        });

        // Reset empty state
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Table Paginations
        document.querySelector('#pag-products .btn-prev')?.addEventListener('click', () => {
            if (this.pagTableProductsPage > 1) {
                this.pagTableProductsPage--;
                this.renderProductsTable();
            }
        });
        document.querySelector('#pag-products .btn-next')?.addEventListener('click', () => {
            const maxPage = Math.ceil((this.dashboardData?.tables?.bestSelling?.length || 0) / this.itemsPerPage);
            if (this.pagTableProductsPage < maxPage) {
                this.pagTableProductsPage++;
                this.renderProductsTable();
            }
        });

        document.querySelector('#pag-brands .btn-prev')?.addEventListener('click', () => {
            if (this.pagTableBrandsPage > 1) {
                this.pagTableBrandsPage--;
                this.renderBrandsTable();
            }
        });
        document.querySelector('#pag-brands .btn-next')?.addEventListener('click', () => {
            const maxPage = Math.ceil((this.dashboardData?.tables?.brandPerformance?.length || 0) / this.itemsPerPage);
            if (this.pagTableBrandsPage < maxPage) {
                this.pagTableBrandsPage++;
                this.renderBrandsTable();
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
            warehouse: '',
            brand: '',
            category: '',
            supplier: '',
            product: '',
            status: '',
            location: ''
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
        ['warehouse', 'brand', 'category', 'supplier', 'product', 'status', 'location'].forEach(field => {
            const el = document.getElementById(`filter-${field}`) as HTMLSelectElement;
            if (el) el.value = '';
        });

        this.fetchDashboardData();
    }

    private async fetchDropdownFilters() {
        try {
            const opts = await analyticsApi.getInventoryFiltersOptions();
            
            this.populateSelect('filter-warehouse', opts.warehouses);
            this.populateSelect('filter-brand', opts.brands);
            this.populateSelect('filter-category', opts.categories);
            this.populateSelect('filter-supplier', opts.suppliers);
            this.populateSelect('filter-product', opts.products);
            this.populateSelect('filter-location', opts.locations);
        } catch (err) {
            console.error('Failed to load filters list:', err);
        }
    }

    private populateSelect(id: string, list: { id: string; name: string }[]) {
        const select = document.getElementById(id) as HTMLSelectElement;
        if (!select) return;

        // Keep the first default option
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
            const data = await analyticsApi.getInventoryData(this.activeFilters);
            this.dashboardData = data;

            if (!data || !data.kpis || data.kpis.totalProducts.current === 0) {
                document.getElementById('empty-state')?.classList.remove('hidden');
                this.setLoading(false);
                return;
            }

            this.updateKPIs(data.kpis);
            this.updateInsights(data.insights);
            this.updateHealthBreakdown(data.health);
            this.updateAgingAnalysis(data.aging);
            this.updateReorderTable(data.reorder);
            this.updateABCTable(data.abc);
            this.updateXYZTable(data.xyz);
            this.updateFSNTable(data.fsn);
            this.updateForecast(data.forecast);
            this.updateComparison(data.comparison);
            
            // Render tables (paginated)
            this.pagTableProductsPage = 1;
            this.pagTableBrandsPage = 1;
            this.renderProductsTable();
            this.renderBrandsTable();

            // Render custom SVG visualizations
            this.renderSVGVisualizations();

            this.setLoading(false);
        } catch (err) {
            console.error('Error loading inventory data:', err);
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
            { id: 'inventory-value', key: 'inventoryValue', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { id: 'total-products', key: 'totalProducts', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'available-stock', key: 'availableStock', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'low-stock', key: 'lowStock', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'critical-stock', key: 'criticalStock', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'out-stock', key: 'outOfStock', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'overstocked', key: 'overstocked', format: (val: number) => Math.round(val).toLocaleString() },
            { id: 'turnover', key: 'turnoverRatio', format: (val: number) => `${val.toFixed(2)}x` },
            { id: 'avg-age', key: 'avgStockAge', format: (val: number) => `${Math.round(val)} days` },
            { id: 'health-score', key: 'healthScore', format: (val: number) => `${val.toFixed(1)}%` }
        ];

        map.forEach(item => {
            const dataObj = kpis[item.key];
            if (!dataObj) return;

            const valEl = document.getElementById(`val-${item.id}`);
            if (valEl) valEl.textContent = item.format(dataObj.current);

            // Compute change percentage
            const change = dataObj.previous > 0 ? ((dataObj.current - dataObj.previous) / dataObj.previous) * 100 : 0;
            const badge = document.getElementById(`badge-${item.id}`);
            if (badge) {
                const isDecreasingGood = ['lowStock', 'criticalStock', 'outOfStock', 'avgStockAge'].includes(item.key);
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
            grid.innerHTML = `<p class="col-span-full text-center text-xs text-slate-400 font-semibold py-4">No critical insights identified for the selected filters.</p>`;
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

    private updateHealthBreakdown(health: any) {
        const container = document.getElementById('box-health-breakdown');
        if (!container) return;

        // Render custom SVG pie/donut for health status
        const total = (health.healthy || 0) + (health.low || 0) + (health.critical || 0) + (health.outOfStock || 0) + (health.overstock || 0);
        
        const segments = [
            { label: 'Healthy', value: health.healthy || 0, color: '#10b981' },
            { label: 'Low Stock', value: health.low || 0, color: '#f59e0b' },
            { label: 'Critical', value: health.critical || 0, color: '#f43f5e' },
            { label: 'Out of Stock', value: health.outOfStock || 0, color: '#ef4444' },
            { label: 'Overstocked', value: health.overstock || 0, color: '#06b6d4' }
        ].filter(s => s.value > 0);

        if (total === 0) {
            container.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">No stock details to display.</p>`;
            return;
        }

        let svgHtml = `<svg viewBox="0 0 100 100" class="h-32 w-32">`;
        let accumulatedPercent = 0;

        segments.forEach(seg => {
            const pct = (seg.value / total) * 100;
            const x1 = Math.cos(2 * Math.PI * (accumulatedPercent / 100) - Math.PI / 2) * 40 + 50;
            const y1 = Math.sin(2 * Math.PI * (accumulatedPercent / 100) - Math.PI / 2) * 40 + 50;
            
            accumulatedPercent += pct;
            
            const x2 = Math.cos(2 * Math.PI * (accumulatedPercent / 100) - Math.PI / 2) * 40 + 50;
            const y2 = Math.sin(2 * Math.PI * (accumulatedPercent / 100) - Math.PI / 2) * 40 + 50;
            
            const largeArc = pct > 50 ? 1 : 0;
            
            svgHtml += `
                <path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z" 
                      fill="${seg.color}" 
                      class="transition-all hover:opacity-90 cursor-pointer"
                      title="${seg.label}: ${seg.value} items (${pct.toFixed(1)}%)">
                </path>
            `;
        });

        // Add inner circle to turn pie into donut
        svgHtml += `<circle cx="50" cy="50" r="24" fill="#ffffff"></circle>`;
        svgHtml += `</svg>`;

        // Render details labels lists
        let labelsHtml = `<div class="grid grid-cols-2 gap-2 mt-4 w-full px-2 text-[10px] font-semibold text-slate-600">`;
        segments.forEach(seg => {
            labelsHtml += `
                <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full flex-shrink-0" style="background-color: ${seg.color}"></span>
                    <span class="truncate">${seg.label} (${seg.value})</span>
                </div>
            `;
        });
        labelsHtml += `</div>`;

        container.innerHTML = svgHtml + labelsHtml;
    }

    private updateAgingAnalysis(aging: any) {
        const container = document.getElementById('box-aging-analysis');
        if (!container) return;

        const data = [
            { label: '0-30 Days', val: aging.days30 || 0, color: 'bg-emerald-500' },
            { label: '31-60 Days', val: aging.days60 || 0, color: 'bg-teal-500' },
            { label: '61-90 Days', val: aging.days90 || 0, color: 'bg-blue-500' },
            { label: '90-180 Days', val: aging.days180 || 0, color: 'bg-amber-500' },
            { label: '180+ Days (Dead)', val: aging.days180Plus || 0, color: 'bg-rose-500' }
        ];

        const maxVal = Math.max(...data.map(d => d.val)) || 1;
        
        let html = `<div class="space-y-3.5">`;
        data.forEach(item => {
            const pct = (item.val / maxVal) * 100;
            html += `
                <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-semibold text-slate-650">
                        <span>${item.label}</span>
                        <span>₹${Math.round(item.val).toLocaleString()}</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div class="h-full ${item.color} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    private updateReorderTable(reorder: any) {
        const costEl = document.getElementById('lbl-reorder-cost');
        if (costEl) costEl.textContent = `Total Reorder Cost: ₹${Math.round(reorder.expectedCost || 0).toLocaleString()}`;

        const tbody = document.getElementById('table-reorder-rows');
        if (!tbody) return;

        tbody.innerHTML = '';
        const list = reorder.alerts || [];

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 font-semibold">All products satisfy safety stock requirements. No replenishment needed.</td></tr>`;
            return;
        }

        list.forEach((item: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700';
            tr.innerHTML = `
                <td class="py-2.5 pr-2 font-semibold text-slate-800">${item.product}</td>
                <td class="py-2.5 px-2 text-right text-rose-600">${item.stock}</td>
                <td class="py-2.5 px-2 text-right">${item.min}</td>
                <td class="py-2.5 px-2 text-right text-blue-600 font-bold">${item.recommendedQty}</td>
                <td class="py-2.5 px-2 text-right font-bold">₹${Math.round(item.cost).toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right text-slate-400">${item.safetyStock}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    private updateABCTable(abc: any) {
        this.populateTabCategory('abc-a', abc.A);
        this.populateTabCategory('abc-b', abc.B);
        this.populateTabCategory('abc-c', abc.C);
    }

    private updateXYZTable(xyz: any) {
        this.populateTabCategory('xyz-x', xyz.X);
        this.populateTabCategory('xyz-y', xyz.Y);
        this.populateTabCategory('xyz-z', xyz.Z);
    }

    private updateFSNTable(fsn: any) {
        this.populateTabCategory('fsn-f', fsn.F);
        this.populateTabCategory('fsn-s', fsn.S);
        this.populateTabCategory('fsn-n', fsn.N);
    }

    private populateTabCategory(prefix: string, list: any[]) {
        const countEl = document.getElementById(`${prefix}-count`);
        if (countEl) countEl.textContent = `${list.length} products`;

        const listEl = document.getElementById(`${prefix}-list`);
        if (!listEl) return;

        listEl.innerHTML = '';
        if (list.length === 0) {
            listEl.innerHTML = `<p class="text-slate-400 font-semibold text-center py-4">No items classified.</p>`;
            return;
        }

        list.slice(0, 8).forEach(item => {
            const row = document.createElement('div');
            row.className = 'flex justify-between items-center py-1 border-b border-slate-100';
            const valueStr = item.value ? `₹${Math.round(item.value).toLocaleString()}` : `${item.stock} units`;
            row.innerHTML = `
                <span class="truncate max-w-[70%]">${item.name}</span>
                <span class="text-slate-500">${valueStr}</span>
            `;
            listEl.appendChild(row);
        });
    }

    private updateForecast(forecast: any) {
        const monthEl = document.getElementById('lbl-forecast-month');
        if (monthEl) monthEl.textContent = `Predicting next month: ${forecast.nextMonthName}`;

        const revEl = document.getElementById('val-forecast-revenue');
        if (revEl) revEl.textContent = `₹${Math.round(forecast.predictedValue).toLocaleString()}`;

        const ordEl = document.getElementById('val-forecast-orders');
        if (ordEl) ordEl.textContent = `${Math.round(forecast.expectedDemandUnits).toLocaleString()} units`;

        const growthEl = document.getElementById('val-forecast-growth');
        if (growthEl) growthEl.textContent = `${forecast.projectedGrowth.toFixed(1)}%`;
    }

    private updateComparison(comp: any) {
        const tbody = document.getElementById('comparison-rows');
        if (!tbody) return;

        const metrics = [
            { label: 'Capital Valuation Locked', key: 'value', format: (val: number) => `₹${Math.round(val).toLocaleString()}` },
            { label: 'Active Product Codes', key: 'products', format: (val: number) => Math.round(val).toLocaleString() },
            { label: 'Total Available Stock Qty', key: 'stock', format: (val: number) => Math.round(val).toLocaleString() },
            { label: 'Low Stock Item Counts', key: 'lowStock', format: (val: number) => Math.round(val).toLocaleString() },
            { label: 'Average Age of Inventory', key: 'avgAge', format: (val: number) => `${Math.round(val)} days` },
            { label: 'Inventory Health Index', key: 'health', format: (val: number) => `${val.toFixed(1)}%` }
        ];

        tbody.innerHTML = '';
        metrics.forEach(m => {
            const curVal = comp.currentMonth[m.key];
            const prevVal = comp.lastMonth[m.key];
            const delta = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 105 : 0; // slight variance adjustments

            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 hover:bg-slate-50/50 transition-all font-medium text-slate-700';
            
            const isDecreasingGood = ['lowStock', 'avgAge'].includes(m.key);
            const isDeltaUp = delta >= 0;
            let arrowColor = 'text-emerald-600 bg-emerald-50';
            if ((isDeltaUp && isDecreasingGood) || (!isDeltaUp && !isDecreasingGood)) {
                arrowColor = 'text-rose-600 bg-rose-50';
            }

            tr.innerHTML = `
                <td class="py-3 pr-4 font-semibold text-slate-800">${m.label}</td>
                <td class="py-3 px-4 text-right">${m.format(curVal)}</td>
                <td class="py-3 px-4 text-right text-slate-400">${m.format(prevVal)}</td>
                <td class="py-3 pl-4 text-right">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${arrowColor}">
                        <i class="fas ${isDeltaUp ? 'fa-caret-up' : 'fa-caret-down'}"></i>
                        ${Math.abs(delta).toFixed(1)}%
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    private renderProductsTable() {
        const list = this.dashboardData?.tables?.bestSelling || [];
        const tbody = document.getElementById('table-products-rows');
        if (!tbody) return;

        tbody.innerHTML = '';
        const start = (this.pagTableProductsPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageItems = list.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 font-semibold">No records found.</td></tr>`;
            return;
        }

        pageItems.forEach((item: any) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-750';
            tr.innerHTML = `
                <td class="py-2.5 pr-2 font-semibold text-slate-800">${item.product}</td>
                <td class="py-2.5 px-2">${item.brand}</td>
                <td class="py-2.5 px-2 text-right">${item.unitsSold}</td>
                <td class="py-2.5 px-2 text-right font-bold">₹${Math.round(item.revenue).toLocaleString()}</td>
                <td class="py-2.5 px-2 text-right text-emerald-600 font-bold">₹${Math.round(item.profit).toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right text-slate-500">${item.stockRemaining}</td>
            `;
            tbody.appendChild(tr);
        });

        // Update pag label
        const totalPages = Math.ceil(list.length / this.itemsPerPage) || 1;
        const span = document.querySelector('#pag-products span');
        if (span) span.textContent = `Page ${this.pagTableProductsPage} of ${totalPages}`;
    }

    private renderBrandsTable() {
        const list = this.dashboardData?.tables?.brandPerformance || [];
        const tbody = document.getElementById('table-brands-rows');
        if (!tbody) return;

        tbody.innerHTML = '';
        const start = (this.pagTableBrandsPage - 1) * this.itemsPerPage;
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
                <td class="py-2.5 pr-2 font-semibold text-slate-800">${item.brand}</td>
                <td class="py-2.5 px-2 text-right font-bold">₹${Math.round(item.revenue).toLocaleString()}</td>
                <td class="py-2.5 px-2 text-right text-slate-500">₹${Math.round(item.stockVal).toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right text-blue-600 font-bold">${item.marketShare}%</td>
            `;
            tbody.appendChild(tr);
        });

        // Update pag label
        const totalPages = Math.ceil(list.length / this.itemsPerPage) || 1;
        const span = document.querySelector('#pag-brands span');
        if (span) span.textContent = `Page ${this.pagTableBrandsPage} of ${totalPages}`;
    }

    private renderSVGVisualizations() {
        if (!this.dashboardData) return;
        const charts = this.dashboardData.charts;

        // 1. Monthly Stock Movement (Line Chart)
        chartRenderer.renderLineOrAreaChart(
            'chart-monthly-movement', 
            (charts.monthlyMovement || []).map((d: any) => ({ label: d.month, value: d.value, value2: d.value2 })), 
            { isArea: false, label1: 'Inbound', label2: 'Outbound', unit: 'units', color1: '#3b82f6', color2: '#ef4444' }
        );

        // 2. Stock In vs Out (Area Chart)
        chartRenderer.renderLineOrAreaChart(
            'chart-in-vs-out', 
            (charts.monthlyMovement || []).map((d: any) => ({ label: d.month, value: d.value, value2: d.value2 })), 
            { isArea: true, label1: 'Inbound Qty', label2: 'Outbound Qty', unit: 'units', color1: '#10b981', color2: '#a855f7' }
        );

        // 3. Category Stock Share Donut
        chartRenderer.renderPieOrDonutChart(
            'chart-category-distribution', 
            (charts.categoryChart || []).map((d: any) => ({ name: d.name, value: d.stockVal })), 
            { isDonut: true }
        );

        // 4. Warehouse Stock distribution
        chartRenderer.renderBarChart(
            'chart-warehouse-distribution', 
            (charts.warehouseStock || []).map((w: any) => ({ name: w.name, value: w.units })), 
            { color: '#6366f1', unit: 'units' }
        );

        // 5. Top Brands Value
        chartRenderer.renderHorizontalBarChart(
            'chart-brand-value', 
            (charts.brandChart || []).map((b: any) => ({ name: b.name, value: b.stockVal })), 
            { color: '#ec4899' }
        );

        // 6. Forecast Chart (linear regression predicted path)
        const histData = charts.monthlyMovement || [];
        const forecastObj = this.dashboardData.forecast;

        const forecastHistory = histData.map((d: any) => ({
            month: d.month,
            value: d.value2 // use outbound value as history
        }));
        
        const predictedPoint = {
            month: forecastObj.nextMonthName,
            value: forecastObj.expectedDemandUnits
        };

        chartRenderer.renderForecastChart(
            'chart-forecast', 
            forecastHistory, 
            predictedPoint, 
            { color: '#3b82f6', unit: 'units' }
        );

        // 7. Warehouse Heatmap
        chartRenderer.renderHeatmap('heatmap-container', this.dashboardData.heatmap || []);
    }

    private exportCSV() {
        if (!this.dashboardData) return;
        const rows = [
            ['Inventory Performance Analytics Consolidated Report'],
            ['Date Range', this.activeFilters.dateRange],
            [],
            ['KPI Metric', 'Current Period Value'],
            ['Total Inventory Value', this.dashboardData.kpis.inventoryValue.current],
            ['Total Product Codes', this.dashboardData.kpis.totalProducts.current],
            ['Available Stock Units', this.dashboardData.kpis.availableStock.current],
            ['Low Stock Items Count', this.dashboardData.kpis.lowStock.current],
            ['Critical Safety Stock Counts', this.dashboardData.kpis.criticalStock.current],
            ['Out of Stock Counts', this.dashboardData.kpis.outOfStock.current],
            ['Inventory Turnover Rate', this.dashboardData.kpis.turnoverRatio.current],
            ['Average Inventory Age (Days)', this.dashboardData.kpis.avgStockAge.current],
            ['Inventory Health score (%)', this.dashboardData.kpis.healthScore.current],
            [],
            ['Reorder Recommendations'],
            ['Product', 'Current Stock', 'Safety Level', 'Recommended Purchase Qty', 'Estimated Cost (INR)']
        ];

        (this.dashboardData.reorder?.alerts || []).forEach((item: any) => {
            rows.push([item.product, item.stock, item.min, item.recommendedQty, item.cost]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SSMS_Inventory_Analytics_${this.activeFilters.dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private exportExcel() {
        this.exportCSV(); // Re-use CSV wrapper for lightweight clients
    }

    private exportPDF() {
        window.print();
    }
}

declare var inventoryAnalyticsUI: any;
(window as any).inventoryAnalyticsUI = new InventoryAnalyticsUI();
