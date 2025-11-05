const totalSteps = 4;
let purchaseOrderId = '';
let totalAmount = 0;

document.getElementById("view-preview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Open a purchase order for editing
async function openPurchaseOrder(purchaseOrderId) {
    const data = await fetchDocumentById('purchaseOrder', purchaseOrderId);
    if (!data) return;

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
        const itemsContainer = document.getElementById("items-container");
        itemsContainer.innerHTML = "";
        let sno = 1;
        (purchaseOrder.items || []).forEach(item => {
            // Create card
            const card = document.createElement("div");
            card.className = "item-card";
            card.innerHTML = `
                <div class="item-number">${sno}</div>
                <div class="item-field description">
                    <div style="position: relative;">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                        <ul class="suggestions"></ul>
                    </div>
                </div>
                <div class="item-field hsn">
                    <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                </div>
                <div class="item-field hsn">
                    <input type="text" value="${item.company || ''}" placeholder="Company">
                </div>
                <div class="item-field hsn">
                    <input type="text" value="${item.type || ''}" placeholder="Type">
                </div>
                <div class="item-field hsn">
                    <input type="text" value="${item.category || ''}" placeholder="Category">
                </div>
                <div class="item-field qty">
                    <input type="number" value="${item.quantity}" placeholder="Qty" min="1" required>
                </div>
                <div class="item-field rate">
                    <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                </div>
                <div class="item-field rate">
                    <input type="number" value="${item.rate}" placeholder="Rate" min="0.01" step="0.01" required>
                </div>
                <button type="button" class="remove-item-btn">
                    <i class="fas fa-times"></i>
                </button>
            `;
            itemsContainer.appendChild(card);
            
            // Create hidden table row
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="text-center">${sno}</td>
                <td><input type="text" value="${item.description}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.HSN_SAC}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.company || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.type || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.category || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.quantity}" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.unit_price}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"><i class="fas fa-trash"></i></button></td>
            `;
            itemsTableBody.appendChild(row);
            
            // Sync card inputs with table inputs
            const cardInputs = card.querySelectorAll('input');
            const rowInputs = row.querySelectorAll('input');
            cardInputs.forEach((input, index) => {
                input.addEventListener('input', () => {
                    rowInputs[index].value = input.value;
                });
            });
            
            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function() {
                card.remove();
                row.remove();
            });
            
            sno++;
        });
}

// fuction to get the quotation id
async function getId() {
    try {
        const response = await fetch("/purchaseOrder/generate-id");
        if (!response.ok) {
            throw new Error("Failed to fetch quotation id");
        }

        const data = await response.json();
        document.getElementById('id').value = data.purchase_order_id;
        purchaseOrderId = data.purchase_order_id;
        if (purchaseOrderId) generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

// Improved: Async/await for save/print, better feedback, and bug fixes
document.getElementById("save-btn").addEventListener("click", async () => {
    const purchaseOrderData = collectFormData();
    const ok = await sendToServer(purchaseOrderData);
    if (ok) window.electronAPI.showAlert1("Purchase Order saved successfully!");
});

document.getElementById("print-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        const ok = await sendToServer(purchaseOrderData);
        if (ok) window.electronAPI.handlePrintEvent(previewContent, "print", "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        const ok = await sendToServer(purchaseOrderData);
        if (ok) {
            let name = `PurchaseOrder-${purchaseOrderId}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        }
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to generate the preview
function generatePreview() {
    if (!purchaseOrderId) purchaseOrderId = document.getElementById('id').value;
    const purchaseDate = document.getElementById("purchase-date").value || new Date().toLocaleDateString();
    const purchaseInvoiceId = document.getElementById("purchase-invoice-id").value || purchaseOrderId;
    const supplierName = document.getElementById("supplier-name").value || "";
    const supplierAddress = document.getElementById("supplier-address").value || "";
    const supplierPhone = document.getElementById("supplier-phone").value || "";
    const GSTIN = document.getElementById("supplier-GSTIN").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalTaxableValue = 0;
    let roundOff = 0;

    let itemsHTML = "";
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[4].querySelector("input").value) > 0);

    for (const row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnSac = row.cells[2].querySelector("input").value || "-";
        const company = row.cells[3].querySelector("input").value || "-";
        const type = row.cells[4].querySelector("input").value || "-";
        const category = row.cells[5].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[6].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[7].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[8].querySelector("input").value || "0");
        let sno = 0;

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
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        }
    }

    const grandTotal = totalPrice;
    roundOff = Math.round(grandTotal) - grandTotal;
    totalAmount = grandTotal + roundOff;

    let totalsHTML = `
        <div class="totals-section-sub1">
            ${hasTax ? `
            <p><strong>Taxable Value: </strong></p>
            <p><strong>Total Tax: </strong></p>` : ""}
            <p><strong>Grand Total: </strong></p>
        </div>
        <div class="totals-section-sub2">
        ${hasTax ? `
        <p>₹ ${totalTaxableValue.toFixed(2)}</p>
        <p>₹ ${totalTax.toFixed(2)}</p>` : ""}
        <p>₹ ${(grandTotal + roundOff).toFixed(2)}</p>
        </div>
    `;



    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="first-section">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="second-section">
            <p>Purchase Order-${purchaseOrderId}
            </p>
        </div>

        <div class="third-section">
            <div class="buyer-details">
                <p><strong>Purchase From:</strong></p>
                <p>${supplierName}</p>
                <p>${supplierAddress}</p>
                <p>Ph: ${supplierPhone}</p>
                <p>GSTIN: ${GSTIN}</p>
            </div>
            <div class="info-section">
                <p><strong>Purchase Invoice ID:</strong> ${purchaseInvoiceId}</p>
                <p><strong>Date:</strong> ${purchaseDate}</p>
            </div>
        </div>

        <div class="fourth-section">
        <table>
        <thead>
            <tr>
                <th>S.No</th>
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

        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    <div>
                        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(grandTotal + roundOff)} Only</span></p>
                    </div>
                    <div class="bank-details"></div>
                </div>
            </div>
            <div class="totals-section">
                ${totalsHTML}
            </div>
        </div>

        <div class="eighth-section">
            <p>For SHRESHT SYSTEMS</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>

        <div class="ninth-section">
            <p>This is a computer-generated purchase order</p>
        </div>
    </div>`;
}

// Function to collect form data and send to server
async function sendToServer(data) {
    return await sendDocumentToServer("/purchaseOrder/save-purchase-order", data);
}

// Function to collect form data
function collectFormData() {
    return {
        purchaseOrderId: document.getElementById("id").value,
        purchaseInvoiceId: document.getElementById("purchase-invoice-id").value,
        purchaseDate: document.getElementById("purchase-date").value,
        supplierName: document.getElementById("supplier-name").value,
        supplierAddress: document.getElementById("supplier-address").value,
        supplierPhone: document.getElementById("supplier-phone").value,
        supplierEmail: document.getElementById("supplier-email").value,
        supplierGSTIN: document.getElementById("supplier-GSTIN").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map((row, index) => {
            const specRow = document.querySelector(`#items-specifications-table tbody tr:nth-child(${index + 1})`);
            return {
                description: row.querySelector("td:nth-child(2) input").value,
                HSN_SAC: row.querySelector("td:nth-child(3) input").value,
                company: row.querySelector("td:nth-child(4) input").value,
                type: row.querySelector("td:nth-child(5) input").value,
                category: row.querySelector("td:nth-child(6) input").value,
                quantity: row.querySelector("td:nth-child(7) input").value,
                unit_price: row.querySelector("td:nth-child(8) input").value,
                rate: row.querySelector("td:nth-child(9) input").value,
                specification: specRow ? specRow.querySelector("td:nth-child(3) input").value : ''
            };
        }),
        totalAmount: totalAmount
    };
}

// Function to populate specifications step
function populateSpecifications() {
    const itemsTableBody = document.querySelector("#items-table tbody");
    const specificationsContainer = document.getElementById("specifications-container");
    const specificationsTableBody = document.querySelector("#items-specifications-table tbody");
    specificationsContainer.innerHTML = "";
    specificationsTableBody.innerHTML = "";

    Array.from(itemsTableBody.rows).forEach((row, index) => {
        const description = row.cells[1].querySelector("input").value;
        const existingSpecification = row.dataset.specification || '';

        // Create card
        const card = document.createElement("div");
        card.className = "spec-card";
        card.innerHTML = `
            <div class="item-number">${index + 1}</div>
            <div class="spec-field description">
                <input type="text" value="${description}" readonly>
            </div>
            <div class="spec-field specification">
                <input type="text" placeholder="Enter specifications" value="${existingSpecification}">
            </div>
        `;
        specificationsContainer.appendChild(card);

        // Create hidden table row
        const specRow = document.createElement("tr");
        specRow.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" value="${description}" readonly></td>
            <td><input type="text" placeholder="Enter specifications" value="${existingSpecification}"></td>
        `;
        specificationsTableBody.appendChild(specRow);

        // Sync card input with table input
        const cardInput = card.querySelector('.specification input');
        const rowInput = specRow.querySelector('td:nth-child(3) input');
        cardInput.addEventListener('input', () => {
            rowInput.value = cardInput.value;
            row.dataset.specification = cardInput.value;
        });
    });
}



// Override the global addItem function with purchase order specific implementation
const addItemBtn = document.getElementById('add-item-btn');
if (addItemBtn) {
    // Remove the global listener first to prevent double-adding
    const newAddItemBtn = addItemBtn.cloneNode(true);
    addItemBtn.parentNode.replaceChild(newAddItemBtn, addItemBtn);
    
    // Add Purchase Order specific listener
    newAddItemBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const container = document.getElementById("items-container");
        const tableBody = document.querySelector("#items-table tbody");
        const itemNumber = tableBody.children.length + 1;
    
    // Create card element
    const card = document.createElement("div");
    card.className = "item-card";
    
    card.innerHTML = `
        <div class="item-number">${itemNumber}</div>
        
        <div class="item-field description">
            <div style="position: relative;">
                <input type="text" placeholder="Enter item description" required>
                <ul class="suggestions"></ul>
            </div>
        </div>
        
        <div class="item-field hsn">
            <input type="text" placeholder="HSN/SAC" required>
        </div>
        
        <div class="item-field hsn">
            <input type="text" placeholder="Company">
        </div>
        
        <div class="item-field hsn">
            <input type="text" placeholder="Type">
        </div>
        
        <div class="item-field hsn">
            <input type="text" placeholder="Category">
        </div>
        
        <div class="item-field qty">
            <input type="number" placeholder="Qty" min="1" required>
        </div>
        
        <div class="item-field rate">
            <input type="number" placeholder="Unit Price" step="0.01" required>
        </div>
        
        <div class="item-field rate">
            <input type="number" placeholder="Rate" min="0" step="0.01">
        </div>
        
        <button type="button" class="remove-item-btn" title="Remove Item">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    
    // Append card to container
    if (container) {
        container.appendChild(card);
    }
    
    // Also add to hidden table for backward compatibility
    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="text-center">${itemNumber}</td>
        <td><input type="text" placeholder="Item Description" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="HSN/SAC" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Company" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Type" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Category" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Qty" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Unit Price" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"><i class="fas fa-trash"></i></button></td>
    `;
    tableBody.appendChild(row);
    
    // Sync all inputs from card to table
    const cardInputs = card.querySelectorAll("input");
    const tableInputs = row.querySelectorAll("input");
    
    cardInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (tableInputs[index]) {
                tableInputs[index].value = input.value;
            }
        });
    });
    
    // Handle remove button
    const removeBtn = card.querySelector(".remove-item-btn");
    removeBtn.addEventListener("click", function() {
        card.remove();
        row.remove();
    });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        // Clone the button to remove any existing event listeners (like the one from globalScript.js)
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        newNextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                // When moving from step 2 (Item Details) to step 3 (Add Specifications)
                if (currentStep === 2) {
                    populateSpecifications();
                }
                changeStep(currentStep + 1);
            }
            // When on the last step, generate the preview
            if (currentStep === totalSteps) {
                const idInput = document.getElementById('id');
                if (!idInput?.value) {
                    getId(); // This will also trigger generatePreview
                } else {
                    generatePreview();
                }
            }
        });
    }
});



