// @ts-nocheck

const isMac = navigator.userAgent.toLowerCase().includes('mac');
const isDetailsPage = typeof window !== 'undefined' && window.location.pathname.includes('/details');

const SHORTCUT_GROUPS = [
    {
        title: 'Navigation',
        icon: 'fas fa-arrows-alt text-blue-600',
        items: isDetailsPage ? [
            { label: 'Back to List', keys: ['Esc'] }
        ] : [
            { label: 'Next Step', keys: ['Enter'] },
            { label: 'Previous Step', keys: ['Alt', 'Backspace'] },
            { label: 'Exit/Cancel', keys: ['Esc'] }
        ]
    },
    {
        title: isDetailsPage ? 'Quotation Actions' : 'Actions',
        icon: 'fas fa-bolt text-yellow-600',
        items: isDetailsPage ? [
            { label: 'Edit Quotation', keys: ['Ctrl', 'E'] },
            { label: 'Duplicate', keys: ['Ctrl', 'D'] },
            { label: 'Refresh Details', keys: ['Ctrl', 'R'] },
            { label: 'Print', keys: ['Ctrl', 'P'] },
            { label: 'Save as PDF', keys: ['Ctrl', 'Shift', 'P'] }
        ] : [
            { label: 'New Quotation', keys: ['Ctrl', 'N'] },
            { label: 'Save Quotation', keys: ['Ctrl', 'S'] },
            { label: 'View Preview', keys: ['Ctrl', 'P'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] },
            { label: 'Refresh List', keys: ['Ctrl', 'R'] },
            { label: 'View Archived Quotations', keys: ['Ctrl', 'Shift', 'A'] },
            { label: 'Toggle Trash View', keys: ['Ctrl', 'Shift', 'T'] }
        ]
    }
];

if (isDetailsPage) {
    SHORTCUT_GROUPS.push({
        title: 'View Modes',
        icon: 'fas fa-eye text-emerald-600',
        items: [
            { label: 'Without Tax Mode', keys: ['Alt', '1'] },
            { label: 'With Tax Mode', keys: ['Alt', '2'] },
            { label: 'Compact Mode', keys: ['Alt', '3'] }
        ]
    });
}

let shortcutsModalRef: HTMLElement | null = null;

function injectShortcutsModalHTML() {
    if (document.getElementById('shortcuts-modal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'shortcuts-modal';
    modalDiv.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center hidden opacity-0 transition-opacity duration-200';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-label', 'Keyboard Shortcuts');

    modalDiv.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-hidden isolate shortcuts-panel flex flex-col" style="animation: premiumModalShow 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <i class="fas fa-keyboard text-lg"></i>
                    </div>
                    <h2 class="text-base font-extrabold text-slate-800 tracking-tight">Keyboard Shortcuts Help</h2>
                </div>
                <button id="close-shortcuts" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Close shortcuts help modal">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div id="shortcuts-content" class="p-6 space-y-5 overflow-y-auto flex-1"></div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

function initShortcutsModal() {
    injectShortcutsModalHTML();

    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = SHORTCUT_GROUPS.map(renderShortcutSection).join('');

    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', () => {
            showShortcutsModal();
        });
    }

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
        <div class="shortcuts-section mb-6 last:mb-0">
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
        <div class="shortcut-row flex justify-between items-center py-2 px-1 border-b border-slate-100 hover:bg-slate-50 rounded transition-colors duration-150">
            <span class="text-xs font-semibold text-slate-600">${item.label}</span>
            ${renderShortcutKeys(item.keys)}
        </div>
    `;
}

function renderShortcutKeys(keys: string[]) {
    const keyCaps = keys.map((key, index) => {
        const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
        const separator = index > 0 ? '<span class="text-slate-400 font-bold mx-1">+</span>' : '';
        return `${separator}<kbd class="bg-white border border-slate-200 border-b-2 rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-800 shadow-sm">${displayKey}</kbd>`;
    }).join('');
    return `<div class="shortcut-keys flex items-center">${keyCaps}</div>`;
}

function showShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.remove('hidden');
    // Force a reflow
    void shortcutsModalRef.offsetHeight;
    shortcutsModalRef.classList.remove('opacity-0');
}

function hideShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.add('opacity-0');
    setTimeout(() => {
        if (shortcutsModalRef) {
            shortcutsModalRef.classList.add('hidden');
        }
    }, 200);
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

    if (isPreviewStepActive()) {
        if (typeof generatePreview === 'function') {
            await generatePreview();
        }
        callback();
        return;
    }

    const navigateToPreview = async () => {
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        if (!nextBtn) {
            return;
        }

        const stepBefore = typeof currentStep !== 'undefined' ? currentStep : 0;
        nextBtn.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        const stepAfter = typeof currentStep !== 'undefined' ? currentStep : 0;

        if (stepAfter === stepBefore) {
            return;
        }

        if (isPreviewStepActive()) {
            if (typeof generatePreview === 'function') {
                await generatePreview();
            }
            callback();
            return;
        }

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
    const isShiftPressed = event.shiftKey;
    const isAltPressed = event.altKey;

    if (isDetailsPage) {
        if (isModifierPressed && !isAltPressed) {
            switch (keyLower) {
                case 'e': {
                    const editBtn = document.getElementById('editQuotationBtnView');
                    if (editBtn && window.getComputedStyle(editBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        editBtn.click();
                    }
                    break;
                }
                case 'd': {
                    const duplicateBtn = document.getElementById('duplicateQuotationBtnView');
                    if (duplicateBtn && window.getComputedStyle(duplicateBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        duplicateBtn.click();
                    }
                    break;
                }
                case 'r': {
                    const refreshBtn = document.getElementById('refresh-btn');
                    if (refreshBtn) {
                        event.preventDefault();
                        event.stopPropagation();
                        refreshBtn.click();
                    }
                    break;
                }
                case 'p': {
                    if (isShiftPressed) {
                        const pdfBtn = document.getElementById('saveProjectPDF');
                        if (pdfBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            pdfBtn.click();
                        }
                    } else {
                        const printBtn = document.getElementById('printProject');
                        if (printBtn) {
                            event.preventDefault();
                            event.stopPropagation();
                            printBtn.click();
                        }
                    }
                    break;
                }
                default:
                    break;
            }
            return;
        }

        if (isAltPressed) {
            if (keyLower === '1' || keyLower === '2' || keyLower === '3') {
                const tab = document.querySelector(`.view-type-tab[data-view-type="${keyLower}"]`) as HTMLElement;
                if (tab) {
                    event.preventDefault();
                    event.stopPropagation();
                    tab.click();
                }
            }
            return;
        }

        if (event.key === 'Escape') {
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                event.preventDefault();
                event.stopPropagation();
                hideShortcutsModal();
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const homeBtn = document.getElementById('home-btn');
            if (homeBtn) {
                homeBtn.click();
            } else {
                window.location.href = '/quotation';
            }
            return;
        }

        if (event.key === '?' && !isTypingContext()) {
            event.preventDefault();
            event.stopPropagation();
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }

        return;
    }

    // List Page / Form Page Shortcuts
    const homeButton = document.getElementById('home-btn');

    if (isModifierPressed && isShiftPressed && keyLower === 't') {
        const trashBtn = document.getElementById('showDeletedBtn');
        if (trashBtn && window.getComputedStyle(trashBtn).display !== 'none') {
            event.preventDefault();
            event.stopPropagation();
            trashBtn.click();
        }
        return;
    }

    if (isModifierPressed && event.shiftKey && keyLower === 'a') {
        const archivedBtn = document.getElementById('archived-quotations-btn') as HTMLButtonElement | null;
        if (archivedBtn && window.getComputedStyle(archivedBtn).display !== 'none') {
            event.preventDefault();
            event.stopPropagation();
            archivedBtn.click();
        }
        return;
    }

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!isAltPressed && isModifierPressed) {
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
                    event.preventDefault();
                    event.stopPropagation();
                    runOnPreviewStep(() => saveBtn.click());
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

    if (isAltPressed) {
        return;
    }

    if (event.key === 'Escape') {
        if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            event.preventDefault();
            event.stopPropagation();
            hideShortcutsModal();
            return;
        }

        if (typeof (window as any).isUnsavedChangesModalOpen === 'function' && (window as any).isUnsavedChangesModalOpen()) {
            return;
        }

        if (isFormActive()) {
            const guardNavigation = (window as any).guardQuotationNavigation;
            if (typeof guardNavigation === 'function' && guardNavigation('/quotation')) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
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

// Auto-initialize if loaded on details page or if main.js is not loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const isDetailsOrForm = window.location.pathname.includes('/details') || window.location.pathname.includes('/form');
        if (isDetailsOrForm) {
            initShortcutsModal();
            document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);
        }
    });
}

