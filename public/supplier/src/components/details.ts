/**
 * Supplier Module Details Page Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    if ((window as any).supplierForms) {
        (window as any).supplierForms.init();
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const supplierId = urlParams.get('id');

    if (!supplierId) {
        window.location.href = '/supplier';
        return;
    }

    // Tab switching logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tab!)?.classList.add('active');
        });
    });

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = '/supplier';
        });
    }

    const editBtn = document.getElementById('dropdown-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if ((window as any).supplierForms && (window as any).currentSupplier) {
                (window as any).supplierForms.openEditModal((window as any).currentSupplier);
            }
        });
    }

    const deleteBtn = document.getElementById('delete-supplier-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const supplier = (window as any).currentSupplier;
            if (!supplier) return;
            const fullName = supplier.supplier_name || '-';
            
            showConfirm(`Are you sure you want to delete supplier "${fullName}"?`, async (confirmed) => {
                if (confirmed === 'Yes') {
                    try {
                        await supplierApi.deleteSupplier(supplierId!);
                        showAlert('Supplier deleted successfully');
                        setTimeout(() => {
                            window.location.href = '/supplier';
                        }, 1000);
                    } catch (error) {
                        showAlert('Failed to delete supplier');
                    }
                }
            });
        });
    }

    const archiveBtn = document.getElementById('dropdown-archive-btn');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', () => {
            const supplier = (window as any).currentSupplier;
            if (!supplier) return;

            const isCurrentlyArchived = supplier.is_archived;
            const fullName = supplier.supplier_name || '-';

            if (isCurrentlyArchived) {
                showConfirm(`Are you sure you want to restore supplier "${fullName}"?`, async (confirmed) => {
                    if (confirmed === 'Yes') {
                        try {
                            await supplierApi.restoreSupplier(supplierId!);
                            (window as any).showToast('Supplier restored successfully');
                            fetchFullDetails();
                        } catch (err) {
                            console.error(err);
                            (window as any).showToast('Failed to restore supplier', 'error');
                        }
                    }
                });
            } else {
                showConfirm(`Are you sure you want to archive supplier "${fullName}"?`, async (confirmed) => {
                    if (confirmed === 'Yes') {
                        try {
                            await supplierApi.archiveSupplier(supplierId!);
                            (window as any).showToast('Supplier archived successfully');
                            fetchFullDetails();
                        } catch (err) {
                            console.error(err);
                            (window as any).showToast('Failed to archive supplier', 'error');
                        }
                    }
                });
            }
        });
    }

    async function fetchFullDetails() {
        try {
            const data = await supplierApi.getSupplierDetails(supplierId!);
            (window as any).currentSupplier = data.supplier;
            (window as any).currentSupplierDetails = data;
            populateData(data);
        } catch (error) {
            showAlert('Failed to load supplier profile');
        }
    }

    function formatCurrency(amount: any) {
        return '₹' + formatIndian(amount || 0);
    }

    function formatDate(date: any) {
        return formatDateDisplay(date);
    }

    function valOrDash(val: any) {
        return (val === null || val === undefined || val === '') ? '-' : val;
    }

    function getQuotationAmount(quotation: any) {
        return Number(quotation?.totals?.grand_total ?? quotation?.total_amount_tax ?? 0) || 0;
    }

    function getInvoiceAmount(invoice: any) {
        return Number(
            invoice?.totals_duplicate?.grand_total ??
            invoice?.total_amount_duplicate ??
            invoice?.total_amount_with_tax ??
            0
        ) || 0;
    }

    function getInvoiceDisplayStatus(invoice: any) {
        return invoice?.payment_status || invoice?.invoice_status || '-';
    }

    function getInvoiceStatusClasses(invoice: any) {
        const status = getInvoiceDisplayStatus(invoice).toLowerCase();
        if (status === 'paid') return 'bg-green-50 text-green-700';
        if (status === 'partial' || status === 'unpaid') return 'bg-orange-50 text-orange-700';
        if (status === 'cancelled') return 'bg-red-50 text-red-700';
        return 'bg-blue-50 text-blue-700';
    }

    function getPurchaseDisplayStatus(purchase: any) {
        return purchase?.payment_status || purchase?.purchase_status || '-';
    }

    function getPurchaseStatusClasses(purchase: any) {
        const status = getPurchaseDisplayStatus(purchase).toLowerCase();
        if (status === 'paid') return 'bg-green-50 text-green-700';
        if (status === 'partial' || status === 'unpaid' || status === 'partially refunded' || status === 'refunded') return 'bg-orange-50 text-orange-700';
        if (status === 'cancelled') return 'bg-red-50 text-red-700';
        return 'bg-blue-50 text-blue-700';
    }

    function populateData(data: any) {
        const { supplier, stats, purchases, payments } = data;

        // Header info
        const fullName = valOrDash(supplier.supplier_name);

        // Dynamic Archived alert banner & menu dropdown text logic
        const dropdownArchiveBtnText = document.getElementById('dropdown-archive-btn');
        if (dropdownArchiveBtnText) {
            if (supplier.is_archived) {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-box-open"></i> Restore Supplier`;
            } else {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-archive"></i> Archive Supplier`;
            }
        }

        const nameInitialEl = document.getElementById('name-initials');
        if (nameInitialEl) {
            nameInitialEl.textContent = fullName !== '-' 
                ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                : '?';
        }
        
        const custNameEl = document.getElementById('supplier-name');
        if (custNameEl) custNameEl.textContent = fullName;

        const headerCustNameEl = document.getElementById('header-supplier-name');
        if (headerCustNameEl) headerCustNameEl.textContent = fullName;

        const custTypeBadge = document.getElementById('supplier-type-badge');
        if (custTypeBadge) custTypeBadge.textContent = valOrDash(supplier.supplier_type);

        const displayCustId = document.getElementById('display-supplier-id');
        if (displayCustId) {
            displayCustId.textContent = valOrDash(supplier.supplier_id);
            if (supplier.supplier_id) {
                displayCustId.innerHTML = `${supplier.supplier_id} <i class="fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity"></i>`;
                displayCustId.className = 'cursor-pointer hover:text-blue-600 transition-all duration-150 inline-flex items-center gap-1 hover:underline';
                displayCustId.title = 'Click to copy ID';
                displayCustId.onclick = async () => {
                    await (window as any).copyToClipboard(supplier.supplier_id);
                    (window as any).showToast('Supplier ID copied');
                    
                    const icon = displayCustId.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check text-[10px] ml-1 text-emerald-500 scale-125 transition-all';
                        setTimeout(() => {
                            icon.className = 'fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity';
                        }, 1000);
                    }
                };
            }
        }

        const displayPhone = document.getElementById('display-phone');
        if (displayPhone) displayPhone.textContent = valOrDash(supplier.phone);

        const displayEmail = document.getElementById('display-email');
        if (displayEmail) displayEmail.textContent = valOrDash(supplier.email);

        const pendingBalanceEl = document.getElementById('pending-balance');
        if (pendingBalanceEl) pendingBalanceEl.textContent = formatCurrency(stats.pendingBalance);

        // Stats
        const statPurchases = document.getElementById('stat-purchases');
        if (statPurchases) statPurchases.textContent = (stats.totalPurchases || 0).toString();

        const statPaid = document.getElementById('stat-paid');
        if (statPaid) statPaid.textContent = formatCurrency(stats.totalPaidAmount);

        const statOutstanding = document.getElementById('stat-outstanding');
        if (statOutstanding) statOutstanding.textContent = formatCurrency(stats.pendingBalance);

        // Overview Tab - Contact Details
        const infoCustId = document.getElementById('info-supplier-id');
        if (infoCustId) {
            infoCustId.textContent = valOrDash(supplier.supplier_id);
            if (supplier.supplier_id) {
                infoCustId.innerHTML = `${supplier.supplier_id} <i class="fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity"></i>`;
                infoCustId.className = 'cursor-pointer hover:text-blue-600 transition-all duration-150 inline-flex items-center gap-1 hover:underline';
                infoCustId.title = 'Click to copy ID';
                infoCustId.onclick = async () => {
                    await (window as any).copyToClipboard(supplier.supplier_id);
                    (window as any).showToast('Supplier ID copied');
                    
                    const icon = infoCustId.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check text-[10px] ml-1 text-emerald-500 scale-125 transition-all';
                        setTimeout(() => {
                            icon.className = 'fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity';
                        }, 1000);
                    }
                };
            }
        }

        const infoSupplierName = document.getElementById('info-supplier-name');
        if (infoSupplierName) infoSupplierName.textContent = fullName;

        const infoPhone = document.getElementById('info-phone');
        if (infoPhone) infoPhone.textContent = valOrDash(supplier.phone);

        const infoEmail = document.getElementById('info-email');
        if (infoEmail) infoEmail.textContent = valOrDash(supplier.email);

        const infoGstin = document.getElementById('info-gstin');
        if (infoGstin) infoGstin.textContent = valOrDash(supplier.gstin);

        const infoCreated = document.getElementById('info-created');
        if (infoCreated) infoCreated.textContent = supplier.createdAt ? formatDate(supplier.createdAt) : '-';

        const infoStatus = document.getElementById('info-status');
        if (infoStatus) {
            infoStatus.textContent = supplier.is_active ? 'Active' : 'Inactive';
            infoStatus.className = supplier.is_active ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
        }

        // Overview Tab - Address Info
        const addrLine1 = document.getElementById('info-address-line1');
        if (addrLine1) addrLine1.textContent = valOrDash(supplier.billing_address?.line1);

        const addrLine2 = document.getElementById('info-address-line2');
        if (addrLine2) addrLine2.textContent = valOrDash(supplier.billing_address?.line2);

        const addrCityState = document.getElementById('info-address-city-state');
        if (addrCityState) {
            const city = supplier.billing_address?.city || '';
            const state = supplier.billing_address?.state || '';
            addrCityState.textContent = (city || state) ? `${city}, ${state}` : '-';
        }

        const addrPincode = document.getElementById('info-address-pincode');
        if (addrPincode) addrPincode.textContent = valOrDash(supplier.billing_address?.pincode);

        // Overview Tab - Bank Details
        const bankAccName = document.getElementById('info-bank-acc-name');
        if (bankAccName) bankAccName.textContent = valOrDash(supplier.bank_details?.account_name);

        const bankName = document.getElementById('info-bank-name');
        if (bankName) bankName.textContent = valOrDash(supplier.bank_details?.bank_name);

        const bankAccNum = document.getElementById('info-bank-acc-num');
        if (bankAccNum) bankAccNum.textContent = valOrDash(supplier.bank_details?.account_number);

        const bankIfsc = document.getElementById('info-bank-ifsc');
        if (bankIfsc) bankIfsc.textContent = valOrDash(supplier.bank_details?.ifsc);

        const remarksEl = document.getElementById('info-remarks');
        if (remarksEl) remarksEl.textContent = supplier.remarks || 'No notes available for this supplier.';

        // Populate Tables
        renderTable('purchases-list', purchases, (p: any) => `
            <td class="px-6 py-4 font-medium text-blue-600">${p.purchase_invoice_no || p.purchase_order_no || '-'}</td>
            <td class="px-6 py-4">${formatDate(p.purchase_date)}</td>
            <td class="px-6 py-4 font-bold">${formatCurrency(p.totals?.grand_total)}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 ${getPurchaseStatusClasses(p)} rounded text-xs uppercase font-bold">${getPurchaseDisplayStatus(p)}</span></td>
            <td class="px-6 py-4">
                <button data-action="view-purchase" data-id="${p.purchase_order_no || p._id}" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors uppercase tracking-wider">View</button>
            </td>
        `);

        renderTable('payments-list', payments, (p: any) => `
            <td class="px-6 py-4">${formatDate(p.payment_date)}</td>
            <td class="px-6 py-4 text-gray-500">${valOrDash(p.transaction_details)}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase">${p.mode}</span></td>
            <td class="px-6 py-4 font-bold text-green-600">${formatCurrency(p.amount)}</td>
            <td class="px-6 py-4">
                <button data-action="view-payment" data-id="${p.payment_id || p._id}" class="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors uppercase tracking-wider">Details</button>
            </td>
        `);
    }

    function renderTable(id: string, items: any[], rowTemplate: (item: any) => string) {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        
        if (!items || items.length === 0) {
            const type = id.split('-')[0].charAt(0).toUpperCase() + id.split('-')[0].slice(1);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center text-gray-400">
                            <i class="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
                            <p class="text-lg font-medium italic">No ${type} found for this supplier</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => `<tr>${rowTemplate(item)}</tr>`).join('');

        // Attach event delegation for the buttons
        tbody.onclick = (e) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('button');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');

            if (action === 'view-purchase') window.location.href = `/purchaseorder?id=${id}`;
            if (action === 'view-payment') window.location.href = `/payment/details?id=${id}`;
        };
    }

    // Modal helpers
    const openModalHelper = (modal: HTMLElement, card: HTMLElement) => {
        modal.classList.remove('hidden');
        modal.offsetHeight; // Force reflow
        modal.classList.add('opacity-100');
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
    };

    const closeModalHelper = (modal: HTMLElement, card: HTMLElement) => {
        modal.classList.remove('opacity-100');
        card.classList.remove('scale-100', 'opacity-100');
        card.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    };

    // Export Modal References
    const exportModal = document.getElementById('export-modal');
    const exportModalCard = document.getElementById('export-modal-card');
    const closeExportModal = document.getElementById('close-export-modal');
    const cancelExportBtn = document.getElementById('cancel-export-btn');
    const exportOptBtns = document.querySelectorAll('.export-opt-btn');

    // Export Trigger
    const dropdownExportBtn = document.getElementById('dropdown-export-btn');
    if (dropdownExportBtn && exportModal && exportModalCard) {
        dropdownExportBtn.addEventListener('click', () => {
            openModalHelper(exportModal, exportModalCard);
        });
    }

    if (closeExportModal && exportModal && exportModalCard) {
        closeExportModal.addEventListener('click', () => closeModalHelper(exportModal, exportModalCard));
    }
    if (cancelExportBtn && exportModal && exportModalCard) {
        cancelExportBtn.addEventListener('click', () => closeModalHelper(exportModal, exportModalCard));
    }

    // Handle export generation choice
    exportOptBtns.forEach(btnEl => {
        const btn = btnEl as HTMLButtonElement;
        btn.addEventListener('click', async () => {
            const format = btn.getAttribute('data-format');
            if (!format) return;

            // Show loading state, disable other options
            const originalHtml = btn.innerHTML;
            exportOptBtns.forEach(b => (b as HTMLButtonElement).disabled = true);

            if (format === 'pdf') {
                btn.classList.add('processing-pdf');
                btn.innerHTML = `
                    <div class="flex items-center gap-3 w-full animate-fade-in">
                        <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm shadow-sm shrink-0">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-rose-700 truncate">Generating PDF Report...</p>
                            <p class="text-[10px] text-rose-500 mt-0.5 truncate font-medium">Preparing supplier profile, purchases, and ledger</p>
                        </div>
                    </div>
                `;
            } else if (format === 'excel') {
                btn.classList.add('processing-pdf');
                btn.innerHTML = `
                    <div class="flex items-center gap-3 w-full animate-fade-in">
                        <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm shadow-sm shrink-0">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-emerald-700 truncate">Generating Spreadsheet...</p>
                            <p class="text-[10px] text-emerald-500 mt-0.5 truncate font-medium">Assembling financial registers and records</p>
                        </div>
                    </div>
                `;
            }

            // Simulate slight generation delay to ensure the user can feel the professional feedback/animation
            await new Promise(resolve => setTimeout(resolve, 800));

            try {
                // Fetch full details of the supplier to build export payload
                const data = (window as any).currentSupplierDetails;
                if (!data) throw new Error('Details not loaded yet');

                // Perform the export generation
                if (format === 'excel') {
                    // For Excel, we construct a beautifully structured CSV spreadsheet
                    let csvContent = "data:text/csv;charset=utf-8,";
                    csvContent += "SUPPLIER DETAILS\n";
                    csvContent += `ID,${data.supplier.supplier_id}\n`;
                    csvContent += `Name,${data.supplier.supplier_name}\n`;
                    csvContent += `Phone,${data.supplier.phone || 'N/A'}\n`;
                    csvContent += `Email,${data.supplier.email || 'N/A'}\n`;
                    csvContent += `GSTIN,${data.supplier.gstin || 'N/A'}\n\n`;

                    csvContent += "PURCHASE ORDERS\n";
                    csvContent += "Purchase Order ID,Date,Status,Grand Total\n";
                    (data.purchases || []).forEach((p: any) => {
                        csvContent += `"${p.purchase_order_id || p._id}","${formatDate(p.order_date || p.createdAt)}","${p.status || p.payment_status}","${p.grand_total || p.total_amount}"\n`;
                    });

                    csvContent += "\nPAYMENTS\n";
                    csvContent += "Payment ID,Date,Method,Amount\n";
                    (data.payments || []).forEach((p: any) => {
                        csvContent += `"${p.payment_id || p._id}","${formatDate(p.payment_date || p.createdAt)}","${p.payment_mode}","${p.amount}"\n`;
                    });

                    const encodedUri = encodeURI(csvContent);
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", encodedUri);
                    downloadAnchor.setAttribute("download", `supplier_ledger_${data.supplier.supplier_id || 'export'}.csv`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                } else if (format === 'pdf') {
                    // For PDF, generate a clean, structured print report
                    const printContainer = document.getElementById('print-report-container');
                    if (printContainer) {
                        const formatDateLocal = (dateStr: any) => {
                            if (!dateStr) return 'N/A';
                            try {
                                const d = new Date(dateStr);
                                if (isNaN(d.getTime())) return dateStr;
                                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            } catch (e) {
                                return dateStr || 'N/A';
                            }
                        };

                        const fullName = data.supplier.supplier_name || '-';
                        
                        // Financial Aggregations
                        const totalPurchasesCount = (data.purchases || []).length;
                        const totalPurchasedAmt = (data.purchases || []).reduce((sum: number, p: any) => sum + (Number(p.grand_total || p.total_amount) || 0), 0);
                        const totalPaidAmt = (data.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                        const outstandingAmt = Math.max(0, totalPurchasedAmt - totalPaidAmt);

                        // Build purchases table
                        let purchasesRows = '';
                        if ((data.purchases || []).length > 0) {
                            data.purchases.forEach((p: any) => {
                                purchasesRows += `
                                    <tr>
                                        <td>${p.purchase_order_id || p._id}</td>
                                        <td>${formatDateLocal(p.order_date || p.createdAt)}</td>
                                        <td><span style="font-weight:700;">${p.status || p.payment_status}</span></td>
                                        <td>₹${(Number(p.grand_total || p.total_amount) || 0).toLocaleString()}</td>
                                    </tr>`;
                            });
                        } else {
                            purchasesRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 15px;">No purchase records found</td></tr>`;
                        }

                        // Build payments table
                        let paymentRows = '';
                        if ((data.payments || []).length > 0) {
                            data.payments.forEach((p: any) => {
                                paymentRows += `
                                    <tr>
                                        <td>${p.payment_id || p._id}</td>
                                        <td>${formatDateLocal(p.payment_date || p.createdAt)}</td>
                                        <td>${p.payment_mode}</td>
                                        <td>₹${(Number(p.amount) || 0).toLocaleString()}</td>
                                    </tr>`;
                            });
                        } else {
                            paymentRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 15px;">No payment records found</td></tr>`;
                        }

                        // Render the fully structured CRM business document
                        printContainer.innerHTML = `
                            <div class="print-header">
                                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                    <div style="flex:1;">
                                        <h1 style="font-size:18pt; font-weight:800; color:#1e3a8a; margin:0; letter-spacing:-0.5px;">SHRESHT SYSTEMS</h1>
                                        <p style="font-size:9.5pt; color:#64748b; margin:4px 0 0 0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Supplier Account Summary Report</p>
                                    </div>
                                    <div style="text-align:right;">
                                        <p style="font-size:8pt; font-weight:700; color:#64748b; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Generated On</p>
                                        <p style="font-size:9.5pt; font-weight:600; color:#0f172a; margin:2px 0 0 0;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            <h2 class="print-section-title" style="margin-top:0;">1. Supplier Profile Identity</h2>
                            <div class="print-grid">
                                <div>
                                    <div class="print-meta-label">Supplier Name</div>
                                    <div class="print-meta-value">${fullName}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Supplier ID</div>
                                    <div class="print-meta-value">${data.supplier.supplier_id || 'ID Pending'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Company Name</div>
                                    <div class="print-meta-value">${data.supplier.company_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Profile Status</div>
                                    <div class="print-meta-value">${data.supplier.is_archived ? 'Archived' : (data.supplier.is_active ? 'Active' : 'Inactive')}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Primary Phone</div>
                                    <div class="print-meta-value">${data.supplier.phone || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Email Address</div>
                                    <div class="print-meta-value">${data.supplier.email || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">GSTIN / TAX ID</div>
                                    <div class="print-meta-value">${data.supplier.gstin || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Supplier Since</div>
                                    <div class="print-meta-value">${formatDateLocal(data.supplier.createdAt)}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">2. Registered & Billing Address</h2>
                            <div class="print-grid">
                                <div style="grid-column: span 2;">
                                    <div class="print-meta-label">Address</div>
                                    <div class="print-meta-value">
                                        ${data.supplier.billing_address?.line1 || ''}
                                        ${data.supplier.billing_address?.line2 ? ', ' + data.supplier.billing_address.line2 : ''}
                                    </div>
                                </div>
                                <div>
                                    <div class="print-meta-label">City</div>
                                    <div class="print-meta-value">${data.supplier.billing_address?.city || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">State & Pincode</div>
                                    <div class="print-meta-value">${data.supplier.billing_address?.state || 'N/A'} - ${data.supplier.billing_address?.pincode || 'N/A'}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">3. Bank Account Information</h2>
                            <div class="print-grid">
                                <div>
                                    <div class="print-meta-label">Account Holder Name</div>
                                    <div class="print-meta-value">${data.supplier.bank_details?.account_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Bank Name</div>
                                    <div class="print-meta-value">${data.supplier.bank_details?.bank_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Account Number</div>
                                    <div class="print-meta-value">${data.supplier.bank_details?.account_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">IFSC Code</div>
                                    <div class="print-meta-value">${data.supplier.bank_details?.ifsc || 'N/A'}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">4. Financial Ledger Summary</h2>
                            <div class="print-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr)) !important; text-align: center; background-color:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                                <div>
                                    <div class="print-meta-label">Purchases</div>
                                    <div class="print-meta-value" style="color:#2563eb; font-size:12pt; font-weight:800; margin-top:4px;">${totalPurchasesCount}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Total Purchased</div>
                                    <div class="print-meta-value" style="color:#0f172a; font-size:12pt; font-weight:800; margin-top:4px;">₹${totalPurchasedAmt.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Total Paid</div>
                                    <div class="print-meta-value" style="color:#16a34a; font-size:12pt; font-weight:800; margin-top:4px;">₹${totalPaidAmt.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Outstanding Balance</div>
                                    <div class="print-meta-value" style="color:#dc2626; font-size:12pt; font-weight:800; margin-top:4px;">₹${outstandingAmt.toLocaleString()}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">5. Purchase Order History</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Purchase Order ID</th>
                                        <th>Order Date</th>
                                        <th>Status</th>
                                        <th>Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${purchasesRows}
                                </tbody>
                            </table>

                            <h2 class="print-section-title">6. Payment History</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Payment ID</th>
                                        <th>Payment Date</th>
                                        <th>Method</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${paymentRows}
                                </tbody>
                            </table>

                            <div style="margin-top:40px; border-top:1px solid #e2e8f0; padding-top:15px; text-align:center; font-size:8pt; color:#94a3b8; font-weight:600;">
                                Official Record • Shresht Systems CRM Management Suite
                            </div>
                        `;
                    }
                    window.print();
                }

                // Show Success State on the button
                btn.classList.remove('processing-pdf');
                btn.classList.add('success-pdf');
                if (format === 'pdf') {
                    btn.innerHTML = `
                        <div class="flex items-center gap-3 w-full animate-fade-in">
                            <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                <i class="fas fa-check"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-extrabold text-emerald-700 truncate">PDF Exported Successfully</p>
                                <p class="text-[10px] text-emerald-500 mt-0.5 truncate font-medium">Report is fully generated and ready for print</p>
                            </div>
                        </div>
                    `;
                } else {
                    btn.innerHTML = `
                        <div class="flex items-center gap-3 w-full animate-fade-in">
                            <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                <i class="fas fa-check"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-extrabold text-emerald-700 truncate">Data Exported Successfully</p>
                                <p class="text-[10px] text-emerald-500 mt-0.5 truncate font-medium">File download initiated</p>
                            </div>
                        </div>
                    `;
                }

                // Show success toast
                (window as any).showToast('Supplier data exported successfully');
                
                // Wait slightly for the success animation to be readable, then close the modal
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (exportModal && exportModalCard) {
                    closeModalHelper(exportModal, exportModalCard);
                }
            } catch (err) {
                console.error(err);
                btn.classList.remove('processing-pdf');
                btn.classList.add('error-pdf');
                btn.innerHTML = `
                    <div class="flex items-center gap-3 w-full animate-fade-in">
                        <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-rose-700 truncate">Failed to Generate Export</p>
                            <p class="text-[10px] text-rose-500 mt-0.5 truncate font-medium">Please check configuration and try again</p>
                        </div>
                    </div>
                `;
                (window as any).showToast('Failed to export data', 'error');
                
                // Wait to display the error, then restore the card
                await new Promise(resolve => setTimeout(resolve, 2000));
            } finally {
                // Restore button state
                btn.classList.remove('processing-pdf', 'success-pdf', 'error-pdf');
                btn.innerHTML = originalHtml;
                exportOptBtns.forEach(b => (b as HTMLButtonElement).disabled = false);
            }
        });
    });

    (window as any).fetchFullDetails = fetchFullDetails;
    fetchFullDetails();
});

// ====== Global Toast ======
(window as any).showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const existingToast = document.getElementById('global-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all duration-350';
    
    if (type === 'error') {
        toast.style.background = '#ef4444';
        toast.innerHTML = `<i class="fas fa-exclamation-circle text-base"></i><span>${message}</span>`;
    } else {
        toast.style.background = '#10b981';
        toast.innerHTML = `<i class="fas fa-check-circle text-base"></i><span>${message}</span>`;
    }

    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    
    document.body.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Animate in
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
};
