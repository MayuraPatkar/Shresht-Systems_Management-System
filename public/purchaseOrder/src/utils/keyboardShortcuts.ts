// @ts-nocheck
(function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    const PURCHASEORDER_SHORTCUT_GROUPS = [
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
                { label: 'View Preview', keys: ['Ctrl', 'P'] },
                { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
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

        const modal = document.getElementById('shortcuts-modal');
        if (!modal) return;

        shortcutsModalRef = modal;
        const content = document.getElementById('shortcuts-content');
        if (content) {
            content.innerHTML = PURCHASEORDER_SHORTCUT_GROUPS.map(renderShortcutSection).join('');
        }

        const closeBtn = document.getElementById('close-shortcuts');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideShortcutsModal();
            });
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideShortcutsModal();
            }
        });

        const shortcutsBtn = document.getElementById('shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showShortcutsModal();
            });
        }
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

    // Helper functions for state checking
    function isSectionVisible(sectionId) {
        const section = document.getElementById(sectionId);
        return section && section.style.display !== 'none';
    }

    function isFormActive() {
        return isSectionVisible('new');
    }

    function isExistingDocument() {
        const status = sessionStorage.getItem('currentTab-status');
        return status === 'update' || status === 'clone';
    }

    function isPreviewStepActive() {
        if (typeof (window as any).currentStep === 'number' && typeof (window as any).totalSteps === 'number') {
            return (window as any).currentStep === (window as any).totalSteps;
        }
        return false;
    }

    async function runOnPreviewStep(callback) {
        if (isPreviewStepActive()) {
            callback();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 5;
        
        const tryAdvance = async () => {
            if (isPreviewStepActive()) {
                callback();
                return;
            }
            if (attempts >= maxAttempts) {
                console.warn("Max attempts reached trying to reach preview step");
                if ((window as any).electronAPI) {
                    (window as any).electronAPI.showAlert1("Please navigate to the preview step manually.");
                }
                return;
            }
            
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn) {
                attempts++;
                if (typeof (window as any).validateCurrentStep === 'function') {
                    const ok = await (window as any).validateCurrentStep();
                    if (!ok) return;
                }
                
                // If on step 2 (Items), simulate the click to ensure populateSpecifications is called
                if ((window as any).currentStep === 2) {
                   nextBtn.click();
                   setTimeout(tryAdvance, 100);
                   return;
                }
                
                if (typeof (window as any).changeStep === 'function') {
                     (window as any).changeStep((window as any).currentStep + 1);
                }
                setTimeout(tryAdvance, 100);
            }
        };
        
        await tryAdvance();
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

    function triggerPrintAction() {
        if (isFormActive()) {
            runOnPreviewStep(() => {
                setTimeout(() => {
                    const saveBtn = document.getElementById('save-btn');
                    if (saveBtn) saveBtn.click();
                }, 500);
            });
        } else if (isSectionVisible('view')) {
            const printBtn = document.getElementById('print-project');
            if (printBtn) printBtn.click();
        }
    }

    function isTypingContext() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;
        
        const tagName = activeEl.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement).isContentEditable;
    }

    // Main keyboard shortcuts handler
    function handlePurchaseOrderKeyboardShortcuts(event) {
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
                    runOnPreviewStep(() => {
                        const saveBtn = document.getElementById('save-btn');
                        if (saveBtn) saveBtn.click();
                    });
                }
                break;
                
            case 'p':
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (isShift) {
                    if (isSectionVisible('view')) {
                        const savePdfBtn = document.getElementById('save-project-pdf');
                        if (savePdfBtn) savePdfBtn.click();
                    } else if (isFormActive()) {
                        runOnPreviewStep(() => {
                            setTimeout(() => {
                                const content = document.getElementById('preview-content')?.innerHTML;
                                const poId = document.getElementById('id') as HTMLInputElement;
                                if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation && content && poId) {
                                    (window as any).electronAPI.handlePrintEventQuatation(content, "savePDF", `PurchaseOrder-${poId.value}`);
                                }
                            }, 500);
                        });
                    }
                } else {
                    triggerPrintAction();
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
    document.addEventListener('keydown', handlePurchaseOrderKeyboardShortcuts, true);

    (window as any).initPurchaseOrderShortcutsModal = initShortcutsModal;
})();
