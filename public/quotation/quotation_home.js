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
            <div class="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                <i class="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Quotations Found</h2>
                <p class="text-gray-500">Create your first quotation to get started</p>
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
    quotationCard.className = "bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 fade-in";
    
    quotationCard.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <i class="fas fa-file-alt text-2xl text-purple-600"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">${quotation.project_name}</h3>
                    <p class="text-sm text-gray-500 cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy">
                        <i class="fas fa-copy mr-1"></i>${quotation.quotation_id}
                    </p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                Quotation
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                    <p class="text-sm font-medium text-gray-900">${quotation.customer_name}</p>
                    <p class="text-xs text-gray-600">${quotation.customer_address}</p>
                </div>
            </div>
            
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                    <p class="text-lg font-bold text-purple-600">₹ ${formatIndian(quotation.total_amount_tax, 2)}</p>
                </div>
            </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
            <select class="quotation-actions-select w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer hover:border-purple-400 transition-colors" data-quotation-id="${quotation.quotation_id}">
                <option value="" disabled selected><i class="fas fa-ellipsis-v"></i> Actions</option>
                <option value="view">👁️ View</option>
                <option value="viewWTax">💰 View With TAX</option>
                <option value="compactView">📋 Compact View</option>
                <option value="update">✏️ Update</option>
                <option value="delete">🗑️ Delete</option>
            </select>
        </div>
    `;

    const copyElement = quotationCard.querySelector('.copy-text');

    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(quotation.quotation_id);
            showToast('Copied!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Attach event listener in JS, not inline
    quotationCard.querySelector('.quotation-actions-select').addEventListener('change', function () {
        handleQuotationAction(this, quotation.quotation_id);
    });

    return quotationCard;
}

// Handle actions from the actions dropdown
function handleQuotationAction(select, quotationId) {
    const action = select.value;
    if (action === "view") {
        viewQuotation(quotationId, 1);
    } else if (action === "viewWTax") {
        viewQuotation(quotationId, 2);
    } else if (action === "compactView") {
        viewQuotation(quotationId, 3);
    } else if (action === "update") {
        sessionStorage.setItem('currentTab-status', 'update');
        openQuotation(quotationId);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteQuotation(quotationId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
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