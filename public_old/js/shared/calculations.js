/**
 * Shared Calculation Functions
 * Business logic for invoices, quotations, and other financial calculations
 */

/**
 * Calculate invoice totals including taxes
 * @param {HTMLTableSectionElement} itemsTable - Table body element containing invoice items
 * @returns {Object} Calculation results with totals, HTML, and tax breakdown
 */
function calculateInvoice(itemsTable) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let itemsHTML = "";

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => {
        const input = row.cells[4]?.querySelector("input");
        return input && parseFloat(input.value) > 0;
    });

    for (const row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input")?.value || "-";
        const hsnSac = row.cells[1].querySelector("input")?.value || "-";
        const qty = parseFloat(row.cells[2].querySelector("input")?.value || "0");
        const unitPrice = parseFloat(row.cells[3].querySelector("input")?.value || "0");
        const rate = parseFloat(row.cells[4].querySelector("input")?.value || "0");

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

    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;

    const totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total CGST:</strong> ₹${totalCGST.toFixed(2)}</p>
        <p><strong>Total SGST:</strong> ₹${totalSGST.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${finalTotal.toFixed(2)}</p>
    `;

    return {
        totalPrice,
        totalCGST,
        totalSGST,
        totalTaxableValue,
        roundOff,
        grandTotal,
        finalTotal,
        itemsHTML,
        totalsHTML,
        hasTax
    };
}

/**
 * Calculate non-taxable items total
 * @param {HTMLTableSectionElement} nonItemsTable - Table body element containing non-taxable items
 * @returns {Object} Calculation results with totals and HTML
 */
function calculateNonItems(nonItemsTable) {
    let totalNonItemsPrice = 0;
    let nonItemsHTML = "";

    for (const row of nonItemsTable.rows) {
        const description = row.cells[0].querySelector("input")?.value || "-";
        const price = parseFloat(row.cells[1].querySelector("input")?.value || "0");
        const rate = parseFloat(row.cells[2].querySelector("input")?.value || "0");

        const cgstPercent = rate / 2;
        const sgstPercent = rate / 2;
        const cgstValue = (price * cgstPercent) / 100;
        const sgstValue = (price * sgstPercent) / 100;
        const rowTotal = price + cgstValue + sgstValue;

        totalNonItemsPrice += rowTotal;

        nonItemsHTML += `
            <tr>
                <td>${description}</td>
                <td>${price.toFixed(2)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${rowTotal.toFixed(2)}</td>
            </tr>
        `;
    }

    return {
        totalNonItemsPrice,
        nonItemsHTML
    };
}

/**
 * Calculate quotation totals (similar to invoice but may have different logic)
 * @param {HTMLTableSectionElement} itemsTable - Table body element containing quotation items
 * @returns {Object} Calculation results
 */
function calculateQuotation(itemsTable) {
    // Quotations might have the same calculation logic as invoices
    // but keeping it separate allows for future customization
    return calculateInvoice(itemsTable);
}

/**
 * Calculate purchase order totals
 * @param {HTMLTableSectionElement} itemsTable - Table body element containing purchase items
 * @returns {Object} Calculation results
 */
function calculatePurchaseOrder(itemsTable) {
    return calculateInvoice(itemsTable);
}

/**
 * Calculate stock value
 * @param {number} quantity - Quantity in stock
 * @param {number} unitPrice - Price per unit
 * @param {number} gstRate - GST rate percentage
 * @returns {Object} Stock value calculations
 */
function calculateStockValue(quantity, unitPrice, gstRate = 0) {
    const baseValue = quantity * unitPrice;
    const gstAmount = (baseValue * gstRate) / 100;
    const totalValue = baseValue + gstAmount;

    return {
        baseValue,
        gstAmount,
        totalValue,
        quantity,
        unitPrice,
        gstRate
    };
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.calculateInvoice = calculateInvoice;
    window.calculateNonItems = calculateNonItems;
    window.calculateQuotation = calculateQuotation;
    window.calculatePurchaseOrder = calculatePurchaseOrder;
    window.calculateStockValue = calculateStockValue;
}
