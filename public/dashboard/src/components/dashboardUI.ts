/**
 * Dashboard UI Components and Logic
 */

declare var dashboardApi: any;
declare var dashboardUtils: any;
declare function showAlert(message: string): void;

class DashboardUI {
    private refreshInterval: NodeJS.Timeout | null = null;
    private stockItems: any[] = [];

    init() {
        this.loadOverview();
        this.loadRecentActivity();
        this.loadStockAlerts();
        this.loadPerformanceMetrics();

        this.setupDateTime();
        this.setupEventListeners();
        this.startAutoRefresh();

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }
            } else {
                this.startAutoRefresh();
            }
        });
    }

    private setupDateTime() {
        setInterval(() => dashboardUtils.updateDateTime(), 1000);
        dashboardUtils.updateDateTime();
    }

    private setupEventListeners() {
        // More Actions dropdown toggle
        const moreActionsBtn = document.getElementById('more-actions-btn');
        const moreActionsDropdown = document.getElementById('more-actions-dropdown');
        if (moreActionsBtn && moreActionsDropdown) {
            moreActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moreActionsDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                moreActionsDropdown.classList.add('hidden');
            });
        }
    }

    private drawSparkline(canvasId: string, data: number[], color: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = 100;
        const height = 30;
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        if (data.length < 2) return;

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min === 0 ? 1 : max - min;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * (width - 4) + 2;
            const y = height - ((data[i] - min) / range) * (height - 6) - 3;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.lineTo((width - 4) + 2, height);
        ctx.lineTo(2, height);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.15)'));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }



    private loadOverview() {
        dashboardApi.getOverview()
            .then((data: any) => {
                dashboardUtils.animateCounter("project-count", data.totalProjects);
                dashboardUtils.animateCounter("unpaid-count", data.totalUnpaid);
                dashboardUtils.animateCounter("expenditure-count", data.totalExpenditure, true);
                dashboardUtils.animateCounter("remaining-services-count", data.remainingServices);
                dashboardUtils.animateCounter("customer-count", data.totalCustomers);

                const customerTypesSubtext = document.getElementById("customer-types-subtext");
                if (customerTypesSubtext) {
                    customerTypesSubtext.textContent = `${data.b2bCustomers || 0} B2B | ${data.b2cCustomers || 0} B2C`;
                }

                const netCashflow = (data.totalEarned || 0) - (data.totalExpenditure || 0);
                const netCashflowEl = document.getElementById("net-cashflow-value");
                if (netCashflowEl) {
                    const isLoss = netCashflow < 0;
                    netCashflowEl.textContent = `${isLoss ? '-' : ''}₹${(window as any).formatIndian(Math.abs(netCashflow))}`;
                    netCashflowEl.className = `text-2xl font-bold tracking-tight ${isLoss ? 'text-red-650' : 'text-green-600'}`;
                }

                const netCashflowBadge = document.getElementById("net-cashflow-badge");
                if (netCashflowBadge) {
                    const isLoss = netCashflow < 0;
                    const isNeutral = netCashflow === 0;
                    netCashflowBadge.textContent = isNeutral ? 'Neutral' : isLoss ? 'Loss' : 'Profit';
                    netCashflowBadge.className = `text-xs font-bold px-2 py-0.5 rounded ${isLoss ? 'text-red-650 bg-red-50 border border-red-100' : isNeutral ? 'text-slate-600 bg-slate-50 border border-slate-100' : 'text-green-600 bg-green-50 border border-green-100'}`;
                }

                const netCashflowDetails = document.getElementById("net-cashflow-details");
                if (netCashflowDetails) {
                    netCashflowDetails.innerHTML = `<span>Rev: ₹${(window as any).formatIndian(data.totalEarned || 0)} | Exp: ₹${(window as any).formatIndian(data.totalExpenditure || 0)}</span>`;
                }

                const hasCashflow = (data.totalEarned || 0) > 0 || (data.totalExpenditure || 0) > 0;
                this.drawSparkline("cashflow-sparkline", hasCashflow ? (netCashflow < 0 ? [217320, 180000, 195000, 210000, Math.abs(netCashflow)] : [70080, 90000, 85000, 110000, netCashflow]) : [0, 0, 0, 0, 0], netCashflow < 0 ? 'rgb(220, 38, 38)' : 'rgb(22, 163, 74)');

                const pipelineValue = data.totalEarned || 0;
                const pipelineValEl = document.getElementById("pipeline-value");
                if (pipelineValEl) {
                    pipelineValEl.textContent = `₹${(window as any).formatIndian(pipelineValue)}`;
                }
                const pipelineCountEl = document.getElementById("pipeline-count-badge");
                if (pipelineCountEl) {
                    pipelineCountEl.textContent = `${data.totalProjects} Projects`;
                }

                const pipelineDetails = document.getElementById("pipeline-details");
                if (pipelineDetails) {
                    pipelineDetails.innerHTML = `<span>${data.totalProjects} Project${data.totalProjects !== 1 ? 's' : ''} | ${data.totalQuotations} Quotation${data.totalQuotations !== 1 ? 's' : ''} Given</span>`;
                }

                const hasPipeline = (data.totalProjects || 0) > 0 || (data.totalQuotations || 0) > 0;
                this.drawSparkline("pipeline-sparkline", hasPipeline ? [30000, 45000, 40000, 55000, pipelineValue] : [0, 0, 0, 0, 0], 'rgb(37, 99, 235)');

                const expStatusEl = document.getElementById("exp-status-text");
                if (expStatusEl) {
                    const hasLoss = (data.totalEarned || 0) < (data.totalExpenditure || 0);
                    expStatusEl.textContent = hasLoss ? 'Outflow exceeding sales' : 'Stable operational costs';
                    expStatusEl.className = `text-[10px] ${hasLoss ? 'text-red-500 font-bold' : 'text-slate-400 font-medium'} mt-1 block`;
                }

                const unpaidStatusEl = document.querySelector("#unpaid-count + span");
                if (unpaidStatusEl) {
                    unpaidStatusEl.textContent = data.totalUnpaid > 0 ? `${data.totalUnpaid} unpaid invoice${data.totalUnpaid !== 1 ? 's' : ''}` : 'All payments cleared';
                }
            })
            .catch((err: any) => {
                console.error("Error fetching analytics:", err);
                ['project-count', 'unpaid-count', 'expenditure-count', 'remaining-services-count', 'customer-count'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = '0';
                });
            });
    }

    private loadRecentActivity() {
        Promise.all([
            dashboardApi.getQuotations().catch(() => []),
            dashboardApi.getInvoices().catch(() => []),
            dashboardApi.getEwaybills().catch(() => ({ eWayBill: [] })),
            dashboardApi.getServices().catch(() => ({ services: [] })),
            dashboardApi.getReports().catch(() => ({ reports: [] })),
            dashboardApi.getPurchaseOrders().catch(() => ({ purchaseOrder: [] }))
        ])
            .then(([quotations, invoices, waybillsData, services, reportsData, purchaseOrdersData]) => {
                const activities: ActivityItem[] = [];

                (quotations || []).slice(0, 5).forEach((q: any) => {
                    activities.push({
                        type: 'quotation',
                        icon: 'fa-file-alt',
                        color: 'blue',
                        title: `Quotation #${q.quotation_id || 'N/A'}`,
                        description: q.project_name || 'No project name',
                        time: q.updatedAt || q.createdAt || q.quotation_date || new Date(),
                        link: `/quotation/details?id=${encodeURIComponent(q.quotation_id || '')}`
                    });
                });

                (invoices || []).slice(0, 5).forEach((i: any) => {
                    activities.push({
                        type: 'invoice',
                        icon: 'fa-file-invoice',
                        color: 'green',
                        title: `Invoice #${i.invoice_id || 'N/A'}`,
                        description: i.project_name || 'No project name',
                        time: i.updatedAt || i.createdAt || i.invoice_date || new Date(),
                        link: `../invoice/invoice.html?view=${encodeURIComponent(i.invoice_id || '')}`
                    });
                });

                const waybills = waybillsData?.eWayBill || waybillsData || [];
                (Array.isArray(waybills) ? waybills : []).slice(0, 5).forEach((w: any) => {
                    let toAddressStr = '';
                    if (w.to_address) {
                        if (typeof w.to_address === 'string') {
                            toAddressStr = w.to_address;
                        } else {
                            toAddressStr = [w.to_address.line1, w.to_address.line2, w.to_address.city].filter(Boolean).join(', ');
                        }
                    }
                    const displayId = w.ewaybill_no || w._id || 'N/A';
                    const description = toAddressStr ? `To: ${toAddressStr.split('\n')[0].substring(0, 50)}` : 'E-Way Bill';
                    activities.push({
                        type: 'waybill',
                        icon: 'fa-truck',
                        color: 'purple',
                        title: `E-Way Bill #${displayId}`,
                        description: description,
                        time: w.updatedAt || w.createdAt || w.ewaybill_generated_at || new Date(),
                        link: `../ewaybill/eWayBill.html?view=${encodeURIComponent(w._id || '')}`
                    });
                });

                const servicesList = services?.services || services || [];
                (Array.isArray(servicesList) ? servicesList : []).slice(0, 5).forEach((s: any) => {
                    activities.push({
                        type: 'service',
                        icon: 'fa-wrench',
                        color: 'teal',
                        title: `Service #${s.service_id || 'N/A'}`,
                        description: s.project_name || s.customer_name || 'No description',
                        time: s.updatedAt || s.createdAt || s.service_date || new Date(),
                        link: `../service/service.html?view=${encodeURIComponent(s.service_id || '')}`
                    });
                });

                const purchaseOrders = purchaseOrdersData?.purchaseOrder || purchaseOrdersData || [];
                (Array.isArray(purchaseOrders) ? purchaseOrders : []).slice(0, 5).forEach((p: any) => {
                    activities.push({
                        type: 'purchase',
                        icon: 'fa-shopping-cart',
                        color: 'red',
                        title: `Purchase #${p.purchase_order_id || 'N/A'}`,
                        description: p.supplier_name || 'No supplier',
                        time: p.updatedAt || p.createdAt || p.purchase_date || new Date(),
                        link: `../purchaseOrder/purchaseOrder.html?view=${encodeURIComponent(p.purchase_order_id || '')}`
                    });
                });

                const reports = reportsData?.reports || reportsData || [];
                (Array.isArray(reports) ? reports : []).slice(0, 5).forEach((r: any) => {
                    let icon = 'fa-chart-bar';
                    let color = 'orange';
                    let typeLabel = 'Report';

                    switch (r.report_type) {
                        case 'stock':
                            icon = 'fa-boxes'; color = 'orange'; typeLabel = 'Stock Report'; break;
                        case 'gst':
                            icon = 'fa-file-invoice-dollar'; color = 'indigo'; typeLabel = 'Invoice GST Report'; break;
                        case 'purchase_gst':
                            icon = 'fa-receipt'; color = 'pink'; typeLabel = 'Purchase GST Report'; break;
                        case 'data_worksheet':
                            icon = 'fa-table'; color = 'cyan'; typeLabel = 'Data Worksheet'; break;
                    }

                    activities.push({
                        type: 'report',
                        icon: icon,
                        color: color,
                        title: r.report_name || typeLabel,
                        description: typeLabel,
                        time: r.generated_at || r.createdAt || new Date(),
                        link: `../reports/reports.html?view=${encodeURIComponent(r._id || '')}`
                    });
                });

                activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                this.displayRecentActivity(activities.slice(0, 10));
            })
            .catch(err => {
                console.error('Error loading recent activity:', err);
                dashboardUtils.showErrorMessage('recent-activity', 'Failed to load recent activity');
            });
    }

    private displayRecentActivity(activities: ActivityItem[]) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center text-slate-400 py-8 text-xs font-semibold">
                    <i class="fas fa-inbox text-2xl mb-1.5 block text-slate-300"></i>
                    No recent activity
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="relative pl-6 border-l border-slate-100 space-y-4">
                ${activities.map(activity => {
                    const initials = activity.title.split('#')[1]?.substring(0, 2) || activity.type.substring(0, 2).toUpperCase();
                    let bgClass = 'bg-blue-50 text-blue-600 border-blue-100';
                    if (activity.type === 'invoice') bgClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    else if (activity.type === 'purchase' || activity.type === 'purchase_order') bgClass = 'bg-rose-50 text-rose-600 border-rose-100';
                    else if (activity.type === 'waybill') bgClass = 'bg-purple-50 text-purple-600 border-purple-100';
                    else if (activity.type === 'service') bgClass = 'bg-amber-50 text-amber-600 border-amber-100';

                    return `
                    <div class="relative">
                        <span class="absolute -left-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-slate-200">
                            <span class="h-1.5 w-1.5 rounded-full ${activity.type === 'invoice' ? 'bg-emerald-500' : 'bg-blue-500'}"></span>
                        </span>
                        
                        <div class="flex items-start justify-between gap-3 min-w-0">
                            <div class="flex items-start gap-3 min-w-0">
                                <div class="w-7 h-7 rounded-full ${bgClass} border flex items-center justify-center shrink-0 text-[9px] font-bold">
                                    ${initials}
                                </div>
                                <div class="min-w-0">
                                    <a href="${activity.link}" class="font-bold text-slate-800 hover:text-blue-600 text-xs block truncate" title="${activity.title}">${activity.title}</a>
                                    <span class="text-[11px] text-slate-500 block truncate" title="${activity.description}">${activity.description}</span>
                                </div>
                            </div>
                            <span class="text-[9px] text-slate-400 whitespace-nowrap ml-4 mt-1 font-semibold">
                                ${dashboardUtils.formatTimeAgo(activity.time)}
                            </span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    private loadStockAlerts() {
        dashboardApi.getStock()
            .then((items: any[]) => {
                this.stockItems = items || [];
                const lowStock = (items || []).filter(item => {
                    const qty = parseInt(item.stock_quantity) || 0;
                    const minQty = parseInt(item.min_stock_quantity) || 0;
                    return qty <= minQty;
                });
                const lowStockCountEl = document.getElementById('low-stock-count');
                if (lowStockCountEl) {
                    lowStockCountEl.textContent = String(lowStock.length);
                }

                const stockHealthBadge = document.getElementById('stock-health-badge');
                if (stockHealthBadge) {
                    stockHealthBadge.textContent = `${lowStock.length} Alert Item${lowStock.length !== 1 ? 's' : ''}`;
                }

                const outOfStockCount = lowStock.filter(item => (parseInt(item.stock_quantity) || 0) === 0).length;
                const lowCount = lowStock.length - outOfStockCount;

                const stockHealthSummaryEl = document.getElementById('stock-health-summary');
                if (stockHealthSummaryEl) {
                    stockHealthSummaryEl.textContent = `${outOfStockCount} Critical / ${lowCount} Low`;
                }

                const criticalStockBar = document.getElementById('critical-stock-bar');
                const warningStockBar = document.getElementById('warning-stock-bar');
                if (criticalStockBar && warningStockBar) {
                    if (lowStock.length > 0) {
                        const criticalPct = (outOfStockCount / lowStock.length) * 100;
                        const warningPct = (lowCount / lowStock.length) * 100;
                        criticalStockBar.style.width = `${criticalPct}%`;
                        warningStockBar.style.width = `${warningPct}%`;
                    } else {
                        criticalStockBar.style.width = `0%`;
                        warningStockBar.style.width = `0%`;
                    }
                }

                let potentialSalesCost = 0;
                const outOfStockItems = lowStock.filter(item => (parseInt(item.stock_quantity) || 0) === 0);
                outOfStockItems.forEach(item => {
                    const qtyToRestock = Math.max(parseInt(item.min_stock_quantity) || 0, 10);
                    const price = parseFloat(item.selling_price) || parseFloat(item.purchase_price) || 0;
                    potentialSalesCost += price * qtyToRestock;
                });

                const morningBriefTextEl = document.getElementById('morning-brief-text');
                if (morningBriefTextEl) {
                    let briefText = '';
                    if (outOfStockCount > 0) {
                        const costStr = potentialSalesCost >= 100000 
                            ? `₹${(potentialSalesCost / 100000).toFixed(1)}L`
                            : `₹${(window as any).formatIndian(potentialSalesCost)}`;
                        briefText = `You have <span class="text-red-650 font-bold">${outOfStockCount} items out of stock</span> costing ~<span class="font-bold">${costStr}</span> in potential sales.`;
                    } else {
                        briefText = `All key items are in stock! Performance is stable today.`;
                    }
                    morningBriefTextEl.innerHTML = briefText;
                }

            })
            .catch((err: any) => {
                console.error('Error loading stock alerts:', err);
            });
    }

    private loadPerformanceMetrics() {
        dashboardApi.getPerformanceMetrics()
            .then((data: any) => {
                this.updateMetric('revenue', data.revenue || { current: 0, previous: 0 });

                const quotationsCurrent = data.quotations?.current || 0;
                const projectsCurrent = data.projects?.current || 0;
                const conversionRate = quotationsCurrent > 0
                    ? Math.round((projectsCurrent / quotationsCurrent) * 100)
                    : 0;
                const conversionEl = document.getElementById('conversion-rate');
                if (conversionEl) conversionEl.textContent = `${conversionRate}%`;
            })
            .catch((err: any) => {
                console.error('Error loading performance metrics:', err);
                this.updateMetric('revenue', { current: 0, previous: 0 });
                const conversionEl = document.getElementById('conversion-rate');
                if (conversionEl) conversionEl.textContent = '0%';
            });
    }

    private updateMetric(type: string, data: any) {
        const current = data.current || 0;
        const previous = data.previous || 0;
        const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
        const isPositive = change >= 0;

        const currentEl = document.getElementById(`${type}-current`);
        if (currentEl) {
            currentEl.textContent = `₹${(window as any).formatIndian(current)}`;
        }

        const trendElement = document.getElementById(`${type}-trend`);
        if (trendElement) {
            trendElement.className = `text-[10px] font-semibold ${isPositive ? 'text-green-600' : 'text-red-650'} mt-1 block`;
            trendElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(change)}% vs last month
            `;
        }
    }

    private startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.loadRecentActivity();
            this.loadStockAlerts();
            this.loadPerformanceMetrics();
            this.loadOverview();
        }, 300000); // 5 minutes
    }
}

declare var dashboardUI: any;
(window as any).dashboardUI = new DashboardUI();
