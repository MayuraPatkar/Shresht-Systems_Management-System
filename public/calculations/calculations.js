// Basic Calculator
function calculateBasic() {
    try {
        const input = document.getElementById('basicCalcInput').value;
        // Only allow numbers and math operators
        if (!/^[\d+\-*/().\s]+$/.test(input)) throw "Invalid input";
        const result = Function('"use strict";return (' + input + ')')();
        document.getElementById('basicCalcResult').textContent = "Result: " + result;
    } catch {
        document.getElementById('basicCalcResult').textContent = "Invalid expression";
    }
}

// GST Calculator
function calculateGST() {
    const amount = parseFloat(document.getElementById('gstAmount').value);
    const rate = parseFloat(document.getElementById('gstRate').value);
    if (isNaN(amount)) {
        document.getElementById('gstResult').textContent = "Enter amount";
        return;
    }
    const gst = (amount * rate) / 100;
    const total = amount + gst;
    document.getElementById('gstResult').textContent = `GST: ₹${gst.toFixed(2)}, Total: ₹${total.toFixed(2)}`;
}

// Length Converter
function convertLength() {
    const value = parseFloat(document.getElementById('lengthValue').value);
    const from = document.getElementById('lengthFrom').value;
    const to = document.getElementById('lengthTo').value;
    if (isNaN(value)) {
        document.getElementById('lengthResult').textContent = "Enter value";
        return;
    }
    // Convert to meters first
    const toMeters = {
        m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254
    };
    const meters = value * toMeters[from];
    const result = meters / toMeters[to];
    document.getElementById('lengthResult').textContent = `${value} ${from} = ${result.toFixed(4)} ${to}`;
}

// Area Converter
function convertArea() {
    const value = parseFloat(document.getElementById('areaValue').value);
    const from = document.getElementById('areaFrom').value;
    const to = document.getElementById('areaTo').value;
    if (isNaN(value)) {
        document.getElementById('areaResult').textContent = "Enter value";
        return;
    }
    // Convert to square meters first
    const toSqm = {
        sqm: 1, sqft: 0.092903, acre: 4046.86, hectare: 10000
    };
    const sqm = value * toSqm[from];
    const result = sqm / toSqm[to];
    document.getElementById('areaResult').textContent = `${value} ${from} = ${result.toFixed(4)} ${to}`;
}

// Currency Converter (fixed demo rates)
function convertCurrency() {
    const value = parseFloat(document.getElementById('currencyAmount').value);
    const from = document.getElementById('currencyFrom').value;
    const to = document.getElementById('currencyTo').value;
    if (isNaN(value)) {
        document.getElementById('currencyResult').textContent = "Enter amount";
        return;
    }
    // Fixed rates for demo
    const rates = {
        INR: 1,
        USD: 83,
        EUR: 90
    };
    const inr = value * rates[from];
    const result = inr / rates[to];
    document.getElementById('currencyResult').textContent = `${value} ${from} = ${result.toFixed(2)} ${to}`;
}

// Number to Words (Indian system)
function numberToWords() {
    const num = parseInt(document.getElementById('numToWords').value, 10);
    if (isNaN(num)) {
        document.getElementById('wordsResult').textContent = "Enter a number";
        return;
    }
    if (num === 0) {
        document.getElementById('wordsResult').textContent = "Zero";
        return;
    }
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'Overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return; let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + '' : '';
        return str.trim();
    }
    document.getElementById('wordsResult').textContent = inWords(num);
}

const deg2rad = d => d * Math.PI / 180;
const rad2deg = r => r * 180 / Math.PI;

const angleInput = document.getElementById('angle');
const runInput = document.getElementById('run');
const riseInput = document.getElementById('rise');
const hypInput = document.getElementById('hyp');
const rectHeight = document.getElementById('rectHeight');
const totalHeight = document.getElementById('totalHeight');

[angleInput, runInput, riseInput, hypInput, rectHeight].forEach(el =>
    el.addEventListener('input', recalc)
);

function recalc() {
    let angle = parseFloat(angleInput.value);
    let run = parseFloat(runInput.value);
    let rise = parseFloat(riseInput.value);
    let hyp = parseFloat(hypInput.value);

    const known = {
        angle: !isNaN(angle),
        run: !isNaN(run),
        rise: !isNaN(rise),
        hyp: !isNaN(hyp)
    };
    const kCount = Object.values(known).filter(Boolean).length;
    if (kCount < 2) { updateTotal(); return; }

    try {
        if (known.angle && known.run) {
            rise = run * Math.tan(deg2rad(angle));
            hyp = run / Math.cos(deg2rad(angle));
        } else if (known.angle && known.rise) {
            run = rise / Math.tan(deg2rad(angle));
            hyp = rise / Math.sin(deg2rad(angle));
        } else if (known.angle && known.hyp) {
            run = hyp * Math.cos(deg2rad(angle));
            rise = hyp * Math.sin(deg2rad(angle));
        } else if (known.run && known.rise) {
            hyp = Math.hypot(run, rise);
            angle = rad2deg(Math.atan(rise / run));
        } else if (known.run && known.hyp) {
            rise = Math.sqrt(hyp * hyp - run * run);
            angle = rad2deg(Math.acos(run / hyp));
        } else if (known.rise && known.hyp) {
            run = Math.sqrt(hyp * hyp - rise * rise);
            angle = rad2deg(Math.asin(rise / hyp));
        }
    } catch (_) { }

    const rnd = v => isNaN(v) ? '' : v.toFixed(2);

    if (!known.angle) angleInput.value = rnd(angle);
    if (!known.run) runInput.value = rnd(run);
    if (!known.rise) riseInput.value = rnd(rise);
    if (!known.hyp) hypInput.value = rnd(hyp);

    updateTotal();
}

function updateTotal() {
    const rect = parseFloat(rectHeight.value);
    const rise = parseFloat(riseInput.value);
    totalHeight.value = (!isNaN(rect) && !isNaN(rise)) ? (rect + rise).toFixed(2) : '';
}

recalc();