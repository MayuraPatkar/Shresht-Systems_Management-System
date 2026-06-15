// @ts-nocheck
(function () {
/**
 * Shared Utility Functions
 * Used across all modules for common operations
 */

/**
 * Convert number to Indian currency format (with commas)
 * @param {number} num - Number to format
 * @param {number} fractionDigits - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
function formatIndian(num, fractionDigits = 0) {
  if (num == null || isNaN(num)) num = 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Convert number to Indian words (Crore, Lakh, Thousand system)
 * @param {number} num - Number to convert
 * @returns {string} Number in words
 */
function numberToWords(num) {
  num = Math.round(num);
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const numToWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
    return '';
  };

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = [];

  if (crore) result.push(numToWords(crore) + ' Crore');
  if (lakh) result.push(numToWords(lakh) + ' Lakh');
  if (thousand) result.push(numToWords(thousand) + ' Thousand');
  if (remainder) result.push(numToWords(remainder));

  return result.join(' ').trim();
}

/**
 * Checks if a unit (e.g. m, kg, L) should be counted as 1 in totals quantity column
 * @param {string} description - Item description
 * @param {string} unit - Item unit
 * @returns {boolean}
 */
function isUnitCountedAsOne(description, unit) {
  if (unit) {
    const u = String(unit).toLowerCase().trim();
    if (
      u === 'm' || u === 'mtr' || u === 'meter' || u === 'meters' || u === 'metre' || u === 'metres' ||
      u === 'l' || u === 'ltr' || u === 'liter' || u === 'liters' || u === 'litre' || u === 'litres' ||
      u === 'kg' || u === 'kgs' || u === 'kilo' || u === 'kilogram' || u === 'kilograms' || u === 'kilo gram' || u === 'kilo grams'
    ) {
      return true;
    }
  }

  if (description) {
    const desc = String(description).toLowerCase().trim();
    const meterRegex = /\b\d+(\.\d+)?\s*(m|mtr|meter|meters|metre|metres)\b/i;
    const literRegex = /\b\d+(\.\d+)?\s*(l|ltr|liter|liters|litre|litres)\b/i;
    const kgRegex = /\b\d+(\.\d+)?\s*(kg|kgs|kilo|kilogram|kilograms|kilo\s*gram|kilo\s*grams)\b/i;
    
    if (meterRegex.test(desc) || literRegex.test(desc) || kgRegex.test(desc)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// UNIFIED DATE FORMATTING UTILITIES
// All user-visible dates should use DD/MM/YYYY format
// ============================================================================

/**
 * Format date for display - DD/MM/YYYY format
 * This is the PRIMARY format for all user-visible dates
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string or empty string if invalid
 */
function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

/**
 * Format date for HTML input fields - YYYY-MM-DD format
 * Required by <input type="date"> elements (browser standard)
 * @param {string|Date} dateString - Date to format
 * @returns {string} ISO date format for inputs or empty string if invalid
 */
function formatDateInput(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date formatted for HTML input fields
 * Uses LOCAL timezone (fixes UTC timezone bug with toISOString)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayForInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// These ensure existing code continues to work
// ============================================================================

/**
 * @deprecated Use formatDateInput() instead
 * Format date to YYYY-MM-DD format (for HTML inputs)
 */
function formatDate(dateString) {
  return formatDateInput(dateString);
}

/**
 * @deprecated Use formatDateDisplay() instead  
 * Format date to DD/MM/YYYY format (Indian style)
 */
function formatDateIndian(dateString) {
  return formatDateDisplay(dateString);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
  // Number utilities
  window.formatIndian = formatIndian;
  window.numberToWords = numberToWords;

  // New unified date utilities (preferred)
  window.formatDateDisplay = formatDateDisplay;
  window.formatDateInput = formatDateInput;
  window.getTodayForInput = getTodayForInput;

  // Legacy date functions (deprecated, kept for backward compatibility)
  window.formatDate = formatDate;
  window.formatDateIndian = formatDateIndian;

  // Other utilities
  window.copyToClipboard = copyToClipboard;
  window.debounce = debounce;
  window.isUnitCountedAsOne = isUnitCountedAsOne;

  // Client-side table pagination manager
  class TablePaginationManager {
    constructor(tableOrContainer, renderCallback, defaultPageSize = 25) {
      const target = typeof tableOrContainer === 'string' ? document.getElementById(tableOrContainer) : tableOrContainer;
      if (!target) {
        throw new Error(`Target container/table not found for pagination.`);
      }
      this.container = target.closest('.rounded-xl') || target.closest('.bg-white') || target.parentElement || target;
      this.renderCallback = renderCallback;
      this.pageSize = defaultPageSize;
      this.currentPage = 1;
      this.data = [];
      this.paginationId = `pagination-controls-${Math.random().toString(36).substring(2, 9)}`;
      this.controlsContainer = null;
    }

    setData(newData) {
      this.data = newData || [];
      const maxPage = Math.max(1, Math.ceil(this.data.length / this.pageSize));
      if (this.currentPage > maxPage) {
        this.currentPage = 1;
      }
      this.render();
    }

    setPage(page) {
      const maxPage = Math.max(1, Math.ceil(this.data.length / this.pageSize));
      if (page >= 1 && page <= maxPage) {
        this.currentPage = page;
        this.render();
      }
    }

    setPageSize(size) {
      this.pageSize = size;
      this.currentPage = 1;
      this.render();
    }

    getCurrentPageData() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.data.slice(start, end);
    }

    render() {
      const pageData = this.getCurrentPageData();
      this.renderCallback(pageData);
      this.renderUI();
    }

    renderUI() {
      const totalEntries = this.data.length;
      const maxPage = Math.max(1, Math.ceil(totalEntries / this.pageSize));
      
      if (totalEntries === 0) {
        if (this.controlsContainer) {
          this.controlsContainer.classList.add('hidden');
        }
        return;
      }

      if (!this.controlsContainer) {
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.id = this.paginationId;
        this.controlsContainer.className = 'px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white text-xs gap-4 select-none shrink-0';
        this.container.appendChild(this.controlsContainer);
      } else {
        this.controlsContainer.classList.remove('hidden');
      }

      const startEntry = (this.currentPage - 1) * this.pageSize + 1;
      const endEntry = Math.min(totalEntries, this.currentPage * this.pageSize);

      let pagesHtml = '';
      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(maxPage, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === this.currentPage 
          ? 'bg-blue-600 text-white border-blue-600 font-bold' 
          : 'text-slate-650 hover:bg-slate-50 border-slate-200';
        pagesHtml += `<button class="page-num-btn w-8 h-8 border rounded-lg flex items-center justify-center transition-colors cursor-pointer font-semibold ${activeClass}" data-page="${i}">${i}</button>`;
      }

      this.controlsContainer.innerHTML = `
        <div class="flex items-center gap-4 text-slate-500 font-medium">
            <span>Showing <strong class="text-slate-700">${startEntry}-${endEntry}</strong> of <strong class="text-slate-700">${totalEntries}</strong> entries</span>
            <div class="flex items-center gap-1.5">
                <span>Show</span>
                <select class="pagination-limit-select border border-slate-200 rounded px-1.5 py-1 bg-slate-50 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                    <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
                </select>
                <span>entries</span>
            </div>
        </div>
        <div class="flex items-center gap-1.5">
            <button class="prev-page-btn px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent font-semibold transition-colors cursor-pointer" ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left mr-1 text-[10px]"></i> Previous
            </button>
            <div class="flex items-center gap-1">
                ${pagesHtml}
            </div>
            <button class="next-page-btn px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent font-semibold transition-colors cursor-pointer" ${this.currentPage === maxPage ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right ml-1 text-[10px]"></i>
            </button>
        </div>
      `;

      this.controlsContainer.querySelector('.prev-page-btn')?.addEventListener('click', () => {
        this.setPage(this.currentPage - 1);
      });

      this.controlsContainer.querySelector('.next-page-btn')?.addEventListener('click', () => {
        this.setPage(this.currentPage + 1);
      });

      this.controlsContainer.querySelectorAll('.page-num-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const page = parseInt(e.currentTarget.getAttribute('data-page') || '1');
          this.setPage(page);
        });
      });

      this.controlsContainer.querySelector('.pagination-limit-select')?.addEventListener('change', (e) => {
        const limit = parseInt(e.target.value);
        this.setPageSize(limit);
      });
    }
  }

  window.TablePaginationManager = TablePaginationManager;
}
})();

