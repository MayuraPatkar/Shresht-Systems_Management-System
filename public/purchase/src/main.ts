// @ts-nocheck
(function () {
    const initializeMain = () => {
        // Initialize filters
        if ((window as any).initPurchaseFilters) {
            (window as any).initPurchaseFilters();
        }

        // Initialize keyboard shortcuts
        if ((window as any).initPurchaseShortcutsModal) {
            (window as any).initPurchaseShortcutsModal();
        }

        // Load recent purchases
        loadRecentPurchases();

        // New Purchase button
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
                window.location.href = '/purchase';
            });
        }

        // Dynamically toggle Header elements visibility based on active section
        const homeSection = document.getElementById('home');
        const newSection = document.getElementById('new');
        const viewSection = document.getElementById('view');

        const updateHeaderVisibility = () => {
            const isHomeVisible = homeSection ? window.getComputedStyle(homeSection).display !== 'none' : true;
            const isFormActive = newSection ? window.getComputedStyle(newSection).display !== 'none' : false;
            const isViewActive = viewSection ? window.getComputedStyle(viewSection).display !== 'none' : false;

            const searchFilterContainer = document.getElementById('search-filter-container');
            const refreshBtn = document.getElementById('refresh-btn');
            const archivedBtn = document.getElementById('archived-purchases-btn');
            const showDeletedBtn = document.getElementById('showDeletedBtn');
            const newPurchaseBtn = document.getElementById('new-purchase');

            if (isFormActive) {
                // Creation mode: hide search, filter, archived, trash, refresh, new-purchase. Show home.
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';
                if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                if (homeBtn) homeBtn.style.display = 'flex';
            } else if (isViewActive) {
                // View mode: hide search, filter, archived, trash. Show home, new-purchase, refresh.
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';
                if (newPurchaseBtn) newPurchaseBtn.style.display = 'flex';
                if (homeBtn) homeBtn.style.display = 'flex';
            } else {
                // Dashboard management mode
                if (searchFilterContainer) searchFilterContainer.style.display = 'flex';
                if (refreshBtn) refreshBtn.style.display = 'flex';
                if (showDeletedBtn) showDeletedBtn.style.display = 'flex';
                if (homeBtn) homeBtn.style.display = isHomeVisible ? 'none' : 'flex';

                // Contextual elements based on Trash mode
                const isTrashOpen = !!(window as any).showDeletedItems;
                if (isTrashOpen) {
                    if (archivedBtn) archivedBtn.style.display = 'none';
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                } else {
                    if (archivedBtn) archivedBtn.style.display = 'flex';
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'flex';
                }
            }
        };

        if (homeSection && homeBtn) {
            const observer = new MutationObserver(updateHeaderVisibility);
            observer.observe(homeSection, { attributes: true, attributeFilter: ['style'] });
            if (newSection) {
                observer.observe(newSection, { attributes: true, attributeFilter: ['style'] });
            }
            if (viewSection) {
                observer.observe(viewSection, { attributes: true, attributeFilter: ['style'] });
            }
            (window as any).updateHeaderVisibility = updateHeaderVisibility;
            updateHeaderVisibility();
        }

        // Handle URL parameters for cross-module navigation
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('view');
        if (viewId && (window as any).viewPurchase) {
            (window as any).viewPurchase(viewId);
            // Clean up URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMain);
    } else {
        initializeMain();
    }

    async function loadRecentPurchases() {
        try {
            if ((window as any).purchaseApi) {
                const data = await (window as any).purchaseApi.fetchRecentPurchases();
                if ((window as any).allPurchases) {
                    (window as any).allPurchases = data.purchases;
                }
                
                if ((window as any).applyPurchaseFilters) {
                    (window as any).applyPurchaseFilters();
                } else if ((window as any).purchaseTable) {
                    (window as any).purchaseTable.renderPurchases(data.purchases);
                }
            } else {
                console.error("Purchase API not loaded");
            }
        } catch (error) {
            console.error("Error fetching recent purchases:", error);
            showToast("Failed to load purchases", "error");
        }
    }

    function showNewPurchaseForm() {
        sessionStorage.removeItem('currentTab-status');

        if (typeof (window as any).updateHeaderVisibility === 'function') {
            (window as any).updateHeaderVisibility();
        }

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

        if (typeof (window as any).changeStep === 'function') {
            (window as any).changeStep(1);
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
        if (tableBody && tableBody.children.length === 0 && (window as any).addPurchaseItem) {
            (window as any).addPurchaseItem();
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
            loadRecentPurchases();
            return;
        }

        try {
            if ((window as any).searchDocuments) {
                // Querying 'purchase' instead of 'purchaseOrder'
                const results = await (window as any).searchDocuments('purchase', query, ['purchase_id', 'supplier_name', 'supplier_phone']);
                if ((window as any).purchaseTable) {
                    (window as any).purchaseTable.renderPurchases(results);
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

    // Assign to window for global access
    (window as any).loadRecentPurchases = loadRecentPurchases;
})();
