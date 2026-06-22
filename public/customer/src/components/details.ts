/**
 * Customer Module Details Page Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    if ((window as any).customerForms) {
        (window as any).customerForms.init();
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');

    if (!customerId) {
        window.location.href = '/customer';
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
            window.location.href = '/customer';
        });
    }

    // Kebab Menu Dropdown Elements
    const kebabBtn = document.getElementById('kebab-menu-btn');
    const kebabDropdown = document.getElementById('kebab-dropdown');
    
    if (kebabBtn && kebabDropdown) {
        kebabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = kebabDropdown.classList.toggle('hidden');
            if (!isHidden) {
                kebabDropdown.classList.add('animate-dropdown');
            } else {
                kebabDropdown.classList.remove('animate-dropdown');
            }
        });

        document.addEventListener('click', () => {
            kebabDropdown.classList.add('hidden');
            kebabDropdown.classList.remove('animate-dropdown');
        });

        kebabDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Edit Profile triggers (both main button and dropdown item)
    const openEdit = () => {
        if ((window as any).customerForms && (window as any).currentCustomer) {
            (window as any).customerForms.openEditModal((window as any).currentCustomer);
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
        }
    };

    const dropdownEditBtn = document.getElementById('dropdown-edit-btn');
    if (dropdownEditBtn) dropdownEditBtn.addEventListener('click', openEdit);

    // Modal Helpers
    const openModalHelper = (modal: HTMLElement, card: HTMLElement) => {
        modal.classList.remove('hidden');
        // Force reflow
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
        card.classList.remove('scale-95', 'opacity-0');
        
        // Add escape-to-close listener
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModalHelper(modal, card);
                document.removeEventListener('keydown', onKeyDown);
            }
        };
        document.addEventListener('keydown', onKeyDown);
    };

    const closeModalHelper = (modal: HTMLElement, card: HTMLElement) => {
        modal.classList.add('opacity-0');
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

    // Archive Modal References
    const archiveModal = document.getElementById('archive-modal');
    const archiveModalCard = document.getElementById('archive-modal-card');
    const cancelArchiveBtn = document.getElementById('cancel-archive-btn') as HTMLButtonElement | null;
    const confirmArchiveBtn = document.getElementById('confirm-archive-btn') as HTMLButtonElement | null;
    const archiveBtnText = document.getElementById('archive-btn-text');
    const archiveBtnSpinner = document.getElementById('archive-btn-spinner');

    // Export Trigger
    const dropdownExportBtn = document.getElementById('dropdown-export-btn');
    if (dropdownExportBtn && exportModal && exportModalCard) {
        dropdownExportBtn.addEventListener('click', () => {
            openModalHelper(exportModal, exportModalCard);
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
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

            if (format === 'save-pdf') {
                btn.classList.add('processing-pdf');
                btn.innerHTML = `
                    <div class="flex items-center gap-3 w-full animate-fade-in">
                        <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm shadow-sm shrink-0">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-rose-700 truncate">Generating PDF Report...</p>
                            <p class="text-[10px] text-rose-500 mt-0.5 truncate font-medium">Preparing customer profile, invoices, and ledger</p>
                        </div>
                    </div>
                `;
            } else if (format === 'print') {
                btn.classList.add('processing-pdf');
                btn.innerHTML = `
                    <div class="flex items-center gap-3 w-full animate-fade-in">
                        <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-sm shrink-0">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-blue-700 truncate">Preparing Print Window...</p>
                            <p class="text-[10px] text-blue-500 mt-0.5 truncate font-medium">Formatting summary details for printing</p>
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
                // Fetch full details of the customer to build export payload
                const data = (window as any).currentCustomerDetails;
                if (!data) throw new Error('Details not loaded yet');

                // Perform the export generation
                if (format === 'excel') {
                    // For Excel, we construct a beautiful structured CSV spreadsheet
                    let csvContent = "data:text/csv;charset=utf-8,";
                    csvContent += "CUSTOMER DETAILS\n";
                    csvContent += `ID,${data.customer.customer_id}\n`;
                    csvContent += `Name,${data.customer.customer.first_name} ${data.customer.customer.last_name}\n`;
                    csvContent += `Phone,${data.customer.customer.phone || 'N/A'}\n`;
                    csvContent += `Email,${data.customer.customer.email || 'N/A'}\n`;
                    csvContent += `GSTIN,${data.customer.gstin || 'N/A'}\n\n`;

                    csvContent += "QUOTATIONS\n";
                    csvContent += "Quotation ID,Date,Status,Grand Total\n";
                    (data.quotations || []).forEach((q: any) => {
                        csvContent += `"${q.quotation_id}","${formatDate(q.quotation_date)}","${q.status}","${q.grand_total}"\n`;
                    });

                    csvContent += "\nINVOICES\n";
                    csvContent += "Invoice ID,Date,Status,Total Amount\n";
                    (data.invoices || []).forEach((inv: any) => {
                        csvContent += `"${inv.invoice_id}","${formatDate(inv.invoice_date)}","${inv.status}","${inv.grand_total}"\n`;
                    });

                    csvContent += "\nSERVICES\n";
                    csvContent += "Service ID,Date,Service Name,Remarks\n";
                    (data.services || []).forEach((s: any) => {
                        csvContent += `"${s.service_id}","${formatDate(s.service_date)}","${s.service_name}","${s.remarks || ''}"\n`;
                    });

                    csvContent += "\nPAYMENTS\n";
                    csvContent += "Payment ID,Date,Method,Amount\n";
                    (data.payments || []).forEach((p: any) => {
                        csvContent += `"${p.payment_id}","${formatDate(p.payment_date)}","${p.payment_mode}","${p.amount}"\n`;
                    });

                    csvContent += "\nVOUCHERS\n";
                    csvContent += "Voucher No,Date,Amount,Method,Paid Towards\n";
                    (data.vouchers || []).forEach((v: any) => {
                        csvContent += `"${v.voucherNumber}","${formatDate(v.date)}","${v.amount}","${v.paymentMethod}","${v.paidTowards || ''}"\n`;
                    });

                    const encodedUri = encodeURI(csvContent);
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", encodedUri);
                    downloadAnchor.setAttribute("download", `customer_ledger_${data.customer.customer_id || 'export'}.csv`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                } else if (format === 'save-pdf' || format === 'print') {
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

                        const fullName = `${data.customer.customer.first_name} ${data.customer.customer.last_name || ''}`.trim();
                        
                        // Financial Aggregations
                        const totalQuotes = (data.quotations || []).length;
                        const totalInvoices = (data.invoices || []).length;
                        const totalInvoicedAmt = (data.invoices || []).reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0);
                        const totalPaidAmt = (data.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                        const outstandingAmt = Math.max(0, totalInvoicedAmt - totalPaidAmt);
                        const activeServicesCount = (data.services || []).length;

                        // Build quotations table
                        let quotesRows = '';
                        if ((data.quotations || []).length > 0) {
                            data.quotations.forEach((q: any) => {
                                quotesRows += `
                                    <tr>
                                        <td>${q.quotation_id}</td>
                                        <td>${formatDateLocal(q.quotation_date)}</td>
                                        <td><span style="font-weight:700;">${q.status}</span></td>
                                        <td>₹${(q.grand_total || 0).toLocaleString()}</td>
                                    </tr>`;
                            });
                        } else {
                            quotesRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 15px;">No quotation records found</td></tr>`;
                        }

                        // Build invoices table
                        let invoiceRows = '';
                        if ((data.invoices || []).length > 0) {
                            data.invoices.forEach((inv: any) => {
                                invoiceRows += `
                                    <tr>
                                        <td>${inv.invoice_id}</td>
                                        <td>${formatDateLocal(inv.invoice_date)}</td>
                                        <td><span style="font-weight:700;">${inv.status}</span></td>
                                        <td>₹${(inv.grand_total || 0).toLocaleString()}</td>
                                    </tr>`;
                            });
                        } else {
                            invoiceRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 15px;">No invoice records found</td></tr>`;
                        }

                        // Build services table
                        let serviceRows = '';
                        if ((data.services || []).length > 0) {
                            data.services.forEach((s: any) => {
                                serviceRows += `
                                    <tr>
                                        <td>${s.service_id}</td>
                                        <td>${formatDateLocal(s.service_date)}</td>
                                        <td>${s.service_name}</td>
                                        <td>${s.remarks || '-'}</td>
                                    </tr>`;
                            });
                        } else {
                            serviceRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 15px;">No active services found</td></tr>`;
                        }

                        // Build payments table
                        let paymentRows = '';
                        if ((data.payments || []).length > 0) {
                            data.payments.forEach((p: any) => {
                                paymentRows += `
                                    <tr>
                                        <td>${p.payment_id}</td>
                                        <td>${formatDateLocal(p.payment_date)}</td>
                                        <td>${p.payment_mode}</td>
                                        <td>₹${(p.amount || 0).toLocaleString()}</td>
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
                                        <p style="font-size:9.5pt; color:#64748b; margin:4px 0 0 0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Customer Account Summary Report</p>
                                    </div>
                                    <div style="text-align:right;">
                                        <p style="font-size:8pt; font-weight:700; color:#64748b; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Generated On</p>
                                        <p style="font-size:9.5pt; font-weight:600; color:#0f172a; margin:2px 0 0 0;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            <h2 class="print-section-title" style="margin-top:0;">1. Customer Profile Identity</h2>
                            <div class="print-grid">
                                <div>
                                    <div class="print-meta-label">Customer Name</div>
                                    <div class="print-meta-value">${fullName}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Customer ID</div>
                                    <div class="print-meta-value">${data.customer.customer_id || 'ID Pending'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Customer Type</div>
                                    <div class="print-meta-value">${data.customer.customer_type || 'Individual'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Profile Status</div>
                                    <div class="print-meta-value">${data.customer.is_archived ? 'Archived' : (data.customer.is_active ? 'Active' : 'Inactive')}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Primary Phone</div>
                                    <div class="print-meta-value">${data.customer.customer.phone || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Alternate Phone</div>
                                    <div class="print-meta-value">${data.customer.customer.alternate_phone || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Email Address</div>
                                    <div class="print-meta-value">${data.customer.customer.email || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">GSTIN / TAX ID</div>
                                    <div class="print-meta-value">${data.customer.gstin || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Customer Since</div>
                                    <div class="print-meta-value">${formatDateLocal(data.customer.createdAt)}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">2. Billing & Location Address</h2>
                            <div class="print-grid">
                                <div style="grid-column: span 2;">
                                    <div class="print-meta-label">Billing Address</div>
                                    <div class="print-meta-value">
                                        ${data.customer.billing_address?.line1 || ''}
                                        ${data.customer.billing_address?.line2 ? ', ' + data.customer.billing_address.line2 : ''}
                                    </div>
                                </div>
                                <div>
                                    <div class="print-meta-label">City</div>
                                    <div class="print-meta-value">${data.customer.billing_address?.city || 'N/A'}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">State & Pincode</div>
                                    <div class="print-meta-value">${data.customer.billing_address?.state || 'N/A'} - ${data.customer.billing_address?.pincode || 'N/A'}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">3. Financial Ledger Summary</h2>
                            <div class="print-grid" style="grid-template-columns: repeat(5, minmax(0, 1fr)) !important; text-align: center; background-color:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                                <div>
                                    <div class="print-meta-label">Quotations</div>
                                    <div class="print-meta-value" style="color:#2563eb; font-size:12pt; font-weight:800; margin-top:4px;">${totalQuotes}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Invoices</div>
                                    <div class="print-meta-value" style="color:#4f46e5; font-size:12pt; font-weight:800; margin-top:4px;">${totalInvoices}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Total Invoiced</div>
                                    <div class="print-meta-value" style="color:#0f172a; font-size:12pt; font-weight:800; margin-top:4px;">₹${totalInvoicedAmt.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Total Paid</div>
                                    <div class="print-meta-value" style="color:#16a34a; font-size:12pt; font-weight:800; margin-top:4px;">₹${totalPaidAmt.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div class="print-meta-label">Outstanding</div>
                                    <div class="print-meta-value" style="color:#dc2626; font-size:12pt; font-weight:800; margin-top:4px;">₹${outstandingAmt.toLocaleString()}</div>
                                </div>
                            </div>

                            <h2 class="print-section-title">4. Active Services Registry</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Service ID</th>
                                        <th>Date Initiated</th>
                                        <th>Service Name</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${serviceRows}
                                </tbody>
                            </table>

                            <h2 class="print-section-title" style="page-break-before: always;">5. Quotation History</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Quotation ID</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${quotesRows}
                                </tbody>
                            </table>

                            <h2 class="print-section-title">6. Invoice Records</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Invoice ID</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoiceRows}
                                </tbody>
                            </table>

                            <h2 class="print-section-title">7. Payment Ledger</h2>
                            <table class="print-table">
                                <thead>
                                    <tr>
                                        <th>Payment ID</th>
                                        <th>Date</th>
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

                    const html = printContainer ? printContainer.innerHTML : '';
                    const filename = `CustomerLedger_${data.customer.customer_id || 'export'}`;

                    if (format === 'save-pdf') {
                        if ((window as any).electronAPI?.handlePrintEvent) {
                            (window as any).electronAPI.handlePrintEvent(html, "savePDF", filename);
                        } else {
                            window.print();
                        }
                    } else if (format === 'print') {
                        if ((window as any).electronAPI?.handlePrintEvent) {
                            (window as any).electronAPI.handlePrintEvent(html, "print", filename);
                        } else {
                            window.print();
                        }
                    }
                }

                // Show Success State on the button
                btn.classList.remove('processing-pdf');
                btn.classList.add('success-pdf');
                if (format === 'save-pdf') {
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
                } else if (format === 'print') {
                    btn.innerHTML = `
                        <div class="flex items-center gap-3 w-full animate-fade-in">
                            <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                <i class="fas fa-check"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-extrabold text-emerald-700 truncate">Sent to Printer</p>
                                <p class="text-[10px] text-emerald-500 mt-0.5 truncate font-medium">Printing dialog has been requested</p>
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
                (window as any).showToast('Customer data exported successfully');
                
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

    // Archive Trigger
    const dropdownArchiveBtn = document.getElementById('dropdown-archive-btn');
    if (dropdownArchiveBtn) {
        dropdownArchiveBtn.addEventListener('click', () => {
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');

            const customer = (window as any).currentCustomer;
            if (!customer) return;

            const isCurrentlyArchived = customer.is_archived;
            const fullName = customer.customer.first_name 
                ? `${customer.customer.first_name} ${customer.customer.last_name || ''}`.trim() 
                : (customer.customer.name || '-');

            if (isCurrentlyArchived) {
                showConfirm(`Are you sure you want to restore customer "${fullName}"?`, async (confirmed) => {
                    if (confirmed === 'Yes') {
                        try {
                            await (window as any).customerApi.restoreCustomer(customer._id);
                            (window as any).showToast('Customer restored successfully');
                            fetchFullDetails();
                        } catch (err) {
                            console.error(err);
                            (window as any).showToast('Failed to restore customer', 'error');
                        }
                    }
                });
            } else {
                showConfirm(`Are you sure you want to archive customer "${fullName}"?`, async (confirmed) => {
                    if (confirmed === 'Yes') {
                        try {
                            await (window as any).customerApi.archiveCustomer(customer._id);
                            (window as any).showToast('Customer archived successfully');
                            fetchFullDetails();
                        } catch (err) {
                            console.error(err);
                            (window as any).showToast('Failed to archive customer', 'error');
                        }
                    }
                });
            }
        });
    }

    // Delete Customer Trigger (within dropdown)
    const deleteBtn = document.getElementById('delete-customer-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
            
            const customer = (window as any).currentCustomer;
            if (!customer) return;
            const fullName = customer.customer.first_name 
                ? `${customer.customer.first_name} ${customer.customer.last_name || ''}`.trim() 
                : (customer.customer.name || '-');
            
            showConfirm(`Are you sure you want to delete customer "${fullName}"?`, async (confirmed) => {
                if (confirmed === 'Yes') {
                    try {
                        await customerApi.deleteCustomer(customerId!);
                        showAlert('Customer deleted successfully');
                        setTimeout(() => {
                            window.location.href = '/customer';
                        }, 1000);
                    } catch (error) {
                        showAlert('Failed to delete customer');
                    }
                }
            });
        });
    }

    async function fetchFullDetails() {
        try {
            const data = await customerApi.getCustomerDetails(customerId!);
            (window as any).currentCustomer = data.customer;
            (window as any).currentCustomerDetails = data;
            populateData(data);
        } catch (error) {
            showAlert('Failed to load customer profile');
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

    function populateData(data: any) {
        const { customer, stats, quotations, invoices, services, payments, vouchers, communications } = data;

        // Header info
        const fullName = customer.customer.first_name 
            ? `${customer.customer.first_name} ${customer.customer.last_name || ''}`.trim() 
            : (customer.customer.name || '-');

        // Dynamic Archived alert banner & menu dropdown text logic
        const dropdownArchiveBtnText = document.getElementById('dropdown-archive-btn');
        if (dropdownArchiveBtnText) {
            if (customer.is_archived) {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-box-open"></i> Restore Customer`;
            } else {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-archive"></i> Archive Customer`;
            }
        }

        const bannerContainer = document.getElementById('archived-banner-container');
        if (bannerContainer) {
            bannerContainer.innerHTML = '';
        }

        const nameInitialEl = document.getElementById('name-initials');
        if (nameInitialEl) {
            nameInitialEl.textContent = fullName !== '-' 
                ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                : '?';
        }
        
        const custNameEl = document.getElementById('customer-name');
        if (custNameEl) custNameEl.textContent = fullName;

        const headerCustNameEl = document.getElementById('header-customer-name');
        if (headerCustNameEl) headerCustNameEl.textContent = fullName;

        const custTypeBadge = document.getElementById('customer-type-badge');
        if (custTypeBadge) custTypeBadge.textContent = valOrDash(customer.customer_type);

        const displayCustId = document.getElementById('display-customer-id');
        if (displayCustId) {
            displayCustId.textContent = valOrDash(customer.customer_id);
            if (customer.customer_id) {
                displayCustId.innerHTML = `${customer.customer_id} <i class="fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity"></i>`;
                displayCustId.className = 'cursor-pointer hover:text-blue-600 transition-all duration-150 inline-flex items-center gap-1 hover:underline';
                displayCustId.title = 'Click to copy ID';
                displayCustId.onclick = async () => {
                    await (window as any).copyToClipboard(customer.customer_id);
                    (window as any).showToast('Customer ID copied');
                    
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
        if (displayPhone) displayPhone.textContent = valOrDash(customer.customer.phone);

        const displayEmail = document.getElementById('display-email');
        if (displayEmail) displayEmail.textContent = valOrDash(customer.customer.email);

        const pendingBalanceEl = document.getElementById('pending-balance');
        if (pendingBalanceEl) pendingBalanceEl.textContent = formatCurrency(stats.pendingBalance);

        // Stats
        const statQuotes = document.getElementById('stat-quotations');
        if (statQuotes) statQuotes.textContent = (stats.totalQuotations || 0).toString();

        const statInvoices = document.getElementById('stat-invoices');
        if (statInvoices) statInvoices.textContent = (stats.totalInvoices || 0).toString();

        const statServices = document.getElementById('stat-services');
        if (statServices) statServices.textContent = (stats.totalServices || 0).toString();

        const statOutstanding = document.getElementById('stat-outstanding');
        if (statOutstanding) statOutstanding.textContent = formatCurrency(stats.pendingBalance);

        // Overview Tab - Contact Details
        const infoCustId = document.getElementById('info-customer-id');
        if (infoCustId) {
            infoCustId.textContent = valOrDash(customer.customer_id);
            if (customer.customer_id) {
                infoCustId.innerHTML = `${customer.customer_id} <i class="fas fa-copy text-[10px] ml-1 opacity-50 hover:opacity-100 transition-opacity"></i>`;
                infoCustId.className = 'cursor-pointer hover:text-blue-600 transition-all duration-150 inline-flex items-center gap-1 hover:underline';
                infoCustId.title = 'Click to copy ID';
                infoCustId.onclick = async () => {
                    await (window as any).copyToClipboard(customer.customer_id);
                    (window as any).showToast('Customer ID copied');
                    
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

        const infoFirstName = document.getElementById('info-first-name');
        if (infoFirstName) infoFirstName.textContent = valOrDash(customer.customer.first_name);

        const infoLastName = document.getElementById('info-last-name');
        if (infoLastName) infoLastName.textContent = valOrDash(customer.customer.last_name);

        const infoPhone = document.getElementById('info-phone');
        if (infoPhone) infoPhone.textContent = valOrDash(customer.customer.phone);

        const infoAltPhone = document.getElementById('info-alt-phone');
        if (infoAltPhone) infoAltPhone.textContent = valOrDash(customer.customer.alternate_phone);

        const infoEmail = document.getElementById('info-email');
        if (infoEmail) infoEmail.textContent = valOrDash(customer.customer.email);

        const infoGstin = document.getElementById('info-gstin');
        if (infoGstin) infoGstin.textContent = valOrDash(customer.gstin);

        const infoCreated = document.getElementById('info-created');
        if (infoCreated) infoCreated.textContent = customer.createdAt ? formatDate(customer.createdAt) : '-';

        const infoStatus = document.getElementById('info-status');
        if (infoStatus) {
            infoStatus.textContent = customer.is_active ? 'Active' : 'Inactive';
            infoStatus.className = customer.is_active ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
        }

        // Overview Tab - Address Info
        const addrLine1 = document.getElementById('info-address-line1');
        if (addrLine1) addrLine1.textContent = valOrDash(customer.billing_address?.line1);

        const addrLine2 = document.getElementById('info-address-line2');
        if (addrLine2) addrLine2.textContent = valOrDash(customer.billing_address?.line2);

        const addrCityState = document.getElementById('info-address-city-state');
        if (addrCityState) {
            const city = customer.billing_address?.city || '';
            const state = customer.billing_address?.state || '';
            addrCityState.textContent = (city || state) ? `${city}, ${state}` : '-';
        }

        const addrPincode = document.getElementById('info-address-pincode');
        if (addrPincode) addrPincode.textContent = valOrDash(customer.billing_address?.pincode);

        const addrCountry = document.getElementById('info-address-country');
        if (addrCountry) addrCountry.textContent = valOrDash(customer.billing_address?.country || 'India');

        const remarksEl = document.getElementById('info-remarks');
        if (remarksEl) remarksEl.textContent = customer.remarks || 'No notes available for this customer.';

        // Populate Tables
        renderTable('quotations-list', quotations, (q: any) => `
            <td class="px-6 py-4 font-medium text-blue-600">${q.quotation_no || q.quotation_id || '-'}</td>
            <td class="px-6 py-4">${formatDate(q.quotation_date)}</td>
            <td class="px-6 py-4 font-bold">${formatCurrency(getQuotationAmount(q))}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs uppercase font-bold">${q.quotation_status || q.status || '-'}</span></td>
            <td class="px-6 py-4">
                <button data-action="view-quotation" data-id="${q.quotation_no || q.quotation_id || ''}" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors uppercase tracking-wider">View</button>
            </td>
        `);

        renderTable('invoices-list', invoices, (i: any) => `
            <td class="px-6 py-4 font-medium text-blue-600">${i.invoice_id || i.invoice_no || '-'}</td>
            <td class="px-6 py-4">${formatDate(i.invoice_date)}</td>
            <td class="px-6 py-4 font-bold">${formatCurrency(getInvoiceAmount(i))}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 ${getInvoiceStatusClasses(i)} rounded text-xs uppercase font-bold">${getInvoiceDisplayStatus(i)}</span></td>
            <td class="px-6 py-4">
                <button data-action="view-invoice" data-id="${i.invoice_id || i.invoice_no || ''}" class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors uppercase tracking-wider">View</button>
            </td>
        `);

        renderTable('services-list', services, (s: any) => `
            <td class="px-6 py-4 font-medium text-blue-600">${s.service_no || s.service_id || '-'}</td>
            <td class="px-6 py-4">${formatDate(s.service_date)}</td>
            <td class="px-6 py-4 text-gray-500">Stage ${s.service_stage || 0}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs uppercase font-bold">${s.service_status || '-'}</span></td>
            <td class="px-6 py-4">
                <button data-action="view-service" data-id="${s.service_no || s.service_id || ''}" class="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-purple-100 transition-colors uppercase tracking-wider">View</button>
            </td>
        `);

        renderTable('payments-list', payments, (p: any) => {
            const refType = p.reference_type || p.reference?.type || '';
            const refId = p.reference_id || p.reference?.id || '';
            let refDisplay = '-';
            if (refType) {
                refDisplay = refId ? `${refType}: ${refId}` : refType;
            } else if (p.transaction_details) {
                refDisplay = p.transaction_details;
            }
            return `
                <td class="px-6 py-4">${formatDate(p.payment_date)}</td>
                <td class="px-6 py-4 font-bold text-green-600">${formatCurrency(p.amount)}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase">${p.mode || p.payment_mode || '-'}</span></td>
                <td class="px-6 py-4 text-gray-500">${valOrDash(refDisplay)}</td>
                <td class="px-6 py-4">
                    <button data-action="view-payment" data-id="${p.payment_id || p._id || p.id || ''}" class="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors uppercase tracking-wider">Details</button>
                </td>
            `;
        });

        renderTable('vouchers-list', vouchers || [], (v: any) => `
            <td class="px-6 py-4 font-medium text-violet-600">${v.voucherNumber || '-'}</td>
            <td class="px-6 py-4">${formatDate(v.date)}</td>
            <td class="px-6 py-4 font-bold text-green-600">${formatCurrency(v.amount)}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-violet-50 text-violet-700 rounded text-xs font-bold uppercase">${v.paymentMethod || '-'}</span></td>
            <td class="px-6 py-4 text-gray-500 truncate max-w-[160px]" title="${v.paidTowards || ''}}">${v.paidTowards || '-'}</td>
            <td class="px-6 py-4">
                <button data-action="view-voucher" data-id="${v._id || ''}" class="bg-violet-50 text-violet-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-violet-100 transition-colors uppercase tracking-wider">View</button>
            </td>
        `);

        renderTable('communications-list', communications || [], (c: any) => {
            const dateStr = c.sentAt ? formatDate(c.sentAt) + ' ' + new Date(c.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
            
            let statusClass = 'bg-slate-50 text-slate-700';
            if (c.status === 'Read') statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
            else if (c.status === 'Delivered') statusClass = 'bg-blue-50 text-blue-700 border border-blue-100';
            else if (c.status === 'Sent' || c.status === 'Success') statusClass = 'bg-green-50 text-green-700 border border-green-100';
            else if (c.status === 'Pending') statusClass = 'bg-amber-50 text-amber-700 border border-amber-100';
            else if (c.status === 'Failed') statusClass = 'bg-red-50 text-red-700 border border-red-100';

            const contentDisplay = c.status === 'Failed' && c.errorMessage ? `${c.content || ''} (Error: ${c.errorMessage})` : (c.content || '');
            const pdfButton = c.documentUrl 
                ? `<button data-action="view-doc" data-url="${c.documentUrl}" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors uppercase tracking-wider">View PDF</button>` 
                : '-';

            return `
                <td class="px-6 py-4 text-xs text-gray-500">${dateStr}</td>
                <td class="px-6 py-4 text-xs font-semibold text-slate-800">${c.recipient || '-'}</td>
                <td class="px-6 py-4 text-xs"><span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">${c.messageType || '-'}</span></td>
                <td class="px-6 py-4 text-xs font-medium text-slate-600">${c.referenceId || '-'}</td>
                <td class="px-6 py-4 text-xs"><span class="px-2 py-1 ${statusClass} rounded text-[10px] font-bold uppercase">${c.status || '-'}</span></td>
                <td class="px-6 py-4 text-xs text-gray-500 truncate max-w-[200px]" title="${contentDisplay.replace(/"/g, '&quot;')}">${contentDisplay}</td>
                <td class="px-6 py-4 text-xs">${pdfButton}</td>
            `;
        }, 7);
    }

    function renderTable(id: string, items: any[], rowTemplate: (item: any) => string, colspan = 5) {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        
        if (!items || items.length === 0) {
            const type = id.split('-')[0].charAt(0).toUpperCase() + id.split('-')[0].slice(1);
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center text-gray-400">
                            <i class="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
                            <p class="text-lg font-medium italic">No ${type} found for this customer</p>
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

            if (action === 'view-quotation') window.location.href = `/quotation?id=${id}`;
            if (action === 'view-invoice') window.location.href = `/invoice?id=${id}`;
            if (action === 'view-service') window.location.href = `/service?id=${id}`;
            if (action === 'view-payment') window.location.href = `/payment/details?id=${id}`;
            if (action === 'view-voucher') window.location.href = `/payment?voucher=${id}`;
            if (action === 'view-doc') {
                const url = btn.getAttribute('data-url');
                if (url) window.open(url, '_blank');
            }
        };
    }

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
