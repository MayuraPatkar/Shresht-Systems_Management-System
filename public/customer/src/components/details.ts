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

    // Export & Archive Placeholders
    const dropdownExportBtn = document.getElementById('dropdown-export-btn');
    if (dropdownExportBtn) {
        dropdownExportBtn.addEventListener('click', () => {
            (window as any).showToast('Export feature coming soon!');
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
        });
    }

    const dropdownArchiveBtn = document.getElementById('dropdown-archive-btn');
    if (dropdownArchiveBtn) {
        dropdownArchiveBtn.addEventListener('click', () => {
            (window as any).showToast('Archive feature coming soon!');
            kebabDropdown?.classList.add('hidden');
            kebabDropdown?.classList.remove('animate-dropdown');
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
                displayCustId.classList.add('cursor-pointer', 'hover:underline');
                displayCustId.title = 'Click to copy ID';
                displayCustId.onclick = () => {
                    (window as any).copyToClipboard(customer.customer_id);
                    (window as any).showToast('Customer ID copied');
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
                infoCustId.classList.add('cursor-pointer', 'hover:underline');
                infoCustId.title = 'Click to copy ID';
                infoCustId.onclick = () => {
                    (window as any).copyToClipboard(customer.customer_id);
                    (window as any).showToast('Customer ID copied');
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
