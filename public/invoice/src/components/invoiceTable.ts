(function () {
    const formatIndian = (...args: any[]) => (window as any).formatIndian(...args);
    const showToast = (...args: any[]) => (window as any).showToast(...args);
    const viewInvoice = (...args: any[]) => (window as any).viewInvoice(...args);
    const openInvoice = (...args: any[]) => (window as any).openInvoice(...args);
    const payment = (...args: any[]) => (window as any).payment(...args);
    const deleteInvoice = (...args: any[]) => (window as any).deleteInvoice(...args);
    const deleteDocument = (...args: any[]) => (window as any).deleteDocument(...args);

    interface BoxStyle {
        background: string;
        border: string;
        text: string;
    }

    const BOX_STYLES: Record<InvoiceStatus, BoxStyle> = {
        [InvoiceStatus.DRAFT]: { background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', text: '#4b5563' },
        [InvoiceStatus.SENT]: { background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', text: '#2563eb' },
        [InvoiceStatus.OVERDUE]: { background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)', border: '1px solid #fecaca', text: '#dc2626' },
        [InvoiceStatus.PARTIALLY_PAID]: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #fcd34d', text: '#d97706' },
        [InvoiceStatus.PAID]: { background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0', text: '#059669' },
        [InvoiceStatus.CANCELLED]: { background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', text: '#4b5563' },
        [InvoiceStatus.REFUNDED]: { background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid #e9d5ff', text: '#7c3aed' }
    };

    class InvoiceTable {
        private listDiv: HTMLElement | null = null;

        constructor() {
            this.listDiv = document.querySelector(".records");
        }

    private updateStats(invoices: Invoice[]) {
        const totalCountEl = document.getElementById('total-invoices-count');
        const b2bCountEl = document.getElementById('b2b-invoices-count');
        const b2cCountEl = document.getElementById('b2c-invoices-count');

        if (!totalCountEl || !b2bCountEl || !b2cCountEl) return;

        const total = invoices.length;
        const b2b = invoices.filter(i => {
            const snapGst = i.customer_snapshot?.gstin;
            const flatGst = (i as any).customer_GSTIN;
            return !!((snapGst && snapGst.trim()) || (flatGst && flatGst.trim()));
        }).length;
        const b2c = total - b2b;

        totalCountEl.textContent = total.toString();
        b2bCountEl.textContent = b2b.toString();
        b2cCountEl.textContent = b2c.toString();
    }

    render(invoices: Invoice[]) {
        if (!this.listDiv) {
            this.listDiv = document.querySelector(".records");
        }
        if (!this.listDiv) return;

        this.listDiv.innerHTML = "";
        const isTrash = !!(window as any).showDeletedItems;
        const isArchivedView = !isTrash && (window as any).statusFilter === 'archived';

        if (!invoices || invoices.length === 0) {
            const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
            const hasSearch = searchInput && searchInput.value.trim() !== '';

            if (isTrash) {
                this.listDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-rose-500 text-5xl mb-4">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                        <p class="text-gray-600">No soft-deleted invoices found</p>
                    </div>
                `;
            } else if (isArchivedView) {
                this.listDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-amber-500 text-5xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Invoices</h2>
                        <p class="text-gray-600">Invoices you archive will show up here</p>
                    </div>
                `;
            } else if (hasSearch) {
                this.listDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-yellow-500 text-5xl mb-4">
                            <i class="fas fa-search"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                        <p class="text-gray-600">No invoices match your search</p>
                    </div>
                `;
            } else {
                this.listDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-blue-500 text-5xl mb-4">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Invoices Found</h2>
                        <p class="text-gray-600">Start creating invoices for your clients</p>
                    </div>
                `;
            }
            this.updateStats([]);
            return;
        }
        invoices.forEach(invoice => {
            const invoiceDiv = this.createInvoiceCard(invoice);
            this.listDiv!.appendChild(invoiceDiv);
        });
        this.updateStats(invoices);
    }

    createInvoiceCard(invoice: Invoice): HTMLDivElement {
        const userRole = sessionStorage.getItem('userRole');
        const invoiceCard = document.createElement("div");
        
        const isTrash = !!(window as any).showDeletedItems;
        const isArchived = !isTrash && invoice.is_archived;

        if (isTrash) {
            invoiceCard.className = "group bg-rose-50/10 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-rose-200 overflow-hidden fade-in cursor-default";
        } else if (isArchived) {
            invoiceCard.className = "group bg-slate-50/90 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-slate-300 overflow-hidden fade-in opacity-80 hover:opacity-100";
        } else {
            invoiceCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";
        }

        const invoiceStatus = getInvoiceStatus(invoice);
        const detail = { ...INVOICE_STATUS_DETAILS[invoiceStatus] };
        const boxStyle = { ...BOX_STYLES[invoiceStatus] };

        let statusClass = `${detail.bgClass} ${detail.textClass}`;
        let statusLabel = detail.label.toUpperCase();
        let borderClass = detail.borderClass;

        if (isTrash) {
            statusClass = 'bg-rose-100 text-rose-700';
            statusLabel = 'DELETED';
            borderClass = 'from-rose-500 to-rose-600';
            boxStyle.background = 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)';
            boxStyle.border = '1px solid #fecaca';
            boxStyle.text = '#dc2626';
        } else if (isArchived) {
            statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
            statusLabel = 'ARCHIVED';
            borderClass = 'from-slate-400 to-slate-600';
            boxStyle.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
            boxStyle.border = '1px solid #cbd5e1';
            boxStyle.text = '#475569';
        }

        const paidSoFar = Number(invoice.total_paid_amount || 0);
        const effectiveTotal = (() => {
            const dup = Number(invoice.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            return null;
        })();

        const computeEffectiveTotal = (inv: Invoice): number => {
            const dup = Number(inv.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
            const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
            let subtotal = 0;
            let tax = 0;
            for (const it of items) {
                const qty = Number(it.quantity || 0);
                const unit = Number(it.unit_price || 0);
                const rate = Number(it.rate || 0);
                const taxable = qty * unit;
                subtotal += taxable;
                tax += taxable * (rate / 100);
            }
            for (const nit of nonItems) {
                const price = Number(nit.price || 0);
                const rate = Number(nit.rate || 0);
                subtotal += price;
                tax += price * (rate / 100);
            }
            return Number((subtotal + tax).toFixed(2));
        };

        const total = effectiveTotal !== null ? effectiveTotal : computeEffectiveTotal(invoice);
        const paidSoFarFinal = paidSoFar;
        const dueAmount = Number((total - paidSoFar).toFixed(2));
        let percentPaid = total > 0 ? Math.round((paidSoFarFinal / total) * 100) : (paidSoFarFinal > 0 ? 100 : 0);
        percentPaid = Math.max(0, Math.min(percentPaid, 100));

        const dateToFormat = invoice.invoice_date || invoice.createdAt;
        const formattedDate = dateToFormat ? ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

        invoiceCard.innerHTML = `
            <div class="flex">
                <div class="card-left-border w-1.5 bg-gradient-to-b ${borderClass} rounded-l-lg"></div>
                <div class="relative p-5 flex-1">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <i class="fas fa-file-invoice-dollar text-lg text-white"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-bold text-gray-900 truncate max-w-[180px]" title="${invoice.project_name || ''}">${invoice.project_name || ''}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold card-status-badge flex-shrink-0 ${statusClass}">
                                    ${statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        ${isTrash || isArchived ? `
                            <button class="action-btn restore-card-btn px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-emerald-300 active:scale-95 cursor-pointer" title="Restore">
                                <i class="fas ${isTrash ? 'fa-trash-restore' : 'fa-box-open'}"></i> Restore
                            </button>
                            <button class="action-btn hard-delete-card-btn px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-rose-300 active:scale-95 cursor-pointer" title="Delete Forever">
                                <i class="fas fa-trash-alt"></i> Delete Forever
                            </button>
                        ` : `
                            ${userRole === 'admin' ? `
                                <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : userRole === 'manager' ? `
                                <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit-original-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                        `}
                    </div>
                </div>
                
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy ID">
                        ${invoice.invoice_id}
                        <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                    </span>
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    <span class="text-xs text-gray-500">
                        <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                    </span>
                </div>
                
                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-blue-600 text-xs"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-gray-800 truncate" title="${invoice.customer_name || ''}">${invoice.customer_name || ''}</p>
                            <p class="text-xs text-gray-500 truncate" title="${invoice.customer_address || ''}">${invoice.customer_address || ''}</p>
                        </div>
                    </div>
                    
                    ${userRole === 'admin' ? `
                    <div class="flex-shrink-0 ml-4">
                        <div class="card-amount-box rounded-lg p-3 min-w-[300px]" style="background: ${boxStyle.background}; border: ${boxStyle.border};">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</span>
                                <span class="text-base font-bold card-total-amount" style="color: ${boxStyle.text};">₹${formatIndian(total, 2)}</span>
                            </div>
                            <div class="w-full h-1.5 rounded-full mb-2 card-progress-outer" style="background-color: ${dueAmount > 0 ? '#fecaca' : '#bbf7d0'};">
                                <div class="h-1.5 rounded-full card-progress-fill" style="width: ${percentPaid}%; background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
                            </div>
                            <div class="flex items-center justify-between">
                                ${dueAmount <= 0 ? `
                                <span class="text-xs font-medium card-payment-label" style="color: #059669;"><i class="fas fa-check-circle mr-1"></i>Fully Paid</span>
                                <span class="text-base font-bold card-due-amount" style="color: #059669;">₹${formatIndian(paidSoFar, 2)}</span>
                                ` : `
                                <span class="text-xs font-medium uppercase tracking-wide card-payment-label" style="color: #dc2626;">Balance Due</span>
                                <span class="text-base font-bold card-due-amount" style="color: #dc2626;">₹${formatIndian(Math.max(0, dueAmount), 2)}</span>
                                `}
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="flex-shrink-0 ml-4 text-right">
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                        <p class="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">₹${formatIndian(total, 2)}</p>
                    </div>
                    `}
                </div>
            </div>
            </div>
        `;

        const copyElement = invoiceCard.querySelector('.copy-text');
        const viewBtn = invoiceCard.querySelector('.view-btn');
        const editBtn = invoiceCard.querySelector('.edit-btn');
        const editOriginalBtn = invoiceCard.querySelector('.edit-original-btn');
        const paymentBtn = invoiceCard.querySelector('.payment-btn');
        const restoreCardBtn = invoiceCard.querySelector('.restore-card-btn');
        const hardDeleteCardBtn = invoiceCard.querySelector('.hard-delete-card-btn');

        if (restoreCardBtn) {
            restoreCardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isTrash) {
                    (window as any).handleRestoreFromTrash(invoice.invoice_id, invoice.project_name);
                } else if (isArchived) {
                    (window as any).handleRestoreFromArchive(invoice.invoice_id, invoice.project_name);
                }
            });
        }

        if (hardDeleteCardBtn) {
            hardDeleteCardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleHardDelete(invoice.invoice_id, invoice.project_name);
            });
        }

        if (copyElement) {
            copyElement.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(invoice.invoice_id);
                    showToast('ID Copied to Clipboard!');
                } catch (err) {
                    console.error('Copy failed', err);
                }
            });
        }

        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                sessionStorage.setItem('view-invoice', 'duplicate');
                viewInvoice(invoice.invoice_id, userRole);
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                sessionStorage.setItem('currentTab-status', 'update');
                sessionStorage.setItem('update-invoice', 'duplicate');
                openInvoice(invoice.invoice_id);
            });
        }

        if (editOriginalBtn) {
            editOriginalBtn.addEventListener('click', () => {
                sessionStorage.setItem('currentTab-status', 'update');
                sessionStorage.setItem('update-invoice', 'original');
                openInvoice(invoice.invoice_id);
            });
        }

        if (paymentBtn) {
            paymentBtn.addEventListener('click', () => {
                payment(invoice.invoice_id);
            });
        }

        // Delete action moved to Danger Zone in Detail View

        // Enrich empty/0-value cards on list fetch
        (async () => {
            try {
                if (total === 0 && !(invoice.items_duplicate && invoice.items_duplicate.length) && !(invoice.items_original && invoice.items_original.length)) {
                    const full = await (window as any).invoiceApi.getInvoiceById(invoice.invoice_id);
                    if (!full) return;

                    const effective = computeEffectiveTotal(full);
                    const paid = Number(full.total_paid_amount || 0);
                    const due = Number((effective - paid).toFixed(2));
                    const percent = effective > 0 ? Math.round((paid / effective) * 100) : (paid > 0 ? 100 : 0);

                    const totalEl = invoiceCard.querySelector('.card-total-amount') as HTMLElement | null;
                    const fillEl = invoiceCard.querySelector('.card-progress-fill') as HTMLElement | null;
                    const outerEl = invoiceCard.querySelector('.card-progress-outer') as HTMLElement | null;
                    const dueEl = invoiceCard.querySelector('.card-due-amount') as HTMLElement | null;
                    const badge = invoiceCard.querySelector('.card-status-badge') as HTMLElement | null;

                    if (totalEl) totalEl.textContent = `₹${formatIndian(effective, 2)}`;
                    const percentClamped = Math.max(0, Math.min(percent, 100));
                    if (fillEl) fillEl.style.width = `${percentClamped}%`;
                    if (outerEl) outerEl.style.backgroundColor = due > 0 ? '#fecaca' : '#bbf7d0';
                    if (dueEl) {
                        dueEl.textContent = due > 0 ? `₹${formatIndian(due, 2)}` : `₹${formatIndian(paid, 2)}`;
                        dueEl.style.color = due > 0 ? '#dc2626' : '#059669';
                    }

                    const labelEl = invoiceCard.querySelector('.card-payment-label') as HTMLElement | null;
                    if (labelEl) {
                        if (due <= 0) {
                            labelEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Fully Paid';
                            labelEl.style.color = '#059669';
                            labelEl.classList.remove('uppercase', 'tracking-wide');
                        } else {
                            labelEl.textContent = 'Balance Due';
                            labelEl.style.color = '#dc2626';
                            labelEl.classList.add('uppercase', 'tracking-wide');
                        }
                    }

                    if (badge) {
                        const invoiceStatus = getInvoiceStatus(full);
                        const detail = INVOICE_STATUS_DETAILS[invoiceStatus];
                        const boxStyle = BOX_STYLES[invoiceStatus];

                        badge.textContent = detail.label.toUpperCase();
                        badge.className = `px-2 py-0.5 rounded-md text-xs font-semibold card-status-badge flex-shrink-0 ${detail.bgClass} ${detail.textClass}`;

                        const borderEl = invoiceCard.querySelector('.card-left-border');
                        if (borderEl) {
                            borderEl.className = `card-left-border w-1.5 bg-gradient-to-b ${detail.borderClass} rounded-l-lg`;
                        }

                        const amountBox = invoiceCard.querySelector('.card-amount-box') as HTMLElement | null;
                        if (amountBox) {
                            amountBox.style.background = boxStyle.background;
                            amountBox.style.border = boxStyle.border;
                        }
                    }
                }
            } catch (err) {
                console.error('Error enriching invoice card:', err);
            }
        })();

        return invoiceCard;
    }
}

(window as any).invoiceTable = new InvoiceTable();
})();
