/**
 * Service Module Main Entry Point
 */

(function () {
    // Define Local State & expose it to window for components to access
    const ServiceState: ServiceState = {
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
    (window as any).ServiceState = ServiceState;

    let stockItems: string[] = [];
    (window as any).stockItems = stockItems;

    // Globals/Helpers
    const serviceApi = (window as any).serviceApi;
    const formatDateDisplay = (window as any).formatDateDisplay;
    const formatIndian = (window as any).formatIndian;
    const showConfirm = (window as any).showConfirm;
    const electronAPI = (window as any).electronAPI;

    // Form/View operations mapped from components
    const showNewForm = (window as any).showNewForm;
    const editService = (window as any).editService;
    const resetForm = (window as any).resetForm;
    const initInvoiceSearch = (window as any).initInvoiceSearch;
    const nextFormStep = (window as any).nextFormStep;
    const prevFormStep = (window as any).prevFormStep;
    const saveService = (window as any).saveService;
    const addItemRow = (window as any).addItemRow;
    const addChargeRow = (window as any).addChargeRow;

    const viewService = (window as any).viewService;
    const printService = (window as any).printService;
    const openPaymentModal = (window as any).openPaymentModal;
    const savePayment = (window as any).savePayment;
    const showHistorySection = (window as any).showHistorySection;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    document.addEventListener('DOMContentLoaded', async () => {
        // Set default date
        const dateInput = document.getElementById('service-date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput
                ? (window as any).getTodayForInput()
                : new Date().toISOString().split('T')[0];
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
            renderTabContent();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load services', 'error');
        }
    }
    (window as any).loadAllData = loadAllData;

    // Load stock items for autocomplete
    async function loadStockItems() {
        try {
            const items = await serviceApi.fetchStockNames();
            (window as any).stockItems = items;
            stockItems = items;
        } catch (error) {
            console.error('Error loading stock items:', error);
            (window as any).stockItems = [];
            stockItems = [];
        }
    }

    async function loadDueServices() {
        try {
            const data = await serviceApi.fetchDueServices();
            ServiceState.dueServices = data;
        } catch (error) {
            console.error('Error loading due services:', error);
            ServiceState.dueServices = [];
        }
    }

    async function loadAllServicesWithSchedule() {
        try {
            const data = await serviceApi.fetchAllServices();
            ServiceState.allServices = data;
        } catch (error) {
            console.error('Error loading all services:', error);
            ServiceState.allServices = [];
        }
    }

    async function loadCompletedServices() {
        try {
            const data = await serviceApi.fetchCompletedServices();
            ServiceState.completedServices = data;
        } catch (error) {
            console.error('Error loading completed services:', error);
            ServiceState.completedServices = [];
        }
    }

    async function loadInvoicesForPicker() {
        try {
            const data = await serviceApi.fetchInvoices();
            ServiceState.allInvoices = data;
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
            const viewVal = params.get('view');
            if (viewVal) (window as any).viewService(viewVal);
        } else if (params.has('new')) {
            const invVal = params.get('invoice') || null;
            (window as any).showNewForm(invVal);
        } else if (params.has('edit')) {
            const editVal = params.get('edit');
            if (editVal) (window as any).editService(editVal);
        } else {
            showEmptyState();
        }

        // Handle tab from URL
        if (params.has('tab')) {
            const tabVal = params.get('tab');
            if (tabVal) switchTab(tabVal as any);
        }
    }

    function updateURL(params: Record<string, string | null> = {}) {
        const url = new URL(window.location.href);
        // Clear existing params
        url.search = '';
        // Add new params
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        window.history.pushState({}, '', url.toString());
    }
    (window as any).updateURL = updateURL;

    function navigateTo(section: 'view' | 'new' | 'edit', id: string | null = null, extra: Record<string, string> = {}) {
        const params: Record<string, string | null> = { ...extra };
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
    (window as any).navigateTo = navigateTo;

    // ============================================================================
    // TAB MANAGEMENT
    // ============================================================================
    function initTabListeners() {
        document.querySelectorAll('.list-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = (tab as HTMLElement).dataset.tab;
                if (tabName) switchTab(tabName as any);
            });
        });
    }

    function switchTab(tabName: 'due' | 'all' | 'completed') {
        ServiceState.currentTab = tabName;

        // Update tab UI
        document.querySelectorAll('.list-tab').forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
        });

        renderTabContent();
    }

    function renderTabContent() {
        const listContainer = document.getElementById('service-list');
        if (!listContainer) return;

        let services: Service[] = [];
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
    (window as any).renderCurrentTab = renderTabContent;

    function applyFilters(services: Service[]): Service[] {
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
                const dateStr = s.service_date || s.invoice_date || s.createdAt;
                if (!dateStr) return true;
                const date = new Date(dateStr);
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
                // Determine payment status locally to filter correctly
                const paid = s.total_paid_amount || 0;
                const total = s.total_amount_with_tax || 0;
                let status = 'unpaid';
                if (total === 0 || paid >= total) status = 'paid';
                else if (paid > 0) status = 'partial';

                return status === ServiceState.filters.paymentStatus;
            });
        }

        // Sort
        filtered.sort((a, b) => {
            const dateA = new Date(a.service_date || a.invoice_date || a.createdAt || 0);
            const dateB = new Date(b.service_date || b.invoice_date || b.createdAt || 0);

            switch (ServiceState.filters.sort) {
                case 'date-asc':
                    return dateA.getTime() - dateB.getTime();
                case 'amount-desc':
                    return (b.total_amount_with_tax || 0) - (a.total_amount_with_tax || 0);
                case 'amount-asc':
                    return (a.total_amount_with_tax || 0) - (b.total_amount_with_tax || 0);
                default: // date-desc
                    return dateB.getTime() - dateA.getTime();
            }
        });

        return filtered;
    }

    // ============================================================================
    // CARD RENDERING
    // ============================================================================
    function getStageLabel(stage: number | string): string {
        const s = Number(stage) || 1;
        const suffixes = ['st', 'nd', 'rd'];
        const suffix = s <= 3 ? suffixes[s - 1] : 'th';
        return `${s}${suffix} Service`;
    }

    function formatDateShort(dateStr: string | Date | undefined): string {
        if (!dateStr) return 'N/A';
        return formatDateDisplay ? formatDateDisplay(dateStr) : new Date(dateStr).toLocaleDateString('en-IN');
    }

    function escapeHtml(str: string | undefined): string {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderPendingCard(service: Service) {
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
            const baseDate = new Date(service.invoice_date || service.createdAt || '');
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

    function renderCompletedCard(service: Service) {
        const serviceId = service.service_id || 'N/A';
        const invoiceId = service.invoice_id || 'N/A';
        const projectName = service.project_name || 'Unnamed Project';
        const customerName = service.customer_name || 'N/A';
        const stageLabel = getStageLabel(service.service_stage);
        const serviceDate = formatDateShort(service.service_date);
        const total = parseFloat(String(service.total_amount_with_tax || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Payment status
        const paid = service.total_paid_amount || 0;
        const totalAmt = service.total_amount_with_tax || 0;
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
            card.addEventListener('click', (e: any) => {
                if (e.target.closest('.quick-action-btn')) return; // Ignore if clicking action button

                // Highlight selected card
                document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                const type = (card as HTMLElement).dataset.type;
                if (type === 'completed') {
                    const serviceId = (card as HTMLElement).dataset.serviceId;
                    if (serviceId) navigateTo('view', serviceId);
                }
            });
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                e.stopPropagation();
                const action = (btn as HTMLElement).dataset.action;
                const serviceId = (btn as HTMLElement).dataset.serviceId || null;
                const invoiceId = (btn as HTMLElement).dataset.invoiceId || null;

                switch (action) {
                    case 'open':
                        if (invoiceId) (window as any).showNewForm(invoiceId);
                        break;
                    case 'view':
                        if (serviceId) navigateTo('view', serviceId);
                        break;
                    case 'edit':
                        if (serviceId) navigateTo('edit', serviceId);
                        break;
                    case 'payment':
                        if (serviceId) (window as any).openPaymentModal(serviceId);
                        break;
                    case 'print':
                        if (serviceId) (window as any).printService(serviceId);
                        break;
                    case 'history':
                        if (invoiceId) (window as any).showHistorySection(invoiceId);
                        break;
                    case 'toggle-pause':
                        if (invoiceId) toggleServiceStatus(invoiceId);
                        break;
                    case 'close':
                        if (invoiceId) closeServiceSchedule(invoiceId);
                        break;
                }
            });
        });
    }

    // ============================================================================
    // STATS UPDATE
    // ============================================================================
    function updateStats() {
        const setStatText = (id: string, text: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(text);
        };
        setStatText('due-count', ServiceState.dueServices.length);
        setStatText('paused-count', ServiceState.allServices.filter(s => s.service_status === 'Paused').length);
        setStatText('completed-count', ServiceState.completedServices.length);
        setStatText('service-count', ServiceState.dueServices.length + ServiceState.completedServices.length);
    }

    // ============================================================================
    // DETAIL PANEL MANAGEMENT
    // ============================================================================
    function showSection(sectionId: string) {
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
    (window as any).showEmptyState = showEmptyState;

    // ============================================================================
    // TOGGLE SERVICE STATUS
    // ============================================================================
    async function toggleServiceStatus(invoiceId: string) {
        // Find current status to show appropriate message
        const service = ServiceState.allServices.find(s => s.invoice_id === invoiceId) ||
            ServiceState.dueServices.find(s => s.invoice_id === invoiceId);

        const isPaused = service?.service_status === 'Paused';
        const action = isPaused ? 'resume' : 'pause';
        const message = isPaused
            ? 'Are you sure you want to resume this service schedule?'
            : 'Are you sure you want to pause this service schedule? No reminders will be sent while paused.';

        showConfirm(message, async (response: string) => {
            if (response === 'Yes') {
                try {
                    await serviceApi.toggleStatus(invoiceId);
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
    async function closeServiceSchedule(invoiceId: string) {
        showConfirm('Are you sure you want to close this service schedule? No further services will be scheduled.', async (response: string) => {
            if (response === 'Yes') {
                try {
                    await serviceApi.closeServiceSchedule(invoiceId);
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
        document.getElementById('new-service-btn')?.addEventListener('click', () => (window as any).showNewForm());

        // Home button
        document.getElementById('home-btn')?.addEventListener('click', () => {
            window.location.href = '../dashboard/dashboard.html';
        });

        // Search
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        let searchDebounce: any;
        searchInput?.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                ServiceState.filters.search = searchInput.value.trim();
                renderTabContent();
            }, 300);
        });

        // Filter button
        document.getElementById('filter-btn')?.addEventListener('click', (e: any) => {
            const popover = document.getElementById('filter-popover');
            if (!popover) return;
            const rect = e.target.closest('button').getBoundingClientRect();
            popover.style.top = `${rect.bottom + 8}px`;
            popover.style.left = `${rect.left}px`;
            popover.classList.toggle('hidden');
        });

        // Apply filters
        document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
            ServiceState.filters.date = (document.getElementById('date-filter') as HTMLSelectElement).value as any;
            ServiceState.filters.paymentStatus = (document.getElementById('payment-status-filter') as HTMLSelectElement).value as any;
            ServiceState.filters.sort = (document.getElementById('sort-filter') as HTMLSelectElement).value as any;
            document.getElementById('filter-popover')?.classList.add('hidden');
            renderTabContent();
        });

        // Clear filters
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            ServiceState.filters = { search: '', date: 'all', paymentStatus: 'all', sort: 'date-desc' };
            const setVal = (id: string, val: string) => {
                const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
                if (el) el.value = val;
            };
            setVal('search-input', '');
            setVal('date-filter', 'all');
            setVal('payment-status-filter', 'all');
            setVal('sort-filter', 'date-desc');
            document.getElementById('filter-popover')?.classList.add('hidden');
            renderTabContent();
        });

        // Shortcuts
        document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
            document.getElementById('shortcuts-modal')?.classList.remove('hidden');
        });
    }

    function initFormListeners() {
        // Invoice search
        (window as any).initInvoiceSearch();

        // Clear invoice
        document.getElementById('clear-invoice-btn')?.addEventListener('click', () => {
            const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
            if (invIdInput) invIdInput.value = '';
            document.getElementById('selected-invoice-info')?.classList.add('hidden');
            document.getElementById('invoice-selection-wrapper')?.classList.remove('hidden');
            const invSearch = document.getElementById('invoice-search') as HTMLInputElement;
            if (invSearch) invSearch.value = '';
        });

        // Add item/charge
        document.getElementById('add-item-btn')?.addEventListener('click', () => (window as any).addItemRow());
        document.getElementById('add-charge-btn')?.addEventListener('click', () => (window as any).addChargeRow());

        // Form navigation
        document.getElementById('form-next-btn')?.addEventListener('click', (window as any).nextFormStep);
        document.getElementById('form-prev-btn')?.addEventListener('click', (window as any).prevFormStep);
        document.getElementById('cancel-form-btn')?.addEventListener('click', showEmptyState);

        // Save
        document.getElementById('form-save-btn')?.addEventListener('click', (window as any).saveService);

        // Print/PDF (Form)
        document.getElementById('form-print-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                (window as any).printService(ServiceState.selectedServiceId, 'print');
            } else {
                showToast('Please save the service first', 'error');
            }
        });

        document.getElementById('form-pdf-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                (window as any).printService(ServiceState.selectedServiceId, 'savePDF');
            } else {
                showToast('Please save the service first', 'error');
            }
        });

        // View panel print/pdf
        document.getElementById('view-print-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                (window as any).printService(ServiceState.selectedServiceId, 'print');
            }
        });

        document.getElementById('view-pdf-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                (window as any).printService(ServiceState.selectedServiceId, 'savePDF');
            }
        });
    }

    function initModalListeners() {
        // Payment modal
        document.getElementById('close-payment-btn')?.addEventListener('click', () => {
            document.getElementById('payment-modal')?.classList.add('hidden');
            // Reset edit state on close
            (window as any).isEditingPayment = false;
            (window as any).currentPaymentIndex = null;
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
            const paymentModeSelect = document.getElementById('modal-payment-mode') as HTMLSelectElement;
            if (paymentModeSelect) {
                paymentModeSelect.value = 'Cash';
            }
        });

        document.getElementById('modal-fill-amount')?.addEventListener('click', () => {
            const dueText = document.getElementById('modal-due-amount')?.textContent || '0';
            const due = parseFloat(dueText.replace(/[₹,\s]/g, '')) || 0;
            const paidInput = document.getElementById('modal-paid-amount') as HTMLInputElement;
            if (paidInput) paidInput.value = String(due);
        });

        document.getElementById('save-payment-btn')?.addEventListener('click', (window as any).savePayment);

        // Payment mode change handler - dynamically update extra details field like invoice
        document.getElementById('modal-payment-mode')?.addEventListener('change', function (this: HTMLSelectElement) {
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
            document.getElementById('shortcuts-modal')?.classList.add('hidden');
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
            if (invoiceId) (window as any).showHistorySection(invoiceId);
        });
        document.getElementById('view-add-payment-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                (window as any).openPaymentModal(ServiceState.selectedServiceId);
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
            document.getElementById(id)?.addEventListener('click', (e: any) => {
                if (e.target.id === id) {
                    document.getElementById(id)?.classList.add('hidden');
                }
            });
        });

        // Close filter popover on outside click
        document.addEventListener('click', (e: any) => {
            const popover = document.getElementById('filter-popover');
            if (!e.target.closest('#filter-btn') && !e.target.closest('#filter-popover')) {
                popover?.classList.add('hidden');
            }
        });
    }

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e: any) => {
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
                    if (document.activeElement?.tagName === 'BUTTON') {
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
                        const firstElement = focusableElements[0] as HTMLElement;
                        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

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
                    if (modal && !modal.classList.contains('hidden')) {
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
                (window as any).showNewForm();
            }

            // Ctrl + S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (document.getElementById('section-form')?.classList.contains('active') && ServiceState.currentFormStep === 2) {
                    (window as any).saveService();
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
                document.getElementById('shortcuts-modal')?.classList.remove('hidden');
            }
        });
    }

    // Toast functionality
    function showToast(message: string, type: 'success' | 'error' = 'success') {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        const iconEl = toast?.querySelector('i');

        if (!toast || !msgEl || !iconEl) return;

        if (type === 'error') {
            toast.className = 'fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            iconEl.className = 'fas fa-exclamation-circle';
        } else {
            toast.className = 'fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            iconEl.className = 'fas fa-check-circle';
        }

        msgEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    (window as any).showToast = showToast;
})();
