const quotationListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    document.getElementById('newQuotation').addEventListener('click', showNewQuotationForm);
    // Attach search to Enter key only, not click
    document.getElementById('searchInput').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
});

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotations");
        }

        const data = await response.json();
        renderQuotations(data.quotation);
    } catch (error) {
        console.error("Error loading quotations:", error);
        quotationListDiv.innerHTML = "<p>Failed to load quotations. Please try again later.</p>";
    }
}

// Render quotations in the list
function renderQuotations(quotations) {
    quotationListDiv.innerHTML = "";
    if (!quotations || quotations.length === 0) {
        quotationListDiv.innerHTML = "<h1>No quotations found</h1>";
        return;
    }
    quotations.forEach(quotation => {
        const quotationDiv = createQuotationDiv(quotation);
        quotationListDiv.appendChild(quotationDiv);
    });
}

// Create a quotation div element
function createQuotationDiv(quotation) {
    const quotationDiv = document.createElement("div");
    quotationDiv.className = "record-item";
    quotationDiv.innerHTML = `
    <div class="paid-icon">
        <img src="../assets/quotation.png" alt="Icon">
    </div>
        <div class="details">
            <div class="info1">
                <h1>${quotation.project_name}</h1>
                <h4>#${quotation.quotation_id}</h4>
            </div>
            <div class="info2">
                <p>${quotation.buyer_name}</p>
                <p>${quotation.buyer_address}</p>
            </div>    
        </div>
        <select class="actions">
        <option value="" disabled selected>Actions</option>
        <option value="view">View</option>
        <option value="viewWTax">View With TAX</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
        </select>
    `;

    // Attach event listener in JS, not inline
    quotationDiv.querySelector('.actions').addEventListener('change', function () {
        handleAction(this, quotation.quotation_id);
    });

    return quotationDiv;
}

function handleAction(select, id) {
    const action = select.value;
    if (action === "view") {
        viewQuotation(id, false);
    } else if (action === "viewWTax") {
        viewQuotation(id, true);
    } else if (action === "update") {
        openQuotation(id);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteQuotation(id);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

/**
 * Generate and display the preview for the quotation in detail-preview-content.
 * This works for both withTax and withoutTax view modes.
 */
function generateViewPreviewHTML(quotation, withTax = false) {
    let itemsHTML = "";
    let totalPrice = 0;
    let totalTax = 0;

    (quotation.items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.UnitPrice || item.unitPrice || 0);
        const taxRate = parseFloat(item.taxRate || item.rate || 0);
        const taxableValue = qty * unitPrice;
        const taxAmount = (taxableValue * taxRate) / 100;
        const totalWithTax = taxableValue + taxAmount;

        if (withTax) {
            totalPrice += totalWithTax;
            totalTax += taxAmount;
            itemsHTML += `
                <tr>
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${taxRate}%</td>
                    <td>${taxAmount.toFixed(2)}</td>
                    <td>${totalWithTax.toFixed(2)}</td>
                </tr>
            `;
        } else {
            totalPrice += taxableValue;
            itemsHTML += `
                <tr>
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${taxableValue.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    let tableHead = withTax
        ? `<th>Description</th>
           <th>HSN/SAC</th>
           <th>Qty</th>
           <th>Unit Price</th>
           <th>Tax Rate</th>
           <th>Tax Amount</th>
           <th>Total (With Tax)</th>`
        : `<th>Description</th>
           <th>HSN/SAC</th>
           <th>Qty</th>
           <th>Unit Price</th>
           <th>Total</th>`;

    let totalsHTML = withTax
        ? `<strong>Grand Total: ₹${totalPrice.toFixed(2)}</strong><br>
           <strong>Total Tax: ₹${totalTax.toFixed(2)}</strong>`
        : `<strong>Grand Total: ₹${totalPrice.toFixed(2)}</strong>`;

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

    <div class="title">Quotation - #${quotation.quotation_id}</div>
    <div class="info-section" >
        <p><strong>To:</strong></p>
          ${quotation.buyer_ame}<br>
          ${quotation.buyer_address}<br>
          ${quotation.buyer_phone}<br>
        <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${quotation.project_name}</p>

        <p>Dear ${quotation.buyer_name},</p>

        <p contenteditable="true">We appreciate the opportunity to submit our proposal for the supply, installation, and commissioning of ${quotation.project_name}. At <strong>Shresht Systems</strong>, we are committed to delivering high-quality, industry-standard solutions tailored to meet your specific requirements.</p>
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
                        ${withTax ? `
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

async function viewQuotation(quotationId, withTax = false) {
    try {
        const response = await fetch(`/quotation/${quotationId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotation");
        }

        const data = await response.json();
        const quotation = data.quotation;

        // Hide other sections, show view section
        document.getElementById('viewPreview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('detail-projectName').textContent = quotation.project_name || '';
        document.getElementById('detail-projectId').textContent = quotation.quotation_id || '';

        // Buyer & Consignee
        document.getElementById('detail-buyerName').textContent = quotation.buyer_name || '';
        document.getElementById('detail-buyerAddress').textContent = quotation.buyer_address || '';
        document.getElementById('detail-buyerPhone').textContent = quotation.buyer_phone || '';
        document.getElementById('detail-buyerEmail').textContent = quotation.buyer_email || '';

        // Item List (optional: you can hide/show this if you only want preview)
        const detailItemsTableBody = document.querySelector("#detail-items-table tbody");
        detailItemsTableBody.innerHTML = "";

        (quotation.items || []).forEach(item => {
            const row = document.createElement("tr");
            if (withTax) {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.UnitPrice || item.unitPrice || ''}</td>
                    <td>${item.taxRate ? item.taxRate + '%' : (item.rate ? item.rate + '%' : '')}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.UnitPrice || item.unitPrice || ''}</td>
                `;
            }
            detailItemsTableBody.appendChild(row);
        });

        // Update table header for with/without tax
        const tableHead = document.querySelector("#detail-items-table thead tr");
        if (withTax) {
            tableHead.innerHTML = `
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax Rate</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
            `;
        }

        // Show the preview in detail-preview-content
        generateViewPreviewHTML(quotation, withTax);

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            window.print();
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            window.print();
        };

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI?.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Open a quotation for editing
async function openQuotation(quotationId) {
    try {
        const response = await fetch(`/quotation/${quotationId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotation");
        }

        const data = await response.json();
        const quotation = data.quotation;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('newQuotation').style.display = 'none';
        document.getElementById('viewPreview').style.display = 'block';
        if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
            document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
        }

        document.getElementById('Id').value = quotation.quotation_id;
        document.getElementById('projectName').value = quotation.project_name;
        document.getElementById('buyerName').value = quotation.buyer_name;
        document.getElementById('buyerAddress').value = quotation.buyer_address;
        document.getElementById('buyerPhone').value = quotation.buyer_phone;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        (quotation.items || []).forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description || ''}" required></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unitPrice || item.UnitPrice || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;

            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Delete a quotation
async function deleteQuotation(quotationId) {
    try {
        const response = await fetch(`/quotation/${quotationId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete quotation");
        }

        window.electronAPI.showAlert1("Quotation deleted successfully");
        loadRecentQuotations();
    } catch (error) {
        console.error("Error deleting quotation:", error);
        window.electronAPI.showAlert1("Failed to delete quotation. Please try again later.");
    }
}

// Show the new quotation form
function showNewQuotationForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('newQuotation').style.display = 'none';
    document.getElementById('viewPreview').style.display = 'block';
    document.getElementById('view').style.display = 'none';

    if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('quotationSearchInput').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/quotation/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            quotationListDiv.innerHTML = `<h1>${errorText}</h1>`;
            return;
        }

        const data = await response.json();
        const quotations = data.quotation;
        quotationListDiv.innerHTML = "";
        (quotations || []).forEach(quotation => {
            const quotationDiv = createQuotationDiv(quotation);
            quotationListDiv.appendChild(quotationDiv);
        });
    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

document.getElementById('printProject').onclick = () => {
    const content = document.getElementById('detail-preview-content').innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        let name = `Quotation-${quotation.quotation_id}`;
        window.electronAPI.handlePrintEventQuatation(content, "print", name);
    } else {
        window.print();
    }
};
document.getElementById('saveProjectPDF').onclick = () => {
    const content = document.getElementById('detail-preview-content').innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        let name = `Quotation-${quotation.quotation_id}`;
        window.electronAPI.handlePrintEventQuatation(content, "savePDF", name);
    } else {
        window.print();
    }
};