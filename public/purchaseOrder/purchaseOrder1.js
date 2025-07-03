const purchaseOrderListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentPurchaseOrders();
    document.getElementById('newPurchase').addEventListener('click', showNewPurchaseForm);
    document.getElementById('searchInput').addEventListener('click', handleSearch);
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
        purchaseOrderListDiv.innerHTML = "<h1>No purchase orders found</h1>";
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
                <p>${purchaseOrder.purchase_date}</p>
                <p>${purchaseOrder.supplier_address}</p>
            </div>
        </div>
        <select class="actions" onchange="handleAction(this, '${purchaseOrder.purchase_order_id}')">
        <option value="" disabled selected>Actions</option>
        <option class="open-wayBill" data-id="${purchaseOrder.purchase_order_id}" value="view">View</option>
        <option class="delete-wayBill" data-id="${purchaseOrder.purchase_order_id}" value="update">Update</option>
        <option class="delete-wayBill" data-id="${purchaseOrder.purchase_order_id}" value="delete">Delete</option>
        </select>
    `;

    return purchaseOrderDiv;
}

function handleAction(select, id) {
    const action = select.value;
    if (action === "view") {
        viewPurchaceOrder(id);
    } else if (action === "update") {
        openPurchaseOrder(id);
    }
    else if (action === "delete") {
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

// Function to generate the purchase order preview (for view block)
function generatePurchaseOrderViewPreview(purchaseOrder) {
    let itemsHTML = "";
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalPrice = 0;

    // Detect if any item has tax
    let hasTax = (purchaseOrder.items || []).some(item => Number(item.rate) > 0);

    (purchaseOrder.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnSac = item.HSN_SAC || item.hsn_sac || "-";
        const qty = parseFloat(item.quantity || "0");
        const unitPrice = parseFloat(item.unitPrice || item.UnitPrice || "0");
        const rate = parseFloat(item.rate || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalTax = totalCGST + totalSGST;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${taxableValue.toFixed(2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    let totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total Tax:</strong> ₹${totalTax.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${totalPrice.toFixed(2)}</p>
    `;

    document.getElementById("preview-content2").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Purchase Order #${purchaseOrder.purchase_order_id || purchaseOrder.Id || ""}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong></p>
                <p>${purchaseOrder.supplier_name || ""}</p>
                <p>${purchaseOrder.supplier_address || ""}</p>
                <p>Ph: ${purchaseOrder.supplier_phone || ""}</p>
                <p>GSTIN: ${purchaseOrder.supplier_GSTIN || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Date:</strong> ${purchaseOrder.date || new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="second-section">
        <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                ${hasTax ? `
                    <th>Taxable Value (₹)</th>
                    <th>Tax Rate (%)</th>` : ""}
                <th>Total Price (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
        </table>
        </div>
        <div class="third-section">
        <div class="totals-section" style="text-align: right;">
            ${totalsHTML}
        </div>
        </div>
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <footer>
            <p>This is a computer-generated purchase order</p>
        </footer>
    </div>`;
}
// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content2").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content2").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
            let name = 'PurchaseOrder';
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

async function viewPurchaceOrder(purchaseOrderId) {
    try {
        const response = await fetch(`/purchaseOrder/${purchaseOrderId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch purchase order");
        }

        const data = await response.json();
        const purchaseOrder = data.purchaseOrder;

        // Hide other sections, show view section
        document.getElementById('viewPreview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        document.getElementById('detail-projectId').textContent = purchaseOrder.purchase_order_id || '';
        document.getElementById('detail-invoiceId').textContent = purchaseOrder.purchase_invoice_id || '';
        document.getElementById('detail-purchaseDate').textContent = purchaseOrder.date || new Date().toLocaleDateString();

        // Supplier Details
        document.getElementById('detail-buyerName').textContent = purchaseOrder.supplier_name || '';
        document.getElementById('detail-buyerAddress').textContent = purchaseOrder.supplier_address || '';
        document.getElementById('detail-buyerPhone').textContent = purchaseOrder.supplier_phone || '';
        document.getElementById('detail-buyerEmail').textContent = purchaseOrder.supplier_email || '';
        document.getElementById('detail-buyerGSTIN').textContent = purchaseOrder.supplier_GSTIN || '';

        // Fill Item List
        const detailItemsTableBody = document.querySelector("#detail-items-table tbody");
        detailItemsTableBody.innerHTML = "";

        (purchaseOrder.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || ''}</td>
                <td>${item.HSN_SAC || item.hsn_sac || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.unitPrice || item.UnitPrice || ''}</td>
                <td>${item.rate || ''}</td>
            `;
            detailItemsTableBody.appendChild(row);
        });

        // Generate the preview for print/PDF
        generatePurchaseOrderViewPreview(purchaseOrder);

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            window.print();
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            window.print();
        };

    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI?.showAlert1("Failed to fetch purchase order. Please try again later.");
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
    document.getElementById('newPurchase').style.display = 'none';
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
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
        purchaseOrders.forEach(purchaseOrder => {
            const purchaseOrderDiv = createPurchaseOrderDiv(purchaseOrder);
            purchaseOrderListDiv.appendChild(purchaseOrderDiv);
        });
    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI.showAlert1("Failed to fetch purchase order. Please try again later.");
    }
}

document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
    }
});