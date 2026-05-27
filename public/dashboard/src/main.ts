/**
 * Dashboard Module Main Entry Point
 */

declare var dashboardUI: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof dashboardUI !== 'undefined') {
        dashboardUI.init();
    }
});
