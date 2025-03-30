const purchaseOrderListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentPurchaseOrders();

    purchaseOrderListDiv.addEventListener("click", handlePurchaseOrderListClick);
    document.getElementById('newPurchase').addEventListener('click', showNewPurchaseForm);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
});

// Load recent purchase orders from the server
async function loadRecentPurchaseOrders() {
    try {
        const response = await fetch(`/purchaseOrder/recent-purchase-orders`);
        if (!response.ok) {
            purchaseOrderListDiv.innerHTML = "<p>NO purchase order found.</p>";
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
    if (purchaseOrders.length === 0) {
        purchaseOrderListDiv.innerHTML = "<h3>No purchase orders found</h3>";
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
        <img src="./assets/economy-forecast.png" alt="Icon">
    </div>
        <div class="details">
            <div class="info1">
                <h1>${purchaseOrder.project_name}</h1>
                <h4>#${purchaseOrder.purchase_order_id}</h4>
            </div>
            <div class="info2">
                <p>${purchaseOrder.supplier_name}</p>
                <p>${purchaseOrder.supplier_address}</p>
            </div>
        </div>
        <div class="actions">
            <button class="btn btn-primary open-purchase-order" data-id="${purchaseOrder.purchase_order_id}">Open</button>
            <button class="btn btn-danger delete-purchase-order" data-id="${purchaseOrder.purchase_order_id}">Delete</button>
        </div>
    `;

    return purchaseOrderDiv;
}

// Handle click events on the purchase order list
async function handlePurchaseOrderListClick(event) {
    const target = event.target;
    const purchaseOrderId = target.getAttribute("data-id");

    if (target.classList.contains("open-purchase-order")) {
        await openPurchaseOrder(purchaseOrderId);
    } else if (target.classList.contains("delete-purchase-order")) {
        showConfirmBox('Are you sure you want to delete this purchase order?', async () => {
            await deletePurchaseOrder(purchaseOrderId);
            loadRecentPurchaseOrders();
        });
    }
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
        document.getElementById('newPurchase').style.display = 'none';
        document.getElementById('viewPreview').style.display = 'block';
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;

        document.getElementById('Id').value = purchaseOrder.purchase_order_id;
        document.getElementById('projectName').value = purchaseOrder.project_name;
        document.getElementById('handledBy').value = purchaseOrder.handledBy;
        document.getElementById('supplierName').value = purchaseOrder.supplier_name;
        document.getElementById('supplierAddress').value = purchaseOrder.supplier_address;
        document.getElementById('supplierPhone').value = purchaseOrder.supplier_phone;
        document.getElementById('supplierEmail').value = purchaseOrder.supplier_email;
        document.getElementById('supplierGSTIN').value = purchaseOrder.supplier_GSTIN;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        purchaseOrder.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unitPrice}" required></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;

            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI.showAlert("Failed to fetch purchase order. Please try again later.");
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

        window.electronAPI.showAlert("Purchase order deleted successfully");
        loadRecentPurchaseOrders();
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        window.electronAPI.showAlert("Failed to delete purchase order. Please try again later.");
    }
}

// Show the new purchase order form
function showNewPurchaseForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('newPurchase').style.display = 'none';
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        window.electronAPI.showAlert("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/purchaseOrder/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            purchaseOrderListDiv.innerHTML = `<p>${errorText}</p>`;
            return;
        }

        const data = await response.json();
        const purchaseOrders = data.purchaseOrder;
        purchaseOrderListDiv.innerHTML = "";
        purchaseOrders.forEach(purchaseOrder => {
            const purchaseOrderDiv = createPurchaseOrderDiv(purchaseOrder);
            purchaseOrderListDiv.appendChild(purchaseOrderDiv);
        });
    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI.showAlert("Failed to fetch purchase order. Please try again later.");
    }
}

document.getElementById("searchInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
    }
});