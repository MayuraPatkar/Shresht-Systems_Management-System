/**
 * Finance Analytics Main Entry Point
 */

declare var financeAnalyticsUI: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof financeAnalyticsUI !== 'undefined') {
        financeAnalyticsUI.init();
    } else {
        console.error('financeAnalyticsUI is not defined. Failed to initialize dashboard.');
    }
});
