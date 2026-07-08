/**
 * Inventory Analytics Main Entry Point
 */

declare var inventoryAnalyticsUI: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof inventoryAnalyticsUI !== 'undefined') {
        inventoryAnalyticsUI.init();
    } else {
        console.error('inventoryAnalyticsUI is not defined. Failed to initialize dashboard.');
    }
});
