/**
 * Data Worksheet Report Module
 * Solar Installation Calculator - migrated from calculations module
 */

/**
 * Initialize data worksheet section
 */
function initDataWorksheetReport() {
    // Set default date
    document.getElementById('dw_date').valueAsDate = new Date();
    
    // Set up event handlers
    document.getElementById('generate-worksheet')?.addEventListener('click', generateDataWorksheet);
    document.getElementById('clear-worksheet-form')?.addEventListener('click', clearWorksheetForm);
    
    // Load worksheet history
    loadWorksheetHistory();
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
 * Load worksheet history
 */
async function loadWorksheetHistory() {
    const container = document.getElementById('worksheet-history');
    if (!container) return;
    
    try {
        const response = await fetch('/reports/data-worksheet/history');
        const data = await response.json();
        
        if (data.success && data.worksheets && data.worksheets.length > 0) {
            container.innerHTML = data.worksheets.map(ws => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex items-center gap-3">
                        <div class="bg-purple-100 p-2 rounded">
                            <i class="fas fa-solar-panel text-purple-600"></i>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${ws.customerName || 'Customer'} - ${ws.systemSize}KW</p>
                            <p class="text-sm text-gray-500">${formatDateIndian(ws.date)}</p>
                        </div>
                    </div>
                    <button onclick="loadWorksheet('${ws._id}')" class="text-blue-600 hover:text-blue-700">
                        <i class="fas fa-redo"></i> Load
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-file-alt text-3xl text-gray-300 mb-2"></i>
                    <p>No worksheet history found</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading worksheet history:', error);
        container.innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <i class="fas fa-file-alt text-3xl text-gray-300 mb-2"></i>
                <p>No worksheet history found</p>
            </div>
        `;
    }
}

/**
 * Load a saved worksheet
 * @param {string} worksheetId 
 */
async function loadWorksheet(worksheetId) {
    try {
        const response = await fetch(`/reports/${worksheetId}`);
        const data = await response.json();
        
        if (data.success && data.report && data.report.data) {
            const ws = data.report.data;
            
            // Populate form fields
            document.getElementById('dw_customerName').value = ws.customerName || '';
            document.getElementById('dw_systemSize').value = ws.systemSize || '';
            document.getElementById('dw_month').value = ws.month || '';
            document.getElementById('dw_date').value = ws.date || '';
            document.getElementById('dw_consumptionUnits').value = ws.consumptionUnits || '';
            document.getElementById('dw_fuelCharges').value = ws.fuelCharges || '';
            document.getElementById('dw_tax').value = ws.tax || '';
            document.getElementById('dw_sanctionedLoad').value = ws.sanctionedLoad || '';
            document.getElementById('dw_demandRate').value = ws.demandRate || '';
            document.getElementById('dw_additionalCharges').value = ws.additionalCharges || '';
            document.getElementById('dw_unitsPerDay').value = ws.unitsPerDay || 4;
            document.getElementById('dw_avgConsumptionRate').value = ws.avgConsumptionRate || '';
            document.getElementById('dw_sgyWithRate').value = ws.sgyWithRate || '';
            document.getElementById('dw_sgyWithoutRate').value = ws.sgyWithoutRate || '';
            document.getElementById('dw_exceedUnitRate').value = ws.exceedUnitRate || '';
            
            showNotification('Worksheet loaded successfully', 'success');
        }
    } catch (error) {
        console.error('Error loading worksheet:', error);
        showNotification('Failed to load worksheet', 'error');
    }
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

    // Save worksheet to history
    saveWorksheetToHistory({
        customerName, systemSize, month, date,
        consumptionUnits, fuelCharges, tax,
        sanctionedLoad, demandRate, additionalCharges,
        unitsPerDay, avgConsumptionRate,
        sgyWithRate, sgyWithoutRate, exceedUnitRate
    });

    // Show preview with print/save options
    showWorksheetPreview(documentHTML);
}

/**
 * Save worksheet to history
 * @param {Object} data - Worksheet data
 */
async function saveWorksheetToHistory(data) {
    try {
        await fetch('/reports/data-worksheet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        // Reload history
        loadWorksheetHistory();
    } catch (error) {
        console.error('Error saving worksheet to history:', error);
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
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Worksheet - ${systemSize} KW Solar Installation</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; padding: 20px; background: #f5f5f5; }
            .dw-container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .dw-company-info { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #2563eb; }
            .dw-company-info h2 { color: #1e40af; font-size: 24px; margin-bottom: 5px; }
            .dw-company-info p { font-size: 12px; color: #666; }
            .dw-header { text-align: center; margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 8px; }
            .dw-header h1 { font-size: 20px; margin-bottom: 5px; }
            .dw-header p { font-size: 12px; opacity: 0.9; }
            .dw-info-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
            .dw-info-item { background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #2563eb; }
            .dw-info-label { font-size: 11px; color: #666; text-transform: uppercase; }
            .dw-info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
            .dw-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .dw-table th, .dw-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            .dw-table th { background: #f1f5f9; font-weight: 600; color: #475569; }
            .dw-highlight-row { background: #f0f9ff; }
            .dw-section-title { font-size: 16px; font-weight: 600; color: #1e40af; margin: 25px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; }
            .dw-subsection-title { font-size: 14px; font-weight: 500; color: #475569; margin: 15px 0 10px; }
            .dw-calculation-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .dw-calculation-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
            .dw-calculation-row:last-child { border-bottom: none; }
            .dw-result-box { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }
            .dw-result-box h3 { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
            .dw-result-value { font-size: 24px; font-weight: bold; }
            .dw-subsidy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
            .dw-subsidy-card { padding: 15px; border-radius: 10px; }
            .dw-subsidy-card.with-sgy { background: linear-gradient(135deg, #d1fae5, #a7f3d0); border: 2px solid #10b981; }
            .dw-subsidy-card.without-sgy { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; }
            .dw-subsidy-card h4 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
            .dw-subsidy-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
            .dw-subsidy-row.total { font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 5px; }
            .dw-note-section { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .dw-subsidy-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            .dw-subsidy-table th, .dw-subsidy-table td { border: 1px solid #fcd34d; padding: 8px; text-align: center; }
            .dw-footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            .dw-footer-contact { display: flex; justify-content: center; gap: 30px; margin: 15px 0; font-size: 13px; color: #64748b; }
            @media print { body { background: white; } .dw-container { box-shadow: none; } }
        </style>
    </head>
    <body>
        <div class="dw-container">
            <div class="dw-company-info">
                <h2>SHRESHT SYSTEMS</h2>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | Email: shreshtsystems@gmail.com</p>
                <p>GSTIN: 29AGCPN4093N1ZS | Website: www.shreshtsystems.com</p>
            </div>
            
            <div class="dw-header">
                <h1>DATA WorkSheet for ${systemSize} KW String Solar Installation</h1>
                <p>Solar Energy Analysis & Savings Calculation</p>
            </div>
            
            <div class="dw-info-section">
                <div class="dw-info-item">
                    <span class="dw-info-label">Customer Name</span>
                    <span class="dw-info-value">${customerName}</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-info-label">System Size</span>
                    <span class="dw-info-value">${systemSize} KW</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-info-label">Month</span>
                    <span class="dw-info-value">${month}</span>
                </div>
                <div class="dw-info-item">
                    <span class="dw-info-label">Date</span>
                    <span class="dw-info-value">${formattedDate}</span>
                </div>
            </div>

            <table class="dw-table main-table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Month</th>
                        <th>Consumption Units</th>
                        <th>Fuel Charges</th>
                        <th>Tax</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${month}</td>
                        <td>${calc.consumptionUnits}</td>
                        <td>${calc.fuelCharges.toFixed(2)}</td>
                        <td>${calc.tax.toFixed(2)}</td>
                    </tr>
                    <tr class="dw-highlight-row">
                        <td colspan="2"><strong>Total/Average</strong></td>
                        <td><strong>${calc.consumptionUnits}</strong></td>
                        <td><strong>${calc.fuelCharges.toFixed(2)}</strong></td>
                        <td><strong>${calc.tax.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="dw-section-title">Demand Charges</div>
            <table class="dw-table">
                <tr>
                    <td>Sanctioned Load: ${systemSize} KW</td>
                    <td>Rate: Rs.${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}/KW</td>
                    <td>Calculation: ${systemSize} × ${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}</td>
                    <td>Additional: ${calc.additionalCharges.toFixed(2)}</td>
                </tr>
            </table>

            <div class="dw-section-title">Monthly Fixed Bill</div>
            <div class="dw-calculation-box">
                <div class="dw-calculation-row"><span>Demand Charge:</span><span>₹ ${calc.demandCharge.toFixed(2)}</span></div>
                <div class="dw-calculation-row"><span>Average Fuel Charges:</span><span>₹ ${calc.avgFuelCharges.toFixed(2)}</span></div>
                <div class="dw-calculation-row"><span>Average Tax:</span><span>₹ ${calc.avgTax.toFixed(2)}</span></div>
                <div class="dw-calculation-row"><span><strong>Total:</strong></span><span><strong>₹ ${calc.monthlyFixedBill.toFixed(2)}</strong></span></div>
            </div>

            <div class="dw-section-title">1 Month Average Consumption (${(calc.oneMonthConsumption / calc.consumptionUnits).toFixed(2)} × ${calc.consumptionUnits})</div>
            <div class="dw-result-box">
                <h3>Total Consumption</h3>
                <div class="dw-result-value">₹ ${calc.oneMonthConsumption.toFixed(2)}</div>
            </div>

            <div class="dw-subsection-title">Total Electricity Bill = Monthly Fixed Bill + Consumption (${calc.monthlyFixedBill.toFixed(2)} + ${calc.oneMonthConsumption.toFixed(2)})</div>
            <div class="dw-result-box" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <h3>Total Electricity Bill</h3>
                <div class="dw-result-value">₹ ${calc.totalElectricityBill.toFixed(2)}</div>
            </div>

            <div class="dw-section-title">Solar Production Details - ${systemSize} KW System</div>
            <div class="dw-calculation-box">
                <div class="dw-calculation-row"><span>${systemSize} KW × ${data.unitsPerDay} units/day = ${calc.dailyProduction} units/day</span><span>(1KW generates ${data.unitsPerDay} units)</span></div>
                <div class="dw-calculation-row"><span>${calc.dailyProduction} × 30 days = ${calc.monthlyProduction} units/month</span><span><strong>Monthly: ${calc.monthlyProduction} units</strong></span></div>
                <div class="dw-calculation-row"><span>Solar Generation - Consumption = ${calc.monthlyProduction} - ${calc.consumptionUnits}</span><span><strong>${calc.solarMinusConsumption} ${calc.solarMinusConsumption > 0 ? 'Exceed' : 'Deficit'} units</strong></span></div>
            </div>

            <div class="dw-section-title">PM SGY Subsidy Comparison</div>
            <div class="dw-subsidy-grid">
                <div class="dw-subsidy-card with-sgy">
                    <h4>PM SGY With Subsidy</h4>
                    <table style="width:100%; margin:10px 0; font-size:12px; border-collapse:collapse;">
                        <tr style="background:#10b981; color:white;">
                            <th style="padding:6px;">Rate/unit</th><th style="padding:6px;">Exceed Units</th><th style="padding:6px;">Value</th>
                        </tr>
                        <tr>
                            <td style="padding:6px; text-align:center;">₹${data.sgyWithRate.toFixed(2)}</td>
                            <td style="padding:6px; text-align:center;">${calc.sgyWithExceedUnitTotal}</td>
                            <td style="padding:6px; text-align:center;">₹${calc.sgyWithExceedUnitRate.toFixed(2)}</td>
                        </tr>
                    </table>
                    <div style="background:white; padding:10px; border-radius:6px;">
                        <div class="dw-subsidy-row"><span>Exceed Unit Rate - Fixed Bill:</span><span>₹${calc.sgyWithFixedBill.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row"><span>Actual Bill (Consumption + Fixed):</span><span>₹${calc.sgyWithActualBill.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row total"><span>MESCOM Pay to Customer:</span><span>₹${calc.sgyWithMESCOMPay.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row total" style="color:#10b981;"><span>Solar Saved per Month:</span><span>₹${calc.sgyWithSolarSaved.toFixed(2)}</span></div>
                    </div>
                </div>
                <div class="dw-subsidy-card without-sgy">
                    <h4>PM SGY Without Subsidy</h4>
                    <table style="width:100%; margin:10px 0; font-size:12px; border-collapse:collapse;">
                        <tr style="background:#f59e0b; color:white;">
                            <th style="padding:6px;">Rate/unit</th><th style="padding:6px;">Exceed Units</th><th style="padding:6px;">Value</th>
                        </tr>
                        <tr>
                            <td style="padding:6px; text-align:center;">₹${data.sgyWithoutRate.toFixed(2)}</td>
                            <td style="padding:6px; text-align:center;">${calc.sgyWithoutExceedUnitTotal}</td>
                            <td style="padding:6px; text-align:center;">₹${calc.sgyWithoutExceedUnitRate.toFixed(2)}</td>
                        </tr>
                    </table>
                    <div style="background:white; padding:10px; border-radius:6px;">
                        <div class="dw-subsidy-row"><span>Exceed Unit Rate - Fixed Bill:</span><span>₹${calc.sgyWithoutFixedBill.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row"><span>Actual Bill (Consumption + Fixed):</span><span>₹${calc.sgyWithoutActualBill.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row total"><span>MESCOM Pay to Customer:</span><span>₹${calc.sgyWithoutMESCOMPay.toFixed(2)}</span></div>
                        <div class="dw-subsidy-row total" style="color:#f59e0b;"><span>Solar Saved per Month:</span><span>₹${calc.sgyWithoutSolarSaved.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>

            <div class="dw-note-section">
                <h4 style="color:#92400e; margin-bottom:10px;">PM SGY Subsidy Reference:</h4>
                <table class="dw-subsidy-table">
                    <tr style="background:#f59e0b; color:white;">
                        <th>KW Range</th><th>Subsidy Amount</th><th>Unit Rate</th>
                    </tr>
                    <tr><td>1-2 KW</td><td>₹30,000 to ₹60,000</td><td>₹2.30</td></tr>
                    <tr style="background:#fef3c7;"><td>2-3 KW</td><td>₹60,000 to ₹78,000</td><td>₹2.48</td></tr>
                    <tr><td>Above 3 KW</td><td>₹78,000</td><td>₹2.93</td></tr>
                </table>
            </div>

            <div class="dw-footer">
                <p><strong>For Shresht Systems</strong></p>
                <div class="dw-footer-contact">
                    <div>📞 9901730305 / 7204657707</div>
                    <div>✉️ shreshtsystems@gmail.com</div>
                    <div>🌐 www.shreshtsystems.com</div>
                </div>
                <p style="margin-top:15px; font-style:italic; color:#64748b;">Thank you for choosing solar energy with Shresht Systems</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Show worksheet preview modal
 * @param {string} documentHTML - HTML document to preview
 */
function showWorksheetPreview(documentHTML) {
    // Remove existing preview if any
    const existingPreview = document.getElementById('worksheetPreview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const previewModal = document.createElement('div');
    previewModal.id = 'worksheetPreview';
    previewModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center overflow-hidden';
    
    previewModal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-screen m-4 flex flex-col">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h2 class="text-xl font-bold flex items-center gap-2">
                    <i class="fas fa-eye"></i>
                    Document Preview
                </h2>
                <div class="flex gap-3">
                    <button id="printWorksheetBtn" class="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
                        <i class="fas fa-print"></i>
                        Print
                    </button>
                    <button id="saveWorksheetPDFBtn" class="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2">
                        <i class="fas fa-file-pdf"></i>
                        Save PDF
                    </button>
                    <button id="closePreviewBtn" class="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center gap-2">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-auto p-4 bg-gray-100">
                <div id="worksheetPreviewContent" class="bg-white shadow-lg">
                    ${documentHTML}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    
    // Store HTML for printing/saving
    window.currentWorksheetHTML = documentHTML;
    
    // Add event listeners
    document.getElementById('printWorksheetBtn').addEventListener('click', printWorksheet);
    document.getElementById('saveWorksheetPDFBtn').addEventListener('click', saveWorksheetPDF);
    document.getElementById('closePreviewBtn').addEventListener('click', closeWorksheetPreview);
    
    // Close on escape key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeWorksheetPreview();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

/**
 * Close worksheet preview modal
 */
function closeWorksheetPreview() {
    const modal = document.getElementById('worksheetPreview');
    if (modal) {
        modal.remove();
    }
    window.currentWorksheetHTML = null;
}

/**
 * Print the worksheet document
 */
function printWorksheet() {
    if (window.currentWorksheetHTML) {
        printReport(window.currentWorksheetHTML, 'data-worksheet');
    }
}

/**
 * Save the worksheet as PDF
 */
function saveWorksheetPDF() {
    if (window.currentWorksheetHTML) {
        const customerName = document.getElementById('dw_customerName').value || 'customer';
        const systemSize = document.getElementById('dw_systemSize').value || 'solar';
        const filename = `data-worksheet-${customerName.replace(/\s+/g, '-')}-${systemSize}kw-${new Date().getTime()}`;
        saveReportPDF(window.currentWorksheetHTML, filename);
        closeWorksheetPreview();
    }
}
