document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate overview data
    fetch('/analytics/overview')
        .then(res => res.json())
        .then(data => {
            animateCounter("project-count", data.totalProjects);
            animateCounter("quotation-count", data.totalQuotations);
            animateCounter("earned-count", data.totalEarned, true);
            animateCounter("unpaid-count", data.totalUnpaid);
            animateCounter("expenditure-count", data.totalExpenditure, true);
            animateCounter("remaining-services-count", data.remainingServices);
        })
        .catch(err => {
            console.error("Error fetching analytics:", err);
        });
});

// ---------------------- Animated Counter Function ----------------------
function animateCounter(
  id,
  end,
  isCurrency = false,
  duration = 1000,
  delay = 10
) {
  const el = document.getElementById(id);
  if (end === 0) {
    el.textContent = isCurrency ? `₹${formatIndian(0)}` : formatIndian(0);
    return;
  }

  setTimeout(() => {
    const t0 = performance.now();
    const run = now => {
      const p = Math.min((now - t0) / duration, 1);   // 0 → 1
      const value = end * p;

      el.textContent = isCurrency
        ? `₹${formatIndian(value, 2)}`                // ₹ 12,34,560.75
        : formatIndian(Math.floor(value));            // 12,34,561

      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, delay);
}



// Add this to dashboard.js
function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, dateOptions);
    document.getElementById('current-time').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ---------------------- Recent Activity ----------------------
function loadRecentActivity() {
    Promise.all([
        fetch('/quotation/all').then(res => res.json()).catch(() => []),
        fetch('/invoice/all').then(res => res.json()).catch(() => []),
        fetch('/waybill/all').then(res => res.json()).catch(() => []),
        fetch('/service/all').then(res => res.json()).catch(() => [])
    ])
    .then(([quotations, invoices, waybills, services]) => {
        const activities = [];
        
        // Process quotations
        quotations.slice(0, 5).forEach(q => {
            activities.push({
                type: 'quotation',
                icon: 'fa-file-alt',
                color: 'blue',
                title: `Quotation #${q.quotation_id || 'N/A'}`,
                description: q.project_name || 'No project name',
                time: q.created_at || q.date,
                link: '../quotation/quotation.html'
            });
        });

        // Process invoices
        invoices.slice(0, 5).forEach(i => {
            activities.push({
                type: 'invoice',
                icon: 'fa-file-invoice',
                color: 'green',
                title: `Invoice #${i.invoice_id || 'N/A'}`,
                description: i.project_name || 'No project name',
                time: i.created_at || i.date,
                link: '../invoice/invoice.html'
            });
        });

        // Process waybills
        waybills.slice(0, 5).forEach(w => {
            activities.push({
                type: 'waybill',
                icon: 'fa-truck',
                color: 'purple',
                title: `Waybill #${w.waybill_id || 'N/A'}`,
                description: w.project_name || 'No project name',
                time: w.created_at || w.date,
                link: '../waybill/wayBill.html'
            });
        });

        // Process services
        services.slice(0, 5).forEach(s => {
            activities.push({
                type: 'service',
                icon: 'fa-wrench',
                color: 'teal',
                title: `Service #${s.service_id || 'N/A'}`,
                description: s.project_name || s.customer_name || 'No description',
                time: s.created_at || s.date,
                link: '../service/service.html'
            });
        });

        // Sort by time (most recent first)
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Display only top 10
        displayRecentActivity(activities.slice(0, 10));
    })
    .catch(err => {
        console.error('Error loading recent activity:', err);
        document.getElementById('recent-activity').innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                <p>Failed to load recent activity</p>
            </div>
        `;
    });
}

function displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity');
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-l-4 border-${activity.color}-500">
            <div class="bg-${activity.color}-100 p-2 rounded-lg">
                <i class="fas ${activity.icon} text-${activity.color}-600"></i>
            </div>
            <div class="flex-1 min-w-0">
                <a href="${activity.link}" class="font-medium text-gray-800 hover:text-blue-600">${activity.title}</a>
                <p class="text-sm text-gray-600 truncate">${activity.description}</p>
                <p class="text-xs text-gray-400 mt-1">
                    <i class="far fa-clock"></i> ${formatTimeAgo(activity.time)}
                </p>
            </div>
        </div>
    `).join('');
}

function formatTimeAgo(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    const past = new Date(date);
    const seconds = Math.floor((now - past) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return past.toLocaleDateString();
}

// ---------------------- Stock Alerts ----------------------
function loadStockAlerts() {
    fetch('/stock/all')
        .then(res => res.json())
        .then(items => {
            const lowStock = items.filter(item => {
                const qty = parseInt(item.quantity) || 0;
                const minQty = parseInt(item.min_quantity) || 0;
                return qty <= minQty;
            });

            displayStockAlerts(lowStock);
        })
        .catch(err => {
            console.error('Error loading stock alerts:', err);
            document.getElementById('stock-alerts').innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                    <p>Failed to load stock alerts</p>
                </div>
            `;
        });
}

function displayStockAlerts(items) {
    const container = document.getElementById('stock-alerts');
    
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
        const qty = parseInt(item.quantity) || 0;
        const isOutOfStock = qty === 0;
        const alertColor = isOutOfStock ? 'red' : 'yellow';
        
        return `
            <div class="flex items-center justify-between p-3 bg-${alertColor}-50 border border-${alertColor}-200 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="bg-${alertColor}-100 p-2 rounded-lg">
                        <i class="fas ${isOutOfStock ? 'fa-times-circle' : 'fa-exclamation-triangle'} text-${alertColor}-600"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${item.item_name || 'Unknown Item'}</p>
                        <p class="text-sm text-gray-600">
                            ${isOutOfStock ? '<span class="text-red-600 font-semibold">Out of Stock</span>' : `Only ${qty} left`}
                        </p>
                    </div>
                </div>
                <a href="../stock/stock.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Restock →
                </a>
            </div>
        `;
    }).join('');
}

// ---------------------- Pending Tasks ----------------------
function loadPendingTasks() {
    Promise.all([
        fetch('/invoice/all').then(res => res.json()).catch(() => []),
        fetch('/service/all').then(res => res.json()).catch(() => [])
    ])
    .then(([invoices, services]) => {
        const tasks = [];

        // Unpaid invoices
        const unpaidInvoices = invoices.filter(i => i.payment_status !== 'Paid').length;
        if (unpaidInvoices > 0) {
            tasks.push({
                icon: 'fa-rupee-sign',
                color: 'red',
                title: 'Pending Payments',
                count: unpaidInvoices,
                description: `${unpaidInvoices} invoice${unpaidInvoices > 1 ? 's' : ''} awaiting payment`,
                link: '../invoice/invoice.html'
            });
        }

        // Pending services
        const pendingServices = services.filter(s => s.status !== 'Completed').length;
        if (pendingServices > 0) {
            tasks.push({
                icon: 'fa-tools',
                color: 'orange',
                title: 'Pending Services',
                count: pendingServices,
                description: `${pendingServices} service${pendingServices > 1 ? 's' : ''} to complete`,
                link: '../service/service.html'
            });
        }

        // Low stock count
        fetch('/stock/all')
            .then(res => res.json())
            .then(stockItems => {
                const lowStockCount = stockItems.filter(item => {
                    const qty = parseInt(item.quantity) || 0;
                    const minQty = parseInt(item.min_quantity) || 0;
                    return qty <= minQty;
                }).length;

                if (lowStockCount > 0) {
                    tasks.push({
                        icon: 'fa-box',
                        color: 'yellow',
                        title: 'Low Stock Items',
                        count: lowStockCount,
                        description: `${lowStockCount} item${lowStockCount > 1 ? 's' : ''} need restocking`,
                        link: '../stock/stock.html'
                    });
                }

                displayPendingTasks(tasks);
            });
    })
    .catch(err => {
        console.error('Error loading pending tasks:', err);
        document.getElementById('pending-tasks').innerHTML = `
            <div class="col-span-3 text-center text-red-500 py-8">
                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                <p>Failed to load pending tasks</p>
            </div>
        `;
    });
}

function displayPendingTasks(tasks) {
    const container = document.getElementById('pending-tasks');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="col-span-3 text-center text-gray-500 py-8">
                <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                <p>No pending tasks! All caught up.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <a href="${task.link}" class="block p-4 bg-${task.color}-50 border-l-4 border-${task.color}-500 rounded-lg hover:bg-${task.color}-100 transition-colors">
            <div class="flex items-center gap-3 mb-2">
                <div class="bg-${task.color}-100 p-2 rounded-lg">
                    <i class="fas ${task.icon} text-${task.color}-600 text-xl"></i>
                </div>
                <span class="text-2xl font-bold text-gray-800">${task.count}</span>
            </div>
            <p class="font-semibold text-gray-800 mb-1">${task.title}</p>
            <p class="text-sm text-gray-600">${task.description}</p>
        </a>
    `).join('');
}

// ---------------------- Performance Metrics ----------------------
function loadPerformanceMetrics() {
    fetch('/analytics/comparison')
        .then(res => res.json())
        .then(data => {
            // Update revenue
            updateMetric('revenue', data.revenue);
            
            // Update projects
            updateMetric('projects', data.projects);
            
            // Update quotations
            updateMetric('quotations', data.quotations);
            
            // Update conversion rate
            const conversionRate = data.quotations.current > 0 
                ? Math.round((data.projects.current / data.quotations.current) * 100)
                : 0;
            document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
        })
        .catch(err => {
            console.error('Error loading performance metrics:', err);
        });
}

function updateMetric(type, data) {
    const current = data.current || 0;
    const previous = data.previous || 0;
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    const isPositive = change >= 0;

    // Update current value
    if (type === 'revenue') {
        document.getElementById(`${type}-current`).textContent = `₹${formatIndian(current)}`;
    } else {
        document.getElementById(`${type}-current`).textContent = formatIndian(current);
    }

    // Update trend
    const trendElement = document.getElementById(`${type}-trend`);
    trendElement.className = `text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`;
    trendElement.innerHTML = `
        <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(change)}%
    `;
}

// ---------------------- Refresh Functions ----------------------
function refreshActivity() {
    document.getElementById('recent-activity').innerHTML = `
        <div class="text-center text-gray-500 py-8">
            <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
            <p>Refreshing...</p>
        </div>
    `;
    loadRecentActivity();
}

function refreshTasks() {
    document.getElementById('pending-tasks').innerHTML = `
        <div class="col-span-3 text-center text-gray-500 py-8">
            <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
            <p>Refreshing...</p>
        </div>
    `;
    loadPendingTasks();
}

// ---------------------- Initialize All Sections ----------------------
document.addEventListener('DOMContentLoaded', () => {
    loadRecentActivity();
    loadStockAlerts();
    loadPendingTasks();
    loadPerformanceMetrics();
});