/**
 * Section Renderers
 * Reusable HTML section generators for all document types
 */

/**
 * Common company header section
 * @returns {string} Header HTML
 */
function renderHeader() {
    return `
    <div class="first-section">
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
    </div>`;
}

function renderQuotationDocumentHeader() {
    return `
    <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="Shresht Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>SHRESHT SYSTEMS</h1>
                <p class="quotation-tagline">CCTV & Security Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
            <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
        </div>
    </div>`;
}

/**
 * Document title section
 * @param {string} type - Document type (e.g., 'Quotation', 'Invoice', 'Purchase Order', 'WAY BILL')
 * @param {string} id - Document ID
 * @returns {string} Title HTML
 */
function renderTitle(type, id) {
    return `
    <div class="second-section">
        <p>${type}-${id}</p>
    </div>`;
}

/**
 * Buyer/Customer details section
 * @param {Object} options - Buyer information
 * @param {string} options.name - Buyer name
 * @param {string} options.address - Buyer address
 * @param {string} options.phone - Buyer phone
 * @param {string} options.email - Buyer email (optional)
 * @param {string} options.title - Section title (default: "Bill To:")
 * @returns {string} Buyer details HTML
 */
function renderBuyerDetails(options) {
    const { name, address, phone, email, title = "Bill To:" } = options;
    return `
    <div class="buyer-details">
        <p><strong>${title}</strong></p>
        <p>${name || ''}</p>
        <p>${address || ''}</p>
        <p>Ph: ${phone || ''}</p>
        ${email ? `<p>${email}</p>` : ''}
    </div>`;
}

/**
 * Document info section (right side of buyer details)
 * @param {Array} infoItems - Array of {label, value} objects
 * @returns {string} Info section HTML
 */
function renderInfoSection(infoItems) {
    const items = infoItems
        .filter(item => item.value) // Only show non-empty items
        .map(item => `<p><strong>${item.label}:</strong> ${item.value}</p>`)
        .join('\n                ');
    
    return `
    <div class="info-section">
        ${items}
    </div>`;
}

/**
 * Items table section
 * @param {string} itemsHTML - Pre-rendered table rows HTML
 * @param {Array} columns - Array of column headers
 * @param {boolean} hasTax - Whether to show tax columns
 * @returns {string} Items table HTML
 */
function renderItemsTable(itemsHTML, columns = null, hasTax = false) {
    // Default columns for most documents
    const defaultColumns = hasTax ? [
        'S. No', 'Description', 'HSN/SAC', 'Qty', 'Unit Price', 
        'Taxable Value (₹)', 'Rate (%)', 'Total Price (₹)'
    ] : [
        'S. No', 'Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Total Price (₹)'
    ];

    const cols = columns || defaultColumns;
    const headerHTML = cols.map(col => `<th>${col}</th>`).join('\n                            ');

    return `
    <div class="fourth-section">
        <table>
            <thead>
                <tr>
                    ${headerHTML}
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
    </div>`;
}

/**
 * Totals section
 * @param {Object} totals - Totals data
 * @param {number} totals.taxableValue - Taxable value
 * @param {number} totals.cgst - CGST amount
 * @param {number} totals.sgst - SGST amount
 * @param {number} totals.total - Grand total
 * @param {boolean} hasTax - Whether to show tax breakdown
 * @returns {string} Totals HTML
 */
function renderTotals(totals, hasTax = false) {
    return `
    <div class="totals-section">
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p><strong>Taxable Value:</strong></p>
                <p><strong>Total CGST:</strong></p>
                <p><strong>Total SGST:</strong></p>` : ''}
                <p><strong>Grand Total:</strong></p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totals.taxableValue, 2)}</p>
                <p>₹ ${formatIndian(totals.cgst, 2)}</p>
                <p>₹ ${formatIndian(totals.sgst, 2)}</p>` : ''}
                <p>₹ ${formatIndian(totals.total, 2)}</p>
            </div>
        </div>
    </div>`;
}

/**
 * Amount in words section
 * @param {number} amount - Amount to convert to words
 * @returns {string} Amount in words HTML
 */
function renderAmountInWords(amount) {
    return `
    <div class="fifth-section-sub3">
        <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
        <p class="fifth-section-sub3-2">
            <span id="totalInWords">${numberToWords(amount)} Only</span>
        </p>
    </div>`;
}

/**
 * Bank/Payment details section
 * @returns {string} Payment details HTML
 */
function renderPaymentDetails() {
    return `
    <h3>Payment Details</h3>
    <div class="bank-details">
        <div class="QR-code bank-details-sub1">
            <img src="../assets/shresht-systems-payment-QR-code.jpg"
                alt="qr-code" />
        </div>
        <div class="bank-details-sub2">
            <p><strong>Account Holder Name: </strong>Shresht Systems</p>
            <p><strong>Bank Name: </strong>Canara Bank</p>
            <p><strong>Branch Name: </strong>Shanthi Nagar Manipal</p>
            <p><strong>Account No: </strong>120002152652</p>
            <p><strong>IFSC Code: </strong>CNRB0010261</p>
        </div>
    </div>`;
}

/**
 * Authorized signatory section
 * @returns {string} Signatory HTML
 */
function renderSignatory() {
    return `
    <div class="eighth-section">
        <p>For SHRESHT SYSTEMS</p>
        <div class="eighth-section-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>`;
}

/**
 * Footer section
 * @param {string} message - Footer message
 * @returns {string} Footer HTML
 */
function renderFooter(message = "This is a computer-generated document.") {
    return `
    <div class="ninth-section">
        <p>${message}</p>
    </div>`;
}

/**
 * Continuation indicator for multi-page documents
 * @returns {string} Continuation HTML
 */
function renderContinuation() {
    return `
    <div class="continuation-text" style="text-align: center; margin: 20px 0; font-style: italic; color: #666;">
        Continued on next page...
    </div>`;
}

/**
 * Invoice-specific: Fifth section with amount in words, payment details, and totals
 * @param {number} totalAmount - Total amount for words conversion
 * @param {Object} totals - Totals data
 * @param {boolean} hasTax - Whether to show tax breakdown
 * @returns {string} Fifth section HTML
 */
function renderInvoiceFifthSection(totalAmount, totals, hasTax) {
    return `
    <div class="fifth-section">
        <div class="fifth-section-sub1">
            <div class="fifth-section-sub2">
                ${renderAmountInWords(totalAmount)}
                ${renderPaymentDetails()}
            </div>
            ${renderTotals(totals, hasTax)}
        </div>
    </div>`;
}

/**
 * Invoice-specific: Declaration section
 * @param {string} content - Declaration content (editable)
 * @returns {string} Declaration HTML
 */
function renderDeclaration(content = null) {
    const defaultContent = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
    return `
    <div class="sixth-section">
        <div class="declaration" contenteditable="true">
            <p>${content || defaultContent}</p>
        </div>
    </div>`;
}

/**
 * Terms and conditions section
 * @param {string} content - Terms content (can be HTML)
 * @param {boolean} editable - Whether content is editable
 * @returns {string} Terms HTML
 */
function renderTerms(content = null, editable = true) {
    const defaultContent = `
        <h4>Terms & Conditions:</h4>
        <p>1. Payment should be made within 15 days from the date of invoice.</p>
        <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
        <p>3. Goods once sold will not be taken back.</p>
    `;
    
    return `
    <div class="seventh-section">
        <div class="terms-section" ${editable ? 'contenteditable="true"' : ''}>
            ${content || defaultContent}
        </div>
    </div>`;
}

/**
 * Quotation-specific: Letter/proposal section
 * @param {Object} data - Letter data
 * @param {string} data.buyerName - Buyer name
 * @param {string} data.buyerAddress - Buyer address
 * @param {string} data.buyerPhone - Buyer phone
 * @param {string} data.subject - Letter subject
 * @param {string} data.paragraph1 - First paragraph
 * @param {Array} data.bulletPoints - Bullet points array
 * @param {string} data.paragraph2 - Second paragraph
 * @returns {string} Letter HTML
 */
function renderQuotationLetter(data) {
    const bulletPointsHTML = (data.bulletPoints || [])
        .map(point => `<li>${point}</li>`)
        .join('\n                ');

    return `
    <div class="quotation-letter-content">
        <p><strong>To:</strong></p>
        ${data.buyerName}<br>
        ${data.buyerAddress}<br>
        ${data.buyerPhone}<br>
        <p contenteditable="true"><strong>Subject:</strong> ${data.subject || ''}</p>

        <p>Dear ${data.buyerName},</p>

        <p contenteditable="true">${data.paragraph1 || ''}</p>
        <p>Our proposal includes:</p>
        <ul contenteditable="true">
            ${bulletPointsHTML}
        </ul>
        
        <p contenteditable="true">${data.paragraph2 || ''}</p>
        
        <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
      
        <p>Best regards,</p>
        <p><strong>Sandeep Nayak</strong><br>
           <strong>Shresht Systems</strong><br>
           Ph: 7204657707 / 9901730305<br>
           Email: shreshtsystems@gmail.com<br>
           Website: www.shreshtsystems.com</p>
    </div>`;
}

/**
 * Quotation-specific: Notes section
 * @param {Array} notes - Array of note strings
 * @returns {string} Notes HTML
 */
function renderNotes(notes = null) {
    const defaultNotes = [
        "All prices are exclusive of taxes unless stated otherwise.",
        "Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.",
        "Delivery and installation will be completed within the stipulated timeline as per mutual agreement.",
        "All equipment supplied is covered under the manufacturer's standard warranty.",
        "All applicable taxes and duties are included unless stated otherwise."
    ];

    const notesList = (notes || defaultNotes)
        .map(note => `<li>${note}</li>`)
        .join('\n                    ');

    return `
    <div class="notes-section" contenteditable="true">
        <p><strong>Notes:</strong></p>
        <ul>
            ${notesList}
        </ul>
    </div>`;
}

// Export functions globally
if (typeof window !== 'undefined') {
    window.SectionRenderers = {
        renderHeader,
        renderQuotationDocumentHeader,
        renderTitle,
        renderBuyerDetails,
        renderInfoSection,
        renderItemsTable,
        renderTotals,
        renderAmountInWords,
        renderPaymentDetails,
        renderSignatory,
        renderFooter,
        renderContinuation,
        renderInvoiceFifthSection,
        renderDeclaration,
        renderTerms,
        renderQuotationLetter,
        renderNotes
    };
}
