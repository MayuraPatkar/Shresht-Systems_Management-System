// @ts-nocheck
/**
 * Quotation Module - Table & Card Rendering
 * Handles the home screen list: card creation, rendering, and deletion.
 */

class QuotationTable {
    private paginationManager: any = null;
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

    // Update the table header dynamically
    updateTableHeader(isTrash: boolean) {
        const headerRow = document.getElementById('table-header-row');
        if (!headerRow) return;

        if (isTrash) {
            headerRow.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Project</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Deleted Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Total</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Actions</th>
            `;
        } else {
            const sortBy = (window as any).currentFilters?.sortBy || 'date-desc';
            
            const dateIcon = sortBy === 'date-desc' ? '<i class="fas fa-chevron-down ml-1.5 text-purple-600"></i>' :
                             sortBy === 'date-asc' ? '<i class="fas fa-chevron-up ml-1.5 text-purple-600"></i>' :
                             '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';
            
            const nameIcon = sortBy === 'name-asc' ? '<i class="fas fa-sort-alpha-down ml-1.5 text-purple-600"></i>' :
                             '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';
            
            const amountIcon = sortBy === 'amount-desc' ? '<i class="fas fa-chevron-down mr-1.5 text-purple-600"></i>' :
                               sortBy === 'amount-asc' ? '<i class="fas fa-chevron-up mr-1.5 text-purple-600"></i>' :
                               '<i class="fas fa-sort mr-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';

            headerRow.innerHTML = `
                <th id="th-date" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-purple-600 select-none transition-all duration-150 group">
                    <span class="flex items-center">Date ${dateIcon}</span>
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Quotation ID</th>
                <th id="th-name" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-purple-600 select-none transition-all duration-150 group">
                    <span class="flex items-center">Project Name ${nameIcon}</span>
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Valid Till</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th id="th-total" class="px-4 py-3 text-right text-xs font-semibold tracking-wider cursor-pointer hover:bg-slate-100 hover:text-purple-600 select-none transition-all duration-150 group">
                    <span class="flex items-center justify-end">${amountIcon} Total</span>
                </th>
            `;
            
            // Attach event listeners
            document.getElementById('th-date')?.addEventListener('click', () => {
                const nextSort = sortBy === 'date-desc' ? 'date-asc' : 'date-desc';
                if (typeof (window as any).triggerHeaderSort === 'function') {
                    (window as any).triggerHeaderSort(nextSort);
                }
            });
            document.getElementById('th-name')?.addEventListener('click', () => {
                if (typeof (window as any).triggerHeaderSort === 'function') {
                    (window as any).triggerHeaderSort('name-asc');
                }
            });
            document.getElementById('th-total')?.addEventListener('click', () => {
                const nextSort = sortBy === 'amount-desc' ? 'amount-asc' : 'amount-desc';
                if (typeof (window as any).triggerHeaderSort === 'function') {
                    (window as any).triggerHeaderSort(nextSort);
                }
            });
        }
    }

    // Render quotations in the list
    renderQuotations(quotations: any[]) {
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
                        const gstin = (q.customer_snapshot?.gstin || q.customer_GSTIN || '').trim().toUpperCase();
                        const hasGstin = gstin !== '' && gstin !== '-' && gstin !== 'N/A' && gstin !== 'NA' && gstin !== 'UNDEFINED';
                        if (hasGstin) {
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

        if (!this.paginationManager) {
            this.paginationManager = new (window as any).TablePaginationManager(
                'quotation-tbody',
                (paginatedData: any[]) => this.renderPage(paginatedData),
                25
            );
        }
        this.paginationManager.setData(quotations);
    }

    renderPage(quotations: any[]) {
        const quotationListDiv = document.querySelector(".records") as HTMLElement;
        const mobileContainer = document.getElementById("quotation-cards-mobile") as HTMLElement;
        if (!quotationListDiv) return;

        quotationListDiv.innerHTML = "";
        if (mobileContainer) mobileContainer.innerHTML = "";

        if (!quotations || quotations.length === 0) {
            const isArchivedView = typeof isArchiveMode !== 'undefined' && isArchiveMode;
            const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
            const hasSearch = searchInput && searchInput.value.trim() !== '';

            let emptyHtml = "";
            if (isArchivedView) {
                emptyHtml = `
                    <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                        <div class="text-amber-500 text-6xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Quotations</h2>
                        <p class="text-gray-500 text-xs">Quotations you archive will show up here</p>
                    </div>
                `;
            } else if (hasSearch) {
                emptyHtml = `
                    <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                        <div class="text-yellow-500 text-6xl mb-4">
                            <i class="fas fa-search"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                        <p class="text-gray-500 text-xs">No quotations match your search</p>
                    </div>
                `;
            } else {
                emptyHtml = `
                    <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                        <div class="text-purple-500 text-6xl mb-4">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Quotations Found</h2>
                        <p class="text-gray-500 text-xs">Start creating professional quotations for your clients</p>
                    </div>
                `;
            }
            
            quotationListDiv.innerHTML = `
                <tr>
                    <td colspan="100" class="px-4 py-10 bg-white text-slate-400 text-center">
                        ${emptyHtml}
                    </td>
                </tr>
            `;

            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas ${isArchivedView ? 'fa-archive' : 'fa-file-invoice'} text-3xl ${isArchivedView ? 'text-amber-500' : 'text-purple-500'} mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">${isArchivedView ? 'No Archived Quotations' : 'No Quotations Found'}</p>
                    </div>
                `;
            }
            return;
        }

        // Set active view header
        this.updateTableHeader(false);

        quotations.forEach((quotation: any) => {
            const quotationRow = this.createQuotationCard(quotation);
            quotationListDiv.appendChild(quotationRow);
        });

        // Mobile list rendering
        if (mobileContainer) {
            mobileContainer.innerHTML = quotations.map((q: any) => {
                const formattedDate = q.quotation_date ? formatDateIndian(q.quotation_date) : '-';
                const quotationId = q.quotation_no || q.quotation_id || 'N/A';
                const customerName = q.customer_snapshot?.name || q.customer_name || '-';
                const totalAmountTax = q.totals?.grand_total || q.total_amount_tax || 0;
                const status = q.quotation_status || 'Draft';
                const validTill = q.valid_till ? formatDateIndian(q.valid_till) : '-';
                const isArchived = !!q.is_archived;
                const statusBadge = isArchived ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">ARCHIVED</span>' : this.getStatusBadge(status);

                return `
                <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="viewQuotation('${quotationId}', 1)">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-450 uppercase tracking-wider">${formattedDate}</span>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <div>
                            <p class="text-sm font-bold text-slate-800 truncate max-w-[180px]">${q.project_name || '-'}</p>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">${customerName}</p>
                        </div>
                        <p class="text-sm font-extrabold text-purple-600">₹${formatIndian(totalAmountTax, 2)}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-2 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                        <span>Valid: <span class="font-bold text-slate-800">${validTill}</span></span>
                        <span class="font-bold text-slate-400">${quotationId}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // Create a quotation row element
    createQuotationCard(quotation: any): HTMLElement {
        const quotationCard = document.createElement("tr");
        const isArchived = !!quotation.is_archived;
        quotationCard.className = "border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs";

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
        const isConverted = status === 'Converted' || !!quotation.converted_invoice_id;

        quotationCard.innerHTML = `
            <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs">${formattedDate}</td>
            <td class="px-4 py-3 text-slate-850 font-bold whitespace-nowrap text-xs">
                <span class="cursor-pointer hover:text-purple-600 copy-text transition-colors" title="Click to copy ID">
                    ${quotationId}
                    <i class="fas fa-copy text-[10px] ml-1 opacity-50"></i>
                </span>
            </td>
            <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[150px] truncate" title="${quotation.project_name || '-'}">
                ${quotation.project_name || '-'}
            </td>
            <td class="px-4 py-3 text-xs max-w-[180px] truncate">
                <div class="font-medium text-slate-800" title="${customerName}">${customerName}</div>
                <div class="text-[10px] text-slate-400 truncate" title="${customerAddress}">${customerAddress}</div>
            </td>
            <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">${validTill}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                ${isArchived ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">ARCHIVED</span>' : this.getStatusBadge(status)}
            </td>
            <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-slate-900">
                ₹${formatIndian(totalAmountTax, 2)}
            </td>
        `;

        const copyElement = quotationCard.querySelector('.copy-text') as HTMLElement;

        // Copy ID functionality
        copyElement?.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(quotationId);
                showToast('ID Copied to Clipboard!');
            } catch (err) {
                console.error('Copy failed', err);
            }
        });

        // Row click opens the details view
        quotationCard.addEventListener('click', () => {
            viewQuotation(quotationId, 1);
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

    // Create a row for a TRASHED quotation (with Restore + Permanent Delete)
    createTrashCard(quotation: any): HTMLElement {
        const card = document.createElement('tr');
        card.className = 'border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs';

        const formattedDate = quotation.quotation_date ? formatDateIndian(quotation.quotation_date) : '-';
        const quotationId = quotation.quotation_no || quotation.quotation_id || 'N/A';
        const customerName = quotation.customer_snapshot?.name || quotation.customer_name || '-';
        const totalAmountTax = quotation.totals?.grand_total || quotation.total_amount_tax || 0;
        const status = quotation.quotation_status || 'Draft';
        const deletedAt = quotation.deletion?.deleted_at
            ? formatDateIndian(quotation.deletion.deleted_at)
            : (quotation.deleted_at ? formatDateIndian(quotation.deleted_at) : '-');

        card.innerHTML = `
            <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs">${formattedDate}</td>
            <td class="px-4 py-3 text-slate-600 font-bold whitespace-nowrap text-xs">${quotationId}</td>
            <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[150px] truncate" title="${quotation.project_name || '-'}">
                ${quotation.project_name || '-'}
            </td>
            <td class="px-4 py-3 text-slate-700 text-xs max-w-[180px] truncate" title="${customerName}">${customerName}</td>
            <td class="px-4 py-3 text-red-500 font-medium whitespace-nowrap text-xs">
                <i class="fas fa-trash mr-1 text-[10px]"></i> ${deletedAt}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">${this.getStatusBadge(status)}</td>
            <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-red-500">
                ₹${formatIndian(totalAmountTax, 2)}
            </td>
            <td class="px-4 py-2 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                    <button class="trash-action-restore px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 hover:border-green-400 font-semibold text-xs flex items-center gap-1" title="Restore">
                        <i class="fas fa-trash-restore text-[10px]"></i> Restore
                    </button>
                    <button class="trash-action-delete-permanent px-2.5 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200 hover:border-red-400 font-semibold text-xs flex items-center gap-1" title="Permanently Delete">
                        <i class="fas fa-times-circle text-[10px]"></i> Delete
                    </button>
                </div>
            </td>
        `;

        const restoreBtn = card.querySelector('.trash-action-restore') as HTMLButtonElement;
        const deletePermanentBtn = card.querySelector('.trash-action-delete-permanent') as HTMLButtonElement;

        restoreBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
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

        deletePermanentBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
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
