// quotation_home.js
// Removed helper functions (now in quotation_utils.js)

/**
 * Home / Listing script for Quotations
 * - Loads recent quotations
 * - Renders cards with actions (view, view with tax, compact, edit, delete)
 * - Handles search (Enter key)
 *
 * Relies on:
 * - formatIndian(amount, digits) (from quotation_utils.js)
 * - showToast(message) (from quotation_utils.js)
 * - escapeHtml(str) (from quotation_utils.js)
 * - openQuotation(quotationId) (from quotation_form.js)
 * - viewQuotation(quotationId, viewType) (from quotation_view.js)
 * - deleteDocument(type, id, label, callback) or fallback HTTP delete
 */

/* Root container where quotation cards are rendered */
const quotationListDiv = document.querySelector(".records");

/* Initialize when DOM ready */
document.addEventListener("DOMContentLoaded", () => {
  loadRecentQuotations();

  // New quotation button
  const newBtn = document.getElementById('new-quotation');
  if (newBtn) newBtn.addEventListener('click', showNewQuotationForm);

  // Home button
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'none';
        document.getElementById('home').style.display = 'block';
        loadRecentQuotations(); // Refresh list
    });
  }

  // Search input: trigger search when Enter pressed
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    });
  }
});

/* Fetch recent quotations from server and render */
async function loadRecentQuotations() {
  if (!quotationListDiv) return;
  quotationListDiv.innerHTML = "<p>Loading quotations...</p>"; // Loading state
  try {
    const response = await fetch(`/quotation/recent-quotations`);
    if (!response.ok) throw new Error("Failed to fetch quotations");

    const data = await response.json();
    renderQuotations(data.quotation || []);
  } catch (error) {
    console.error("Error loading quotations:", error);
    if (quotationListDiv) {
      quotationListDiv.innerHTML = "<p>Failed to load quotations. Please try again later.</p>";
    }
  }
}

/* Render multiple quotations */
function renderQuotations(quotations) {
  if (!quotationListDiv) return;
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

  quotations.forEach(q => {
    const card = createQuotationCard(q);
    quotationListDiv.appendChild(card);
  });
}

/* Create a single quotation card element */
function createQuotationCard(quotation) {
  const quotationCard = document.createElement("div");
  quotationCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-400 overflow-hidden fade-in";

  // Safely render content (uses escapeHtml and formatIndian from utils)
  const projectName = escapeHtml(quotation.project_name || '-');
  const quotationId = escapeHtml(quotation.quotation_id || '-');
  const customerName = escapeHtml(quotation.customer_name || '-');
  const customerAddress = escapeHtml(quotation.customer_address || '-');
  const amount = typeof quotation.total_amount_tax !== 'undefined' ? formatIndian(quotation.total_amount_tax, 2) : '0.00';

  quotationCard.innerHTML = `
    <div class="flex">
        <div class="w-1.5 bg-gradient-to-b from-purple-500 to-indigo-600"></div>
        <div class="flex-1 p-6">
            <div class="flex items-center justify-between gap-6">
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                        <i class="fas fa-file-invoice text-2xl text-white"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-bold text-gray-900 mb-1 truncate">${projectName}</h3>
                        <p class="text-sm text-gray-600 cursor-pointer hover:text-purple-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                            <i class="fas fa-hashtag text-xs"></i>
                            <span class="quotation-id-text">${quotationId}</span>
                            <i class="fas fa-copy text-xs ml-1"></i>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Customer</p>
                        <p class="text-sm font-semibold text-gray-900 truncate">${customerName}</p>
                        <p class="text-xs text-gray-600 truncate">${customerAddress}</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 px-6 border-r border-gray-200">
                    <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-rupee-sign text-purple-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Amount</p>
                        <p class="text-lg font-bold text-purple-600">₹ ${amount}</p>
                    </div>
                </div>

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

  // Element refs
  const copyElement = quotationCard.querySelector('.copy-text');
  const viewBtn = quotationCard.querySelector('.view-btn');
  const viewTaxBtn = quotationCard.querySelector('.view-tax-btn');
  const compactBtn = quotationCard.querySelector('.compact-btn');
  const editBtn = quotationCard.querySelector('.edit-btn');
  const deleteBtn = quotationCard.querySelector('.delete-btn');

  // Copy ID functionality
  if (copyElement) {
    copyElement.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(quotation.quotation_id);
        showToast('ID Copied to Clipboard!'); // Relies on utils
      } catch (err) {
        console.error('Copy failed', err);
      }
    });
  }

  // View buttons (rely on viewQuotation from quotation_view.js)
  if (viewBtn) viewBtn.addEventListener('click', () => viewQuotation(quotation.quotation_id, 1));
  if (viewTaxBtn) viewTaxBtn.addEventListener('click', () => viewQuotation(quotation.quotation_id, 2)); // FIXED: Was 1, now 2
  if (compactBtn) compactBtn.addEventListener('click', () => viewQuotation(quotation.quotation_id, 3));

  // Edit button (rely on openQuotation from quotation_form.js)
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      sessionStorage.setItem('currentTab-status', 'update');
      if (typeof openQuotation === "function") openQuotation(quotation.quotation_id);
      else console.warn("openQuotation not available");
    });
  }

  // Delete button
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      // Ask for confirmation
      if (window.electronAPI?.showAlert2) {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        window.electronAPI.receiveAlertResponse((response) => {
          if (response === "Yes") {
            deleteQuotation(quotation.quotation_id);
          }
        });
      } else {
        const confirmed = confirm('Are you sure you want to delete this quotation?');
        if (confirmed) deleteQuotation(quotation.quotation_id);
      }
    });
  }

  return quotationCard;
}

/* Delete a quotation and refresh list */
async function deleteQuotation(quotationId) {
  // deleteDocument is expected to be a shared helper
  if (typeof deleteDocument === "function") {
    await deleteDocument('quotation', quotationId, 'Quotation', loadRecentQuotations);
    showToast("Quotation deleted");
  } else {
    // fallback: call API directly
    try {
      const res = await fetch(`/quotation/${quotationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Quotation deleted");
      loadRecentQuotations();
    } catch (err) {
      console.error("Delete failed", err);
      showToast("Failed to delete quotation", "error");
    }
  }
}

/* Show the new quotation form */
function showNewQuotationForm() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('view').style.display = 'none';
  document.getElementById('new').style.display = 'block';

  // This should be handled by the form logic itself, but good to reset
  if (typeof openQuotation === 'function') {
    // Call openQuotation with no ID to reset the form
    openQuotation(null); 
  }
}

/* Handle search */
async function handleSearch() {
  const q = (document.getElementById('search-input') || {}).value || '';
  if (!q) { loadRecentQuotations(); return; }
  
  // Use a more robust search
  await searchDocuments('quotation', q, quotationListDiv, createQuotationCard, 'No matching quotations found');
}

/* Simple search helper (fallback); */
async function searchDocuments(type, query, containerEl, cardFactory, emptyMsg) {
  try {
    const resp = await fetch(`/quotation/search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error("Search failed");
    const data = await resp.json();
    
    const quotations = data.quotation || data; // Handle both response structures
    
    if (!quotations || quotations.length === 0) {
      containerEl.innerHTML = `<p>${emptyMsg}</p>`;
      return;
    }
    containerEl.innerHTML = '';
    quotations.forEach(q => containerEl.appendChild(cardFactory(q)));
  } catch (e) {
    console.error("Search failed", e);
    containerEl.innerHTML = `<p>Search failed. Try again later.</p>`;
  }
}