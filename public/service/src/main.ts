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
    (window as any).totalSteps = 4;

    let stockItems: string[] = [];
    (window as any).stockItems = stockItems;
    let paginationManager: any = null;

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

    // DOM Elements
    const $homeSec = document.getElementById('home') as HTMLDivElement;
    const $newSec = document.getElementById('new') as HTMLDivElement;
    const $homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
    const $dueCount = document.getElementById('due-count');
    const $pausedCount = document.getElementById('paused-count');
    const $completedCount = document.getElementById('completed-count');
    const $serviceCount = document.getElementById('service-count');
    const $tableHeader = document.getElementById('table-header-row');
    const $tbody = document.getElementById('service-tbody');
    const $mobileCards = document.getElementById('service-cards-mobile');

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
            if (viewVal) {
                window.location.href = `/service/details?id=${viewVal}`;
                return;
            }
        } else if (params.has('new') || params.has('invoice') || params.has('invoiceId') || params.has('invoice_id')) {
            const invVal = params.get('invoice') || params.get('invoiceId') || params.get('invoice_id') || null;
            showNewForm(invVal);
        } else if (params.has('edit')) {
            let editVal = params.get('edit');
            if (editVal === 'true') {
                editVal = params.get('id') || params.get('serviceId');
            }
            if (editVal) editService(editVal);
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
        url.search = '';
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        window.history.pushState({}, '', url.toString());
    }
    (window as any).updateURL = updateURL;

    function navigateTo(section: 'view' | 'new' | 'edit', id: string | null = null, extra: Record<string, string> = {}) {
        if (section === 'view' && id) {
            window.location.href = `/service/details?id=${id}`;
            return;
        }
        const params: Record<string, string | null> = { ...extra };
        if (section === 'new') {
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

        document.querySelectorAll('.list-tab').forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
        });

        renderTabContent();
    }

    function renderTabContent() {
        if (!$tbody || !$tableHeader) return;

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

        const tableContainer = $tableHeader.closest('.hidden.md\\:block.overflow-y-auto') as HTMLElement | null;
        services = applyFilters(services);
        updateActiveFiltersBar();

        if (ServiceState.currentTab === 'completed') {
            if (tableContainer) {
                tableContainer.classList.add('completed-tab');
                tableContainer.classList.remove('pending-tab');
            }
            $tableHeader.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Completed Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Service ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Project Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Stage</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Payment Status</th>
            `;
        } else {
            if (tableContainer) {
                tableContainer.classList.add('pending-tab');
                tableContainer.classList.remove('completed-tab');
            }
            // Pending / Due / Scheduled
            $tableHeader.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Scheduled Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Invoice Ref</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Project Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Next Stage</th>
            `;
        }

        if (!paginationManager) {
            paginationManager = new (window as any).TablePaginationManager(
                'service-tbody',
                (paginatedData: any[]) => renderPage(paginatedData),
                25
            );
        }
        paginationManager.setData(services);
    }

    function renderPage(paginatedServices: Service[]) {
        if (!$tbody) return;

        if (paginatedServices.length === 0) {
            $tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-4 py-12 text-center text-slate-400 bg-white align-middle h-full">
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <i class="fas fa-inbox text-3xl mb-2"></i>
                            <p class="text-sm font-semibold">No services found in this category.</p>
                        </div>
                    </td>
                </tr>`;
            if ($mobileCards) {
                $mobileCards.innerHTML = `
                    <div class="text-center py-8 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-inbox text-2xl text-slate-350 mb-2"></i>
                        <p class="text-xs font-semibold text-slate-600">No Services Found</p>
                    </div>`;
            }
            return;
        }

        if (ServiceState.currentTab === 'completed') {
            $tbody.innerHTML = paginatedServices.map(s => renderCompletedRow(s)).join('');
            if ($mobileCards) {
                $mobileCards.innerHTML = paginatedServices.map(s => renderCompletedMobileCard(s)).join('');
            }
        } else {
            $tbody.innerHTML = paginatedServices.map(s => renderPendingRow(s)).join('');
            if ($mobileCards) {
                $mobileCards.innerHTML = paginatedServices.map(s => renderPendingMobileCard(s)).join('');
            }
        }

        addTableEventListeners();
    }
    (window as any).renderCurrentTab = renderTabContent;

    function applyFilters(services: Service[]): Service[] {
        let filtered = [...services];

        if (ServiceState.filters.search) {
            const search = ServiceState.filters.search.toLowerCase();
            filtered = filtered.filter(s => {
                const searchable = [
                    s.invoice_id, s.service_id, s.customer_name, s.project_name
                ].filter(Boolean).join(' ').toLowerCase();
                return searchable.includes(search);
            });
        }

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

        if (ServiceState.filters.paymentStatus !== 'all') {
            filtered = filtered.filter(s => {
                const paid = s.total_paid_amount || 0;
                const total = s.total_amount_with_tax || 0;
                let status = 'unpaid';
                if (total === 0 || paid >= total) status = 'paid';
                else if (paid > 0) status = 'partial';

                return status === ServiceState.filters.paymentStatus;
            });
        }

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
    // CARD & ROW RENDERING
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

    function renderPendingRow(service: Service) {
        const invoiceId = service.invoice_id || 'N/A';
        const projectName = service.project_name || 'Unnamed Project';
        const customerName = service.customer_name || 'N/A';
        const nextStage = (service.service_stage || 0) + 1;
        const stageLabel = getStageLabel(nextStage);

        let dueDate = 'N/A';

        if (service.next_service_date) {
            const d = new Date(service.next_service_date);
            dueDate = formatDateShort(d);
        } else if (service.service_month && (service.invoice_date || service.createdAt)) {
            const baseDate = new Date(service.invoice_date || service.createdAt || '');
            baseDate.setMonth(baseDate.getMonth() + service.service_month);
            dueDate = formatDateShort(baseDate);
        }

        return `
            <tr class="service-row border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs" data-invoice-id="${invoiceId}" data-id="${invoiceId}">
                <td class="px-4 py-3 font-semibold text-slate-850 whitespace-nowrap">${dueDate}</td>
                <td class="px-4 py-3 font-bold text-blue-600 hover:underline cursor-pointer invoice-link-cell" data-inv-ref="${invoiceId}">${invoiceId}</td>
                <td class="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate" title="${escapeHtml(projectName)}">${escapeHtml(projectName)}</td>
                <td class="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate" title="${escapeHtml(customerName)}">${escapeHtml(customerName)}</td>
                <td class="px-4 py-3 font-bold text-purple-650">${stageLabel}</td>
            </tr>
        `;
    }

    function renderCompletedRow(service: Service) {
        const serviceId = service.service_id || 'N/A';
        const invoiceId = service.invoice_id || 'N/A';
        const projectName = service.project_name || 'Unnamed Project';
        const customerName = service.customer_name || 'N/A';
        const stageLabel = getStageLabel(service.service_stage);
        const serviceDate = formatDateShort(service.service_date);
        const total = parseFloat(String(service.total_amount_with_tax || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const paid = service.total_paid_amount || 0;
        const totalAmt = service.total_amount_with_tax || 0;
        const isPaid = paid >= totalAmt || totalAmt === 0;
        const isPartial = paid > 0 && paid < totalAmt;

        let paymentBadge = '<span class="status-badge bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-bold">Unpaid</span>';
        if (totalAmt === 0) paymentBadge = '<span class="status-badge bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold">No Charge</span>';
        else if (isPaid) paymentBadge = '<span class="status-badge bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold">Paid</span>';
        else if (isPartial) paymentBadge = '<span class="status-badge bg-yellow-50 text-yellow-750 border border-yellow-100 px-2 py-0.5 rounded text-[10px] font-bold">Partial</span>';

        return `
            <tr class="service-row border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs" data-service-id="${serviceId}" data-id="${serviceId}">
                <td class="px-4 py-3 font-semibold text-slate-850 whitespace-nowrap">${serviceDate}</td>
                <td class="px-4 py-3 font-bold text-slate-800">${serviceId}</td>
                <td class="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate" title="${escapeHtml(projectName)}">${escapeHtml(projectName)}</td>
                <td class="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate" title="${escapeHtml(customerName)}">${escapeHtml(customerName)}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">${stageLabel}</td>
                <td class="px-4 py-3 whitespace-nowrap">${paymentBadge}</td>
            </tr>
        `;
    }

    function renderPendingMobileCard(service: Service) {
        const invoiceId = service.invoice_id || 'N/A';
        const projectName = service.project_name || 'Unnamed Project';
        const customerName = service.customer_name || 'N/A';
        const nextStage = (service.service_stage || 0) + 1;
        const stageLabel = getStageLabel(nextStage);

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
            statusBadge = '<span class="status-badge bg-yellow-50 text-yellow-750 border border-yellow-100 px-2 py-0.5 rounded text-[10px] font-semibold">Paused</span>';
        } else if (isDue) {
            statusBadge = '<span class="status-badge bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-semibold">Due</span>';
        } else {
            statusBadge = '<span class="status-badge bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-semibold">Scheduled</span>';
        }

        return `
            <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="window.location.href='/service/details?id=${invoiceId}'">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${dueDate}</span>
                    ${statusBadge}
                </div>
                <div>
                    <p class="text-sm font-bold text-slate-800">${escapeHtml(projectName)}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(customerName)} • Invoice: ${invoiceId}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-2 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                    <span>Next Stage:</span>
                    <span class="font-bold text-purple-700">${stageLabel}</span>
                </div>
            </div>
        `;
    }

    function renderCompletedMobileCard(service: Service) {
        const serviceId = service.service_id || 'N/A';
        const invoiceId = service.invoice_id || 'N/A';
        const projectName = service.project_name || 'Unnamed Project';
        const customerName = service.customer_name || 'N/A';
        const stageLabel = getStageLabel(service.service_stage);
        const serviceDate = formatDateShort(service.service_date);
        const total = parseFloat(String(service.total_amount_with_tax || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const paid = service.total_paid_amount || 0;
        const totalAmt = service.total_amount_with_tax || 0;
        const isPaid = paid >= totalAmt || totalAmt === 0;
        const isPartial = paid > 0 && paid < totalAmt;

        let paymentBadge = '<span class="status-badge bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-semibold">Unpaid</span>';
        if (totalAmt === 0) paymentBadge = '<span class="status-badge bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-semibold">No Charge</span>';
        else if (isPaid) paymentBadge = '<span class="status-badge bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-semibold">Paid</span>';
        else if (isPartial) paymentBadge = '<span class="status-badge bg-yellow-50 text-yellow-755 border border-yellow-100 px-2 py-0.5 rounded text-[10px] font-semibold">Partial</span>';

        return `
            <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="window.location.href='/service/details?id=${serviceId}'">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${serviceDate}</span>
                    ${paymentBadge}
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-slate-800">${escapeHtml(projectName)}</p>
                        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(customerName)} • Stage: ${stageLabel}</p>
                    </div>
                    <p class="text-sm font-extrabold text-slate-900">₹ ${total}</p>
                </div>
            </div>
        `;
    }

    function addTableEventListeners() {
        // Row clicks
        $tbody?.querySelectorAll('.service-row').forEach((row: any) => {
            row.addEventListener('click', (e: any) => {
                // Ignore if clicking action buttons or links
                if (e.target.closest('.quick-action-btn') || e.target.closest('.invoice-link-cell')) return;

                const id = row.dataset.id;
                if (id) {
                    if (ServiceState.currentTab === 'completed') {
                        navigateTo('view', id);
                    } else {
                        navigateTo('edit', id);
                    }
                }
            });
        });

        // Invoice links
        $tbody?.querySelectorAll('.invoice-link-cell').forEach((cell: any) => {
            cell.addEventListener('click', (e: any) => {
                e.stopPropagation();
                const invId = cell.dataset.invRef;
                if (invId) {
                    window.location.href = `/invoice?view=${invId}`;
                }
            });
        });

        // Quick action buttons
        $tbody?.querySelectorAll('.quick-action-btn').forEach((btn: any) => {
            btn.addEventListener('click', (e: any) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const serviceId = btn.dataset.serviceId || null;
                const invoiceId = btn.dataset.invoiceId || null;

                switch (action) {
                    case 'open':
                        if (invoiceId) showNewForm(invoiceId);
                        break;
                    case 'view':
                        if (serviceId) navigateTo('view', serviceId);
                        break;
                    case 'view-invoice':
                        if (invoiceId) window.location.href = `/service/details?id=${invoiceId}`;
                        break;
                    case 'edit':
                        if (serviceId) navigateTo('edit', serviceId);
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
        if ($dueCount) $dueCount.textContent = String(ServiceState.dueServices.length);
        if ($pausedCount) $pausedCount.textContent = String(ServiceState.allServices.filter(s => s.service_status === 'Paused').length);
        if ($completedCount) $completedCount.textContent = String(ServiceState.completedServices.length);
        if ($serviceCount) $serviceCount.textContent = String(ServiceState.dueServices.length + ServiceState.completedServices.length);
    }

    // ============================================================================
    // VIEW SECTION TOGGLES
    // ============================================================================
    function toggleSection(showNew: boolean) {
        const searchWrapper = document.getElementById('search-input')?.parentElement?.parentElement;
        const newServiceBtn = document.getElementById('new-service-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        if (showNew) {
            $homeSec.classList.add('hidden');
            $newSec.classList.remove('hidden');
            $homeBtn.classList.remove('hidden');

            if (searchWrapper) searchWrapper.style.display = 'none';
            if (newServiceBtn) newServiceBtn.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
        } else {
            $newSec.classList.add('hidden');
            $homeSec.classList.remove('hidden');
            $homeBtn.classList.add('hidden');

            if (searchWrapper) searchWrapper.style.display = 'flex';
            if (newServiceBtn) newServiceBtn.style.display = 'flex';
            if (refreshBtn) refreshBtn.style.display = 'flex';
        }
    }
    (window as any).toggleSection = toggleSection;

    function showEmptyState() {
        toggleSection(false);
        ServiceState.selectedServiceId = null;
        updateURL({});
    }
    (window as any).showEmptyState = showEmptyState;

    // ============================================================================
    // STATUS OPERATIONS
    // ============================================================================
    async function toggleServiceStatus(invoiceId: string) {
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
    // HEADER EVENT LISTENERS
    // ============================================================================
    function initHeaderListeners() {
        document.getElementById('new-service-btn')?.addEventListener('click', () => showNewForm());

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('animate-spin');
                await loadAllData().finally(() => {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('animate-spin');
                    }, 500);
                });
            });
        }

        // Header Back Home (back to main service list)
        $homeBtn?.addEventListener('click', () => {
            showEmptyState();
        });

        // Search inputs
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        let searchDebounce: any;
        searchInput?.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                ServiceState.filters.search = searchInput.value.trim();
                renderTabContent();
            }, 300);
        });

        // Filter popover toggles
        document.getElementById('filter-btn')?.addEventListener('click', (e: any) => {
            const popover = document.getElementById('filter-popover');
            if (!popover) return;
            const rect = e.target.closest('button').getBoundingClientRect();
            popover.classList.toggle('hidden');
            
            if (!popover.classList.contains('hidden')) {
                popover.style.top = `${rect.bottom + 8}px`;
                const popoverWidth = 280;
                let leftPos = rect.right - popoverWidth;
                if (leftPos < 16) {
                    leftPos = 16;
                }
                popover.style.left = `${leftPos}px`;
            }
        });

        const dateFilter = document.getElementById('date-filter') as HTMLInputElement | null;
        const paymentStatusFilter = document.getElementById('payment-status-filter') as HTMLInputElement | null;
        const sortFilter = document.getElementById('sort-filter') as HTMLInputElement | null;

        const dateDropdown = document.getElementById('dateFilterDropdown');
        const paymentStatusDropdown = document.getElementById('paymentStatusFilterDropdown');
        const sortDropdown = document.getElementById('sortFilterDropdown');

        // Handle date filter clicks
        if (dateDropdown && dateFilter) {
            dateDropdown.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (!link) return;

                e.preventDefault();

                dateDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                link.classList.add('bg-gray-100', 'font-semibold');

                const value = link.getAttribute('data-date-filter') || 'all';
                ServiceState.filters.date = value as any;
                dateFilter.value = value;
                renderTabContent();
            });
        }

        // Handle payment status filter clicks
        if (paymentStatusDropdown && paymentStatusFilter) {
            paymentStatusDropdown.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (!link) return;

                e.preventDefault();

                paymentStatusDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                link.classList.add('bg-gray-100', 'font-semibold');

                const value = link.getAttribute('data-payment-status-filter') || 'all';
                ServiceState.filters.paymentStatus = value as any;
                paymentStatusFilter.value = value;
                renderTabContent();
            });
        }

        // Handle sort filter clicks
        if (sortDropdown && sortFilter) {
            sortDropdown.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (!link) return;

                e.preventDefault();

                sortDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                link.classList.add('bg-gray-100', 'font-semibold');

                const value = link.getAttribute('data-sort-filter') || 'date-desc';
                ServiceState.filters.sort = value as any;
                sortFilter.value = value;
                renderTabContent();
            });
        }

        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            ServiceState.filters = { search: '', date: 'all', paymentStatus: 'all', sort: 'date-desc' };
            const setVal = (id: string, val: string) => {
                const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
                if (el) el.value = val;
            };
            setVal('search-input', '');
            if (dateFilter) dateFilter.value = 'all';
            if (paymentStatusFilter) paymentStatusFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';

            if (dateDropdown) {
                dateDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }
            if (paymentStatusDropdown) {
                paymentStatusDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }
            if (sortDropdown) {
                sortDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }

            document.getElementById('filter-popover')?.classList.add('hidden');
            renderTabContent();
        });

        document.getElementById('clear-all-filters-shortcut')?.addEventListener('click', () => {
            ServiceState.filters = { search: '', date: 'all', paymentStatus: 'all', sort: 'date-desc' };
            const setVal = (id: string, val: string) => {
                const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
                if (el) el.value = val;
            };
            setVal('search-input', '');
            if (dateFilter) dateFilter.value = 'all';
            if (paymentStatusFilter) paymentStatusFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';

            if (dateDropdown) {
                dateDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }
            if (paymentStatusDropdown) {
                paymentStatusDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }
            if (sortDropdown) {
                sortDropdown.querySelectorAll('a').forEach((a, i) => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                });
            }

            renderTabContent();
        });

        document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
            document.getElementById('shortcuts-modal')?.classList.remove('hidden');
        });
    }

    function initFormListeners() {
        initInvoiceSearch();

        document.getElementById('clear-invoice-btn')?.addEventListener('click', () => {
            const invIdInput = document.getElementById('form-invoice-id') as HTMLInputElement;
            if (invIdInput) invIdInput.value = '';
            document.getElementById('selected-invoice-info')?.classList.add('hidden');
            document.getElementById('invoice-selection-wrapper')?.classList.remove('hidden');
            const invSearch = document.getElementById('invoice-search') as HTMLInputElement;
            if (invSearch) invSearch.value = '';
        });

        document.getElementById('add-item-btn')?.addEventListener('click', () => (window as any).addItemRow());
        document.getElementById('add-charge-btn')?.addEventListener('click', () => (window as any).addChargeRow());

        document.getElementById('cancel-form-btn')?.addEventListener('click', showEmptyState);
        document.getElementById('save-btn')?.addEventListener('click', (window as any).saveService);

        // Print/PDF (Form)
        document.getElementById('print-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                printCompletedService(ServiceState.selectedServiceId, 'print');
            } else {
                showToast('Please save the service first', 'error');
            }
        });

        document.getElementById('pdf-btn')?.addEventListener('click', () => {
            if (ServiceState.selectedServiceId) {
                printCompletedService(ServiceState.selectedServiceId, 'savePDF');
            } else {
                showToast('Please save the service first', 'error');
            }
        });
    }

    // Helper inside main.ts to print completed service from form
    async function printCompletedService(id: string, action = 'print') {
        try {
            const service = await serviceApi.fetchServiceDetails(id);
            // Render report utilizing same details document builder
            const detailsJs = (window as any).printService;
            if (detailsJs) {
                detailsJs(id, action);
            } else {
                // Inline fallback print details trigger
                window.location.href = `/service/details?id=${id}`;
            }
        } catch (e) {
            console.error('Failed to print from main form', e);
        }
    }

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
                if (e.key === 'Escape') e.target.blur();
                return;
            }

            if (e.key === 'Escape') {
                const shortcuts = document.getElementById('shortcuts-modal');
                if (shortcuts && !shortcuts.classList.contains('hidden')) {
                    shortcuts.classList.add('hidden');
                    return;
                }
                if (document.getElementById('new') && !document.getElementById('new')?.classList.contains('hidden')) {
                    showEmptyState();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                showNewForm();
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (document.getElementById('new') && !document.getElementById('new')?.classList.contains('hidden') && (window as any).currentStep === 3) {
                    (window as any).saveService();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                $homeBtn?.click();
            }

            if (e.key === '?') {
                document.getElementById('shortcuts-modal')?.classList.remove('hidden');
            }
        });
    }

    // Modal backdrops clicks
    document.getElementById('shortcuts-modal')?.addEventListener('click', (e: any) => {
        if (e.target.id === 'shortcuts-modal') {
            document.getElementById('shortcuts-modal')?.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e: any) => {
        const popover = document.getElementById('filter-popover');
        if (!e.target.closest('#filter-btn') && !e.target.closest('#filter-popover')) {
            popover?.classList.add('hidden');
        }
    });

    function showToast(message: string, type: 'success' | 'error' = 'success') {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        const iconEl = toast?.querySelector('i');

        if (!toast || !msgEl || !iconEl) return;

        toast.className = `fixed bottom-6 right-6 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`;
        iconEl.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        msgEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    (window as any).showToast = showToast;

    function updateActiveFiltersBar() {
        const infoBar = document.getElementById('active-filters-info-bar');
        const badgesContainer = document.getElementById('active-filters-badges');
        if (!infoBar || !badgesContainer) return;

        // Preserve only the header label span
        const label = badgesContainer.querySelector('span');
        badgesContainer.innerHTML = '';
        if (label) badgesContainer.appendChild(label);

        const activeBadges: { label: string, clearFn: () => void }[] = [];

        // Search Query
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const query = ServiceState.filters.search;
        if (query) {
            activeBadges.push({
                label: `Search: "${query}"`,
                clearFn: () => {
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    ServiceState.filters.search = '';
                    renderTabContent();
                }
            });
        }

        // Date Filter
        if (ServiceState.filters.date !== 'all') {
            const dateLabels: Record<string, string> = {
                today: 'Today',
                week: 'This Week',
                month: 'This Month'
            };
            const dateLabel = dateLabels[ServiceState.filters.date] || ServiceState.filters.date;
            activeBadges.push({
                label: `Date: ${dateLabel}`,
                clearFn: () => {
                    ServiceState.filters.date = 'all';
                    const dateFilter = document.getElementById('date-filter') as HTMLInputElement | null;
                    if (dateFilter) dateFilter.value = 'all';
                    const dateDropdown = document.getElementById('dateFilterDropdown');
                    if (dateDropdown) {
                        dateDropdown.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    }
                    renderTabContent();
                }
            });
        }

        // Payment Status Filter
        if (ServiceState.filters.paymentStatus !== 'all') {
            const paymentLabels: Record<string, string> = {
                paid: 'Paid',
                unpaid: 'Unpaid',
                partial: 'Partial'
            };
            const paymentLabel = paymentLabels[ServiceState.filters.paymentStatus] || ServiceState.filters.paymentStatus;
            activeBadges.push({
                label: `Payment: ${paymentLabel}`,
                clearFn: () => {
                    ServiceState.filters.paymentStatus = 'all';
                    const paymentStatusFilter = document.getElementById('payment-status-filter') as HTMLInputElement | null;
                    if (paymentStatusFilter) paymentStatusFilter.value = 'all';
                    const paymentStatusDropdown = document.getElementById('paymentStatusFilterDropdown');
                    if (paymentStatusDropdown) {
                        paymentStatusDropdown.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    }
                    renderTabContent();
                }
            });
        }

        // Sort Filter
        if (ServiceState.filters.sort !== 'date-desc') {
            const sortLabels: Record<string, string> = {
                'date-asc': 'Oldest First',
                'amount-desc': 'Amount: High-Low',
                'amount-asc': 'Amount: Low-High'
            };
            const sortLabel = sortLabels[ServiceState.filters.sort] || ServiceState.filters.sort;
            activeBadges.push({
                label: `Sort: ${sortLabel}`,
                clearFn: () => {
                    ServiceState.filters.sort = 'date-desc';
                    const sortFilter = document.getElementById('sort-filter') as HTMLInputElement | null;
                    if (sortFilter) sortFilter.value = 'date-desc';
                    const sortDropdown = document.getElementById('sortFilterDropdown');
                    if (sortDropdown) {
                        sortDropdown.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    }
                    renderTabContent();
                }
            });
        }

        // Style the filter button (highlight if filters are active)
        const filterBtn = document.getElementById('filter-btn');
        const hasActiveFilters = ServiceState.filters.date !== 'all' || 
                                 ServiceState.filters.paymentStatus !== 'all' || 
                                 ServiceState.filters.sort !== 'date-desc';
        if (filterBtn) {
            if (hasActiveFilters) {
                filterBtn.className = 'bg-blue-600 text-white border border-blue-600 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 active:scale-95 cursor-pointer shadow-md shadow-blue-100';
            } else {
                filterBtn.className = 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer';
            }
        }

        if (activeBadges.length > 0) {
            infoBar.classList.remove('hidden');
            activeBadges.forEach(badgeData => {
                const badge = document.createElement('span');
                badge.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm transition-all duration-150';
                badge.innerHTML = `
                    <span>${badgeData.label}</span>
                    <button class="text-blue-400 hover:text-blue-700 ml-0.5 focus:outline-none cursor-pointer text-[10px]" title="Remove filter">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                badge.querySelector('button')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    badgeData.clearFn();
                });
                badgesContainer.appendChild(badge);
            });
        } else {
            infoBar.classList.add('hidden');
        }
    }
})();
