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
    <style>
        /* 1. Global Resets & Body */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f7f6;
            color: #333;
            padding: 20px;
        }

        /* 2. Main Container */
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        /* 3. Headers */
        .company-header {
            padding: 20px 25px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        .company-header h2 {
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .company-header p {
            font-size: 12px;
            color: #555;
            line-height: 1.5;
            margin: 0;
        }
        .company-header .contact-info {
            text-align: right;
            font-size: 12px;
        }

        .report-header {
            text-align: center;
            padding: 30px 25px;
            border-bottom: 1px solid #eee;
        }
        .report-header h1 {
            font-size: 24px;
            color: #111;
            margin-bottom: 8px;
        }
        .report-header p {
            font-size: 16px;
            color: #777;
        }

        /* 4. Customer Info Grid */
        .customer-info {
            padding: 20px 25px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            border-bottom: 1px solid #eee;
        }
        .info-item {
            background: #fdfdfd;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 6px;
        }
        .info-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #888;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .info-value {
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }

        /* 5. Content Sections */
        .section {
            padding: 20px 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            padding-bottom: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #10b981; /* Green accent */
        }
        .subsection-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            text-align: center;
            margin-top: 20px;
            margin-bottom: 10px;
        }

        /* 6. Data Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th,
        .data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .data-table thead th {
            background-color: #f9f9f9;
            font-weight: 600;
            color: #555;
            text-transform: uppercase;
            font-size: 12px;
        }
        .data-table tbody tr:hover {
            background-color: #fcfcfc;
        }
        .data-table tfoot tr {
            background-color: #f5f5f5;
        }
        .data-table tfoot td {
            font-weight: 700;
            color: #222;
            border-top: 2px solid #ddd;
        }

        /* 7. Calculation & Result Boxes */
        .calc-box {
            background-color: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 20px;
        }
        .calc-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 15px;
            padding: 10px 0;
            border-bottom: 1px dashed #ddd;
        }
        .calc-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .calc-row:first-child {
            padding-top: 0;
        }
        .calc-row span:first-child {
            color: #555;
        }
        .calc-row span:last-child {
            font-weight: 600;
            color: #111;
        }
        .calc-row.total {
            padding-top: 10px;
            margin-top: 5px;
            border-top: 2px solid #ccc;
        }
        .calc-row.total span {
            font-size: 17px;
            font-weight: 700;
            color: #000;
        }

        .result-box {
            background-color: #e6f7ff; /* Light blue */
            border: 1px solid #b3e0f2;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
        }
        .result-box h3 {
            font-size: 16px;
            font-weight: 500;
            color: #02567c;
            margin-bottom: 8px;
        }
        .result-value {
            font-size: 28px;
            font-weight: 700;
            color: #02567c;
        }

        /* 8. Subsidy Comparison Grid */
        .subsidy-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .subsidy-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .subsidy-card h4 {
            padding: 15px 20px;
            font-size: 16px;
            color: #fff;
            margin: 0;
        }
        .subsidy-card.with-sgy h4 {
            background-color: #10b981; /* Green */
        }
        .subsidy-card.without-sgy h4 {
            background-color: #f59e0b; /* Orange */
        }
        .subsidy-card .card-content {
            padding: 20px;
        }
        /* Re-using calc-box for subsidy details */
        .subsidy-card .calc-box {
            background-color: #fff;
            padding: 0;
            border: none;
            margin-top: 15px;
        }
        .subsidy-card .calc-row span:first-child {
            font-size: 14px;
        }
        .subsidy-card .calc-row span:last-child {
            font-size: 15px;
        }
        .subsidy-card .calc-row.details {
            font-size: 12px;
            color: #777;
            padding-top: 2px;
            padding-bottom: 8px;
            border: none;
        }
        .subsidy-card .calc-row.details span {
            color: #777;
            font-weight: 400;
        }
        .subsidy-card .calc-row.total {
            margin-top: 10px;
            padding-top: 10px;
        }
        .subsidy-card .calc-row.final-saving span {
            font-size: 18px;
            font-weight: 700;
        }
        .subsidy-card.with-sgy .calc-row.final-saving span {
            color: #10b981;
        }
        .subsidy-card.without-sgy .calc-row.final-saving span {
            color: #f59e0b;
        }

        /* 9. Note Section */
        .note-section {
            background-color: #fffbeb; /* Light yellow */
            border: 1px solid #fde68a;
            border-left: 4px solid #f59e0b; /* Orange */
            border-radius: 6px;
            padding: 20px;
            margin-top: 20px;
        }
        .note-section h4 {
            color: #92400e;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .note-section p {
            color: #92400e;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        /* Style for the subsidy table in notes */
        .note-section .data-table thead th {
            background-color: #f59e0b;
            color: white;
            font-size: 13px;
        }
        .note-section .data-table tr:nth-child(even) {
            background-color: #fef9c3; /* Lighter yellow stripe */
        }
        .note-section .data-table td {
            text-align: center;
        }

        /* 10. Footer */
        .footer {
            padding: 30px 25px;
            border-top: 1px solid #e0e0e0;
            margin-top: 20px;
            text-align: center;
            font-size: 13px;
            color: #777;
        }
        .footer p {
            margin: 0 0 10px 0;
        }
        .footer .footer-contact {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 15px;
            font-size: 14px;
            color: #444;
        }

        /* 11. Responsive */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .company-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .company-header .contact-info {
                text-align: left;
                width: 100%;
            }
            .section {
                padding: 15px;
            }
            .subsidy-grid {
                grid-template-columns: 1fr;
            }
            .footer-contact {
                flex-direction: column;
                gap: 5px;
            }
        }
        @media (max-width: 480px) {
            .customer-info {
                grid-template-columns: 1fr;
            }
            .report-header h1 {
                font-size: 20px;
            }
        }

    </style>
</head>
<body>
    <div class="container">
        <header class="company-header">
            <div>
                <h2>SHRESHT SYSTEMS</h2>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>GSTIN: 29AGCPN4093N1ZS</p>
            </div>
            <div class="contact-info">
                <p>Ph: 7204657707 / 9901730305</p>
                <p>Email: shreshtsystems@gmail.com</p>
                <p>Website: www.shreshtsystems.com</p>
            </div>
        </header>
        
        <div class="report-header">
            <h1>DATA WorkSheet for ${systemSize} KW String Solar Installation</h1>
            <p>Solar Energy Analysis & Savings Calculation</p>
        </div>

        <div class="customer-info">
            <div class="info-item">
                <span class="info-label">Customer Name</span>
                <span class="info-value">${customerName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">System Size</span>
                <span class="info-value">${systemSize} KW</span>
            </div>
            <div class="info-item">
                <span class="info-label">Month</span>
                <span class="info-value">${month}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Date</span>
                <span class="info-value">${formattedDate}</span>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Monthly Consumption Details</h3>
            <table class="data-table">
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
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2"><strong>Total</strong></td>
                        <td><strong>${calc.consumptionUnits}</strong></td>
                        <td><strong>${calc.fuelCharges.toFixed(2)}</strong></td>
                        <td><strong>${calc.tax.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="2"><strong>Average</strong></td>
                        <td><strong>${calc.consumptionUnits}</strong></td>
                        <td><strong>${calc.fuelCharges.toFixed(2)}</strong></td>
                        <td><strong>${calc.tax.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <h3 class="section-title">Demand Charges</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Sanctioned Load</th>
                        <th>Rate/KW</th>
                        <th>Calculation</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Demand Charges</td>
                        <td>${systemSize} KW</td>
                        <td>Rs.${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}/KW</td>
                        <td>${systemSize}*${(calc.demandCharge / data.sanctionedLoad).toFixed(2)}</td>
                        <td>${calc.additionalCharges.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="subsidy-grid"> <div>
                    <h3 class="section-title">Monthly Fixed Bill</h3>
                    <div class="calc-box">
                        <div class="calc-row">
                            <span>Demand Charge:</span>
                            <span>₹ ${calc.demandCharge.toFixed(2)}</span>
                        </div>
                        <div class="calc-row">
                            <span>Average Fuel Charges:</span>
                            <span>₹ ${calc.avgFuelCharges.toFixed(2)}</span>
                        </div>
                        <div class="calc-row">
                            <span>Average Tax:</span>
                            <span>₹ ${calc.avgTax.toFixed(2)}</span>
                        </div>
                        <div class="calc-row total">
                            <span><strong>Total Fixed Bill:</strong></span>
                            <span><strong>₹ ${calc.monthlyFixedBill.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 class="section-title">Monthly Consumption Bill</h3>
                    <div class="calc-box">
                        <div class="calc-row">
                            <span>1 Month Avg. Consumption:</span>
                            <span>${(calc.oneMonthConsumption / calc.consumptionUnits).toFixed(2)}*${calc.consumptionUnits}</span>
                        </div>
                        <div class="calc-row total">
                            <span><strong>Total Consumption:</strong></span>
                            <span><strong>₹ ${calc.oneMonthConsumption.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <h3 class="subsection-title">Total Electricity Bill = Monthly Fixed Bill + Consumption</h3>
            <div class="result-box">
                <h3>(${calc.monthlyFixedBill.toFixed(2)} + ${calc.oneMonthConsumption.toFixed(2)})</h3>
                <div class="result-value">₹ ${calc.totalElectricityBill.toFixed(2)}</div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Solar Production Details in ${systemSize} KW</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Calculation</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Daily Production (1KW Generates ${data.unitsPerDay})</td>
                        <td>${systemSize} KW * ${data.unitsPerDay} units = <strong>${calc.dailyProduction} units/day</strong></td>
                    </tr>
                    <tr>
                        <td>Monthly Production</td>
                        <td>${calc.dailyProduction} units/day * 30 days = <strong>${calc.monthlyProduction} units/month</strong></td>
                    </tr>
                    <tr>
                        <td>Solar Generation vs Consumption</td>
                        <td>${calc.monthlyProduction} - ${calc.consumptionUnits} = <strong>${calc.solarMinusConsumption} ${calc.solarMinusConsumption > 0 ? 'Exceed units' : 'Deficit units'}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h3 class="section-title">PM SGY Subsidy Comparison</h3>
            
            <div class="subsidy-grid">
                <div class="subsidy-card with-sgy">
                    <h4>PM SGY (With)</h4>
                    <div class="card-content">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Rate/unit</th>
                                    <th>Exceed Unit</th>
                                    <th>Exceed Unit Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${data.sgyWithRate.toFixed(2)}</td>
                                    <td>${calc.sgyWithExceedUnitTotal}</td>
                                    <td>${calc.sgyWithExceedUnitRate.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="calc-box">
                            <div class="calc-row">
                                <span>Exceed Unit Rate - Fixed Bill:</span>
                                <span>₹ ${calc.sgyWithFixedBill.toFixed(2)}</span>
                            </div>
                            <div class="calc-row details">
                                <span>(${calc.sgyWithExceedUnitRate.toFixed(2)} - ${calc.monthlyFixedBill.toFixed(2)})</span>
                                <span></span>
                            </div>
                            <div class="calc-row">
                                <span>Actual Bill:</span>
                                <span>₹ ${calc.sgyWithActualBill.toFixed(2)}</span>
                            </div>
                            <div class="calc-row details">
                                <span>(${calc.oneMonthConsumption.toFixed(2)} + ${calc.monthlyFixedBill.toFixed(2)})</span>
                                <span></span>
                            </div>
                            <div class="calc-row total">
                                <span>MESCOM pay to Customer:</span>
                                <span>₹ ${calc.sgyWithMESCOMPay.toFixed(2)}</span>
                            </div>
                            <div class="calc-row total final-saving">
                                <span>Solar Saved per Month:</span>
                                <span>₹ ${calc.sgyWithSolarSaved.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="subsidy-card without-sgy">
                    <h4>PM SGY (Without)</h4>
                    <div class="card-content">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Rate/unit</th>
                                    <th>Exceed Unit</th>
                                    <th>Exceed Unit Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${data.sgyWithoutRate.toFixed(2)}</td>
                                    <td>${calc.sgyWithoutExceedUnitTotal}</td>
                                    <td>${calc.sgyWithoutExceedUnitRate.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="calc-box">
                            <div class="calc-row">
                                <span>Exceed Unit Rate - Fixed Bill:</span>
                                <span>₹ ${calc.sgyWithoutFixedBill.toFixed(2)}</span>
                            </div>
                            <div class="calc-row details">
                                <span>(${calc.sgyWithoutExceedUnitRate.toFixed(2)} - ${calc.monthlyFixedBill.toFixed(2)})</span>
                                <span></span>
                            </div>
                            <div class="calc-row">
                                <span>Actual Bill:</span>
                                <span>₹ ${calc.sgyWithoutActualBill.toFixed(2)}</span>
                            </div>
                            <div class="calc-row details">
                                <span>(${calc.oneMonthConsumption.toFixed(2)} + ${calc.monthlyFixedBill.toFixed(2)})</span>
                                <span></span>
                            </div>
                            <div class="calc-row total">
                                <span>MESCOM pay to Customer:</span>
                                <span>₹ ${calc.sgyWithoutMESCOMPay.toFixed(2)}</span>
                            </div>
                            <div class="calc-row total final-saving">
                                <span>Solar Saved per Month:</span>
                                <span>₹ ${calc.sgyWithoutSolarSaved.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="note-section">
                <h4>NOTE:</h4>
                <p>PM SGY Subsidy Details</p>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>KW</th>
                            <th>Subsidy Amount</th>
                            <th>Unit Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1-2 KW</td>
                            <td>30000/- to 60000/-</td>
                            <td>2.3</td>
                        </tr>
                        <tr>
                            <td>2-3 KW</td>
                            <td>60000/- to 78000/-</td>
                            <td>2.48</td>
                        </tr>
                        <tr>
                            <td>Above 3 KW</td>
                            <td>78000/-</td>
                            <td>2.93</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <footer class="footer">
            <p><strong>For Shresht Systems</strong></p>
            <div class="footer-contact">
                <div>9901730305 / 7204657707</div>
                <div>shreshtsystems@gmail.com</div>
                <div>www.shreshtsystems.com</div>
            </div>
            <p style="margin-top: 15px; font-style: italic;">Thank you for choosing solar energy with Shresht Systems</p>
        </footer>
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
