// ---------------------- Utility Functions ----------------------
// NOTE: formatIndian has been moved to public/js/shared/utils.js
// It is now available globally via window.formatIndian

// Retry helper function for API calls
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Fetch attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Show error message helper
function showErrorMessage(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Retry
                </button>
            </div>
        `;
    }
}

// ---------------------- Load Dashboard Data on Page Load ----------------------
document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate overview data
    fetchWithRetry('/analytics/overview')
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
            // Set all counters to 0 on error
            ['project-count', 'quotation-count', 'earned-count', 'unpaid-count', 'expenditure-count', 'remaining-services-count'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0';
            });
            showAlert('Failed to load dashboard statistics. Please refresh the page.');
        });
    
    // Load all dashboard sections
    loadRecentActivity();
    loadStockAlerts();
    loadPendingTasks();
    loadPerformanceMetrics();
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
        fetchWithRetry('/quotation/all').catch(() => []),
        fetchWithRetry('/invoice/all').catch(() => []),
        fetchWithRetry('/waybill/all').catch(() => []),
        fetchWithRetry('/service/all').catch(() => [])
    ])
    .then(([quotations, invoices, waybills, services]) => {
        const activities = [];
        
        // Process quotations
        (quotations || []).slice(0, 5).forEach(q => {
            activities.push({
                type: 'quotation',
                icon: 'fa-file-alt',
                color: 'blue',
                title: `Quotation #${q.quotation_id || 'N/A'}`,
                description: q.project_name || 'No project name',
                time: q.created_at || q.date || new Date(),
                link: '../quotation/quotation.html'
            });
        });

        // Process invoices
        (invoices || []).slice(0, 5).forEach(i => {
            activities.push({
                type: 'invoice',
                icon: 'fa-file-invoice',
                color: 'green',
                title: `Invoice #${i.invoice_id || 'N/A'}`,
                description: i.project_name || 'No project name',
                time: i.created_at || i.date || new Date(),
                link: '../invoice/invoice.html'
            });
        });

        // Process waybills
        (waybills || []).slice(0, 5).forEach(w => {
            activities.push({
                type: 'waybill',
                icon: 'fa-truck',
                color: 'purple',
                title: `Waybill #${w.waybill_id || 'N/A'}`,
                description: w.project_name || 'No project name',
                time: w.created_at || w.date || new Date(),
                link: '../waybill/wayBill.html'
            });
        });

        // Process services
        (services || []).slice(0, 5).forEach(s => {
            activities.push({
                type: 'service',
                icon: 'fa-wrench',
                color: 'teal',
                title: `Service #${s.service_id || 'N/A'}`,
                description: s.project_name || s.customer_name || 'No description',
                time: s.created_at || s.date || new Date(),
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
        showErrorMessage('recent-activity', 'Failed to load recent activity');
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

    const colorMap = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
        green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
        teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-500' }
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
                    <i class="far fa-clock"></i> ${formatTimeAgo(activity.time)}
                </p>
            </div>
        </div>
    `}).join('');
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
    fetchWithRetry('/stock/all')
        .then(items => {
            const lowStock = (items || []).filter(item => {
                const qty = parseInt(item.quantity) || 0;
                const minQty = parseInt(item.min_quantity) || 0;
                return qty <= minQty;
            });

            displayStockAlerts(lowStock);
        })
        .catch(err => {
            console.error('Error loading stock alerts:', err);
            showErrorMessage('stock-alerts', 'Failed to load stock alerts');
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
        
        if (isOutOfStock) {
            return `
                <div class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="bg-red-100 p-2 rounded-lg">
                            <i class="fas fa-times-circle text-red-600"></i>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${item.item_name || 'Unknown Item'}</p>
                            <p class="text-sm text-gray-600">
                                <span class="text-red-600 font-semibold">Out of Stock</span>
                            </p>
                        </div>
                    </div>
                    <a href="../stock/stock.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
                            <p class="font-medium text-gray-800">${item.item_name || 'Unknown Item'}</p>
                            <p class="text-sm text-gray-600">Only ${qty} left</p>
                        </div>
                    </div>
                    <a href="../stock/stock.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Restock →
                    </a>
                </div>
            `;
        }
    }).join('');
}

// ---------------------- Pending Tasks ----------------------
function loadPendingTasks() {
    Promise.all([
        fetchWithRetry('/invoice/all').catch(() => []),
        fetchWithRetry('/service/all').catch(() => []),
        fetchWithRetry('/stock/all').catch(() => [])
    ])
    .then(([invoices, services, stockItems]) => {
        const tasks = [];

        // Unpaid invoices
        const unpaidInvoices = (invoices || []).filter(i => i.payment_status !== 'Paid').length;
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
        const pendingServices = (services || []).filter(s => s.status !== 'Completed').length;
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
        const lowStockCount = (stockItems || []).filter(item => {
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
    })
    .catch(err => {
        console.error('Error loading pending tasks:', err);
        showErrorMessage('pending-tasks', 'Failed to load pending tasks');
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

    const colorMap = {
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

// ---------------------- Performance Metrics ----------------------
function loadPerformanceMetrics() {
    fetchWithRetry('/analytics/comparison')
        .then(data => {
            // Update revenue
            updateMetric('revenue', data.revenue || { current: 0, previous: 0 });
            
            // Update projects
            updateMetric('projects', data.projects || { current: 0, previous: 0 });
            
            // Update quotations
            updateMetric('quotations', data.quotations || { current: 0, previous: 0 });
            
            // Update conversion rate
            const quotationsCurrent = data.quotations?.current || 0;
            const projectsCurrent = data.projects?.current || 0;
            const conversionRate = quotationsCurrent > 0 
                ? Math.round((projectsCurrent / quotationsCurrent) * 100)
                : 0;
            document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
        })
        .catch(err => {
            console.error('Error loading performance metrics:', err);
            // Set default values on error
            ['revenue', 'projects', 'quotations'].forEach(type => {
                updateMetric(type, { current: 0, previous: 0 });
            });
            const conversionEl = document.getElementById('conversion-rate');
            if (conversionEl) conversionEl.textContent = '0%';
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

// ---------------------- Auto-refresh ----------------------
// Auto-refresh dashboard data every 5 minutes
let refreshInterval;

function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh every 5 minutes (300000 ms)
    refreshInterval = setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadRecentActivity();
        loadStockAlerts();
        loadPendingTasks();
        loadPerformanceMetrics();
        
        // Refresh overview statistics
        fetchWithRetry('/analytics/overview')
            .then(data => {
                animateCounter("project-count", data.totalProjects);
                animateCounter("quotation-count", data.totalQuotations);
                animateCounter("earned-count", data.totalEarned, true);
                animateCounter("unpaid-count", data.totalUnpaid);
                animateCounter("expenditure-count", data.totalExpenditure, true);
                animateCounter("remaining-services-count", data.remainingServices);
            })
            .catch(err => console.error("Error auto-refreshing analytics:", err));
    }, 300000); // 5 minutes
}

// Start auto-refresh when page loads
document.addEventListener("DOMContentLoaded", () => {
    startAutoRefresh();
});

// Stop auto-refresh when page is hidden (save resources)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    } else {
        startAutoRefresh();
    }
});