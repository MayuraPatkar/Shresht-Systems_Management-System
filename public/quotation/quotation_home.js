const quotationListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    document.getElementById('new-quotation').addEventListener('click', showNewQuotationForm);

    // Attach search to Enter key only, not click
    document.getElementById('search-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
});

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotations");
        }

        const data = await response.json();
        renderQuotations(data.quotation);
    } catch (error) {
        console.error("Error loading quotations:", error);
        quotationListDiv.innerHTML = "<p>Failed to load quotations. Please try again later.</p>";
    }
}

// Render quotations in the list
function renderQuotations(quotations) {
    quotationListDiv.innerHTML = "";
    if (!quotations || quotations.length === 0) {
        quotationListDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                    <i class="fas fa-file-invoice text-4xl text-purple-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Quotations Found</h2>
                <p class="text-gray-600 mb-6">Start creating professional quotations for your clients</p>
                <button onclick="document.getElementById('new-quotation').click()" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold">
                    <i class="fas fa-plus mr-2"></i>Create First Quotation
                </button>
            </div>
        `;
        return;
    }
    quotations.forEach(quotation => {
        const quotationCard = createQuotationCard(quotation);
        quotationListDiv.appendChild(quotationCard);
    });
}

document.getElementById('home-btn').addEventListener('click', () => {
    sessionStorage.removeItem('currentTab-status');
    window.location = '/quotation';
});

// Global toast function
function showToast(message) {
    const existingToast = document.getElementById('global-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.textContent = message;
    toast.style.cssText = 'display:none;position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
    document.body.appendChild(toast);
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
        toast.remove();
    }, 2000);
}

// Create a quotation card element
function createQuotationCard(quotation) {
    const quotationCard = document.createElement("div");
    quotationCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-400 overflow-hidden fade-in";
    
    quotationCard.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-purple-500 to-indigo-600"></div>
            
            <div class="flex-1 p-6">
                <!-- Main Content Row -->
                <div class="flex items-center justify-between gap-6">
                    
                    <!-- Left Section: Icon + Project Info -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-file-invoice text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-bold text-gray-900 mb-1 truncate">${quotation.project_name}</h3>
                            <p class="text-sm text-gray-600 cursor-pointer hover:text-purple-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                                <i class="fas fa-hashtag text-xs"></i>
                                <span>${quotation.quotation_id}</span>
                                <i class="fas fa-copy text-xs ml-1"></i>
                            </p>
                        </div>
                    </div>

                    <!-- Middle Section: Customer Info -->
                    <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Customer</p>
                            <p class="text-sm font-semibold text-gray-900 truncate">${quotation.customer_name}</p>
                            <p class="text-xs text-gray-600 truncate">${quotation.customer_address}</p>
                        </div>
                    </div>

                    <!-- Amount Section -->
                    <div class="flex items-center gap-3 px-6 border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-rupee-sign text-purple-600"></i>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Amount</p>
                            <p class="text-lg font-bold text-purple-600">₹ ${formatIndian(quotation.total_amount_tax, 2)}</p>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn view-tax-btn px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="View With Tax">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </button>
                        <button class="action-btn compact-btn px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all border border-orange-200 hover:border-orange-400" title="Compact View">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const copyElement = quotationCard.querySelector('.copy-text');
    const viewBtn = quotationCard.querySelector('.view-btn');
    const viewTaxBtn = quotationCard.querySelector('.view-tax-btn');
    const compactBtn = quotationCard.querySelector('.compact-btn');
    const editBtn = quotationCard.querySelector('.edit-btn');
    const deleteBtn = quotationCard.querySelector('.delete-btn');

    // Copy ID functionality
    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(quotation.quotation_id);
            showToast('ID Copied to Clipboard!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Action button handlers
    viewBtn.addEventListener('click', () => {
        viewQuotation(quotation.quotation_id, 1);
    });

    viewTaxBtn.addEventListener('click', () => {
        viewQuotation(quotation.quotation_id, 2);
    });

    compactBtn.addEventListener('click', () => {
        viewQuotation(quotation.quotation_id, 3);
    });

    editBtn.addEventListener('click', () => {
        sessionStorage.setItem('currentTab-status', 'update');
        openQuotation(quotation.quotation_id);
    });

    deleteBtn.addEventListener('click', () => {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteQuotation(quotation.quotation_id);
                }
            });
        }
    });

    return quotationCard;
}

// Delete a quotation
async function deleteQuotation(quotationId) {
    await deleteDocument('quotation', quotationId, 'Quotation', loadRecentQuotations);
}

// Show the new quotation form
function showNewQuotationForm() {
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-quotation',
        previewButtonId: 'view-preview',
        viewId: 'view',
        stepIndicatorId: 'step-indicator',
        currentStep: typeof currentStep !== 'undefined' ? currentStep : undefined,
        totalSteps: typeof totalSteps !== 'undefined' ? totalSteps : undefined
    });
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    await searchDocuments('quotation', query, quotationListDiv, createQuotationCard, 'No quotation found');
}