/**
 * Stock Report Module
 * Handles stock movement tracking and reporting
 */

// Stock report state
let stockReportData = [];
let stockReportInitialized = false;
let stockReportSummary = null;

/**
 * Initialize stock report section
 */
function initStockReport() {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('stock-start-date').valueAsDate = startDate;
    document.getElementById('stock-end-date').valueAsDate = endDate;

    // Set up event handlers (only once)
    if (!stockReportInitialized) {
        document.getElementById('generate-stock-report')?.addEventListener('click', generateStockReport);
        document.getElementById('clear-stock-filters')?.addEventListener('click', clearStockFilters);
        document.getElementById('print-stock-report')?.addEventListener('click', printStockReport);
        document.getElementById('save-stock-pdf')?.addEventListener('click', saveStockReportPDF);
        stockReportInitialized = true;

        // Load item suggestions
        loadStockItemSuggestions();

        // Setup autocomplete
        setupStockItemAutocomplete();
    }

    // Reset filter and UI state
    clearStockFilters();
}

/**
 * Clear stock report filters
 */
function clearStockFilters() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('stock-start-date').valueAsDate = startDate;
    document.getElementById('stock-end-date').valueAsDate = endDate;
    document.getElementById('stock-movement-type').value = 'all';
    document.getElementById('stock-item-filter').value = '';
    selectedItemId = null; // Reset selected item ID

    // Reset table
    document.getElementById('stock-report-body').innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-8 text-gray-500">
                <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                <p>Select filters and click "Generate Report" to view data</p>
            </td>
        </tr>
    `;

    // Hide summary and buttons
    document.getElementById('stock-report-summary').style.display = 'none';
    document.getElementById('print-stock-report').style.display = 'none';
    document.getElementById('save-stock-pdf').style.display = 'none';
}

/**
 * Generate stock report based on filters
 */
async function generateStockReport() {
    const startDate = document.getElementById('stock-start-date').value;
    const endDate = document.getElementById('stock-end-date').value;
    const movementType = document.getElementById('stock-movement-type').value;
    const itemFilter = document.getElementById('stock-item-filter').value;

    const tbody = document.getElementById('stock-report-body');

    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                <p class="text-gray-500 mt-2">Generating report...</p>
            </td>
        </tr>
    `;

    try {
        // Build query params
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (movementType && movementType !== 'all') params.append('movement_type', movementType);
        // Use item_id if available (from autocomplete selection), otherwise use item_name for text search
        if (selectedItemId) {
            params.append('item_id', selectedItemId);
        } else if (itemFilter) {
            params.append('item_name', itemFilter);
        }

        const response = await fetch(`/reports/stock?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.movements) {
            stockReportData = data.movements;

            if (stockReportData.length === 0) {
                if (window.electronAPI && window.electronAPI.showAlert1) {
                    window.electronAPI.showAlert1('No stock movements found for the selected criteria.');
                } else {
                    alert('No stock movements found for the selected criteria.');
                }

                // Even with no data, we should try to render the (empty) summary if it exists, or zero it out
                const emptySummary = { total_in: 0, total_out: 0, total_adjustments: 0, net_change: 0 };
                stockReportSummary = emptySummary;
                renderStockReport([], emptySummary);
                return;
            }

            // Normalize summary from backend format to frontend format
            // Backend returns: { in: { total_quantity: X }, out: { total_quantity: Y }, adjustment: { total_quantity: Z } }
            // Frontend expects: { total_in: X, total_out: |Y|, total_adjustments: Z, net_change: X+Y+Z }
            let summary = { total_in: 0, total_out: 0, total_adjustments: 0, net_change: 0 };

            if (data.summary) {
                const inQty = data.summary.in ? (data.summary.in.total_quantity || 0) : 0;
                const outQty = data.summary.out ? (data.summary.out.total_quantity || 0) : 0;
                const adjQty = data.summary.adjustment ? (data.summary.adjustment.total_quantity || 0) : 0;

                summary.total_in = inQty;
                summary.total_out = Math.abs(outQty); // Display 'out' as positive magnitude
                summary.total_adjustments = adjQty;

                // Net change is the algebraic sum (in is +, out is -, adj is +/-)
                summary.net_change = inQty + outQty + adjQty;
            }

            stockReportSummary = summary;
            renderStockReport(data.movements, summary);
        } else {
            // If no data from StockMovement, try to generate from stock entries
            await generateStockReportFromStock(startDate, endDate, movementType, itemFilter);
        }
    } catch (error) {
        console.error('Error generating stock report:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to generate report</p>
                    <button onclick="generateStockReport()" class="mt-2 text-blue-600 hover:underline">Retry</button>
                </td>
            </tr>
        `;
    }
}

/**
 * Generate stock report from stock entries (fallback)
 */
async function generateStockReportFromStock(startDate, endDate, movementType, itemFilter) {
    const tbody = document.getElementById('stock-report-body');

    try {
        // Fetch stock data
        const response = await fetch('/stock/all');
        const data = await response.json();

        if (data && data.length > 0) {
            // Transform stock data into movement-like format
            let movements = data.map(stock => ({
                timestamp: stock.createdAt || stock.created_at || new Date().toISOString(),
                item_name: stock.item_name || stock.itemName || 'Unknown Item',
                movement_type: 'in',
                quantity_change: stock.quantity || stock.Quantity || 0,
                reference_type: 'stock',
                reference_id: stock._id,
                notes: `Initial stock entry - ${stock.item_id || ''}`
            }));

            // Apply filters
            if (startDate) {
                const start = new Date(startDate);
                movements = movements.filter(m => new Date(m.timestamp) >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                movements = movements.filter(m => new Date(m.timestamp) <= end);
            }
            if (itemFilter) {
                const filter = itemFilter.toLowerCase();
                movements = movements.filter(m => m.item_name.toLowerCase().includes(filter));
            }

            // Calculate summary
            const summary = {
                total_in: movements.reduce((sum, m) => sum + (m.movement_type === 'in' ? m.quantity_change : 0), 0),
                total_out: movements.reduce((sum, m) => sum + (m.movement_type === 'out' ? Math.abs(m.quantity_change) : 0), 0),
                total_adjustments: movements.reduce((sum, m) => sum + (m.movement_type === 'adjustment' ? m.quantity_change : 0), 0)
            };
            summary.net_change = summary.total_in - summary.total_out + summary.total_adjustments;

            stockReportData = movements;
            stockReportSummary = summary;
            renderStockReport(movements, summary);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No stock data found for the selected criteria</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to fetch stock data</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Render stock report data
 * @param {Array} movements - Stock movements array
 * @param {Object} summary - Summary data
 */
function renderStockReport(movements, summary) {
    const tbody = document.getElementById('stock-report-body');

    // Filter out adjustments from UI
    const visibleMovements = movements ? movements.filter(m => m.movement_type !== 'adjustment') : [];

    if (!visibleMovements || visibleMovements.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                    <p>No stock movements found for the selected criteria</p>
                </td>
            </tr>
        `;
        document.getElementById('stock-report-summary').style.display = 'none';
        document.getElementById('print-stock-report').style.display = 'none';
        document.getElementById('save-stock-pdf').style.display = 'none';
        return;
    }

    // Render table rows
    tbody.innerHTML = visibleMovements.map(movement => {
        const typeClass = movement.movement_type === 'in' ? 'text-green-600' :
            movement.movement_type === 'out' ? 'text-red-600' : 'text-yellow-600';
        const typeIcon = movement.movement_type === 'in' ? 'fa-arrow-down' :
            movement.movement_type === 'out' ? 'fa-arrow-up' : 'fa-exchange-alt';

        let quantityPrefix = '';
        if (movement.movement_type === 'in') quantityPrefix = '+';
        else if (movement.movement_type === 'out') quantityPrefix = '-';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 border-b">${formatDateIndian(movement.timestamp)}</td>
                <td class="px-4 py-3 border-b font-medium">${movement.item_name}</td>
                <td class="px-4 py-3 border-b">
                    <span class="${typeClass} flex items-center gap-2">
                        <i class="fas ${typeIcon}"></i>
                        ${movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-3 border-b font-medium ${typeClass}">
                    ${quantityPrefix}${Math.abs(movement.quantity_change)}
                </td>
                <td class="px-4 py-3 border-b text-gray-600">
                    ${movement.reference_type ? `${movement.reference_type}: ${movement.reference_id || ''}` : '-'}
                </td>
                <td class="px-4 py-3 border-b text-gray-500">${movement.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    // Update summary
    if (summary) {
        document.getElementById('summary-stock-in').textContent = summary.total_in || 0;
        document.getElementById('summary-stock-out').textContent = summary.total_out || 0;
        // Adjustments hidden from UI
        document.getElementById('summary-net-change').textContent = summary.net_change || 0;
        document.getElementById('stock-report-summary').style.display = 'grid';
    }

    // Show print/PDF buttons
    document.getElementById('print-stock-report').style.display = 'flex';
    document.getElementById('save-stock-pdf').style.display = 'flex';
}

/**
 * Generate printable stock report HTML
 * @returns {string} HTML content
 */
function generateStockReportHTML() {
    const startDate = document.getElementById('stock-start-date').value;
    const endDate = document.getElementById('stock-end-date').value;

    let summaryIn = '0';
    let summaryOut = '0';
    let summaryAdj = '0';
    let summaryNet = '0';

    if (stockReportSummary) {
        summaryIn = stockReportSummary.total_in || 0;
        summaryOut = stockReportSummary.total_out || 0;
        summaryAdj = stockReportSummary.total_adjustments || 0;
        summaryNet = stockReportSummary.net_change || 0;
    } else {
        summaryIn = document.getElementById('summary-stock-in')?.textContent || '0';
        summaryOut = document.getElementById('summary-stock-out')?.textContent || '0';
        summaryAdj = document.getElementById('summary-adjustments')?.textContent || '0';
        summaryNet = document.getElementById('summary-net-change')?.textContent || '0';
    }

    const tableContent = stockReportData.map(movement => {
        const quantityPrefix = movement.movement_type === 'in' ? '+' :
            movement.movement_type === 'out' ? '-' : '';
        return `
            <tr>
                <td>${formatDateIndian(movement.timestamp)}</td>
                <td>${movement.item_name}</td>
                <td>${movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}</td>
                <td class="text-right">${quantityPrefix}${Math.abs(movement.quantity_change)}</td>
                <td>${movement.reference_type ? `${movement.reference_type}: ${movement.reference_id || ''}` : '-'}</td>
                <td>${movement.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    const content = `
        <div class="report-summary">
            <div class="summary-item">
                <div class="summary-label">Total Stock In</div>
                <div class="summary-value" style="color: #16a34a;">${summaryIn}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Stock Out</div>
                <div class="summary-value" style="color: #dc2626;">${summaryOut}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Adjustments</div>
                <div class="summary-value" style="color: #ca8a04;">${summaryAdj}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Change</div>
                <div class="summary-value">${summaryNet}</div>
            </div>
        </div>
        
        <table class="report-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Item Name</th>
                    <th>Type</th>
                    <th class="text-right">Quantity</th>
                    <th>Reference</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent}
            </tbody>
        </table>
    `;

    const subtitle = `Period: ${formatDateIndian(startDate)} to ${formatDateIndian(endDate)}`;

    return generatePrintableReport('Stock Movement Report', content, { subtitle });
}

/**
 * Print stock report
 */
function printStockReport() {
    const html = generateStockReportHTML();
    printReport(html, 'stock-report');
}

/**
 * Save stock report as PDF
 */
function saveStockReportPDF() {
    const html = generateStockReportHTML();
    const filename = `stock-report-${new Date().getTime()}`;
    saveReportPDF(html, filename);
}

/**
 * Load a saved stock report into the view
 * @param {Object} report - Complete report object from database
 */
window.loadSavedStockReport = function (report) {
    if (!report || !report.data) return;

    // Set parameters
    if (report.parameters) {
        if (report.parameters.start_date) {
            document.getElementById('stock-start-date').value = report.parameters.start_date.split('T')[0];
        }
        if (report.parameters.end_date) {
            document.getElementById('stock-end-date').value = report.parameters.end_date.split('T')[0];
        }

        // Handle filters (support both new nested structure and old flat structure)
        const filters = report.parameters.filters || report.parameters;

        if (filters.movement_type) {
            document.getElementById('stock-movement-type').value = filters.movement_type;
        } else {
            document.getElementById('stock-movement-type').value = 'all';
        }

        if (filters.item_name) {
            document.getElementById('stock-item-filter').value = filters.item_name;
        } else {
            document.getElementById('stock-item-filter').value = '';
        }
    }

    // Set global data
    stockReportData = report.data.movements || [];

    // Custom summary object based on saved data structure 
    // The renderStockReport function expects summary object with total_in, total_out, etc.
    let summary = report.data.summary;

    // The saved summary structure might be different based on how it was saved in backend
    // In backend: 
    // summary: {
    //    in: { total_quantity: ..., count: ... },
    //    out: { total_quantity: ..., count: ... },
    //    adjustment: { total_quantity: ..., count: ... }
    // }
    // But renderStockReport expects:
    // { total_in, total_out, total_adjustments, net_change }

    if (summary && summary.in && summary.out) {
        // Convert from backend format to frontend render format
        const renderSummary = {
            total_in: summary.in.total_quantity || 0,
            total_out: summary.out.total_quantity || 0,
            total_adjustments: summary.adjustment ? summary.adjustment.total_quantity : 0
        };
        renderSummary.net_change = renderSummary.total_in - renderSummary.total_out + renderSummary.total_adjustments;
        summary = renderSummary;
    }

    // Render report
    stockReportSummary = summary;
    renderStockReport(stockReportData, summary);
};



// Autocomplete State
let stockItems = []; // Array of { id, name }
let stockItemNames = []; // Array of names (for backward compatibility)
let selectedItemId = null; // Store selected item ID
let selectedSuggestionIndex = -1;

/**
 * Load stock item suggestions for autocomplete
 */
async function loadStockItemSuggestions() {
    try {
        const response = await fetch('/stock/get-items-with-ids');
        if (response.ok) {
            stockItems = await response.json();
            stockItemNames = stockItems.map(item => item.name);
        }
    } catch (error) {
        console.error('Error loading stock item suggestions:', error);
    }
}

/**
 * Setup autocomplete for stock item filter
 */
function setupStockItemAutocomplete() {
    const input = document.getElementById('stock-item-filter');
    const suggestionsList = document.getElementById('stock-item-suggestions-list');

    if (!input || !suggestionsList) return;

    // Input handler
    input.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        suggestionsList.innerHTML = '';
        selectedSuggestionIndex = -1;
        selectedItemId = null; // Clear selected ID when input changes

        if (query.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        // Filter items using the stockItems array
        const filtered = stockItems.filter(item => item.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        suggestionsList.style.display = 'block';

        filtered.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = item.name;
            li.dataset.itemId = item.id; // Store item ID in data attribute
            li.addEventListener('click', function () {
                input.value = item.name;
                selectedItemId = item.id; // Store selected item ID
                suggestionsList.style.display = 'none';
                selectedSuggestionIndex = -1;
            });
            suggestionsList.appendChild(li);
        });
    });

    // Keyboard navigation
    input.addEventListener('keydown', function (e) {
        const items = suggestionsList.querySelectorAll('li');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
            updateSelection(items);
        } else if (e.key === 'Enter') {
            if (suggestionsList.style.display !== 'none' && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                const selectedItem = items[selectedSuggestionIndex];
                input.value = selectedItem.textContent;
                selectedItemId = selectedItem.dataset.itemId; // Store selected item ID
                suggestionsList.style.display = 'none';
                selectedSuggestionIndex = -1;
            }
        } else if (e.key === 'Escape') {
            suggestionsList.style.display = 'none';
            selectedSuggestionIndex = -1;
        }
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.style.display = 'none';
        }
    });
}

function updateSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('selected');
            // Ensure visible in scroll
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}
