// quotation_view.js
// Contains logic for viewing a quotation and generating the print preview.
// Relies on helper functions from quotation_utils.js

// Listeners for Print/PDF buttons on the "View" page
document.addEventListener('DOMContentLoaded', () => {
    const printProjectBtn = document.getElementById('printProject');
    const saveProjectPdfBtn = document.getElementById('saveProjectPDF');

    if (printProjectBtn) {
        printProjectBtn.addEventListener('click', () => {
            // The @media print CSS rules will handle hiding the UI
            window.print();
        });
    }

    if (saveProjectPdfBtn) {
        saveProjectPdfBtn.addEventListener('click', () => {
            // "Save as PDF" is an option in the browser's print dialog
            window.print();
        });
    }
});


// ------- generateViewPreviewHTML (improved) -------
// Relies on: formatIndian, numberToWords, formatDate, safeText, toNumber (from quotation_utils.js)
async function generateViewPreviewHTML(quotation, viewType, sanitizedData = null) {
  // Prepare arrays (sanitized)
  const itemsArr = [];
  const nonItemsArr = [];

  if (sanitizedData && sanitizedData.items && sanitizedData.non_items) {
    // Use pre-sanitized data supplied by caller
    sanitizedData.items.forEach(it => itemsArr.push(it));
    sanitizedData.non_items.forEach(it => nonItemsArr.push(it));
  } else {
    // Sanitize raw quotation data
    (quotation.items || []).forEach(item => {
      itemsArr.push({
        description: safeText(item.description || '-'),
        // FIX: Check for both camelCase and snake_case
        HSN_SAC: safeText(item.hsnSac || item.HSN_SAC || ''),
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unitPrice || item.unit_price),
        rate: toNumber(item.rate),
        specification: safeText(item.specification || '')
      });
    });
    // FIX: Check for nonItems (camelCase) and non_items (snake_case)
    (quotation.nonItems || quotation.non_items || []).forEach(item => {
      nonItemsArr.push({
        description: safeText(item.description || '-'),
        price: toNumber(item.price),
        rate: toNumber(item.rate),
        specification: safeText(item.specification || '')
      });
    });
  }

  // Totals
  let totalTaxableValue = 0;
  let totalTax = 0;
  let totalPrice = 0; // includes tax for viewType === 2
  let sno = 0;
  const allRenderableItems = [];
  const CHARS_PER_LINE = 60;

  // Build items
  itemsArr.forEach(item => {
    sno++;
    const qty = item.quantity;
    const unitPrice = item.unit_price; // This now correctly gets the value
    const rate = item.rate;
    const description = item.description;
    const hsnSac = item.HSN_SAC || ''; // This now correctly gets the value
    const taxableValue = qty * unitPrice;
    const taxAmount = (taxableValue * rate) / 100;
    totalTaxableValue += taxableValue;
    totalTax += taxAmount;

    if (viewType === 2) {
      const totalWithTax = taxableValue + taxAmount;
      totalPrice += totalWithTax;
      const row = `<tr><td>${sno}</td><td>${description}</td><td>${hsnSac || '-'}</td><td>${qty || '-'}</td><td>${unitPrice ? formatIndian(unitPrice,2) : '-'}</td><td>${formatIndian(taxAmount,2)}</td><td>${rate ? (rate + '%') : '-'}</td><td>${formatIndian(totalWithTax,2)}</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    } else if (viewType === 1) {
      totalPrice += taxableValue;
      const row = `<tr><td>${sno}</td><td>${description}</td><td>${hsnSac || '-'}</td><td>${qty || '-'}</td><td>${unitPrice ? formatIndian(unitPrice,2) : '-'}</td><td>${taxableValue ? formatIndian(taxableValue,2) : '-'}</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    } else { // Compact view (viewType 3)
      totalPrice += taxableValue + taxAmount; // Compact view still uses full price
      const row = `<tr><td>${sno}</td><td>${description}</td><td>${item.specification || '-'}</td><td>${qty || '-'}</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    }
  });

  // Build non-items
  nonItemsArr.forEach(item => {
    sno++;
    const price = item.price;
    const rate = item.rate;
    const description = item.description;
    const taxableValue = price;
    const taxAmount = (taxableValue * rate) / 100;
    totalTaxableValue += taxableValue;
    totalTax += taxAmount;
    const totalWithTax = taxableValue + taxAmount; // Calculate this once

    if (viewType === 2) {
      totalPrice += totalWithTax;
      const row = `<tr><td>${sno}</td><td>${description}</td><td>-</td><td>-</td><td>${price ? formatIndian(price,2) : '-'}</td><td>${formatIndian(taxAmount,2)}</td><td>${rate ? (rate + '%') : '-'}</td><td>${formatIndian(totalWithTax,2)}</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    } else if (viewType === 1) {
      totalPrice += taxableValue;
      const row = `<tr><td>${sno}</td><td>${description}</td><td>-</td><td>-</td><td>${price ? formatIndian(price,2) : '-'}</td><td>${taxableValue ? formatIndian(taxableValue,2) : '-'}</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    } else { // Compact view (viewType 3)
      totalPrice += totalWithTax; // FIXED: Was taxableValue, now totalWithTax
      const row = `<tr><td>${sno}</td><td>${description}</td><td>${item.specification || '-'}</td><td>-</td></tr>`;
      allRenderableItems.push({ html: row, rowCount: Math.ceil(description.length / CHARS_PER_LINE) || 1 });
    }
  });

  // Compute final grand total
  // For viewType 1 (no tax), grandTotal should be totalTaxableValue
  // For viewType 2 & 3, grandTotal should be totalPrice (which includes tax)
  const grandTotal = (viewType === 1) ? totalTaxableValue : totalPrice;
  
  // --- FIX: This is the correct total with tax, regardless of view type ---
  const correctGrandTotalWithTax = totalTaxableValue + totalTax;


  // Format date
  // FIX: Check for both camelCase and snake_case
  const formattedDate = await formatDate(quotation.quotationDate || quotation.quotation_date);

  // --- FIX: Define quotationId *before* it is used in the map ---
  const quotationId = quotation.quotationId || quotation.quotation_id || 'DRAFT';

  // Table head (dynamic)
  let tableHead = '';
  if (viewType === 2) {
    tableHead = `<th>Sr. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Tax Amount</th><th>Rate</th><th>Total (With Tax)</th>`;
  } else if (viewType === 1) {
    tableHead = `<th>Sr. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th>`;
  } else {
    tableHead = `<th>Sr. No</th><th>Description</th><th>Specifications</th><th>Qty</th>`;
  }

  // Pagination (same logic)
  // --- FIX: Reverted to 15 to fix blank space bug ---
  const ITEMS_PER_PAGE = 15;
  const SUMMARY_SECTION_ROW_COUNT = 8;
  const pages = [];
  let currentHTML = '';
  let currentCount = 0;
  allRenderableItems.forEach((it, idx) => {
    const isLast = idx === allRenderableItems.length - 1;
    const need = it.rowCount;
    const requiredIfLast = need + SUMMARY_SECTION_ROW_COUNT;
    if (currentCount > 0 && ((!isLast && currentCount + need > ITEMS_PER_PAGE) || (isLast && currentCount + requiredIfLast > ITEMS_PER_PAGE))) {
      pages.push(currentHTML);
      currentHTML = '';
      currentCount = 0;
    }
    currentHTML += it.html;
    currentCount += it.rowCount;
  });
  if (currentHTML) pages.push(currentHTML);

  const itemsPageHTML = pages.map((pageHTML, pageIndex) => {
    const isLastPage = pageIndex === pages.length - 1;
    return `
      <div class="preview-container doc-quotation">
        <div class="brand-header">
          <div class="brand-logo"><img src="../assets/icon.png" alt="Shresht Icon"></div>
          <div>
            <div class="brand-name">SHRESHT SYSTEMS</div>
            <div class="brand-tag">CCTV & Security Solutions</div>
          </div>
          <div class="brand-contact"><p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p><p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p><p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p></div>
        </div>
        <div class="header-divider"></div>
        <div class="title-band">QUOTATION-${quotationId}</div>
        
        <div class="doc-date" style="text-align: right; margin-bottom: 10px; padding: 0 22px;"><strong>Date:</strong> ${formattedDate}</div>
        
        <div class="items-section">
          ${pageIndex === 0 ? `<div class="table headline-section"><p><u>${quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
          <table class="items-table"><thead><tr>${tableHead}</tr></thead><tbody>${pageHTML}</tbody></table>
        </div>
        ${!isLastPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}
        
        ${isLastPage ? `
          <div class="fifth-section">
           <div class="payment-totals-wrapper" style="margin-top:18px; display: flex; flex-wrap: wrap;">
              
              <div class="payment-card">
                <div class="payment-card-inner">
                  <div class="payment-head">
                    <div>Payment Details</div>
                    <div class="scan-label">Scan to Pay</div>
                  </div>
                  <div class="bank-row">
                    <div class="bank-left">
                      <p><strong>Bank Name:</strong>Canara Bank</p>
                      <p><strong>Account Name:</strong>Shresht Systems</p>
                      <p><strong>Account Number:</strong>120002152652</p>
                      <p><strong>IFSC Code:</strong>CNRB0010261</p>
                      <p><strong>Branch:</strong>Shanthi Nagar Manipal</p>
                    </div>
                    <div class="bank-qr">
                      <img src="../assets/shresht-systems-payment-QR-code.jpg" alt="QR Code" />
                      <div class="upi-text">UPI:<br><span id="previewUpiText">shreshtsystems@okicici</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="totals-card">
                <div class="totals-row">
                  <div class="totals-left">
                    <div class="totals-line"><span>Subtotal:</span><span class="amount">₹ <span id="subtotalAmount">${formatIndian(totalTaxableValue,2)}</span></span></div>
                    
                    ${viewType !== 1 ? `
                    <div class="totals-line"><span>GST:</span><span class="amount">₹ <span id="gstAmount">${formatIndian(totalTax,2)}</span></span></div>
                    ` : ''}

                  </div>

                  <div class="totals-right">
                    <div class="total-label">Total Amount:</div>
                    <div class="total-value">₹ <span id="grandTotalAmount">${(viewType === 1) ? formatIndian(grandTotal,2) : formatIndian(correctGrandTotalWithTax,2)}</span></div>
                    <div class="in-words">Amount in words: <em id="amountInWords">${(viewType === 1) ? numberToWords(Math.round(grandTotal)) : numberToWords(Math.round(correctGrandTotalWithTax))} Only</em></div>
                  </div>
                </div>
              </div>
              
              <div class="notes-section" style="flex-basis: 100%; margin-top: 18px; font-size:0.95rem; line-height:1.5; color:#1f2937;">
                <h3 style="margin:0 0 6px 0; font-weight:600;">Notes:</h3>
                <ul style="margin:0; padding-left:18px; list-style-type:disc; list-style-position:outside;">
                    <li>All prices are exclusive of taxes unless stated otherwise.</li>
                    <li>Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.</li>
                    <li>Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                    <li>All equipment supplied is covered under the manufacturer's standard warranty.</li>
                    <li>All applicable taxes and duties are included unless stated otherwise.</li>
                </ul>
                <div style="border-top:1px solid #f3f4f6; margin-top:6px;"></div>
              </div>
              </div> </div>
          ` : ''}
          <div style="text-align:center; font-size:0.82rem; color:#9ca3af; margin-top:8px; font-style:italic;">
          This is a computer-generated quotation
        </div>
      </div>
    `;
  }).join('');

    // Determine the container to render into
    // This function is used by both the "View" page (#view-preview-content)
    // and the "New" form preview (#preview-content)
    const viewPreviewEl = document.getElementById("view-preview-content"); // For "View" page
    const formPreviewEl = document.getElementById("preview-content"); // FIX: For "New" form preview
    // const quotationId = ... // This is now defined earlier

    const finalHTML = `
      <div class="preview-container doc-quotation first-page">
        <div class="brand-header">
          <div class="brand-logo"><img src="../assets/icon.png" alt="Shresht Icon" style="max-width:100%; max-height:100%;"></div>
          <div><div class="brand-name">SHRESHT SYSTEMS</div><div class="brand-tag">CCTV & Security Solutions</div></div>
          <div class="brand-contact"><div>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</div><div>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</div><div>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</div></div>
        </div>
        <div style="height:10px;"></div>
        <div style="border-top:3px solid #e6eefc; margin-bottom:14px;"></div>
        <div class="title-band">QUOTATION-${quotationId}</div>
        <div class="quotation-letter-date"><p><strong>Date:</strong> ${formattedDate}</p></div>
        <div class="quotation-letter-content">
          <p><strong>To:</strong><br>${
            quotation.customerName || quotation.customer_name || 'Customer Name'}<br>${
            quotation.customerAddress || quotation.customer_address || 'Customer Address'}<br>${
            quotation.customerPhone || quotation.customer_phone || 'Customer Phone'}</p>
          <p><strong>Subject:</strong> ${quotation.subject || 'Quotation for CCTV & Security Solutions'}</p>
          <p>Dear ${quotation.customerName || quotation.customer_name || 'Customer'},</p>
          <p>${quotation.letter1 || quotation.letter_1 || 'Thank you for your interest in our products and services. We are pleased to submit the following quotation for your consideration.'}</p>
          <p>Our proposal includes:</p>
          <ul>${(quotation.letter2 || quotation.letter_2 || ['High-Definition CCTV Cameras', 'Digital Video Recorder (DVR)', 'Professional Installation & Configuration']).map(li => `<li>${li}</li>`).join('')}</ul>
          <p>${quotation.letter3 || quotation.letter_3 || 'We are confident that our solution will meet your security requirements effectively. All supplied hardware comes with a standard manufacturer warranty.'}</p>
          <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          <p>Best regards,</p>
          <p><strong>Sandeep Nayak</strong><br><strong>Shresht Systems</strong><br>Ph: 7204657707 / 9901730305<br>Email: shreshtsystems@gmail.com<br>Website: www.shreshtsystems.com</p>
        </div>
        <footer><p style="font-size:0.85rem; color:#6b7280;">This is a computer-generated quotation.</p></footer>
      </div>

      ${itemsPageHTML}

      <div class="preview-container doc-quotation last-page" style="page-break-before:always;">
        <div class="brand-header">
          <div class="brand-logo"><img src="../assets/icon.png" alt="Shresht Icon" style="max-width:100%; max-height:100%;"></div>
          <div><div class="brand-name">SHRESHT SYSTEMS</div><div class="brand-tag">CCTV & Security Solutions</div></div>
          <div class="brand-contact"><div>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</div><div>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</div><div>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</div></div>
        </div>

        <div style="height:10px;"></div>
        <div style="border-top:3px solid #e6eefc; margin-bottom:12px;"></div>
        <div class="title-band">QUOTATION-${quotationId}</div>
        <div class="quotation-letter-date"><p><strong>Date:</strong> ${formattedDate}</p></div>

        <div class="terms-conditions" style="font-size:0.95rem; color:#111827; line-height:1.55;">
          <h3 style="margin:0 0 8px 0; font-size:1rem; font-weight:700;">Terms & Conditions:</h3>

          <ul style="margin:0 0 12px 0; padding-left:20px; list-style-type:disc; list-style-position:outside;">
            <li><strong>Lead Time:</strong> Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>

            <li><strong>Payment Terms:</strong>
              <ul style="margin:6px 0 8px 18px; padding-left:0; list-style-type:disc;">
                <li>50% advance upon order confirmation.</li>
                <li>40% before dispatch of materials.</li>
                <li>10% after successful installation and commissioning.</li>
              </ul>
            </li>

            <li><strong>Warranty:</strong>
              <div style="margin-top:6px; margin-left:6px;">
                <p style="margin:0 0 6px 0;">All equipment supplied is covered under the manufacturer's standard warranty.</p>
                <p style="margin:0 0 6px 0;">Any defects arising due to manufacturing faults will be rectified as per warranty terms. Warranty does not cover damages due to improper handling, unauthorized modifications, or external factors.</p>
              </div>
            </li>

            <li><strong>Customer Scope:</strong> Provision of necessary infrastructure such as power supply, water, and secure storage for materials.</li>

            <li><strong>Quote Validity:</strong> 30 days from the date of issue.</li>

            <li><strong>Taxes & Duties:</strong> All applicable taxes and duties are included unless stated otherwise.</li>

            <li><strong>Force Majeure:</strong> The company shall not be liable for delays or non-performance due to circumstances beyond its control.</li>
          </ul>
        </div>

        <div style="border-top:1px solid #e5e7eb; margin-top:18px; margin-bottom:8px;"></div>

        <div class="closing-message" style="margin-top:24px; font-size:0.95rem; color:#111827; line-height:1.6;">
          <p style="margin:0 0 16px 0;">We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
          
          <p style="margin:0 0 4px 0;">Thanking you,</p>
          <p style="margin:0 0 16px 0;">For Shresht Systems,</p>
          
          <p style="margin:0 0 2px 0; font-weight:700;">Sandeep Nayak</p>
          <p style="margin:0;">Mob: +91 7204657707 / 9901730305</p>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:28px; gap:24px;">
          <div style="flex:0 0 320px; text-align:left;">
            </div>
          <div style="flex:0 0 320px; text-align:right;">
            <div style="margin-bottom:60px; font-size:0.95rem; color:#374151;">Authorized Signature</div>
            <div style="border-top:1px solid #cbd5e1; width:60%; margin-left:auto; height:0;"></div>
            <div style="margin-top:8px; font-size:0.9rem; color:#374151;">Shresht Systems</div>
            <div style="margin-top:4px; font-size:0.9rem; color:#374151;">Date: _______________</div>
          </div>
        </div>

        <div style="height:18px;"></div>
        <div style="border-top:1px solid #e5e7eb; margin-top:18px; margin-bottom:8px;"></div>

        <div style="font-size:0.85rem; color:#6b7280; text-align:center; padding:12px 0;">
          Thank you for your business! For any queries, please contact us at info@shreshtsystems.com or +91 98765 43210
        </div>

        <div style="border-top:1px solid #f3f4f6; margin-top:6px;"></div>

        <div style="text-align:center; font-size:0.82rem; color:#9ca3af; margin-top:8px; font-style:italic;">
          This is a computer-generated quotation
        </div>
      </div>
    `;

    // Render the HTML into the correct container
    if (viewPreviewEl && document.getElementById('view').style.display === 'block') {
        viewPreviewEl.innerHTML = finalHTML;
    } else if (formPreviewEl && document.getElementById('new').style.display === 'block') {
        formPreviewEl.innerHTML = finalHTML;
    }


  // Update dashboard summary IDs (first existing)
  try {
    const setFirstExisting = (ids, text) => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) { el.textContent = text; break; }
      }
    };
    
    // We use correctGrandTotalWithTax here so the preview totals match the dashboard totals
    setFirstExisting(['view-total-amount'], '₹ ' + formatIndian(totalTaxableValue, 2));
    setFirstExisting(['view-total-tax'], '₹ ' + formatIndian(totalTax, 2));
    setFirstExisting(['view-total-with-tax'], '₹ ' + formatIndian(correctGrandTotalWithTax, 2)); 
    setFirstExisting(['view-total-without-tax'], '₹ ' + formatIndian(totalTaxableValue, 2));

  } catch (e) {
    console.warn('Failed to set dashboard totals', e);
  }
}

// ------- viewQuotation (improved) -------
async function viewQuotation(quotationId, viewType = 1) {
  try {
    // --- FIX: Use the correct fetchDocumentById function from documentManager.js ---
    if (typeof fetchDocumentById !== 'function') {
        if(typeof showToast === 'function') showToast("Error: Data loading function is not available.", "error");
        throw new Error("Error: Data loading function (fetchDocumentById) is not available.");
    }
    const data = await fetchDocumentById('quotation', quotationId);
    if (!data) {
        throw new Error('Failed to fetch quotation data. fetchDocumentById returned null.');
    }
    // --- END FIX ---
    
    // If server returns { quotation: {...} } handle both shapes
    const quotation = data.quotation || data;

    // Show/Hide appropriate sections safely
    const setDisplay = (id, val) => { const el = document.getElementById(id); if (el) el.style.display = val; };
    setDisplay('view-preview', 'none'); // This is for the form preview, hide it
    setDisplay('home', 'none');
    setDisplay('new', 'none');
    setDisplay('view', 'block'); // Show the main view section

    // This uses the setText function we added to quotation_utils.js
    setText('view-project-name', quotation.projectName || quotation.project_name || '-');
    setText('view-project-id', quotation.quotationId || quotation.quotation_id || '-');
    setText('view-quotation-date', await formatDate(quotation.quotationDate || quotation.quotation_date) || '-');
    setText('view-buyer-name', quotation.customerName || quotation.customer_name || '-');
    setText('view-buyer-address', quotation.customerAddress || quotation.customer_address || '-');
    setText('view-buyer-phone', quotation.customerPhone || quotation.customer_phone || '-');
    setText('view-buyer-email', quotation.customerEmail || quotation.customer_email || '-');

    // Prepare sanitized arrays so both the table view and preview use same numbers
    const sanitizedItems = (quotation.items || []).map(item => ({
      description: safeText(item.description || '-'),
      // FIX: Check for both
      HSN_SAC: safeText(item.hsnSac || item.HSN_SAC || ''),
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unitPrice || item.unit_price),
      rate: toNumber(item.rate),
      specification: safeText(item.specification || '')
    }));
    // FIX: Check for both
    const sanitizedNonItems = (quotation.nonItems || quotation.non_items || []).map(item => ({
      description: safeText(item.description || '-'),
      price: toNumber(item.price),
      rate: toNumber(item.rate),
      specification: safeText(item.specification || '')
    }));

    // Populate the on-page view tables (top-left list), using sanitized values and dynamic headers
    const viewItemsThead = document.querySelector("#view-items-table thead");
    if (viewItemsThead) {
      if (viewType === 2) {
        viewItemsThead.innerHTML = `<tr><th>S. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Tax Amount</th><th>Rate</th><th>Total (With Tax)</th></tr>`;
      } else if (viewType === 1) {
        viewItemsThead.innerHTML = `<tr><th>S. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>`;
      } else {
         viewItemsThead.innerHTML = `<tr><th>S. No</th><th>Description</th><th>Specifications</th><th>Qty</th></tr>`;
      }
    }
    const viewItemsTableBody = document.querySelector("#view-items-table tbody");
    const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
    if (viewItemsTableBody) viewItemsTableBody.innerHTML = '';
    if (viewSpecificationsTableBody) viewSpecificationsTableBody.innerHTML = '';

    // Totals used for the table view (single source)
    let totalTaxable = 0, totalTax = 0, grandTotal = 0;
    let itemNumber = 1;

    sanitizedItems.forEach(item => {
      const qty = item.quantity;
      const unitPrice = item.unit_price;
      const rate = item.rate;
      const taxableValue = qty * unitPrice;
      const taxAmount = (taxableValue * rate) / 100;
      const totalWithTax = taxableValue + taxAmount;

      totalTaxable += taxableValue;
      totalTax += taxAmount;
      
      let rowHTML = '';
      if (viewType === 2) {
          grandTotal += totalWithTax;
          rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${qty || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(unitPrice,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(taxAmount,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${rate ? (rate + '%') : '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(totalWithTax,2)}</td>
          `;
      } else if (viewType === 1) {
          grandTotal += taxableValue; // This is correct for the *table*
          rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${qty || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(unitPrice,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(taxableValue,2)}</td>
          `;
      } else { // Compact view
          grandTotal += totalWithTax;
           rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${qty || '-'}</td>
          `;
      }
      if (viewItemsTableBody) {
          const row = document.createElement('tr');
          row.innerHTML = rowHTML;
          viewItemsTableBody.appendChild(row);
      }
      itemNumber++;
    });

    sanitizedNonItems.forEach(item => {
      const price = item.price;
      const rate = item.rate;
      const taxAmount = (price * rate) / 100;
      const totalWithTax = price + taxAmount;

      totalTaxable += price;
      totalTax += taxAmount;

      let rowHTML = '';
      if (viewType === 2) {
          grandTotal += totalWithTax;
          rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">-</td>
            <td class="px-4 py-3 text-sm text-gray-900">-</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(price,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(taxAmount,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${rate ? (rate + '%') : '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(totalWithTax,2)}</td>
          `;
      } else if (viewType === 1) {
          grandTotal += price; // This is correct for the *table*
          rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">-</td>
            <td class="px-4 py-3 text-sm text-gray-900">-</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(price,2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(price,2)}</td>
          `;
      } else { // Compact view
          grandTotal += totalWithTax;
          rowHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">-</td>
          `;
      }
      
      if (viewItemsTableBody) {
          const row = document.createElement('tr');
          row.innerHTML = rowHTML;
          viewItemsTableBody.appendChild(row);
      }
      itemNumber++;
    });

    // Specs table
    const combined = sanitizedItems.concat(sanitizedNonItems);
    combined.forEach((item, i) => {
      if (!viewSpecificationsTableBody) return;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-3 text-sm text-gray-900">${i+1}</td>
        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
      `;
      viewSpecificationsTableBody.appendChild(row);
    });

    // --- THIS IS THE FIX ---
    // Manually calculate the correct grand total with tax
    const grandTotalWithTax = totalTaxable + totalTax;

    // Update the Totals card in the #view section
    setText('view-total-amount', '₹ ' + formatIndian(totalTaxable, 2));
    setText('view-total-tax', '₹ ' + formatIndian(totalTax, 2));
    setText('view-total-with-tax', '₹ ' + formatIndian(grandTotalWithTax, 2)); // Use the correct value
    setText('view-total-without-tax', '₹ ' + formatIndian(totalTaxable, 2));
    // --- END OF FIX ---


    // Now call the preview builder with sanitized data
    // This will render the preview inside the #view-preview-content div
    await generateViewPreviewHTML(quotation, viewType, { items: sanitizedItems, non_items: sanitizedNonItems });

  } catch (err) {
    console.error('Failed to fetch/view quotation', err);
    // --- FIX: Show the specific error message ---
    if (typeof showToast === 'function') {
        showToast(`Error: ${err.message}`, "error");
    }
  }
}

// Expose globally
window.viewQuotation = viewQuotation;