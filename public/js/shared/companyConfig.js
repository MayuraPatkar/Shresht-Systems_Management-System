/**
 * Centralized Company Configuration Service
 * Fetches and caches company data from the server
 * Use this instead of hardcoding company info in multiple files
 */

let companyDataCache = null;
let settingsCache = null;

/**
 * Get company information from server
 * @returns {Promise<Object>} Company data including name, address, phone, GSTIN, etc.
 */
async function getCompanyInfo() {
    if (companyDataCache) {
        return companyDataCache;
    }

    try {
        const response = await fetch('/admin/admin-info');
        if (!response.ok) {
            throw new Error('Failed to fetch company info');
        }

        const data = await response.json();
        companyDataCache = data;
        return companyDataCache;
    } catch (error) {
        console.error('Error fetching company info:', error);

        // Return default fallback data
        return {
            company: 'Company Name',
            address: 'Company Address',
            phone: { ph1: '0000000000', ph2: '' },
            email: 'email@company.com',
            website: 'www.company.com',
            GSTIN: 'GSTIN Number',
            bank_details: {
                bank_name: 'Bank Name',
                name: 'Account Holder Name',
                accountNo: '0000000000',
                type: 'Current',
                IFSC_code: 'IFSC0000000',
                branch: 'Branch Name'
            }
        };
    }
}

/**
 * Get system settings from server
 * @returns {Promise<Object>} Settings including currency, tax, numbering, etc.
 */
async function getSettings() {
    if (settingsCache) {
        return settingsCache;
    }

    try {
        const response = await fetch('/settings/preferences');
        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        settingsCache = data.settings;
        return settingsCache;
    } catch (error) {
        console.error('Error fetching settings:', error);

        // Return default fallback settings
        return {
            preferences: {
                currency: '₹',
                decimal_places: 2,
                date_format: 'DD/MM/YYYY'
            },
            tax: {
                default_gst_rate: 18,
                enable_gst: true
            }
        };
    }
}

/**
 * Format currency according to settings
 * @param {number} amount - Amount to format
 * @returns {Promise<string>} Formatted currency string
 */
async function formatCurrency(amount) {
    const settings = await getSettings();
    const currency = settings.preferences?.currency || '₹';
    const decimals = settings.preferences?.decimal_places || 2;

    const formatted = parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    return settings.preferences?.currency_position === 'after'
        ? `${formatted}${currency}`
        : `${currency}${formatted}`;
}

/**
 * Format date for display - DD/MM/YYYY format
 * Delegates to unified date utility from utils.js
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    // Use unified formatting from utils.js (DD/MM/YYYY format)
    if (typeof window !== 'undefined' && window.formatDateDisplay) {
        return window.formatDateDisplay(date);
    }
    // Fallback if utils.js not loaded yet
    if (!date) return '';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Generate company header HTML for documents
 * @returns {Promise<string>} HTML string for company header
 */
async function getCompanyHeaderHTML() {
    const company = await getCompanyInfo();

    return `
        <div class="header">
            <div class="quotation-brand">
                <div class="logo">
                    <img src="../assets/icon.png" alt="${company.company} Logo">
                </div>
                <div class="quotation-brand-text">
                    <h1>${company.company.toUpperCase()}</h1>
                    <p class="quotation-tagline">CCTV & Energy Solutions</p>
                </div>
            </div>
            <div class="company-details">
                <p>${company.address}</p>
                <p>Ph: ${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}</p>
                <p>GSTIN: ${company.GSTIN}</p>
                <p>Email: ${company.email}</p>
                <p>Website: ${company.website}</p>
            </div>
        </div>
    `;
}

/**
 * Generate bank/payment details HTML for documents
 * @returns {Promise<string>} HTML string for bank details
 */
async function getBankDetailsHTML() {
    const company = await getCompanyInfo();
    const bank = company.bank_details || {};

    return `
        <h3>Payment Details</h3>
        <div class="bank-details">
            <div class="QR-code bank-details-sub1">
                <img src="../assets/shresht-systems-payment-QR-code.jpg" alt="qr-code" />
            </div>
            <div class="bank-details-sub2">
                <p><strong>Account Holder Name: </strong>${bank.name || company.company}</p>
                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                <p><strong>Account No: </strong>${bank.accountNo || ''}</p>
                <p><strong>IFSC Code: </strong>${bank.IFSC_code || ''}</p>
            </div>
        </div>
    `;
}

/**
 * Generate signatory section HTML
 * @returns {Promise<string>} HTML string for signatory section
 */
async function getSignatoryHTML() {
    const company = await getCompanyInfo();

    return `
        <div class="eighth-section">
            <p>For ${company.company.toUpperCase()}</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
    `;
}

/**
 * Get company name
 * @returns {Promise<string>} Company name
 */
async function getCompanyName() {
    const company = await getCompanyInfo();
    return company.company || 'Company';
}

/**
 * Clear cached data (call when company info is updated)
 */
function clearCache() {
    companyDataCache = null;
    settingsCache = null;
}

/**
 * Refresh company data from server
 * @returns {Promise<Object>} Updated company data
 */
async function refreshCompanyInfo() {
    clearCache();
    return await getCompanyInfo();
}

/**
 * Refresh settings from server
 * @returns {Promise<Object>} Updated settings
 */
async function refreshSettings() {
    settingsCache = null;
    return await getSettings();
}

// Export all functions
window.companyConfig = {
    getCompanyInfo,
    getSettings,
    formatCurrency,
    formatDate,
    getCompanyHeaderHTML,
    getBankDetailsHTML,
    getSignatoryHTML,
    getCompanyName,
    clearCache,
    refreshCompanyInfo,
    refreshSettings
};
