/**
 * Calculations Module Forms Logic
 */

declare var calculationsUtils: any;

class CalculationsForms {
    private angleInput: HTMLInputElement | null = null;
    private runInput: HTMLInputElement | null = null;
    private riseInput: HTMLInputElement | null = null;
    private hypInput: HTMLInputElement | null = null;
    private rectHeight: HTMLInputElement | null = null;
    private totalHeight: HTMLInputElement | null = null;

    init() {
        this.setupEventListeners();
        this.initGeometryCalculator();
        this.setupKeyboardShortcuts();
        this.setupCopyFunctionality();
    }

    private calculateGST = () => {
        const amountInput = document.getElementById('gstAmount') as HTMLInputElement;
        const rateSelect = document.getElementById('gstRate') as HTMLSelectElement;
        const rateCustom = document.getElementById('gstRateCustom') as HTMLInputElement;
        const resultDiv = document.getElementById('gstResult');

        if (!amountInput || !rateSelect || !rateCustom || !resultDiv) return;

        const amount = parseFloat(amountInput.value);

        let rate;
        if (rateCustom.value) {
            rate = parseFloat(rateCustom.value);
        } else if (rateSelect.value) {
            rate = parseFloat(rateSelect.value);
        }

        if (isNaN(amount) || amount <= 0) {
            resultDiv.textContent = "⚠️ Please enter a valid amount";
            resultDiv.className = "mt-4 text-lg font-semibold text-red-600";
            return;
        }

        if (rate === undefined || isNaN(rate) || rate < 0) {
            resultDiv.textContent = "⚠️ Please select or enter a valid GST rate";
            resultDiv.className = "mt-4 text-lg font-semibold text-red-600";
            return;
        }

        const gst = (amount * rate) / 100;
        const total = amount + gst;
        const cgst = gst / 2;
        const sgst = gst / 2;

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Base Amount:</div><div class="text-right font-bold">₹${amount.toFixed(2)}</div>
                    <div>GST (${rate}%):</div><div class="text-right font-bold">₹${gst.toFixed(2)}</div>
                    <div class="text-xs text-gray-600">CGST (${(rate / 2).toFixed(2)}%):</div><div class="text-right text-xs text-gray-600">₹${cgst.toFixed(2)}</div>
                    <div class="text-xs text-gray-600">SGST (${(rate / 2).toFixed(2)}%):</div><div class="text-right text-xs text-gray-600">₹${sgst.toFixed(2)}</div>
                    <div class="text-lg border-t-2 border-green-300 pt-2">Total Amount:</div><div class="text-right text-lg font-bold border-t-2 border-green-300 pt-2">₹${total.toFixed(2)}</div>
                </div>
            </div>
        `;
        resultDiv.className = "mt-4";
    }

    private clearAllFields = async () => {
        const confirmed = await (window as any).electronAPI.showAlert2('Are you sure you want to clear all fields?');
        if (!confirmed) {
            return;
        }

        const inputs = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
        inputs.forEach(input => {
            if (!input.readOnly) {
                input.value = '';
            }
        });

        const selects = document.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
        selects.forEach(select => {
            select.selectedIndex = 0;
        });

        const results = ['gstResult', 'discountResult', 'lengthResult', 'areaResult', 'weightResult', 'volumeResult'];
        results.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.textContent = '';
                elem.className = '';
            }
        });

        const discountFinal = document.getElementById('discountFinal') as HTMLInputElement;
        const totalHeight = document.getElementById('totalHeight') as HTMLInputElement;
        if (discountFinal) discountFinal.value = '';
        if (totalHeight) totalHeight.value = '';

        (window as any).electronAPI.showAlert1('All fields cleared successfully!');
    }

    private calculateDiscount = () => {
        const originalInput = document.getElementById('discountOriginal') as HTMLInputElement;
        const percentInput = document.getElementById('discountPercent') as HTMLInputElement;
        const finalInput = document.getElementById('discountFinal') as HTMLInputElement;
        const resultDiv = document.getElementById('discountResult');

        if (!originalInput || !percentInput || !finalInput || !resultDiv) return;

        const original = parseFloat(originalInput.value);
        const percent = parseFloat(percentInput.value);

        if (isNaN(original) || original <= 0) {
            finalInput.value = '';
            resultDiv.textContent = "⚠️ Please enter a valid original price";
            resultDiv.className = "mt-4 text-lg font-semibold text-red-600";
            return;
        }

        if (isNaN(percent) || percent < 0 || percent > 100) {
            finalInput.value = '';
            resultDiv.textContent = "⚠️ Please enter a valid discount percentage (0-100)";
            resultDiv.className = "mt-4 text-lg font-semibold text-red-600";
            return;
        }

        const discountAmount = (original * percent) / 100;
        const finalPrice = original - discountAmount;

        finalInput.value = finalPrice.toFixed(2);

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Original Price:</div><div class="text-right font-bold">₹${original.toFixed(2)}</div>
                    <div>Discount (${percent}%):</div><div class="text-right font-bold text-red-600">-₹${discountAmount.toFixed(2)}</div>
                    <div class="text-lg border-t-2 border-green-300 pt-2">You Save:</div><div class="text-right text-lg font-bold border-t-2 border-green-300 pt-2 text-green-600">₹${discountAmount.toFixed(2)}</div>
                </div>
            </div>
        `;
        resultDiv.className = "mt-4";
    }

    private convertLength = () => {
        const valueInput = document.getElementById('lengthValue') as HTMLInputElement;
        const fromSelect = document.getElementById('lengthFrom') as HTMLSelectElement;
        const toSelect = document.getElementById('lengthTo') as HTMLSelectElement;
        const resultDiv = document.getElementById('lengthResult');

        if (!valueInput || !fromSelect || !toSelect || !resultDiv) return;

        const value = parseFloat(valueInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (isNaN(value) || value < 0) {
            resultDiv.textContent = "⚠️ Please enter a valid value";
            resultDiv.className = "text-lg font-semibold text-red-600";
            return;
        }

        if (from === to) {
            resultDiv.textContent = "ℹ️ Same units selected";
            resultDiv.className = "text-lg font-semibold text-blue-600";
            return;
        }

        const toMeters: Record<string, number> = {
            m: 1, cm: 0.01, mm: 0.001, km: 1000,
            ft: 0.3048, in: 0.0254, yd: 0.9144, mi: 1609.34
        };

        const unitNames: Record<string, string> = {
            m: 'Meter(s)', cm: 'Centimeter(s)', mm: 'Millimeter(s)', km: 'Kilometer(s)',
            ft: 'Feet', in: 'Inch(es)', yd: 'Yard(s)', mi: 'Mile(s)'
        };

        const meters = value * toMeters[from];
        const result = meters / toMeters[to];

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                <div class="text-center">
                    <span class="font-bold">${value}</span> ${unitNames[from]} = 
                    <span class="font-bold text-green-700">${result.toFixed(6)}</span> ${unitNames[to]}
                </div>
            </div>
        `;
        resultDiv.className = "";
    }

    private convertArea = () => {
        const valueInput = document.getElementById('areaValue') as HTMLInputElement;
        const fromSelect = document.getElementById('areaFrom') as HTMLSelectElement;
        const toSelect = document.getElementById('areaTo') as HTMLSelectElement;
        const resultDiv = document.getElementById('areaResult');

        if (!valueInput || !fromSelect || !toSelect || !resultDiv) return;

        const value = parseFloat(valueInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (isNaN(value) || value < 0) {
            resultDiv.textContent = "⚠️ Please enter a valid value";
            resultDiv.className = "text-lg font-semibold text-red-600";
            return;
        }

        if (from === to) {
            resultDiv.textContent = "ℹ️ Same units selected";
            resultDiv.className = "text-lg font-semibold text-blue-600";
            return;
        }

        const toSqm: Record<string, number> = {
            sqm: 1, sqft: 0.092903, sqkm: 1000000,
            acre: 4046.86, hectare: 10000
        };

        const unitNames: Record<string, string> = {
            sqm: 'Sq. Meter(s)', sqft: 'Sq. Feet', sqkm: 'Sq. Kilometer(s)',
            acre: 'Acre(s)', hectare: 'Hectare(s)'
        };

        const sqm = value * toSqm[from];
        const result = sqm / toSqm[to];

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                <div class="text-center">
                    <span class="font-bold">${value}</span> ${unitNames[from]} = 
                    <span class="font-bold text-green-700">${result.toFixed(6)}</span> ${unitNames[to]}
                </div>
            </div>
        `;
        resultDiv.className = "";
    }

    private convertWeight = () => {
        const valueInput = document.getElementById('weightValue') as HTMLInputElement;
        const fromSelect = document.getElementById('weightFrom') as HTMLSelectElement;
        const toSelect = document.getElementById('weightTo') as HTMLSelectElement;
        const resultDiv = document.getElementById('weightResult');

        if (!valueInput || !fromSelect || !toSelect || !resultDiv) return;

        const value = parseFloat(valueInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (isNaN(value) || value < 0) {
            resultDiv.textContent = "⚠️ Please enter a valid value";
            resultDiv.className = "text-lg font-semibold text-red-600";
            return;
        }

        if (from === to) {
            resultDiv.textContent = "ℹ️ Same units selected";
            resultDiv.className = "text-lg font-semibold text-blue-600";
            return;
        }

        const toKg: Record<string, number> = {
            kg: 1, g: 0.001, mg: 0.000001, ton: 1000,
            lb: 0.453592, oz: 0.0283495
        };

        const unitNames: Record<string, string> = {
            kg: 'Kilogram(s)', g: 'Gram(s)', mg: 'Milligram(s)',
            ton: 'Metric Ton(s)', lb: 'Pound(s)', oz: 'Ounce(s)'
        };

        const kg = value * toKg[from];
        const result = kg / toKg[to];

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                <div class="text-center">
                    <span class="font-bold">${value}</span> ${unitNames[from]} = 
                    <span class="font-bold text-green-700">${result.toFixed(6)}</span> ${unitNames[to]}
                </div>
            </div>
        `;
        resultDiv.className = "";
    }

    private convertVolume = () => {
        const valueInput = document.getElementById('volumeValue') as HTMLInputElement;
        const fromSelect = document.getElementById('volumeFrom') as HTMLSelectElement;
        const toSelect = document.getElementById('volumeTo') as HTMLSelectElement;
        const resultDiv = document.getElementById('volumeResult');

        if (!valueInput || !fromSelect || !toSelect || !resultDiv) return;

        const value = parseFloat(valueInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (isNaN(value) || value < 0) {
            resultDiv.textContent = "⚠️ Please enter a valid value";
            resultDiv.className = "text-lg font-semibold text-red-600";
            return;
        }

        if (from === to) {
            resultDiv.textContent = "ℹ️ Same units selected";
            resultDiv.className = "text-lg font-semibold text-blue-600";
            return;
        }

        const toLiters: Record<string, number> = {
            l: 1, ml: 0.001, m3: 1000,
            gal: 3.78541, qt: 0.946353, pt: 0.473176
        };

        const unitNames: Record<string, string> = {
            l: 'Liter(s)', ml: 'Milliliter(s)', m3: 'Cubic Meter(s)',
            gal: 'Gallon(s)', qt: 'Quart(s)', pt: 'Pint(s)'
        };

        const liters = value * toLiters[from];
        const result = liters / toLiters[to];

        resultDiv.innerHTML = `
            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                <div class="text-center">
                    <span class="font-bold">${value}</span> ${unitNames[from]} = 
                    <span class="font-bold text-green-700">${result.toFixed(6)}</span> ${unitNames[to]}
                </div>
            </div>
        `;
        resultDiv.className = "";
    }

    private recalc = () => {
        if (!this.angleInput || !this.runInput || !this.riseInput || !this.hypInput) return;

        let angle = parseFloat(this.angleInput.value);
        let run = parseFloat(this.runInput.value);
        let rise = parseFloat(this.riseInput.value);
        let hyp = parseFloat(this.hypInput.value);

        const known = {
            angle: !isNaN(angle) && angle > 0,
            run: !isNaN(run) && run > 0,
            rise: !isNaN(rise) && rise > 0,
            hyp: !isNaN(hyp) && hyp > 0
        };

        const kCount = Object.values(known).filter(Boolean).length;
        if (kCount < 2) {
            this.updateTotal();
            return;
        }

        try {
            if (known.angle && known.run) {
                const angleRad = calculationsUtils.deg2rad(angle);
                rise = run * Math.tan(angleRad);
                hyp = run / Math.cos(angleRad);
            } else if (known.angle && known.rise) {
                const angleRad = calculationsUtils.deg2rad(angle);
                run = rise / Math.tan(angleRad);
                hyp = rise / Math.sin(angleRad);
            } else if (known.angle && known.hyp) {
                const angleRad = calculationsUtils.deg2rad(angle);
                run = hyp * Math.cos(angleRad);
                rise = hyp * Math.sin(angleRad);
            } else if (known.run && known.rise) {
                hyp = Math.hypot(run, rise);
                angle = calculationsUtils.rad2deg(Math.atan(rise / run));
            } else if (known.run && known.hyp) {
                if (hyp > run) {
                    rise = Math.sqrt(hyp * hyp - run * run);
                    angle = calculationsUtils.rad2deg(Math.acos(run / hyp));
                }
            } else if (known.rise && known.hyp) {
                if (hyp > rise) {
                    run = Math.sqrt(hyp * hyp - rise * rise);
                    angle = calculationsUtils.rad2deg(Math.asin(rise / hyp));
                }
            }
        } catch (err) {
            console.error('Calculation error:', err);
        }

        const rnd = (v: number) => (isNaN(v) || v < 0) ? '' : v.toFixed(2);

        if (!known.angle) this.angleInput.value = rnd(angle);
        if (!known.run) this.runInput.value = rnd(run);
        if (!known.rise) this.riseInput.value = rnd(rise);
        if (!known.hyp) this.hypInput.value = rnd(hyp);

        this.updateTotal();
    }

    private updateTotal = () => {
        if (!this.rectHeight || !this.riseInput || !this.totalHeight) return;

        const rect = parseFloat(this.rectHeight.value);
        const rise = parseFloat(this.riseInput.value);

        if (!isNaN(rect) && rect >= 0 && !isNaN(rise) && rise >= 0) {
            this.totalHeight.value = (rect + rise).toFixed(2);
        } else if (!isNaN(rect) && rect >= 0 && (isNaN(rise) || rise === 0)) {
            this.totalHeight.value = rect.toFixed(2);
        } else if (!isNaN(rise) && rise >= 0 && (isNaN(rect) || rect === 0)) {
            this.totalHeight.value = rise.toFixed(2);
        } else {
            this.totalHeight.value = '';
        }
    }

    private initGeometryCalculator() {
        this.angleInput = document.getElementById('angle') as HTMLInputElement;
        this.runInput = document.getElementById('run') as HTMLInputElement;
        this.riseInput = document.getElementById('rise') as HTMLInputElement;
        this.hypInput = document.getElementById('hyp') as HTMLInputElement;
        this.rectHeight = document.getElementById('rectHeight') as HTMLInputElement;
        this.totalHeight = document.getElementById('totalHeight') as HTMLInputElement;

        if (this.angleInput && this.runInput && this.riseInput && this.hypInput && this.rectHeight) {
            [this.angleInput, this.runInput, this.riseInput, this.hypInput, this.rectHeight].forEach(el => {
                if (el) {
                    el.addEventListener('input', this.recalc);
                    el.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.recalc();
                        }
                    });
                }
            });

            this.recalc();
        }
    }

    private setupEventListeners() {
        const gstAmount = document.getElementById('gstAmount') as HTMLInputElement;
        const gstRate = document.getElementById('gstRate') as HTMLSelectElement;
        const gstRateCustom = document.getElementById('gstRateCustom') as HTMLInputElement;
        const discountOriginal = document.getElementById('discountOriginal') as HTMLInputElement;
        const discountPercent = document.getElementById('discountPercent') as HTMLInputElement;

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) clearAllBtn.addEventListener('click', this.clearAllFields);

        const calculateGSTBtn = document.getElementById('calculateGSTBtn');
        if (calculateGSTBtn) calculateGSTBtn.addEventListener('click', this.calculateGST);

        const convertLengthBtn = document.getElementById('convertLengthBtn');
        if (convertLengthBtn) convertLengthBtn.addEventListener('click', this.convertLength);

        const convertAreaBtn = document.getElementById('convertAreaBtn');
        if (convertAreaBtn) convertAreaBtn.addEventListener('click', this.convertArea);

        const convertWeightBtn = document.getElementById('convertWeightBtn');
        if (convertWeightBtn) convertWeightBtn.addEventListener('click', this.convertWeight);

        const convertVolumeBtn = document.getElementById('convertVolumeBtn');
        if (convertVolumeBtn) convertVolumeBtn.addEventListener('click', this.convertVolume);

        if (gstAmount && gstRate && gstRateCustom) {
            [gstAmount, gstRateCustom].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.calculateGST();
                });
            });

            gstRate.addEventListener('change', () => {
                if (gstRate.value && gstAmount.value) {
                    gstRateCustom.value = '';
                    this.calculateGST();
                }
            });

            gstRateCustom.addEventListener('input', function() {
                if (this.value) {
                    gstRate.value = '';
                }
            });
        }

        if (discountOriginal && discountPercent) {
            [discountOriginal, discountPercent].forEach(input => {
                input.addEventListener('input', this.calculateDiscount);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.calculateDiscount();
                });
            });
        }

        const setupConverterEvents = (type: string, convertFn: () => void) => {
            const value = document.getElementById(`${type}Value`) as HTMLInputElement;
            const from = document.getElementById(`${type}From`) as HTMLSelectElement;
            const to = document.getElementById(`${type}To`) as HTMLSelectElement;

            if (value) {
                value.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') convertFn();
                });
                value.addEventListener('input', function() {
                    if (this.value) convertFn();
                });
            }

            if (from) from.addEventListener('change', () => {
                if (value && value.value) convertFn();
            });

            if (to) to.addEventListener('change', () => {
                if (value && value.value) convertFn();
            });
        };

        setupConverterEvents('length', this.convertLength);
        setupConverterEvents('area', this.convertArea);
        setupConverterEvents('weight', this.convertWeight);
        setupConverterEvents('volume', this.convertVolume);
    }

    private setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.clearAllFields();
            }

            if (e.key === 'Escape') {
                if (document.activeElement?.tagName === 'INPUT') {
                    (document.activeElement as HTMLInputElement).value = '';
                    (document.activeElement as HTMLElement).blur();
                } else {
                    window.location.href = '../dashboard/dashboard.html';
                }
            }
        });
    }

    private setupCopyFunctionality() {
        const resultDivs = ['gstResult', 'discountResult', 'lengthResult', 'areaResult', 'weightResult', 'volumeResult'];
        resultDivs.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.style.cursor = 'pointer';
                elem.title = 'Click to copy result';
                elem.addEventListener('click', function () {
                    const text = this.textContent;
                    if (text && text.trim()) {
                        navigator.clipboard.writeText(text).then(() => {
                            (window as any).electronAPI.showAlert1('Result copied to clipboard!');
                        }).catch(() => {
                            (window as any).electronAPI.showAlert1('Failed to copy to clipboard');
                        });
                    }
                });
            }
        });
    }
}

declare var calculationsForms: any;
(window as any).calculationsForms = new CalculationsForms();
