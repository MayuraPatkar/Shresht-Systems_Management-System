const totalSteps = 4;
let quotationId = '';
let totalAmountNoTax = 0;
let totalAmountTax = 0;

document.getElementById("view-preview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Function to get the quotation id
async function getId() {
    try {
        const response = await fetch("/quotation/generate-id");
        if (!response.ok) throw new Error("Failed to fetch quotation id");

        const data = await response.json();
        document.getElementById('id').value = data.quotation_id;
        quotationId = data.quotation_id;
        if (quotationId) generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

// Function to generate the preview for both tax rate and without tax rate
function generatePreview() {
    if (!quotationId) {
        quotationId = document.getElementById('id').value;
    }
    const projectName = document.getElementById("project-name").value || "";
    const buyerName = document.getElementById("buyer-name").value || "";
    const buyerAddress = document.getElementById("buyer-address").value || "";
    const buyerPhone = document.getElementById("buyer-phone").value || "";
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
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[4].querySelector("input").value) > 0);

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
    totalAmountNoTax = totalTaxableValue;
    totalAmountTax = (totalPrice + roundOff).toFixed(2);

    totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total CGST:</strong> ₹${totalCGST.toFixed(2)}</p>
        <p><strong>Total SGST:</strong> ₹${totalSGST.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${totalAmountTax}</p>
    `;

    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
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

        <div class="title">Quotation - #${quotationId}</div>
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

    <div class="preview-container">
        <div class="header">
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
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${typeof numberToWords === "function" ? numberToWords(totalPrice) : totalPrice} Only</span></p>
        <div class="page-break"></div>
        <div class="notes-section" contenteditable="true">
            <p><strong>Notes:</strong></p>
            <ul>
                <li>All prices are exclusive of taxes unless stated otherwise.</li>    
                <li>Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.</li>
                <li>Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>              
                <li>All applicable taxes and duties are included unless stated otherwise.</li>
            </ul>
        </div>
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    <div class="preview-container">
        <div class="header">
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

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
            return false;
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
    }

    return true;
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", async () => {
    const quotationData = collectFormData();
    const ok = await sendToServer(quotationData, false);
    if (ok) window.electronAPI.showAlert1("Quotation saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        await sendToServer(quotationData, true);
        let name = `Quotation-${quotationId}`;
        window.electronAPI.handlePrintEventQuatation(previewContent, "print", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "Save as PDF" button
document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        await sendToServer(quotationData, true);
        let name = `Quotation-${quotationId}`;
        window.electronAPI.handlePrintEventQuatation(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        quotation_id: document.getElementById("id").value,
        projectName: document.getElementById("project-name").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unit_price: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
        totalAmountNoTax: totalAmountNoTax,
        totalAmountTax: totalAmountTax,
    };
}