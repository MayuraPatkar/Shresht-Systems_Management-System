// @ts-nocheck
/**
 * Quotation Module - Table & Card Rendering
 * Handles the home screen list: card creation, rendering, and deletion.
 */

class QuotationTable {
    constructor() {}

    getStatusBadge(status: string): string {
        const styles: any = {
            Draft: 'bg-gray-100 text-gray-700 border-gray-200',
            Sent: 'bg-blue-100 text-blue-700 border-blue-200',
            Approved: 'bg-green-100 text-green-700 border-green-200',
            Rejected: 'bg-red-100 text-red-700 border-red-200',
            Converted: 'bg-purple-100 text-purple-700 border-purple-200',
            Expired: 'bg-orange-100 text-orange-700 border-orange-200'
        };
        const safeStatus = status || 'Draft';
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[safeStatus] || styles.Draft}">${safeStatus}</span>`;
    }

    // Render quotations in the list
    renderQuotations(quotations: any[]) {
        const quotationListDiv = document.querySelector(".records") as HTMLElement;
        if (!quotationListDiv) return;

        quotationListDiv.innerHTML = "";
        if (!quotations || quotations.length === 0) {
            quotationListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                    <div class="text-purple-500 text-5xl mb-4">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Quotations Found</h2>
                    <p class="text-gray-600">Start creating professional quotations for your clients</p>
                </div>
            `;
            return;
        }
        quotations.forEach((quotation: any) => {
            const quotationCard = this.createQuotationCard(quotation);
            quotationListDiv.appendChild(quotationCard);
        });
    }

    // Create a quotation card element
    createQuotationCard(quotation: any): HTMLElement {
        const quotationCard = document.createElement("div");
    quotationCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-400 overflow-hidden fade-in";

    // Format the date for display
    const formattedDate = quotation.quotation_date ? formatDateIndian(quotation.quotation_date) : '-';
    
    // Map fields from backend structure
    const quotationId = quotation.quotation_no || quotation.quotation_id || 'N/A';
    const customerName = quotation.customer_snapshot?.name || quotation.customer_name || '-';
    const customerAddress = quotation.customer_snapshot?.billing_address?.line1 || quotation.customer_address || '-';
    const totalAmountTax = quotation.totals?.grand_total || quotation.total_amount_tax || 0;
    const status = quotation.quotation_status || 'Draft';
    const validTill = quotation.valid_till ? formatDateIndian(quotation.valid_till) : '-';

    quotationCard.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-l-lg"></div>
            <div class="relative p-5 flex-1">
            <!-- Top Row: Header with Title & Actions -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
                        <i class="fas fa-file-invoice text-lg text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 truncate" title="${quotation.project_name}">${quotation.project_name}</h3>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">
                    <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn duplicate-btn px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 hover:border-indigo-400" title="Clone Quotation">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn convert-btn px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Convert to Invoice" ${status === 'Converted' ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''}>
                        <i class="fas fa-file-invoice-dollar"></i>
                    </button>
                    <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            
            <!-- ID & Date Row -->
            <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-purple-600 copy-text transition-colors" title="Click to copy ID">
                    ${quotationId}
                    <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                </span>
                ${this.getStatusBadge(status)}
                <span class="text-xs text-gray-500">
                    <i class="fas fa-hourglass-half mr-1"></i>${validTill}
                </span>
            </div>
            
            <!-- Bottom Row: Customer & Amount -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-blue-600 text-xs"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${customerName}">${customerName}</p>
                        <p class="text-xs text-gray-500 truncate" title="${customerAddress}">${customerAddress}</p>
                    </div>
                </div>
                
                <div class="flex-shrink-0 ml-4 text-right">
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                    <p class="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">₹${formatIndian(totalAmountTax, 2)}</p>
                </div>
            </div>
        </div>
        </div>
    `;

    const copyElement = quotationCard.querySelector('.copy-text') as HTMLElement;
    const viewBtn = quotationCard.querySelector('.view-btn') as HTMLElement;
    const duplicateBtn = quotationCard.querySelector('.duplicate-btn') as HTMLElement;
    const editBtn = quotationCard.querySelector('.edit-btn') as HTMLElement;
    const convertBtn = quotationCard.querySelector('.convert-btn') as HTMLButtonElement;
    const deleteBtn = quotationCard.querySelector('.delete-btn') as HTMLElement;

    // Copy ID functionality
    copyElement?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(quotationId);
            showToast('ID Copied to Clipboard!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Action button handlers - view with default type (1 = Without Tax)
    viewBtn?.addEventListener('click', () => {
        viewQuotation(quotationId, 1);
    });

    duplicateBtn?.addEventListener('click', () => {
        sessionStorage.setItem('currentTab-status', 'clone');
        cloneQuotation(quotationId);
    });

        editBtn?.addEventListener('click', () => {
            sessionStorage.setItem('currentTab-status', 'update');
            openQuotation(quotationId);
        });

        convertBtn?.addEventListener('click', async () => {
            if (convertBtn.disabled) return;
            try {
                const response = await fetch(`/quotation/${quotationId}/convert-to-invoice`, { method: 'POST' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to convert quotation');
                showToast(`Converted to invoice ${data.invoice_no || data.invoice_id || ''}`);
                if (typeof loadRecentQuotations === 'function') loadRecentQuotations();
            } catch (error) {
                console.error('Quotation conversion failed', error);
                (window as any).electronAPI?.showAlert1(error.message || 'Failed to convert quotation.');
            }
        });

        deleteBtn?.addEventListener('click', () => {
            (window as any).electronAPI.showAlert2('Are you sure you want to delete this quotation?');
            if ((window as any).electronAPI) {
                (window as any).electronAPI.receiveAlertResponse((response: string) => {
                    if (response === "Yes") {
                        this.deleteQuotation(quotationId);
                    }
                });
            }
        });

        return quotationCard;
    }

    // Delete a quotation
    deleteQuotation(quotationId: string) {
        deleteDocument('quotation', quotationId, 'Quotation', () => {
            if (typeof loadRecentQuotations === 'function') {
                loadRecentQuotations();
            }
        });
    }
}

// Export instance globally
(window as any).quotationTable = new QuotationTable();
