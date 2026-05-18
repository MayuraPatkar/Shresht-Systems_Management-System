/**
 * Main entry point for the Stock module.
 * Initializes tooltips, wires up modal buttons, and boots the page.
 */
/// <reference path="types/types.ts" />

// ─── Modal Button Wiring ─────────────────────────────────────────────────────

document.getElementById('newStockItemBtn')?.addEventListener('click', () => showModal('newStockModal'));
document.getElementById('closeModalBtn')?.addEventListener('click', () => { hideModal('newStockModal'); (document.getElementById('newStockForm') as HTMLFormElement | null)?.reset(); });
document.getElementById('cancelBtn')?.addEventListener('click', () => { hideModal('newStockModal'); (document.getElementById('newStockForm') as HTMLFormElement | null)?.reset(); });
document.getElementById('closeEditModalBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('cancelEditBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('closeDetailsModalBtn')?.addEventListener('click', () => hideModal('itemDetailsModal'));
document.getElementById('closeDetailsBtn')?.addEventListener('click', () => hideModal('itemDetailsModal'));

// ─── Show Deleted Toggle ─────────────────────────────────────────────────────

const showDeletedBtn = document.getElementById('showDeletedBtn');
if (showDeletedBtn) {
    showDeletedBtn.addEventListener('click', () => {
        window.showDeletedItems = !window.showDeletedItems;
        
        const printBtn = document.getElementById('printBtn');
        const bulkRestoreBtn = document.getElementById('bulkRestoreBtn');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        // Update button visual state
        if (window.showDeletedItems) {
            showDeletedBtn.classList.remove('bg-gray-200', 'text-gray-700');
            showDeletedBtn.classList.add('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500');
            showDeletedBtn.innerHTML = '<i class="fas fa-trash-restore"></i> Close Trash';
            showDeletedBtn.title = 'Close Trash';
            if (printBtn) printBtn.classList.add('hidden');
            if (bulkRestoreBtn) bulkRestoreBtn.classList.replace('hidden', 'flex');
            if (bulkDeleteBtn) bulkDeleteBtn.classList.replace('hidden', 'flex');
        } else {
            showDeletedBtn.classList.add('bg-gray-200', 'text-gray-700');
            showDeletedBtn.classList.remove('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500');
            showDeletedBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            showDeletedBtn.title = 'View Trash';
            if (printBtn) printBtn.classList.remove('hidden');
            if (bulkRestoreBtn) bulkRestoreBtn.classList.replace('flex', 'hidden');
            if (bulkDeleteBtn) bulkDeleteBtn.classList.replace('flex', 'hidden');
        }

        fetchStockData();
    });
}

// ─── Bulk Operations ─────────────────────────────────────────────────────────

document.getElementById('bulkRestoreBtn')?.addEventListener('click', async () => {
    const filteredData = (window as any).filteredStockData || [];
    if (filteredData.length === 0) {
        window.electronAPI?.showAlert1('No items to restore.');
        return;
    }

    const isFiltered = (document.getElementById('bulkRestoreBtn')?.querySelector('span')?.textContent || '').includes('Filtered');
    const message = `Are you sure you want to restore all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}items?`;

    window.electronAPI!.showAlert2(message);
    window.electronAPI!.receiveAlertResponse(async (response: string) => {
        if (response === "Yes") {
            try {
                const res = await fetch('/stock/bulkRestore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds: filteredData.map((i: any) => i._id) })
                });
                if (!res.ok) throw new Error('Bulk restore failed');
                await fetchStockData();
                window.electronAPI!.showAlert1('Selected items restored successfully!');
            } catch (err) {
                console.error(err);
                window.electronAPI?.showAlert1('Failed to restore items.');
            }
        }
    });
});

document.getElementById('bulkDeleteBtn')?.addEventListener('click', async () => {
    const filteredData = (window as any).filteredStockData || [];
    if (filteredData.length === 0) {
        window.electronAPI?.showAlert1('No items to delete.');
        return;
    }

    const isFiltered = (document.getElementById('bulkDeleteBtn')?.querySelector('span')?.textContent || '').includes('Filtered');
    const message = `Are you sure you want to PERMANENTLY delete all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}items? This cannot be undone.`;

    window.electronAPI!.showAlert2(message);
    window.electronAPI!.receiveAlertResponse(async (response: string) => {
        if (response === "Yes") {
            try {
                const res = await fetch('/stock/bulkHardDelete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds: filteredData.map((i: any) => i._id) })
                });
                if (!res.ok) throw new Error('Bulk delete failed');
                await fetchStockData();
                window.electronAPI!.showAlert1('Selected items permanently deleted!');
            } catch (err) {
                console.error(err);
                window.electronAPI?.showAlert1('Failed to delete items.');
            }
        }
    });
});

// ─── Initialize Validation ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    preventDecimals(document.getElementById('quantityModalInput') as HTMLInputElement | null);
    preventDecimals(document.getElementById('minStockQuantity') as HTMLInputElement | null);
    preventDecimals(document.getElementById('editMinStockQuantity') as HTMLInputElement | null);
});

// ─── Home Button ─────────────────────────────────────────────────────────────

const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        window.location.href = '../dashboard/dashboard.html';
    });
}

// ─── Tooltips ────────────────────────────────────────────────────────────────

function addTooltips(): void {
    const newStockBtn = document.getElementById('newStockItemBtn');
    if (newStockBtn) newStockBtn.title = 'Add new stock item (Ctrl+N)';

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.title = 'Refresh data (Ctrl+R)';

    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.title = 'Print stock report (Ctrl+P)';

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.title = 'Go to Dashboard';

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.title = 'Search stock items (Ctrl+F)';

    const keyboardBtn = document.getElementById('keyboardShortcutsBtn');
    if (keyboardBtn) keyboardBtn.title = 'Keyboard shortcuts (?)';
}

// ─── Initialize the Page ─────────────────────────────────────────────────────

addTooltips();
setupSorting();
fetchStockData();

// ─── Auto-open add quantity modal if ?item=<name> is in URL ──────────────────

document.addEventListener('DOMContentLoaded', () => {
    const searchParams = new URLSearchParams(window.location.search);
    const itemName = searchParams.get('item');

    if (itemName) {
        // Wait for table to render and data to load, then open add modal for the item
        setTimeout(() => {
            // Find the item in currentStockData
            const stockItem = currentStockData.find(item =>
                (item.item_name || '').trim() === itemName.trim()
            );

            if (stockItem) {
                const itemId = stockItem._id;
                const itemNameFromData = stockItem.item_name;

                // Scroll to the item first
                const rows = document.querySelectorAll('#stock-table tbody tr');
                rows.forEach(row => {
                    const nameCell = row.querySelector('td:first-child .font-medium');
                    if (nameCell && nameCell.textContent?.trim() === itemName.trim()) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // Brief highlight
                        row.classList.add('bg-yellow-200');
                        setTimeout(() => {
                            row.classList.remove('bg-yellow-200');
                            const qty = parseInt(row.querySelector('td:nth-child(3)')?.textContent?.replace(/[^0-9]/g, '') || '0') || 0;
                            const minQty = Number(stockItem.min_stock_quantity) || 0;

                            if (qty < 0) {
                                row.classList.add('bg-red-200');
                            } else if (qty === 0) {
                                row.classList.add('bg-red-100');
                            } else if (qty < minQty) {
                                row.classList.add('bg-yellow-100');
                            }
                        }, 800);
                    }
                });

                // Open the "Add Quantity" modal after a brief delay
                setTimeout(() => {
                    showQuantityModal('add', itemId, itemNameFromData);
                }, 600);

            } else {
                // Item not found in stock data
                showErrorMessage(`Item "${itemName}" not found in stock list.`);
            }
        }, 800);
    }
});

// ─── Integer Validation for Quantity Inputs ──────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const ids = ['quantity', 'minStockQuantity', 'editMinStockQuantity', 'quantityModalInput'];
    ids.forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) {
            el.addEventListener('keypress', function (event: KeyboardEvent): void {
                if (event.charCode < 48 || event.charCode > 57) event.preventDefault();
            });
        }
    });
});
