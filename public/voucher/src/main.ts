let activeVouchers: any[] = [];
let companyInfo: any = null;
let currentViewingVoucher: any = null;

// Autocomplete Cache
let customersCache: any[] = [];
let suppliersCache: any[] = [];
let cachedPartiesType: string = '';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        companyInfo = await (window as any).companyConfig.getCompanyInfo();
    } catch (e) {
        console.error('Failed to pre-fetch company config', e);
    }
    
    const page = document.body.dataset.voucherPage || 'list';
    setupEventListeners();
    setupKeyboardShortcuts();

    if (page === 'list') {
        refreshVouchersList();
    } else if (page === 'form') {
        await openVoucherModalForCreate();
    } else if (page === 'details') {
        await initializeVoucherDetailsPage();
    }
});

function initializeVoucherPage() {
    setupEventListeners();
    setupKeyboardShortcuts();
    refreshVouchersList();
}

async function initializeVoucherDetailsPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        (window as any).showAlert('Voucher ID is missing.');
        (window as any).navigateTo('/voucher');
        return;
    }

    try {
        const voucher = await (window as any).VoucherAPI.fetchVoucherById(id);
        activeVouchers = [voucher];
        currentViewingVoucher = voucher;
        renderVoucherDetailsPage(voucher);
        updateDocPreview(voucher);
        ['v-btn-print', 'v-btn-pdf', 'v-btn-whatsapp'].forEach(buttonId => {
            const button = document.getElementById(buttonId) as HTMLButtonElement | null;
            if (button) button.disabled = false;
        });
    } catch (error: any) {
        console.error('Error loading voucher details:', error);
        (window as any).showAlert(error.message || 'Unable to load voucher details.');
        (window as any).navigateTo('/voucher');
    }
}

function renderVoucherDetailsPage(voucher: any) {
    const setText = (id: string, value: any) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '-';
    };
    const date = voucher.date
        ? (window as any).companyConfig.formatDate(voucher.date)
        : '-';
    const amount = `₹ ${Number(voucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    let reference = '-';
    if (voucher.paymentMethod === 'Cheque') reference = `${voucher.chequeNumber || '-'} · ${voucher.bankName || '-'}`;
    if (voucher.paymentMethod === 'Bank Transfer') reference = `${voucher.bankName || '-'} · ${voucher.referenceNumber || '-'}`;
    if (voucher.paymentMethod === 'UPI') reference = voucher.referenceNumber || '-';

    setText('voucher-details-title', `Voucher Details - ${voucher.voucherNumber}`);
    setText('details-amount', amount);
    setText('header-voucher-no', voucher.voucherNumber);
    setText('header-method', voucher.paymentMethod);
    setText('header-date', date);
    setText('header-party-type', voucher.partyType);
    setText('details-party-name', voucher.partyName);
    setText('details-party-type', voucher.partyType);
    setText('details-method', voucher.paymentMethod);
    setText('details-reference', reference);
    setText('details-date', date);
    setText('details-purpose', voucher.paidTowards);
    setText('details-words', voucher.amountInWords);
}

/**
 * Fetch and Render Vouchers
 */
async function refreshVouchersList() {
    const tbody = document.getElementById('voucher-tbody') as HTMLTableSectionElement;
    const mobileContainer = document.getElementById('voucher-cards-mobile') as HTMLDivElement;
    
    const loadingHtml = `
        <tr>
            <td colspan="8" class="w-full px-4 py-12 flex flex-col items-center justify-center text-slate-400">
                <i class="fas fa-spinner fa-spin text-3xl mb-2 text-blue-600"></i>
                <p>Loading vouchers...</p>
            </td>
        </tr>
    `;
    if (tbody) tbody.innerHTML = loadingHtml;
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                <i class="fas fa-spinner fa-spin text-3xl mb-2 text-blue-600"></i>
                <p>Loading vouchers...</p>
            </div>
        `;
    }

    try {
        const filters = getActiveFilters();
        const vouchers = await (window as any).VoucherAPI.fetchVouchersList(filters);
        activeVouchers = vouchers;
        
        renderVouchersList(vouchers);
        updateFilterChips();
    } catch (error: any) {
        console.error('Error refreshing vouchers:', error);
        const errorHtml = `
            <tr>
                <td colspan="8" class="w-full px-4 py-12 flex flex-col items-center justify-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p>${error.message || 'Error loading vouchers'}</p>
                </td>
            </tr>
        `;
        if (tbody) tbody.innerHTML = errorHtml;
        if (mobileContainer) {
            mobileContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p>${error.message || 'Error loading vouchers'}</p>
                </div>
            `;
        }
    }
}

function getActiveFilters(): any {
    const searchVal = (document.getElementById('search-input') as HTMLInputElement)?.value.trim();
    const dateFilterType = (document.getElementById('date-filter') as HTMLInputElement)?.value;
    const partyTypeFilter = (document.getElementById('party-type-filter') as HTMLInputElement)?.value;
    const modeFilter = (document.getElementById('mode-filter') as HTMLInputElement)?.value;
    const amountMin = (document.getElementById('amount-min-filter') as HTMLInputElement)?.value;
    const amountMax = (document.getElementById('amount-max-filter') as HTMLInputElement)?.value;
    
    const filters: any = {};
    
    if (searchVal) {
        if (searchVal.startsWith('PV-')) {
            filters.voucherNumber = searchVal;
        } else {
            filters.partyName = searchVal;
        }
    }
    
    if (partyTypeFilter) {
        filters.partyType = partyTypeFilter;
    }
    
    if (modeFilter) {
        filters.paymentMethod = modeFilter;
    }
    
    if (amountMin) filters.amountMin = amountMin;
    if (amountMax) filters.amountMax = amountMax;
    
    const today = new Date();
    if (dateFilterType === 'today') {
        filters.startDate = formatDateString(today);
        filters.endDate = formatDateString(today);
    } else if (dateFilterType === 'week') {
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        filters.startDate = formatDateString(startOfWeek);
        filters.endDate = formatDateString(new Date());
    } else if (dateFilterType === 'month') {
        filters.startDate = formatDateString(new Date(today.getFullYear(), today.getMonth(), 1));
        filters.endDate = formatDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    } else if (dateFilterType === 'quarter') {
        const quarter = Math.floor(today.getMonth() / 3);
        filters.startDate = formatDateString(new Date(today.getFullYear(), quarter * 3, 1));
        filters.endDate = formatDateString(new Date(today.getFullYear(), (quarter + 1) * 3, 0));
    } else if (dateFilterType === 'year') {
        filters.startDate = formatDateString(new Date(today.getFullYear(), 0, 1));
        filters.endDate = formatDateString(new Date(today.getFullYear(), 11, 31));
    } else if (dateFilterType === 'custom') {
        const start = (document.getElementById('start-date-filter') as HTMLInputElement)?.value;
        const end = (document.getElementById('end-date-filter') as HTMLInputElement)?.value;
        if (start) filters.startDate = start;
        if (end) filters.endDate = end;
    }
    
    return filters;
}

function formatDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderVouchersList(vouchers: any[]) {
    const tbody = document.getElementById('voucher-tbody') as HTMLTableSectionElement;
    const mobileContainer = document.getElementById('voucher-cards-mobile') as HTMLDivElement;
    
    if (!tbody || !mobileContainer) return;
    
    if (vouchers.length === 0) {
        const emptyHtml = `
            <tr>
                <td colspan="8" class="w-full px-4 py-16 flex flex-col items-center justify-center text-slate-400 bg-white">
                    <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <i class="fas fa-file-invoice text-2xl text-slate-300"></i>
                    </div>
                    <p class="font-semibold text-slate-700">No vouchers found</p>
                    <p class="text-xs text-slate-400 mt-0.5">Try altering filters or add a new voucher.</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyHtml;
        mobileContainer.innerHTML = `
            <div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <i class="fas fa-file-invoice-dollar text-3xl mb-2 text-slate-300"></i>
                <p class="font-semibold">No vouchers found</p>
            </div>
        `;
        return;
    }

    let tableRows = '';
    let mobileCards = '';

    vouchers.forEach((v) => {
        const dateStr = (window as any).companyConfig.formatDate(v.date);
        const amountStr = Number(v.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let badgeClass = 'badge-cash';
        if (v.paymentMethod === 'UPI') badgeClass = 'badge-upi';
        else if (v.paymentMethod === 'Bank Transfer') badgeClass = 'badge-bank';
        else if (v.paymentMethod === 'Cheque') badgeClass = 'badge-cheque';
        
        tableRows += `
            <tr class="voucher-row border-b border-slate-100 hover:bg-slate-50/50 text-slate-700" data-id="${v._id}">
                <td class="px-4 py-3.5 font-medium">${dateStr}</td>
                <td class="px-4 py-3.5 font-semibold text-blue-600 hover:underline">${v.voucherNumber}</td>
                <td class="px-4 py-3.5"><span class="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">${v.partyType}</span></td>
                <td class="px-4 py-3.5 font-semibold text-slate-900">${v.partyName}</td>
                <td class="px-4 py-3.5"><span class="px-2 py-0.5 text-xs font-bold rounded-full ${badgeClass}">${v.paymentMethod}</span></td>
                <td class="px-4 py-3.5 font-bold text-slate-900">₹ ${amountStr}</td>
                <td class="px-4 py-3.5 text-slate-500 truncate max-w-[150px]" title="${v.paidTowards || ''}">${v.paidTowards || '-'}</td>
                <td class="px-4 py-3.5 text-right flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
                    <button class="view-voucher-btn p-1.5 hover:bg-blue-50 text-blue-600 rounded" data-id="${v._id}" title="View Details"><i class="fas fa-eye"></i></button>
                    <button class="delete-voucher-btn p-1.5 hover:bg-red-50 text-red-600 rounded" data-id="${v._id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;

        mobileCards += `
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 flex flex-col gap-3" data-id="${v._id}">
                <div class="flex items-center justify-between border-b pb-2">
                    <div>
                        <span class="text-xs text-slate-400 block">${dateStr}</span>
                        <span class="font-bold text-blue-600 text-sm">${v.voucherNumber}</span>
                    </div>
                    <span class="px-2.5 py-0.5 text-xs font-bold rounded-full ${badgeClass}">${v.paymentMethod}</span>
                </div>
                <div class="space-y-1">
                    <div class="text-xs text-slate-400 flex justify-between"><span>Payee Name:</span> <strong class="text-slate-800 font-semibold">${v.partyName} (${v.partyType})</strong></div>
                    <div class="text-xs text-slate-400 flex justify-between"><span>Amount:</span> <strong class="text-slate-900 font-extrabold text-sm">₹ ${amountStr}</strong></div>
                    <div class="text-xs text-slate-400 flex justify-between"><span>Purpose:</span> <span class="text-slate-600 truncate max-w-[180px]">${v.paidTowards || '-'}</span></div>
                </div>
                <div class="flex items-center justify-end gap-2 pt-2 border-t mt-1">
                    <button class="view-voucher-btn px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold flex items-center gap-1" data-id="${v._id}"><i class="fas fa-eye"></i> View</button>
                    <button class="delete-voucher-btn px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1" data-id="${v._id}"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = tableRows;
    mobileContainer.innerHTML = mobileCards;

    tbody.querySelectorAll('.voucher-row').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.getAttribute('data-id') || '';
            (window as any).navigateTo(`/voucher/details?id=${encodeURIComponent(id)}`);
        });
    });

    tbody.querySelectorAll('.view-voucher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            (window as any).navigateTo(`/voucher/details?id=${encodeURIComponent(id)}`);
        });
    });

    tbody.querySelectorAll('.delete-voucher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            handleDeleteVoucher(id);
        });
    });

    mobileContainer.querySelectorAll('.view-voucher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id') || '';
            (window as any).navigateTo(`/voucher/details?id=${encodeURIComponent(id)}`);
        });
    });

    mobileContainer.querySelectorAll('.delete-voucher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id') || '';
            handleDeleteVoucher(id);
        });
    });
}

function updateFilterChips() {
    const container = document.getElementById('filter-chips-container') as HTMLDivElement;
    const chipsList = document.getElementById('chips-list') as HTMLDivElement;
    if (!container || !chipsList) return;

    const headerHTML = `
        <span class="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <i class="fas fa-filter text-[10px]"></i> Active Filters:
        </span>
    `;
    chipsList.innerHTML = headerHTML;

    let hasChips = false;

    const addChip = (label: string, clearCallback: () => void) => {
        hasChips = true;
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold border border-blue-200 px-2 py-0.5 rounded-full';
        chip.innerHTML = `${label} <i class="fas fa-times-circle cursor-pointer text-blue-400 hover:text-blue-600 transition"></i>`;
        chip.querySelector('i')?.addEventListener('click', clearCallback);
        chipsList.appendChild(chip);
    };

    const searchVal = (document.getElementById('search-input') as HTMLInputElement)?.value.trim();
    if (searchVal) {
        addChip(`Search: "${searchVal}"`, () => {
            (document.getElementById('search-input') as HTMLInputElement).value = '';
            refreshVouchersList();
        });
    }

    const partyType = (document.getElementById('party-type-filter') as HTMLInputElement)?.value;
    if (partyType) {
        addChip(`Payee: ${partyType}`, () => {
            (document.getElementById('party-type-filter') as HTMLInputElement).value = '';
            document.querySelectorAll('#party-type-filters button').forEach(btn => btn.classList.remove('active'));
            document.querySelector('#party-type-filters button[data-party-type=""]')?.classList.add('active');
            refreshVouchersList();
        });
    }

    const mode = (document.getElementById('mode-filter') as HTMLInputElement)?.value;
    if (mode) {
        addChip(`Method: ${mode}`, () => {
            (document.getElementById('mode-filter') as HTMLInputElement).value = '';
            refreshVouchersList();
        });
    }

    const dateFilterType = (document.getElementById('date-filter') as HTMLInputElement)?.value;
    if (dateFilterType && dateFilterType !== 'all') {
        addChip(`Date: ${dateFilterType}`, () => {
            (document.getElementById('date-filter') as HTMLInputElement).value = 'all';
            refreshVouchersList();
        });
    }

    const minVal = (document.getElementById('amount-min-filter') as HTMLInputElement)?.value;
    const maxVal = (document.getElementById('amount-max-filter') as HTMLInputElement)?.value;
    if (minVal || maxVal) {
        addChip(`Amount: ₹${minVal || 0} - ₹${maxVal || 'Max'}`, () => {
            (document.getElementById('amount-min-filter') as HTMLInputElement).value = '';
            (document.getElementById('amount-max-filter') as HTMLInputElement).value = '';
            refreshVouchersList();
        });
    }

    if (hasChips) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

/**
 * Open Modal for View Mode
 */
async function openVoucherModalForView(id: string) {
    const modal = document.getElementById('voucher-modal') as HTMLDivElement;
    const modalTitle = document.getElementById('voucher-modal-title') as HTMLHeadingElement;
    const form = document.getElementById('voucher-form') as HTMLFormElement;
    const submitBtn = document.getElementById('v-form-submit-btn') as HTMLButtonElement;

    if (!modal || !form) return;

    const voucher = activeVouchers.find(v => v._id === id);
    if (!voucher) return;

    currentViewingVoucher = voucher;

    if (modalTitle) modalTitle.textContent = `Voucher Details - ${voucher.voucherNumber}`;
    if (submitBtn) submitBtn.classList.add('hidden');

    const printBtn = document.getElementById('v-btn-print') as HTMLButtonElement;
    const pdfBtn = document.getElementById('v-btn-pdf') as HTMLButtonElement;
    const waBtn = document.getElementById('v-btn-whatsapp') as HTMLButtonElement;
    if (printBtn) printBtn.disabled = false;
    if (pdfBtn) pdfBtn.disabled = false;
    if (waBtn) waBtn.disabled = false;

    (document.getElementById('v-form-date') as HTMLInputElement).value = new Date(voucher.date).toISOString().split('T')[0];
    (document.getElementById('v-form-date') as HTMLInputElement).readOnly = true;

    (document.getElementById('v-form-no') as HTMLInputElement).value = voucher.voucherNumber;

    (document.getElementById('v-form-party-type') as HTMLSelectElement).value = voucher.partyType;
    (document.getElementById('v-form-party-type') as HTMLSelectElement).disabled = true;

    (document.getElementById('v-form-party-name') as HTMLInputElement).value = voucher.partyName;
    (document.getElementById('v-form-party-name') as HTMLInputElement).readOnly = true;

    (document.getElementById('v-form-amount') as HTMLInputElement).value = voucher.amount;
    (document.getElementById('v-form-amount') as HTMLInputElement).readOnly = true;

    (document.getElementById('v-form-words') as HTMLInputElement).value = voucher.amountInWords || '';

    (document.getElementById('v-form-method') as HTMLSelectElement).value = voucher.paymentMethod;
    (document.getElementById('v-form-method') as HTMLSelectElement).disabled = true;

    toggleConditionalFields(voucher.paymentMethod);
    if (voucher.paymentMethod === 'Cheque') {
        (document.getElementById('v-form-cheque-no') as HTMLInputElement).value = voucher.chequeNumber || '';
        (document.getElementById('v-form-cheque-no') as HTMLInputElement).readOnly = true;
        (document.getElementById('v-form-cheque-bank') as HTMLInputElement).value = voucher.bankName || '';
        (document.getElementById('v-form-cheque-bank') as HTMLInputElement).readOnly = true;
        (document.getElementById('v-form-cheque-date') as HTMLInputElement).value = voucher.chequeDate ? new Date(voucher.chequeDate).toISOString().split('T')[0] : '';
        (document.getElementById('v-form-cheque-date') as HTMLInputElement).readOnly = true;
    } else if (voucher.paymentMethod === 'Bank Transfer') {
        (document.getElementById('v-form-bank-name') as HTMLInputElement).value = voucher.bankName || '';
        (document.getElementById('v-form-bank-name') as HTMLInputElement).readOnly = true;
        (document.getElementById('v-form-bank-ref') as HTMLInputElement).value = voucher.referenceNumber || '';
        (document.getElementById('v-form-bank-ref') as HTMLInputElement).readOnly = true;
    } else if (voucher.paymentMethod === 'UPI') {
        (document.getElementById('v-form-upi-ref') as HTMLInputElement).value = voucher.referenceNumber || '';
        (document.getElementById('v-form-upi-ref') as HTMLInputElement).readOnly = true;
    }

    (document.getElementById('v-form-purpose') as HTMLTextAreaElement).value = voucher.paidTowards || '';
    (document.getElementById('v-form-purpose') as HTMLTextAreaElement).readOnly = true;

    updateDocPreview(voucher);

    // Fetch and display party profile details card in view mode
    const partyDetails = await fetchPartyDetails(voucher.partyType, voucher.partyName);
    renderPartyProfileCard(partyDetails);

    modal.classList.remove('hidden');
}

/**
 * Open Modal for New Mode
 */
async function openVoucherModalForCreate() {
    const modal = document.getElementById('voucher-modal') as HTMLDivElement;
    const modalTitle = document.getElementById('voucher-modal-title') as HTMLHeadingElement;
    const form = document.getElementById('voucher-form') as HTMLFormElement;
    const submitBtn = document.getElementById('v-form-submit-btn') as HTMLButtonElement;

    if (!modal || !form) return;

    currentViewingVoucher = null;
    form.reset();
    renderPartyProfileCard(null); // Clear profile details card

    if (modalTitle) modalTitle.textContent = "New Payment Voucher";
    if (submitBtn) submitBtn.classList.remove('hidden');

    const printBtn = document.getElementById('v-btn-print') as HTMLButtonElement;
    const pdfBtn = document.getElementById('v-btn-pdf') as HTMLButtonElement;
    const waBtn = document.getElementById('v-btn-whatsapp') as HTMLButtonElement;
    if (printBtn) printBtn.disabled = true;
    if (pdfBtn) pdfBtn.disabled = true;
    if (waBtn) waBtn.disabled = true;

    (document.getElementById('v-form-date') as HTMLInputElement).readOnly = false;
    (document.getElementById('v-form-date') as HTMLInputElement).value = new Date().toISOString().split('T')[0];

    (document.getElementById('v-form-party-type') as HTMLSelectElement).disabled = false;
    (document.getElementById('v-form-party-type') as HTMLSelectElement).value = "Customer";

    (document.getElementById('v-form-party-name') as HTMLInputElement).readOnly = false;
    (document.getElementById('v-form-party-id') as HTMLInputElement).value = "";

    (document.getElementById('v-form-amount') as HTMLInputElement).readOnly = false;
    (document.getElementById('v-form-words') as HTMLInputElement).value = "Rupees Zero Only";

    (document.getElementById('v-form-method') as HTMLSelectElement).disabled = false;
    (document.getElementById('v-form-method') as HTMLSelectElement).value = "Cash";

    toggleConditionalFields("Cash");

    (document.getElementById('v-form-purpose') as HTMLTextAreaElement).readOnly = false;

    const numberField = document.getElementById('v-form-no') as HTMLInputElement;
    if (numberField) numberField.value = "Generating...";
    try {
        const nextNo = await (window as any).VoucherAPI.fetchNextVoucherNumber();
        if (numberField) numberField.value = nextNo;
    } catch (e) {
        console.error('Error getting next number', e);
        if (numberField) numberField.value = "PV-ERR-xxxx";
    }

    updateDocPreview(getFormPayload());
    modal.classList.remove('hidden');
}

function toggleConditionalFields(method: string) {
    const fCheque = document.getElementById('v-field-cheque') as HTMLDivElement;
    const fBank = document.getElementById('v-field-bank') as HTMLDivElement;
    const fUpi = document.getElementById('v-field-upi') as HTMLDivElement;

    fCheque?.classList.add('hidden');
    fBank?.classList.add('hidden');
    fUpi?.classList.add('hidden');

    const inputs = [
        'v-form-cheque-no', 'v-form-cheque-bank', 'v-form-cheque-date',
        'v-form-bank-name', 'v-form-bank-ref', 'v-form-upi-ref'
    ];
    inputs.forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) {
            el.required = false;
            el.readOnly = false;
        }
    });

    if (method === 'Cheque') {
        fCheque?.classList.remove('hidden');
        (document.getElementById('v-form-cheque-no') as HTMLInputElement).required = true;
        (document.getElementById('v-form-cheque-bank') as HTMLInputElement).required = true;
        (document.getElementById('v-form-cheque-date') as HTMLInputElement).required = true;
    } else if (method === 'Bank Transfer') {
        fBank?.classList.remove('hidden');
        (document.getElementById('v-form-bank-name') as HTMLInputElement).required = true;
        (document.getElementById('v-form-bank-ref') as HTMLInputElement).required = true;
    } else if (method === 'UPI') {
        fUpi?.classList.remove('hidden');
        (document.getElementById('v-form-upi-ref') as HTMLInputElement).required = true;
    }
}

function getFormPayload(): any {
    const date = (document.getElementById('v-form-date') as HTMLInputElement).value;
    const voucherNumber = (document.getElementById('v-form-no') as HTMLInputElement).value;
    const partyName = (document.getElementById('v-form-party-name') as HTMLInputElement).value;
    const partyType = (document.getElementById('v-form-party-type') as HTMLSelectElement).value;
    const amount = Number((document.getElementById('v-form-amount') as HTMLInputElement).value || 0);
    const amountInWords = (document.getElementById('v-form-words') as HTMLInputElement).value;
    const paymentMethod = (document.getElementById('v-form-method') as HTMLSelectElement).value;
    const paidTowards = (document.getElementById('v-form-purpose') as HTMLTextAreaElement).value;

    const payload: any = {
        date,
        voucherNumber,
        partyName,
        partyType,
        amount,
        amountInWords,
        paymentMethod,
        paidTowards
    };

    if (paymentMethod === 'Cheque') {
        payload.chequeNumber = (document.getElementById('v-form-cheque-no') as HTMLInputElement).value;
        payload.bankName = (document.getElementById('v-form-cheque-bank') as HTMLInputElement).value;
        payload.chequeDate = (document.getElementById('v-form-cheque-date') as HTMLInputElement).value;
    } else if (paymentMethod === 'Bank Transfer') {
        payload.bankName = (document.getElementById('v-form-bank-name') as HTMLInputElement).value;
        payload.referenceNumber = (document.getElementById('v-form-bank-ref') as HTMLInputElement).value;
    } else if (paymentMethod === 'UPI') {
        payload.referenceNumber = (document.getElementById('v-form-upi-ref') as HTMLInputElement).value;
    }

    return payload;
}

/**
 * Update HTML Document Live Preview
 */
function updateDocPreview(v: any) {
    const container = document.getElementById('v-preview-doc-wrapper');
    if (!container) return;

    if (!v.voucherNumber) v.voucherNumber = "PV-xxxx-xxxx";

    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const formatIndian = (n: any) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let methodDetails = v.paymentMethod || 'Cash';
    if (v.paymentMethod === 'Cheque') {
        methodDetails += ` (Cheque No: ${v.chequeNumber || '-'}, Bank: ${v.bankName || '-'}, Date: ${formatDate(v.chequeDate)})`;
    } else if (v.paymentMethod === 'Bank Transfer') {
        methodDetails += ` (Bank: ${v.bankName || '-'}, Ref: ${v.referenceNumber || '-'})`;
    } else if (v.paymentMethod === 'UPI') {
        methodDetails += ` (UPI Ref: ${v.referenceNumber || '-'})`;
    }

    const companyName = (companyInfo?.company_name || 'SHRESHT SYSTEMS').toUpperCase();
    const companyAddress = typeof companyInfo?.address === 'string'
        ? companyInfo.address
        : [companyInfo?.address?.line1, companyInfo?.address?.line2, companyInfo?.address?.city, companyInfo?.address?.state ? companyInfo.address.state + (companyInfo.address.pincode ? ' - ' + companyInfo.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
    const companyPhone = companyInfo?.phone ? (typeof companyInfo.phone === 'string' ? companyInfo.phone : `${companyInfo.phone.ph1 || ''}${companyInfo.phone.ph2 ? ' / ' + companyInfo.phone.ph2 : ''}`) : '';
    const companyGstin = companyInfo?.gstin || '';
    const companyEmail = companyInfo?.email || '';
    const companyWebsite = companyInfo?.website || '';

    container.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1e293b;">
            <div style="background: #1a365d; color: #ffffff; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 50px; height: 50px; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="../assets/icon.png" style="width: 35px; height: 35px; object-fit: contain;">
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff;">${companyName}</h2>
                        <span style="font-size: 10px; color: #cbd5e1; text-transform: uppercase;">CCTV & Energy Solutions</span>
                    </div>
                </div>
                <div style="text-align: right; font-size: 10px; line-height: 1.4; color: #e2e8f0;">
                    <p style="margin: 0;">${companyAddress}</p>
                    <p style="margin: 0;">Ph: ${companyPhone} | GSTIN: ${companyGstin}</p>
                    <p style="margin: 0;">Email: ${companyEmail}</p>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #1e3a66; margin: 0; text-transform: uppercase;">Payment Voucher</h3>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-weight: 600;">
                        No: <span style="color: #1e293b;">${v.voucherNumber}</span> &nbsp;|&nbsp; 
                        Date: <span style="color: #1e293b;">${formatDate(v.date)}</span>
                    </p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 15px; margin-bottom: 20px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #ffffff;">
                    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Paid To (Payee)</div>
                    <div style="font-size: 13px; font-weight: 700; color: #1e3a66; margin-bottom: 4px;">${v.partyName || '-'}</div>
                    <div style="font-size: 11px; margin-top: 4px; display: flex; gap: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Type:</span>
                        <span style="color: #1e293b; font-weight: 600;">${v.partyType || '-'}</span>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount Paid</div>
                    <div style="font-size: 20px; font-weight: 900; color: #1e3a66; margin: 4px 0;">₹ ${formatIndian(v.amount)}</div>
                    <div style="font-size: 9px; color: #64748b; font-style: italic; text-transform: capitalize; max-height: 25px; overflow: hidden; text-overflow: ellipsis;">${v.amountInWords || 'Rupees Zero Only'}</div>
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; background: #ffffff;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Voucher Transaction Details</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f8fafc; padding-bottom: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Payment Method:</span>
                        <strong style="color: #1e293b;">${v.paymentMethod || 'Cash'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f8fafc; padding-bottom: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Voucher Date:</span>
                        <strong style="color: #1e293b;">${formatDate(v.date)}</strong>
                    </div>
                    <div style="grid-column: span 2; display: flex; justify-content: space-between; border-bottom: 1px solid #f8fafc; padding-bottom: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Transaction Details:</span>
                        <strong style="color: #1e293b;">${methodDetails}</strong>
                    </div>
                    <div style="grid-column: span 2; display: flex; flex-direction: column; gap: 4px; padding-top: 4px;">
                        <span style="color: #64748b; font-weight: 600;">Paid Towards / Purpose:</span>
                        <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 11px;">${v.paidTowards || '-'}</p>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                <div style="width: 40%; text-align: center;">
                    <div style="border-bottom: 1px solid #cbd5e1; height: 25px; margin-bottom: 5px;"></div>
                    <span style="color: #64748b; font-size: 10px; font-weight: 700;">Receiver's Signature</span>
                </div>
                <div style="width: 40%; text-align: center;">
                    <div style="border-bottom: 1px solid #cbd5e1; height: 25px; margin-bottom: 5px;"></div>
                    <span style="color: #64748b; font-size: 10px; font-weight: 700;">For ${companyName}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Handle Submit (Voucher Creation)
 */
async function handleVoucherSubmit() {
    const form = document.getElementById('voucher-form') as HTMLFormElement;
    if (!form || !form.reportValidity()) return;

    const submitBtn = document.getElementById('v-form-submit-btn') as HTMLButtonElement;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating...`;
    }

    try {
        const payload = getFormPayload();
        payload.createdBy = 'admin';

        const result = await (window as any).VoucherAPI.createVoucher(payload);
        if (result.success) {
            showToastMessage('Voucher created successfully!');
            window.setTimeout(() => {
                (window as any).navigateTo(`/voucher/details?id=${encodeURIComponent(result.voucher._id)}`);
            }, 350);
        } else {
            throw new Error(result.message || 'Error occurred');
        }
    } catch (e: any) {
        console.error('Error submitting voucher:', e);
        (window as any).showAlert(e.message || 'Error occurred while saving voucher.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-check"></i> Create Voucher`;
        }
    }
}

/**
 * Handle Voucher Deletion
 */
function handleDeleteVoucher(id: string) {
    const voucher = activeVouchers.find(v => v._id === id);
    if (!voucher) return;

    (window as any).showConfirm(`Are you sure you want to delete Voucher ${voucher.voucherNumber}? This will also delete the associated payment entry.`, async (response: string) => {
        if (response === 'Yes') {
            try {
                const res = await (window as any).VoucherAPI.deleteVoucherById(id);
                if (res.success) {
                    showToastMessage('Voucher deleted successfully!');
                    refreshVouchersList();
                } else {
                    throw new Error(res.message);
                }
            } catch (e: any) {
                console.error('Error deleting voucher:', e);
                (window as any).showAlert(e.message || 'Failed to delete voucher.');
            }
        }
    });
}

function closeVoucherModal() {
    if (document.body.dataset.voucherPage && document.body.dataset.voucherPage !== 'list') {
        (window as any).navigateTo('/voucher');
        return;
    }
    const modal = document.getElementById('voucher-modal') as HTMLDivElement;
    if (modal) modal.classList.add('hidden');
    currentViewingVoucher = null;
}

/**
 * Payee Autocomplete Suggestion Logic
 */
async function handlePayeeInput(inputEl: HTMLInputElement) {
    const typeSelect = document.getElementById('v-form-party-type') as HTMLSelectElement;
    const suggestionsUl = document.getElementById('v-party-suggestions') as HTMLUListElement;
    const type = typeSelect.value as 'Customer' | 'Supplier' | 'Other';
    const value = inputEl.value.trim().toLowerCase();

    console.log('handlePayeeInput:', { type, value });

    if (type === 'Other') {
        suggestionsUl.classList.add('hidden');
        suggestionsUl.style.display = 'none';
        return;
    }

    if (!value) {
        suggestionsUl.classList.add('hidden');
        suggestionsUl.style.display = 'none';
        return;
    }

    if (cachedPartiesType !== type) {
        console.log('Fetching parties cache for type:', type);
        if (type === 'Customer') {
            customersCache = await (window as any).VoucherAPI.fetchParties('Customer');
        } else {
            suppliersCache = await (window as any).VoucherAPI.fetchParties('Supplier');
        }
        cachedPartiesType = type;
        console.log('Parties cache size:', type === 'Customer' ? customersCache.length : suppliersCache.length);
    }

    const items = type === 'Customer' ? customersCache : suppliersCache;
    const filtered = items.filter(item => {
        const name = String(item && item.name || '').toLowerCase();
        const id = String(item && item.id || '').toLowerCase();
        const phone = String(item && item.phone || '').toLowerCase();
        const email = String(item && item.email || '').toLowerCase();
        const gstin = String(item && item.gstin || '').toLowerCase();
        return name.includes(value) || id.includes(value) || phone.includes(value) || email.includes(value) || gstin.includes(value);
    });

    console.log('Filtered suggestion matches:', filtered.length);

    if (filtered.length === 0) {
        suggestionsUl.classList.add('hidden');
        suggestionsUl.style.display = 'none';
        return;
    }

    suggestionsUl.innerHTML = '';
    filtered.slice(0, 10).forEach(item => {
        const li = document.createElement('li');
        li.className = 'px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between font-medium text-slate-700';
        li.innerHTML = `<span>${item.name}</span> <span class="text-slate-400 font-normal">${item.id}</span>`;
        li.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            inputEl.value = item.name;
            (document.getElementById('v-form-party-id') as HTMLInputElement).value = item.id;
            suggestionsUl.classList.add('hidden');
            suggestionsUl.style.display = 'none';
            updateDocPreview(getFormPayload());

            // Fetch and render detailed contact profile card
            const partyDetails = await fetchPartyDetails(type, item.name);
            renderPartyProfileCard(partyDetails);
        });
        suggestionsUl.appendChild(li);
    });

    suggestionsUl.classList.remove('hidden');
    suggestionsUl.style.display = 'block';
}

/**
 * Handle Toast Messages
 */
function showToastMessage(msg: string) {
    const toast = document.getElementById('toast') as HTMLDivElement;
    const toastMsg = document.getElementById('toast-message') as HTMLSpanElement;
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

/**
 * Generate Printable Voucher HTML
 */
function generateVoucherHTML(v: any): string {
    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const formatIndian = (n: any) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let methodDetails = v.paymentMethod;
    if (v.paymentMethod === 'Cheque') {
        methodDetails += ` (Cheque No: ${v.chequeNumber || '-'}, Bank: ${v.bankName || '-'}, Date: ${formatDate(v.chequeDate)})`;
    } else if (v.paymentMethod === 'Bank Transfer') {
        methodDetails += ` (Bank: ${v.bankName || '-'}, Ref: ${v.referenceNumber || '-'})`;
    } else if (v.paymentMethod === 'UPI') {
        methodDetails += ` (UPI Ref: ${v.referenceNumber || '-'})`;
    }

    const companyName = (companyInfo?.company_name || 'SHRESHT SYSTEMS').toUpperCase();
    const companyAddress = typeof companyInfo?.address === 'string'
        ? companyInfo.address
        : [companyInfo?.address?.line1, companyInfo?.address?.line2, companyInfo?.address?.city, companyInfo?.address?.state ? companyInfo.address.state + (companyInfo.address.pincode ? ' - ' + companyInfo.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
    const companyPhone = companyInfo?.phone ? (typeof companyInfo.phone === 'string' ? companyInfo.phone : `${companyInfo.phone.ph1 || ''}${companyInfo.phone.ph2 ? ' / ' + companyInfo.phone.ph2 : ''}`) : '';
    const companyGstin = companyInfo?.gstin || '';
    const companyEmail = companyInfo?.email || '';
    const companyWebsite = companyInfo?.website || '';

    let modeBadgeClass = 'mode-cash';
    const methodLower = (v.paymentMethod || '').toLowerCase();
    if (methodLower === 'cash') {
        modeBadgeClass = 'mode-cash';
    } else if (methodLower === 'upi') {
        modeBadgeClass = 'mode-upi';
    } else if (methodLower === 'bank transfer' || methodLower === 'bank') {
        modeBadgeClass = 'mode-bank';
    } else if (methodLower === 'cheque') {
        modeBadgeClass = 'mode-cheque';
    }

    return `
    <html>
    <head>
        <title>Payment Voucher - ${v.voucherNumber}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: #fff; margin: 0; }
            .voucher-container {
                border: 1px solid #e2e8f0;
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 30px;
                margin-bottom: 24px;
                background: #1a365d;
                border-radius: 12px;
                color: #ffffff;
                border: none;
                box-sizing: border-box;
            }
            .quotation-brand {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .logo {
                width: 80px;
                height: 80px;
                background: #ffffff;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            .logo img {
                width: 50px;
                height: 50px;
                object-fit: contain;
            }
            .quotation-brand-text h1 {
                margin: 0;
                color: #ffffff;
                font-size: 26px;
                letter-spacing: -0.5px;
                font-weight: 800;
                line-height: 1.1;
            }
            .quotation-tagline {
                margin: 4px 0 0 0;
                color: #e2e8f0;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .company-details {
                text-align: right;
                line-height: 1.6;
            }
            .company-details p {
                margin: 0;
                color: #f1f5f9;
                font-size: 12px;
                font-weight: 500;
            }
            .receipt-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
            .receipt-title-box h2 { font-size: 24px; font-weight: 800; color: #1e3a66; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; }
            .receipt-meta { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .receipt-meta span { color: #1e293b; font-weight: 600; }
            .info-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; margin-bottom: 24px; }
            .info-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            .party-details { font-size: 12px; line-height: 1.6; }
            .party-name { font-size: 14px; font-weight: 700; color: #1e3a66; margin-bottom: 4px; }
            .party-info-row { display: flex; margin-top: 4px; }
            .party-info-label { color: #64748b; width: 60px; flex-shrink: 0; font-weight: 600; }
            .party-info-value { color: #1e293b; font-weight: 550; }
            .amount-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
            .amount-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
            .amount-value { font-size: 30px; font-weight: 950; color: #1e3a66; letter-spacing: -0.5px; }
            .amount-words-box { font-size: 10px; color: #64748b; font-style: italic; font-weight: 600; margin-top: 6px; max-width: 100%; text-transform: capitalize; }
            .details-grid-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 12px; }
            .detail-row { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #f8fafc; padding-bottom: 6px; }
            .detail-label { color: #64748b; font-weight: 600; }
            .detail-value { color: #1e293b; font-weight: 600; text-align: right; }
            .mode-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; }
            .mode-cash { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
            .mode-upi { background-color: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
            .mode-bank { background-color: #faf5ff; color: #7c3aed; border: 1px solid #e9d5ff; }
            .mode-cheque { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; font-weight: bold; border-top: 1px solid #f1f5f9; padding-top: 24px; }
            .sig-col { width: 40%; text-align: center; }
            .sig-line { border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; height: 30px; }
            .footer-note { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 500; }
            @media print {
                body { padding: 0; }
                .voucher-container {
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="header">
                <div class="quotation-brand">
                    <div class="logo">
                        <img src="../assets/icon.png" alt="SSMS Logo">
                    </div>
                    <div class="quotation-brand-text">
                        <h1>${companyName}</h1>
                        <p class="quotation-tagline">CCTV & Energy Solutions</p>
                    </div>
                </div>
                <div class="company-details">
                    <p style="margin:0;">${companyAddress}</p>
                    <p style="margin:0;">Ph: ${companyPhone}</p>
                    <p style="margin:0;">GSTIN: ${companyGstin}</p>
                    <p style="margin:0;">Email: ${companyEmail}</p>
                    <p style="margin:0;">Website: ${companyWebsite}</p>
                </div>
            </div>

            <div class="receipt-header-row">
                <div class="receipt-title-box">
                    <h2>Payment Voucher</h2>
                    <div class="receipt-meta">
                        Voucher No: <span>${v.voucherNumber}</span> &nbsp;|&nbsp; 
                        Date: <span>${formatDate(v.date)}</span>
                    </div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-card">
                    <div class="card-title">Paid To (Payee)</div>
                    <div class="party-details">
                        <div class="party-name">${v.partyName}</div>
                        <div class="party-info-row">
                            <span class="party-info-label">Type:</span>
                            <span class="party-info-value">${v.partyType || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="amount-card">
                    <div class="amount-title">Amount Paid</div>
                    <div class="amount-value">₹ ${formatIndian(v.amount)}</div>
                    ${v.amountInWords ? `<div class="amount-words-box">${v.amountInWords}</div>` : ''}
                </div>
            </div>

            <div class="details-grid-card">
                <div class="card-title">Voucher Details</div>
                <div class="details-grid">
                    <div class="detail-row">
                        <span class="detail-label">Voucher Number:</span>
                        <span class="detail-value">${v.voucherNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Voucher Date:</span>
                        <span class="detail-value">${formatDate(v.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">
                            <span class="mode-badge ${modeBadgeClass}">${v.paymentMethod}</span>
                        </span>
                    </div>
                    <div class="detail-row" style="grid-column: span 2;">
                        <span class="detail-label">Transaction Reference:</span>
                        <span class="detail-value">${methodDetails}</span>
                    </div>
                    <div class="detail-row" style="grid-column: span 2; flex-direction: column; align-items: flex-start;">
                        <span class="detail-label" style="margin-bottom: 4px;">Paid Towards:</span>
                        <span class="detail-value" style="text-align: left;">${v.paidTowards || '-'}</span>
                    </div>
                </div>
            </div>

            <div class="signature-row">
                <div class="sig-col">
                    <div class="sig-line"></div>
                    Receiver's Signature
                </div>
                <div class="sig-col">
                    <div class="sig-line"></div>
                    For ${companyName}
                </div>
            </div>

            <div class="footer-note">
                This is a computer-generated voucher and requires signature at the time of delivery/receipt.
            </div>
        </div>
    </body>
    </html>
    `;
}

function showWhatsAppPromptModal(defaultPhone: string, callback: (phone: string) => void) {
    let modal = document.getElementById('whatsapp-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'whatsapp-prompt-modal';
        modal.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-[999] flex items-center justify-center transition-all duration-200';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full relative p-6 mx-4 transform scale-100 transition-all duration-200">
                <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                    <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <i class="fab fa-whatsapp text-emerald-500 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800">Send via WhatsApp</h3>
                    <button id="close-whatsapp-modal" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer ml-auto">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label for="whatsapp-prompt-phone" class="block text-sm font-medium text-slate-700 mb-2">
                            Enter Client's WhatsApp Number
                        </label>
                        <input type="tel" id="whatsapp-prompt-phone" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all" 
                            placeholder="e.g. 9876543210" value="${defaultPhone}">
                    </div>
                </div>
                <div class="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                    <button id="cancel-whatsapp-modal" class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-all cursor-pointer">
                        Cancel
                    </button>
                    <button id="submit-whatsapp-modal" class="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer">
                        <i class="fab fa-whatsapp"></i> Send Now
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const input = modal.querySelector('#whatsapp-prompt-phone') as HTMLInputElement;
    if (input) input.value = defaultPhone;

    modal.classList.remove('hidden');

    const closeModal = () => {
        modal?.classList.add('hidden');
    };

    modal.querySelector('#close-whatsapp-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancel-whatsapp-modal')?.addEventListener('click', closeModal);

    const submitBtn = modal.querySelector('#submit-whatsapp-modal') as HTMLButtonElement;
    const newSubmitBtn = submitBtn.cloneNode(true) as HTMLButtonElement;
    submitBtn.parentNode?.replaceChild(newSubmitBtn, submitBtn);

    newSubmitBtn.addEventListener('click', () => {
        const phone = input.value.trim();
        callback(phone);
        closeModal();
    });
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    document.getElementById('home-btn')?.addEventListener('click', () => {
        (window as any).navigateTo('/dashboard');
    });

    document.getElementById('new-voucher-btn')?.addEventListener('click', () => {
        (window as any).navigateTo('/voucher/form');
    });

    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        refreshVouchersList();
    });

    document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal')?.classList.add('hidden');
    });

    document.getElementById('shortcuts-overlay')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal')?.classList.add('hidden');
    });

    document.getElementById('close-voucher-modal-btn')?.addEventListener('click', () => {
        closeVoucherModal();
    });

    document.getElementById('voucher-modal-overlay')?.addEventListener('click', () => {
        closeVoucherModal();
    });

    document.getElementById('v-form-cancel-btn')?.addEventListener('click', () => {
        closeVoucherModal();
    });

    document.getElementById('v-form-submit-btn')?.addEventListener('click', () => {
        handleVoucherSubmit();
    });

    const inputsToWatch = [
        'v-form-date', 'v-form-party-type', 'v-form-party-name', 'v-form-amount',
        'v-form-method', 'v-form-cheque-no', 'v-form-cheque-bank', 'v-form-cheque-date',
        'v-form-bank-name', 'v-form-bank-ref', 'v-form-upi-ref', 'v-form-purpose'
    ];
    inputsToWatch.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (!currentViewingVoucher) {
                updateDocPreview(getFormPayload());
            }
        });
    });

    document.getElementById('v-form-party-type')?.addEventListener('change', () => {
        const nameInput = document.getElementById('v-form-party-name') as HTMLInputElement;
        const idInput = document.getElementById('v-form-party-id') as HTMLInputElement;
        if (nameInput) nameInput.value = '';
        if (idInput) idInput.value = '';
        toggleConditionalFields((document.getElementById('v-form-method') as HTMLSelectElement).value);
        renderPartyProfileCard(null); // Clear profile details card on type change
        if (!currentViewingVoucher) {
            updateDocPreview(getFormPayload());
        }
    });

    const partyNameInput = document.getElementById('v-form-party-name') as HTMLInputElement;
    partyNameInput?.addEventListener('input', () => {
        renderPartyProfileCard(null); // Clear profile details card on manual edit
        handlePayeeInput(partyNameInput);
    });
    partyNameInput?.addEventListener('focus', () => {
        handlePayeeInput(partyNameInput);
    });
    partyNameInput?.addEventListener('blur', () => {
        setTimeout(() => {
            const suggestionsUl = document.getElementById('v-party-suggestions');
            if (suggestionsUl) {
                suggestionsUl.classList.add('hidden');
                suggestionsUl.style.display = 'none';
            }
        }, 200);
    });

    const amountInput = document.getElementById('v-form-amount') as HTMLInputElement;
    amountInput?.addEventListener('input', () => {
        const val = Number(amountInput.value || 0);
        const wordEl = document.getElementById('v-form-words') as HTMLInputElement;
        if (wordEl) {
            if (val > 0 && typeof (window as any).numberToWords === 'function') {
                wordEl.value = `${(window as any).numberToWords(val)} Rupees Only`;
            } else {
                wordEl.value = 'Rupees Zero Only';
            }
        }
        if (!currentViewingVoucher) {
            updateDocPreview(getFormPayload());
        }
    });

    document.getElementById('v-form-method')?.addEventListener('change', (e) => {
        const method = (e.target as HTMLSelectElement).value;
        toggleConditionalFields(method);
        if (!currentViewingVoucher) {
            updateDocPreview(getFormPayload());
        }
    });

    document.getElementById('v-btn-print')?.addEventListener('click', () => {
        const doc = currentViewingVoucher || getFormPayload();
        const html = generateVoucherHTML(doc);
        if (typeof (window as any).handlePrint === 'function') {
            (window as any).handlePrint(html, 'print', `Voucher-${doc.voucherNumber}`);
        }
    });

    document.getElementById('v-btn-pdf')?.addEventListener('click', () => {
        const doc = currentViewingVoucher || getFormPayload();
        const html = generateVoucherHTML(doc);
        if (typeof (window as any).handlePrint === 'function') {
            (window as any).handlePrint(html, 'savePDF', `Voucher-${doc.voucherNumber}`);
        }
    });

    document.getElementById('v-btn-whatsapp')?.addEventListener('click', async () => {
        const doc = currentViewingVoucher || getFormPayload();
        const html = generateVoucherHTML(doc);
        const btn = document.getElementById('v-btn-whatsapp') as HTMLButtonElement;
        
        showWhatsAppPromptModal('', async (phone) => {
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 15) {
                (window as any).showAlert('Please enter a valid phone number (10 to 15 digits).');
                return;
            }

            let formattedPhone = cleanPhone;
            if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone;
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`;
            }

            try {
                const res = await fetch('/comms/send-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        paymentId: `Voucher-${doc.voucherNumber}`,
                        htmlContent: html,
                        documentType: 'payment voucher',
                        partyName: doc.partyName,
                        amount: doc.amount,
                        date: doc.date
                    })
                });

                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || result.error || 'Failed to send WhatsApp.');
                }
                
                showToastMessage('Voucher sent via WhatsApp successfully!');
            } catch (err: any) {
                console.error(err);
                (window as any).showAlert(err.message || 'Failed to send via WhatsApp.');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fab fa-whatsapp text-emerald-500"></i> WhatsApp`;
                }
            }
        });
    });

    const filterBtn = document.getElementById('filter-btn');
    const filterPopover = document.getElementById('filter-popover');
    filterBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (filterPopover) {
            filterPopover.classList.toggle('hidden');
            const rect = filterBtn.getBoundingClientRect();
            filterPopover.style.top = `${rect.bottom + window.scrollY + 6}px`;
            filterPopover.style.left = `${rect.right - 280 + window.scrollX}px`;
        }
    });

    document.addEventListener('click', (e) => {
        if (filterPopover && !filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
            filterPopover.classList.add('hidden');
        }
    });

    document.querySelectorAll('#dateFilterDropdown a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const filterType = a.getAttribute('data-date-filter') || 'all';
            
            document.querySelectorAll('#dateFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
            a.classList.add('bg-gray-100', 'font-semibold');
            
            const customDateInputs = document.getElementById('custom-date-inputs');
            if (filterType === 'custom') {
                customDateInputs?.classList.remove('hidden');
            } else {
                customDateInputs?.classList.add('hidden');
                (document.getElementById('date-filter') as HTMLInputElement).value = filterType;
                refreshVouchersList();
            }
        });
    });

    document.getElementById('start-date-filter')?.addEventListener('change', () => {
        (document.getElementById('date-filter') as HTMLInputElement).value = 'custom';
        refreshVouchersList();
    });
    document.getElementById('end-date-filter')?.addEventListener('change', () => {
        (document.getElementById('date-filter') as HTMLInputElement).value = 'custom';
        refreshVouchersList();
    });

    document.querySelectorAll('#party-type-filters button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#party-type-filters button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-party-type') || '';
            (document.getElementById('party-type-filter') as HTMLInputElement).value = type;
            
            document.querySelectorAll('#partyTypeFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
            const popoverA = document.querySelector(`#partyTypeFilterDropdown a[data-party-type-filter="${type}"]`);
            if (popoverA) popoverA.classList.add('bg-gray-100', 'font-semibold');
            
            refreshVouchersList();
        });
    });

    document.querySelectorAll('#partyTypeFilterDropdown a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const type = a.getAttribute('data-party-type-filter') || '';
            
            document.querySelectorAll('#partyTypeFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
            a.classList.add('bg-gray-100', 'font-semibold');
            
            document.querySelectorAll('#party-type-filters button').forEach(b => b.classList.remove('active'));
            const tabBtn = document.querySelector(`#party-type-filters button[data-party-type="${type}"]`);
            if (tabBtn) tabBtn.classList.add('active');
            
            (document.getElementById('party-type-filter') as HTMLInputElement).value = type;
            refreshVouchersList();
        });
    });

    document.querySelectorAll('#modeFilterDropdown a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const mode = a.getAttribute('data-mode-filter') || '';
            
            document.querySelectorAll('#modeFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
            a.classList.add('bg-gray-100', 'font-semibold');
            
            (document.getElementById('mode-filter') as HTMLInputElement).value = mode;
            refreshVouchersList();
        });
    });

    document.getElementById('amount-min-filter')?.addEventListener('input', () => {
        refreshVouchersList();
    });
    document.getElementById('amount-max-filter')?.addEventListener('input', () => {
        refreshVouchersList();
    });

    document.getElementById('reset-filters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    document.getElementById('clear-all-chips')?.addEventListener('click', () => {
        resetAllFilters();
    });

    let searchTimeout: any = null;
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            refreshVouchersList();
        }, 300);
    });
}

function resetAllFilters() {
    (document.getElementById('search-input') as HTMLInputElement).value = '';
    (document.getElementById('date-filter') as HTMLInputElement).value = 'all';
    (document.getElementById('party-type-filter') as HTMLInputElement).value = '';
    (document.getElementById('mode-filter') as HTMLInputElement).value = '';
    (document.getElementById('amount-min-filter') as HTMLInputElement).value = '';
    (document.getElementById('amount-max-filter') as HTMLInputElement).value = '';
    
    const start = document.getElementById('start-date-filter') as HTMLInputElement;
    const end = document.getElementById('end-date-filter') as HTMLInputElement;
    if (start) start.value = '';
    if (end) end.value = '';

    document.querySelectorAll('#dateFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
    document.querySelector('#dateFilterDropdown a[data-date-filter="all"]')?.classList.add('bg-gray-100', 'font-semibold');
    document.getElementById('custom-date-inputs')?.classList.add('hidden');

    document.querySelectorAll('#party-type-filters button').forEach(b => b.classList.remove('active'));
    document.querySelector('#party-type-filters button[data-party-type=""]')?.classList.add('active');

    document.querySelectorAll('#partyTypeFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
    document.querySelector('#partyTypeFilterDropdown a[data-party-type-filter=""]')?.classList.add('bg-gray-100', 'font-semibold');

    document.querySelectorAll('#modeFilterDropdown a').forEach(el => el.classList.remove('bg-gray-100', 'font-semibold'));
    document.querySelector('#modeFilterDropdown a[data-mode-filter=""]')?.classList.add('bg-gray-100', 'font-semibold');

    refreshVouchersList();
}

/**
 * Global Keyboard Navigation/Shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            (window as any).navigateTo('/voucher/form');
        }
        else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            refreshVouchersList();
        }
        else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            (document.getElementById('search-input') as HTMLInputElement)?.focus();
        }
        else if (e.key === 'Escape') {
            closeVoucherModal();
            document.getElementById('shortcuts-modal')?.classList.add('hidden');
        }
    });
}

async function fetchPartyDetails(type: string, partyName: string): Promise<any> {
    try {
        const res = await fetch(`/payment/get-party-details/${encodeURIComponent(type)}/${encodeURIComponent(partyName)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.success && data.party) {
            const party = data.party;
            return {
                ...party,
                name: type === 'Customer' ? (party.customer?.name || 'Unnamed') : (party.supplier_name || 'Unnamed'),
                phone: type === 'Customer' ? (party.customer?.phone || '') : (party.phone || ''),
                email: type === 'Customer' ? (party.customer?.email || '') : (party.email || ''),
                gstin: party.gstin || ''
            };
        }
        return null;
    } catch (e) {
        console.error('fetchPartyDetails error:', e);
        return null;
    }
}

function renderPartyProfileCard(party: any) {
    const container = document.getElementById('v-party-profile-card-container');
    if (!container) return;

    if (!party) {
        container.innerHTML = '';
        container.classList.add('hidden');
        container.style.display = 'none';
        return;
    }

    const name = party.name || 'Unnamed';
    const type = (document.getElementById('v-form-party-type') as HTMLSelectElement).value;
    const phone = party.phone || '';
    const email = party.email || '';
    const gstin = party.gstin || '';
    
    let addressStr = '';
    if (party.billing_address) {
        const billing = party.billing_address;
        addressStr = [billing.line1, billing.line2, billing.city, billing.state, billing.pincode].filter(val => val && String(val).trim() !== '').join(', ');
    } else if (party.customer_address) {
        addressStr = party.customer_address;
    } else if (party.address) {
        const addr = party.address;
        if (typeof addr === 'string') {
            addressStr = addr;
        } else {
            addressStr = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(val => val && String(val).trim() !== '').join(', ');
        }
    }

    container.innerHTML = `
        <div class="bg-blue-50/40 rounded-xl p-4 border border-blue-100 flex flex-col md:flex-row gap-4 justify-between items-start fade-in text-xs mb-4">
            <div class="space-y-2 flex-grow w-full">
                <div class="flex items-center gap-2">
                    <h4 class="font-bold text-slate-800 text-sm">${name}</h4>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase">${type}</span>
                </div>
                <div class="text-slate-600 space-y-1.5 w-full">
                    ${addressStr ? `
                    <p class="flex items-start gap-1.5">
                        <i class="fas fa-map-marker-alt text-blue-500 mt-0.5 flex-shrink-0 w-3.5 text-center"></i>
                        <span>${addressStr}</span>
                    </p>` : ''}
                    <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 pt-1.5 border-t border-slate-100/50 w-full">
                        ${phone ? `
                        <p class="flex items-center gap-1.5">
                            <i class="fas fa-phone text-blue-500 flex-shrink-0 w-3.5 text-center"></i>
                            <span>${phone}</span>
                        </p>` : ''}
                        ${email ? `
                        <p class="flex items-center gap-1.5">
                            <i class="fas fa-envelope text-blue-500 flex-shrink-0 w-3.5 text-center"></i>
                            <span class="break-all">${email}</span>
                        </p>` : ''}
                    </div>
                </div>
            </div>
            ${gstin ? `
            <div class="bg-white rounded-lg p-2.5 border border-blue-100 flex flex-col justify-center items-start min-w-[150px] shadow-sm mt-2 md:mt-0 w-full md:w-auto">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">GSTIN</span>
                <span class="font-bold text-slate-700 mt-0.5">${gstin}</span>
            </div>` : ''}
        </div>
    `;
    container.classList.remove('hidden');
    container.style.display = 'block';
}
