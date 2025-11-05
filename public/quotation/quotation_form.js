const totalSteps = 6;
let quotationId = '';
let totalAmountNoTax = 0;
let totalAmountTax = 0;
let totalTax = 0;


document.getElementById("view-preview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Open a quotation for editing
async function openQuotation(quotationId) {
    const data = await fetchDocumentById('quotation', quotationId);
    if (!data) return;
    
    const quotation = data.quotation;

    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-quotation').style.display = 'none';
    document.getElementById('view-preview').style.display = 'block';
    if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }

        document.getElementById('id').value = quotation.quotation_id;
        document.getElementById('project-name').value = quotation.project_name;
        document.getElementById('quotation-date').value = await formatDate(quotation.quotation_date);
        document.getElementById('buyer-name').value = quotation.customer_name;
        document.getElementById('buyer-address').value = quotation.customer_address;
        document.getElementById('buyer-phone').value = quotation.customer_phone;
        document.getElementById('buyer-email').value = quotation.customer_email;

        const itemsContainer = document.getElementById("items-container");
        const nonItemsContainer = document.getElementById("non-items-container");
        const specificationsContainer = document.getElementById("specifications-container");
        const itemsTableBody = document.querySelector("#items-table tbody");
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");
        
        // Clear existing content
        if (itemsContainer) itemsContainer.innerHTML = "";
        if (nonItemsContainer) nonItemsContainer.innerHTML = "";
        if (specificationsContainer) specificationsContainer.innerHTML = "";
        itemsTableBody.innerHTML = "";
        nonItemsTableBody.innerHTML = "";
        itemsSpecificationsTableBody.innerHTML = "";

        // Load items
        (quotation.items || []).forEach((item, index) => {
            // Create table row first
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            itemsTableBody.appendChild(row);
            
            // Create card
            if (itemsContainer) {
                const card = document.createElement("div");
                card.className = "item-card";
                card.innerHTML = `
                    <div class="item-number">${index + 1}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" placeholder="Enter item description" class="item_name" value="${item.description || ''}" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" placeholder="Code" value="${item.HSN_SAC || ''}" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" placeholder="0" min="1" value="${item.quantity || ''}" required>
                    </div>
                    <div class="item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.unit_price || ''}" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <button type="button" class="remove-item-btn" title="Remove Item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                itemsContainer.appendChild(card);
                
                // Setup autocomplete for loaded items
                const cardInput = card.querySelector(".item_name");
                const cardSuggestions = card.querySelector(".suggestions");
                
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener("input", function () {
                        showSuggestions(cardInput, cardSuggestions);
                        // Update specifications table when item description changes (with debounce)
                        clearTimeout(cardInput.specUpdateTimeout);
                        cardInput.specUpdateTimeout = setTimeout(() => {
                            if (cardInput.value.trim()) {
                                updateSpecificationsTable();
                            }
                        }, 500);
                    });

                    cardInput.addEventListener("keydown", function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });

                    // Close suggestions handled by global listener
                }
                
                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });
                
                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function() {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                    updateSpecificationsTable();
                });
            }
        });

        // Load non-items
        (quotation.non_items || []).forEach((item, index) => {
            // Create table row first
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="number" value="${item.price || ''}" placeholder="Price" required></td>
                <td><input type="number" value="${item.rate || ''}" placeholder="Rate" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            nonItemsTableBody.appendChild(row);
            
            // Create card
            if (nonItemsContainer) {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.innerHTML = `
                    <div class="item-number">${index + 1}</div>
                    <div class="non-item-field description">
                        <input type="text" placeholder="e.g., Installation Charges" value="${item.description || ''}" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.price || ''}" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <button type="button" class="remove-item-btn" title="Remove Item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                nonItemsContainer.appendChild(card);
                
                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });
                
                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function() {
                    card.remove();
                    row.remove();
                    updateNonItemNumbers();
                    updateSpecificationsTable();
                });
            }
        });

        // Combine items and non_items for specifications
        const allItemsForSpecs = [
            ...(quotation.items || []).map(item => ({ ...item, type: 'item' })),
            ...(quotation.non_items || []).map(item => ({ ...item, type: 'non_item' }))
        ];

        allItemsForSpecs.forEach((item, index) => {
            // Create specification card
            if (specificationsContainer) {
                const card = document.createElement('div');
                card.className = 'spec-card';
                card.innerHTML = `
                    <div class="item-number">${index + 1}</div>
                    <div class="spec-field description">
                        <input type="text" value="${item.description || ''}" readonly style="background: #f9fafb; cursor: not-allowed;">
                    </div>
                    <div class="spec-field specification">
                        <input type="text" placeholder="Enter specifications" value="${item.specification || ''}" required>
                    </div>
                `;
                specificationsContainer.appendChild(card);
            }
            
            // Also create table row
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
            itemsSpecificationsTableBody.appendChild(row);
        });
}

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

async function generateFilePages(files) {
    if (!files || files.length === 0) return '';

    const getFilePath = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const filePath = await window.electronAPI.saveFile(buffer, file.name);
        return filePath;
    };

    const pages = await Promise.all(Array.from(files).map(async (file) => {
        const imagePath = await getFilePath(file);

        return `
            <div class="preview-container doc-quotation">
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

                <div class="files-section" style="margin: 20px 0; text-align: center;">
                    <img src="${imagePath}" alt="Uploaded File" style="max-width: 100%; max-height: 800px; object-fit: contain;">
                </div>

                <footer>
                    <p>This is a computer-generated quotation.</p>
                </footer>
            </div>
        `;
    }));

    return pages.join('');
}



// Function to generate the preview for both tax rate and without tax rate
async function generatePreview() {
    if (!quotationId) {
        quotationId = document.getElementById('id').value;
    }
    const projectName = document.getElementById("project-name").value || "";
    const buyerName = document.getElementById("buyer-name").value || "";
    const buyerAddress = document.getElementById("buyer-address").value || "";
    const buyerPhone = document.getElementById("buyer-phone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');

    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let grandTotal = 0;
    let roundOff = 0;
    let sno = 0;

    const allRenderableItems = [];
    const CHARS_PER_LINE = 60;

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[5].querySelector("input").value) > 0);

    // Process regular items
    for (const row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnSac = row.cells[2].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[3].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[4].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[5].querySelector("input").value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;
        let itemHTML = "";

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>${hsnSac}</td><td>${qty}</td><td>${formatIndian(unitPrice, 2)}</td><td>${formatIndian(taxableValue, 2)}</td><td>${rate.toFixed(2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;
            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>${hsnSac}</td><td>${qty}</td><td>${formatIndian(unitPrice, 2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    // Process non-items
    const nonItems = Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
        descriptions: row.querySelector('input[placeholder="Item Description"]').value,
        price: row.querySelector('input[placeholder="Price"]').value,
        rate: row.querySelector('input[placeholder="Rate"]').value,
    }));

    for (const item of nonItems) {
        const description = item.descriptions || '-';
        const price = Number(item.price) || 0;
        const rate = Number(item.rate) || 0;

        let rowTotal = price;
        totalTaxableValue += price; // Add non-item price to taxable value

        if (hasTax && rate > 0) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (price * cgstPercent) / 100;
            const sgstValue = (price * sgstPercent) / 100;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            rowTotal += cgstValue + sgstValue;
        }

        totalPrice += rowTotal; // Add the final row total to the grand total

        const itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>-</td><td>-</td>${hasTax ? `<td>-</td><td>-</td>` : ""}<td>${item.rate || '-'}</td><td>${formatIndian(rowTotal, 2) || '-'}</td></tr>`;
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    grandTotal = totalPrice; // Use totalPrice which now includes non-items
    roundOff = Math.round(grandTotal) - grandTotal;
    totalTax = totalCGST + totalSGST;
    totalAmountNoTax = totalTaxableValue;
    totalAmountTax = (totalPrice + roundOff).toFixed(2);

    const totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(totalPrice, 2)}</p>
            </div>
        </div>
    `;

    const ITEMS_PER_PAGE = 15; // Represents available lines on a page for items.
    const SUMMARY_SECTION_ROW_COUNT = 8; // Estimated height of totals, payment, and notes sections.

    // Build pages with the new logic
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    allRenderableItems.forEach((item, index) => {
        const isLastItem = index === allRenderableItems.length - 1;

        // Calculate the space this item will take up.
        const itemSpace = item.rowCount;

        // If this is the last item, the required space must also include the summary.
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        // Condition to create a new page:
        // 1. If the current page is not empty AND
        // 2. EITHER this item (if not the last) overflows the page
        // 3. OR this item (if it IS the last) plus the summary overflows the page.
        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {

            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += item.html;
        currentPageRowCount += item.rowCount;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    const itemsPageHTML = itemPages.map((pageHTML, index) => {
        const isLastItemsPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-quotation">
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
            <div class="title">Quotation-${quotationId}</div>
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>5KW Solar Systems</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S. No</th>
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
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
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
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
    }).join('');


    // Remove the separate summary page
    const summaryPageHTML = ``;

    // const files = document.getElementById('files');
    if (sessionStorage.getItem('currentTab-status') != 'update') {
        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
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

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-content" >
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
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
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

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
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
        <div class="title">Quotation-${quotationId}</div>
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
        // generateFilePages(files)
    } else {
        try {
            const response = await fetch(`/quotation/${quotationId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch quotation");
            }

            const data = await response.json();
            const quotation = data.quotation;

            const itemsPageHTML = itemPages.map((pageHTML, index) => {
        const isLastItemsPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-quotation">
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
            <div class="title">Quotation-${quotationId}</div>
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S. No</th>
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
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
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
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                   ${(quotation.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
    }).join('');

        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
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

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
            <p contenteditable="true"><strong>Subject:</strong> ${quotation.subject || ''}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">${quotation.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                ${(quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('')}
            </ul>
            
            <p contenteditable="true">${quotation.letter_3 || ''}</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
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

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
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
        <div class="title">Quotation-${quotationId}</div>
        <div class="terms-section" contenteditable="true">
            ${quotation.termsAndConditions || ''}
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
        // generateFilePages(files)
    
            } catch (error) { 

        }
    }

}



// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    return await sendDocumentToServer("/quotation/save-quotation", data);
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
        quotationDate: document.getElementById("quotation-date").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            HSN_SAC: row.querySelector("td:nth-child(3) input").value,
            quantity: Number(row.querySelector("td:nth-child(4) input").value) || 0,
            unit_price: Number(row.querySelector("td:nth-child(5) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(6) input").value) || 0,
            specification: (() => {
                // Try to match specification from specifications table
                const desc = row.querySelector("td:nth-child(2) input").value;
                const specRow = Array.from(document.querySelectorAll("#items-specifications-table tbody tr"))
                    .find(spec => spec.querySelector("td:nth-child(2)").textContent === desc);
                return specRow ? specRow.querySelector("td:nth-child(3) input").value : "";
            })()
        })),
        non_items: Array.from(document.querySelectorAll("#non-items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            price: Number(row.querySelector("td:nth-child(3) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(4) input").value) || 0,
            specification: (() => {
                // Try to match specification from specifications table
                const desc = row.querySelector("td:nth-child(2) input").value;
                const specRow = Array.from(document.querySelectorAll("#items-specifications-table tbody tr"))
                    .find(spec => spec.querySelector("td:nth-child(2)").textContent === desc);
                return specRow ? specRow.querySelector("td:nth-child(3) input").value : "";
            })()
        })),
        totalTax: totalTax,
        totalAmountNoTax: totalAmountNoTax,
        totalAmountTax: totalAmountTax,


        subject: document.querySelector(".quotation-letter-content p[contenteditable]").innerText.replace("Subject:", "").trim(),
        letter_1: document.querySelectorAll(".quotation-letter-content p[contenteditable]")[1].innerText.trim(),
        letter_2: Array.from(document.querySelectorAll(".quotation-letter-content ul[contenteditable] li")).map(li => li.innerText.trim()),
        letter_3: document.querySelectorAll(".quotation-letter-content p[contenteditable]")[2].innerText.trim(),
        notes: Array.from(document.querySelector(".notes-section ul").querySelectorAll("li")).map(li => li.innerText.trim()),
        termsAndConditions: document.querySelector(".terms-section").innerHTML.trim(),
        headline: document.querySelector(".headline-section p[contenteditable]")?.innerText.trim() || ''
    };
}

// Function to load existing quotation data
async function loadQuotationForEditing(id) {
    try {
        const response = await fetch(`/quotation/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch quotation data for editing.');
        }
        const data = await response.json();
        const quotation = data.quotation;

        // Populate basic info
        document.getElementById('id').value = quotation.quotation_id;
        quotationId = quotation.quotation_id;
        document.getElementById('project-name').value = quotation.project_name || '';
        document.getElementById('quotation-date').value = quotation.quotation_date ? new Date(quotation.quotation_date).toISOString().split('T')[0] : '';
        document.getElementById('buyer-name').value = quotation.customer_name || '';
        document.getElementById('buyer-address').value = quotation.customer_address || '';
        document.getElementById('buyer-phone').value = quotation.customer_phone || '';
        document.getElementById('buyer-email').value = quotation.customer_email || '';

        // Populate items table
        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = ''; // Clear existing rows
        (quotation.items || []).forEach(item => {
            const row = itemsTableBody.insertRow();
            row.innerHTML = `
                <td>${itemsTableBody.rows.length}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Enter item description"></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" placeholder="Enter HSN/SAC"></td>
                <td><input type="number" value="${item.quantity || 0}" min="1" placeholder="Enter quantity"></td>
                <td><input type="number" value="${item.unit_price || 0}" placeholder="Enter unit price"></td>
                <td><input type="number" value="${item.rate || 0}" placeholder="Enter rate" step="0.01"></td>
                <td><button class="remove-item-btn">Remove</button></td>
            `;
            row.querySelector(".remove-item-btn").addEventListener("click", () => row.remove());
        });

        // Populate non-items table
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        nonItemsTableBody.innerHTML = ''; // Clear existing rows
        (quotation.non_items || []).forEach(item => {
            const row = nonItemsTableBody.insertRow();
            row.innerHTML = `
                <td>${nonItemsTableBody.rows.length}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description"></td>
                <td><input type="number" value="${item.price || 0}" placeholder="Price"></td>
                <td><input type="number" value="${item.rate || 0}" placeholder="Rate" step="0.01"></td>
                <td><button class="remove-non-item-btn">Remove</button></td>
            `;
            row.querySelector(".remove-non-item-btn").addEventListener("click", () => row.remove());
        });

        // Populate specifications table
        const specTableBody = document.querySelector("#items-specifications-table tbody");
        specTableBody.innerHTML = ''; // Clear existing rows
        const allItems = [...(quotation.items || []), ...(quotation.non_items || [])];
        allItems.forEach((item, index) => {
            const row = specTableBody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" placeholder="Enter specifications"></td>
             `;
        });

        // Generate the preview with the loaded data
        generatePreview();

        // Inject the saved editable content into the newly generated preview
        const previewContent = document.getElementById('preview-content');
        previewContent.querySelector(".headline-section p[contenteditable]").innerHTML = `<u>${quotation.headline || ''}</u>`;
        previewContent.querySelector(".quotation-letter-content p[contenteditable]").innerHTML = `<strong>Subject:</strong> ${quotation.subject || ''}`;
        previewContent.querySelectorAll(".quotation-letter-content p[contenteditable]")[1].innerText = quotation.letter_1 || '';
        const letter2List = previewContent.querySelector(".quotation-letter-content ul[contenteditable]");
        letter2List.innerHTML = (quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('');
        previewContent.querySelectorAll(".quotation-letter-content p[contenteditable]")[2].innerText = quotation.letter_3 || '';
        previewContent.querySelector(".notes-section ul").innerHTML = (quotation.notes || []).map(li => `<li>${li}</li>`).join('');
        previewContent.querySelector(".terms-section").innerHTML = quotation.termsAndConditions || '';


    } catch (error) {
        console.error("Error loading quotation for editing:", error);
        window.electronAPI.showAlert1("Failed to load quotation data. Please try again.");
    }
}

// Expose the function to be called from other scripts
window.loadQuotationForEditing = loadQuotationForEditing;