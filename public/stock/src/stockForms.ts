/**
 * Stock form handling: new item, edit item, item details, and quantity modal.
 */

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function openEditModal(item: StockItem): void {
    showModal('editStockModal');
    (document.getElementById('editItemName') as HTMLInputElement).value = item.item_name || '';
    (document.getElementById('editHsnCode') as HTMLInputElement).value = item.hsn_sac || '';
    (document.getElementById('editBrand') as HTMLInputElement).value = item.brand || '';
    (document.getElementById('editCategory') as HTMLInputElement).value = item.category || '';
    (document.getElementById('editType') as HTMLSelectElement).value = item.item_type || 'Material';
    (document.getElementById('editPurchasePrice') as HTMLInputElement).value = String(item.purchase_price || '');
    (document.getElementById('editGstRate') as HTMLInputElement).value = String(item.gst_rate || '');
    (document.getElementById('editMinStockQuantity') as HTMLInputElement).value = String(item.min_stock_quantity || '5');
    (document.getElementById('editSpecifications') as HTMLTextAreaElement).value = item.specifications || '';
    (document.getElementById('editUnit') as HTMLSelectElement).value = item.unit || 'pc';
    (document.getElementById('editSellingPrice') as HTMLInputElement).value = String(item.selling_price || '');
    (document.getElementById('editMargin') as HTMLInputElement).value = String(item.margin || '');
    (document.getElementById('editStockQuantity') as HTMLInputElement).value = String(item.stock_quantity || '');
    (document.getElementById('editRemarks') as HTMLTextAreaElement).value = item.remarks || '';

    // store id on modal element for submit
    document.getElementById('editStockModal')!.setAttribute('data-item-id', item._id);
}

// ─── Details Modal ───────────────────────────────────────────────────────────

function openDetailsModal(item: StockItem): void {
    showModal('itemDetailsModal');
    document.getElementById('detailsItemName')!.textContent = item.item_name || '';
    document.getElementById('detailsMinStockQuantity')!.textContent = String(item.min_stock_quantity || '0');
    document.getElementById('detailsPurchasePrice')!.textContent = item.purchase_price ? `₹ ${formatIndian(item.purchase_price)}` : '';
    document.getElementById('detailsQuantity')!.textContent = String(item.stock_quantity || '0');
    document.getElementById('detailsGstRate')!.textContent = item.gst_rate ? `${item.gst_rate}%` : '0%';
    document.getElementById('detailsMargin')!.textContent = item.margin ? `${item.margin}%` : '0%';
    document.getElementById('detailsHsn')!.textContent = item.hsn_sac || '';
    document.getElementById('detailsBrand')!.textContent = item.brand || '';
    document.getElementById('detailsCategory')!.textContent = item.category || '';
    document.getElementById('detailsType')!.textContent = item.item_type || '';
    document.getElementById('detailsSpecifications')!.textContent = item.specifications || '';
    document.getElementById('detailsUnit')!.textContent = item.unit || 'pc';
    document.getElementById('detailsSellingPrice')!.textContent = item.selling_price ? `₹ ${formatIndian(item.selling_price)}` : '';
    document.getElementById('detailsRemarks')!.textContent = item.remarks || '';
}

// ─── Quantity Modal ──────────────────────────────────────────────────────────

let quantityModalData: QuantityModalData = { action: '', itemId: '', itemName: '' };

function showQuantityModal(action: string, itemId: string, itemName: string): void {
    quantityModalData = { action, itemId, itemName };

    const title = document.getElementById('quantityModalTitle')!;
    const text = document.getElementById('quantityModalText')!;
    const confirmText = document.getElementById('confirmQuantityText')!;
    const input = document.getElementById('quantityModalInput') as HTMLInputElement;

    title.textContent = action === 'add' ? 'Add Quantity' : 'Remove Quantity';
    text.textContent = `How much quantity do you want to ${action} ${action === 'add' ? 'to' : 'from'} "${itemName}"?`;
    confirmText.textContent = action === 'add' ? 'Add' : 'Remove';
    input.value = '1';

    showModal('quantityModal');
    input.focus();
}

// ─── New Stock Form Submit ───────────────────────────────────────────────────

const newStockForm = document.getElementById('newStockForm') as HTMLFormElement | null;
if (newStockForm) {
    newStockForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const item_name = (document.getElementById('itemName') as HTMLInputElement).value.trim();
        const hsn_sac = (document.getElementById('hsnCode') as HTMLInputElement).value.trim();
        const brand = (document.getElementById('brand') as HTMLInputElement).value.trim();
        const category = (document.getElementById('category') as HTMLInputElement).value.trim();
        const item_type = (document.getElementById('type') as HTMLSelectElement).value.trim();
        const purchase_price = parseFloat((document.getElementById('purchasePrice') as HTMLInputElement).value);
        const stock_quantity = parseFloat((document.getElementById('stockQuantity') as HTMLInputElement).value) || 0;
        const margin = parseFloat((document.getElementById('margin') as HTMLInputElement).value) || 0;
        const gst_rate = parseFloat((document.getElementById('gstRate') as HTMLInputElement).value);
        const min_stock_quantity = parseInt((document.getElementById('minStockQuantity') as HTMLInputElement).value, 10);
        const specifications = (document.getElementById('specifications') as HTMLTextAreaElement).value.trim();
        const unit = (document.getElementById('unit') as HTMLSelectElement).value.trim();
        const selling_price = parseFloat((document.getElementById('sellingPrice') as HTMLInputElement).value) || 0;
        const remarks = (document.getElementById('remarks') as HTMLTextAreaElement).value.trim();

        if (!item_name || !hsn_sac || !brand || !category || !item_type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(purchase_price) || purchase_price <= 0) {
            showErrorMessage('Please enter a valid purchase price.');
            return;
        }

        if (isNaN(gst_rate) || gst_rate < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(min_stock_quantity) || min_stock_quantity < 0) {
            showErrorMessage('Please enter a valid minimum stock quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/addItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name, hsn_sac, brand, category, item_type, purchase_price, stock_quantity, margin, gst_rate, min_stock_quantity, specifications, unit, selling_price, remarks })
            });

            if (!res.ok) {
                // Try to parse error message from server
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add item');
            }

            await fetchStockData();
            hideModal('newStockModal');
            newStockForm.reset();
            showSuccessMessage('Stock item added successfully!');
        } catch (err: any) {
            console.error(err);
            // Display the specific error message from the server (e.g. "Item already exists")
            showErrorMessage(err.message || 'Failed to add item.');
        }
    });
}

// ─── Edit Stock Form Submit ──────────────────────────────────────────────────

const editForm = document.getElementById('editStockForm') as HTMLFormElement | null;
if (editForm) {
    editForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const modal = document.getElementById('editStockModal')!;
        const itemId = modal.getAttribute('data-item-id');
        const item_name = (document.getElementById('editItemName') as HTMLInputElement).value.trim();
        const hsn_sac = (document.getElementById('editHsnCode') as HTMLInputElement).value.trim();
        const brand = (document.getElementById('editBrand') as HTMLInputElement).value.trim();
        const category = (document.getElementById('editCategory') as HTMLInputElement).value.trim();
        const item_type = (document.getElementById('editType') as HTMLSelectElement).value.trim();
        const purchase_price = parseFloat((document.getElementById('editPurchasePrice') as HTMLInputElement).value);
        const stock_quantity = parseFloat((document.getElementById('editStockQuantity') as HTMLInputElement).value) || 0;
        const margin = parseFloat((document.getElementById('editMargin') as HTMLInputElement).value) || 0;
        const gst_rate = parseFloat((document.getElementById('editGstRate') as HTMLInputElement).value);
        const min_stock_quantity = parseInt((document.getElementById('editMinStockQuantity') as HTMLInputElement).value, 10);
        const specifications = (document.getElementById('editSpecifications') as HTMLTextAreaElement).value.trim();
        const unit = (document.getElementById('editUnit') as HTMLSelectElement).value.trim();
        const selling_price = parseFloat((document.getElementById('editSellingPrice') as HTMLInputElement).value) || 0;
        const remarks = (document.getElementById('editRemarks') as HTMLTextAreaElement).value.trim();

        if (!itemId) return;

        if (!item_name || !hsn_sac || !brand || !category || !item_type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(purchase_price) || purchase_price <= 0) {
            showErrorMessage('Please enter a valid purchase price.');
            return;
        }

        if (isNaN(gst_rate) || gst_rate < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(min_stock_quantity) || min_stock_quantity < 0) {
            showErrorMessage('Please enter a valid minimum stock quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/editItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, item_name, hsn_sac, brand, category, item_type, purchase_price, stock_quantity, margin, gst_rate, min_stock_quantity, specifications, unit, selling_price, remarks })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to edit item');
            await fetchStockData();
            hideModal('editStockModal');
            showSuccessMessage('Stock item updated successfully!');
        } catch (err: any) {
            console.error(err);
            showErrorMessage(err.message || 'Failed to update item.');
        }
    });
}

// ─── Quantity Modal Event Listeners ──────────────────────────────────────────

document.getElementById('closeQuantityModalBtn')?.addEventListener('click', () => hideModal('quantityModal'));
document.getElementById('cancelQuantityBtn')?.addEventListener('click', () => hideModal('quantityModal'));

document.getElementById('decreaseQuantityBtn')?.addEventListener('click', () => {
    const input = document.getElementById('quantityModalInput') as HTMLInputElement;
    const currentValue = parseInt(input.value) || 1;
    if (currentValue > 1) {
        input.value = String(currentValue - 1);
    }
});

document.getElementById('increaseQuantityBtn')?.addEventListener('click', () => {
    const input = document.getElementById('quantityModalInput') as HTMLInputElement;
    const currentValue = parseInt(input.value) || 1;
    input.value = String(currentValue + 1);
});

document.getElementById('confirmQuantityBtn')?.addEventListener('click', async () => {
    const quantity = parseInt((document.getElementById('quantityModalInput') as HTMLInputElement).value);
    if (isNaN(quantity) || quantity <= 0) {
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Please enter a valid quantity.');
        } else {
            alert('Please enter a valid quantity.');
        }
        return;
    }

    try {
        const { action, itemId } = quantityModalData;
        const url = action === 'add' ? '/stock/addToStock' : '/stock/removeFromStock';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });
        if (!res.ok) throw new Error('Failed to update quantity');
        await fetchStockData();
        hideModal('quantityModal');
        showSuccessMessage(`Quantity ${action === 'add' ? 'added' : 'removed'} successfully!`);
    } catch (err) {
        console.error(err);
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Failed to update quantity.');
        } else {
            alert('Failed to update quantity.');
        }
    }
});

// Allow Enter key to confirm quantity
document.getElementById('quantityModalInput')?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        document.getElementById('confirmQuantityBtn')!.click();
    }
});

// ─── Unit → Min Stock Quantity default ──────────────────────────────────────

function updateMinStockDefault(unitSelectId: string, minStockInputId: string): void {
    const unitSelect = document.getElementById(unitSelectId) as HTMLSelectElement | null;
    const minStockInput = document.getElementById(minStockInputId) as HTMLInputElement | null;
    if (!unitSelect || !minStockInput) return;

    unitSelect.addEventListener('change', () => {
        const currentVal = parseInt(minStockInput.value, 10);
        // Only auto-set if the field is empty or still at a known default (5 or 100)
        if (isNaN(currentVal) || currentVal === 5 || currentVal === 100 || minStockInput.value === '') {
            minStockInput.value = unitSelect.value === 'm' ? '100' : '5';
        }
    });
}

// Add modal
updateMinStockDefault('unit', 'minStockQuantity');
// Edit modal
updateMinStockDefault('editUnit', 'editMinStockQuantity');

// ─── Margin ↔ Selling Price linking ────────────────────────────────────────

function linkMarginAndSellingPrice(
    purchasePriceId: string,
    sellingPriceId: string,
    marginId: string
): void {
    const purchaseInput = document.getElementById(purchasePriceId) as HTMLInputElement | null;
    const sellingInput = document.getElementById(sellingPriceId) as HTMLInputElement | null;
    const marginInput = document.getElementById(marginId) as HTMLInputElement | null;
    if (!purchaseInput || !sellingInput || !marginInput) return;

    // Track which field was last manually edited so purchase price changes
    // know which one to recalculate
    let lastEdited: 'selling' | 'margin' = 'selling';

    // Helper: round to 2 decimal places
    const round2 = (n: number) => Math.round(n * 100) / 100;

    sellingInput.addEventListener('input', () => {
        lastEdited = 'selling';
        const purchase = parseFloat(purchaseInput.value);
        const selling = parseFloat(sellingInput.value);
        if (isNaN(purchase) || purchase <= 0 || isNaN(selling)) {
            marginInput.value = '';
            return;
        }
        marginInput.value = String(round2(((selling - purchase) / purchase) * 100));
    });

    marginInput.addEventListener('input', () => {
        lastEdited = 'margin';
        const purchase = parseFloat(purchaseInput.value);
        const margin = parseFloat(marginInput.value);
        if (isNaN(purchase) || purchase <= 0 || isNaN(margin)) {
            sellingInput.value = '';
            return;
        }
        sellingInput.value = String(round2(purchase * (1 + margin / 100)));
    });

    purchaseInput.addEventListener('input', () => {
        const purchase = parseFloat(purchaseInput.value);
        if (isNaN(purchase) || purchase <= 0) return;

        if (lastEdited === 'margin') {
            // Recalculate selling price from margin
            const margin = parseFloat(marginInput.value);
            if (!isNaN(margin)) {
                sellingInput.value = String(round2(purchase * (1 + margin / 100)));
            }
        } else {
            // Recalculate margin from selling price
            const selling = parseFloat(sellingInput.value);
            if (!isNaN(selling)) {
                marginInput.value = String(round2(((selling - purchase) / purchase) * 100));
            }
        }
    });
}

// Add modal
linkMarginAndSellingPrice('purchasePrice', 'sellingPrice', 'margin');
// Edit modal
linkMarginAndSellingPrice('editPurchasePrice', 'editSellingPrice', 'editMargin');
