let currentStep = 1;
const totalSteps = 4;

// Event listener for the "Next" button
document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        changeStep(currentStep + 1);
        if (currentStep === totalSteps) generatePreview();
    } else {
        // Handle form submission
        window.electronAPI.showAlert('Form submitted!');
    }
});

// Event listener for the "Previous" button
document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        changeStep(currentStep - 1);
    }
});

// Function to change the current step
function changeStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    updateNavigation();
}

// Function to update the navigation buttons
function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").textContent = currentStep === totalSteps ? 'Submit' : 'Next';
}

// Event listener for the "Add Item" button
document.getElementById('add-item-btn').addEventListener('click', addItem);

// Function to add a new item row to the table
function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

// Event listener for the "Remove Item" button
document.querySelector("#items-table").addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
        event.target.closest('tr').remove();
    }
});

// Function to convert number to words
function numberToWords(num) {
    const a = [
        '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
    ];
    const b = [
        '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];

    const numToWords = (n) => {
        if (n < 20) return a[n];
        const digit = n % 10;
        if (n < 100) return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 === 0 ? '' : ' and ' + numToWords(n % 100));
        return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    };

    return numToWords(num);
}

// Function to generate the preview for boyh tax rate and without tax rate
function generatePreview() {
    const quotation_id = document.getElementById("quotationId").value || "";
    const projectName = document.getElementById("projectName").value || "";
    const buyerName = document.getElementById("buyerName").value || "";
    const buyerAddress = document.getElementById("buyerAddress").value || "";
    const buyerPhone = document.getElementById("buyerPhone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let grandTotal = 0;
    let roundOff = 0;

    let itemsHTML = "";
    let totalsHTML = "";

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => row.cells[4].querySelector("input").value > 0);

    for (const row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const hsnSac = row.cells[1].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[2].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[3].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[4].querySelector("input").value || "0");

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
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${taxableValue.toFixed(2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${cgstPercent.toFixed(2)}</td>
                    <td>${cgstValue.toFixed(2)}</td>
                    <td>${sgstPercent.toFixed(2)}</td>
                    <td>${sgstValue.toFixed(2)}</td>
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
    }

    grandTotal = totalTaxableValue + totalCGST + totalSGST;
    roundOff = Math.round(grandTotal) - grandTotal;

    totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total CGST:</strong> ₹${totalCGST.toFixed(2)}</p>
        <p><strong>Total SGST:</strong> ₹${totalSGST.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${(totalPrice + roundOff).toFixed(2)}</p>
    `;

    document.getElementById("preview-content").innerHTML = `
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/Shresht-Logo-Final.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Quotation #${quotation_id}</div>
    <div class="info-section">
        <p><strong>To:</strong> ${buyerName}<br>
            ${buyerAddress}<br>
            Ph: ${buyerPhone}</p>
        <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${projectName}</p>
        <p>Dear ${buyerName},</p>
        <p contenteditable="true">With reference to your inquiry, we are pleased to submit our comprehensive techno-commercial proposal for the
            supply, installation, and commissioning of ${projectName}. This proposal includes industry-standard,
            high-quality equipment and services designed to meet your requirements.</p>
    </div>
<div class="items-section">
            <h3>Item Details</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        ${hasTax ? `
                        <th>Taxable Value (₹)</th>
                        <th>Rate (%)</th>
                        <th>CGST (%)</th>
                        <th>CGST (₹)</th>
                        <th>SGST (%)</th>
                        <th>SGST (₹)</th>` : ""}
                        <th>Total Price (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>

        <div class="totals-section" style="text-align: right;">
            ${totalsHTML}
        </div>
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(totalPrice)} only</span></p>
    <div class="page-break"></div>

    <div class="terms-section" contenteditable="true">
        <h3>Terms & Conditions</h3>
        <ul>
            <li><strong>Lead Time:</strong> 1 week for material procurement and installation. Synchronization may take
                2-3 weeks depending on MESCOM official availability.</li>
            <li><strong>Payment Terms:</strong>
                <ul>
                    <li>60% advance with PO (for MESCOM work and material procurement).</li>
                    <li>30% before dispatch of materials.</li>
                    <li>10% after installation and synchronization with MESCOM.</li>
                </ul>
            </li>
            <li><strong>Warranty:</strong>
                <ul>
                    <li>Solar Modules: 10 years product warranty, 15 years performance warranty.</li>
                    <li>String Inverters: 8 years warranty.</li>
                    <li>Battery Pack: 10 years warranty as per manufacturer terms.</li>
                </ul>
            </li>
            <li><strong>Customer Scope:</strong> Safe storage of materials, support during installation (electricity,
                water, etc.).</li>
            <li><strong>Quote Validity:</strong> 15 days.</li>
            <li><strong>GST:</strong> Included in the quoted price.</li>
        </ul>
    </div>

    <div class="closing-section">
        <p>We look forward to your order confirmation. Please contact us for any further technical or commercial
            clarifications.</p>
        <p>Thanking you,</p>
        <p><strong>For Shresht Systems,</strong><br>Sandeep Nayak<br>Mob: +91 7204657707 / 9901730305</p>
    </div>

    <footer>
        <p>This is a computer-generated quotation.</p>
    </footer>
    </div>`;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/quotation/save-quotation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            document.getElementById("quotationId").value = responseData.quotation.quotation_id;
            window.electronAPI.showAlert("Quotation saved successfully!");
        } else if (responseData.message === "Quotation already exists") {
            if (!shouldPrint) {
                window.electronAPI.showAlert("Quotation already exists.");
            }
        } else {
            window.electronAPI.showAlert(`Error: ${responseData.message || "Unknown error occurred."}`);
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert("Failed to connect to server.");
    }
}

// Event listener for the "Save" button
document.getElementById("save").addEventListener("click", () => {
    const quotationData = collectFormData();
    sendToServer(quotationData, false);
});

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.printQuotation) {
        const quotationData = collectFormData();
        sendToServer(quotationData, true);
        window.electronAPI.printQuotation(previewContent);
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        quotation_id: document.getElementById("quotationId").value,
        projectName: document.getElementById("projectName").value,
        buyerName: document.getElementById("buyerName").value,
        buyerAddress: document.getElementById("buyerAddress").value,
        buyerPhone: document.getElementById("buyerPhone").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unitPrice: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
    };
}