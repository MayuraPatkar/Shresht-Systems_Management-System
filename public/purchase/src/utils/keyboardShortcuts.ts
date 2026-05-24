// @ts-nocheck
(function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    const PURCHASE_SHORTCUT_GROUPS = [
        {
            title: 'Navigation',
            icon: 'fas fa-arrows-alt text-blue-600',
            items: [
                { label: 'Next Step', keys: ['Enter'] },
                { label: 'Previous Step', keys: ['Alt', 'Backspace'] },
                { label: 'Exit/Cancel', keys: ['Esc'] }
            ]
        },
        {
            title: 'Actions',
            icon: 'fas fa-bolt text-yellow-600',
            items: [
                { label: 'New Purchase', keys: ['Ctrl', 'N'] },
                { label: 'Save Purchase', keys: ['Ctrl', 'S'] },
                { label: 'Add Item', keys: ['Ctrl', 'I'] },
                { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
                { label: 'Go Home', keys: ['Ctrl', 'H'] },
                { label: 'Focus Search', keys: ['Ctrl', 'F'] }
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
        
        const contentHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl border border-slate-100 flex flex-col premium-shadow max-h-[85vh] shortcuts-panel">
                <!-- Modal Header -->
                <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                            <i class="fas fa-keyboard text-purple-600"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-base leading-none">Keyboard Shortcuts</h3>
                            <span class="text-xs text-slate-400 mt-1 block">Accelerate your workflow with keys</span>
                        </div>
                    </div>
                    <button id="close-shortcuts" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    ${PURCHASE_SHORTCUT_GROUPS.map(group => `
                        <div class="shortcuts-section">
                            <div class="flex items-center gap-2 mb-3 px-1">
                                <i class="${group.icon} text-sm"></i>
                                <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider">${group.title}</h4>
                            </div>
                            <div class="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 space-y-0.5">
                                ${group.items.map(item => `
                                    <div class="shortcut-row">
                                        <span class="text-slate-600 text-sm font-semibold">${item.label}</span>
                                        <div class="shortcut-keys">
                                            ${item.keys.map((key, i) => {
                                                const displayKey = key === 'Ctrl' ? modKey : key;
                                                return `
                                                    ${i > 0 ? '<span class="text-slate-300 font-medium">+</span>' : ''}
                                                    <kbd>${displayKey}</kbd>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Press <kbd class="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-slate-600 font-bold">?</kbd> anytime to open this list</span>
                    <span class="font-medium">Shresht Systems</span>
                </div>
            </div>
        `;

        modalDiv.innerHTML = contentHTML;
        document.body.appendChild(modalDiv);
        shortcutsModalRef = modalDiv;

        // Add event listeners for closing
        const closeBtn = modalDiv.querySelector('#close-shortcuts');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideShortcutsModal);
        }

        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) {
                hideShortcutsModal();
            }
        });
    }

    // Show Shortcuts Modal
    function showShortcutsModal() {
        injectShortcutsStyles();
        injectShortcutsModalHTML();

        if (shortcutsModalRef) {
            shortcutsModalRef.classList.remove('hidden');
            // Trigger browser reflow to allow transition
            void shortcutsModalRef.offsetWidth;
            shortcutsModalRef.classList.remove('opacity-0');
        }
    }

    // Hide Shortcuts Modal
    function hideShortcutsModal() {
        if (shortcutsModalRef) {
            shortcutsModalRef.classList.add('opacity-0');
            // Wait for transition before hiding completely
            setTimeout(() => {
                shortcutsModalRef?.classList.add('hidden');
            }, 200);
        }
    }

    // Hook shortcuts-btn in the UI
    function initShortcutsModal() {
        const shortcutsBtn = document.getElementById('shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showShortcutsModal();
            });
        }
    }

    // Checker functions
    function isFormActive() {
        const formElement = document.getElementById('new');
        return formElement ? formElement.style.display !== 'none' : false;
    }

    function isSectionVisible(id: string) {
        const el = document.getElementById(id);
        return el ? el.style.display !== 'none' : false;
    }

    function isItemsStepActive() {
        if (typeof (window as any).currentStep === 'number') {
            return (window as any).currentStep === 2;
        }
        return false;
    }

    function isHomeScreenActive() {
        return isSectionVisible('home');
    }

    function triggerAddEntry() {
        if (isItemsStepActive()) {
            const addItemBtn = document.getElementById('add-item-btn');
            if (addItemBtn) {
                addItemBtn.click();
                
                const table = document.querySelector('#items-table tbody');
                if (table && table.lastElementChild) {
                    const descInput = table.lastElementChild.querySelector('.item_name') as HTMLInputElement;
                    if (descInput) descInput.focus();
                }
            }
        }
    }

    function isTypingContext() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;
        
        const tagName = activeEl.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement).isContentEditable;
    }

    // Main keyboard shortcuts handler
    function handlePurchaseKeyboardShortcuts(event) {
        const isCtrl = isMac ? event.metaKey : event.ctrlKey;
        const isShift = event.shiftKey;
        const key = event.key.toLowerCase();

        // Check for '?' key to show shortcuts (only if not typing in an input)
        if (key === '?' && !isTypingContext() && !isCtrl) {
            event.preventDefault();
            showShortcutsModal();
            return;
        }

        // Handle Escape
        if (key === 'escape') {
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                event.preventDefault();
                event.stopPropagation();
                hideShortcutsModal();
                return;
            }
            
            const filterPopover = document.getElementById('filter-popover');
            if (filterPopover && !filterPopover.classList.contains('hidden')) {
                event.preventDefault();
                event.stopPropagation();
                filterPopover.classList.add('hidden');
                return;
            }
            
            if (isFormActive() && typeof (window as any).closeAllSuggestions === 'function') {
                (window as any).closeAllSuggestions();
            }
            
            if (isHomeScreenActive()) {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = '/dashboard';
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (document.activeElement && (document.activeElement as HTMLElement).blur) {
                (document.activeElement as HTMLElement).blur();
            }
            return;
        }

        // Handle Enter for 'next' button on form (if not in a textarea/button)
        if (key === 'enter' && !isCtrl && !isShift && isFormActive()) {
            const activeEl = document.activeElement as HTMLInputElement;
            const tagName = activeEl ? activeEl.tagName.toLowerCase() : '';
            const type = activeEl ? activeEl.type : '';
            
            if (tagName === 'textarea' || tagName === 'button' || (activeEl as HTMLElement).isContentEditable || type === 'date') {
                if (type === 'date') {
                    event.stopPropagation();
                }
                return;
            }
            
            const suggestions = Array.from(document.querySelectorAll('.suggestions')) as HTMLElement[];
            const hasVisibleSuggestions = suggestions.some(s => s.style.display === 'block');
            if (hasVisibleSuggestions) return;
            
            event.preventDefault();
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.click();
            }
            return;
        }

        // Handle Alt + Backspace previous step shortcut (works even inside typing context)
        if (event.altKey && key === 'backspace' && isFormActive()) {
            const prevBtn = document.getElementById('prev-btn');
            if (prevBtn && !(prevBtn as HTMLButtonElement).disabled) {
                event.preventDefault();
                event.stopPropagation();
                prevBtn.click();
                return;
            }
        }

        // If no modifier key is pressed, don't process further
        if (!isCtrl) return;

        switch (key) {
            case 'n':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const newBtn = document.getElementById('new-purchase');
                if (newBtn) newBtn.click();
                break;
                
            case 's':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (isFormActive()) {
                    const saveBtn = document.getElementById('save-btn');
                    if (saveBtn) saveBtn.click();
                }
                break;
                
            case 'i':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (isFormActive()) {
                    if (!isItemsStepActive() && typeof (window as any).changeStep === 'function') {
                        (window as any).changeStep(2);
                        setTimeout(triggerAddEntry, 100);
                    } else {
                        triggerAddEntry();
                    }
                }
                break;
                
            case 'h':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const homeBtn = document.getElementById('home-btn');
                if (homeBtn) homeBtn.click();
                break;
                
            case 'f':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (isHomeScreenActive()) {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.focus();
                }
                break;
        }
    }

    // Set up document-level keydown listener
    document.addEventListener('keydown', handlePurchaseKeyboardShortcuts, true);

    (window as any).initPurchaseShortcutsModal = initShortcutsModal;
})();
