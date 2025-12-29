/**
 * Reports Module - Main Controller
 * Handles report selection, navigation, and shared functionality
 */

// Current active report section
let currentReportSection = 'home';

// Current report filter (all, stock, gst, data_worksheet)
let currentReportFilter = 'all';

/**
 * Initialize reports module on page load
 */
document.addEventListener('DOMContentLoaded', function () {
    initReports();
});

/**
 * Initialize reports module
 */
function initReports() {
    // Set up report card click handlers
    setupReportCards();

    // Set up back button handlers
    setupBackButtons();

    // Set up home button
    setupHomeButton();

    // Load recent reports
    loadRecentReports();

    // Set up refresh button
    document.getElementById('refresh-reports')?.addEventListener('click', () => loadRecentReports());

    // Set up delete all reports button
    document.getElementById('delete-all-reports')?.addEventListener('click', deleteAllReports);

    // Set up filter tabs
    setupFilterTabs();
}

/**
 * Set up filter tab click handlers
 */
function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.report-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const filter = this.getAttribute('data-filter');
            setReportFilter(filter);
        });
    });
}

/**
 * Set the current report filter and reload reports
 * @param {string} filter - Filter type (all, stock, gst, data_worksheet)
 */
function setReportFilter(filter) {
    currentReportFilter = filter;

    // Update tab styling
    const filterTabs = document.querySelectorAll('.report-filter-tab');
    filterTabs.forEach(tab => {
        if (tab.getAttribute('data-filter') === filter) {
            tab.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            tab.classList.add('bg-indigo-600', 'text-white');
        } else {
            tab.classList.remove('bg-indigo-600', 'text-white');
            tab.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
        }
    });

    // Update delete button text
    updateDeleteButtonText();

    // Reload reports with new filter
    loadRecentReports();
}

/**
 * Update the delete button text based on current filter
 */
function updateDeleteButtonText() {
    const deleteText = document.getElementById('delete-all-text');
    if (!deleteText) return;

    const filterLabels = {
        'all': 'Delete All',
        'stock': 'Delete Stock',
        'gst': 'Delete GST',
        'data_worksheet': 'Delete Worksheets',
        'purchase_gst': 'Delete Purchase GST'
    };

    deleteText.textContent = filterLabels[currentReportFilter] || 'Delete All';
}

/**
 * Set up report card click handlers
 */
function setupReportCards() {
    const reportCards = document.querySelectorAll('.report-card');
    reportCards.forEach(card => {
        card.addEventListener('click', function () {
            const reportType = this.getAttribute('data-report');
            showReportSection(reportType);
        });
    });
}

/**
 * Set up back button handlers
 */
function setupBackButtons() {
    document.getElementById('back-to-reports-stock')?.addEventListener('click', () => showReportSection('home'));
    document.getElementById('back-to-reports-gst')?.addEventListener('click', () => showReportSection('home'));
    document.getElementById('back-to-reports-worksheet')?.addEventListener('click', () => showReportSection('home'));
    document.getElementById('back-to-reports-purchase-gst')?.addEventListener('click', () => showReportSection('home'));
}

/**
 * Set up home button
 */
function setupHomeButton() {
    document.getElementById('home-btn')?.addEventListener('click', () => {
        window.location = '/reports';
    });
}

/**
 * Show a specific report section
 * @param {string} reportType - Type of report to show (home, stock, gst, dataWorksheet)
 */
function showReportSection(reportType) {
    // Hide all sections
    document.getElementById('reports-home').style.display = 'none';
    document.getElementById('stock-report-section').style.display = 'none';
    document.getElementById('gst-report-section').style.display = 'none';
    document.getElementById('data-worksheet-section').style.display = 'none';
    document.getElementById('purchase-gst-report-section').style.display = 'none';

    // Show the selected section
    switch (reportType) {
        case 'stock':
            document.getElementById('stock-report-section').style.display = 'block';
            initStockReport();
            break;
        case 'gst':
            document.getElementById('gst-report-section').style.display = 'block';
            initGSTReport();
            break;
        case 'dataWorksheet':
        case 'data_worksheet':
            document.getElementById('data-worksheet-section').style.display = 'block';
            initDataWorksheetReport();
            break;
        case 'purchaseGst':
        case 'purchase_gst':
            document.getElementById('purchase-gst-report-section').style.display = 'block';
            initPurchaseGSTReport();
            break;
        default:
            document.getElementById('reports-home').style.display = 'block';
            loadRecentReports();
    }

    currentReportSection = reportType;
}

/**
 * Load recent reports from the server
 */
/**
 * Get report title based on type
 * @param {string} reportType 
 * @returns {string} Human-readable title
 */
function getReportTitle(report) {
    // If report has a custom name (saved from backend), use it
    if (report.report_name) return report.report_name;

    // Fallback to type-based title
    const titles = {
        'stock': 'Stock Report',
        'gst': 'Monthly GST Report',
        'data_worksheet': 'Data Worksheet'
    };
    return titles[report.report_type] || 'Report';
}

/**
 * Load recent reports from the server
 */
async function loadRecentReports() {
    const container = document.getElementById('recent-reports');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                <p class="text-gray-500 mt-2">Loading recent reports...</p>
            </div>
        `;

        // Build URL with filter parameter
        let url = '/reports/saved';
        if (currentReportFilter && currentReportFilter !== 'all') {
            url += `?type=${currentReportFilter}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.reports && data.reports.length > 0) {
            container.innerHTML = data.reports.map(report => {
                const dateObj = new Date(report.generated_at || report.created_at);
                const dateStr = dateObj.toLocaleDateString('en-IN');
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                return `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="bg-${getReportColor(report.report_type)}-100 p-3 rounded-lg">
                            <i class="fas ${getReportIcon(report.report_type)} text-${getReportColor(report.report_type)}-600 text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800">${getReportTitle(report)}</h4>
                            <p class="text-sm text-gray-500">Generated on: ${dateStr}, ${timeStr}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="view-report-btn bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700" data-id="${report._id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="delete-report-btn bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200" data-id="${report._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `}).join('');

            // Add event delegation for buttons
            container.onclick = function (e) {
                const viewBtn = e.target.closest('.view-report-btn');
                const deleteBtn = e.target.closest('.delete-report-btn');

                if (viewBtn) {
                    viewReport(viewBtn.getAttribute('data-id'));
                } else if (deleteBtn) {
                    deleteReport(deleteBtn.getAttribute('data-id'));
                }
            };
        } else {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-file-alt text-4xl text-gray-300 mb-3"></i>
                    <p>No recent reports found</p>
                    <p class="text-sm">Generate a report to see it here</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent reports:', error);
        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                <p>Failed to load recent reports</p>
                <button onclick="loadRecentReports()" class="mt-2 text-blue-600 hover:underline">Retry</button>
            </div>
        `;
    }
}

/**
 * Get report color based on type
 * @param {string} reportType 
 * @returns {string} Tailwind color name
 */
function getReportColor(reportType) {
    const colors = {
        'stock': 'blue',
        'gst': 'green',
        'data_worksheet': 'purple',
        'purchase_gst': 'orange'
    };
    return colors[reportType] || 'gray';
}

/**
 * Get report icon based on type
 * @param {string} reportType 
 * @returns {string} FontAwesome icon class
 */
function getReportIcon(reportType) {
    const icons = {
        'stock': 'fa-boxes',
        'gst': 'fa-file-invoice-dollar',
        'data_worksheet': 'fa-solar-panel',
        'purchase_gst': 'fa-shopping-cart'
    };
    return icons[reportType] || 'fa-file-alt';
}

/**
 * View a saved report
 * @param {string} reportId 
 */
async function viewReport(reportId) {
    try {
        const response = await fetch(`/reports/${reportId}`);
        const data = await response.json();

        if (data.success && data.report) {
            const report = data.report;
            const type = report.report_type;

            // Show report based on type - use type directly since showReportSection handles both formats
            showReportSection(type);

            // Populate data based on type
            if (type === 'gst' && typeof loadSavedGSTReport === 'function') {
                loadSavedGSTReport(report);
            } else if (type === 'stock' && typeof loadSavedStockReport === 'function') {
                loadSavedStockReport(report);
            } else if (type === 'data_worksheet' && typeof loadWorksheet === 'function') {
                loadWorksheet(reportId);
            } else if (type === 'purchase_gst' && typeof loadSavedPurchaseGSTReport === 'function') {
                loadSavedPurchaseGSTReport(report);
            }
        } else {
            showNotification('Report not found', 'error');
        }
    } catch (error) {
        console.error('Error viewing report:', error);
        showNotification('Failed to load report', 'error');
    }
}

/**
 * Delete a saved report
 * @param {string} reportId 
 */
window.deleteReport = function (reportId) {
    showConfirm('Are you sure you want to delete this report?', async (response) => {
        if (response === 'Yes') {
            try {
                const res = await fetch(`/reports/${reportId}`, {
                    method: 'DELETE'
                });
                const data = await res.json();

                if (data.success) {
                    showNotification('Report deleted successfully', 'success');
                    loadRecentReports();
                } else {
                    showNotification('Failed to delete report', 'error');
                }
            } catch (error) {
                console.error('Error deleting report:', error);
                showNotification('Failed to delete report', 'error');
            }
        }
    });
};

/**
 * Delete all saved reports (contextual based on current filter)
 */
async function deleteAllReports() {
    const filterLabels = {
        'all': 'ALL reports',
        'stock': 'all Stock reports',
        'gst': 'all GST reports',
        'data_worksheet': 'all Worksheet reports',
        'purchase_gst': 'all Purchase GST reports'
    };

    const confirmMessage = `Are you sure you want to delete ${filterLabels[currentReportFilter] || 'ALL reports'}? This action cannot be undone.`;

    showConfirm(confirmMessage, async (response) => {
        if (response === 'Yes') {
            try {
                // Build URL with filter parameter
                let url = '/reports/all';
                if (currentReportFilter && currentReportFilter !== 'all') {
                    url += `?type=${currentReportFilter}`;
                }

                const res = await fetch(url, {
                    method: 'DELETE'
                });
                const data = await res.json();

                if (data.success) {
                    showNotification(`Successfully deleted ${data.deletedCount} report(s)`, 'success');
                    loadRecentReports();
                } else {
                    showNotification('Failed to delete reports', 'error');
                }
            } catch (error) {
                console.error('Error deleting reports:', error);
                showNotification('Failed to delete reports', 'error');
            }
        }
    });
}

// Make functions global for inline onclick handlers
window.viewReport = viewReport;
window.loadRecentReports = loadRecentReports;
window.deleteAllReports = deleteAllReports;

/**
 * Show a notification message
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
    // Use Electron alert if available, otherwise use browser alert
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white font-medium`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

/**
 * Generate printable HTML for a report
 * @param {string} title - Report title
 * @param {string} content - Report content HTML
 * @param {Object} options - Additional options
 * @returns {string} Printable HTML document
 */
function generatePrintableReport(title, content, options = {}) {
    const today = new Date().toLocaleDateString('en-IN');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background: white;
                color: #333;
            }
            
            .report-container {
                max-width: 1000px;
                margin: 0 auto;
            }
            
            .report-header {
                text-align: center;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }
            
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 5px;
            }
            
            .company-address {
                font-size: 12px;
                color: #666;
            }
            
            .report-title {
                font-size: 20px;
                font-weight: bold;
                margin: 20px 0 10px;
                color: #333;
            }
            
            .report-date {
                font-size: 12px;
                color: #666;
            }
            
            .report-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .report-table th,
            .report-table td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
            }
            
            .report-table th {
                background-color: #f3f4f6;
                font-weight: 600;
                color: #374151;
            }
            
            .report-table tr:nth-child(even) {
                background-color: #f9fafb;
            }
            
            .report-summary {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                padding: 15px;
                background: #f3f4f6;
                border-radius: 8px;
            }
            
            .summary-item {
                text-align: center;
            }
            
            .summary-label {
                font-size: 12px;
                color: #666;
            }
            
            .summary-value {
                font-size: 18px;
                font-weight: bold;
                color: #1e40af;
            }
            
            .report-footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }
            
            .text-right {
                text-align: right;
            }
            
            .text-center {
                text-align: center;
            }
            
            .font-bold {
                font-weight: bold;
            }
            
            .total-row {
                background-color: #e5e7eb !important;
                font-weight: bold;
            }
            
            @media print {
                body {
                    padding: 0;
                }
                
                .report-container {
                    max-width: 100%;
                }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="report-header">
                <div class="company-name">SHRESHT SYSTEMS</div>
                <div class="company-address">
                    3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113<br>
                    Ph: 7204657707 / 9901730305 | Email: shreshtsystems@gmail.com<br>
                    GSTIN: 29AGCPN4093N1ZS
                </div>
                <div class="report-title">${title}</div>
                <div class="report-date">Generated on: ${today}</div>
                ${options.subtitle ? `<div class="report-date">${options.subtitle}</div>` : ''}
            </div>
            
            ${content}
            
            <div class="report-footer">
                <p>This is a computer-generated report from Shresht Systems Management System</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Print a report using Electron IPC
 * @param {string} htmlContent 
 * @param {string} filename 
 */
function printReport(htmlContent, filename) {
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(htmlContent, 'print', filename);
    } else {
        // Fallback for browser
        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }
}

/**
 * Save a report as PDF using Electron IPC
 * @param {string} htmlContent 
 * @param {string} filename 
 */
async function saveReportPDF(htmlContent, filename) {
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        try {
            const result = await window.electronAPI.handlePrintEvent(htmlContent, 'savePDF', filename);
            if (result && result.success) {
                showNotification('PDF saved successfully!', 'success');
            } else if (result && result.error) {
                showNotification(`Failed to save PDF: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('PDF save error:', error);
            showNotification('Failed to save PDF', 'error');
        }
    } else {
        showNotification('PDF save requires Electron environment', 'error');
    }
}

/**
 * Format currency in Indian format
 * @param {number} amount 
 * @returns {string} Formatted amount
 */
function formatCurrency(amount) {
    if (typeof formatIndian === 'function') {
        return '₹' + formatIndian(amount, 2);
    }
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
