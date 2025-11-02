const purchaseOrderListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentPurchaseOrders();
    document.getElementById('new-purchase').addEventListener('click', showNewPurchaseForm);
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
            purchaseOrderListDiv.innerHTML = "<p>No Purchase Orders Found.</p>";
            return;
        }

        const data = await response.json();
        renderPurchaseOrders(data.purchaseOrder);
    } catch (error) {
        console.error("Error loading purchase orders:", error);
        purchaseOrderListDiv.innerHTML = "<p>Failed to load purchase orders. Please try again later.</p>";
    }
}

// Render purchase orders in the list
function renderPurchaseOrders(purchaseOrders) {
    purchaseOrderListDiv.innerHTML = "";
    if (!purchaseOrders || purchaseOrders.length === 0) {
        purchaseOrderListDiv.innerHTML = "<h1>No Purchase Orders Found</h1>";
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
    purchaseOrderDiv.className = "record-item";
    purchaseOrderDiv.innerHTML = `
    <div class="paid-icon">
        <img src="../assets/economy-forecast.png" alt="Icon">
    </div>
    <div class="record-item-details">
        <div class="record-item-info-2">
            <h2>Supplier</h2>
            <p>${purchaseOrder.supplier_name}</p>
            <p>${purchaseOrder.purchase_order_id}</p>
        </div>
    </div>
        <div class="record-item-details">
            <div class="record-item-info-2">
            <h2>About</h2>
            <p>${formatDate(purchaseOrder.purchase_date)}</p>
            <p>${purchaseOrder.supplier_address}</p>
        </div>
    </div>
    <div class="record-item-details">
            <div class="record-item-info-2">
            <h2>Amount</h2>
                 <p>₹ ${formatIndian(purchaseOrder.total_amount, 2)}</p>
            </div>
        </div>
        </div>
    <select class="actions">
        <option value="" disabled selected>Actions</option>
        <option value="view">View</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
    </select>
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
