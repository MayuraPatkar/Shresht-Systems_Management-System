document.addEventListener('DOMContentLoaded', () => {
    const monthOptions = ['January','February','March','April','May','June','July','August','September','October','November','December']
        .map((month, index) => `<option value="${index + 1}">${month}</option>`).join('');
    ['gst-month', 'purchase-gst-month'].forEach(id => {
        const select = document.getElementById(id) as HTMLSelectElement | null;
        if (select) select.innerHTML = monthOptions;
    });

    const summaryHtml = (prefix: string) => [
        ['taxable', 'Total Taxable Value', 'text-blue-600'],
        ['cgst', 'Total CGST', 'text-emerald-600'],
        ['sgst', 'Total SGST', 'text-violet-600'],
        ['total-gst', 'Total GST', 'text-orange-600']
    ].map(([key, label, color]) => `<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${label}</p><p id="${prefix}-${key}" class="text-2xl font-extrabold ${color} mt-2">₹0</p></div>`).join('');
    document.getElementById('gst-report-summary')!.innerHTML = summaryHtml('summary');
    document.getElementById('purchase-gst-report-summary')!.innerHTML = summaryHtml('purchase-summary');

    const breakdown = (prefix: string, title: string, purchaseMode: boolean) => `<section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6"><div class="px-6 py-4 border-b flex justify-between items-center"><h2 id="${purchaseMode ? '' : 'gst-breakdown-title'}" class="text-sm font-bold uppercase tracking-wider text-slate-800">${title}</h2><div class="flex gap-2"><button id="print-${prefix}-report" style="display:none" class="border px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-print mr-2"></i>Print</button><button id="save-${prefix}-pdf" style="display:none" class="border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-file-pdf mr-2"></i>PDF</button></div></div><div class="overflow-x-auto"><table id="${prefix}-report-table" class="report-table w-full"><thead class="bg-slate-50"><tr><th>Tax Rate</th><th>Description</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr></thead><tbody id="${prefix}-report-body"></tbody></table></div></section>`;
    document.getElementById('sales-breakdown-host')!.innerHTML = breakdown('gst', 'Sales GST Breakdown', false);
    document.getElementById('purchase-breakdown-host')!.innerHTML = breakdown('purchase-gst', 'Purchase GST Breakdown', true);

    const details = (containerId: string, tableId: string, bodyId: string, title: string, labels: string[]) => `<section id="${containerId}" style="display:none" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6"><div class="px-6 py-4 border-b"><h2 class="text-sm font-bold uppercase tracking-wider text-slate-800">${title}</h2></div><div class="overflow-x-auto"><table id="${tableId}" class="report-table w-full"><thead class="bg-slate-50"><tr>${labels.map(label => `<th>${label}</th>`).join('')}</tr></thead><tbody id="${bodyId}"></tbody></table></div></section>`;
    document.getElementById('sales-details-host')!.innerHTML = details('gst-invoice-details', 'gst-invoice-table', 'gst-invoice-body', 'Invoice Details', ['Invoice No.','Date','Customer','Taxable Value','CGST','SGST','Total']);
    document.getElementById('purchase-details-host')!.innerHTML = details('purchase-gst-details', 'purchase-gst-details-table', 'purchase-gst-details-body', 'Purchase Details', ['PO No.','Date','Supplier','Taxable Value','CGST','SGST','Total']);

    (window as any).gstReportComponent?.init();
    (window as any).purchaseGstReportComponent?.init();

    const selector = document.getElementById('gst-report-type') as HTMLSelectElement | null;
    const sales = document.getElementById('sales-gst-panel');
    const purchase = document.getElementById('purchase-gst-panel');
    const subtitle = document.getElementById('gst-page-subtitle');

    const switchReport = () => {
        const isPurchase = selector?.value === 'purchase';
        sales?.classList.toggle('hidden', isPurchase);
        purchase?.classList.toggle('hidden', !isPurchase);
        if (subtitle) subtitle.textContent = isPurchase ? 'Purchase input-tax summary and breakdown' : 'Sales output-tax summary and breakdown';
    };
    selector?.addEventListener('change', switchReport);
    switchReport();
    document.getElementById('home-btn')?.addEventListener('click', () => window.location.href = '/dashboard');
});
