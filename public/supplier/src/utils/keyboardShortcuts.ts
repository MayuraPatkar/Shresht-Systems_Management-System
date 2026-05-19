// @ts-nocheck
/**
 * Keyboard Shortcuts Utility for Supplier Module
 * Handles all list-level, modal-level, and details-level navigation, action, and filter shortcuts.
 */

(function () {
    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    const isDetailsPage = window.location.pathname.includes('/details') || !!document.getElementById('header-supplier-name');

    // Shortcut Groups data definition
    const SHORTCUT_GROUPS = [
        {
            title: 'Navigation',
            icon: 'fas fa-arrows-alt text-blue-600',
            items: isDetailsPage ? [
                { label: 'Next Field', keys: ['Tab'] },
                { label: 'Previous Field', keys: ['Shift', 'Tab'] },
                { label: 'Exit / Cancel', keys: ['Esc'] }
            ] : [
                { label: 'Next Field', keys: ['Tab'] },
                { label: 'Previous Field', keys: ['Shift', 'Tab'] },
                { label: 'Exit / Cancel', keys: ['Esc'] },
                { label: 'Focus Search', keys: ['Ctrl', 'F'] }
            ]
        },
        {
            title: isDetailsPage ? 'Profile Actions' : 'Supplier Actions',
            icon: 'fas fa-bolt text-yellow-600',
            items: isDetailsPage ? [
                { label: 'Edit Profile', keys: ['Ctrl', 'E'] },
                { label: 'Export Supplier', keys: ['Ctrl', 'P'] },
                { label: 'Copy Supplier ID', keys: ['Ctrl', 'C'] },
                { label: 'Delete Supplier', keys: ['Ctrl', 'Delete'] },
                { label: 'Archive Supplier', keys: ['Ctrl', 'Shift', 'D'] }
            ] : [
                { label: 'New Supplier', keys: ['Ctrl', 'N'] },
                { label: 'Save Supplier', keys: ['Ctrl', 'S'] },
                { label: 'Refresh Suppliers', keys: ['Ctrl', 'R'] },
                { label: 'View Archived Suppliers', keys: ['Ctrl', 'Shift', 'A'] }
            ]
        }
    ];

    // Add profile tab shortcuts if we are on the details page
    if (isDetailsPage) {
        SHORTCUT_GROUPS.push({
            title: 'Profile Tabs',
            icon: 'fas fa-folder-open text-emerald-600',
            items: [
                { label: 'Open Overview Tab', keys: ['Alt', 'O'] },
                { label: 'Open Purchases Tab', keys: ['Alt', 'U'] },
                { label: 'Open Payments Tab', keys: ['Alt', 'P'] }
            ]
        });
    }

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

    // Helper functions to show and hide shortcuts modal
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

    // Render logic
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

    // Initialize Shortcuts Modal Setup
    function initShortcuts() {
        injectShortcutsStyles();
        injectShortcutsModalHTML();

        shortcutsModalRef = document.getElementById('shortcuts-modal');
        const shortcutsBtn = document.getElementById('shortcuts-btn');
        const closeBtn = document.getElementById('close-shortcuts');
        const contentContainer = document.getElementById('shortcuts-content');

        if (!shortcutsModalRef || !contentContainer) return;

        contentContainer.innerHTML = SHORTCUT_GROUPS.map(renderShortcutSection).join('');

        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showShortcutsModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideShortcutsModal();
            });
        }

        shortcutsModalRef.addEventListener('click', (event) => {
            if (event.target === shortcutsModalRef) {
                hideShortcutsModal();
            }
        });
    }

    // Context detection helpers
    function isTypingContext(): boolean {
        const active = document.activeElement;
        if (!active) return false;
        const tagName = active.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable || tagName === 'SELECT';
    }

    // Dynamic Context Modal checking for Supplier Modals
    function isModalOpen(modalId: string): boolean {
        const modal = document.getElementById(modalId);
        return modal ? !modal.classList.contains('hidden') : false;
    }

    // Navigation Tab Switching logic for Profile Page
    function switchTab(direction: 'next' | 'prev') {
        const tabs = ['overview', 'purchases', 'payments'];
        const activeTabBtn = document.querySelector('.tab-btn.active');
        if (!activeTabBtn) return;

        const currentTab = activeTabBtn.getAttribute('data-tab');
        const currentIndex = tabs.indexOf(currentTab || '');
        if (currentIndex === -1) return;

        let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (targetIndex >= tabs.length) targetIndex = 0;
        if (targetIndex < 0) targetIndex = tabs.length - 1;

        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabs[targetIndex]}"]`) as HTMLElement;
        if (targetBtn) {
            targetBtn.click();
            targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    // Main Keyboard Event Handling
    function handleKeyboardShortcuts(event: KeyboardEvent) {
        const keyLower = event.key.toLowerCase();
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        const isShiftPressed = event.shiftKey;
        const isAltPressed = event.altKey;

        // 0. Intercept Enter key inside the supplier modal to prevent focus transitions
        if (event.key === 'Enter') {
            if (isModalOpen('supplier-modal')) {
                const active = document.activeElement;
                if (active && active.tagName === 'TEXTAREA') {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }

        // 1. Toggling shortcuts modal using '?' (only when not typing)
        if (event.key === '?' && !isTypingContext()) {
            event.preventDefault();
            event.stopPropagation();
            if (isModalOpen('shortcuts-modal')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }

        // 2. Toggling shortcuts modal using Ctrl + /
        if (isCtrlPressed && event.key === '/') {
            event.preventDefault();
            event.stopPropagation();
            if (isModalOpen('shortcuts-modal')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }

        // 3. Modals Close / Escape actions
        if (event.key === 'Escape') {
            // Close Keyboard shortcuts modal if open
            if (isModalOpen('shortcuts-modal')) {
                event.preventDefault();
                event.stopPropagation();
                hideShortcutsModal();
                return;
            }

            // Close Filter Popover if open (on list page)
            const filterPopover = document.getElementById('filter-popover');
            if (filterPopover && !filterPopover.classList.contains('hidden')) {
                event.preventDefault();
                event.stopPropagation();
                filterPopover.classList.add('hidden');
                return;
            }

            // Close supplier form modal if open
            if (isModalOpen('supplier-modal')) {
                event.preventDefault();
                event.stopPropagation();
                const closeBtn = document.getElementById('close-modal');
                if (closeBtn) {
                    closeBtn.click();
                } else if ((window as any).supplierForms?.closeModal) {
                    (window as any).supplierForms.closeModal();
                }
                return;
            }

            // Close export modal if open
            if (isModalOpen('export-modal')) {
                event.preventDefault();
                event.stopPropagation();
                const closeExportBtn = document.getElementById('close-export-modal');
                if (closeExportBtn) {
                    closeExportBtn.click();
                }
                return;
            }

            // Pressing ESC on Supplier home page should redirect to Dashboard
            if (!isDetailsPage) {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = '/dashboard';
                return;
            }

            // If not typing, perform reset filters or go back to supplier home
            if (!isTypingContext()) {
                const resetBtn = document.getElementById('reset-filters') || document.getElementById('clear-filters-btn');
                if (resetBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    resetBtn.click();
                    return;
                }

                if (isDetailsPage) {
                    event.preventDefault();
                    event.stopPropagation();
                    const homeBtn = document.getElementById('home-btn');
                    if (homeBtn) {
                        homeBtn.click();
                    } else {
                        window.location.href = '/supplier';
                    }
                    return;
                }
            }
        }

        // 4. Handle Save Supplier Shortcut (Ctrl + S)
        if (isCtrlPressed && keyLower === 's') {
            if (isModalOpen('supplier-modal')) {
                event.preventDefault();
                event.stopPropagation();
                const form = document.getElementById('supplier-form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
        }

        // 5. Shortcuts allowed inside input fields when using Ctrl/Cmd modifiers
        if (isCtrlPressed && !isAltPressed) {
            switch (keyLower) {
                case 'f': {
                    // Focus Search (Ctrl + F)
                    if (isDetailsPage) break;
                    const searchInput = document.getElementById('supplier-search') || document.getElementById('search-input');
                    if (searchInput) {
                        event.preventDefault();
                        event.stopPropagation();
                        (searchInput as HTMLInputElement).focus();
                        (searchInput as HTMLInputElement).select();
                    }
                    break;
                }
                case 'n': {
                    // New Supplier (Ctrl + N)
                    if (!isDetailsPage) {
                        const addBtn = document.getElementById('add-supplier-btn');
                        if (addBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            addBtn.click();
                        }
                    }
                    break;
                }
                case 'e': {
                    // Edit Profile / Supplier (Ctrl + E)
                    if (isDetailsPage) {
                        const editBtn = document.getElementById('dropdown-edit-btn');
                        if (editBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            editBtn.click();
                        }
                    } else {
                        // On list page, open the edit modal of the first supplier card if no modal is active
                        if (!isModalOpen('supplier-modal')) {
                            const editCardBtn = document.querySelector('.supplier-card-premium .edit-card-btn') as HTMLElement;
                            if (editCardBtn) {
                                event.preventDefault();
                                event.stopPropagation();
                                editCardBtn.click();
                            }
                        }
                    }
                    break;
                }
                case 'r': {
                    // Refresh (Ctrl + R / Ctrl + Shift + R)
                    if (!isShiftPressed) {
                        // Refresh Suppliers (Ctrl + R)
                        const refreshBtn = document.getElementById('refresh-btn');
                        if (refreshBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            refreshBtn.click();
                        } else if (isDetailsPage && typeof (window as any).fetchFullDetails === 'function') {
                            event.preventDefault();
                            event.stopPropagation();
                            (window as any).fetchFullDetails();
                        }
                    }
                    break;
                }
                case 'a': {
                    // View Archived Suppliers (Ctrl + Shift + A)
                    if (isShiftPressed && !isDetailsPage) {
                        const archivedBtn = document.getElementById('archived-suppliers-btn');
                        if (archivedBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            archivedBtn.click();
                        }
                    }
                    break;
                }
                case 'd': {
                    // Archive Supplier (Ctrl + Shift + D)
                    if (isShiftPressed && isDetailsPage) {
                        const archiveBtn = document.getElementById('dropdown-archive-btn');
                        if (archiveBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            archiveBtn.click();
                        }
                    }
                    break;
                }
                case 'p': {
                    // Export Supplier Profile / Print (Ctrl + P)
                    if (isDetailsPage) {
                        const exportBtn = document.getElementById('dropdown-export-btn');
                        if (exportBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            exportBtn.click();
                        }
                    }
                    break;
                }
                case 'c': {
                    // Copy Supplier ID (Ctrl + C) when not selecting text
                    if (isDetailsPage && window.getSelection()?.toString() === '') {
                        const displayId = document.getElementById('display-supplier-id');
                        if (displayId) {
                            event.preventDefault();
                            event.stopPropagation();
                            displayId.click();
                        }
                    }
                    break;
                }
                case 'delete': {
                    // Delete Supplier (Ctrl + Delete)
                    if (isDetailsPage) {
                        const deleteBtn = document.getElementById('delete-supplier-btn');
                        if (deleteBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            deleteBtn.click();
                        }
                    }
                    break;
                }
                default:
                    break;
            }
            return;
        }

        // 6. Focus search & filter combinations (Ctrl + Shift + F)
        if (isCtrlPressed && isShiftPressed && keyLower === 'f') {
            if (!isDetailsPage) {
                const filterBtn = document.getElementById('filter-btn');
                if (filterBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    filterBtn.click();
                }
            }
            return;
        }

        // 7. Alt key shortcuts (Alt + O, Alt + U, Alt + P) for Tab Switching
        if (isAltPressed && isDetailsPage) {
            let targetTab = '';
            switch (keyLower) {
                case 'o': targetTab = 'overview'; break;
                case 'u': targetTab = 'purchases'; break;
                case 'p': targetTab = 'payments'; break;
                default: break;
            }

            if (targetTab) {
                const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`) as HTMLElement;
                if (tabBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    tabBtn.click();
                    tabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
            }
            return;
        }

        // 8. Block normal shortcuts when typing inside form elements
        if (isTypingContext()) {
            return;
        }
    }

    // Dom loaded event registration
    document.addEventListener('DOMContentLoaded', () => {
        initShortcuts();

        // Register keydown listener in the capture phase for global intercepting
        document.addEventListener('keydown', handleKeyboardShortcuts, true);
    });

    // Cleanup event handler mapping (in case we reload scripts dynamically)
    (window as any).cleanupSupplierShortcuts = () => {
        document.removeEventListener('keydown', handleKeyboardShortcuts, true);
    };

})();
