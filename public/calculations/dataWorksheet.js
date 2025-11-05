/**
 * Data Worksheet Generator
 * Solar Installation Calculation and Document Generator
 * Handles input form, calculations, and document generation for solar installations
 */

/**
 * Opens the Data Worksheet input modal
 */
function openDataWorksheetModal() {
    const modal = document.createElement('div');
    modal.id = 'dataWorksheetModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-8';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 my-8">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-solar-panel text-3xl"></i>
                        <div>
                            <h2 class="text-2xl font-bold">Data Worksheet Generator</h2>
                            <p class="text-sm opacity-90">Solar Installation Calculator</p>
                        </div>
                    </div>
                    <button id="closeModalBtn" class="text-white hover:text-gray-200 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="p-6 max-h-[70vh] overflow-y-auto">
                <form id="dataWorksheetForm" class="space-y-6">
                    
                    <!-- Basic Information -->
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i>
                            Basic Information
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Solar System Size (KW)</label>
                                <input type="number" id="dw_systemSize" step="0.01" placeholder="e.g., 7" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Month</label>
                                <input type="text" id="dw_month" placeholder="e.g., July" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <!-- Consumption Data -->
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-bolt text-green-600"></i>
                            Consumption & Charges
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Consumption Units</label>
                                <input type="number" id="dw_consumptionUnits" step="0.01" placeholder="145" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Fuel Charges (₹)</label>
                                <input type="number" id="dw_fuelCharges" step="0.01" placeholder="0" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tax (₹)</label>
                                <input type="number" id="dw_tax" step="0.01" placeholder="76" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                            </div>
                        </div>
                    </div>

                    <!-- Demand Charges -->
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-charging-station text-yellow-600"></i>
                            Demand Charges
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Sanctioned Load (KW)</label>
                                <input type="number" id="dw_sanctionedLoad" step="0.01" placeholder="7" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Rate per KW (₹)</label>
                                <input type="number" id="dw_demandRate" step="0.01" placeholder="145" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Additional Charges (₹)</label>
                                <input type="number" id="dw_additionalCharges" step="0.01" placeholder="1015" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
                            </div>
                        </div>
                    </div>

                    <!-- Solar Production -->
                    <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-sun text-purple-600"></i>
                            Solar Production Details
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Units per Day (1kW generates)</label>
                                <input type="number" id="dw_unitsPerDay" step="0.01" value="4" placeholder="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Average Consumption per Unit (₹)</label>
                                <input type="number" id="dw_avgConsumptionRate" step="0.01" placeholder="5.80" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
                            </div>
                        </div>
                    </div>

                    <!-- PM SGY Subsidy Details -->
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-hand-holding-usd text-orange-600"></i>
                            PM SGY Subsidy Details
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">With SGY - Rate per Unit (₹)</label>
                                <input type="number" id="dw_sgyWithRate" step="0.01" placeholder="3.86" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Without SGY - Rate per Unit (₹)</label>
                                <input type="number" id="dw_sgyWithoutRate" step="0.01" placeholder="3.86" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Exceed Unit Rate (₹)</label>
                                <input type="number" id="dw_exceedUnitRate" step="0.01" placeholder="695" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                            </div>
                        </div>
                    </div>

                    <!-- Customer Information -->
                    <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-user text-indigo-600"></i>
                            Customer Information
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                                <input type="text" id="dw_customerName" placeholder="Enter customer name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                <input type="date" id="dw_date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                            </div>
                        </div>
                    </div>

                </form>
            </div>
            
            <div class="bg-gray-50 p-6 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
                <button id="cancelWorksheetBtn" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors">
                    <i class="fas fa-times mr-2"></i>Cancel
                </button>
                <button id="generateWorksheetBtn" class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors">
                    <i class="fas fa-file-pdf mr-2"></i>Generate Document
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set default date
    document.getElementById('dw_date').valueAsDate = new Date();
    
    // Add event listeners for buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeDataWorksheetModal);
    document.getElementById('cancelWorksheetBtn').addEventListener('click', closeDataWorksheetModal);
    document.getElementById('generateWorksheetBtn').addEventListener('click', generateDataWorksheet);
}

/**
 * Closes the Data Worksheet input modal
 */
function closeDataWorksheetModal() {
    const modal = document.getElementById('dataWorksheetModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Generates the data worksheet document
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
        showNotification('Please fill all required fields', 'error');
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

    // Close modal
    closeDataWorksheetModal();

    // Show preview with print/save options
    showWorksheetPreview(documentHTML);
}

/**
 * Calculates all worksheet data
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
    const dailyProduction = systemSize * unitsPerDay; // units/day
    const monthlyProduction = Math.round(dailyProduction * 30); // 28-30-840 units/month
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
        // Input data
        consumptionUnits,
        fuelCharges,
        tax,
        demandCharge,
        additionalCharges,
        
        // Monthly Fixed Bill
        monthlyFixedBill: totalFixedBill,
        avgFuelCharges,
        avgTax,
        
        // Solar Production
        dailyProduction,
        monthlyProduction,
        solarMinusConsumption,
        exceedUnits,
        
        // Consumption
        oneMonthConsumption,
        totalElectricityBill,
        
        // PM SGY With
        sgyWithExceedUnitTotal,
        sgyWithExceedUnitRate,
        sgyWithFixedBill,
        sgyWithActualBill,
        sgyWithMESCOMPay,
        sgyWithSolarSaved,
        
        // PM SGY Without
        sgyWithoutExceedUnitTotal,
        sgyWithoutExceedUnitRate,
        sgyWithoutFixedBill,
        sgyWithoutActualBill,
        sgyWithoutMESCOMPay,
        sgyWithoutSolarSaved
    };
}

/**
 * Generates the HTML document for the worksheet
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
        <link rel="stylesheet" href="../css/dataWorksheet.css">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                padding: 20px;
                background: #f5f5f5;
            }
        </style>
    </head>
    <body>
        <div class="dw-container">
            <!-- Company Header -->
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

            <!-- Consumption Table -->
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
                        <td colspan="2"><strong>Total</strong></td>
                        <td><strong>${calc.consumptionUnits}</strong></td>
                        <td><strong>${calc.fuelCharges.toFixed(2)}</strong></td>
                        <td><strong>${calc.tax.toFixed(2)}</strong></td>
                    </tr>
                    <tr class="dw-highlight-row">
                        <td colspan="2"><strong>Average</strong></td>
                        <td><strong>${calc.consumptionUnits}</strong></td>
                        <td><strong>${calc.fuelCharges.toFixed(2)}</strong></td>
                        <td><strong>${calc.tax.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>

            <!-- Demand Charges -->
            <div class="dw-section-title">Demand Charges</div>
            <table class="dw-table main-table">
                <thead>
                    <tr>
                        <th>Demand Charges</th>
                        <th>Sanctioned Load ${systemSize} KW</th>
                        <th>Rs.${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}/KW</th>
                        <th>${systemSize}*${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}</th>
                        <th>${calc.additionalCharges.toFixed(2)}</th>
                    </tr>
                </thead>
            </table>

            <!-- Monthly Fixed Bill -->
            <div class="dw-section-title">Monthly Fixed Bill</div>
            <div class="dw-calculation-box">
                <div class="dw-calculation-row">
                    <span>Demand Charge:</span>
                    <span>₹ ${calc.demandCharge.toFixed(2)}</span>
                </div>
                <div class="dw-calculation-row">
                    <span>Average Fuel Charges:</span>
                    <span>₹ ${calc.avgFuelCharges.toFixed(2)}</span>
                </div>
                <div class="dw-calculation-row">
                    <span>Average Tax:</span>
                    <span>₹ ${calc.avgTax.toFixed(2)}</span>
                </div>
                <div class="dw-calculation-row">
                    <span><strong>Total:</strong></span>
                    <span><strong>₹ ${calc.monthlyFixedBill.toFixed(2)}</strong></span>
                </div>
            </div>

            <!-- 1 Month Average Consumption -->
            <div class="dw-section-title">1 Months Average Consumption of Units ${(calc.oneMonthConsumption / calc.consumptionUnits).toFixed(2)}*${calc.consumptionUnits}</div>
            <div class="dw-result-box">
                <h3>Total</h3>
                <div class="dw-result-value">₹ ${calc.oneMonthConsumption.toFixed(2)}</div>
            </div>

            <!-- Total Electricity Bill -->
            <div class="dw-subsection-title">Total Electricity Bill = Monthly Fixed Bill + Consumption</div>
            <div class="dw-result-box">
                <h3>(${calc.monthlyFixedBill.toFixed(2)}+${calc.oneMonthConsumption.toFixed(2)})</h3>
                <div class="dw-result-value">₹ ${calc.totalElectricityBill.toFixed(2)}</div>
            </div>

            <!-- Solar Production Details -->
            <div class="dw-section-title">Solar Production Details in ${systemSize} KW</div>
            <table class="dw-table main-table">
                <tbody>
                    <tr>
                        <td colspan="2">${systemSize} KW*${data.unitsPerDay} units = ${calc.dailyProduction} units/day (1KW Generates ${data.unitsPerDay})</td>
                        <td colspan="2" rowspan="2"><strong>Total</strong><br>${calc.monthlyProduction} units/month</td>
                    </tr>
                    <tr>
                        <td colspan="2">28*30=${calc.monthlyProduction} units/month</td>
                    </tr>
                    <tr>
                        <td colspan="2">Solar Generation Units - Consumption of Units</td>
                        <td colspan="2">${calc.solarMinusConsumption} ${calc.solarMinusConsumption > 0 ? 'Exceed units' : 'Deficit units'}</td>
                    </tr>
                    <tr>
                        <td colspan="2">i.e; ${calc.monthlyProduction}-${calc.consumptionUnits}</td>
                        <td colspan="2"></td>
                    </tr>
                </tbody>
            </table>

            <!-- PM SGY Comparison -->
            <div class="dw-section-title">PM SGY Subsidy Comparison</div>
            
            <div class="dw-subsidy-grid">
                <!-- With SGY -->
                <div class="dw-subsidy-card with-sgy">
                    <h4>PM SGY With</h4>
                    <table style="width:100%; margin-top:10px;">
                        <tr style="background: #10b981; color: white;">
                            <th style="padding: 8px; font-size: 12px;">Rate/unit</th>
                            <th style="padding: 8px; font-size: 12px;">Exceed Unit</th>
                            <th style="padding: 8px; font-size: 12px;">Exceed Unit Rate</th>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-size: 12px;">With</td>
                            <td style="padding: 6px; font-size: 12px;">${data.sgyWithRate.toFixed(2)}</td>
                            <td style="padding: 6px; font-size: 12px;">${calc.sgyWithExceedUnitTotal}</td>
                            <td style="padding: 6px; font-size: 12px;">${calc.sgyWithExceedUnitRate.toFixed(2)}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                        <div class="dw-subsidy-row">
                            <span>Exceed Unit Rate - Fixed Bill:</span>
                            <span>₹ ${calc.sgyWithFixedBill.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span style="font-size: 11px;">(${calc.sgyWithExceedUnitRate.toFixed(2)}-${calc.monthlyFixedBill.toFixed(2)})</span>
                            <span></span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span>Actual Bill + MESCOM pay to Customer:</span>
                            <span>₹ ${calc.sgyWithActualBill.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span style="font-size: 11px;">(${calc.oneMonthConsumption.toFixed(2)}+${calc.monthlyFixedBill.toFixed(2)})</span>
                            <span></span>
                        </div>
                        <div class="dw-subsidy-row total">
                            <span>MESCOM pay to Customer:</span>
                            <span>₹ ${calc.sgyWithMESCOMPay.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row total" style="color: #10b981;">
                            <span>Solar Saved per Month:</span>
                            <span>₹ ${calc.sgyWithSolarSaved.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Without SGY -->
                <div class="dw-subsidy-card without-sgy">
                    <h4>PM SGY With Out</h4>
                    <table style="width:100%; margin-top:10px;">
                        <tr style="background: #f59e0b; color: white;">
                            <th style="padding: 8px; font-size: 12px;">Rate/unit</th>
                            <th style="padding: 8px; font-size: 12px;">Exceed Unit</th>
                            <th style="padding: 8px; font-size: 12px;">Exceed Unit Rate</th>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-size: 12px;">With Out</td>
                            <td style="padding: 6px; font-size: 12px;">${data.sgyWithoutRate.toFixed(2)}</td>
                            <td style="padding: 6px; font-size: 12px;">${calc.sgyWithoutExceedUnitTotal}</td>
                            <td style="padding: 6px; font-size: 12px;">${calc.sgyWithoutExceedUnitRate.toFixed(2)}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                        <div class="dw-subsidy-row">
                            <span>Exceed Unit Rate - Fixed Bill:</span>
                            <span>₹ ${calc.sgyWithoutFixedBill.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span style="font-size: 11px;">(${calc.sgyWithoutExceedUnitRate.toFixed(2)}-${calc.monthlyFixedBill.toFixed(2)})</span>
                            <span></span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span>Actual Bill + MESCOM pay to Customer:</span>
                            <span>₹ ${calc.sgyWithoutActualBill.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row">
                            <span style="font-size: 11px;">(${calc.oneMonthConsumption.toFixed(2)}+${calc.monthlyFixedBill.toFixed(2)})</span>
                            <span></span>
                        </div>
                        <div class="dw-subsidy-row total">
                            <span>MESCOM pay to Customer:</span>
                            <span>₹ ${calc.sgyWithoutMESCOMPay.toFixed(2)}</span>
                        </div>
                        <div class="dw-subsidy-row total" style="color: #f59e0b;">
                            <span>Solar Saved per Month:</span>
                            <span>₹ ${calc.sgyWithoutSolarSaved.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Note Section -->
            <div class="dw-note-section">
                <h4 style="color: #92400e; margin-bottom: 10px; font-size: 16px;">NOTE:</h4>
                <p style="color: #92400e; font-size: 14px; font-weight: bold; margin-bottom: 8px;">PM SGY Subsidy Details</p>
                <table class="dw-subsidy-table">
                    <tr style="background: #f59e0b; color: white;">
                        <th style="padding: 8px;">KW</th>
                        <th style="padding: 8px;">Subsidy Amount</th>
                        <th style="padding: 8px;">Unit Rate</th>
                    </tr>
                    <tr>
                        <td style="padding: 8px; text-align: center;">1-2 KW</td>
                        <td style="padding: 8px; text-align: center;">30000/- to 60000/-</td>
                        <td style="padding: 8px; text-align: center;">2.3</td>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <td style="padding: 8px; text-align: center;">2-3 KW</td>
                        <td style="padding: 8px; text-align: center;">60000/- to 78000/-</td>
                        <td style="padding: 8px; text-align: center;">2.48</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; text-align: center;">Above 3 KW</td>
                        <td style="padding: 8px; text-align: center;">78000/-</td>
                        <td style="padding: 8px; text-align: center;">2.93</td>
                    </tr>
                </table>
            </div>

            <!-- Footer -->
            <div class="dw-footer">
                <p><strong>For Shresht Systems</strong></p>
                <div class="dw-footer-contact">
                    <div>📞 9901730305 / 7204657707</div>
                    <div>✉️ shreshtsystems@gmail.com</div>
                    <div>🌐 www.shreshtsystems.com</div>
                </div>
                <p style="margin-top: 15px; font-style: italic;">Thank you for choosing solar energy with Shresht Systems</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Shows the worksheet preview modal
 * @param {string} documentHTML - HTML document to preview
 */
function showWorksheetPreview(documentHTML) {
    const previewModal = document.createElement('div');
    previewModal.id = 'worksheetPreview';
    previewModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center overflow-hidden';
    
    previewModal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-screen m-4 flex flex-col">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h2 class="text-xl font-bold flex items-center gap-2">
                    <i class="fas fa-eye"></i>
                    Document Preview
                </h2>
                <div class="flex gap-3">
                    <button id="printWorksheetBtn" class="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
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
    
    // Store the HTML for printing/saving
    window.currentWorksheetHTML = documentHTML;
    
    // Add event listeners for preview buttons
    document.getElementById('printWorksheetBtn').addEventListener('click', printWorksheet);
    document.getElementById('saveWorksheetPDFBtn').addEventListener('click', saveWorksheetPDF);
    document.getElementById('closePreviewBtn').addEventListener('click', closeWorksheetPreview);
}

/**
 * Closes the worksheet preview modal
 */
function closeWorksheetPreview() {
    const modal = document.getElementById('worksheetPreview');
    if (modal) {
        modal.remove();
    }
    window.currentWorksheetHTML = null;
}

/**
 * Prints the worksheet document
 */
function printWorksheet() {
    if (window.currentWorksheetHTML && window.electronAPI) {
        window.electronAPI.handlePrintEvent(window.currentWorksheetHTML, 'print', 'data-worksheet');
    } else if (window.currentWorksheetHTML) {
        // Fallback for browser
        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write(window.currentWorksheetHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }
}

/**
 * Saves the worksheet as PDF
 */
function saveWorksheetPDF() {
    if (window.currentWorksheetHTML && window.electronAPI) {
        const filename = `data-worksheet-${new Date().getTime()}`;
        window.electronAPI.handlePrintEvent(window.currentWorksheetHTML, 'savePDF', filename);
        showNotification('PDF saved successfully!', 'success');
    } else {
        showNotification('PDF save requires Electron environment', 'error');
    }
}
