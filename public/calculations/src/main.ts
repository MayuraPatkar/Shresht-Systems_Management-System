/**
 * Calculations Module Main Entry Point
 */

declare var calculationsForms: any;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof calculationsForms !== 'undefined') {
        calculationsForms.init();
    }
});
