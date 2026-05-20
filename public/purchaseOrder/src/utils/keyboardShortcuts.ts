// @ts-nocheck
(function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    const PURCHASEORDER_SHORTCUT_GROUPS = [
        {
            title: "Global Actions",
            items: [
                { keys: [modKey, "N"], description: "New Purchase Order" },
                { keys: [modKey, "F"], description: "Search Purchase Orders" },
                { keys: ["?"], description: "Show Keyboard Shortcuts" },
                { keys: ["Esc"], description: "Close Modal / Cancel" }
            ]
        },
        {
            title: "Navigation",
            items: [
                { keys: [modKey, "H"], description: "Go to Home / Back" },
                { keys: ["Enter"], description: "Next Step / Confirm" },
            ]
        },
        {
            title: "Form Actions",
            items: [
                { keys: [modKey, "S"], description: "Save Purchase Order" },
                { keys: [modKey, "I"], description: "Add Item (when on Items step)" },
                { keys: ["Esc"], description: "Close Suggestions" }
            ]
        },
        {
            title: "Document Actions",
            items: [
                { keys: [modKey, "P"], description: "Print Current Purchase Order" },
                { keys: [modKey, "Shift", "P"], description: "Save as PDF" }
            ]
        }
    ];

    let shortcutsModalRef = null;

    function initShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (!modal) return;

        shortcutsModalRef = modal;
        const content = document.getElementById('shortcuts-content');
        if (content) {
            content.innerHTML = PURCHASEORDER_SHORTCUT_GROUPS.map(renderShortcutSection).join('');
        }

        const closeBtn = document.getElementById('close-shortcuts');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideShortcutsModal);
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideShortcutsModal();
            }
        });

        const shortcutsBtn = document.getElementById('shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', showShortcutsModal);
        }
    }

    function renderShortcutSection(section) {
        return `
            <div class="mb-6 last:mb-0">
                <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">${section.title}</h3>
                <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    ${section.items.map(renderShortcutRow).join('')}
                </div>
            </div>
        `;
    }

    function renderShortcutRow(item) {
        return `
            <div class="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-100 transition-colors">
                <span class="text-gray-700">${item.description}</span>
                <div class="flex gap-1">
                    ${renderShortcutKeys(item.keys)}
                </div>
            </div>
        `;
    }

    function renderShortcutKeys(keys) {
        return keys.map(key => `
            <kbd class="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm text-xs font-mono font-semibold text-gray-600">
                ${key}
            </kbd>
        `).join('<span class="text-gray-400 mx-1">+</span>');
    }

    function showShortcutsModal() {
        if (shortcutsModalRef) {
            shortcutsModalRef.classList.remove('hidden');
        }
    }

    function hideShortcutsModal() {
        if (shortcutsModalRef) {
            shortcutsModalRef.classList.add('hidden');
        }
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
        if (key === '?' && !isTypingContext() && !isCtrl && !isShift) {
            event.preventDefault();
            showShortcutsModal();
            return;
        }

        // Handle Escape
        if (key === 'escape') {
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
                return;
            }
            
            const filterPopover = document.getElementById('filter-popover');
            if (filterPopover && !filterPopover.classList.contains('hidden')) {
                filterPopover.classList.add('hidden');
                return;
            }
            
            if (isFormActive() && typeof (window as any).closeAllSuggestions === 'function') {
                (window as any).closeAllSuggestions();
            }
            
            if (document.activeElement && (document.activeElement as HTMLElement).blur) {
                (document.activeElement as HTMLElement).blur();
            }
            return;
        }

        // Handle Enter for 'next' button on form (if not in a textarea/button)
        if (key === 'enter' && !isCtrl && !isShift && isFormActive()) {
            const activeEl = document.activeElement;
            const tagName = activeEl ? activeEl.tagName.toLowerCase() : '';
            
            if (tagName === 'textarea' || tagName === 'button' || (activeEl as HTMLElement).isContentEditable) {
                return;
            }
            
            const hasVisibleSuggestions = document.querySelector('.suggestions[style*="display: block"]');
            if (hasVisibleSuggestions) return;
            
            event.preventDefault();
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.click();
            }
            return;
        }

        // If no modifier key is pressed, don't process further
        if (!isCtrl) return;

        switch (key) {
            case 'n':
                event.preventDefault();
                const newBtn = document.getElementById('new-purchase');
                if (newBtn) newBtn.click();
                break;
                
            case 's':
                event.preventDefault();
                if (isFormActive()) {
                    runOnPreviewStep(() => {
                        const saveBtn = document.getElementById('save-btn');
                        if (saveBtn) saveBtn.click();
                    });
                }
                break;
                
            case 'p':
                event.preventDefault();
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
                const homeBtn = document.getElementById('home-btn');
                if (homeBtn) homeBtn.click();
                break;
                
            case 'f':
                event.preventDefault();
                if (isHomeScreenActive()) {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.focus();
                }
                break;
        }
    }

    // Set up document-level keydown listener
    document.addEventListener('keydown', handlePurchaseOrderKeyboardShortcuts);

    (window as any).initPurchaseOrderShortcutsModal = initShortcutsModal;
})();
