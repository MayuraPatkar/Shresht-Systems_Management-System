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
        const response = await fetch('/auth/admin');
        if (!response.ok) {
            throw new Error('Failed to fetch company info');
        }
        
        const data = await response.json();
        companyDataCache = data.admin;
        return companyDataCache;
    } catch (error) {
        console.error('Error fetching company info:', error);
        
        // Return default fallback data
        return {
            company: 'SHRESHT SYSTEMS',
            address: '3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113',
            phone: { ph1: '7204657707', ph2: '9901730305' },
            email: 'shreshtsystems@gmail.com',
            website: 'www.shreshtsystems.com',
            GSTIN: '29AGCPN4093N1ZS',
            bank_details: {
                bank_name: 'HDFC Bank',
                name: 'Shresht Systems',
                accountNo: '1234567890',
                type: 'Current',
                IFSC_code: 'HDFC0001234',
                branch: 'Udupi'
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
 * Format date according to settings (synchronous interface)
 * Returns a formatted date string immediately using the cached settings if available.
 * If no settings are cached, returns a sensible default (DD/MM/YYYY) and refreshes settings asynchronously.
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    // If settings are not loaded yet, trigger a background refresh
    if (!settingsCache) {
        // Fire-and-forget; don't await here to keep this function synchronous
        getSettings().catch(err => console.warn('Could not refresh settings in background:', err));
    }
    const format = settingsCache?.preferences?.date_format || 'DD/MM/YYYY';
    const dateObj = new Date(date);
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    switch (format) {
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
        default:
            return `${day}/${month}/${year}`;
    }
}

/**
 * Generate company header HTML for documents
 * @returns {Promise<string>} HTML string for company header
 */
async function getCompanyHeaderHTML() {
    const company = await getCompanyInfo();
    
    return `
        <div class="header">
            <div class="logo">
                <img src="../assets/logo.png"
                    alt="${company.company} Logo">
            </div>
            <div class="company-details">
                <h1>${company.company}</h1>
                <p>${company.address}</p>
                <p>Ph: ${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''} | GSTIN: ${company.GSTIN}</p>
                <p>Email: ${company.email} | Website: ${company.website}</p>
            </div>
        </div>
    `;
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
    clearCache,
    refreshCompanyInfo,
    refreshSettings
};
