/**
 * Sales Analytics Page Main Entry Point
 */

declare var salesAnalyticsUI: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof salesAnalyticsUI !== 'undefined') {
        salesAnalyticsUI.init();
    } else {
        console.error('salesAnalyticsUI is not defined. Failed to initialize dashboard.');
    }
});
