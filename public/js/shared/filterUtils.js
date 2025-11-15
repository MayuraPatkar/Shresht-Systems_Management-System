/**
 * Shared Filter Utilities
 * Common filtering and sorting functions for all document modules
 */

/**
 * Filter documents by date range
 * @param {Array} documents - Array of documents to filter
 * @param {string} dateFilter - Filter type: 'all', 'today', 'week', 'month', 'custom'
 * @param {string} dateField - Field name containing the date (e.g., 'invoice_date', 'quotation_date')
 * @param {Date} customStartDate - Optional start date for custom range
 * @param {Date} customEndDate - Optional end date for custom range
 * @returns {Array} Filtered documents
 */
function filterByDate(documents, dateFilter, dateField, customStartDate = null, customEndDate = null) {
    if (dateFilter === 'all') return documents;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return documents.filter(doc => {
        const docDate = new Date(doc[dateField] || doc.createdAt);
        docDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
            case 'today':
                return docDate.getTime() === now.getTime();

            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return docDate >= weekAgo;

            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                return docDate >= monthAgo;

            case 'custom':
                if (!customStartDate || !customEndDate) return true;
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return docDate >= start && docDate <= end;

            default:
                return true;
        }
    });
}

/**
 * Filter invoices by payment status
 * @param {Array} invoices - Array of invoices to filter
 * @param {string} statusFilter - Filter type: 'all', 'paid', 'unpaid', 'partial'
 * @returns {Array} Filtered invoices
 */
function filterByPaymentStatus(invoices, statusFilter) {
    if (statusFilter === 'all') return invoices;

    return invoices.filter(invoice => {
        const status = (invoice.payment_status || 'Unpaid').toLowerCase();
        return status === statusFilter.toLowerCase();
    });
}

/**
 * Sort documents by specified field and direction
 * @param {Array} documents - Array of documents to sort
 * @param {string} sortBy - Sort type: 'date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'name-asc', etc.
 * @param {string} dateField - Field name containing the date
 * @param {string} amountField - Field name containing the amount
 * @param {string} nameField - Field name containing the name
 * @returns {Array} Sorted documents
 */
function sortDocuments(documents, sortBy, dateField = 'createdAt', amountField = 'total_amount', nameField = 'project_name') {
    const sorted = [...documents];

    switch (sortBy) {
        case 'date-desc':
            return sorted.sort((a, b) => {
                const dateA = new Date(a[dateField] || a.createdAt);
                const dateB = new Date(b[dateField] || b.createdAt);
                return dateB - dateA;
            });

        case 'date-asc':
            return sorted.sort((a, b) => {
                const dateA = new Date(a[dateField] || a.createdAt);
                const dateB = new Date(b[dateField] || b.createdAt);
                return dateA - dateB;
            });

        case 'amount-desc':
            return sorted.sort((a, b) => {
                const amountA = parseFloat(a[amountField] || 0);
                const amountB = parseFloat(b[amountField] || 0);
                return amountB - amountA;
            });

        case 'amount-asc':
            return sorted.sort((a, b) => {
                const amountA = parseFloat(a[amountField] || 0);
                const amountB = parseFloat(b[amountField] || 0);
                return amountA - amountB;
            });

        case 'name-asc':
            return sorted.sort((a, b) => {
                const nameA = (a[nameField] || a.customer_name || '').toLowerCase();
                const nameB = (b[nameField] || b.customer_name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

        case 'destination-asc':
            return sorted.sort((a, b) => {
                const destA = (a.place_supply || '').toLowerCase();
                const destB = (b.place_supply || '').toLowerCase();
                return destA.localeCompare(destB);
            });

        default:
            return sorted;
    }
}

/**
 * Apply all filters and sorting to documents
 * @param {Array} documents - Array of documents to process
 * @param {Object} filters - Filter configuration object
 * @returns {Array} Filtered and sorted documents
 */
function applyFilters(documents, filters) {
    let filtered = [...documents];

    // Apply payment status filter (for invoices)
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        filtered = filterByPaymentStatus(filtered, filters.paymentStatus);
    }

    // Apply date filter
    if (filters.dateFilter && filters.dateFilter !== 'all') {
        filtered = filterByDate(
            filtered,
            filters.dateFilter,
            filters.dateField || 'createdAt',
            filters.customStartDate,
            filters.customEndDate
        );
    }

    // Apply sorting
    if (filters.sortBy) {
        filtered = sortDocuments(
            filtered,
            filters.sortBy,
            filters.dateField,
            filters.amountField,
            filters.nameField
        );
    }

    return filtered;
}

/**
 * Show custom date range modal
 * @param {Function} callback - Callback function with (startDate, endDate) parameters
 */
function showCustomDateModal(callback) {
    const modalHTML = `
        <div id="custom-date-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Select Date Range</h3>
                    <button id="close-date-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" id="custom-start-date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" id="custom-end-date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex gap-2 justify-end">
                        <button id="cancel-date-modal" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            Cancel
                        </button>
                        <button id="apply-date-range" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('custom-date-modal');
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('custom-date-modal');
    const closeBtn = document.getElementById('close-date-modal');
    const cancelBtn = document.getElementById('cancel-date-modal');
    const applyBtn = document.getElementById('apply-date-range');
    const startInput = document.getElementById('custom-start-date');
    const endInput = document.getElementById('custom-end-date');

    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    endInput.value = today.toISOString().split('T')[0];
    startInput.value = thirtyDaysAgo.toISOString().split('T')[0];

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    applyBtn.addEventListener('click', () => {
        const startDate = startInput.value;
        const endDate = endInput.value;
        
        if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
            callback(startDate, endDate);
            closeModal();
        } else {
            alert('Please select a valid date range');
        }
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

/**
 * Get filter summary text
 * @param {Object} filters - Filter configuration object
 * @returns {string} Human-readable filter summary
 */
function getFilterSummary(filters) {
    const parts = [];

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        parts.push(`Status: ${filters.paymentStatus}`);
    }

    if (filters.dateFilter && filters.dateFilter !== 'all') {
        if (filters.dateFilter === 'custom' && filters.customStartDate && filters.customEndDate) {
            parts.push(`Date: ${filters.customStartDate} to ${filters.customEndDate}`);
        } else {
            const dateLabels = {
                'today': 'Today',
                'week': 'This Week',
                'month': 'This Month'
            };
            parts.push(`Date: ${dateLabels[filters.dateFilter] || filters.dateFilter}`);
        }
    }

    if (filters.sortBy) {
        const sortLabels = {
            'date-desc': 'Latest First',
            'date-asc': 'Oldest First',
            'amount-desc': 'High to Low',
            'amount-asc': 'Low to High',
            'name-asc': 'Name A-Z',
            'destination-asc': 'Destination A-Z'
        };
        parts.push(`Sort: ${sortLabels[filters.sortBy] || filters.sortBy}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters active';
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.filterByDate = filterByDate;
    window.filterByPaymentStatus = filterByPaymentStatus;
    window.sortDocuments = sortDocuments;
    window.applyFilters = applyFilters;
    window.showCustomDateModal = showCustomDateModal;
    window.getFilterSummary = getFilterSummary;
}
