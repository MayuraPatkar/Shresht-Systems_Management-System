/** Shared full-page voucher editor used by the create and details pages. */
(() => {
    const root = document.getElementById('voucher-page-root');
    if (!root) return;

    const isDetails = document.body.dataset.voucherPage === 'details';
    if (isDetails) {
        root.innerHTML = `
            <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 h-24 flex items-center px-4">
                <div class="flex items-center justify-between w-full">
                    <div class="flex items-center gap-3"><img src="../assets/icon.png" alt="Icon" class="h-10 w-10"><h1 id="voucher-details-title" class="text-xl font-bold text-gray-800">Voucher Details</h1></div>
                    <div class="flex items-center gap-2">
                        <button id="v-btn-print" disabled class="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><i class="fas fa-print text-xs"></i>Print</button>
                        <button id="v-btn-pdf" disabled class="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><i class="fas fa-file-pdf text-red-500 text-xs"></i>Download Voucher</button>
                        <button id="v-btn-whatsapp" disabled class="px-4 py-2 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><i class="fab fa-whatsapp text-xs"></i>Send Voucher</button>
                        <button id="close-voucher-modal-btn" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium"><i class="fas fa-home"></i>Home</button>
                    </div>
                </div>
            </header>
            <div class="flex pt-24 h-screen w-full overflow-hidden">
                <aside class="sidebar bg-white h-full flex flex-col border-r border-gray-200 flex-shrink-0"><nav class="flex-1 p-4 overflow-y-auto" id="sidebar-nav"></nav></aside>
                <main class="flex-1 h-full overflow-y-auto p-8">
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                        <span class="text-gray-400 block text-[10px] font-semibold uppercase tracking-wider mb-1">Voucher Amount</span>
                        <h2 id="details-amount" class="text-3xl font-extrabold tracking-tight text-slate-800">₹ 0.00</h2>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-500 font-medium pt-4 mt-4 border-t border-slate-100">
                            <div><span class="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Voucher Number</span><span id="header-voucher-no" class="text-slate-700 font-bold">-</span></div>
                            <div><span class="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Method</span><span id="header-method" class="text-slate-700 font-bold">-</span></div>
                            <div><span class="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Date</span><span id="header-date" class="text-slate-700 font-bold">-</span></div>
                            <div><span class="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Payee Type</span><span id="header-party-type" class="text-slate-700 font-bold">-</span></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                        <div class="xl:col-span-2 space-y-6">
                            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-3 flex items-center gap-2"><i class="fas fa-receipt text-blue-600"></i>Voucher Details</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                    <div><span class="field-label">Payee Name</span><span id="details-party-name" class="field-value">-</span></div>
                                    <div><span class="field-label">Payee Type</span><span id="details-party-type" class="field-value">-</span></div>
                                    <div><span class="field-label">Payment Method</span><span id="details-method" class="field-value">-</span></div>
                                    <div><span class="field-label">Transaction Reference</span><span id="details-reference" class="field-value">-</span></div>
                                    <div><span class="field-label">Voucher Date</span><span id="details-date" class="field-value">-</span></div>
                                    <div><span class="field-label">Amount In Words</span><span id="details-words" class="field-value">-</span></div>
                                </div>
                                <div class="border-t pt-4"><span class="field-label mb-2">Paid Towards / Purpose</span><div id="details-purpose" class="border-l-4 border-blue-500 bg-blue-50/30 p-4 rounded-r-lg text-slate-600 leading-relaxed text-sm">-</div></div>
                            </div>
                        </div>
                        <div class="bg-slate-100 rounded-xl border border-slate-200 p-5 overflow-auto"><h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Voucher Preview</h3><div id="v-preview-doc-wrapper" class="bg-white border border-slate-300 rounded-lg shadow-sm p-5 min-h-[500px]"></div></div>
                    </div>
                </main>
            </div>`;
        root.querySelectorAll('.field-label').forEach(el => el.className = 'field-label text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5');
        root.querySelectorAll('.field-value').forEach(el => el.className = 'field-value font-semibold text-slate-800 block');
        return;
    }
    root.innerHTML = `
        <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 h-24 flex items-center px-4">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3">
                    <img src="../assets/icon.png" alt="Shresht Management Icon" class="h-10 w-10 object-contain">
                    <div>
                        <h1 id="voucher-modal-title" class="text-xl font-bold text-gray-800">${isDetails ? 'Voucher Details' : 'New Payment Voucher'}</h1>
                        <p class="text-xs text-gray-500 font-medium">${isDetails ? 'View payout voucher documentation' : 'Create cash/bank payout voucher documentation'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button id="v-btn-print" disabled class="bg-white text-slate-700 border border-slate-200 px-4 h-10 rounded-lg font-medium text-sm hover:bg-slate-50 disabled:opacity-50"><i class="fas fa-print mr-2"></i>Print</button>
                    <button id="v-btn-pdf" disabled class="bg-white text-slate-700 border border-slate-200 px-4 h-10 rounded-lg font-medium text-sm hover:bg-slate-50 disabled:opacity-50"><i class="fas fa-file-pdf text-red-500 mr-2"></i>PDF</button>
                    <button id="v-btn-whatsapp" disabled class="bg-white text-slate-700 border border-slate-200 px-4 h-10 rounded-lg font-medium text-sm hover:bg-slate-50 disabled:opacity-50"><i class="fab fa-whatsapp text-emerald-500 mr-2"></i>WhatsApp</button>
                    <button id="close-voucher-modal-btn" class="bg-gray-600 text-white px-4 h-10 rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium text-sm"><i class="fas fa-arrow-left"></i>Back</button>
                </div>
            </div>
        </header>
        <div class="flex pt-24 h-screen w-full overflow-hidden">
            <aside class="sidebar bg-white h-full flex flex-col border-r border-gray-200 flex-shrink-0"><nav class="flex-1 p-4 overflow-y-auto" id="sidebar-nav"></nav></aside>
            <main class="flex-grow overflow-hidden h-[calc(100vh-6rem)]">
                <div id="voucher-modal" class="h-full bg-gray-50 flex flex-col">
                    <div class="flex-grow grid grid-cols-1 xl:grid-cols-2 min-h-0 overflow-hidden">
                        <section class="border-r border-slate-200 overflow-y-auto p-6 bg-white flex flex-col">
                            <form id="voucher-form" class="space-y-5 flex-grow">
                                <div class="flex items-center gap-2 text-blue-600 font-semibold border-b border-slate-100 pb-2"><i class="fas fa-file-invoice-dollar"></i>Voucher Information</div>
                                <div class="grid grid-cols-2 gap-4">
                                    <label class="text-xs font-semibold text-slate-600">Voucher Date <span class="text-red-500">*</span><input type="date" id="v-form-date" required class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"></label>
                                    <label class="text-xs font-semibold text-slate-600">Voucher Number<input type="text" id="v-form-no" readonly placeholder="Generating..." class="mt-1 w-full px-3 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm"></label>
                                </div>
                                <div class="grid grid-cols-3 gap-3">
                                    <label class="text-xs font-semibold text-slate-600">Payee Type <span class="text-red-500">*</span><select id="v-form-party-type" required class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"><option>Customer</option><option selected>Supplier</option><option>Other</option></select></label>
                                    <div class="col-span-2 relative"><label class="text-xs font-semibold text-slate-600">Payee Name (Name / ID) <span class="text-red-500">*</span><input type="text" id="v-form-party-name" required autocomplete="off" placeholder="Search or type name..." class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"></label><input type="hidden" id="v-form-party-id"><ul id="v-party-suggestions" class="suggestions hidden absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"></ul></div>
                                </div>
                                <div class="grid grid-cols-3 gap-3">
                                    <label class="text-xs font-semibold text-slate-600">Amount (₹) <span class="text-red-500">*</span><input type="number" id="v-form-amount" step="0.01" min="0.01" required placeholder="0.00" class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"></label>
                                    <label class="col-span-2 text-xs font-semibold text-slate-600">Amount In Words<input type="text" id="v-form-words" readonly placeholder="Rupees Zero Only" class="mt-1 w-full px-3 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm italic"></label>
                                </div>
                                <label class="block text-xs font-semibold text-slate-600">Payment Method <span class="text-red-500">*</span><select id="v-form-method" required class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"><option selected>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select></label>
                                <div id="v-method-conditional-fields" class="space-y-3">
                                    <div id="v-field-cheque" class="hidden grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200"><label class="text-xs font-semibold">Cheque No<input id="v-form-cheque-no" class="mt-1 w-full px-2.5 py-2 border rounded"></label><label class="text-xs font-semibold">Bank Name<input id="v-form-cheque-bank" class="mt-1 w-full px-2.5 py-2 border rounded"></label><label class="text-xs font-semibold">Cheque Date<input type="date" id="v-form-cheque-date" class="mt-1 w-full px-2.5 py-2 border rounded"></label></div>
                                    <div id="v-field-bank" class="hidden grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200"><label class="text-xs font-semibold">Bank Name<input id="v-form-bank-name" class="mt-1 w-full px-2.5 py-2 border rounded"></label><label class="text-xs font-semibold">Transaction Ref / UTR<input id="v-form-bank-ref" class="mt-1 w-full px-2.5 py-2 border rounded"></label></div>
                                    <div id="v-field-upi" class="hidden bg-slate-50 p-3 rounded-lg border border-slate-200"><label class="text-xs font-semibold">UPI Reference Number<input id="v-form-upi-ref" class="mt-1 w-full px-2.5 py-2 border rounded"></label></div>
                                </div>
                                <label class="block text-xs font-semibold text-slate-600">Paid Towards / Purpose <span class="text-red-500">*</span><textarea id="v-form-purpose" required rows="3" placeholder="Payment details..." class="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"></textarea></label>
                            </form>
                            <div class="pt-4 border-t border-slate-200 mt-5 flex justify-end gap-2">
                                <button type="button" id="v-form-cancel-btn" class="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100">Back</button>
                                <button type="button" id="v-form-submit-btn" class="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow flex items-center gap-2"><i class="fas fa-check"></i>Create Voucher</button>
                            </div>
                        </section>
                        <section class="bg-slate-100 p-6 overflow-y-auto"><div class="text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">Document Preview</div><div id="v-preview-doc-wrapper" class="bg-white border border-slate-300 rounded-lg shadow-sm p-8 min-h-[500px]"></div></section>
                    </div>
                </div>
            </main>
        </div>
        <div id="toast" class="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg hidden z-50 flex items-center gap-2"><i class="fas fa-check-circle"></i><span id="toast-message">Success!</span></div>`;
})();
