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
    <div class="details">
        <div class="info1">
            <h1>${purchaseOrder.supplier_name}</h1>
            <h4>#${purchaseOrder.purchase_order_id}</h4>
        </div>
        <div class="info2">
            <p>${formatDate(purchaseOrder.purchase_date)}</p>
            <p>${purchaseOrder.supplier_address}</p>
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

// Open a purchase order for editing
async function openPurchaseOrder(purchaseOrderId) {
    try {
        const response = await fetch(`/purchaseOrder/${purchaseOrderId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch purchase order");
        }

        const data = await response.json();
        const purchaseOrder = data.purchaseOrder;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-purchase').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;

        document.getElementById('id').value = purchaseOrder.purchase_order_id;
        document.getElementById('purchase-invoice-id').value = purchaseOrder.purchase_invoice_id;
        document.getElementById('purchase-date').value = formatDate(purchaseOrder.purchase_date);
        document.getElementById('supplier-name').value = purchaseOrder.supplier_name;
        document.getElementById('supplier-address').value = purchaseOrder.supplier_address;
        document.getElementById('supplier-phone').value = purchaseOrder.supplier_phone;
        document.getElementById('supplier-email').value = purchaseOrder.supplier_email;
        document.getElementById('supplier-GSTIN').value = purchaseOrder.supplier_GSTIN;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        (purchaseOrder.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI.showAlert1("Failed to fetch purchase order. Please try again later.");
    }
}

// Delete a purchase order
async function deletePurchaseOrder(purchaseOrderId) {
    try {
        const response = await fetch(`/purchaseOrder/${purchaseOrderId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete purchase order");
        }

        window.electronAPI.showAlert1("Purchase order deleted successfully");
        loadRecentPurchaseOrders();
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        window.electronAPI.showAlert1("Failed to delete purchase order. Please try again later.");
    }
}

// Show the new purchase order form
function showNewPurchaseForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-purchase').style.display = 'none';
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/purchaseOrder/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            purchaseOrderListDiv.innerHTML = `<h1>${errorText}</h1>`;
            return;
        }

        const data = await response.json();
        const purchaseOrders = data.purchaseOrder;
        purchaseOrderListDiv.innerHTML = "";
        (purchaseOrders || []).forEach(purchaseOrder => {
            const purchaseOrderDiv = createPurchaseOrderDiv(purchaseOrder);
            purchaseOrderListDiv.appendChild(purchaseOrderDiv);
        });
    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI.showAlert1("Failed to fetch purchase order. Please try again later.");
    }
}

// Utility: format date as yyyy-mm-dd for input fields
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}