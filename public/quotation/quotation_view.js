/**
 * Generate and display the preview for the quotation in view-preview-content.
 * This works for both withTax and withoutTax view modes.
 */
function generateViewPreviewHTML(quotation, withTax = false) {
    let itemsHTML = "";
    let totalPrice = 0;
    let totalTax = 0;

    (quotation.items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.Unit_price || 0);
        const taxRate = parseFloat( item.rate || 0);
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

    document.getElementById("view-preview-content").innerHTML = `
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
              ${quotation.customer_name}<br>
              ${quotation.customer_address}<br>
              ${quotation.customer_phone}<br>
            <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${quotation.project_name}</p>

            <p>Dear ${quotation.customer_name},</p>

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
                        ${tableHead}
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
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details (match HTML IDs)
        document.getElementById('view-project-name').textContent = quotation.project_name || '';
        document.getElementById('view-project-id').textContent = quotation.quotation_id || '';

        // Buyer & Consignee
        document.getElementById('view-buyer-name').textContent = quotation.customer_name || '';
        document.getElementById('view-buyer-address').textContent = quotation.customer_address || '';
        document.getElementById('view-buyer-phone').textContent = quotation.customer_phone || '';
        document.getElementById('view-buyer-email').textContent = quotation.customer_email || '';

        // Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        viewItemsTableBody.innerHTML = "";

        (quotation.items || []).forEach(item => {
            const row = document.createElement("tr");
            if (withTax) {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.Unit_price || ''}</td>
                    <td>${item.rate ? item.rate + '%' : ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.Unit_price || ''}</td>
                `;
            }
            viewItemsTableBody.appendChild(row);
        });

        // Update table header for with/without tax
        const tableHead = document.querySelector("#view-items-table thead tr");
        if (withTax) {
            tableHead.innerHTML = `
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Rate</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
            `;
        }

        // Show the preview in view-preview-content
        generateViewPreviewHTML(quotation, withTax);

        // Print and Save as PDF handlers
        document.getElementById('print-project').onclick = () => {
            const content = document.getElementById('view-preview-content').innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
                let name = `Quotation-${quotation.quotation_id}`;
                window.electronAPI.handlePrintEventQuatation(content, "print", name);
            } else {
                window.print();
            }
        };
        document.getElementById('save-project-PDF').onclick = () => {
            const content = document.getElementById('view-preview-content').innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
                let name = `Quotation-${quotation.quotation_id}`;
                window.electronAPI.handlePrintEventQuatation(content, "savePDF", name);
            } else {
                window.print();
            }
        };

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI?.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Expose viewQuotation globally for use in other scripts
window.viewQuotation = viewQuotation;