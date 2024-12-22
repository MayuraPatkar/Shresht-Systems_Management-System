document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

document.getElementById('newQuotation').addEventListener('click', () => {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
});

let currentStep = 1;
const totalSteps = 5;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            document.getElementById(`step-${currentStep}`).classList.remove("active");
            currentStep++;
            document.getElementById(`step-${currentStep}`).classList.add("active");
            updateNavigation();
            if (currentStep === totalSteps) generatePreview();
        }
    } else {
        // Handle form submission
        window.electronAPI.showAlert('Form submitted!');
    }
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
    }
});

function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").textContent = currentStep === totalSteps ? 'Submit' : 'Next';
}

function validateStep(step) {
    const stepElement = document.getElementById(`step-${step}`);
    const inputs = stepElement.querySelectorAll('input[required], textarea[required]');
    for (let input of inputs) {
        if (!input.value.trim()) {
            window.electronAPI.showAlert('Please fill all required fields.');
            return false;
        }
    }
    return true;
}

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="UOM" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><input type="number" placeholder="Taxable Value" min="0.01" step="0.01" required readonly></td>
        <td><input type="number" placeholder="%" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="CGST" min="0" step="0.01" required readonly></td>
        <td><input type="number" placeholder="%" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="SGST" min="0" step="0.01" required readonly></td>
        <td><input type="number" placeholder="Total Price" min="0" step="0.01" required readonly></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

    tableBody.appendChild(row);
    updateTotals();
}

document.querySelector("#items-table").addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
        event.target.closest('tr').remove();
        updateTotals();
    }
});

document.querySelector("#items-table").addEventListener("input", updateTotals);

function updateTotals() {
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;

    const rows = document.querySelectorAll("#items-table tbody tr");
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector("td:nth-child(3) input").value) || 0;
        const rate = parseFloat(row.querySelector("td:nth-child(5) input").value) || 0;
        const cgstPercent = parseFloat(row.querySelector("td:nth-child(7) input").value) || 0;
        const sgstPercent = parseFloat(row.querySelector("td:nth-child(9) input").value) || 0;

        // Calculate taxable value, CGST, SGST, and total price
        const taxableValue = qty * rate;
        const cgstValue = (taxableValue * cgstPercent) / 100;
        const sgstValue = (taxableValue * sgstPercent) / 100;
        const totalPrice = taxableValue + cgstValue + sgstValue;

        // Update row values
        row.querySelector("td:nth-child(6) input").value = taxableValue.toFixed(2);
        row.querySelector("td:nth-child(8) input").value = cgstValue.toFixed(2);
        row.querySelector("td:nth-child(10) input").value = sgstValue.toFixed(2);
        row.querySelector("td:nth-child(11) input").value = totalPrice.toFixed(2);

        // Accumulate totals
        totalTaxableValue += taxableValue;
        totalCGST += cgstValue;
        totalSGST += sgstValue;
    });

    // Calculate overall totals
    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;

    // Update form fields
    document.getElementById("totalAmount").value = totalTaxableValue.toFixed(2);
    document.getElementById("cgstTotal").value = totalCGST.toFixed(2);
    document.getElementById("sgstTotal").value = totalSGST.toFixed(2);
    document.getElementById("roundOff").value = roundOff.toFixed(2);
    document.getElementById("grandTotal").value = (grandTotal + roundOff).toFixed(2);
}

function generatePreview() {
    const projectName = document.getElementById("projectName").value || "";
    const buyerName = document.getElementById("buyerName").value || "";
    const buyerAddress = document.getElementById("buyerAddress").value || "";
    const buyerPhone = document.getElementById("buyerPhone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;

    let itemsHTML = "";
    for (let row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const qty = row.cells[2].querySelector("input").value || "0";
        const unitPrice = row.cells[4].querySelector("input").value || "0";
        const rowTotal = row.cells[10].querySelector("input").value || "0";

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${row.cells[1].querySelector("input").value || "-"}</td>
            <td>${qty}</td>
            <td>${row.cells[3].querySelector("input").value || "-"}</td>
            <td>${unitPrice}</td>
            <td>${row.cells[5].querySelector("input").value || "0"}</td>
            <td>${row.cells[6].querySelector("input").value || "0"}</td>
            <td>${row.cells[7].querySelector("input").value || "0"}</td>
            <td>${row.cells[8].querySelector("input").value || "0"}</td>
            <td>${row.cells[9].querySelector("input").value || "0"}</td>
            <td>${rowTotal}</td>
        </tr>`;

        totalPrice += parseFloat(rowTotal) || 0;
    }

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
            if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 == 0 ? '' : ' and ' + numToWords(n % 100));
            return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 != 0 ? ' ' + numToWords(n % 1000) : '');
        };

        return numToWords(num);
    }

    document.getElementById("preview-content").innerHTML = `
    <div class="header">
        <div class="logo">
            <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/Shresht-Logo-Final.png" alt="Shresht Logo">
        </div>
        <div class="company-details">
            <h1>SHRESHT SYSTEMS</h1>
            <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
            <p>Ph: +91 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com | Website: <a href="http://www.shreshtsystems.com">www.shreshtsystems.com</a></p>
        </div>
    </div>

    <hr>

    <div class="info-section">
        <p><strong>To:</strong> ${buyerName}<br>
            ${buyerAddress}<br>
            Ph: ${buyerPhone}</p>
        <p><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${projectName}</p>
        <p>Dear ${buyerName},</p>
        <p>With reference to your inquiry, we are pleased to submit our comprehensive techno-commercial proposal for the
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
                    <th>UOM</th>
                    <th>Rate (₹)</th>
                    <th>Taxable Value (₹)</th>
                    <th>CGST (%)</th>
                    <th>CGST (₹)</th>
                    <th>SGST (%)</th>
                    <th>SGST (₹)</th>
                    <th>Total Price (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
    </div>

    <hr>

    <div class="totals-section" style="text-align: right;">
        <p><strong>Total Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
        <p><strong>CGST Total:</strong> ₹${(totalPrice * 0.09).toFixed(2)}</p>
        <p><strong>SGST Total:</strong> ₹${(totalPrice * 0.09).toFixed(2)}</p>
        <p><strong>Grand Total:</strong> ₹${(totalPrice * 1.18).toFixed(2)}</p>
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(totalPrice)} only</span></p>
    </div>

    <div class="page-break"></div>

    <div class="terms-section">
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
    </footer>`;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("http://localhost:3000/quotation/save-quotation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            window.electronAPI.showAlert("Invoice saved successfully!");
        } else if (responseData.message === "Invoice already exists") {
            if (!shouldPrint) {
                window.electronAPI.showAlert("Invoice already exists.");
            }
        } else {
            window.electronAPI.showAlert(`Error: ${responseData.message || "Unknown error occurred."}`);
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert("Failed to connect to server.");
    }
}

document.getElementById("save").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, false);
});

document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.printInvoice) {
        const invoiceData = collectFormData();
        sendToServer(invoiceData, true);
        window.electronAPI.printInvoice(previewContent);
    } else {
        console.error("Print functionality is not available.");
    }
});

function collectFormData() {
    return {
        projectName: document.getElementById("projectName").value,
        buyerName: document.getElementById("buyerName").value,
        buyerAddress: document.getElementById("buyerAddress").value,
        buyerPhone: document.getElementById("buyerPhone").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            hsnSac: row.querySelector("td:nth-child(2) input").value,
            qty: row.querySelector("td:nth-child(3) input").value,
            uom: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
            taxableValue: row.querySelector("td:nth-child(6) input").value,
            cgstPercent: row.querySelector("td:nth-child(7) input").value,
            cgstValue: row.querySelector("td:nth-child(8) input").value,
            sgstPercent: row.querySelector("td:nth-child(9) input").value,
            sgstValue: row.querySelector("td:nth-child(10) input").value,
            totalPrice: row.querySelector("td:nth-child(11) input").value,
        })),
        totalAmount: document.getElementById("totalAmount").value,
        cgstTotal: document.getElementById("cgstTotal").value,
        sgstTotal: document.getElementById("sgstTotal").value,
        roundOff: document.getElementById("roundOff").value,
        grandTotal: document.getElementById("grandTotal").value,
    };
}