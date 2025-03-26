const totalSteps = 4;
let quotation_id = '';

// fuction to get the quotation id
async function getId() {
    try {
        const response = await fetch("/quotation/generate-id");
        if (!response.ok) {
            throw new Error("Failed to fetch quotation id");
        }

        const data = await response.json();
        document.getElementById('Id').value = data.quotation_id;
        quotation_id = data.quotation_id;
        if (quotation_id) generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert("Failed to fetch quotation id. Please try again later.");
    }
}

// Function to generate the preview for boyh tax rate and without tax rate
function generatePreview() {
    if (!quotation_id) {
        quotation_id = document.getElementById('Id').value;
    }
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

    <div class="title">Quotation - #${quotation_id}</div>
    <div class="info-section" >
        <p><strong>To:</strong></p>
          ${buyerName}<br>
          ${buyerAddress}<br>
          ${buyerPhone}<br>
        <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${projectName}</p>

        <p>Dear ${buyerName},</p>

        <p contenteditable="true">We appreciate the opportunity to submit our proposal for the supply, installation, and commissioning of ${projectName}. At <strong>Shresht Systems</strong>, we are committed to delivering high-quality, industry-standard solutions tailored to meet your specific requirements.</p>
        <p>Our proposal includes:</p>
        <ul contenteditable="true">
            <li>Cutting-edge technology and premium-grade equipment</li>
            <li>Expert installation by certified professionals</li>
            <li>Comprehensive commissioning and quality assurance</li>
            <li>Reliable after-sales support and service</li>
        </ul>
        
        <p contenteditable="true">We are confident that our offering will add significant value to your operations. Please find the detailed quotation enclosed for your review. Should you require any further information or modifications, feel free to contact us.</p>
        
        <p contenteditable="true">We look forward to your positive response and the opportunity to collaborate with you.</p>
      
        <p>Best regards,</p>
        <p><strong>Sandeep Nayak</strong><br>
           <strong>Shresht Systems</strong><br>
           Ph: 7204657707 / 9901730305<br>
           Email: shreshtsystems@gmail.com<br>
           Website: www.shreshtsystems.com</p>
    </div>
    
    <footer>
        <p>This is a computer-generated quotation.</p>
    </footer>
</div>

<div class="container">
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
<div class="items-section">
            <h2>Item Details</h2>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        ${hasTax ? `
                        <th>Taxable Value (₹)</th>
                        <th>Rate (%)</th>` : ""}
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
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
    <div class="page-break"></div>
    <footer>
        <p>This is a computer-generated quotation.</p>
    </footer>
</div>

<div class="container">
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
    <div class="terms-section" contenteditable="true">
        <h3>Terms & Conditions</h3>
        <ul>
            <li><strong>Lead Time:</strong> Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
            <li><strong>Payment Terms:</strong>
                <ul>
                    <li>50% advance upon order confirmation.</li>
                    <li>40% before dispatch of materials.</li>
                    <li>10% after successful installation and commissioning.</li>
                </ul>
            </li>
            <li><strong>Warranty:</strong>
                <ul>
                    <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>
                    <li>Any defects arising due to manufacturing faults will be rectified as per warranty terms.</li>
                    <li>Warranty does not cover damages due to improper handling, unauthorized modifications, or external factors.</li>
                </ul>
            </li>
            <li><strong>Customer Scope:</strong> Provision of necessary infrastructure such as power supply, water, and secure storage for materials.</li>
            <li><strong>Quote Validity:</strong> 30 days from the date of issue.</li>
            <li><strong>Taxes & Duties:</strong> All applicable taxes and duties are included unless stated otherwise.</li>
            <li><strong>Force Majeure:</strong> The company shall not be liable for delays or non-performance due to circumstances beyond its control.</li>
        </ul>
    </div>

    <div class="closing-section">
        <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
        <p>Thanking you,</p>
        <p><strong>For Shresht Systems,</strong><br>Sandeep Nayak<br>Mob: +91 7204657707 / 9901730305</p>
    </div>

    <footer>
        <p>This is a computer-generated quotation.</p>
    </footer>
</div>
`;
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
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        sendToServer(quotationData, true);
        window.electronAPI.handlePrintEventQuatation(previewContent, "print");
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        sendToServer(quotationData, true);
        window.electronAPI.handlePrintEventQuatation(previewContent, "savePDF");
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        quotation_id: document.getElementById("Id").value,
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