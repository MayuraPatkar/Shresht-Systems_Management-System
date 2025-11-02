// GST Calculator
function calculateGST() {
    const amount = parseFloat(document.getElementById('gstAmount').value);
    const rateSelect = document.getElementById('gstRate');
    const rateCustom = document.getElementById('gstRateCustom');
    const resultDiv = document.getElementById('gstResult');
    
    // Determine which rate to use
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
    
    if (isNaN(rate) || rate < 0) {
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
                <div class="text-xs text-gray-600">CGST (${(rate/2).toFixed(2)}%):</div><div class="text-right text-xs text-gray-600">₹${cgst.toFixed(2)}</div>
                <div class="text-xs text-gray-600">SGST (${(rate/2).toFixed(2)}%):</div><div class="text-right text-xs text-gray-600">₹${sgst.toFixed(2)}</div>
                <div class="text-lg border-t-2 border-green-300 pt-2">Total Amount:</div><div class="text-right text-lg font-bold border-t-2 border-green-300 pt-2">₹${total.toFixed(2)}</div>
            </div>
        </div>
    `;
    resultDiv.className = "mt-4";
}

// Clear All Fields Function
function clearAllFields() {
    // Confirm before clearing
    if (!confirm('Are you sure you want to clear all fields?')) {
        return;
    }
    
    // Clear all input fields
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        if (!input.readOnly) {
            input.value = '';
        }
    });
    
    // Clear all select dropdowns to first option
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Clear all result divs
    const results = ['gstResult', 'discountResult', 'lengthResult', 'areaResult', 'weightResult', 'volumeResult'];
    results.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.textContent = '';
            elem.className = '';
        }
    });
    
    // Clear readonly fields
    const discountFinal = document.getElementById('discountFinal');
    const totalHeight = document.getElementById('totalHeight');
    if (discountFinal) discountFinal.value = '';
    if (totalHeight) totalHeight.value = '';
    
    // Show success message
    showNotification('All fields cleared successfully!', 'success');
}

// Notification function
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `fixed top-28 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white font-semibold`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// Discount Calculator
function calculateDiscount() {
    const original = parseFloat(document.getElementById('discountOriginal').value);
    const percent = parseFloat(document.getElementById('discountPercent').value);
    const finalInput = document.getElementById('discountFinal');
    const resultDiv = document.getElementById('discountResult');
    
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

// Add Enter key support for calculators
document.addEventListener('DOMContentLoaded', function() {
    const gstAmount = document.getElementById('gstAmount');
    const gstRate = document.getElementById('gstRate');
    const gstRateCustom = document.getElementById('gstRateCustom');
    const discountOriginal = document.getElementById('discountOriginal');
    const discountPercent = document.getElementById('discountPercent');
    
    // GST Calculator listeners
    if (gstAmount && gstRate && gstRateCustom) {
        [gstAmount, gstRateCustom].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    calculateGST();
                }
            });
        });
        
        gstRate.addEventListener('change', function() {
            if (this.value && gstAmount.value) {
                gstRateCustom.value = '';
                calculateGST();
            }
        });
        
        gstRateCustom.addEventListener('input', function() {
            if (this.value) {
                gstRate.value = '';
            }
        });
    }
    
    // Discount Calculator listeners
    if (discountOriginal && discountPercent) {
        [discountOriginal, discountPercent].forEach(input => {
            input.addEventListener('input', calculateDiscount);
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    calculateDiscount();
                }
            });
        });
    }
    
    // Length Converter listeners
    const lengthValue = document.getElementById('lengthValue');
    const lengthFrom = document.getElementById('lengthFrom');
    const lengthTo = document.getElementById('lengthTo');
    
    if (lengthValue) {
        lengthValue.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                convertLength();
            }
        });
        lengthValue.addEventListener('input', function() {
            if (this.value) convertLength();
        });
    }
    
    if (lengthFrom) lengthFrom.addEventListener('change', function() {
        if (lengthValue.value) convertLength();
    });
    
    if (lengthTo) lengthTo.addEventListener('change', function() {
        if (lengthValue.value) convertLength();
    });
    
    // Area Converter listeners
    const areaValue = document.getElementById('areaValue');
    const areaFrom = document.getElementById('areaFrom');
    const areaTo = document.getElementById('areaTo');
    
    if (areaValue) {
        areaValue.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                convertArea();
            }
        });
        areaValue.addEventListener('input', function() {
            if (this.value) convertArea();
        });
    }
    
    if (areaFrom) areaFrom.addEventListener('change', function() {
        if (areaValue.value) convertArea();
    });
    
    if (areaTo) areaTo.addEventListener('change', function() {
        if (areaValue.value) convertArea();
    });
    
    // Weight Converter listeners
    const weightValue = document.getElementById('weightValue');
    const weightFrom = document.getElementById('weightFrom');
    const weightTo = document.getElementById('weightTo');
    
    if (weightValue) {
        weightValue.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                convertWeight();
            }
        });
        weightValue.addEventListener('input', function() {
            if (this.value) convertWeight();
        });
    }
    
    if (weightFrom) weightFrom.addEventListener('change', function() {
        if (weightValue.value) convertWeight();
    });
    
    if (weightTo) weightTo.addEventListener('change', function() {
        if (weightValue.value) convertWeight();
    });
    
    // Volume Converter listeners
    const volumeValue = document.getElementById('volumeValue');
    const volumeFrom = document.getElementById('volumeFrom');
    const volumeTo = document.getElementById('volumeTo');
    
    if (volumeValue) {
        volumeValue.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                convertVolume();
            }
        });
        volumeValue.addEventListener('input', function() {
            if (this.value) convertVolume();
        });
    }
    
    if (volumeFrom) volumeFrom.addEventListener('change', function() {
        if (volumeValue.value) convertVolume();
    });
    
    if (volumeTo) volumeTo.addEventListener('change', function() {
        if (volumeValue.value) convertVolume();
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to clear all
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            clearAllFields();
        }
        
        // Escape to clear current input
        if (e.key === 'Escape') {
            if (document.activeElement.tagName === 'INPUT') {
                document.activeElement.value = '';
                document.activeElement.blur();
            }
        }
    });
    
    // Add copy functionality to result divs
    const resultDivs = ['gstResult', 'discountResult', 'lengthResult', 'areaResult', 'weightResult', 'volumeResult'];
    resultDivs.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.style.cursor = 'pointer';
            elem.title = 'Click to copy result';
            elem.addEventListener('click', function() {
                const text = this.textContent;
                if (text && text.trim()) {
                    navigator.clipboard.writeText(text).then(() => {
                        showNotification('Result copied to clipboard!', 'success');
                    }).catch(() => {
                        showNotification('Failed to copy', 'error');
                    });
                }
            });
        }
    });
});

// Length Converter
function convertLength() {
    const value = parseFloat(document.getElementById('lengthValue').value);
    const from = document.getElementById('lengthFrom').value;
    const to = document.getElementById('lengthTo').value;
    const resultDiv = document.getElementById('lengthResult');
    
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
    
    // Convert to meters first
    const toMeters = {
        m: 1, cm: 0.01, mm: 0.001, km: 1000, 
        ft: 0.3048, in: 0.0254, yd: 0.9144, mi: 1609.34
    };
    
    const unitNames = {
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

// Area Converter
function convertArea() {
    const value = parseFloat(document.getElementById('areaValue').value);
    const from = document.getElementById('areaFrom').value;
    const to = document.getElementById('areaTo').value;
    const resultDiv = document.getElementById('areaResult');
    
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
    
    // Convert to square meters first
    const toSqm = {
        sqm: 1, sqft: 0.092903, sqkm: 1000000, 
        acre: 4046.86, hectare: 10000
    };
    
    const unitNames = {
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

// Weight/Mass Converter
function convertWeight() {
    const value = parseFloat(document.getElementById('weightValue').value);
    const from = document.getElementById('weightFrom').value;
    const to = document.getElementById('weightTo').value;
    const resultDiv = document.getElementById('weightResult');
    
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
    
    // Convert to kilograms first
    const toKg = {
        kg: 1, g: 0.001, mg: 0.000001, ton: 1000,
        lb: 0.453592, oz: 0.0283495
    };
    
    const unitNames = {
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

// Volume Converter
function convertVolume() {
    const value = parseFloat(document.getElementById('volumeValue').value);
    const from = document.getElementById('volumeFrom').value;
    const to = document.getElementById('volumeTo').value;
    const resultDiv = document.getElementById('volumeResult');
    
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
    
    // Convert to liters first
    const toLiters = {
        l: 1, ml: 0.001, m3: 1000,
        gal: 3.78541, qt: 0.946353, pt: 0.473176
    };
    
    const unitNames = {
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

// Geometry Calculator - Constants and element references
const deg2rad = d => d * Math.PI / 180;
const rad2deg = r => r * 180 / Math.PI;

let angleInput, runInput, riseInput, hypInput, rectHeight, totalHeight;

// Initialize geometry calculator when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    angleInput = document.getElementById('angle');
    runInput = document.getElementById('run');
    riseInput = document.getElementById('rise');
    hypInput = document.getElementById('hyp');
    rectHeight = document.getElementById('rectHeight');
    totalHeight = document.getElementById('totalHeight');
    
    // Add input listeners for geometry calculator
    if (angleInput && runInput && riseInput && hypInput && rectHeight) {
        [angleInput, runInput, riseInput, hypInput, rectHeight].forEach(el => {
            el.addEventListener('input', recalc);
            el.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    recalc();
                }
            });
        });
        
        // Initial calculation
        recalc();
    }
});

function recalc() {
    if (!angleInput || !runInput || !riseInput || !hypInput) return;
    
    let angle = parseFloat(angleInput.value);
    let run = parseFloat(runInput.value);
    let rise = parseFloat(riseInput.value);
    let hyp = parseFloat(hypInput.value);

    const known = {
        angle: !isNaN(angle) && angle > 0,
        run: !isNaN(run) && run > 0,
        rise: !isNaN(rise) && rise > 0,
        hyp: !isNaN(hyp) && hyp > 0
    };
    
    const kCount = Object.values(known).filter(Boolean).length;
    if (kCount < 2) { 
        updateTotal(); 
        return; 
    }

    try {
        if (known.angle && known.run) {
            const angleRad = deg2rad(angle);
            rise = run * Math.tan(angleRad);
            hyp = run / Math.cos(angleRad);
        } else if (known.angle && known.rise) {
            const angleRad = deg2rad(angle);
            run = rise / Math.tan(angleRad);
            hyp = rise / Math.sin(angleRad);
        } else if (known.angle && known.hyp) {
            const angleRad = deg2rad(angle);
            run = hyp * Math.cos(angleRad);
            rise = hyp * Math.sin(angleRad);
        } else if (known.run && known.rise) {
            hyp = Math.hypot(run, rise);
            angle = rad2deg(Math.atan(rise / run));
        } else if (known.run && known.hyp) {
            if (hyp > run) {
                rise = Math.sqrt(hyp * hyp - run * run);
                angle = rad2deg(Math.acos(run / hyp));
            }
        } else if (known.rise && known.hyp) {
            if (hyp > rise) {
                run = Math.sqrt(hyp * hyp - rise * rise);
                angle = rad2deg(Math.asin(rise / hyp));
            }
        }
    } catch (err) {
        console.error('Calculation error:', err);
    }

    const rnd = v => (isNaN(v) || v < 0) ? '' : v.toFixed(2);

    if (!known.angle) angleInput.value = rnd(angle);
    if (!known.run) runInput.value = rnd(run);
    if (!known.rise) riseInput.value = rnd(rise);
    if (!known.hyp) hypInput.value = rnd(hyp);

    updateTotal();
}

function updateTotal() {
    if (!rectHeight || !riseInput || !totalHeight) return;
    
    const rect = parseFloat(rectHeight.value);
    const rise = parseFloat(riseInput.value);
    
    if (!isNaN(rect) && rect >= 0 && !isNaN(rise) && rise >= 0) {
        totalHeight.value = (rect + rise).toFixed(2);
    } else if (!isNaN(rect) && rect >= 0 && (isNaN(rise) || rise === 0)) {
        totalHeight.value = rect.toFixed(2);
    } else if (!isNaN(rise) && rise >= 0 && (isNaN(rect) || rect === 0)) {
        totalHeight.value = rise.toFixed(2);
    } else {
        totalHeight.value = '';
    }
}