/**
 * Keyboard Navigation Utility
 * Handles Ctrl+Tab navigation between application modules
 */

// Ctrl+Tab navigation to switch between sidebar tabs
document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "Tab") {
    event.preventDefault(); // Prevent default browser tab switching
    
    // Define the navigation order matching the server routes exactly
    const navigationOrder = [
      '/dashboard',
      '/quotation',
      '/invoice',
      '/wayBill',
      '/service',
      '/purchaseorder',
      '/stock',
      '/comms',
      '/calculations',
      '/settings'
    ];
    
    // Get current path
    const currentPath = window.location.pathname;
    
    // Find current index - match exactly
    let currentIndex = navigationOrder.findIndex(route => currentPath === route);
    
    // If not found, try to find partial match
    if (currentIndex === -1) {
      currentIndex = navigationOrder.findIndex(route => 
        currentPath.toLowerCase().includes(route.toLowerCase())
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
    
    // Navigate using window.location.replace to avoid popup blocking
    window.location.replace(navigationOrder[nextIndex]);
  }
});
