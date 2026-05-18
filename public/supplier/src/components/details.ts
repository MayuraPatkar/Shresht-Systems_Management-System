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

    const editBtn = document.getElementById('edit-supplier-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if ((window as any).supplierForms && (window as any).currentSupplier) {
                (window as any).supplierForms.openEditModal((window as any).currentSupplier);
            }
        });
    }

    async function fetchFullDetails() {
        try {
            const data = await supplierApi.getSupplierDetails(supplierId!);
            (window as any).currentSupplier = data.supplier;
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

    function populateData(data: any) {
        const { supplier, stats, purchases, payments } = data;

        // Header info
        const fullName = valOrDash(supplier.supplier_name);

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
                displayCustId.classList.add('cursor-pointer', 'hover:underline');
                displayCustId.title = 'Click to copy ID';
                displayCustId.onclick = () => {
                    (window as any).copyToClipboard(supplier.supplier_id);
                    (window as any).showToast('Supplier ID copied');
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
                infoCustId.classList.add('cursor-pointer', 'hover:underline');
                infoCustId.title = 'Click to copy ID';
                infoCustId.onclick = () => {
                    (window as any).copyToClipboard(supplier.supplier_id);
                    (window as any).showToast('Supplier ID copied');
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
            <td class="px-6 py-4"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs uppercase font-bold">${p.purchase_status || '-'}</span></td>
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
        };
    }

    (window as any).fetchFullDetails = fetchFullDetails;
    fetchFullDetails();
});

