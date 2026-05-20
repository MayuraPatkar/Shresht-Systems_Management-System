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
}
