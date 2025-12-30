/**
 * Data Worksheet Report Module
 * Solar Installation Calculator - migrated from calculations module
 */

/**
 * Initialize data worksheet section
 */
function initDataWorksheetReport() {
    // Dynamic CSS injection for preview styles
    // This ensures styles are loaded for the inline preview without modifying reports.html
    if (!document.querySelector('link[href="../css/dataWorksheetPreview.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../css/dataWorksheetPreview.css';
        document.head.appendChild(link);
    }

    // Set default date
    document.getElementById('dw_date').valueAsDate = new Date();

    // Set up event handlers
    document.getElementById('generate-worksheet')?.addEventListener('click', generateDataWorksheet);
    document.getElementById('clear-worksheet-form')?.addEventListener('click', clearWorksheetForm);

    // Set up inline preview buttons
    document.getElementById('print-worksheet-report')?.addEventListener('click', printWorksheetInline);
    document.getElementById('save-worksheet-pdf')?.addEventListener('click', saveWorksheetPDFInline);
}

/**
 * Clear worksheet form
 */
function clearWorksheetForm() {
    document.getElementById('dataWorksheetForm').reset();
    document.getElementById('dw_date').valueAsDate = new Date();
    document.getElementById('dw_unitsPerDay').value = 4;
}



/**
 * Generate data worksheet document
 */
function generateDataWorksheet() {
    // Get form values
    const systemSize = parseFloat(document.getElementById('dw_systemSize').value);
    const month = document.getElementById('dw_month').value || 'July';
    const consumptionUnits = parseFloat(document.getElementById('dw_consumptionUnits').value);
    const fuelCharges = parseFloat(document.getElementById('dw_fuelCharges').value) || 0;
    const tax = parseFloat(document.getElementById('dw_tax').value) || 0;
    const sanctionedLoad = parseFloat(document.getElementById('dw_sanctionedLoad').value);
    const demandRate = parseFloat(document.getElementById('dw_demandRate').value);
    const additionalCharges = parseFloat(document.getElementById('dw_additionalCharges').value) || 0;
    const unitsPerDay = parseFloat(document.getElementById('dw_unitsPerDay').value) || 4;
    const avgConsumptionRate = parseFloat(document.getElementById('dw_avgConsumptionRate').value);
    const sgyWithRate = parseFloat(document.getElementById('dw_sgyWithRate').value) || 3.86;
    const sgyWithoutRate = parseFloat(document.getElementById('dw_sgyWithoutRate').value) || 3.86;
    const exceedUnitRate = parseFloat(document.getElementById('dw_exceedUnitRate').value) || 695;
    const customerName = document.getElementById('dw_customerName').value || 'Customer';
    const date = document.getElementById('dw_date').value;

    // Validate required fields
    if (isNaN(systemSize) || isNaN(consumptionUnits) || isNaN(sanctionedLoad) || isNaN(demandRate) || isNaN(avgConsumptionRate)) {
        showNotification('Please fill all required fields marked with *', 'error');
        return;
    }

    // Prepare input data object
    const inputData = {
        systemSize, month, consumptionUnits, fuelCharges, tax,
        sanctionedLoad, demandRate, additionalCharges,
        unitsPerDay, avgConsumptionRate,
        sgyWithRate, sgyWithoutRate, exceedUnitRate
    };

    // Perform calculations
    const calculations = calculateWorksheetData(inputData);

    // Generate HTML document
    const documentHTML = generateWorksheetHTML(calculations, inputData, customerName, date, systemSize, month);

    // Show inline preview
    showInlineWorksheetPreview(documentHTML);
}

/**
 * Show inline worksheet preview
 * @param {string} documentHTML - HTML document to preview
 */
function showInlineWorksheetPreview(documentHTML) {
    const previewSection = document.getElementById('worksheet-preview-section');
    const previewContent = document.getElementById('worksheet-preview-content');

    if (!previewSection || !previewContent) return;

    // Store HTML for printing/saving
    window.currentWorksheetHTML = documentHTML;

    // Show the preview section
    previewSection.style.display = 'block';

    // Inject the content directly (it now includes the link tag)
    previewContent.innerHTML = documentHTML;

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showNotification('Worksheet generated successfully', 'success');
}

/**
 * Print the worksheet document (inline preview button)
 */
function printWorksheetInline() {
    if (window.currentWorksheetHTML) {
        printReport(window.currentWorksheetHTML, 'data-worksheet');
    }
}

/**
 * Save the worksheet as PDF (inline preview button)
 */
function saveWorksheetPDFInline() {
    if (window.currentWorksheetHTML) {
        const customerName = document.getElementById('dw_customerName').value || 'customer';
        const systemSize = document.getElementById('dw_systemSize').value || 'solar';
        const filename = `data-worksheet-${customerName.replace(/\s+/g, '-')}-${systemSize}kw-${new Date().getTime()}`;
        saveReportPDF(window.currentWorksheetHTML, filename);
        showNotification('PDF saved successfully', 'success');
    }
}

/**
 * Calculate all worksheet data
 * @param {Object} data - Input data for calculations
 * @returns {Object} Calculated results
 */
function calculateWorksheetData(data) {
    const {
        systemSize, consumptionUnits, fuelCharges, tax,
        sanctionedLoad, demandRate, additionalCharges,
        unitsPerDay, avgConsumptionRate,
        sgyWithRate, sgyWithoutRate, exceedUnitRate
    } = data;

    // Monthly Fixed Bill Calculation
    const demandCharge = sanctionedLoad * demandRate;
    const monthlyFixedBill = demandCharge + additionalCharges;
    const avgFuelCharges = fuelCharges;
    const avgTax = tax;
    const totalFixedBill = demandCharge + avgFuelCharges + avgTax + additionalCharges;

    // Solar Production Details
    const dailyProduction = systemSize * unitsPerDay;
    const monthlyProduction = Math.round(dailyProduction * 30);
    const solarMinusConsumption = monthlyProduction - consumptionUnits;
    const exceedUnits = solarMinusConsumption > 0 ? solarMinusConsumption : 0;

    // 1 Month Average Consumption
    const oneMonthConsumption = consumptionUnits * avgConsumptionRate;

    // Total Electricity Bill
    const totalElectricityBill = monthlyFixedBill + oneMonthConsumption;

    // PM SGY With calculations
    const sgyWithExceedUnitTotal = exceedUnits;
    const sgyWithExceedUnitRate = sgyWithExceedUnitTotal * sgyWithRate;
    const sgyWithFixedBill = monthlyFixedBill - sgyWithExceedUnitRate;
    const sgyWithActualBill = oneMonthConsumption + monthlyFixedBill;
    const sgyWithMESCOMPay = sgyWithActualBill - sgyWithExceedUnitRate;
    const sgyWithSolarSaved = sgyWithExceedUnitRate;

    // PM SGY Without calculations
    const sgyWithoutExceedUnitTotal = exceedUnits;
    const sgyWithoutExceedUnitRate = sgyWithoutExceedUnitTotal * sgyWithoutRate;
    const sgyWithoutFixedBill = monthlyFixedBill - sgyWithoutExceedUnitRate;
    const sgyWithoutActualBill = oneMonthConsumption + monthlyFixedBill;
    const sgyWithoutMESCOMPay = sgyWithoutActualBill - sgyWithoutExceedUnitRate;
    const sgyWithoutSolarSaved = sgyWithoutExceedUnitRate;

    return {
        consumptionUnits,
        fuelCharges,
        tax,
        demandCharge,
        additionalCharges,
        monthlyFixedBill: totalFixedBill,
        avgFuelCharges,
        avgTax,
        dailyProduction,
        monthlyProduction,
        solarMinusConsumption,
        exceedUnits,
        oneMonthConsumption,
        totalElectricityBill,
        sgyWithExceedUnitTotal,
        sgyWithExceedUnitRate,
        sgyWithFixedBill,
        sgyWithActualBill,
        sgyWithMESCOMPay,
        sgyWithSolarSaved,
        sgyWithoutExceedUnitTotal,
        sgyWithoutExceedUnitRate,
        sgyWithoutFixedBill,
        sgyWithoutActualBill,
        sgyWithoutMESCOMPay,
        sgyWithoutSolarSaved
    };
}

/**
 * Generate the HTML document for the worksheet
 * @param {Object} calc - Calculated data
 * @param {Object} data - Input data
 * @param {string} customerName - Customer name
 * @param {string} date - Date of worksheet
 * @param {number} systemSize - Solar system size
 * @param {string} month - Month of analysis
 * @returns {string} HTML document
 */
function generateWorksheetHTML(calc, data, customerName, date, systemSize, month) {
    const formattedDate = date ? formatDateIndian(date) : new Date().toLocaleDateString('en-IN');

    // Clean, professional, simple layout (A4 optimized) meant for both preview and print
    // Styles are now in ../css/dataWorksheetPreview.css
    return `
    <!-- Scoped Wrapper for Preview -->
    <div class="dw-print-scope">
        <!-- Link the external CSS for printing contexts -->
        <link rel="stylesheet" href="../css/dataWorksheetPreview.css">

        <div class="dw-wrapper">
            <div class="dw-header-section">
                <div class="dw-company-name">Shresht Systems</div>
                <div class="dw-company-details">
                    3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113<br>
                    Ph: 7204657707 / 9901730305 | Email: shreshtsystems@gmail.com | GSTIN: 29AGCPN4093N1ZS
                </div>
            </div>

            <div class="dw-doc-title">Data Worksheet</div>

            <div class="dw-info-grid">
                <div class="dw-info-item">
                    <span class="dw-label">Customer Name:</span>
                    <span>${customerName}</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-label">System Size:</span>
                    <span>${systemSize} KW</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-label">Month:</span>
                    <span>${month}</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-label">Date:</span>
                    <span>${formattedDate}</span>
                </div>
            </div>

            <table class="dw-data-table">
                <thead>
                    <tr>
                        <th style="width: 40%">Description</th>
                        <th style="width: 20%">Units</th>
                        <th style="width: 20%">Amount (₹)</th>
                        <th style="width: 20%">Tax (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Current Consumption</td>
                        <td class="text-center">${calc.consumptionUnits}</td>
                        <td class="text-right">${calc.fuelCharges.toFixed(2)}</td>
                        <td class="text-right">${calc.tax.toFixed(2)}</td>
                    </tr>
                    <tr class="font-bold">
                        <td>Total / Average</td>
                        <td class="text-center">${calc.consumptionUnits}</td>
                        <td class="text-right">${calc.fuelCharges.toFixed(2)}</td>
                        <td class="text-right">${calc.tax.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="dw-section-header">Demand Charges & Monthly Fixed Bill</div>
            <table class="dw-data-table">
                <tbody>
                    <tr>
                        <td>Demand Charge (Load × Rate)</td>
                        <td class="text-right">${systemSize} × ${data.demandRate}</td>
                        <td class="text-right" style="width: 120px;">₹ ${calc.demandCharge.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Add: Average Fuel & Tax + Additional</td>
                        <td class="text-right"></td>
                        <td class="text-right">₹ ${(calc.monthlyFixedBill - calc.demandCharge).toFixed(2)}</td>
                    </tr>
                    <tr class="font-bold" style="background:#f9f9f9;">
                        <td>Total Monthly Fixed Bill</td>
                        <td class="text-right"></td>
                        <td class="text-right">₹ ${calc.monthlyFixedBill.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="dw-result-container">
                <div class="dw-result-box">
                    <div class="dw-result-title">1 Month Consumption</div>
                    <div class="dw-result-amount">₹ ${calc.oneMonthConsumption.toFixed(2)}</div>
                    <div style="font-size:10px; margin-top:5px;">(Based on Avg Rate ${calc.avgConsumptionRate})</div>
                </div>
                <div class="dw-result-box" style="border-width: 3px;">
                    <div class="dw-result-title">Total Electricity Bill</div>
                    <div class="dw-result-amount">₹ ${calc.totalElectricityBill.toFixed(2)}</div>
                    <div style="font-size:10px; margin-top:5px;">(Fixed Bill + Consumption)</div>
                </div>
            </div>

            <div class="dw-section-header">Solar Production (${systemSize} KW)</div>
            <table class="dw-data-table">
                <tr>
                    <td>Daily Production (${data.unitsPerDay} units/kW)</td>
                    <td class="text-right font-bold">${calc.dailyProduction.toFixed(1)} Units</td>
                </tr>
                <tr>
                    <td>Monthly Production (30 Days)</td>
                    <td class="text-right font-bold">${calc.monthlyProduction} Units</td>
                </tr>
                <tr>
                    <td>Net Grid Interaction (Solar - Consumption)</td>
                    <td class="text-right font-bold">${calc.solarMinusConsumption} Units (${calc.solarMinusConsumption > 0 ? 'Surplus' : 'Deficit'})</td>
                </tr>
            </table>

            <div class="dw-section-header">PM SGY Subsidy Analysis</div>
            <div class="dw-subsidy-container">
                <!-- With Subsidy -->
                <div class="dw-subsidy-box">
                    <div class="dw-subsidy-header">WITH PM SGY Subsidy</div>
                    <div class="dw-row">
                        <span>Unit Rate:</span>
                        <span>₹${data.sgyWithRate.toFixed(2)}</span>
                    </div>
                    <div class="dw-row">
                        <span>Exceed Units Value:</span>
                        <span>₹${calc.sgyWithExceedUnitRate.toFixed(2)}</span>
                    </div>
                    <hr style="border-top:1px dashed #ccc; margin:5px 0;">
                    <div class="dw-row">
                        <span>- Fixed Bill Adj.:</span>
                        <span>₹${calc.sgyWithFixedBill.toFixed(2)}</span>
                    </div>
                     <div class="dw-row">
                        <span>Net Payable:</span>
                        <span>₹${calc.sgyWithActualBill.toFixed(2)}</span>
                    </div>
                    <div class="dw-row total">
                        <span>MESCOM Payout:</span>
                        <span>₹${calc.sgyWithMESCOMPay.toFixed(2)}</span>
                    </div>
                    <div class="dw-row" style="margin-top:10px; font-weight:bold; font-size:14px;">
                        <span>Monthly Savings:</span>
                        <span>₹${calc.sgyWithSolarSaved.toFixed(2)}</span>
                    </div>
                </div>

                <!-- Without Subsidy -->
                <div class="dw-subsidy-box">
                    <div class="dw-subsidy-header">WITHOUT PM SGY Subsidy</div>
                    <div class="dw-row">
                        <span>Unit Rate:</span>
                        <span>₹${data.sgyWithoutRate.toFixed(2)}</span>
                    </div>
                    <div class="dw-row">
                        <span>Exceed Units Value:</span>
                        <span>₹${calc.sgyWithoutExceedUnitRate.toFixed(2)}</span>
                    </div>
                    <hr style="border-top:1px dashed #ccc; margin:5px 0;">
                    <div class="dw-row">
                        <span>- Fixed Bill Adj.:</span>
                        <span>₹${calc.sgyWithoutFixedBill.toFixed(2)}</span>
                    </div>
                    <div class="dw-row">
                        <span>Net Payable:</span>
                        <span>₹${calc.sgyWithoutActualBill.toFixed(2)}</span>
                    </div>
                    <div class="dw-row total">
                        <span>MESCOM Payout:</span>
                        <span>₹${calc.sgyWithoutMESCOMPay.toFixed(2)}</span>
                    </div>
                    <div class="dw-row" style="margin-top:10px; font-weight:bold; font-size:14px;">
                        <span>Monthly Savings:</span>
                        <span>₹${calc.sgyWithoutSolarSaved.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div class="dw-footer">
                Thank you for choosing Shresht Systems for your solar energy needs.
            </div>
        </div>
    </div>
    `;
}
