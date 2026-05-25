// @ts-nocheck

const QUOTATION_SHORTCUT_GROUPS = [
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
            { label: 'New Quotation', keys: ['Ctrl', 'N'] },
            { label: 'Save Quotation', keys: ['Ctrl', 'S'] },
            { label: 'View Preview', keys: ['Ctrl', 'P'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] },
            { label: 'Refresh List', keys: ['Ctrl', 'R'] }
        ]
    }
];

let shortcutsModalRef: HTMLElement | null = null;
const isMac = navigator.userAgent.toLowerCase().includes('mac');

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = QUOTATION_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

    shortcutsBtn.addEventListener('click', () => {
        showShortcutsModal();
    });

    closeBtn.addEventListener('click', () => {
        hideShortcutsModal();
    });

    shortcutsModalRef.addEventListener('click', (event) => {
        if (event.target === shortcutsModalRef) {
            hideShortcutsModal();
        }
    });
}

function renderShortcutSection(section: any) {
    return `
        <div class="shortcuts-section">
            <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <i class="${section.icon}"></i>
                ${section.title}
            </h3>
            <div class="space-y-2">
                ${section.items.map(renderShortcutRow).join('')}
            </div>
        </div>
    `;
}

function renderShortcutRow(item: any) {
    return `
        <div class="shortcut-row">
            <span class="text-gray-700">${item.label}</span>
            ${renderShortcutKeys(item.keys)}
        </div>
    `;
}

function renderShortcutKeys(keys: string[]) {
    const keyCaps = keys.map((key, index) => {
        const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
        const separator = index > 0 ? '<span>+</span>' : '';
        return `${separator}<kbd>${displayKey}</kbd>`;
    }).join('');
    return `<div class="shortcut-keys">${keyCaps}</div>`;
}

function showShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.remove('hidden');
}

function hideShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.add('hidden');
}

// ====== Keyboard Shortcuts ======

function isSectionVisible(sectionId: string): boolean {
    const el = document.getElementById(sectionId);
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
}

function isFormActive(): boolean {
    return isSectionVisible('new');
}

function isExistingDocument(): boolean {
    const status = sessionStorage.getItem('currentTab-status');
    return status === 'update' || status === 'clone';
}

function isPreviewStepActive(): boolean {
    if (typeof currentStep === 'undefined' || typeof totalSteps === 'undefined') {
        return false;
    }
    return currentStep === totalSteps;
}

async function runOnPreviewStep(callback: () => void) {
    if (typeof callback !== 'function') {
        return;
    }

    if (!isFormActive()) {
        return;
    }

    // If already on preview step, just generate preview and run callback
    if (isPreviewStepActive()) {
        if (typeof generatePreview === 'function') {
            await generatePreview();
        }
        callback();
        return;
    }

    // Navigate step-by-step using the Next button to trigger validation at each step
    const navigateToPreview = async () => {
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        if (!nextBtn) {
            return;
        }

        // Store current step to detect if navigation was blocked by validation
        const stepBefore = typeof currentStep !== 'undefined' ? currentStep : 0;

        // Click next button (this triggers validation)
        nextBtn.click();

        // Wait a bit for validation and step change to process
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if step actually changed (validation passed)
        const stepAfter = typeof currentStep !== 'undefined' ? currentStep : 0;

        if (stepAfter === stepBefore) {
            // Step didn't change - validation failed, stop navigation
            return;
        }

        // If we reached the preview step, generate preview and run callback
        if (isPreviewStepActive()) {
            if (typeof generatePreview === 'function') {
                await generatePreview();
            }
            callback();
            return;
        }

        // Continue navigating to next steps
        await navigateToPreview();
    };

    await navigateToPreview();
}

function isItemsStepActive(): boolean {
    if (typeof currentStep === 'undefined') {
        return false;
    }
    return currentStep === 3;
}

function isHomeScreenActive(): boolean {
    const homeSectionVisible = isSectionVisible('home');
    return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
}

function triggerAddEntry(): boolean {
    if (!isFormActive()) {
        return false;
    }

    const itemsBtn = document.getElementById('add-item-btn') as HTMLButtonElement;
    if (itemsBtn && isItemsStepActive()) {
        itemsBtn.click();
        return true;
    }

    const nonItemBtn = document.getElementById('add-non-item-btn') as HTMLButtonElement;
    if (nonItemBtn && typeof currentStep !== 'undefined' && currentStep === 4) {
        nonItemBtn.click();
        return true;
    }

    return false;
}

function triggerPrintAction(): boolean {
    const formPrintBtn = document.getElementById('print-btn') as HTMLButtonElement;
    // Only trigger print if button exists, form is active, AND button is visible
    if (formPrintBtn && isFormActive() && window.getComputedStyle(formPrintBtn).display !== 'none') {
        runOnPreviewStep(() => formPrintBtn.click());
        return true;
    }

    const viewPrintBtn = document.getElementById('printProject') as HTMLButtonElement;
    if (viewPrintBtn && isSectionVisible('view')) {
        viewPrintBtn.click();
        return true;
    }

    return false;
}

function isTypingContext(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable || tagName === 'SELECT';
}

function handleQuotationKeyboardShortcuts(event: KeyboardEvent) {
    const keyLower = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const homeButton = document.getElementById('home-btn');

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!event.altKey && isModifierPressed) {
        switch (keyLower) {
            case 'n': {
                const newBtn = document.getElementById('new-quotation') as HTMLButtonElement;
                if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                    event.preventDefault();
                    event.stopPropagation();
                    newBtn.click();
                }
                break;
            }
            case 's': {
                const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
                if (saveBtn && isFormActive()) {
                    // For new documents, only allow save on preview step
                    // For existing documents, allow save from any step
                    if (isExistingDocument() || isPreviewStepActive()) {
                        event.preventDefault();
                        event.stopPropagation();
                        runOnPreviewStep(() => saveBtn.click());
                    }
                }
                break;
            }
            case 'p': {
                const isShift = event.shiftKey;
                if (isShift) {
                    if (triggerPrintAction()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    const previewBtn = document.getElementById('view-preview') as HTMLButtonElement;
                    if (previewBtn && window.getComputedStyle(previewBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        previewBtn.click();
                    }
                }
                break;
            }
            case 'i': {
                if (triggerAddEntry()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            case 'h': {
                if (homeButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    homeButton.click();
                    setTimeout(() => {
                        window.location.reload();
                    }, 150);
                }
                break;
            }
            case 'f': {
                const searchInput = document.getElementById('search-input') as HTMLInputElement;
                if (searchInput) {
                    event.preventDefault();
                    event.stopPropagation();
                    searchInput.focus();
                    searchInput.select();
                }
                break;
            }
            case 'r': {
                const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
                if (refreshBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    refreshBtn.click();
                }
                break;
            }
            default:
                break;
        }
        return;
    }

    if (event.altKey) {
        return;
    }

    if (event.key === 'Escape') {
        if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            event.preventDefault();
            event.stopPropagation();
            hideShortcutsModal();
            return;
        }

        if (isHomeScreenActive()) {
            event.preventDefault();
            event.stopPropagation();
            (window as any).location = '/dashboard';
            return;
        }

        event.stopPropagation();
        return;
    }

    if (event.key === '?' && !isTypingContext()) {
        event.preventDefault();
        event.stopPropagation();
        showShortcutsModal();
        return;
    }

    // Handle Alt + Backspace previous step shortcut (works even inside typing context)
    if (event.altKey && event.key === 'Backspace' && isFormActive()) {
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        if (prevBtn && !prevBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            prevBtn.click();
            return;
        }
    }

    if (isTypingContext()) {
        return;
    }

    if (event.key === 'Enter') {
        if (isHomeScreenActive()) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (isFormActive()) {
            const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
            if (nextBtn && !nextBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                nextBtn.click();
            }
            return;
        }
    }

    if (event.key === 'Backspace' && isFormActive()) {
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        if (prevBtn && !prevBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            prevBtn.click();
        }
    }
}
