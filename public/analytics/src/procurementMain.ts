/**
 * Procurement Analytics Page Main Entry Point
 */

declare var procurementAnalyticsUI: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof procurementAnalyticsUI !== 'undefined') {
        procurementAnalyticsUI.init();
    } else {
        console.error('procurementAnalyticsUI is not defined. Failed to initialize dashboard.');
    }
});
