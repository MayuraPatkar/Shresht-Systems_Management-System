/**
 * Keyboard shortcut handlers for the Stock module.
 */

// @ts-nocheck
(function () {
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    const STOCK_SHORTCUT_GROUPS = [
        {
            title: 'Navigation',
            icon: 'fas fa-arrows-alt text-blue-600',
            items: [
                { label: 'Focus Search', keys: ['Ctrl', 'F'] },
                { label: 'Exit / Cancel', keys: ['Esc'] }
            ]
        },
        {
            title: 'Stock Actions',
            icon: 'fas fa-bolt text-yellow-600',
            items: [
                { label: 'New Stock Item', keys: ['Ctrl', 'N'] },
                { label: 'Save Form', keys: ['Ctrl', 'S'] },
                { label: 'Print Stock Report', keys: ['Ctrl', 'P'] },
                { label: 'Refresh Stock Data', keys: ['Ctrl', 'R'] },
                { label: 'Show Help Modal', keys: ['?'] }
            ]
        }
    ];

    let shortcutsModalRef: HTMLElement | null = null;

    // Inject Keyboard Shortcut CSS Styles Dynamically
    function injectShortcutsStyles() {
        if (document.getElementById('shortcuts-custom-styles')) return;

        const style = document.createElement('style');
        style.id = 'shortcuts-custom-styles';
        style.textContent = `
            #shortcuts-modal {
                transition: opacity 0.25s ease-out;
            }
            #shortcuts-modal.hidden {
                opacity: 0;
                pointer-events: none;
                display: none !important;
            }
            .shortcuts-panel {
                width: 100%;
                animation: premiumModalShow 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .shortcuts-section {
                margin-bottom: 1.5rem;
            }
            .shortcuts-section:last-child {
                margin-bottom: 0;
            }
            .shortcut-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.65rem 0.5rem;
                border-bottom: 1px solid #f1f5f9;
                transition: background-color 0.15s ease;
                border-radius: 6px;
            }
            .shortcut-row:hover {
                background-color: #f8fafc;
            }
            .shortcut-keys {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                color: #94a3b8;
                font-size: 0.85rem;
            }
            .shortcut-keys kbd {
                background-color: #ffffff;
                border: 1px solid #e2e8f0;
                border-bottom-width: 2px;
                border-radius: 0.375rem;
                padding: 0.2rem 0.5rem;
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 0.8rem;
                font-weight: 600;
                color: #334155;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
        `;
        document.head.appendChild(style);
    }

    // Inject Modal HTML dynamically if not present
    function injectShortcutsModalHTML() {
        if (document.getElementById('shortcuts-modal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'shortcuts-modal';
        modalDiv.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center hidden opacity-0 transition-opacity duration-200';
        modalDiv.setAttribute('role', 'dialog');
        modalDiv.setAttribute('aria-modal', 'true');
        modalDiv.setAttribute('aria-label', 'Keyboard Shortcuts');

        modalDiv.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto shortcuts-panel">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <i class="fas fa-keyboard text-lg"></i>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-800 tracking-tight">Keyboard Shortcuts</h2>
                    </div>
                    <button id="close-shortcuts" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Close shortcuts help modal">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
                <div id="shortcuts-content" class="p-6 space-y-5"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    function initShortcutsModal() {
        injectShortcutsStyles();
        injectShortcutsModalHTML();

        shortcutsModalRef = document.getElementById('shortcuts-modal');
        if (!shortcutsModalRef) return;

        const content = document.getElementById('shortcuts-content');
        if (content) {
            content.innerHTML = STOCK_SHORTCUT_GROUPS.map(renderShortcutSection).join('');
        }

        const closeBtn = document.getElementById('close-shortcuts');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideShortcutsModal();
            });
        }

        // Close on outside click
        shortcutsModalRef.addEventListener('click', (e) => {
            if (e.target === shortcutsModalRef) {
                hideShortcutsModal();
            }
        });
    }

    function renderShortcutSection(section: any) {
        return `
            <div class="shortcuts-section">
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="${section.icon}"></i>
                    ${section.title}
                </h3>
                <div class="space-y-1">
                    ${section.items.map(renderShortcutRow).join('')}
                </div>
            </div>
        `;
    }

    function renderShortcutRow(item: any) {
        return `
            <div class="shortcut-row">
                <span class="text-xs font-semibold text-slate-600">${item.label}</span>
                ${renderShortcutKeys(item.keys)}
            </div>
        `;
    }

    function renderShortcutKeys(keys: string[]) {
        const keyCaps = keys.map((key, index) => {
            const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
            const separator = index > 0 ? '<span class="text-slate-300 font-medium">+</span>' : '';
            return `${separator}<kbd>${displayKey}</kbd>`;
        }).join('');
        return `<div class="shortcut-keys">${keyCaps}</div>`;
    }

    function showShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.remove('hidden');
        // Force reflow
        shortcutsModalRef.offsetHeight;
        shortcutsModalRef.classList.remove('opacity-0');
        
        // Trap focus to close button
        const closeBtn = document.getElementById('close-shortcuts');
        if (closeBtn) closeBtn.focus();
    }

    function hideShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.add('opacity-0');
        setTimeout(() => {
            shortcutsModalRef?.classList.add('hidden');
        }, 200);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields (except for Escape and Ctrl combinations)
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName);

        // Ctrl+F or Cmd+F to focus search input
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Ctrl+N or Cmd+N to add new stock item
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showModal('newStockModal');
            // Focus first input in the form
            setTimeout(() => {
                (document.getElementById('itemName') as HTMLInputElement | null)?.focus();
            }, 100);
        }

        // Ctrl+S or Cmd+S to save (submit) the active form
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();

            // Check which modal is open and submit its form
            const newStockModal = document.getElementById('newStockModal');
            const editStockModal = document.getElementById('editStockModal');

            // Also check for quantity modal
            const quantityModal = document.getElementById('quantityModal');

            if (newStockModal && !newStockModal.classList.contains('hidden')) {
                document.getElementById('newStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else if (editStockModal && !editStockModal.classList.contains('hidden')) {
                document.getElementById('editStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else if (quantityModal && !quantityModal.classList.contains('hidden')) {
                // Retrieve the stored submit handler or trigger the button click
                document.getElementById('quantityModalSubmitBtn')?.click();
            }
        }

        // Ctrl+P or Cmd+P to open print modal
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            showModal('printModal');
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            // Prevent global redirection
            e.preventDefault();
            e.stopPropagation();

            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
                return;
            }

            const modals = ['newStockModal', 'editStockModal', 'itemDetailsModal', 'printModal', 'quantityModal'];
            let closedSomething = false;

            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && !modal.classList.contains('hidden')) {
                    hideModal(modalId);
                    closedSomething = true;
                }
            });

            // If no modal was closed, redirect to dashboard manually if needed
            if (!closedSomething) {
                window.location.href = '/dashboard';
            }
        }

        // Ctrl+R or Cmd+R to refresh (trigger the Refresh button click)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.click();
            } else {
                fetchStockData();
                showSuccessMessage('Stock data refreshed!');
            }
        }

        // ? key to show keyboard shortcuts help (only when not typing)
        if (e.key === '?' && !isTyping) {
            e.preventDefault();
            showShortcutsModal();
        }
    }, true); // Use capture phase to intercept before global listener

    // Dom loaded event registration
    document.addEventListener('DOMContentLoaded', () => {
        initShortcutsModal();

        document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showShortcutsModal();
        });
    });

})();
