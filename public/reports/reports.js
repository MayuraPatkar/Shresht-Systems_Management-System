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

    // Set up delete all reports button
    document.getElementById('delete-all-reports')?.addEventListener('click', deleteAllReports);

    // Set up filter tabs
    setupFilterTabs();

    // Set up keyboard shortcuts
    setupKeyboardShortcuts();

    // Check for URL parameter to auto-view a specific report
    const urlParams = new URLSearchParams(window.location.search);
    const viewReportId = urlParams.get('view');
    if (viewReportId) {
        // Auto-view the report after a short delay to ensure everything is loaded
        setTimeout(() => {
            viewReport(viewReportId);
        }, 100);
    }
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
        'all': 'Delete All Reports',
        'stock': 'Delete Stock Reports',
        'gst': 'Delete Invoice GST Reports',
        'data_worksheet': 'Delete Worksheets',
        'purchase_gst': 'Delete Purchase GST Reports'
    };

    deleteText.textContent = filterLabels[currentReportFilter] || 'Delete All';
}

/**
 * Set up report card click handlers
 */
function setupReportCards() {
    // We now attach listeners to the buttons specifically, not the whole card
    const generateButtons = document.querySelectorAll('.generate-btn');

    generateButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent bubbling
            // Find the parent card to get the report type
            const card = this.closest('.report-card');
            if (card) {
                const reportType = card.getAttribute('data-report');
                showReportSection(reportType);
            }
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

    let activeSection = null;

    // Show the selected section
    switch (reportType) {
        case 'stock':
            activeSection = document.getElementById('stock-report-section');
            activeSection.style.display = 'block';
            initStockReport();
            break;
        case 'gst':
            activeSection = document.getElementById('gst-report-section');
            activeSection.style.display = 'block';
            initGSTReport();
            break;
        case 'dataWorksheet':
        case 'data_worksheet':
            activeSection = document.getElementById('data-worksheet-section');
            activeSection.style.display = 'block';
            initDataWorksheetReport();
            break;
        case 'purchaseGst':
        case 'purchase_gst':
            activeSection = document.getElementById('purchase-gst-report-section');
            activeSection.style.display = 'block';
            initPurchaseGSTReport();
            break;
        default:
            document.getElementById('reports-home').style.display = 'block';
            loadRecentReports();
    }

    if (activeSection) {
        const firstInput = activeSection.querySelector('input, select, textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
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
 * Get report details string (date range, filters)
 * @param {Object} report 
 * @returns {string} Details string
 */
function getReportDetails(report) {
    // Placeholder function to add report details and future extensibility if needed
    return '';
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
                const dateStr = window.formatDateDisplay ? window.formatDateDisplay(dateObj) : dateObj.toLocaleDateString('en-IN');
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const reportDetails = getReportDetails(report);

                return `
                <div class="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 group">
                    <div class="flex items-center gap-5 flex-1">
                        <div class="bg-${getReportColor(report.report_type)}-50 p-4 rounded-xl border-2 border-${getReportColor(report.report_type)}-100">
                            <i class="fas ${getReportIcon(report.report_type)} text-${getReportColor(report.report_type)}-600 text-xl"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors mb-2">${getReportTitle(report)}</h4>
                            <div class="flex items-center gap-4 text-sm">
                                ${reportDetails ? `
                                <div class="flex items-center gap-2 text-gray-700">
                                    <i class="fas fa-filter text-gray-400 text-xs"></i>
                                    <span class="font-medium">${reportDetails}</span>
                                </div>
                                <span class="text-gray-300">•</span>
                                ` : ''}
                                <div class="flex items-center gap-2 text-gray-500">
                                    <i class="fas fa-calendar-alt text-gray-400 text-xs"></i>
                                    <span>${dateStr}</span>
                                </div>
                                <div class="flex items-center gap-2 text-gray-500">
                                    <i class="fas fa-clock text-gray-400 text-xs"></i>
                                    <span>${timeStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 ml-6">
                        <button class="view-report-btn flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md" data-id="${report._id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="delete-report-btn text-gray-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-all" data-id="${report._id}" title="Delete Report">
                            <i class="fas fa-trash-alt text-base"></i>
                        </button>
                    </div>
                </div>
            `;
            }).join('');

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
                loadWorksheet(report);
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
        'gst': 'all Invoice GST reports',
        'data_worksheet': 'all Worksheet reports',
        'purchase_gst': 'all Purchase GST reports'
    };

    const noReportsLabels = {
        'all': 'No reports to delete',
        'stock': 'No Stock reports to delete',
        'gst': 'No Invoice GST reports to delete',
        'data_worksheet': 'No Worksheets to delete',
        'purchase_gst': 'No Purchase GST reports to delete'
    };

    try {
        // First check if there are any reports to delete
        let checkUrl = '/reports/saved';
        if (currentReportFilter && currentReportFilter !== 'all') {
            checkUrl += `?type=${currentReportFilter}`;
        }

        const checkRes = await fetch(checkUrl);
        const checkData = await checkRes.json();

        if (!checkData.success || !checkData.reports || checkData.reports.length === 0) {
            showNotification(noReportsLabels[currentReportFilter] || 'No reports to delete', 'info');
            return;
        }

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
    } catch (error) {
        console.error('Error checking reports:', error);
        showNotification('Failed to check reports', 'error');
    }
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
    const today = window.formatDateDisplay ? window.formatDateDisplay(new Date()) : new Date().toLocaleDateString('en-IN');

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
            if (result && result.error) {
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

/**
 * Setup keyboard shortcuts
 */
/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    // Open keyboard shortcuts modal
    document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('keyboardShortcutsModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('closeKeyboardHelpBtn')?.focus();
        }
    });

    // Close modal handlers
    document.getElementById('closeKeyboardModalBtn')?.addEventListener('click', closeKeyboardModal);
    document.getElementById('closeKeyboardHelpBtn')?.addEventListener('click', closeKeyboardModal);

    function closeKeyboardModal() {
        document.getElementById('keyboardShortcutsModal')?.classList.add('hidden');
    }

    // Global keydown listener with capture phase to intercept Esc before global scripts
    document.addEventListener('keydown', function (e) {
        // Ignore if modal is open (except for Esc/?)
        const modal = document.getElementById('keyboardShortcutsModal');
        const isModalOpen = modal && !modal.classList.contains('hidden');

        if (isModalOpen) {
            if (e.key === 'Escape' || e.key === '?') {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation to global scripts
                closeKeyboardModal();
            }
            return; // Don't process other shortcuts if modal is open
        }

        // Help Modal (?)
        if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            document.getElementById('keyboardShortcutsBtn')?.click();
            return;
        }

        // Navigation shortcuts (Alt + Number)
        if (e.altKey) {
            if (e.key === '1') {
                e.preventDefault();
                showReportSection('stock');
            } else if (e.key === '2') {
                e.preventDefault();
                showReportSection('gst');
            } else if (e.key === '3') {
                e.preventDefault();
                showReportSection('purchaseGst');
            } else if (e.key === '4') {
                e.preventDefault();
                showReportSection('dataWorksheet');
            }
            return;
        }

        // Esc: Back to Home
        if (e.key === 'Escape') {
            if (currentReportSection !== 'home') {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation to global scripts
                showReportSection('home');
            }
            // If at home, let it bubble (might go to dashboard via global script)
            return;
        }

        // Actions (Ctrl + Key)
        if (e.ctrlKey || e.metaKey) {

            // Ctrl + Enter: Generate Report
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerAction('generate');
            }
            // Ctrl + P: Print Report
            else if (e.key === 'p') {
                e.preventDefault();
                triggerAction('print');
            }
            // Ctrl + S: Save PDF
            else if (e.key === 's') {
                e.preventDefault();
                triggerAction('save');
            }
        }
    }, true); // Use capture phase
}

/**
 * Trigger specific actions based on current active section
 * @param {string} action - 'generate', 'print', 'save'
 */
function triggerAction(action) {
    let btnId = '';

    // Determine button ID based on current section and action
    if (currentReportSection === 'stock') {
        if (action === 'generate') btnId = 'generate-stock-report';
        else if (action === 'print') btnId = 'print-stock-report';
        else if (action === 'save') btnId = 'save-stock-pdf';
    } else if (currentReportSection === 'gst') {
        if (action === 'generate') btnId = 'generate-gst-report';
        else if (action === 'print') btnId = 'print-gst-report';
        else if (action === 'save') btnId = 'save-gst-pdf';
    } else if (currentReportSection === 'purchaseGst' || currentReportSection === 'purchase_gst') {
        if (action === 'generate') btnId = 'generate-purchase-gst-report';
        else if (action === 'print') btnId = 'print-purchase-gst-report';
        else if (action === 'save') btnId = 'save-purchase-gst-pdf';
    } else if (currentReportSection === 'dataWorksheet' || currentReportSection === 'data_worksheet') {
        if (action === 'generate') btnId = 'generate-worksheet';
        else if (action === 'print') btnId = 'print-worksheet-report';
        else if (action === 'save') btnId = 'save-worksheet-pdf';
    }

    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn && btn.offsetParent !== null) { // Check if visible
            btn.click();

            // Visual feedback
            btn.classList.add('ring-4', 'ring-blue-300');
            setTimeout(() => btn.classList.remove('ring-4', 'ring-blue-300'), 200);
        }
    }
}
