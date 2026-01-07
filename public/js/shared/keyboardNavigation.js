/**
 * Keyboard Navigation Utility
 * Handles Ctrl+Tab navigation between application modules
 */

// Ctrl+Tab navigation to switch between sidebar tabs
// Guard against duplicate registration (in case globalScript.js is also loaded)
if (!window._ctrlTabNavRegistered) {
  window._ctrlTabNavRegistered = true;

  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && (event.key === "Tab" || event.keyCode === 9)) {
      event.preventDefault(); // Prevent default browser tab switching
      event.stopPropagation();

      // Define the navigation order matching the server routes exactly
      const navigationOrder = [
        '/dashboard',
        '/quotation',
        '/ewaybill',
        '/invoice',
        '/service',
        '/purchaseorder',
        '/stock',
        '/comms',
        '/reports',
        '/calculations',
        '/settings'
      ];

      // Get current path and normalize it
      const currentPath = window.location.pathname.replace(/\/$/, '').toLowerCase() || '/';

      // Find current index - match exactly (case-insensitive)
      let currentIndex = navigationOrder.findIndex(route => currentPath === route.toLowerCase());

      // If not found, try to find partial match
      if (currentIndex === -1) {
        currentIndex = navigationOrder.findIndex(route =>
          currentPath.includes(route.toLowerCase())
        );
      }

      // If still not found, default to first item
      if (currentIndex === -1) {
        currentIndex = 0;
      }

      // Move to next/previous tab with wrapping
      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + navigationOrder.length) % navigationOrder.length
        : (currentIndex + 1) % navigationOrder.length;

      // Navigate to the next route
      window.location.href = navigationOrder[nextIndex];
    }
  });
}
