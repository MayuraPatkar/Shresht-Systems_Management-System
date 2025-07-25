/**
 * Generate and display the preview for the quotation in view-preview-content.
 * This works for both withTax and withoutTax view modes.
 */
function generateViewPreviewHTML(quotation, viewType) {
    let itemsHTML = "";
    let totalTaxableValue = 0;
    let totalTax = 0;
    let totalPrice = 0;
    let sno = 0;

    // Items calculation
    (quotation.items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const taxRate = parseFloat(item.rate || 0);
        const specification = item.specification || '';
        const hsnSac = item.HSN_SAC || '';
        const taxableValue = qty * unitPrice;
        const taxAmount = (taxableValue * taxRate) / 100;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;

        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalPrice += totalWithTax;
            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${item.description || ''}</td>
                    <td>${specification}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${taxRate}%</td>
                    <td>${formatIndian(totalWithTax, 2)}</td>
                </tr>
            `;
        } else if (viewType === 1) {
            totalPrice += taxableValue;
            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${item.description || ''}</td>
                    <td>${specification}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                </tr>
            `;
        } else {
            totalPrice += taxableValue + taxAmount;
            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${item.description || ''}</td>
                    <td>${specification}</td>
                    <td>${qty}</td>
                </tr>
            `;
        }
    });

    // Non-items calculation
    let nonItemsHTML = "";
    let totalNonItemsTaxable = 0;
    let totalNonItemsTax = 0;
    let totalNonItemsPrice = 0;
    (quotation.non_items || []).forEach((item, idx) => {
        const price = parseFloat(item.price || 0);
        const taxRate = parseFloat(item.rate || 0);
        const specification = item.specification || '';
        const taxableValue = price;
        const taxAmount = (taxableValue * taxRate) / 100;
        totalNonItemsTaxable += taxableValue;
        totalNonItemsTax += taxAmount;

        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalNonItemsPrice += totalWithTax;
            nonItemsHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${specification}</td>
                    <td>${formatIndian(price, 2)}</td>
                    <td>${taxRate}%</td>
                    <td>${formatIndian(totalWithTax, 2)}</td>
                </tr>
            `;
        } else if (viewType === 1) {
            totalNonItemsPrice += taxableValue;
            nonItemsHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${specification}</td>
                    <td>${formatIndian(price, 2)}</td>
                </tr>
            `;
        } else {
            totalNonItemsPrice += taxableValue;
            nonItemsHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${specification}</td>
                </tr>
            `;
        }
    });

    // Grand totals
    let grandTotalTaxable = totalTaxableValue + totalNonItemsTaxable;
    let grandTotalTax = totalTax + totalNonItemsTax;
    let grandTotal = totalPrice + totalNonItemsPrice;

    // Table headers
    let tableHead = "";
    if (viewType === 2) {
        tableHead = `
            <th>Sr. No</th>
            <th>Description</th>
            <th>Specification</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Tax Rate</th>
            <th>Total (With Tax)</th>`;
    } else if (viewType === 1) {
        tableHead = `
            <th>Sr. No</th>
            <th>Description</th>
            <th>Specification</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>`;
    } else {
        tableHead = `
            <th>Sr. No</th>
            <th>Description</th>
            <th>Specification</th>
            <th>Qty</th>`;
    }

    // Totals HTML
    let totalsHTML = "";
    if (viewType === 2) {
        totalsHTML = `
            <div class="totals-section-sub1">
                <p><strong>Taxable Value: </strong></p>
                <p><strong>Total Tax: </strong></p>
                <p><strong>Grand Total: </strong></p>
            </div>
            <div class="totals-section-sub2">
                <p>₹ ${formatIndian(grandTotalTaxable, 2)}</p>
                <p>₹ ${formatIndian(grandTotalTax, 2)}</p>
                <p>₹ ${formatIndian(grandTotal, 2)}</p>
            </div>
        `;
    } else {
        totalsHTML = `
            <div class="totals-section-sub1">
                <p><strong>Grand Total: </strong></p>
            </div>
            <div class="totals-section-sub2">
                <h3>₹ ${formatIndian(grandTotal, 2)}</h3>
            </div>
        `;
    }


    document.getElementById("view-preview-content").innerHTML = `
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

        <div class="title">Quotation-${quotation.quotation_id}</div>
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
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>
                
        <div class="title">Quotation-${quotation.quotation_id}</div>
        <div class="items-section">
            <div class="table headline-section" contenteditable="true"><p><u>5KW Solar Systems</u></p></div>
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

        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    <div class="fifth-section-sub3">
                        <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                        <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
                    </div>
                    <h3>Payment Details:</h3>
                    <div class="bank-details">
                        <div class="QR-code bank-details-sub1">
                            <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/shresht%20systems%20payment%20QR-code.jpg"
                                alt="qr-code" />
                        </div>
                        <div class="bank-details-sub2">
                            <p><strong>Account Holder Name: </strong>Shresht Systems</p>
                            <p><strong>Bank Name: </strong>Canara Bank</p>
                            <p><strong>Branch Name: </strong>Shanthi Nagar Manipal</p>
                            <p><strong>Account No: </strong>120002152652</p>
                            <p><strong>IFSC Code: </strong>CNRB0010261</p>
                        </div>
                    </div>
                </div>
                <div class="totals-section">
                    ${totalsHTML}
                </div>
            </div>
        </div>

        <div class="page-break"></div>
        <div class="notes-section" contenteditable="true">
            <p><strong>Notes:</strong></p>
            <ul>
                <li>All prices are exclusive of taxes unless stated otherwise.</li>    
                <li>Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.</li>
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

        <div class="title">Quotation-${quotation.quotation_id}</div>
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

async function viewQuotation(quotationId, viewType) {
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

        // Fill Project Details
        document.getElementById('view-project-name').textContent = quotation.project_name || '-';
        document.getElementById('view-project-id').textContent = quotation.quotation_id || '-';
        document.getElementById('view-quotation-date').textContent = formatDate(quotation.quotation_date) || '-';

        // Buyer & Consignee
        document.getElementById('view-buyer-name').textContent = quotation.customer_name || '-';
        document.getElementById('view-buyer-address').textContent = quotation.customer_address || '-';
        document.getElementById('view-buyer-phone').textContent = quotation.customer_phone || '-';
        document.getElementById('view-buyer-email').textContent = quotation.customer_email || '-';

        // Calculation variables
        let itemsTotalTaxable = 0, itemsTotalTax = 0, itemsGrandTotal = 0;
        let nonItemsTotalTaxable = 0, nonItemsTotalTax = 0, nonItemsGrandTotal = 0;

        // Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        const viewNonItesTableBody = document.querySelector("#view-non-items-table tbody");
        viewItemsTableBody.innerHTML = "";
        viewNonItesTableBody.innerHTML = "";

        (quotation.items || []).forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const taxRate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const taxAmount = (taxableValue * taxRate) / 100;
            let totalWithTax = taxableValue + taxAmount;

            itemsTotalTaxable += taxableValue;
            itemsTotalTax += taxAmount;
            itemsGrandTotal += (viewType === 2 || viewType === 3) ? totalWithTax : taxableValue;

            const row = document.createElement("tr");
            if (viewType === 2) {
                row.innerHTML = `
                    <td>${viewItemsTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification}</td>
                    <td>${item.HSN_SAC || '-'}</td>
                    <td>${item.quantity || '-'}</td>
                    <td>${formatIndian(item.unit_price, 2) || '-'}</td>
                    <td>${item.rate ? item.rate + '%' : '-'}</td>
                    <td>${formatIndian(totalWithTax, 2) || '-'}</td>
                `;
            } else if (viewType === 1) {
                row.innerHTML = `
                    <td>${viewItemsTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification}</td>
                    <td>${item.HSN_SAC || '-'}</td>
                    <td>${item.quantity || '-'}</td>
                    <td>${formatIndian(item.unit_price, 2) || '-'}</td>
                    <td>${formatIndian(taxableValue, 2) || '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${viewItemsTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification}</td>
                    <td>${item.quantity || '-'}</td>
                `;
            }
            viewItemsTableBody.appendChild(row);
        });

        (quotation.non_items || []).forEach(item => {
            const price = parseFloat(item.price || 0);
            const taxRate = parseFloat(item.rate || 0);
            const taxAmount = (price * taxRate) / 100;
            let totalWithTax = price + taxAmount;

            nonItemsTotalTaxable += price;
            nonItemsTotalTax += taxAmount;
            nonItemsGrandTotal += (viewType === 2) ? totalWithTax : price;

            const row = document.createElement("tr");
            if (viewType === 2) {
                row.innerHTML = `
                    <td>${viewNonItesTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification || '-'}</td>
                    <td>${formatIndian(price, 2) || '-'}</td>
                    <td>${item.rate ? item.rate + '%' : '-'}</td>
                    <td>${formatIndian(totalWithTax, 2) || '-'}</td>
                `;
            } else if (viewType === 1) {
                row.innerHTML = `
                    <td>${viewNonItesTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification || '-'}</td>
                    <td>${formatIndian(price, 2) || '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${viewNonItesTableBody.children.length + 1}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.specification || '-'}</td>
                    <td>${formatIndian(totalWithTax, 2) || '-'}</td>
                `;
            }
            viewNonItesTableBody.appendChild(row);
        });

        // Set totals for items and non-items
        document.getElementById('view-items-total-amount').textContent = `₹ ${formatIndian(itemsTotalTaxable, 2) || '-'}`;
        document.getElementById('view-items-total-tax').textContent = viewType === 2 ? `₹ ${formatIndian(itemsTotalTax, 2) || '-'}` : (viewType === 1 ? 'No Tax' : '-');
        document.getElementById('items-overall').textContent = `₹ ${formatIndian(itemsGrandTotal, 2) || '-'}`;

        document.getElementById('view-non-items-total-amount').textContent = `₹ ${formatIndian(nonItemsTotalTaxable, 2) || '-'}`;
        document.getElementById('view-non-items-total-tax').textContent = viewType === 2 ? `₹ ${formatIndian(nonItemsTotalTax, 2) || '-'}` : (viewType === 1 ? 'No Tax' : '-');
        document.getElementById('non-items-overall').textContent = `₹ ${formatIndian(nonItemsGrandTotal, 2) || '-'}`;

        // Set overall totals
        const overallTaxable = itemsTotalTaxable + nonItemsTotalTaxable;
        const overallTax = itemsTotalTax + nonItemsTotalTax;
        const overallGrandTotal = itemsGrandTotal + nonItemsGrandTotal;

        document.getElementById('view-total-amount').textContent = `₹ ${formatIndian(overallGrandTotal, 2) || '-'}`;
        document.getElementById('view-total-tax').textContent = viewType === 2 ? `₹ ${formatIndian(overallTax, 2) || '-'}` : (viewType === 1 ? 'No Tax' : '-');
        document.getElementById('view-total-with-tax').textContent = viewType === 2 || viewType === 3 ? `₹ ${formatIndian(overallGrandTotal, 2) || '-'}` : (viewType === 1 ? 'No Tax' : '-');
        document.getElementById('view-total-without-tax').textContent = `₹ ${formatIndian(overallTaxable, 2) || '-'}`;

        // Update table header for with/without tax
        const tableHead = document.querySelector("#view-items-table thead tr");
        if (viewType === 2) {
            tableHead.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specification</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Rate</th>
                <th>Total (With Tax)</th>
            `;
        } else if (viewType === 1) {
            tableHead.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specification</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specification</th>
                <th>Qty</th>
            `;
        }

        const tableHeadNonItems = document.querySelector("#view-non-items-table thead tr");
        if (viewType === 2) {
            tableHeadNonItems.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specifications</th>
                <th>Price</th>
                <th>Rate</th>
                <th>Total (With Tax)</th>
            `;
        } else if (viewType === 1) {
            tableHeadNonItems.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specifications</th>
                <th>Price</th>
            `;
        } else {
            tableHeadNonItems.innerHTML = `
                <th>Sr. No</th>
                <th>Description</th>
                <th>Specifications</th>
                <th>Price</th>
            `;
        }

        // Show the preview in view-preview-content
        generateViewPreviewHTML(quotation, viewType);

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