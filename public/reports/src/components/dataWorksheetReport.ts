/**
 * Data Worksheet Report Module Component
 */

declare var reportsApi: any;
declare var reportsUtils: any;
declare var formatDateIndian: any;

class DataWorksheetReportComponent {
    init(): void {
        // Dynamic CSS injection for preview styles
        if (!document.querySelector('link[href="../css/dataWorksheetPreview.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../css/dataWorksheetPreview.css';
            document.head.appendChild(link);
        }

        const dateInput = document.getElementById('dw_date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
        }

        document.getElementById('generate-worksheet')?.addEventListener('click', (e) => this.generateDataWorksheet(e));
        document.getElementById('clear-worksheet-form')?.addEventListener('click', () => this.clearWorksheetForm());

        document.getElementById('print-worksheet-report')?.addEventListener('click', () => this.printWorksheetInline());
        document.getElementById('save-worksheet-pdf')?.addEventListener('click', () => this.saveWorksheetPDFInline());
    }

    clearWorksheetForm(): void {
        const form = document.getElementById('dataWorksheetForm') as HTMLFormElement;
        if (form) form.reset();

        const dateInput = document.getElementById('dw_date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput ? (window as any).getTodayForInput() : new Date().toISOString().split('T')[0];
        }

        const unitsInput = document.getElementById('dw_unitsPerDay') as HTMLInputElement;
        if (unitsInput) {
            unitsInput.value = '4';
        }
    }

    async generateDataWorksheet(e: Event | null, saveToHistory: boolean = true): Promise<void> {
        if (e && e.preventDefault) e.preventDefault();

        const systemSize = parseFloat((document.getElementById('dw_systemSize') as HTMLInputElement).value);
        const month = (document.getElementById('dw_month') as HTMLSelectElement).value || 'July';
        const consumptionUnits = parseFloat((document.getElementById('dw_consumptionUnits') as HTMLInputElement).value);
        const fuelCharges = parseFloat((document.getElementById('dw_fuelCharges') as HTMLInputElement).value) || 0;
        const tax = parseFloat((document.getElementById('dw_tax') as HTMLInputElement).value) || 0;
        const sanctionedLoad = parseFloat((document.getElementById('dw_sanctionedLoad') as HTMLInputElement).value);
        const demandRate = parseFloat((document.getElementById('dw_demandRate') as HTMLInputElement).value);
        const additionalCharges = parseFloat((document.getElementById('dw_additionalCharges') as HTMLInputElement).value) || 0;
        const unitsPerDay = parseFloat((document.getElementById('dw_unitsPerDay') as HTMLInputElement).value) || 4;
        const avgConsumptionRate = parseFloat((document.getElementById('dw_avgConsumptionRate') as HTMLInputElement).value);
        const sgyWithRate = parseFloat((document.getElementById('dw_sgyWithRate') as HTMLInputElement).value) || 3.86;
        const sgyWithoutRate = parseFloat((document.getElementById('dw_sgyWithoutRate') as HTMLInputElement).value) || 3.86;
        const exceedUnitRate = parseFloat((document.getElementById('dw_exceedUnitRate') as HTMLInputElement).value) || 695;
        const customerName = (document.getElementById('dw_customerName') as HTMLInputElement).value || 'Customer';
        const date = (document.getElementById('dw_date') as HTMLInputElement).value;

        if (isNaN(systemSize) || isNaN(consumptionUnits) || isNaN(sanctionedLoad) || isNaN(demandRate) || isNaN(avgConsumptionRate)) {
            reportsUtils.showNotification('Please fill all required fields marked with *', 'error');
            return;
        }

        const inputData: WorksheetInputData = {
            systemSize, month, consumptionUnits, fuelCharges, tax,
            sanctionedLoad, demandRate, additionalCharges,
            unitsPerDay, avgConsumptionRate,
            sgyWithRate, sgyWithoutRate, exceedUnitRate
        };

        const calculations = this.calculateWorksheetData(inputData);

        let cssContent = '';
        try {
            cssContent = await reportsApi.getWorksheetCss();
        } catch (error) {
            console.error('Failed to load CSS for PDF generation:', error);
        }

        if (saveToHistory) {
            try {
                const payload = {
                    ...inputData,
                    ...calculations,
                    customerName
                };

                const saveResponse = await reportsApi.saveDataWorksheet(payload);

                if (saveResponse.ok) {
                    if (typeof (window as any).loadRecentReports === 'function') {
                        (window as any).loadRecentReports();
                    }
                } else {
                    console.error('Failed to save worksheet history');
                }
            } catch (error) {
                console.error('Error saving worksheet history:', error);
            }
        }

        const documentHTML = this.generateWorksheetHTML(calculations, inputData, customerName, date, systemSize, month, cssContent);

        this.showInlineWorksheetPreview(documentHTML);
    }

    loadWorksheet(report: SavedReport): void {
        if (!report || !report.data) return;

        const data = report.data;

        const fields = [
            'systemSize', 'consumptionUnits', 'fuelCharges', 'tax',
            'sanctionedLoad', 'demandRate', 'additionalCharges',
            'unitsPerDay', 'avgConsumptionRate', 'sgyWithRate',
            'sgyWithoutRate', 'exceedUnitRate'
        ];

        fields.forEach(field => {
            const input = document.getElementById(`dw_${field}`) as HTMLInputElement;
            if (input && data[field] !== undefined) {
                input.value = data[field];
            }
        });

        const monthSelect = document.getElementById('dw_month') as HTMLSelectElement;
        if (monthSelect) monthSelect.value = data.month || 'July';

        const nameInput = document.getElementById('dw_customerName') as HTMLInputElement;
        if (nameInput) nameInput.value = report.parameters.customer_name || 'Customer';

        this.generateDataWorksheet(null, false);
    }

    showInlineWorksheetPreview(documentHTML: string): void {
        const previewSection = document.getElementById('worksheet-preview-section');
        const previewContent = document.getElementById('worksheet-preview-content');

        if (!previewSection || !previewContent) return;

        (window as any).currentWorksheetHTML = documentHTML;

        previewSection.style.display = 'block';
        previewContent.innerHTML = documentHTML;

        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    printWorksheetInline(): void {
        const html = (window as any).currentWorksheetHTML;
        if (html) {
            reportsUtils.printReport(html, 'data-worksheet');
        }
    }

    saveWorksheetPDFInline(): void {
        const html = (window as any).currentWorksheetHTML;
        if (html) {
            const customerNameInput = document.getElementById('dw_customerName') as HTMLInputElement;
            const systemSizeInput = document.getElementById('dw_systemSize') as HTMLInputElement;
            const customerName = customerNameInput?.value || 'customer';
            const systemSize = systemSizeInput?.value || 'solar';
            const filename = `data-worksheet-${customerName.replace(/\s+/g, '-')}-${systemSize}kw-${new Date().getTime()}`;
            reportsUtils.saveReportPDF(html, filename);
        }
    }

    calculateWorksheetData(data: WorksheetInputData): WorksheetCalculations {
        const {
            systemSize, consumptionUnits, fuelCharges, tax,
            sanctionedLoad, demandRate, additionalCharges,
            unitsPerDay, avgConsumptionRate,
            sgyWithRate, sgyWithoutRate, exceedUnitRate
        } = data;

        const demandCharge = sanctionedLoad * demandRate;
        const monthlyFixedBill = demandCharge + additionalCharges;
        const avgFuelCharges = fuelCharges;
        const avgTax = tax;
        const totalFixedBill = demandCharge + avgFuelCharges + avgTax + additionalCharges;

        const dailyProduction = systemSize * unitsPerDay;
        const monthlyProduction = Math.round(dailyProduction * 30);
        const solarMinusConsumption = monthlyProduction - consumptionUnits;
        const exceedUnits = solarMinusConsumption > 0 ? solarMinusConsumption : 0;

        const oneMonthConsumption = consumptionUnits * avgConsumptionRate;

        const totalElectricityBill = monthlyFixedBill + oneMonthConsumption;

        const sgyWithExceedUnitTotal = exceedUnits;
        const sgyWithExceedUnitRate = sgyWithExceedUnitTotal * sgyWithRate;
        const sgyWithFixedBill = monthlyFixedBill - sgyWithExceedUnitRate;
        const sgyWithActualBill = oneMonthConsumption + monthlyFixedBill;
        const sgyWithMESCOMPay = sgyWithActualBill - sgyWithExceedUnitRate;
        const sgyWithSolarSaved = sgyWithExceedUnitRate;

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

    generateWorksheetHTML(calc: WorksheetCalculations, data: WorksheetInputData, customerName: string, date: string, systemSize: number, month: string, cssContent: string = ''): string {
        const formattedDate = date ? (typeof formatDateIndian === 'function' ? formatDateIndian(date) : new Date(date).toLocaleDateString('en-IN')) : new Date().toLocaleDateString('en-IN');

        return `
        <!-- Scoped Wrapper for Preview -->
        <div class="dw-print-scope">
            ${cssContent ? `<style>${cssContent}</style>` : '<link rel="stylesheet" href="../css/dataWorksheetPreview.css">'}
    
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
                        <div style="font-size:10px; margin-top:5px;">(Based on Avg Rate ${data.avgConsumptionRate})</div>
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
}

declare var dataWorksheetReportComponent: DataWorksheetReportComponent;
(window as any).dataWorksheetReportComponent = new DataWorksheetReportComponent();
