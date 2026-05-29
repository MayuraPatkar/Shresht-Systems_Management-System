// @ts-nocheck
/**
 * Quotation Module - Table & Card Rendering
 * Handles the home screen list: card creation, rendering, and deletion.
 */

class QuotationTable {
    constructor() {}

    getStatusBadge(status: string): string {
        const styles: any = {
            Draft: 'bg-gray-100 text-gray-700 border-gray-200',
            Sent: 'bg-blue-100 text-blue-700 border-blue-200',
            Approved: 'bg-green-100 text-green-700 border-green-200',
            Rejected: 'bg-red-100 text-red-700 border-red-200',
            Converted: 'bg-purple-100 text-purple-700 border-purple-200',
            Expired: 'bg-orange-100 text-orange-700 border-orange-200'
        };
        const safeStatus = status || 'Draft';
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[safeStatus] || styles.Draft}">${safeStatus}</span>`;
    }

    // Render quotations in the list
    renderQuotations(quotations: any[]) {
        const quotationListDiv = document.querySelector(".records") as HTMLElement;
        if (!quotationListDiv) return;

        // Update stats summary
        const totalCountEl = document.getElementById('total-quotations-count');
        const draftCountEl = document.getElementById('draft-quotations-count');
        const approvedCountEl = document.getElementById('approved-quotations-count');
        const b2bCountEl = document.getElementById('b2b-quotations-count');
        const b2cCountEl = document.getElementById('b2c-quotations-count');
        
        if (totalCountEl && b2bCountEl && b2cCountEl) {
            const total = quotations ? quotations.length : 0;
            let draft = 0;
            let approved = 0;
            let b2b = 0;
            let b2c = 0;
            
            if (quotations) {
                quotations.forEach((q: any) => {
                    // Check status
                    const status = q.quotation_status || 'Draft';
                    if (status === 'Draft') draft++;
                    if (status === 'Approved') approved++;

                    // Check B2B / B2C
                    const type = (q.customer_type || '').toLowerCase();
                    const isResidential = type === 'residential' || type === 'individual';
                    const isCompany = type === 'commercial' || type === 'company' || type === 'industrial' || type === 'government';
                    
                    if (isCompany) {
                        b2b++;
                    } else if (isResidential) {
                        b2c++;
                    } else {
                        // Fallback to gstin check if customer_type is unknown
                        const gstin = q.customer_snapshot?.gstin || q.customer_GSTIN;
                        if (gstin && gstin.trim() !== '') {
                            b2b++;
                        } else {
                            b2c++;
                        }
                    }
                });
            }
            
            totalCountEl.textContent = total.toString();
            if (draftCountEl) draftCountEl.textContent = draft.toString();
            if (approvedCountEl) approvedCountEl.textContent = approved.toString();
            b2bCountEl.textContent = b2b.toString();
            b2cCountEl.textContent = b2c.toString();
        }

        quotationListDiv.innerHTML = "";
        if (!quotations || quotations.length === 0) {
            const isArchivedView = typeof isArchiveMode !== 'undefined' && isArchiveMode;
            quotationListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 fade-in select-none" style="min-height: calc(100vh - 11rem);">
                    <div class="${isArchivedView ? 'text-amber-500' : 'text-purple-500'} text-5xl mb-4">
                        <i class="fas ${isArchivedView ? 'fa-archive' : 'fa-file-invoice'}"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">${isArchivedView ? 'No Archived Quotations' : 'No Quotations Found'}</h2>
                    <p class="text-gray-600">${isArchivedView ? 'Quotations you archive will show up here' : 'Start creating professional quotations for your clients'}</p>
                </div>
            `;
            return;
        }
        quotations.forEach((quotation: any) => {
            const quotationCard = this.createQuotationCard(quotation);
            quotationListDiv.appendChild(quotationCard);
        });
    }

    // Create a quotation card element
    createQuotationCard(quotation: any): HTMLElement {
        const quotationCard = document.createElement("div");
    const isArchived = !!quotation.is_archived;
    quotationCard.className = isArchived
        ? "group bg-slate-50/90 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-slate-300 overflow-hidden fade-in opacity-80 hover:opacity-100"
        : "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-400 overflow-hidden fade-in";

    // Format the date for display
    const formattedDate = quotation.quotation_date ? formatDateIndian(quotation.quotation_date) : '-';
    
    // Map fields from backend structure
    const quotationId = quotation.quotation_no || quotation.quotation_id || 'N/A';
    const customerName = quotation.customer_snapshot?.name || quotation.customer_name || '-';
    const customerAddress = (() => {
        const b = quotation.customer_snapshot?.billing_address;
        if (!b) return quotation.customer_address || '-';
        if (typeof b === 'string') return b;
        const parts = [b.line1, b.line2, b.city, b.state, b.pincode, b.country].filter(p => p && typeof p === 'string' && p.trim() !== '');
        return parts.length > 0 ? parts.join(', ') : (quotation.customer_address || '-');
    })();
    const totalAmountTax = quotation.totals?.grand_total || quotation.total_amount_tax || 0;
    const status = quotation.quotation_status || 'Draft';
    const validTill = quotation.valid_till ? formatDateIndian(quotation.valid_till) : '-';

    quotationCard.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b ${isArchived ? 'from-slate-400 to-slate-600' : 'from-purple-500 to-indigo-600'} rounded-l-lg"></div>
            <div class="relative p-5 flex-1">
            <!-- Top Row: Header with Title & Actions -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br ${isArchived ? 'from-slate-400 to-slate-600 shadow-slate-200' : 'from-purple-500 to-indigo-600 shadow-purple-200'} flex items-center justify-center shadow-lg">
                        <i class="fas fa-file-invoice text-lg text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 truncate" title="${quotation.project_name}">${quotation.project_name}</h3>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">
                    ${isArchived ? `
                    <button class="action-btn restore-archive-btn px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200 hover:border-emerald-400" title="Restore from Archive">
                        <i class="fas fa-box-open mr-1"></i> Restore
                    </button>
                    ` : `
                    <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn duplicate-btn px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 hover:border-indigo-400" title="Clone Quotation">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn convert-invoice-btn px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="Convert to Invoice">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </button>
                    `}
                </div>
            </div>
            
            <!-- ID & Date Row -->
            <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-purple-600 copy-text transition-colors" title="Click to copy ID">
                    ${quotationId}
                    <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                </span>
                ${isArchived ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">ARCHIVED</span>' : this.getStatusBadge(status)}
                <span class="text-xs text-gray-500">
                    <i class="fas fa-hourglass-half mr-1"></i>${validTill}
                </span>
            </div>
            
            <!-- Bottom Row: Customer & Amount -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-blue-600 text-xs"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${customerName}">${customerName}</p>
                        <p class="text-xs text-gray-500 truncate" title="${customerAddress}">${customerAddress}</p>
                    </div>
                </div>
                
                <div class="flex-shrink-0 ml-4 text-right">
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                    <p class="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">₹${formatIndian(totalAmountTax, 2)}</p>
                </div>
            </div>
        </div>
        </div>
    `;

    const copyElement = quotationCard.querySelector('.copy-text') as HTMLElement;
    const viewBtn = quotationCard.querySelector('.view-btn') as HTMLElement;
    const duplicateBtn = quotationCard.querySelector('.duplicate-btn') as HTMLElement;
    const editBtn = quotationCard.querySelector('.edit-btn') as HTMLElement;
    const archiveBtn = quotationCard.querySelector('.archive-btn') as HTMLElement;
    const restoreArchiveBtn = quotationCard.querySelector('.restore-archive-btn') as HTMLElement;
    const convertInvoiceBtn = quotationCard.querySelector('.convert-invoice-btn') as HTMLElement;

    // Copy ID functionality
    copyElement?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(quotationId);
            showToast('ID Copied to Clipboard!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Action button handlers - view with default type (1 = Without Tax)
    viewBtn?.addEventListener('click', () => {
        viewQuotation(quotationId, 1);
    });

    duplicateBtn?.addEventListener('click', () => {
        sessionStorage.setItem('currentTab-status', 'clone');
        cloneQuotation(quotationId);
    });

        editBtn?.addEventListener('click', () => {
            sessionStorage.setItem('currentTab-status', 'update');
            openQuotation(quotationId);
        });

        restoreArchiveBtn?.addEventListener('click', () => {
            this.confirmAction(`Are you sure you want to restore quotation "${quotationId}"?`, async () => {
                try {
                    await (window as any).restoreQuotationFromArchive(quotationId);
                } catch (error) {
                    (window as any).electronAPI?.showAlert1('Failed to restore quotation.');
                }
            });
        });

        convertInvoiceBtn?.addEventListener('click', () => {
            // quotationId is already the display ID (quotation_no e.g. "QUO-001") which the backend route accepts
            sessionStorage.setItem('quotation-to-invoice-id', quotationId);
            sessionStorage.setItem('currentTab-status', 'new');
            window.location.href = '../invoice/invoice.html';
        });

        return quotationCard;
    }

    confirmAction(message: string, onConfirm: () => void) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.showAlert2 && electronAPI?.receiveAlertResponse) {
            electronAPI.showAlert2(message);
            electronAPI.receiveAlertResponse((response: string) => {
                if (response === 'Yes') onConfirm();
            });
        } else if (confirm(message)) {
            onConfirm();
        }
    }

    // Delete a quotation
    deleteQuotation(quotationId: string) {
        deleteDocument('quotation', quotationId, 'Quotation', () => {
            if (typeof loadRecentQuotations === 'function') {
                loadRecentQuotations();
            }
        });
    }

    // Create a card for a TRASHED quotation (with Restore + Permanent Delete)
    createTrashCard(quotation: any): HTMLElement {
        const card = document.createElement('div');
        card.className = 'group bg-white rounded-lg shadow-md border border-red-200 overflow-hidden fade-in opacity-80 hover:opacity-100 transition-all duration-300';

        const formattedDate = quotation.quotation_date ? formatDateIndian(quotation.quotation_date) : '-';
        const quotationId = quotation.quotation_no || quotation.quotation_id || 'N/A';
        const customerName = quotation.customer_snapshot?.name || quotation.customer_name || '-';
        const totalAmountTax = quotation.totals?.grand_total || quotation.total_amount_tax || 0;
        const status = quotation.quotation_status || 'Draft';
        const deletedAt = quotation.deletion?.deleted_at
            ? formatDateIndian(quotation.deletion.deleted_at)
            : (quotation.deleted_at ? formatDateIndian(quotation.deleted_at) : '-');

        card.innerHTML = `
            <div class="flex">
                <div class="w-1.5 bg-gradient-to-b from-red-400 to-red-600 rounded-l-lg"></div>
                <div class="relative p-5 flex-1">
                    <!-- Top Row -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
                                <i class="fas fa-file-invoice text-lg text-white"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-900 truncate" title="${quotation.project_name}">${quotation.project_name}</h3>
                                <span class="text-xs text-red-500 font-medium"><i class="fas fa-trash mr-1"></i>Deleted on ${deletedAt}</span>
                            </div>
                        </div>
                        <!-- Actions -->
                        <div class="flex items-center gap-2">
                            <button class="trash-action-restore px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 hover:border-green-400 font-medium text-sm flex items-center gap-1.5" title="Restore">
                                <i class="fas fa-trash-restore"></i> Restore
                            </button>
                            <button class="trash-action-delete-permanent px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 hover:border-red-400 font-medium text-sm flex items-center gap-1.5" title="Permanently Delete">
                                <i class="fas fa-times-circle"></i> Delete
                            </button>
                        </div>
                    </div>
                    <!-- Info Row -->
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-sm font-bold text-gray-600">${quotationId}</span>
                        <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span class="text-xs text-gray-500"><i class="fas fa-calendar-alt mr-1"></i>${formattedDate}</span>
                        ${this.getStatusBadge(status)}
                    </div>
                    <!-- Bottom Row -->
                    <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <i class="fas fa-user text-red-500 text-xs"></i>
                            </div>
                            <p class="text-sm font-medium text-gray-700 truncate">${customerName}</p>
                        </div>
                        <div class="flex-shrink-0 ml-4 text-right">
                            <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                            <p class="text-xl font-bold text-red-500">₹${formatIndian(totalAmountTax, 2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const restoreBtn = card.querySelector('.trash-action-restore') as HTMLButtonElement;
        const deletePermanentBtn = card.querySelector('.trash-action-delete-permanent') as HTMLButtonElement;

        restoreBtn?.addEventListener('click', async () => {
            try {
                const res = await fetch(`/quotation/${quotationId}/restore`, { method: 'POST' });
                if (!res.ok) throw new Error('Failed to restore');
                showToast(`Quotation ${quotationId} restored`);
                // Refresh trash list
                if (typeof loadTrashQuotations === 'function') loadTrashQuotations();
            } catch (e) {
                (window as any).electronAPI?.showAlert1('Failed to restore quotation.');
            }
        });

        deletePermanentBtn?.addEventListener('click', () => {
            if (!(window as any).electronAPI) return;
            (window as any).electronAPI.showAlert2(`Permanently delete ${quotationId}? This cannot be undone.`);
            (window as any).electronAPI.receiveAlertResponse(async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const res = await fetch(`/quotation/trash/${quotationId}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Failed to delete');
                        showToast(`Quotation ${quotationId} permanently deleted`);
                        if (typeof loadTrashQuotations === 'function') loadTrashQuotations();
                    } catch (e) {
                        (window as any).electronAPI?.showAlert1('Failed to permanently delete quotation.');
                    }
                }
            });
        });

        return card;
    }
}

// Export instance globally
(window as any).quotationTable = new QuotationTable();

