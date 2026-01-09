/**
 * Service Module v2 - Redesigned UI/UX
 * Master-Detail layout with URL routing, quick actions, and simplified form
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const ServiceState = {
    currentTab: 'due',
    selectedServiceId: null,
    selectedInvoiceId: null,
    allInvoices: [],
    dueServices: [],
    allServices: [],
    completedServices: [],
    currentFormStep: 1,
    isEditing: false,
    filters: {
        search: '',
        date: 'all',
        paymentStatus: 'all',
        sort: 'date-desc'
    }
};

// Stock items for autocomplete
let stockItems = [];

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Set default date
    const dateInput = document.getElementById('service-date');
    if (dateInput) {
        dateInput.value = window.getTodayForInput ? window.getTodayForInput() : new Date().toISOString().split('T')[0];
    }

    // Initialize event listeners
    initTabListeners();
    initHeaderListeners();
    initFormListeners();
    initModalListeners();
    initKeyboardShortcuts();

    // Load initial data
    await loadAllData();

    // Handle URL routing
    handleURLRouting();

    // Listen for browser back/forward
    window.addEventListener('popstate', handleURLRouting);
});

// ============================================================================
// DATA LOADING
// ============================================================================
async function loadAllData() {
    try {
        await Promise.all([
            loadDueServices(),
            loadAllServicesWithSchedule(),
            loadCompletedServices(),
            loadInvoicesForPicker(),
            loadStockItems()
        ]);
        updateStats();
        renderCurrentTab();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load services', 'error');
    }
}

// Load stock items for autocomplete
async function loadStockItems() {
    try {
        const response = await fetch('/stock/get-names');
        if (response.ok) {
            stockItems = await response.json();
        }
    } catch (error) {
        console.error('Error loading stock items:', error);
        stockItems = [];
    }
}

async function loadDueServices() {
    try {
        const response = await fetch('/service/get-service');
        if (!response.ok) throw new Error('Failed to fetch due services');
        const data = await response.json();
        ServiceState.dueServices = data.projects || [];
    } catch (error) {
        console.error('Error loading due services:', error);
        ServiceState.dueServices = [];
    }
}

async function loadAllServicesWithSchedule() {
    try {
        const response = await fetch('/service/all');
        if (!response.ok) throw new Error('Failed to fetch all services');
        const data = await response.json();
        ServiceState.allServices = data || [];
    } catch (error) {
        console.error('Error loading all services:', error);
        ServiceState.allServices = [];
    }
}

async function loadCompletedServices() {
    try {
        const response = await fetch('/service/recent-services');
        if (!response.ok) throw new Error('Failed to fetch completed services');
        const data = await response.json();
        ServiceState.completedServices = data.services || [];
    } catch (error) {
        console.error('Error loading completed services:', error);
        ServiceState.completedServices = [];
    }
}

async function loadInvoicesForPicker() {
    try {
        const response = await fetch('/invoice/all');
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const data = await response.json();
        ServiceState.allInvoices = data || [];
    } catch (error) {
        console.error('Error loading invoices:', error);
        ServiceState.allInvoices = [];
    }
}

// ============================================================================
// URL ROUTING
// ============================================================================
function handleURLRouting() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('view')) {
        viewService(params.get('view'));
    } else if (params.has('new')) {
        showNewForm(params.get('invoice') || null);
    } else if (params.has('edit')) {
        editService(params.get('edit'));
    } else {
        showEmptyState();
    }

    // Handle tab from URL
    if (params.has('tab')) {
        switchTab(params.get('tab'));
    }
}

function updateURL(params = {}) {
    const url = new URL(window.location);
    // Clear existing params
    url.search = '';
    // Add new params
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    window.history.pushState({}, '', url);
}

function navigateTo(section, id = null, extra = {}) {
    const params = { ...extra };
    if (section === 'view' && id) {
        params.view = id;
    } else if (section === 'new') {
        params.new = 'true';
        if (id) params.invoice = id;
    } else if (section === 'edit' && id) {
        params.edit = id;
    }
    updateURL(params);
    handleURLRouting();
}

// Make available globally for inline onclick handlers
window.navigateTo = navigateTo;

// ============================================================================
// TAB MANAGEMENT
// ============================================================================
function initTabListeners() {
    document.querySelectorAll('.list-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    ServiceState.currentTab = tabName;

    // Update tab UI
    document.querySelectorAll('.list-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    renderCurrentTab();
}

function renderCurrentTab() {
    const listContainer = document.getElementById('service-list');
    let services = [];

    switch (ServiceState.currentTab) {
        case 'due':
            services = ServiceState.dueServices;
            break;
        case 'all':
            services = ServiceState.allServices;
            break;
        case 'completed':
            services = ServiceState.completedServices;
            break;
    }

    // Apply filters
    services = applyFilters(services);

    if (services.length === 0) {
        listContainer.innerHTML = renderEmptyList();
        return;
    }

    if (ServiceState.currentTab === 'completed') {
        listContainer.innerHTML = services.map(s => renderCompletedCard(s)).join('');
    } else {
        listContainer.innerHTML = services.map(s => renderPendingCard(s)).join('');
    }

    // Add click handlers
    addCardEventListeners();
}

function applyFilters(services) {
    let filtered = [...services];

    // Search filter
    if (ServiceState.filters.search) {
        const search = ServiceState.filters.search.toLowerCase();
        filtered = filtered.filter(s => {
            const searchable = [
                s.invoice_id, s.service_id, s.customer_name, s.project_name
            ].filter(Boolean).join(' ').toLowerCase();
            return searchable.includes(search);
        });
    }

    // Date filter
    if (ServiceState.filters.date !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        filtered = filtered.filter(s => {
            const date = new Date(s.service_date || s.invoice_date || s.createdAt);
            const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            switch (ServiceState.filters.date) {
                case 'today':
                    return itemDate.getTime() === today.getTime();
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return itemDate >= weekAgo && itemDate <= today;
                case 'month':
                    return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
                default:
                    return true;
            }
        });
    }

    // Payment Status filter
    if (ServiceState.filters.paymentStatus !== 'all') {
        filtered = filtered.filter(s => {
            const status = (s.payment_status || 'Unpaid').toLowerCase();
            return status === ServiceState.filters.paymentStatus;
        });
    }

    // Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.service_date || a.invoice_date || a.createdAt);
        const dateB = new Date(b.service_date || b.invoice_date || b.createdAt);

        switch (ServiceState.filters.sort) {
            case 'date-asc':
                return dateA - dateB;
            case 'amount-desc':
                return (b.total_amount_with_tax || 0) - (a.total_amount_with_tax || 0);
            case 'amount-asc':
                return (a.total_amount_with_tax || 0) - (b.total_amount_with_tax || 0);
            default: // date-desc
                return dateB - dateA;
        }
    });

    return filtered;
}

// ============================================================================
// CARD RENDERING
// ============================================================================
function renderPendingCard(service) {
    const invoiceId = service.invoice_id || 'N/A';
    const projectName = service.project_name || 'Unnamed Project';
    const customerName = service.customer_name || 'N/A';
    const nextStage = (service.service_stage || 0) + 1;
    const stageLabel = getStageLabel(nextStage);

    // Calculate due date
    let dueDate = 'N/A';
    let isDue = false;

    if (service.next_service_date) {
        const d = new Date(service.next_service_date);
        dueDate = formatDateShort(d);
        isDue = new Date() >= d;
    } else if (service.service_month && (service.invoice_date || service.createdAt)) {
        const baseDate = new Date(service.invoice_date || service.createdAt);
        baseDate.setMonth(baseDate.getMonth() + service.service_month);
        dueDate = formatDateShort(baseDate);
        isDue = new Date() >= baseDate;
    }

    const isPaused = service.service_status === 'Paused';
    let statusBadge;

    if (isPaused) {
        statusBadge = '<span class="status-badge bg-yellow-100 text-yellow-700">Paused</span>';
    } else if (isDue) {
        statusBadge = '<span class="status-badge bg-red-100 text-red-700">Due</span>';
    } else {
        statusBadge = '<span class="status-badge bg-blue-100 text-blue-700">Scheduled</span>';
    }

    return `
        <div class="service-card" data-type="pending" data-invoice-id="${invoiceId}" data-id="${invoiceId}">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(projectName)}</div>
                    <div class="card-subtitle">${escapeHtml(customerName)}</div>
                </div>
                ${statusBadge}
            </div>
            <div class="card-meta">
                <span><i class="fas fa-file-invoice mr-1"></i>${invoiceId}</span>
                <span><i class="fas fa-calendar mr-1"></i>${dueDate}</span>
                <span><i class="fas fa-layer-group mr-1"></i>${stageLabel}</span>
            </div>
            <div class="quick-actions">
                <button class="quick-action-btn view" data-action="open" data-invoice-id="${invoiceId}" title="Create Service">
                    <i class="fas fa-folder-open"></i>Open
                </button>
                <button class="quick-action-btn print" data-action="history" data-invoice-id="${invoiceId}" title="View History">
                    <i class="fas fa-history"></i>History
                </button>
                <button class="quick-action-btn ${isPaused ? 'payment' : 'edit'}" data-action="toggle-pause" data-invoice-id="${invoiceId}" title="${isPaused ? 'Resume Service' : 'Pause Service'}">
                    <i class="fas fa-${isPaused ? 'play' : 'pause'}"></i>${isPaused ? 'Resume' : 'Pause'}
                </button>
                <button class="quick-action-btn delete" data-action="close" data-invoice-id="${invoiceId}" title="Close Service">
                    <i class="fas fa-times"></i>Close
                </button>
            </div>
        </div>
    `;
}

function renderCompletedCard(service) {
    const serviceId = service.service_id || 'N/A';
    const invoiceId = service.invoice_id || 'N/A';
    const projectName = service.project_name || 'Unnamed Project';
    const customerName = service.customer_name || 'N/A';
    const stageLabel = getStageLabel(service.service_stage);
    const serviceDate = formatDateShort(service.service_date);
    const total = formatCurrency(service.total_amount_with_tax || 0);

    // Payment status
    const paid = service.total_paid_amount || 0;
    const totalAmt = service.total_amount_with_tax || 0;
    // Consider "Paid" if: paid >= total, OR if total is 0 (nothing to pay)
    const isPaid = paid >= totalAmt || totalAmt === 0;
    const isPartial = paid > 0 && paid < totalAmt;

    let paymentBadge = '<span class="status-badge bg-orange-100 text-orange-700">Unpaid</span>';
    if (totalAmt === 0) paymentBadge = '<span class="status-badge bg-green-100 text-green-700">No Charge</span>';
    else if (isPaid) paymentBadge = '<span class="status-badge bg-green-100 text-green-700">Paid</span>';
    else if (isPartial) paymentBadge = '<span class="status-badge bg-yellow-100 text-yellow-700">Partial</span>';

    return `
        <div class="service-card" data-type="completed" data-service-id="${serviceId}" data-invoice-id="${invoiceId}" data-id="${serviceId}">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(projectName)}</div>
                    <div class="card-subtitle">${escapeHtml(customerName)}</div>
                </div>
                ${paymentBadge}
            </div>
            <div class="card-meta">
                <span><i class="fas fa-hashtag mr-1"></i>${serviceId}</span>
                <span><i class="fas fa-calendar mr-1"></i>${serviceDate}</span>
                <span><i class="fas fa-rupee-sign mr-1"></i>${total}</span>
            </div>
            <div class="quick-actions">
                <button class="quick-action-btn view" data-action="view" data-service-id="${serviceId}" title="View">
                    <i class="fas fa-eye"></i>View
                </button>
                <button class="quick-action-btn edit" data-action="edit" data-service-id="${serviceId}" title="Edit">
                    <i class="fas fa-edit"></i>Edit
                </button>
                <button class="quick-action-btn payment" data-action="payment" data-service-id="${serviceId}" title="Payment">
                    <i class="fas fa-credit-card"></i>Pay
                </button>
                <button class="quick-action-btn print" data-action="print" data-service-id="${serviceId}" title="Print">
                    <i class="fas fa-print"></i>
                </button>
            </div>
        </div>
    `;
}

function renderEmptyList() {
    const messages = {
        due: { icon: 'fa-clock', text: 'No services due', sub: 'All caught up!' },
        all: { icon: 'fa-list', text: 'No scheduled services', sub: 'Create an invoice with service schedule' },
        completed: { icon: 'fa-check-circle', text: 'No completed services', sub: 'Complete a service to see it here' }
    };
    const msg = messages[ServiceState.currentTab] || messages.all;

    return `
        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
            <i class="fas ${msg.icon} text-4xl mb-3"></i>
            <p class="font-medium text-gray-600">${msg.text}</p>
            <p class="text-sm">${msg.sub}</p>
        </div>
    `;
}

function addCardEventListeners() {
    // Card selection
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.quick-action-btn')) return; // Ignore if clicking action button

            // Highlight selected card
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const type = card.dataset.type;
            if (type === 'completed') {
                const serviceId = card.dataset.serviceId;
                navigateTo('view', serviceId);
            }
        });
    });

    // Quick action buttons
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const serviceId = btn.dataset.serviceId;
            const invoiceId = btn.dataset.invoiceId;

            switch (action) {
                case 'open':
                    showNewForm(invoiceId);
                    break;
                case 'view':
                    navigateTo('view', serviceId);
                    break;
                case 'edit':
                    navigateTo('edit', serviceId);
                    break;
                case 'payment':
                    openPaymentModal(serviceId);
                    break;
                case 'print':
                    printService(serviceId);
                    break;
                case 'history':
                    showHistorySection(invoiceId);
                    break;
                case 'toggle-pause':
                    toggleServiceStatus(invoiceId);
                    break;
                case 'close':
                    closeServiceSchedule(invoiceId);
                    break;
            }
        });
    });
}

// ============================================================================
// STATS UPDATE
// ============================================================================
function updateStats() {
    document.getElementById('due-count').textContent = ServiceState.dueServices.length;
    document.getElementById('paused-count').textContent =
        ServiceState.allServices.filter(s => s.service_status === 'Paused').length;
    document.getElementById('completed-count').textContent = ServiceState.completedServices.length;
    document.getElementById('service-count').textContent =
        ServiceState.dueServices.length + ServiceState.completedServices.length;
}

// ============================================================================
// DETAIL PANEL MANAGEMENT
// ============================================================================
function showSection(sectionId) {
    document.querySelectorAll('.detail-section').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(sectionId)?.classList.add('active');
}

function showEmptyState() {
    showSection('section-empty');
    ServiceState.selectedServiceId = null;
    updateURL({});
}

// ============================================================================
// VIEW SERVICE
// ============================================================================
async function viewService(serviceId) {
    try {
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) throw new Error('Failed to fetch service');

        const data = await response.json();
        const service = data.service;
        const invoice = service.invoice_details || {};

        ServiceState.selectedServiceId = serviceId;

        // Update view content
        document.getElementById('view-title').textContent = `Service ${serviceId}`;
        document.getElementById('view-subtitle').textContent =
            `${service.invoice_id} • ${getStageLabel(service.service_stage)}`;

        document.getElementById('view-customer').textContent = invoice.customer_name || service.customer_name || '-';
        document.getElementById('view-phone').textContent = invoice.customer_phone || '-';
        document.getElementById('view-address').textContent = invoice.customer_address || '-';
        document.getElementById('view-date').textContent = formatDateShort(service.service_date);
        document.getElementById('view-project').textContent = invoice.project_name || service.project_name || '-';
        document.getElementById('view-invoice-id').textContent = service.invoice_id;

        // Items table
        const itemsTbody = document.getElementById('view-items-tbody');
        if (service.items && service.items.length > 0) {
            itemsTbody.innerHTML = service.items.map((item, i) => `
                <tr class="border-b border-gray-100">
                    <td class="px-4 py-2">${i + 1}</td>
                    <td class="px-4 py-2">${escapeHtml(item.description || '')}</td>
                    <td class="px-4 py-2 text-right">${item.quantity || 0}</td>
                    <td class="px-4 py-2 text-right">₹${formatNumber(item.unit_price || 0)}</td>
                    <td class="px-4 py-2 text-right">₹${formatNumber((item.quantity || 0) * (item.unit_price || 0))}</td>
                </tr>
            `).join('');
        } else {
            itemsTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">No items</td></tr>';
        }

        // Totals
        document.getElementById('view-subtotal').textContent = `₹ ${formatNumber(service.total_amount_no_tax || 0)}`;
        document.getElementById('view-tax').textContent = `₹ ${formatNumber(service.total_tax || 0)}`;
        document.getElementById('view-total').textContent = `₹ ${formatNumber(service.total_amount_with_tax || 0)}`;

        // Payment status
        const paid = service.total_paid_amount || 0;
        const total = service.total_amount_with_tax || 0;
        const balance = Math.max(0, total - paid);
        // Consider "Paid" if: paid >= total, OR if total is 0 (nothing to pay)
        const isPaid = paid >= total || total === 0;
        const statusEl = document.getElementById('view-payment-status');

        if (isPaid) {
            statusEl.textContent = total === 0 ? 'No Charge' : 'Paid';
            statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700';
        } else if (paid > 0) {
            statusEl.textContent = 'Partial';
            statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700';
        } else {
            statusEl.textContent = 'Unpaid';
            statusEl.className = 'px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700';
        }

        document.getElementById('view-balance-due').textContent = `₹ ${formatNumber(balance)}`;

        // Payment History
        const paymentTbody = document.getElementById('view-payment-tbody');
        if (service.payments && service.payments.length > 0) {
            paymentTbody.innerHTML = service.payments.map((p, index) => `
                <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-sm text-gray-900">${formatDateIndian(p.payment_date) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${p.payment_mode || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(p.paid_amount, 2) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${p.extra_details ? p.extra_details : '-'}</td>
                    <td class="px-4 py-3 text-sm">
                        <div class="flex items-center gap-2">
                            <button type="button" class="edit-payment-btn text-blue-600 hover:text-blue-800 p-1" data-service-id="${service.service_id}" data-payment-index="${index}" title="Edit Payment">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="delete-payment-btn text-red-600 hover:text-red-800 p-1" data-service-id="${service.service_id}" data-payment-index="${index}" title="Delete Payment">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Add event listeners for edit/delete buttons
            paymentTbody.querySelectorAll('.edit-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const serviceId = btn.dataset.serviceId;
                    const paymentIndex = parseInt(btn.dataset.paymentIndex, 10);
                    editPayment(serviceId, paymentIndex);
                });
            });

            paymentTbody.querySelectorAll('.delete-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const serviceId = btn.dataset.serviceId;
                    const paymentIndex = parseInt(btn.dataset.paymentIndex, 10);
                    deletePayment(serviceId, paymentIndex);
                });
            });
        } else {
            paymentTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">No payments recorded</td></tr>';
        }

        showSection('section-view');

        // Highlight card in list
        document.querySelectorAll('.service-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.serviceId === serviceId);
        });

    } catch (error) {
        console.error('Error viewing service:', error);
        showToast('Failed to load service details', 'error');
    }
}

// ============================================================================
// FORM MANAGEMENT
// ============================================================================
function showNewForm(invoiceId = null) {
    resetForm();

    // Set default date to today
    document.getElementById('service-date').value = new Date().toISOString().split('T')[0];

    ServiceState.isEditing = false;

    document.getElementById('form-title').textContent = 'New Service';
    document.getElementById('form-subtitle').textContent = 'Create a service entry';
    document.getElementById('form-icon').className = 'w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center';
    document.getElementById('form-icon').innerHTML = '<i class="fas fa-plus text-white text-xl"></i>';

    showSection('section-form');

    // Focus first input
    const formSection = document.getElementById('section-form');
    if (formSection) {
        const firstInput = formSection.querySelector('input, select, textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }

    updateURL({ new: 'true', invoice: invoiceId });

    // Pre-select invoice if provided
    if (invoiceId) {
        selectInvoice(invoiceId);
    }

    // Generate service ID
    generateServiceId();
}

async function editService(serviceId) {
    try {
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) throw new Error('Failed to fetch service');

        const data = await response.json();
        const service = data.service;

        resetForm();
        ServiceState.isEditing = true;
        ServiceState.selectedServiceId = serviceId;

        document.getElementById('form-title').textContent = 'Edit Service';
        document.getElementById('form-subtitle').textContent = `Editing ${serviceId}`;
        document.getElementById('form-icon').className = 'w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center';
        document.getElementById('form-icon').innerHTML = '<i class="fas fa-edit text-white text-xl"></i>';

        // Populate form
        document.getElementById('form-service-id').value = service.service_id;
        document.getElementById('form-invoice-id').value = service.invoice_id;
        document.getElementById('form-service-stage').value = service.service_stage;
        document.getElementById('form-is-editing').value = 'true';
        document.getElementById('service-date').value = service.service_date?.split('T')[0] || '';

        // Show selected invoice info
        selectInvoice(service.invoice_id);

        // Populate items
        if (service.items && service.items.length > 0) {
            service.items.forEach(item => addItemRow(item));
        }

        // Populate charges (non-items)
        if (service.non_items && service.non_items.length > 0) {
            service.non_items.forEach(item => addChargeRow(item));
        }

        updateLiveTotals();
        showSection('section-form');

    } catch (error) {
        console.error('Error loading service for edit:', error);
        showToast('Failed to load service', 'error');
    }
}

function resetForm() {
    document.getElementById('service-form').reset();
    document.getElementById('form-service-id').value = '';
    document.getElementById('form-invoice-id').value = '';
    document.getElementById('form-service-stage').value = '';
    document.getElementById('form-is-editing').value = 'false';
    document.getElementById('next-service-month').value = '';
    document.getElementById('items-container').innerHTML = '';
    document.getElementById('charges-container').innerHTML = '';
    document.getElementById('selected-invoice-info').classList.add('hidden');
    document.getElementById('invoice-selection-wrapper').classList.remove('hidden');
    document.getElementById('invoice-search').value = '';

    // Reset to step 1
    ServiceState.currentFormStep = 1;
    updateFormStep();
    updateLiveTotals();
}

async function generateServiceId() {
    try {
        const response = await fetch('/service/generate-id');
        if (!response.ok) throw new Error('Failed to generate ID');
        const data = await response.json();
        document.getElementById('form-service-id').value = data.service_id;
    } catch (error) {
        console.error('Error generating service ID:', error);
    }
}

// ============================================================================
// INVOICE PICKER
// ============================================================================
function initInvoiceSearch() {
    const searchInput = document.getElementById('invoice-search');
    const dropdown = document.getElementById('invoice-dropdown');
    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = searchInput.value.trim().toLowerCase();
            if (query.length < 1) {
                dropdown.classList.add('hidden');
                return;
            }

            const matches = ServiceState.allInvoices.filter(inv => {
                const searchable = [inv.invoice_id, inv.customer_name, inv.project_name]
                    .filter(Boolean).join(' ').toLowerCase();
                return searchable.includes(query);
            }).slice(0, 10);

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="p-4 text-gray-500 text-center">No invoices found</div>';
            } else {
                dropdown.innerHTML = matches.map(inv => `
                    <div class="invoice-option" data-invoice-id="${inv.invoice_id}">
                        <div class="inv-id">${inv.invoice_id}</div>
                        <div class="inv-details">${escapeHtml(inv.customer_name || '')} • ${escapeHtml(inv.project_name || '')}</div>
                    </div>
                `).join('');

                // Add click handlers
                dropdown.querySelectorAll('.invoice-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        selectInvoice(opt.dataset.invoiceId);
                        dropdown.classList.add('hidden');
                    });
                });
            }

            dropdown.classList.remove('hidden');
        }, 200);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            searchInput.dispatchEvent(new Event('input'));
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#invoice-selection-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });
}

async function selectInvoice(invoiceId) {
    const invoice = ServiceState.allInvoices.find(inv => inv.invoice_id === invoiceId);
    if (!invoice) {
        // Try fetching from server
        try {
            const response = await fetch(`/invoice/${invoiceId}`);
            if (!response.ok) throw new Error('Invoice not found');
            const data = await response.json();
            populateInvoiceInfo(data.invoice);
        } catch (error) {
            console.error('Error fetching invoice:', error);
            showToast('Invoice not found', 'error');
            return;
        }
    } else {
        populateInvoiceInfo(invoice);
    }
}

function populateInvoiceInfo(invoice) {
    document.getElementById('form-invoice-id').value = invoice.invoice_id;
    document.getElementById('form-service-stage').value = (invoice.service_stage || 0) + 1;

    document.getElementById('selected-inv-id').textContent = invoice.invoice_id;
    document.getElementById('info-customer').textContent = invoice.customer_name || '-';
    document.getElementById('info-project').textContent = invoice.project_name || '-';
    document.getElementById('info-phone').textContent = invoice.customer_phone || '-';
    document.getElementById('info-stage').textContent = getStageLabel((invoice.service_stage || 0) + 1);

    // Set the invoice's service_month as the default for next service month
    document.getElementById('next-service-month').value = invoice.service_month || 0;

    document.getElementById('selected-invoice-info').classList.remove('hidden');
    document.getElementById('invoice-selection-wrapper').classList.add('hidden');
}

// ============================================================================
// ITEMS MANAGEMENT
// ============================================================================
let itemCounter = 0;

function addItemRow(data = {}) {
    itemCounter++;
    const container = document.getElementById('items-container');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.itemId = itemCounter;

    row.innerHTML = `
        <div style="position: relative; flex: 1; z-index: 10;">
            <input type="text" placeholder="Description" class="item-desc" value="${escapeHtml(data.description || '')}" style="width: 100%;">
            <ul class="suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 9999; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 200px; overflow-y: auto; margin-top: 4px; list-style: none; padding: 0;"></ul>
        </div>
        <input type="text" placeholder="HSN" class="item-hsn" value="${escapeHtml(data.HSN_SAC || '')}">
        <input type="number" placeholder="Qty" class="item-qty" value="${data.quantity || ''}" min="0">
        <input type="number" placeholder="Price" class="item-price" value="${data.unit_price || ''}" min="0">
        <input type="number" placeholder="Tax%" class="item-tax" value="${data.rate || ''}" min="0" max="100">
        <button type="button" class="text-red-500 hover:text-red-700 remove-item-btn" title="Remove">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(row);

    const qtyInput = row.querySelector('.item-qty');
    if (qtyInput) {
        qtyInput.setAttribute('step', '1');
        qtyInput.addEventListener('keypress', function (event) {
            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
        });
        qtyInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            updateLiveTotals();
        });
    }

    // Setup autocomplete for description field
    const descInput = row.querySelector('.item-desc');
    const suggestionsList = row.querySelector('.suggestions');
    let selectedIndex = -1;

    descInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        suggestionsList.innerHTML = '';
        selectedIndex = -1;

        if (query.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        const filtered = stockItems.filter(item => item.toLowerCase().includes(query));

        if (filtered.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        // Use fixed positioning to avoid overflow clipping
        const inputRect = descInput.getBoundingClientRect();
        suggestionsList.style.position = 'fixed';
        suggestionsList.style.top = (inputRect.bottom + 4) + 'px';
        suggestionsList.style.left = inputRect.left + 'px';
        suggestionsList.style.width = inputRect.width + 'px';
        suggestionsList.style.display = 'block';

        filtered.slice(0, 10).forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', async () => {
                descInput.value = item;
                suggestionsList.style.display = 'none';
                await fillStockItemData(item, row);
                updateLiveTotals();
            });
            suggestionsList.appendChild(li);
        });
    });

    descInput.addEventListener('keydown', async function (event) {
        const items = suggestionsList.querySelectorAll('li');
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSuggestionSelection(items, selectedIndex);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateSuggestionSelection(items, selectedIndex);
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
            event.preventDefault();
            event.stopPropagation();
            const selectedItem = items[selectedIndex].textContent;
            descInput.value = selectedItem;
            suggestionsList.style.display = 'none';
            await fillStockItemData(selectedItem, row);
            updateLiveTotals();
            selectedIndex = -1;
        } else if (event.key === 'Escape') {
            suggestionsList.style.display = 'none';
            selectedIndex = -1;
        }
    });

    descInput.addEventListener('blur', function () {
        // Delay hiding to allow click on suggestion
        setTimeout(() => {
            suggestionsList.style.display = 'none';
        }, 200);
    });

    // Event listeners for live totals
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateLiveTotals);
    });

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
        row.remove();
        updateLiveTotals();
    });

    // Focus on description field for new items
    if (!data.description) {
        setTimeout(() => descInput.focus(), 50);
    }
}

// Update suggestion selection styling
function updateSuggestionSelection(items, selectedIndex) {
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
    });
}

// Fetch and fill stock item data
async function fillStockItemData(itemName, row) {
    try {
        const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
        if (response.ok) {
            const stockData = await response.json();
            if (stockData) {
                row.querySelector('.item-hsn').value = stockData.HSN_SAC || '';
                row.querySelector('.item-price').value = stockData.unit_price || '';
                row.querySelector('.item-tax').value = stockData.GST || '';
            }
        }
    } catch (error) {
        console.error('Error fetching stock item data:', error);
    }
}

function addChargeRow(data = {}) {
    const container = document.getElementById('charges-container');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.style.gridTemplateColumns = '1fr 100px 80px 40px';

    row.innerHTML = `
        <input type="text" placeholder="Description" class="charge-desc" value="${escapeHtml(data.description || '')}">
        <input type="number" placeholder="Amount" class="charge-amount" value="${data.price || ''}" min="0">
        <input type="number" placeholder="Tax%" class="charge-tax" value="${data.rate || ''}" min="0" max="100">
        <button type="button" class="text-red-500 hover:text-red-700 remove-charge-btn" title="Remove">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(row);

    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateLiveTotals);
    });

    row.querySelector('.remove-charge-btn').addEventListener('click', () => {
        row.remove();
        updateLiveTotals();
    });
}

function updateLiveTotals() {
    let subtotal = 0;
    let tax = 0;

    // Items
    document.querySelectorAll('#items-container .item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const taxRate = parseFloat(row.querySelector('.item-tax')?.value) || 0;

        const lineTotal = qty * price;
        subtotal += lineTotal;
        tax += lineTotal * (taxRate / 100);
    });

    // Charges
    document.querySelectorAll('#charges-container .item-row').forEach(row => {
        const amount = parseFloat(row.querySelector('.charge-amount')?.value) || 0;
        const taxRate = parseFloat(row.querySelector('.charge-tax')?.value) || 0;

        subtotal += amount;
        tax += amount * (taxRate / 100);
    });

    document.getElementById('live-subtotal').textContent = `₹ ${formatNumber(subtotal)}`;
    document.getElementById('live-tax').textContent = `₹ ${formatNumber(tax)}`;
    document.getElementById('live-total').textContent = `₹ ${formatNumber(subtotal + tax)}`;
}

function collectFormData() {
    const items = [];
    document.querySelectorAll('#items-container .item-row').forEach(row => {
        const desc = row.querySelector('.item-desc')?.value?.trim();
        if (!desc) return;

        items.push({
            description: desc,
            HSN_SAC: row.querySelector('.item-hsn')?.value?.trim() || '',
            quantity: parseFloat(row.querySelector('.item-qty')?.value) || 0,
            unit_price: parseFloat(row.querySelector('.item-price')?.value) || 0,
            rate: parseFloat(row.querySelector('.item-tax')?.value) || 0
        });
    });

    const nonItems = [];
    document.querySelectorAll('#charges-container .item-row').forEach(row => {
        const desc = row.querySelector('.charge-desc')?.value?.trim();
        if (!desc) return;

        nonItems.push({
            description: desc,
            price: parseFloat(row.querySelector('.charge-amount')?.value) || 0,
            rate: parseFloat(row.querySelector('.charge-tax')?.value) || 0
        });
    });

    // Calculate totals
    let subtotal = 0;
    let tax = 0;
    items.forEach(item => {
        const lineTotal = item.quantity * item.unit_price;
        subtotal += lineTotal;
        tax += lineTotal * (item.rate / 100);
    });
    nonItems.forEach(item => {
        subtotal += item.price;
        tax += item.price * (item.rate / 100);
    });

    return {
        service_id: document.getElementById('form-service-id').value,
        invoice_id: document.getElementById('form-invoice-id').value,
        service_date: document.getElementById('service-date').value,
        service_stage: parseInt(document.getElementById('form-service-stage').value) || 1,
        next_service_month: parseInt(document.getElementById('next-service-month').value) || 0,
        items,
        non_items: nonItems,
        total_amount_no_tax: subtotal,
        total_tax: tax,
        total_amount_with_tax: subtotal + tax,
        notes: `Service stage ${document.getElementById('form-service-stage').value || 1} completed`,
        declaration: '',
        terms_and_conditions: ''
    };
}

// ============================================================================
// FORM STEP NAVIGATION
// ============================================================================
function updateFormStep() {
    const step = ServiceState.currentFormStep;

    document.querySelectorAll('.form-step').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step);
    });

    document.getElementById('form-step-indicator').textContent = `Step ${step} of 2`;
    document.getElementById('form-prev-btn').disabled = step === 1;

    // Toggle buttons
    document.getElementById('form-next-btn').classList.toggle('hidden', step === 2);
    document.getElementById('form-save-btn').classList.toggle('hidden', step === 1);
    document.getElementById('form-print-btn').classList.toggle('hidden', step === 1);
    document.getElementById('form-pdf-btn').classList.toggle('hidden', step === 1);
}

async function nextFormStep() {
    if (ServiceState.currentFormStep === 1) {
        // Validate
        if (!document.getElementById('form-invoice-id').value) {
            showToast('Please select an invoice', 'error');
            return;
        }
        if (!document.getElementById('service-date').value) {
            showToast('Please select a service date', 'error');
            return;
        }

        // Validate items
        const items = document.querySelectorAll('#items-container .item-row');
        let isValid = true;
        for (const [index, row] of items.entries()) {
            const price = row.querySelector('.item-price');
            if (price && (!price.value || parseFloat(price.value) <= 0)) {
                showToast(`Item #${index + 1}: Unit Price must be greater than 0`, 'error');
                isValid = false;
                break; // Stop at first error
            }
        }
        if (!isValid) return;

        // Generate preview
        await generatePreview();
    }

    ServiceState.currentFormStep = Math.min(2, ServiceState.currentFormStep + 1);
    updateFormStep();
}

function prevFormStep() {
    ServiceState.currentFormStep = Math.max(1, ServiceState.currentFormStep - 1);
    updateFormStep();
}

async function generatePreview() {
    const data = collectFormData();
    const invoice = ServiceState.allInvoices.find(inv => inv.invoice_id === data.invoice_id) || {};
    data.invoice_details = invoice;

    try {
        const html = await generateDocumentHTML(data);
        document.getElementById('preview-content').innerHTML = html;
    } catch (error) {
        console.error('Error generating preview:', error);
        document.getElementById('preview-content').innerHTML = '<p class="text-red-500">Error generating preview</p>';
    }
}

async function generateDocumentHTML(serviceData) {
    const invoice = serviceData.invoice_details || ServiceState.allInvoices.find(inv => inv.invoice_id === serviceData.invoice_id) || {};

    // Prepare items for CalculationEngine
    const items = (serviceData.items || []).map(item => ({
        ...item,
        rate: item.rate || 0
    }));

    const nonItems = (serviceData.non_items || []).map(item => ({
        ...item,
        rate: item.rate || 0
    }));

    // Calculate totals
    const calcEngine = new CalculationEngine(items, nonItems);
    const calculation = calcEngine.calculate();

    // Prepare Buyer Info
    const buyerInfo = SectionRenderers.renderBuyerDetails({
        name: invoice.customer_name || serviceData.customer_name,
        address: invoice.customer_address,
        phone: invoice.customer_phone,
        title: "Bill To:"
    });

    // Prepare Info Section
    const infoSection = SectionRenderers.renderInfoSection([
        { label: "Project", value: invoice.project_name || serviceData.project_name },
        { label: "Invoice Ref", value: serviceData.invoice_id },
        { label: "Date", value: formatDateShort(serviceData.service_date) },
        { label: "Stage", value: getStageLabel(serviceData.service_stage) }
    ]);

    // Build Document
    // We use 'invoice' type to match the style requested
    const html = await buildSimpleDocument({
        documentId: serviceData.service_id,
        documentType: 'Service Report',
        buyerInfo,
        infoSection,
        itemsHTML: calculation.renderableItems.map(i => i.html).join(''),
        footerMessage: "This is a computer generated document."
    });

    // Inject totals manually if buildSimpleDocument doesn't handle complex totals layout exactly like invoice
    // But buildSimpleDocument uses SectionRenderers.renderItemsTable which should handle it if we pass the right things.
    // Actually buildSimpleDocument adds renderItemsTable but doesn't pass totals object to it in the simple version?
    // Let's check buildSimpleDocument in documentBuilder.js again.

    // It calls: builder.addSection(SectionRenderers.renderItemsTable(itemsHTML, itemColumns));
    // renderItemsTable signature: (itemsHTML, columns = null, hasTax = false, totals = null)

    // So I need to pass totals to renderItemsTable.
    // But buildSimpleDocument doesn't expose totals param.

    // I should probably use DocumentBuilder directly instead of buildSimpleDocument to have more control, 
    // or modify buildSimpleDocument (which I shouldn't do if it affects others).

    // Let's use DocumentBuilder directly here to match the invoice style perfectly.

    const builder = new DocumentBuilder('invoice'); // Use invoice styling

    builder.addSection(await SectionRenderers.renderHeader());
    builder.addSection(SectionRenderers.renderTitle('Service Report', serviceData.service_id));

    builder.addSection(`
        <div class="third-section">
            ${buyerInfo}
            ${infoSection}
        </div>
    `);

    // Render items table with totals
    builder.addSection(SectionRenderers.renderItemsTable(
        calculation.renderableItems.map(i => i.html).join(''),
        null,
        calculation.hasTax
    ));

    // Render totals and payment details (Invoice Style)
    builder.addSection(await SectionRenderers.renderInvoiceFifthSection(
        calculation.totals.total,
        calculation.totals,
        calculation.hasTax
    ));

    builder.addSection(await SectionRenderers.renderSignatory());
    builder.addSection(SectionRenderers.renderFooter("This is a computer generated document."));

    return builder.wrapInContainer(builder.build());
}

// ============================================================================
// SAVE SERVICE
// ============================================================================
async function saveService() {
    const btn = document.getElementById('form-save-btn');
    btn.disabled = true;

    try {
        const data = collectFormData();
        const isEditing = document.getElementById('form-is-editing').value === 'true';

        const endpoint = isEditing ? '/service/update-service' : '/service/save-service';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to save service');
        }

        // Update next service status
        const nextService = document.getElementById('next-service-select').value;
        await fetch('/service/update-nextService', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoice_id: data.invoice_id,
                next_service: nextService
            })
        });

        showToast('Service saved successfully!');

        // Reload data and show view
        await loadAllData();
        navigateTo('view', data.service_id);

    } catch (error) {
        console.error('Error saving service:', error);
        showToast(error.message || 'Failed to save service', 'error');
    } finally {
        btn.disabled = false;
    }
}

// ============================================================================
// PRINT / PDF
// ============================================================================
async function printService(serviceId, action = 'print') {
    try {
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) throw new Error('Failed to fetch service');
        const data = await response.json();
        const service = data.service;

        let html = await generateDocumentHTML(service);

        // Strip contenteditable attributes for clean print/pdf
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        html = tempDiv.innerHTML;

        if (window.electronAPI && window.electronAPI.handlePrintEvent) {
            window.electronAPI.handlePrintEvent(html, action, `Service-${serviceId}`);
        } else {
            showToast('Print API not available', 'error');
        }
    } catch (error) {
        console.error('Error printing:', error);
        showToast('Failed to print', 'error');
    }
}

// ============================================================================
// PAYMENT MODAL
// ============================================================================
let currentPaymentServiceId = null;
let currentPaymentIndex = null;
let isEditingPayment = false;

function openPaymentModal(serviceId, paymentIndex = null, paymentData = null) {
    currentPaymentServiceId = serviceId;
    currentPaymentIndex = paymentIndex;
    isEditingPayment = paymentIndex !== null && paymentData !== null;

    // Try to find service in all available lists
    const service = ServiceState.completedServices.find(s => s.service_id === serviceId) ||
        ServiceState.dueServices.find(s => s.service_id === serviceId) ||
        ServiceState.allServices.find(s => s.service_id === serviceId);

    if (!service) {
        showToast('Service not found', 'error');
        return;
    }

    const total = service.total_amount_with_tax || 0;
    const paid = service.total_paid_amount || 0;
    const due = Math.max(0, total - paid);

    // Validation: Check if there is due amount (unless editing)
    if (!isEditingPayment && due <= 0) {
        window.electronAPI.showAlert1('There is no outstanding due on this service.');
        return;
    }

    // Update modal title and button based on mode
    const modalTitle = document.getElementById('payment-modal-title');
    const saveBtnText = document.getElementById('save-payment-btn-text');

    if (isEditingPayment) {
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit text-blue-600 mr-2"></i>Edit Payment';
        if (saveBtnText) saveBtnText.textContent = 'Update Payment';
    } else {
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-money-bill-wave text-green-600 mr-2"></i>Payment Details';
        if (saveBtnText) saveBtnText.textContent = 'Save Payment';
    }

    document.getElementById('modal-due-amount').textContent = `₹ ${formatNumber(due)}`;

    // Calculate effective due for validation (add back current payment if editing)
    let effectiveDue = due;
    if (isEditingPayment && paymentData) {
        effectiveDue += parseFloat(paymentData.paid_amount || 0);
    }

    // Set form values
    const paymentModeSelect = document.getElementById('modal-payment-mode');
    const paidAmountInput = document.getElementById('modal-paid-amount');

    // Clone to remove old listeners and add validation
    if (paidAmountInput) {
        const newPaidAmountInput = paidAmountInput.cloneNode(true);
        paidAmountInput.parentNode.replaceChild(newPaidAmountInput, paidAmountInput);

        newPaidAmountInput.addEventListener('input', function () {
            const val = parseFloat(this.value);
            if (val > effectiveDue) {
                this.setCustomValidity(`Amount cannot exceed due amount (₹ ${formatNumber(effectiveDue)})`);
                this.reportValidity();
                this.classList.add('border-red-500', 'focus:ring-red-500');
                this.classList.remove('border-gray-300', 'focus:ring-blue-500');
            } else {
                this.setCustomValidity('');
                this.classList.remove('border-red-500', 'focus:ring-red-500');
                this.classList.add('border-gray-300', 'focus:ring-blue-500');
            }
        });
    }

    // Re-select after replacement
    const currentPaidAmountInput = document.getElementById('modal-paid-amount');

    if (isEditingPayment && paymentData) {
        if (currentPaidAmountInput) currentPaidAmountInput.value = paymentData.paid_amount || '';
        paymentModeSelect.value = paymentData.payment_mode || 'Cash';

        if (paymentData.payment_date) {
            const editDate = new Date(paymentData.payment_date);
            document.getElementById('modal-payment-date').value = editDate.toISOString().split('T')[0];
        } else {
            document.getElementById('modal-payment-date').value = new Date().toISOString().split('T')[0];
        }

        // Trigger change event to update extra field based on payment mode
        paymentModeSelect.dispatchEvent(new Event('change'));

        // Set extra details after the field is created
        setTimeout(() => {
            if (paymentData.extra_details) {
                const mode = paymentData.payment_mode || 'Cash';
                let extraFieldInput = null;
                if (mode === 'Cash') {
                    extraFieldInput = document.getElementById('cash-location');
                } else if (mode === 'UPI') {
                    extraFieldInput = document.getElementById('upi-transaction-id');
                } else if (mode === 'Cheque') {
                    extraFieldInput = document.getElementById('cheque-number');
                } else if (mode === 'Bank Transfer') {
                    extraFieldInput = document.getElementById('bank-details');
                }
                if (extraFieldInput) {
                    extraFieldInput.value = paymentData.extra_details;
                }
            }
        }, 50);
    } else {
        document.getElementById('modal-paid-amount').value = '';
        document.getElementById('modal-payment-date').value = new Date().toISOString().split('T')[0];
        paymentModeSelect.value = 'Cash';

        // Trigger change event to update extra field based on payment mode
        paymentModeSelect.dispatchEvent(new Event('change'));
    }

    document.getElementById('payment-modal').classList.remove('hidden');
}

// Edit existing payment
async function editPayment(serviceId, paymentIndex) {
    try {
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) throw new Error('Failed to fetch service');

        const data = await response.json();
        const service = data.service;

        if (!service || !service.payments || paymentIndex >= service.payments.length) {
            showToast('Payment not found', 'error');
            return;
        }

        const paymentData = service.payments[paymentIndex];
        openPaymentModal(serviceId, paymentIndex, paymentData);
    } catch (error) {
        console.error('Error fetching payment for edit:', error);
        window.electronAPI.showAlert1('Failed to fetch payment details.');
    }
}

// Delete payment with confirmation
function deletePayment(serviceId, paymentIndex) {
    if (window.electronAPI && window.electronAPI.showAlert2) {
        window.electronAPI.showAlert2(
            'Are you sure you want to delete this payment? This action cannot be undone.',
            'Delete Payment'
        );

        window.electronAPI.receiveAlertResponse(async (response) => {
            if (response === "Yes") {
                try {
                    const res = await fetch(`/service/delete-payment/${serviceId}/${paymentIndex}`, {
                        method: 'DELETE'
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        window.electronAPI.showAlert1(`Error: ${data.message || 'Failed to delete payment.'}`);
                        return;
                    }

                    window.electronAPI.showAlert1('Payment deleted successfully.');

                    // Reload data and refresh view
                    await loadAllData();
                    if (ServiceState.selectedServiceId === serviceId) {
                        viewService(serviceId);
                    }
                } catch (error) {
                    console.error('Error deleting payment:', error);
                    window.electronAPI.showAlert1('Failed to delete payment.');
                }
            }
        });
    } else {
        // Fallback for non-electron environment
        if (confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
            deletePaymentConfirmed(serviceId, paymentIndex);
        }
    }
}

async function deletePaymentConfirmed(serviceId, paymentIndex) {
    try {
        const res = await fetch(`/service/delete-payment/${serviceId}/${paymentIndex}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (!res.ok) {
            window.electronAPI.showAlert1(`Error: ${data.message || 'Failed to delete payment.'}`);
            return;
        }

        window.electronAPI.showAlert1('Payment deleted successfully.');

        // Reload data and refresh view
        await loadAllData();
        if (ServiceState.selectedServiceId === serviceId) {
            viewService(serviceId);
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        window.electronAPI.showAlert1('Failed to delete payment.');
    }
}

async function savePayment() {
    const btn = document.getElementById('save-payment-btn');

    // Prevent double submission
    if (btn.disabled) return;

    const paidAmountInput = document.getElementById('modal-paid-amount');
    const amount = parseFloat(paidAmountInput?.value) || 0;
    const paymentDate = document.getElementById('modal-payment-date').value;
    const paymentMode = document.getElementById('modal-payment-mode').value;

    // Re-fetch service to get the latest due amount
    let dueAmount = null;
    let originalPaymentAmount = 0;
    try {
        const svcResp = await fetch(`/service/${currentPaymentServiceId}`);
        if (svcResp.ok) {
            const data = await svcResp.json();
            const service = data.service;
            if (service) {
                const totalAmount = service.total_amount_with_tax || 0;
                const paidSoFar = service.total_paid_amount || 0;

                // In edit mode, add back the original payment amount to due
                if (isEditingPayment && currentPaymentIndex !== null && service.payments && service.payments[currentPaymentIndex]) {
                    originalPaymentAmount = Number(service.payments[currentPaymentIndex].paid_amount || 0);
                }

                const adjustedDue = isEditingPayment
                    ? (totalAmount - paidSoFar + originalPaymentAmount)
                    : (totalAmount - paidSoFar);
                dueAmount = Number(adjustedDue.toFixed(2));
            }
        }
    } catch (err) {
        console.error('Error fetching service for validation:', err);
    }

    // Basic validations
    if (!currentPaymentServiceId) {
        window.electronAPI.showAlert1('Service not selected for payment.');
        return;
    }

    if (!paymentDate) {
        window.electronAPI.showAlert1('Please select a payment date.');
        return;
    }

    const today = new Date();
    const enteredDate = new Date(paymentDate + 'T00:00:00');
    if (isNaN(enteredDate.getTime())) {
        window.electronAPI.showAlert1('Invalid payment date.');
        return;
    }
    if (enteredDate > today) {
        window.electronAPI.showAlert1('Payment date cannot be in the future.');
        return;
    }

    if (!paymentMode) {
        window.electronAPI.showAlert1('Please select a payment method.');
        return;
    }

    if (amount <= 0 || isNaN(amount)) {
        window.electronAPI.showAlert1('Please enter a valid paid amount greater than 0.');
        paidAmountInput?.focus();
        return;
    }

    if (dueAmount !== null && amount > dueAmount) {
        window.electronAPI.showAlert1(`Paid amount cannot exceed due amount (₹ ${formatNumber(dueAmount)}).`);
        paidAmountInput?.focus();
        return;
    }

    // Extra info validations based on payment method
    let extraInfo = '';
    if (paymentMode === 'Cash') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cash location.');
            return;
        }
    } else if (paymentMode === 'UPI') {
        extraInfo = document.getElementById('upi-transaction-id')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter UPI transaction ID.');
            return;
        }
    } else if (paymentMode === 'Cheque') {
        extraInfo = document.getElementById('cheque-number')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cheque number.');
            return;
        }
    } else if (paymentMode === 'Bank Transfer') {
        extraInfo = document.getElementById('bank-details')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter bank details.');
            return;
        }
    }

    // Disable button while processing
    btn.disabled = true;
    const originalBtnText = document.getElementById('save-payment-btn-text').textContent;
    document.getElementById('save-payment-btn-text').textContent = 'Saving...';

    try {
        let response;
        if (isEditingPayment && currentPaymentIndex !== null) {
            // Update existing payment
            response = await fetch('/service/update-payment', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: currentPaymentServiceId,
                    paymentIndex: currentPaymentIndex,
                    paidAmount: amount,
                    paymentDate: paymentDate,
                    paymentMode: paymentMode,
                    paymentExtra: extraInfo
                })
            });
        } else {
            // Add new payment
            response = await fetch('/service/save-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: currentPaymentServiceId,
                    paidAmount: amount,
                    paymentDate: paymentDate,
                    paymentMode: paymentMode,
                    paymentExtra: extraInfo
                })
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || (isEditingPayment ? 'Failed to update payment' : 'Failed to save payment'));
        }

        window.electronAPI.showAlert1(isEditingPayment ? 'Payment Updated!' : 'Payment Saved!');
        document.getElementById('payment-modal').classList.add('hidden');

        // Reset edit state
        isEditingPayment = false;
        currentPaymentIndex = null;

        // Reload data
        await loadAllData();
        if (ServiceState.selectedServiceId === currentPaymentServiceId) {
            viewService(currentPaymentServiceId);
        }

    } catch (error) {
        console.error('Error saving payment:', error);
        window.electronAPI.showAlert1(`Error: ${error.message || (isEditingPayment ? 'Failed to update payment' : 'Failed to save payment')}`);
    } finally {
        btn.disabled = false;
        document.getElementById('save-payment-btn-text').textContent = originalBtnText;
    }
}

// ============================================================================
// HISTORY SECTION
// ============================================================================
async function showHistorySection(invoiceId) {
    showSection('section-history');
    document.getElementById('history-subtitle').textContent = `Invoice: ${invoiceId}`;
    document.getElementById('history-content').innerHTML = `
        <div class="flex items-center justify-center py-8">
            <i class="fas fa-spinner fa-spin text-purple-500 text-3xl"></i>
        </div>
    `;

    try {
        const response = await fetch(`/service/history/${invoiceId}`);
        if (!response.ok) throw new Error('Failed to fetch history');

        const data = await response.json();
        const services = data.services || [];

        if (services.length === 0) {
            document.getElementById('history-content').innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-4xl mb-3"></i>
                    <p>No service history found</p>
                </div>
            `;
            return;
        }

        document.getElementById('history-content').innerHTML = services.map((svc, i) => `
            <div class="flex gap-4 mb-6">
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                        ${svc.service_stage || i + 1}
                    </div>
                    ${i < services.length - 1 ? '<div class="w-0.5 flex-1 bg-purple-200 mt-2"></div>' : ''}
                </div>
                <div class="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="font-semibold text-gray-800">${svc.service_id}</span>
                            <span class="text-sm text-gray-500 ml-2">${getStageLabel(svc.service_stage)}</span>
                        </div>
                        <span class="text-sm text-gray-500">${formatDateShort(svc.service_date)}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${svc.items?.length || 0} items • ₹${formatNumber(svc.total_amount_with_tax || 0)}</p>
                    <button class="text-blue-600 hover:text-blue-800 text-sm view-history-details-btn" data-id="${svc.service_id}">
                        View Details →
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to avoid CSP issues with inline onclick
        document.querySelectorAll('.view-history-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                navigateTo('view', btn.dataset.id);
            });
        });

    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('history-content').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                <p>Failed to load service history</p>
            </div>
        `;
    }
}

// ============================================================================
// TOGGLE SERVICE STATUS
// ============================================================================
async function toggleServiceStatus(invoiceId) {
    // Find current status to show appropriate message
    const service = ServiceState.allServices.find(s => s.invoice_id === invoiceId) ||
        ServiceState.dueServices.find(s => s.invoice_id === invoiceId);

    const isPaused = service?.service_status === 'Paused';
    const action = isPaused ? 'resume' : 'pause';
    const message = isPaused
        ? 'Are you sure you want to resume this service schedule?'
        : 'Are you sure you want to pause this service schedule? No reminders will be sent while paused.';

    showConfirm(message, async (response) => {
        if (response === 'Yes') {
            try {
                const res = await fetch('/service/toggle-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoiceId })
                });

                if (!res.ok) throw new Error(`Failed to ${action} service`);

                showToast(`Service ${action}d successfully`);
                await loadAllData();

            } catch (error) {
                console.error(`Error ${action}ing service:`, error);
                showToast(`Failed to ${action} service`, 'error');
            }
        }
    });
}

// ============================================================================
// CLOSE SERVICE SCHEDULE
// ============================================================================
async function closeServiceSchedule(invoiceId) {
    showConfirm('Are you sure you want to close this service schedule? No further services will be scheduled.', async (response) => {
        if (response === 'Yes') {
            try {
                const response = await fetch(`/invoice/close-service/${invoiceId}`, {
                    method: 'POST'
                });

                if (!response.ok) throw new Error('Failed to close service');

                showToast('Service schedule closed');
                await loadAllData();

            } catch (error) {
                console.error('Error closing service:', error);
                showToast('Failed to close service', 'error');
            }
        }
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function initHeaderListeners() {
    // New Service button
    document.getElementById('new-service-btn')?.addEventListener('click', () => showNewForm());

    // Home button
    document.getElementById('home-btn')?.addEventListener('click', () => {
        window.location.href = '../dashboard/dashboard.html';
    });

    // Search
    const searchInput = document.getElementById('search-input');
    let searchDebounce;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            ServiceState.filters.search = searchInput.value.trim();
            renderCurrentTab();
        }, 300);
    });

    // Filter button
    document.getElementById('filter-btn')?.addEventListener('click', (e) => {
        const popover = document.getElementById('filter-popover');
        const rect = e.target.closest('button').getBoundingClientRect();
        popover.style.top = `${rect.bottom + 8}px`;
        popover.style.left = `${rect.left}px`;
        popover.classList.toggle('hidden');
    });

    // Apply filters
    document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
        ServiceState.filters.date = document.getElementById('date-filter').value;
        ServiceState.filters.paymentStatus = document.getElementById('payment-status-filter').value;
        ServiceState.filters.sort = document.getElementById('sort-filter').value;
        document.getElementById('filter-popover').classList.add('hidden');
        renderCurrentTab();
    });

    // Clear filters
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
        ServiceState.filters = { search: '', date: 'all', paymentStatus: 'all', sort: 'date-desc' };
        document.getElementById('search-input').value = '';
        document.getElementById('date-filter').value = 'all';
        document.getElementById('payment-status-filter').value = 'all';
        document.getElementById('sort-filter').value = 'date-desc';
        document.getElementById('filter-popover').classList.add('hidden');
        renderCurrentTab();
    });

    // Shortcuts
    document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.remove('hidden');
    });
}

function initFormListeners() {
    // Invoice search
    initInvoiceSearch();

    // Clear invoice
    document.getElementById('clear-invoice-btn')?.addEventListener('click', () => {
        document.getElementById('form-invoice-id').value = '';
        document.getElementById('selected-invoice-info').classList.add('hidden');
        document.getElementById('invoice-selection-wrapper').classList.remove('hidden');
        document.getElementById('invoice-search').value = '';
    });

    // Add item/charge
    document.getElementById('add-item-btn')?.addEventListener('click', () => addItemRow());
    document.getElementById('add-charge-btn')?.addEventListener('click', () => addChargeRow());

    // Form navigation
    document.getElementById('form-next-btn')?.addEventListener('click', nextFormStep);
    document.getElementById('form-prev-btn')?.addEventListener('click', prevFormStep);
    document.getElementById('cancel-form-btn')?.addEventListener('click', showEmptyState);

    // Save
    document.getElementById('form-save-btn')?.addEventListener('click', saveService);

    // Print/PDF (Form)
    document.getElementById('form-print-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId, 'print');
        } else {
            showToast('Please save the service first', 'error');
        }
    });

    document.getElementById('form-pdf-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId, 'savePDF');
        } else {
            showToast('Please save the service first', 'error');
        }
    });

    // View panel print/pdf
    document.getElementById('view-print-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId, 'print');
        }
    });

    document.getElementById('view-pdf-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId, 'savePDF');
        }
    });
}

function initModalListeners() {
    // Payment modal
    document.getElementById('close-payment-btn')?.addEventListener('click', () => {
        document.getElementById('payment-modal').classList.add('hidden');
        // Reset edit state on close
        isEditingPayment = false;
        currentPaymentIndex = null;
        // Reset extra payment details to default Cash field
        const extraField = document.getElementById('extra-payment-details');
        if (extraField) {
            extraField.innerHTML = `
                <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                </label>
                <input type="text" id="cash-location" placeholder="Enter cash location"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        }
        // Reset payment mode to Cash
        const paymentModeSelect = document.getElementById('modal-payment-mode');
        if (paymentModeSelect) {
            paymentModeSelect.value = 'Cash';
        }
    });
    document.getElementById('modal-fill-amount')?.addEventListener('click', () => {
        const dueText = document.getElementById('modal-due-amount').textContent;
        const due = parseFloat(dueText.replace(/[₹,\s]/g, '')) || 0;
        document.getElementById('modal-paid-amount').value = due;
    });
    document.getElementById('save-payment-btn')?.addEventListener('click', savePayment);

    // Payment mode change handler - dynamically update extra details field like invoice
    document.getElementById('modal-payment-mode')?.addEventListener('change', function () {
        const mode = this.value;
        const extraField = document.getElementById('extra-payment-details');

        if (!extraField) return;

        extraField.innerHTML = ''; // Clear previous

        if (mode === 'Cash') {
            extraField.innerHTML = `
                <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                </label>
                <input type="text" id="cash-location" placeholder="Enter cash location"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'UPI') {
            extraField.innerHTML = `
                <label for="upi-transaction-id" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-mobile-alt text-gray-500 mr-1"></i>UPI Transaction ID
                </label>
                <input type="text" id="upi-transaction-id" placeholder="Enter UPI transaction ID"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Cheque') {
            extraField.innerHTML = `
                <label for="cheque-number" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-money-check text-gray-500 mr-1"></i>Cheque Number
                </label>
                <input type="text" id="cheque-number" placeholder="Enter cheque number"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        } else if (mode === 'Bank Transfer') {
            extraField.innerHTML = `
                <label for="bank-details" class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-university text-gray-500 mr-1"></i>Bank Details
                </label>
                <input type="text" id="bank-details" placeholder="Enter bank details"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
        }
    });

    // History section back button
    document.getElementById('history-back-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            showSection('section-view');
        } else {
            showEmptyState();
        }
    });

    // Shortcuts modal
    document.getElementById('close-shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.add('hidden');
    });

    // View panel buttons
    document.getElementById('view-close-btn')?.addEventListener('click', showEmptyState);
    document.getElementById('view-edit-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            navigateTo('edit', ServiceState.selectedServiceId);
        }
    });
    document.getElementById('view-history-btn')?.addEventListener('click', () => {
        const invoiceId = document.getElementById('view-invoice-id')?.textContent;
        if (invoiceId) showHistorySection(invoiceId);
    });
    document.getElementById('view-add-payment-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            openPaymentModal(ServiceState.selectedServiceId);
        }
    });
    document.getElementById('view-print-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId);
        }
    });
    document.getElementById('view-pdf-btn')?.addEventListener('click', () => {
        if (ServiceState.selectedServiceId) {
            printService(ServiceState.selectedServiceId, 'savePDF');
        }
    });
    document.getElementById('view-invoice-id')?.addEventListener('click', () => {
        const invoiceId = document.getElementById('view-invoice-id')?.textContent;
        if (invoiceId && invoiceId !== '-') {
            window.location.href = `../invoice/invoice.html?view=${invoiceId}`;
        }
    });

    // Close modals on backdrop click
    ['payment-modal', 'shortcuts-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target.id === id) {
                document.getElementById(id).classList.add('hidden');
            }
        });
    });

    // Close filter popover on outside click
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('filter-popover');
        if (!e.target.closest('#filter-btn') && !e.target.closest('#filter-popover')) {
            popover?.classList.add('hidden');
        }
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isModifierPressed = e.ctrlKey || e.metaKey;

        // Payment Modal Handling - check if payment modal is open
        const paymentModal = document.getElementById('payment-modal');
        const isPaymentOpen = paymentModal && !paymentModal.classList.contains('hidden');

        if (isPaymentOpen) {
            // Escape - close payment modal
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('close-payment-btn')?.click();
                return;
            }

            // Enter - submit payment (if not on a button)
            if (e.key === 'Enter') {
                // Allow default behavior for buttons (like close button)
                if (document.activeElement.tagName === 'BUTTON') {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('save-payment-btn')?.click();
                return;
            }

            // Tab - trap focus within modal
            if (e.key === 'Tab') {
                const focusableElements = paymentModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
                return;
            }

            // Block application shortcuts (Ctrl/Cmd/Alt) while modal is open
            if (isModifierPressed || e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            return; // Allow other keys (typing)
        }

        // Don't trigger if typing in input (when payment modal is not open)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }

        // Escape - close modals or cancel
        if (e.key === 'Escape') {
            const modals = ['shortcuts-modal'];
            for (const id of modals) {
                const modal = document.getElementById(id);
                if (!modal?.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    return;
                }
            }
            // If in form, cancel
            if (document.getElementById('section-form')?.classList.contains('active')) {
                showEmptyState();
            }
        }

        // Ctrl + N - New service
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showNewForm();
        }

        // Ctrl + S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (document.getElementById('section-form')?.classList.contains('active') && ServiceState.currentFormStep === 2) {
                saveService();
            }
        }

        // Ctrl + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }

        // Ctrl + H - Go home
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            window.location.href = '../dashboard/dashboard.html';
        }

        // ? - Show shortcuts
        if (e.key === '?') {
            document.getElementById('shortcuts-modal').classList.remove('hidden');
        }
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num) {
    return formatNumber(num);
}

function getStageLabel(stage) {
    const s = Number(stage) || 1;
    const suffixes = ['st', 'nd', 'rd'];
    const suffix = s <= 3 ? suffixes[s - 1] : 'th';
    return `${s}${suffix} Service`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');

    if (type === 'error') {
        toast.className = 'fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        toast.querySelector('i').className = 'fas fa-exclamation-circle';
    } else {
        toast.className = 'fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        toast.querySelector('i').className = 'fas fa-check-circle';
    }

    msgEl.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Debounce utility
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
