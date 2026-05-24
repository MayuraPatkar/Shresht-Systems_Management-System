// @ts-nocheck
(function () {
    const initializeMain = () => {
        // Initialize filters
        if ((window as any).initPurchaseOrderFilters) {
            (window as any).initPurchaseOrderFilters();
        }

        // Initialize keyboard shortcuts
        if ((window as any).initPurchaseOrderShortcutsModal) {
            (window as any).initPurchaseOrderShortcutsModal();
        }

        // Load recent purchase orders
        loadRecentPurchaseOrders();

        // New Purchase Order button
        const newBtn = document.getElementById('new-purchase');
        if (newBtn) {
            newBtn.addEventListener('click', showNewPurchaseForm);
        }

        // Search functionality
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
            let searchTimeout: any;
            searchInput.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => handleSearch(query), 300);
            });
        }

        // Home button
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentTab-status');
                window.location.href = '/purchaseorder';
            });
        }

        // Handle URL parameters for cross-module navigation
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('view');
        if (viewId && (window as any).viewPurchaseOrder) {
            (window as any).viewPurchaseOrder(viewId);
            // Clean up URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMain);
    } else {
        initializeMain();
    }

    async function loadRecentPurchaseOrders() {
        try {
            if ((window as any).purchaseOrderApi) {
                const data = await (window as any).purchaseOrderApi.fetchRecentPurchaseOrders();
                if ((window as any).allPurchaseOrders) {
                    (window as any).allPurchaseOrders = data.purchaseOrders;
                }
                
                if ((window as any).applyPurchaseOrderFilters) {
                    (window as any).applyPurchaseOrderFilters();
                } else if ((window as any).purchaseOrderTable) {
                    (window as any).purchaseOrderTable.renderPurchaseOrders(data.purchaseOrders);
                }
            } else {
                console.error("PurchaseOrder API not loaded");
            }
        } catch (error) {
            console.error("Error fetching recent purchase orders:", error);
            showToast("Failed to load purchase orders", "error");
        }
    }

    function showNewPurchaseForm() {
        sessionStorage.removeItem('currentTab-status');

        // Hide Search bar and Filter button
        const searchFilterContainer = document.getElementById('search-filter-container');
        if (searchFilterContainer) searchFilterContainer.style.display = 'none';

        // Hide View Preview button
        const viewPreview = document.getElementById('view-preview');
        if (viewPreview) viewPreview.style.display = 'none';

        if ((window as any).showNewDocumentForm) {
            (window as any).showNewDocumentForm({
                homeId: 'home',
                formId: 'new',
                newButtonId: 'new-purchase',
                viewId: 'view'
            });
        } else {
            const home = document.getElementById('home');
            const newSection = document.getElementById('new');
            const viewSection = document.getElementById('view');
            
            if (home) home.style.display = 'none';
            if (newSection) newSection.style.display = 'block';
            if (viewSection) viewSection.style.display = 'none';
        }

        // Set default date to today
        const dateInput = document.getElementById('purchase-date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput ? 
                (window as any).getTodayForInput() : 
                new Date().toISOString().split('T')[0];
        }

        // Pre-fill initial row with defaults if necessary
        const tableBody = document.querySelector("#items-table tbody");
        if (tableBody && tableBody.children.length === 0 && (window as any).addPurchaseOrderItem) {
            (window as any).addPurchaseOrderItem();
        }

        // Focus on the first field after the form is visible
        setTimeout(() => {
            const firstInput = document.getElementById('purchase-invoice-id') as HTMLInputElement;
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    async function handleSearch(query: string) {
        if (!query.trim()) {
            loadRecentPurchaseOrders();
            return;
        }

        try {
            if ((window as any).searchDocuments) {
                const results = await (window as any).searchDocuments('purchaseOrder', query, ['purchase_order_id', 'supplier_name', 'supplier_phone']);
                if ((window as any).purchaseOrderTable) {
                    (window as any).purchaseOrderTable.renderPurchaseOrders(results);
                }
            }
        } catch (error) {
            console.error("Search failed:", error);
            showToast("Search failed. Please try again.", "error");
        }
    }

    function showToast(message: string, type = 'info') {
        if ((window as any).electronAPI) {
            if (type === 'error') {
                (window as any).electronAPI.showAlert1(message);
            } else {
                (window as any).electronAPI.showAlert2(message);
            }
        } else {
            alert(message);
        }
    }

    // Assign to window for global access if needed
    (window as any).loadRecentPurchaseOrders = loadRecentPurchaseOrders;
})();
