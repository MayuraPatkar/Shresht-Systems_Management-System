const purchaseOrderListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentPurchaseOrders();
    document.getElementById('new-purchase').addEventListener('click', showNewPurchaseForm);
    document.getElementById('home-btn')?.addEventListener('click', () => {
        window.location = '/purchaseOrder';
    });
    document.getElementById('search-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
});

// Load recent purchase orders from the server
async function loadRecentPurchaseOrders() {
    try {
        const response = await fetch(`/purchaseOrder/recent-purchase-orders`);
        if (!response.ok) {
            purchaseOrderListDiv.innerHTML = "<div class='text-center py-12'><i class='fas fa-inbox text-gray-400 text-6xl mb-4'></i><p class='text-gray-500 text-lg'>No Purchase Orders Found.</p></div>";
            return;
        }

        const data = await response.json();
        renderPurchaseOrders(data.purchaseOrder);
    } catch (error) {
        console.error("Error loading purchase orders:", error);
        purchaseOrderListDiv.innerHTML = "<div class='text-center py-12'><i class='fas fa-exclamation-triangle text-red-400 text-6xl mb-4'></i><p class='text-red-500 text-lg'>Failed to load purchase orders. Please try again later.</p></div>";
    }
}

// Render purchase orders in the list
function renderPurchaseOrders(purchaseOrders) {
    purchaseOrderListDiv.innerHTML = "";
    if (!purchaseOrders || purchaseOrders.length === 0) {
        purchaseOrderListDiv.innerHTML = "<div class='text-center py-12'><i class='fas fa-inbox text-gray-400 text-6xl mb-4'></i><h1 class='text-gray-500 text-2xl'>No Purchase Orders Found</h1></div>";
        return;
    }
    purchaseOrders.forEach(purchaseOrder => {
        const purchaseOrderDiv = createPurchaseOrderDiv(purchaseOrder);
        purchaseOrderListDiv.appendChild(purchaseOrderDiv);
    });
}

// Create a purchase order div element
function createPurchaseOrderDiv(purchaseOrder) {
    const purchaseOrderDiv = document.createElement("div");
    purchaseOrderDiv.className = "bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow fade-in";
    purchaseOrderDiv.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex items-start gap-4 flex-1">
                <div class="bg-purple-100 p-3 rounded-lg">
                    <i class="fas fa-shopping-cart text-purple-600 text-2xl"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-1">${purchaseOrder.supplier_name}</h3>
                            <p class="text-sm text-gray-500 font-mono">${purchaseOrder.purchase_order_id}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Purchase Date</p>
                            <p class="text-sm font-semibold text-gray-700">${formatDate(purchaseOrder.purchase_date)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Address</p>
                            <p class="text-sm text-gray-700">${purchaseOrder.supplier_address}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Total Amount</p>
                            <p class="text-lg font-bold text-green-600">₹ ${formatIndian(purchaseOrder.total_amount, 2)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <select class="ml-4 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer actions">
                <option value="" disabled selected>Actions</option>
                <option value="view">👁️ View</option>
                <option value="update">✏️ Update</option>
                <option value="delete">🗑️ Delete</option>
            </select>
        </div>
    `;

    // Attach event handler for actions
    purchaseOrderDiv.querySelector('.actions').addEventListener('change', function () {
        handleAction(this, purchaseOrder.purchase_order_id);
    });

    return purchaseOrderDiv;
}

function handleAction(select, purchaseOrderId) {
    const action = select.value;
    if (action === "view") {
        viewPurchaseOrder(purchaseOrderId);
    } else if (action === "update") {
        openPurchaseOrder(purchaseOrderId);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this purchase order?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deletePurchaseOrder(purchaseOrderId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

// Delete a purchase order
async function deletePurchaseOrder(purchaseOrderId) {
    await deleteDocument('purchaseOrder', purchaseOrderId, 'Purchase Order', loadRecentPurchaseOrders);
}

// Show the new purchase order form
function showNewPurchaseForm() {
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-purchase'
    });
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    await searchDocuments('purchaseOrder', query, purchaseOrderListDiv, createPurchaseOrderDiv, 'No purchase order found');
}

// NOTE: formatDate has been moved to public/js/shared/utils.js
// It is now available globally via window.formatDate
