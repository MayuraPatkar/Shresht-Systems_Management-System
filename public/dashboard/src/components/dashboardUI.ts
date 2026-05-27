/**
 * Dashboard UI Components and Logic
 */

declare var dashboardApi: any;
declare var dashboardUtils: any;
declare function showAlert(message: string): void;

class DashboardUI {
    private refreshInterval: NodeJS.Timeout | null = null;

    init() {
        this.loadOverview();
        this.loadRecentActivity();
        this.loadStockAlerts();
        this.loadPendingTasks();
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
        const refreshActivityBtn = document.getElementById('refresh-activity-btn');
        if (refreshActivityBtn) {
            refreshActivityBtn.addEventListener('click', () => this.refreshActivity());
        }

        const refreshTasksBtn = document.getElementById('refresh-tasks-btn');
        if (refreshTasksBtn) {
            refreshTasksBtn.addEventListener('click', () => this.refreshTasks());
        }
    }

    private loadOverview() {
        dashboardApi.getOverview()
            .then((data: any) => {
                dashboardUtils.animateCounter("project-count", data.totalProjects);
                dashboardUtils.animateCounter("quotation-count", data.totalQuotations);
                dashboardUtils.animateCounter("earned-count", data.totalEarned, true);
                dashboardUtils.animateCounter("unpaid-count", data.totalUnpaid);
                dashboardUtils.animateCounter("expenditure-count", data.totalExpenditure, true);
                dashboardUtils.animateCounter("remaining-services-count", data.remainingServices);
                dashboardUtils.animateCounter("customer-count", data.totalCustomers);
                dashboardUtils.animateCounter("b2b-customer-count", data.b2bCustomers);
                dashboardUtils.animateCounter("b2c-customer-count", data.b2cCustomers);
            })
            .catch((err: any) => {
                console.error("Error fetching analytics:", err);
                ['project-count', 'quotation-count', 'unpaid-count', 'expenditure-count', 'remaining-services-count', 'customer-count', 'b2b-customer-count', 'b2c-customer-count'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = '0';
                });
                ['earned-count', 'expenditure-count'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = '₹0';
                });
                if (typeof (window as any).showAlert === 'function') {
                    (window as any).showAlert('Failed to load dashboard statistics. Please refresh the page.');
                }
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
                        link: `../quotation/quotation.html?view=${encodeURIComponent(q.quotation_id || '')}`
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
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-inbox text-3xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        const colorMap: Record<string, { bg: string, text: string, border: string }> = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
            green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
            teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-500' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' },
            indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-500' },
            pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
            cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500' },
            red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-500' }
        };

        container.innerHTML = activities.map(activity => {
            const colors = colorMap[activity.color] || colorMap.blue;
            return `
            <div class="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-l-4 ${colors.border}">
                <div class="${colors.bg} p-2 rounded-lg">
                    <i class="fas ${activity.icon} ${colors.text}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <a href="${activity.link}" class="font-medium text-gray-800 hover:text-blue-600">${activity.title}</a>
                    <p class="text-sm text-gray-600 truncate">${activity.description}</p>
                    <p class="text-xs text-gray-400 mt-1">
                        <i class="far fa-clock"></i> ${dashboardUtils.formatTimeAgo(activity.time)}
                    </p>
                </div>
            </div>
        `}).join('');
    }

    private loadStockAlerts() {
        dashboardApi.getStock()
            .then((items: any[]) => {
                const lowStock = (items || []).filter(item => {
                    const qty = parseInt(item.stock_quantity) || 0;
                    const minQty = parseInt(item.min_stock_quantity) || 0;
                    return qty <= minQty;
                });
                this.displayStockAlerts(lowStock);
            })
            .catch((err: any) => {
                console.error('Error loading stock alerts:', err);
                dashboardUtils.showErrorMessage('stock-alerts', 'Failed to load stock alerts');
            });
    }

    private displayStockAlerts(items: any[]) {
        const container = document.getElementById('stock-alerts');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                    <p>All stock levels are good!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const qty = parseInt(item.stock_quantity) || 0;
            const isOutOfStock = qty === 0;
            const itemName = item.item_name || 'Unknown Item';

            if (isOutOfStock) {
                return `
                    <div class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div class="flex items-center gap-3">
                            <div class="bg-red-100 p-2 rounded-lg">
                                <i class="fas fa-times-circle text-red-600"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">${itemName}</p>
                                <p class="text-sm text-gray-600">
                                    <span class="text-red-600 font-semibold">Out of Stock</span>
                                </p>
                            </div>
                        </div>
                        <a href="../stock/stock.html?item=${encodeURIComponent(itemName)}" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Restock →
                        </a>
                    </div>
                `;
            } else {
                return `
                    <div class="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div class="flex items-center gap-3">
                            <div class="bg-yellow-100 p-2 rounded-lg">
                                <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">${itemName}</p>
                                <p class="text-sm text-gray-600">Only ${qty} left</p>
                            </div>
                        </div>
                        <a href="../stock/stock.html?item=${encodeURIComponent(itemName)}" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Restock →
                        </a>
                    </div>
                `;
            }
        }).join('');
    }

    private loadPendingTasks() {
        Promise.all([
            dashboardApi.getInvoices().catch(() => []),
            dashboardApi.getPendingServices().catch(() => ({ projects: [] })),
            dashboardApi.getStock().catch(() => []),
            dashboardApi.getPendingPayments().catch(() => ({ services: [] }))
        ])
            .then(([invoices, serviceData, stockItems, pendingPaymentData]) => {
                const tasks: TaskItem[] = [];

                const unpaidInvoices = (invoices || []).filter((i: any) => i.payment_status !== 'Paid').length;
                if (unpaidInvoices > 0) {
                    tasks.push({
                        icon: 'fa-rupee-sign', color: 'red', title: 'Pending Payments',
                        count: unpaidInvoices, description: `${unpaidInvoices} invoice${unpaidInvoices > 1 ? 's' : ''} awaiting payment`,
                        link: '../invoice/invoice.html'
                    });
                }

                const pendingPaymentServices = (pendingPaymentData.services || []).length;
                if (pendingPaymentServices > 0) {
                    tasks.push({
                        icon: 'fa-file-invoice-dollar', color: 'red', title: 'Service Payments',
                        count: pendingPaymentServices, description: `${pendingPaymentServices} service${pendingPaymentServices > 1 ? 's' : ''} awaiting payment`,
                        link: '../service/service.html'
                    });
                }

                const pendingServices = (serviceData.projects || []).length;
                if (pendingServices > 0) {
                    tasks.push({
                        icon: 'fa-tools', color: 'orange', title: 'Pending Services',
                        count: pendingServices, description: `${pendingServices} service${pendingServices > 1 ? 's' : ''} to complete`,
                        link: '../service/service.html'
                    });
                }

                const lowStockCount = (stockItems || []).filter((item: any) => {
                    const qty = parseInt(item.stock_quantity) || 0;
                    const minQty = parseInt(item.min_stock_quantity) || 0;
                    return qty <= minQty;
                }).length;

                if (lowStockCount > 0) {
                    tasks.push({
                        icon: 'fa-box', color: 'yellow', title: 'Low Stock Items',
                        count: lowStockCount, description: `${lowStockCount} item${lowStockCount > 1 ? 's' : ''} need restocking`,
                        link: '../stock/stock.html'
                    });
                }

                this.displayPendingTasks(tasks);
            })
            .catch(err => {
                console.error('Error loading pending tasks:', err);
                dashboardUtils.showErrorMessage('pending-tasks', 'Failed to load pending tasks');
            });
    }

    private displayPendingTasks(tasks: TaskItem[]) {
        const container = document.getElementById('pending-tasks');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center text-gray-500 py-8">
                    <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                    <p>No pending tasks! All caught up.</p>
                </div>
            `;
            return;
        }

        const colorMap: Record<string, any> = {
            red: { bg: 'bg-red-50', bgHover: 'hover:bg-red-100', border: 'border-red-500', iconBg: 'bg-red-100', iconText: 'text-red-600' },
            orange: { bg: 'bg-orange-50', bgHover: 'hover:bg-orange-100', border: 'border-orange-500', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
            yellow: { bg: 'bg-yellow-50', bgHover: 'hover:bg-yellow-100', border: 'border-yellow-500', iconBg: 'bg-yellow-100', iconText: 'text-yellow-600' }
        };

        container.innerHTML = tasks.map(task => {
            const colors = colorMap[task.color] || colorMap.red;
            return `
            <a href="${task.link}" class="block p-4 ${colors.bg} border-l-4 ${colors.border} rounded-lg ${colors.bgHover} transition-colors">
                <div class="flex items-center gap-3 mb-2">
                    <div class="${colors.iconBg} p-2 rounded-lg">
                        <i class="fas ${task.icon} ${colors.iconText} text-xl"></i>
                    </div>
                    <span class="text-2xl font-bold text-gray-800">${task.count}</span>
                </div>
                <p class="font-semibold text-gray-800 mb-1">${task.title}</p>
                <p class="text-sm text-gray-600">${task.description}</p>
            </a>
        `}).join('');
    }

    private loadPerformanceMetrics() {
        dashboardApi.getPerformanceMetrics()
            .then((data: any) => {
                this.updateMetric('revenue', data.revenue || { current: 0, previous: 0 });
                this.updateMetric('projects', data.projects || { current: 0, previous: 0 });
                this.updateMetric('quotations', data.quotations || { current: 0, previous: 0 });

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
                ['revenue', 'projects', 'quotations'].forEach(type => {
                    this.updateMetric(type, { current: 0, previous: 0 });
                });
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
            if (type === 'revenue') {
                currentEl.textContent = `₹${(window as any).formatIndian(current)}`;
            } else {
                currentEl.textContent = (window as any).formatIndian(current);
            }
        }

        const trendElement = document.getElementById(`${type}-trend`);
        if (trendElement) {
            trendElement.className = `text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`;
            trendElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(change)}%
            `;
        }
    }

    private refreshActivity() {
        const container = document.getElementById('recent-activity');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p>Refreshing...</p>
                </div>
            `;
        }
        this.loadRecentActivity();
    }

    private refreshTasks() {
        const container = document.getElementById('pending-tasks');
        if (container) {
            container.innerHTML = `
                <div class="col-span-3 text-center text-gray-500 py-8">
                    <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p>Refreshing...</p>
                </div>
            `;
        }
        this.loadPendingTasks();
    }

    private startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.loadRecentActivity();
            this.loadStockAlerts();
            this.loadPendingTasks();
            this.loadPerformanceMetrics();
            this.loadOverview();
        }, 300000); // 5 minutes
    }
}

declare var dashboardUI: any;
(window as any).dashboardUI = new DashboardUI();
