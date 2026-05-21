(function () {
    const formatIndian = (window as any).formatIndian;
    const showToast = (window as any).showToast;
    const viewInvoice = (window as any).viewInvoice;
    const openInvoice = (window as any).openInvoice;
    const payment = (window as any).payment;
    const deleteInvoice = (window as any).deleteInvoice;
    const deleteDocument = (window as any).deleteDocument;

    class InvoiceTable {
        private listDiv: HTMLElement | null = null;

        constructor() {
            this.listDiv = document.querySelector(".records");
        }

    render(invoices: Invoice[]) {
        if (!this.listDiv) {
            this.listDiv = document.querySelector(".records");
        }
        if (!this.listDiv) return;

        this.listDiv.innerHTML = "";
        if (!invoices || invoices.length === 0) {
            this.listDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                    <div class="text-blue-500 text-5xl mb-4">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Invoices Found</h2>
                    <p class="text-gray-600">Start creating invoices for your clients</p>
                </div>
            `;
            return;
        }
        invoices.forEach(invoice => {
            const invoiceDiv = this.createInvoiceCard(invoice);
            this.listDiv!.appendChild(invoiceDiv);
        });
    }

    createInvoiceCard(invoice: Invoice): HTMLDivElement {
        const userRole = sessionStorage.getItem('userRole');
        const invoiceCard = document.createElement("div");
        invoiceCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";

        const status = (invoice.payment_status || 'Unpaid');
        const _statusNorm = String(status).toLowerCase().trim();

        const paidSoFar = Number(invoice.total_paid_amount || 0);
        const effectiveTotal = (() => {
            const dup = Number(invoice.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            return null;
        })();

        let isPaid = _statusNorm === 'paid';
        let isPartial = _statusNorm === 'partial';

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

        isPaid = false;
        isPartial = false;

        if (_statusNorm === 'partial') {
            isPartial = true;
        } else if (_statusNorm === 'paid') {
            isPaid = true;
        } else {
            const EPS = 0.01;
            if (total > 0) {
                if (paidSoFarFinal + EPS >= total) {
                    isPaid = true;
                } else if (paidSoFarFinal > 0) {
                    isPartial = true;
                }
            } else {
                if (paidSoFarFinal > 0) {
                    isPartial = true;
                }
            }
        }

        const dateToFormat = invoice.invoice_date || invoice.createdAt;
        const formattedDate = dateToFormat ? ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

        invoiceCard.innerHTML = `
            <div class="flex">
                <div class="card-left-border w-1.5 bg-gradient-to-b ${isPaid ? 'from-green-500 to-emerald-600' : isPartial ? 'from-yellow-500 to-amber-500' : 'from-orange-500 to-red-500'} rounded-l-lg"></div>
                <div class="relative p-5 flex-1">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <i class="fas fa-file-invoice-dollar text-lg text-white"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-bold text-gray-900 truncate max-w-[180px]" title="${invoice.project_name || ''}">${invoice.project_name || ''}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold card-status-badge flex-shrink-0 ${isPaid ? 'bg-green-100 text-green-700' : isPartial ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}">
                                    ${status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        ${userRole === 'admin' ? `
                            <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-original-btn px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-all border border-teal-200 hover:border-teal-400" title="Edit Original">
                                <i class="fas fa-file-signature"></i>
                            </button>
                            <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit Duplicate">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn payment-btn px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="Payment">
                                <i class="fas fa-credit-card"></i>
                            </button>
                            <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : userRole === 'manager' ? `
                            <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn payment-btn px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="Payment">
                                <i class="fas fa-credit-card"></i>
                            </button>
                            <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
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
                        <div class="card-amount-box rounded-lg p-3 min-w-[300px]" style="background: ${isPaid ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : isPartial ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)'}; border: 1px solid ${isPaid ? '#a7f3d0' : isPartial ? '#fcd34d' : '#fecaca'};">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</span>
                                <span class="text-base font-bold card-total-amount" style="color: ${isPaid ? '#059669' : '#dc2626'};">₹${formatIndian(total, 2)}</span>
                            </div>
                            <div class="w-full h-1.5 rounded-full mb-2 card-progress-outer" style="background-color: ${dueAmount > 0 ? '#fecaca' : '#bbf7d0'};">
                                <div class="h-1.5 rounded-full card-progress-fill" style="width: ${percentPaid}%; background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
                            </div>
                            <div class="flex items-center justify-between">
                                ${isPaid ? `
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
        const deleteBtn = invoiceCard.querySelector('.delete-btn');

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

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if ((window as any).electronAPI && (window as any).electronAPI.showAlert2) {
                    (window as any).electronAPI.showAlert2('Are you sure you want to delete this invoice?');
                    (window as any).electronAPI.receiveAlertResponse((response: string) => {
                        if (response === "Yes") {
                            deleteInvoice(invoice.invoice_id);
                        }
                    });
                }
            });
        }

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
                        const newStatus = (effective > 0 && paid >= effective) ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
                        badge.textContent = newStatus;
                        badge.classList.remove('bg-green-100', 'text-green-700', 'bg-yellow-100', 'text-yellow-700', 'bg-orange-100', 'text-orange-700');
                        if (newStatus === 'PAID') badge.classList.add('bg-green-100', 'text-green-700');
                        else if (newStatus === 'PARTIAL') badge.classList.add('bg-yellow-100', 'text-yellow-700');
                        else badge.classList.add('bg-orange-100', 'text-orange-700');

                        const borderEl = invoiceCard.querySelector('.card-left-border');
                        if (borderEl) {
                            borderEl.className = `card-left-border w-1.5 bg-gradient-to-b ${newStatus === 'PAID' ? 'from-green-500 to-emerald-600' : newStatus === 'PARTIAL' ? 'from-yellow-500 to-amber-500' : 'from-orange-500 to-red-500'} rounded-l-lg`;
                        }

                        const amountBox = invoiceCard.querySelector('.card-amount-box') as HTMLElement | null;
                        if (amountBox) {
                            if (newStatus === 'PAID') {
                                amountBox.style.background = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
                                amountBox.style.border = '1px solid #a7f3d0';
                            } else if (newStatus === 'PARTIAL') {
                                amountBox.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                                amountBox.style.border = '1px solid #fcd34d';
                            } else {
                                amountBox.style.background = 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)';
                                amountBox.style.border = '1px solid #fecaca';
                            }
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
