/*
  quotation_utils.js
  Shared helper functions for the Quotation Module.
*/

// ------- Number & Text Helpers -------

function toNumber(val) {
  if (val === null || typeof val === 'undefined') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).trim();
  if (s === '') return 0;
  // remove everything except digits, dot, minus
  const clean = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function safeText(s) {
  if (s === null || typeof s === 'undefined') return '-';
  return String(s);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- ADDED THIS FUNCTION ---
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    // Set the text, or default to a dash if text is null/empty
    el.textContent = text || '-';
  }
}
// --- END OF ADDED FUNCTION ---


// ------- Formatting Helpers -------

function formatIndian(number = 0, decimals = 2) {
  const n = Number(number || 0);
  if (isNaN(n)) return (0).toFixed(decimals);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
}

async function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

function numberToWords(amount) {
  const words = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function inWords(num) {
    if (num < 20) return words[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + words[num%10] : '');
    if (num < 1000) return words[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + inWords(num%100) : '');
    if (num < 100000) return inWords(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + inWords(num%1000) : '');
    if (num < 10000000) return inWords(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + inWords(num%100000) : '');
    return inWords(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + inWords(num%10000000) : '');
  }
  const n = Math.floor(Number(amount) || 0);
  return n === 0 ? 'Zero' : inWords(n);
}

// ------- UI Helpers -------

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';

  toast.className = `flex items-center gap-3 p-4 rounded-lg shadow-lg text-white ${bgColor} fade-in`;
  toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}