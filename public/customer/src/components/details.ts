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
            btn.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm shadow-sm"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>
                    <div>
                        <p class="text-xs font-bold text-slate-800">Generating report...</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">Assembling ledger and invoices</p>
                    </div>
                </div>
            `;
            exportOptBtns.forEach(b => (b as HTMLButtonElement).disabled = true);

            try {
                // Fetch full details of the customer to build export payload
                const data = (window as any).currentCustomerDetails;
                if (!data) throw new Error('Details not loaded yet');

                // Perform the export generation
                if (format === 'json') {
                    // Export JSON file
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 4));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href",     dataStr);
                    downloadAnchor.setAttribute("download", `customer_export_${data.customer.customer_id || 'export'}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                } else if (format === 'excel') {
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

                    const encodedUri = encodeURI(csvContent);
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", encodedUri);
                    downloadAnchor.setAttribute("download", `customer_ledger_${data.customer.customer_id || 'export'}.csv`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                } else if (format === 'pdf') {
                    // For PDF, trigger print
                    window.print();
                }

                // Show success toast
                (window as any).showToast('Customer data exported successfully');
                if (exportModal && exportModalCard) {
                    closeModalHelper(exportModal, exportModalCard);
                }
            } catch (err) {
                console.error(err);
                (window as any).showToast('Failed to export data', 'error');
            } finally {
                // Restore button state
                btn.innerHTML = originalHtml;
                exportOptBtns.forEach(b => (b as HTMLButtonElement).disabled = false);
            }
        });
    });

    // Archive Trigger
    const dropdownArchiveBtn = document.getElementById('dropdown-archive-btn');
    if (dropdownArchiveBtn && archiveModal && archiveModalCard) {
        dropdownArchiveBtn.addEventListener('click', () => {
            const customer = (window as any).currentCustomer;
            if (customer) {
                const isCurrentlyArchived = customer.is_archived;
                const titleEl = archiveModal.querySelector('h3');
                const descEl = archiveModal.querySelector('p.text-xs');
                
                if (titleEl && descEl && archiveBtnText) {
                    if (isCurrentlyArchived) {
                        titleEl.textContent = 'Restore Customer?';
                        descEl.textContent = 'This customer will be restored to active records and all operations can be resumed.';
                        archiveBtnText.textContent = 'Restore Customer';
                    } else {
                        titleEl.textContent = 'Archive Customer?';
                        descEl.textContent = 'This customer will be hidden from active records but can be restored later. Preserves full transaction history.';
                        archiveBtnText.textContent = 'Archive Customer';
                    }
                }
                
                openModalHelper(archiveModal, archiveModalCard);
            }
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
        });
    }

    if (cancelArchiveBtn && archiveModal && archiveModalCard) {
        cancelArchiveBtn.addEventListener('click', () => closeModalHelper(archiveModal, archiveModalCard));
    }

    if (confirmArchiveBtn && archiveModal && archiveModalCard && archiveBtnText && archiveBtnSpinner) {
        confirmArchiveBtn.addEventListener('click', async () => {
            const customer = (window as any).currentCustomer;
            if (!customer) return;

            // Show loading state
            confirmArchiveBtn.disabled = true;
            cancelArchiveBtn?.classList.add('opacity-50');
            (cancelArchiveBtn as HTMLButtonElement).disabled = true;
            archiveBtnSpinner.classList.remove('hidden');

            try {
                const isCurrentlyArchived = customer.is_archived;
                if (isCurrentlyArchived) {
                    await (window as any).customerApi.restoreCustomer(customer._id);
                    (window as any).showToast('Customer restored successfully');
                } else {
                    await (window as any).customerApi.archiveCustomer(customer._id);
                    (window as any).showToast('Customer archived successfully');
                }
                
                closeModalHelper(archiveModal, archiveModalCard);
                fetchFullDetails();
            } catch (err) {
                console.error(err);
                (window as any).showToast(customer.is_archived ? 'Failed to restore customer' : 'Failed to archive customer', 'error');
            } finally {
                // Restore loading state
                confirmArchiveBtn.disabled = false;
                cancelArchiveBtn?.classList.remove('opacity-50');
                (cancelArchiveBtn as HTMLButtonElement).disabled = false;
                archiveBtnSpinner.classList.add('hidden');
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
        const { customer, stats, quotations, invoices, services, payments } = data;

        // Header info
        const fullName = customer.customer.first_name 
            ? `${customer.customer.first_name} ${customer.customer.last_name || ''}`.trim() 
            : (customer.customer.name || '-');

        // Dynamic Archived alert banner & menu dropdown text logic
        const dropdownArchiveBtnText = document.getElementById('dropdown-archive-btn');
        if (dropdownArchiveBtnText) {
            if (customer.is_archived) {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-box-open text-slate-400 w-4"></i> Restore Customer`;
            } else {
                dropdownArchiveBtnText.innerHTML = `<i class="fas fa-archive text-slate-400 w-4"></i> Archive Customer`;
            }
        }

        const bannerContainer = document.getElementById('archived-banner-container');
        if (bannerContainer) {
            if (customer.is_archived) {
                bannerContainer.innerHTML = `
                    <div class="bg-amber-50 border border-amber-200/80 text-amber-800 text-xs px-5 py-3.5 rounded-2xl flex items-center justify-between mb-6 shadow-sm">
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                <i class="fas fa-archive"></i>
                            </div>
                            <div>
                                <span class="font-bold">This customer is archived.</span>
                                <span class="text-amber-700/90 ml-1">Active operations are suspended, but historical records remain preserved.</span>
                            </div>
                        </div>
                        <button id="restore-banner-btn" class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl transition-all duration-150 active:scale-95 uppercase tracking-wider text-[10px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                            Restore Customer
                        </button>
                    </div>
                `;

                // Bind banner restore button
                const restoreBannerBtn = document.getElementById('restore-banner-btn');
                if (restoreBannerBtn) {
                    restoreBannerBtn.addEventListener('click', async () => {
                        try {
                            await (window as any).customerApi.restoreCustomer(customer._id);
                            (window as any).showToast('Customer restored successfully');
                            fetchFullDetails();
                        } catch (err) {
                            console.error(err);
                            (window as any).showToast('Failed to restore customer', 'error');
                        }
                    });
                }
            } else {
                bannerContainer.innerHTML = '';
            }
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

        const statPaid = document.getElementById('stat-paid');
        if (statPaid) statPaid.textContent = formatCurrency(stats.totalPaidAmount);

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

        renderTable('payments-list', payments, (p: any) => `
            <td class="px-6 py-4">${formatDate(p.payment_date)}</td>
            <td class="px-6 py-4 text-gray-500">${valOrDash(p.transaction_details)}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase">${p.mode}</span></td>
            <td class="px-6 py-4 font-bold text-green-600">${formatCurrency(p.amount)}</td>
            <td class="px-6 py-4">
                <button class="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors uppercase tracking-wider">Details</button>
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
