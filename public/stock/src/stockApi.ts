/**
 * Stock API operations: data fetching and global stock data state.
 */

// NOTE: formatIndian has been moved to public/js/shared/utils.js
// It is now available globally via window.formatIndian

// Global stock data state
let currentStockData: StockItem[] = [];

// Fetch and render
async function fetchStockData(): Promise<void> {
    try {
        showLoading(true);
        const response = await fetch('/stock/all');
        if (!response.ok) throw new Error('Failed to fetch stock data');
        const stockData: StockItem[] = await response.json();
        currentStockData = stockData || [];
        renderStockTable(currentStockData);
        populateCategoryFilters(currentStockData);
        showLoading(false);
    } catch (err) {
        console.error('Error fetching stock data:', err);
        showLoading(false);
        showEmpty(true);
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Error fetching stock data. Please try again.');
        } else {
            alert('Error fetching stock data. Please try again.');
        }
    }
}
