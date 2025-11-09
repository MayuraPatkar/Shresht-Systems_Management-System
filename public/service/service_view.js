// Service View - Preview generation
function generatePreview() {
    const serviceId = document.getElementById('service-id')?.value || '';
    const invoiceId = document.getElementById('invoice-id')?.value || '';
    const serviceStage = parseInt(document.getElementById('service-stage')?.value || 0);
    const name = document.getElementById("name")?.value || "";
    const address = document.getElementById("address")?.value || "";
    const phone = document.getElementById("phone")?.value || "";
    const email = document.getElementById("email")?.value || "";
    const projectName = document.getElementById("project-name")?.value || "";
    const serviceDate = document.getElementById("date")?.value || new Date().toISOString().split('T')[0];

    // Format date
    const formattedDate = new Date(serviceDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Service reference number (Invoice ID + Service Stage)
    const serviceReference = `${invoiceId}-S${serviceStage + 1}`;

    // Get items and calculate totals
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');

    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let sno = 0;

    // Check if rate column is populated
    let hasTax = false;
    if (itemsTable && itemsTable.rows) {
        hasTax = Array.from(itemsTable.rows).some(row => {
            const rateInput = row.cells[5]?.querySelector("input");
            return rateInput && parseFloat(rateInput.value) > 0;
        });
    }

    // Process regular items
    let itemsHTML = '';
    if (itemsTable && itemsTable.rows) {
        for (const row of itemsTable.rows) {
            const description = row.cells[1]?.querySelector("input")?.value || "-";
            const hsnSac = row.cells[2]?.querySelector("input")?.value || "-";
            const qty = parseFloat(row.cells[3]?.querySelector("input")?.value || "0");
            const unitPrice = parseFloat(row.cells[4]?.querySelector("input")?.value || "0");
            const rate = parseFloat(row.cells[5]?.querySelector("input")?.value || "0");

            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;

            if (hasTax && rate > 0) {
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
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${hsnSac}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${qty}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(unitPrice, 2)}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(taxableValue, 2)}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${rate.toFixed(2)}%</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = taxableValue;
                totalPrice += rowTotal;
                itemsHTML += `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${hsnSac}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${qty}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatIndian(unitPrice, 2)}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
            sno++;
        }
    }

    // Process non-items
    if (nonItemsTable && nonItemsTable.rows) {
        const nonItems = Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
            descriptions: row.querySelector('input[placeholder="Item Description"]')?.value || '',
            price: row.querySelector('input[placeholder="Price"]')?.value || '0',
            rate: row.querySelector('input[placeholder="Rate"]')?.value || '0',
        }));

        for (const item of nonItems) {
            const description = item.descriptions || '-';
            const price = Number(item.price) || 0;
            const rate = Number(item.rate) || 0;

            if (!description || description === '-') continue;

            let rowTotal = price;
            totalTaxableValue += price;

            if (hasTax && rate > 0) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                rowTotal += cgstValue + sgstValue;
            }

            totalPrice += rowTotal;

            if (hasTax) {
                itemsHTML += `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${rate || '-'}</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                itemsHTML += `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${sno + 1}</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${description}</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">-</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
            sno++;
        }
    }

    const grandTotal = totalPrice;

    const previewContainer = document.getElementById("preview-content");
    if (!previewContainer) {
        console.error("Preview container not found");
        return;
    }

    previewContainer.innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="../assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Service Receipt - ${serviceReference}</div>
        
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>Customer Details:</strong></p>
                <p>${name}</p>
                <p>${address}</p>
                <p>Phone: ${phone}</p>
                ${email ? `<p>Email: ${email}</p>` : ''}
            </div>
            <div class="info-section">
                <p><strong>Service ID:</strong> ${serviceId}</p>
                <p><strong>Invoice Reference:</strong> ${invoiceId}</p>
                <p><strong>Project Name:</strong> ${projectName}</p>
                <p><strong>Service Date:</strong> ${formattedDate}</p>
                <p><strong>Service Stage:</strong> ${serviceStage + 1}</p>
            </div>
        </div>

        ${itemsHTML ? `
        <div class="items-section" style="margin: 30px 0;">
            <h3 style="margin-bottom: 15px; font-size: 18px; font-weight: bold;">Service Items & Charges</h3>
            <table class="items-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">S.No</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">HSN/SAC</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Qty</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Unit Price</th>
                        ${hasTax ? `
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Taxable Value</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Tax %</th>
                        ` : ''}
                        <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="third-section">
            <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
                <div style="min-width: 300px;">
                    ${hasTax ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>Taxable Value:</span>
                        <span>₹ ${formatIndian(totalTaxableValue, 2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>CGST:</span>
                        <span>₹ ${formatIndian(totalCGST, 2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <span>SGST:</span>
                        <span>₹ ${formatIndian(totalSGST, 2)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 2px solid #2563eb;">
                        <span style="font-weight: bold;">Total Amount:</span>
                        <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">₹ ${formatIndian(grandTotal, 2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #2563eb;">
            <p style="margin: 0;"><strong>Amount in Words:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 1.1em;">${numberToWords(grandTotal)} Rupees Only</p>
        </div>

        <div class="notes-section" style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong><i class="fas fa-info-circle"></i> Service Notes:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
                <li>This is service receipt for stage ${serviceStage + 1}</li>
                <li>Payment received on ${formattedDate}</li>
                <li>Service performed as per schedule</li>
                <li>Next service will be scheduled as per agreement</li>
            </ul>
        </div>
        
        <div class="signature">
            <p><strong>For SHRESHT SYSTEMS</strong></p>
            <div class="signature-space" style="height: 60px;"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        
        <footer>
            <p>This is a computer-generated service receipt</p>
        </footer>
    </div>`;
}
