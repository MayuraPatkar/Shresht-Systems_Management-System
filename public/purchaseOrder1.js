// Redirect to dashboard when logo is clicked
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

const purchaseOrderListDiv = document.querySelector(".records .record_list");

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
    purchaseOrderDiv.style.padding = "1rem";
    purchaseOrderDiv.style.marginBottom = "1rem";
    purchaseOrderDiv.style.border = "1px solid #ddd";
    purchaseOrderDiv.style.borderRadius = "10px";
    purchaseOrderDiv.style.cursor = "pointer";
    purchaseOrderDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
    purchaseOrderDiv.style.transition = "background-color 0.3s";

    purchaseOrderDiv.addEventListener("mouseenter", () => {
        purchaseOrderDiv.style.backgroundColor = "#f0f8ff";
    });
    purchaseOrderDiv.addEventListener("mouseleave", () => {
        purchaseOrderDiv.style.backgroundColor = "#fff";
    });

    purchaseOrderDiv.innerHTML = `
        <h4>${purchaseOrder.project_name}</h4>
        <p>ID #: ${purchaseOrder.purchase_order_id}</p>
        <button class="btn btn-primary open-purchase-order" data-id="${purchaseOrder.purchase_order_id}">Open</button>
        <button class="btn btn-danger delete-purchase-order" data-id="${purchaseOrder.purchase_order_id}">Delete</button>
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

        document.getElementById('purchaseOrderId').value = purchaseOrder.purchase_order_id;
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
                <td><input type="text" value="${item.unitPrice}" required></td>
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

// Show a confirmation box
function showConfirmBox(message, onConfirm, onCancel) {
    const confirmBox = document.getElementById('confirm_box');
    const messageElement = document.getElementById('message');
    const yesButton = document.getElementById('yes');
    const noButton = document.getElementById('no');

    messageElement.textContent = message;
    confirmBox.style.display = 'block';

    yesButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    noButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onCancel) onCancel();
    };
}

// Show the new purchase order form
function showNewPurchaseForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
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