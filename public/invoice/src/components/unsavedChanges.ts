/**
 * Unsaved Changes Protection for Invoice Form
 * 
 * Tracks form dirty state, intercepts browser/app-level exits,
 * and shows a custom confirmation modal with Save Draft / Discard / Keep Editing options.
 */
(function () {
    let isFormDirty = false;
    let pendingNavigationUrl: string | null = null;
    let modalRef: HTMLElement | null = null;

    const collectFormData = () => (window as any).collectFormData ? (window as any).collectFormData() : null;
    const sendDocumentToServer = (window as any).sendDocumentToServer;

    // ─── Dirty State API ──────────────────────────────────────────────

    function markDirty() {
        isFormDirty = true;
    }

    function markClean() {
        isFormDirty = false;
    }

    function isDirty(): boolean {
        return isFormDirty;
    }

    function isFormVisible(): boolean {
        const el = document.getElementById('new');
        if (!el) return false;
        return window.getComputedStyle(el).display !== 'none';
    }

    function isFormActiveAndDirty(): boolean {
        return isFormVisible() && isDirty();
    }

    // ─── Dirty State Listeners ────────────────────────────────────────

    function setupDirtyTracking() {
        const form = document.getElementById('invoice-form');
        if (!form) return;

        // Delegated input/change events on the form catch all typed inputs + dropdown changes
        form.addEventListener('input', () => {
            if (isFormVisible()) markDirty();
        });
        form.addEventListener('change', () => {
            if (isFormVisible()) markDirty();
        });

        // Item add buttons also dirty the form
        const addItemBtn = document.getElementById('add-item-btn');
        const addNonItemBtn = document.getElementById('add-non-item-btn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                if (isFormVisible()) markDirty();
            });
        }
        if (addNonItemBtn) {
            addNonItemBtn.addEventListener('click', () => {
                if (isFormVisible()) markDirty();
            });
        }
    }

    // ─── BeforeUnload (Browser-Level) ─────────────────────────────────

    function setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (isFormActiveAndDirty()) {
                e.preventDefault();
                // Modern browsers require returnValue to be set
                e.returnValue = '';
                return '';
            }
        });
    }

    // ─── Custom Modal ─────────────────────────────────────────────────

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'unsaved-changes-modal';
        modal.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center hidden opacity-0 transition-opacity duration-200';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Unsaved Changes');

        modal.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full mx-4 overflow-hidden unsaved-changes-panel">
                <div class="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-lg"></i>
                    </div>
                    <div>
                        <h2 class="text-base font-extrabold text-slate-800 tracking-tight">Unsaved Changes</h2>
                        <p class="text-sm text-slate-500 mt-0.5">Your progress will be lost if you leave now.</p>
                    </div>
                </div>
                <div class="px-6 py-5">
                    <p class="text-sm text-slate-600 leading-relaxed">
                        You have unsaved changes in your invoice form. Would you like to save your progress as a draft, discard your changes, or continue editing?
                    </p>
                </div>
                <div class="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2.5">
                    <button id="unsaved-save-draft-btn"
                        class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-sm">
                        <i class="fas fa-save"></i>
                        Save as Draft
                    </button>
                    <div class="flex gap-2.5">
                        <button id="unsaved-discard-btn"
                            class="flex-1 px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer">
                            <i class="fas fa-trash-alt"></i>
                            Discard
                        </button>
                        <button id="unsaved-keep-editing-btn"
                            class="flex-1 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer">
                            <i class="fas fa-pencil-alt"></i>
                            Keep Editing
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modalRef = modal;

        // Bind button actions
        const saveDraftBtn = document.getElementById('unsaved-save-draft-btn');
        const discardBtn = document.getElementById('unsaved-discard-btn');
        const keepEditingBtn = document.getElementById('unsaved-keep-editing-btn');

        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', handleSaveDraft);
        }
        if (discardBtn) {
            discardBtn.addEventListener('click', handleDiscard);
        }
        if (keepEditingBtn) {
            keepEditingBtn.addEventListener('click', handleKeepEditing);
        }

        // Backdrop click = keep editing
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleKeepEditing();
            }
        });
    }

    function showModal() {
        if (!modalRef) return;
        modalRef.classList.remove('hidden');
        // Force reflow for animation
        modalRef.offsetHeight;
        modalRef.classList.remove('opacity-0');
    }

    function hideModal() {
        if (!modalRef) return;
        modalRef.classList.add('opacity-0');
        setTimeout(() => {
            modalRef?.classList.add('hidden');
        }, 200);
    }

    function isModalOpen(): boolean {
        if (!modalRef) return false;
        return !modalRef.classList.contains('hidden');
    }

    // ─── Modal Action Handlers ────────────────────────────────────────

    async function handleSaveDraft() {
        const saveDraftBtn = document.getElementById('unsaved-save-draft-btn');
        if (!saveDraftBtn) return;

        // Show loading state
        const originalText = saveDraftBtn.innerHTML;
        saveDraftBtn.setAttribute('disabled', 'true');
        saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Force status to DRAFT
            const statusSelect = document.getElementById('invoice-status') as HTMLSelectElement | null;
            if (statusSelect) {
                statusSelect.value = 'DRAFT';
            }

            const formData = collectFormData();
            if (!formData) {
                throw new Error('Could not collect form data');
            }

            const response = await sendDocumentToServer('/invoice/save-invoice', formData);

            if (response) {
                // Update invoice ID if returned (new invoice)
                if (response.invoice_id) {
                    const idInput = document.getElementById('id') as HTMLInputElement | null;
                    if (idInput) idInput.value = response.invoice_id;
                    sessionStorage.setItem('update-invoice', 'original');
                }

                markClean();
                hideModal();

                if ((window as any).showToast) {
                    (window as any).showToast('Invoice saved as draft.', 'success');
                }

                // Execute pending navigation
                executeNavigation();
            } else {
                // Server returned error — stay on form
                saveDraftBtn.removeAttribute('disabled');
                saveDraftBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Save draft error:', error);
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1('Failed to save draft. Please try again.');
            }
            saveDraftBtn.removeAttribute('disabled');
            saveDraftBtn.innerHTML = originalText;
        }
    }

    function handleDiscard() {
        markClean();

        // Reset the form
        const form = document.getElementById('invoice-form') as HTMLFormElement | null;
        if (form) form.reset();

        hideModal();
        executeNavigation();
    }

    function handleKeepEditing() {
        pendingNavigationUrl = null;
        hideModal();
    }

    function executeNavigation() {
        if (pendingNavigationUrl) {
            const url = pendingNavigationUrl;
            pendingNavigationUrl = null;
            window.location.href = url;
        }
    }

    // ─── Navigation Guard ─────────────────────────────────────────────

    /**
     * Guards a navigation action. If the form is dirty, shows the modal
     * and stores the URL for later navigation. If clean, navigates immediately.
     * Returns true if navigation was blocked (modal shown), false if it proceeded.
     */
    function guardNavigation(url: string): boolean {
        if (isFormActiveAndDirty()) {
            pendingNavigationUrl = url;
            showModal();
            return true; // blocked
        }
        return false; // not blocked, caller should navigate
    }

    // ─── Sidebar Link Interception ────────────────────────────────────

    function setupSidebarInterception() {
        const sidebarNav = document.getElementById('sidebar-nav');
        if (!sidebarNav) return;

        sidebarNav.addEventListener('click', (e) => {
            const link = (e.target as HTMLElement).closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            if (isFormActiveAndDirty()) {
                e.preventDefault();
                e.stopPropagation();
                pendingNavigationUrl = href;
                showModal();
            }
            // If not dirty, let the link navigate normally
        });
    }

    // ─── Escape Key Interception ──────────────────────────────────────

    function setupEscapeInterception() {
        document.addEventListener('keydown', (e) => {
            // If our modal is open, Escape closes it (keep editing)
            if (e.key === 'Escape' && isModalOpen()) {
                e.preventDefault();
                e.stopPropagation();
                handleKeepEditing();
            }
        }, true); // Use capture phase to run before other Escape handlers
    }

    // ─── Initialization ───────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        createModal();
        setupDirtyTracking();
        setupBeforeUnload();
        setupSidebarInterception();
        setupEscapeInterception();
    });

    // ─── Window API ───────────────────────────────────────────────────

    (window as any).markInvoiceFormDirty = markDirty;
    (window as any).markInvoiceFormClean = markClean;
    (window as any).isInvoiceFormDirty = isDirty;
    (window as any).guardInvoiceNavigation = guardNavigation;
    (window as any).isUnsavedChangesModalOpen = isModalOpen;
})();
