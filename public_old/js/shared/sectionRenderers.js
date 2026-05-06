/**
 * Section Renderers
 * Reusable HTML section generators for all document types
 * Uses companyConfig for dynamic company/bank data
 */

/**
 * Common company header section (async - fetches from DB)
 * @returns {Promise<string>} Header HTML
 */
async function renderHeader() {
    if (window.companyConfig && window.companyConfig.getCompanyHeaderHTML) {
        return await window.companyConfig.getCompanyHeaderHTML();
    }
    // Fallback if companyConfig not loaded
    return renderHeaderSync();
}

/**
 * Synchronous fallback header (for backwards compatibility)
 * @returns {string} Header HTML
 */
function renderHeaderSync() {
    return `
    <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="Company Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>COMPANY NAME</h1>
                <p class="quotation-tagline">CCTV & Energy Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>Company Address</p>
            <p>Ph: 0000000000</p>
            <p>GSTIN: GSTIN NUMBER</p>
            <p>Email: email@company.com</p>
            <p>Website: www.company.com</p>
        </div>
    </div>`;
}

/**
 * Quotation document header (async - fetches from DB)
 * @returns {Promise<string>} Header HTML
 */
async function renderQuotationDocumentHeader() {
    return await renderHeader();
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
function renderTotals(totals, hasTax = false, compact = false) {
    const compactClass = compact ? 'totals-section-compact' : '';
    return `
    <div class="totals-section ${compactClass}">
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
 * Bank/Payment details section (async - fetches from DB)
 * @returns {Promise<string>} Payment details HTML
 */
async function renderPaymentDetails() {
    if (window.companyConfig && window.companyConfig.getBankDetailsHTML) {
        return await window.companyConfig.getBankDetailsHTML();
    }
    // Fallback if companyConfig not loaded
    return renderPaymentDetailsSync();
}

/**
 * Synchronous fallback payment details (for backwards compatibility)
 * @returns {string} Payment details HTML
 */
function renderPaymentDetailsSync() {
    return `
    <h3>Payment Details</h3>
    <div class="bank-details">
        <div class="QR-code bank-details-sub1">
            <img src="../assets/shresht-systems-payment-QR-code.jpg"
                alt="qr-code" />
        </div>
        <div class="bank-details-sub2">
            <p><strong>Account Holder Name: </strong>Account Holder</p>
            <p><strong>Bank Name: </strong>Bank Name</p>
            <p><strong>Branch Name: </strong>Branch Name</p>
            <p><strong>Account No: </strong>0000000000</p>
            <p><strong>IFSC Code: </strong>IFSC0000000</p>
        </div>
    </div>`;
}

/**
 * Authorized signatory section (async - fetches from DB)
 * @returns {Promise<string>} Signatory HTML
 */
async function renderSignatory() {
    if (window.companyConfig && window.companyConfig.getSignatoryHTML) {
        return await window.companyConfig.getSignatoryHTML();
    }
    // Fallback if companyConfig not loaded
    return renderSignatorySync();
}

/**
 * Synchronous fallback signatory section
 * @returns {string} Signatory HTML
 */
function renderSignatorySync() {
    return `
    <div class="eighth-section">
        <p>For COMPANY NAME</p>
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
 * Invoice-specific: Fifth section with amount in words, payment details, and totals (async)
 * @param {number} totalAmount - Total amount for words conversion
 * @param {Object} totals - Totals data
 * @param {boolean} hasTax - Whether to show tax breakdown
 * @returns {Promise<string>} Fifth section HTML
 */
async function renderInvoiceFifthSection(totalAmount, totals, hasTax) {
    const paymentDetailsHTML = await renderPaymentDetails();
    return `
    <div class="fifth-section">
        <div class="fifth-section-sub1">
            <div class="fifth-section-sub2">
                ${renderAmountInWords(totalAmount)}
                ${paymentDetailsHTML}
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
 * Quotation-specific: Letter/proposal section (async - fetches from DB)
 * @param {Object} data - Letter data
 * @param {string} data.buyerName - Buyer name
 * @param {string} data.buyerAddress - Buyer address
 * @param {string} data.buyerPhone - Buyer phone
 * @param {string} data.subject - Letter subject
 * @param {string} data.paragraph1 - First paragraph
 * @param {Array} data.bulletPoints - Bullet points array
 * @param {string} data.paragraph2 - Second paragraph
 * @returns {Promise<string>} Letter HTML
 */
async function renderQuotationLetter(data) {
    const company = window.companyConfig ? await window.companyConfig.getCompanyInfo() : null;
    const companyName = company?.company || 'Company Name';
    const phone1 = company?.phone?.ph1 || '';
    const phone2 = company?.phone?.ph2 || '';
    const phoneStr = phone1 + (phone2 ? ' / ' + phone2 : '');
    const email = company?.email || 'email@company.com';
    const website = company?.website || 'www.company.com';
    
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
        <p><strong>${companyName}</strong><br>
           Ph: ${phoneStr}<br>
           Email: ${email}<br>
           Website: ${website}</p>
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
        renderHeaderSync,
        renderQuotationDocumentHeader,
        renderTitle,
        renderBuyerDetails,
        renderInfoSection,
        renderItemsTable,
        renderTotals,
        renderAmountInWords,
        renderPaymentDetails,
        renderPaymentDetailsSync,
        renderSignatory,
        renderSignatorySync,
        renderFooter,
        renderContinuation,
        renderInvoiceFifthSection,
        renderDeclaration,
        renderTerms,
        renderQuotationLetter,
        renderNotes
    };
}
