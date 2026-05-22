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
    (document.getElementById('editPurchasePrice') as HTMLInputElement).value = String(item.purchase_price ?? '');
    (document.getElementById('editGstRate') as HTMLInputElement).value = String(item.gst_rate ?? '');
    (document.getElementById('editMinStockQuantity') as HTMLInputElement).value = String(item.min_stock_quantity ?? '5');
    (document.getElementById('editSpecifications') as HTMLTextAreaElement).value = item.specifications || '';
    (document.getElementById('editUnit') as HTMLSelectElement).value = item.unit || 'pc';
    (document.getElementById('editSellingPrice') as HTMLInputElement).value = String(item.selling_price ?? '');
    (document.getElementById('editMargin') as HTMLInputElement).value = String(item.margin ?? '');
    (document.getElementById('editStockQuantity') as HTMLInputElement).value = String(item.stock_quantity ?? '');
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
    const iconContainer = document.getElementById('quantityModalIconContainer')!;
    const icon = document.getElementById('quantityModalIcon')!;
    const confirmBtn = document.getElementById('confirmQuantityBtn')!;

    title.textContent = action === 'add' ? 'Add Quantity' : 'Remove Quantity';
    text.textContent = `How much quantity do you want to ${action} ${action === 'add' ? 'to' : 'from'} "${itemName}"?`;
    confirmText.textContent = action === 'add' ? 'Add' : 'Remove';
    input.value = '1';

    // Apply premium active styling and themes dynamically
    if (action === 'add') {
        iconContainer.className = 'w-10 h-10 rounded-xl flex items-center justify-center text-green-600 bg-green-50';
        icon.className = 'fas fa-plus text-base';
        confirmBtn.className = 'px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-green-600 hover:bg-green-700 focus:ring-green-500 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2';
    } else {
        iconContainer.className = 'w-10 h-10 rounded-xl flex items-center justify-center text-red-600 bg-red-50';
        icon.className = 'fas fa-minus text-base';
        confirmBtn.className = 'px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 focus:ring-red-500 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2';
    }

    showModal('quantityModal');
    input.focus();
}

// ─── Inline Validation Helpers ──────────────────────────────────────────────

function showFieldError(input: HTMLElement, message: string): void {
    clearFieldError(input);

    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

    input.setAttribute('aria-invalid', 'true');

    const errorMsg = document.createElement('div');
    errorMsg.className = 'text-[11px] font-semibold text-red-600 mt-1 transition-all duration-200 ease-in-out error-message-inline';
    errorMsg.textContent = message;

    const parent = input.parentElement;
    if (parent) {
        parent.appendChild(errorMsg);
    }

    const clearListener = () => {
        clearFieldError(input);
        input.removeEventListener('input', clearListener);
        input.removeEventListener('change', clearListener);
    };
    input.addEventListener('input', clearListener);
    input.addEventListener('change', clearListener);
}

function clearFieldError(input: HTMLElement): void {
    input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
    input.style.borderColor = '';
    input.style.boxShadow = '';
    input.removeAttribute('aria-invalid');

    const parent = input.parentElement;
    if (parent) {
        const inlineErrors = parent.querySelectorAll('.error-message-inline');
        inlineErrors.forEach(err => err.remove());
    }
}

function clearAllErrors(): void {
    const errorInputs = document.querySelectorAll('.form-input-premium[aria-invalid="true"]');
    errorInputs.forEach(el => {
        clearFieldError(el as HTMLElement);
    });

    const looseErrors = document.querySelectorAll('.error-message-inline');
    looseErrors.forEach(el => el.remove());
}

(window as any).clearAllErrors = clearAllErrors;

// ─── New Stock Form Submit ───────────────────────────────────────────────────

const newStockForm = document.getElementById('newStockForm') as HTMLFormElement | null;
if (newStockForm) {
    newStockForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        clearAllErrors();
        let isValid = true;
        let firstInvalidElement: HTMLElement | null = null;

        const itemNameEl = document.getElementById('itemName') as HTMLInputElement;
        const hsnCodeEl = document.getElementById('hsnCode') as HTMLInputElement;
        const brandEl = document.getElementById('brand') as HTMLInputElement;
        const categoryEl = document.getElementById('category') as HTMLInputElement;
        const unitEl = document.getElementById('unit') as HTMLSelectElement;
        const purchasePriceEl = document.getElementById('purchasePrice') as HTMLInputElement;
        const gstRateEl = document.getElementById('gstRate') as HTMLInputElement;
        const minStockQuantityEl = document.getElementById('minStockQuantity') as HTMLInputElement;

        const item_name = itemNameEl.value.trim();
        const hsn_sac = hsnCodeEl.value.trim();
        const brand = brandEl.value.trim();
        const category = categoryEl.value.trim();
        const item_type = (document.getElementById('type') as HTMLSelectElement).value.trim();
        const purchase_price = parseFloat(purchasePriceEl.value);
        const stock_quantity = parseFloat((document.getElementById('stockQuantity') as HTMLInputElement).value) || 0;
        const margin = parseFloat((document.getElementById('margin') as HTMLInputElement).value) || 0;
        const gst_rate = parseFloat(gstRateEl.value);
        const min_stock_quantity = parseInt(minStockQuantityEl.value, 10);
        const specifications = (document.getElementById('specifications') as HTMLTextAreaElement).value.trim();
        const unit = unitEl.value.trim();
        const selling_price = parseFloat((document.getElementById('sellingPrice') as HTMLInputElement).value) || 0;
        const remarks = (document.getElementById('remarks') as HTMLTextAreaElement).value.trim();

        if (!item_name) {
            showFieldError(itemNameEl, 'Item Name is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = itemNameEl;
        }
        if (!hsn_sac) {
            showFieldError(hsnCodeEl, 'HSN/SAC Code is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = hsnCodeEl;
        }
        if (!brand) {
            showFieldError(brandEl, 'Brand is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = brandEl;
        }
        if (!category) {
            showFieldError(categoryEl, 'Category is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = categoryEl;
        }
        if (!unit) {
            showFieldError(unitEl, 'Unit is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = unitEl;
        }
        if (purchasePriceEl.value.trim() === '') {
            showFieldError(purchasePriceEl, 'Purchase Price is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = purchasePriceEl;
        } else if (isNaN(purchase_price) || purchase_price <= 0) {
            showFieldError(purchasePriceEl, 'Please enter a valid purchase price');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = purchasePriceEl;
        }
        if (gstRateEl.value.trim() === '') {
            showFieldError(gstRateEl, 'GST Rate is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = gstRateEl;
        } else if (isNaN(gst_rate) || gst_rate < 0) {
            showFieldError(gstRateEl, 'Please enter a valid GST rate');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = gstRateEl;
        }
        if (minStockQuantityEl.value.trim() === '') {
            showFieldError(minStockQuantityEl, 'Min Stock Qty is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = minStockQuantityEl;
        } else if (isNaN(min_stock_quantity) || min_stock_quantity < 0) {
            showFieldError(minStockQuantityEl, 'Please enter a valid minimum stock quantity');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = minStockQuantityEl;
        }

        if (!isValid) {
            if (firstInvalidElement) firstInvalidElement.focus();
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
        
        const editItemNameEl = document.getElementById('editItemName') as HTMLInputElement;
        const editHsnCodeEl = document.getElementById('editHsnCode') as HTMLInputElement;
        const editBrandEl = document.getElementById('editBrand') as HTMLInputElement;
        const editCategoryEl = document.getElementById('editCategory') as HTMLInputElement;
        const editUnitEl = document.getElementById('editUnit') as HTMLSelectElement;
        const editPurchasePriceEl = document.getElementById('editPurchasePrice') as HTMLInputElement;
        const editGstRateEl = document.getElementById('editGstRate') as HTMLInputElement;
        const editMinStockQuantityEl = document.getElementById('editMinStockQuantity') as HTMLInputElement;

        const item_name = editItemNameEl.value.trim();
        const hsn_sac = editHsnCodeEl.value.trim();
        const brand = editBrandEl.value.trim();
        const category = editCategoryEl.value.trim();
        const item_type = (document.getElementById('editType') as HTMLSelectElement).value.trim();
        const purchase_price = parseFloat(editPurchasePriceEl.value);
        const stock_quantity = parseFloat((document.getElementById('editStockQuantity') as HTMLInputElement).value) || 0;
        const margin = parseFloat((document.getElementById('editMargin') as HTMLInputElement).value) || 0;
        const gst_rate = parseFloat(editGstRateEl.value);
        const min_stock_quantity = parseInt(editMinStockQuantityEl.value, 10);
        const specifications = (document.getElementById('editSpecifications') as HTMLTextAreaElement).value.trim();
        const unit = editUnitEl.value.trim();
        const selling_price = parseFloat((document.getElementById('editSellingPrice') as HTMLInputElement).value) || 0;
        const remarks = (document.getElementById('editRemarks') as HTMLTextAreaElement).value.trim();

        if (!itemId) return;

        clearAllErrors();
        let isValid = true;
        let firstInvalidElement: HTMLElement | null = null;

        if (!item_name) {
            showFieldError(editItemNameEl, 'Item Name is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editItemNameEl;
        }
        if (!hsn_sac) {
            showFieldError(editHsnCodeEl, 'HSN/SAC Code is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editHsnCodeEl;
        }
        if (!brand) {
            showFieldError(editBrandEl, 'Brand is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editBrandEl;
        }
        if (!category) {
            showFieldError(editCategoryEl, 'Category is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editCategoryEl;
        }
        if (!unit) {
            showFieldError(editUnitEl, 'Unit is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editUnitEl;
        }
        if (editPurchasePriceEl.value.trim() === '') {
            showFieldError(editPurchasePriceEl, 'Purchase Price is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editPurchasePriceEl;
        } else if (isNaN(purchase_price) || purchase_price <= 0) {
            showFieldError(editPurchasePriceEl, 'Please enter a valid purchase price');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editPurchasePriceEl;
        }
        if (editGstRateEl.value.trim() === '') {
            showFieldError(editGstRateEl, 'GST Rate is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editGstRateEl;
        } else if (isNaN(gst_rate) || gst_rate < 0) {
            showFieldError(editGstRateEl, 'Please enter a valid GST rate');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editGstRateEl;
        }
        if (editMinStockQuantityEl.value.trim() === '') {
            showFieldError(editMinStockQuantityEl, 'Min Stock Qty is required');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editMinStockQuantityEl;
        } else if (isNaN(min_stock_quantity) || min_stock_quantity < 0) {
            showFieldError(editMinStockQuantityEl, 'Please enter a valid minimum stock quantity');
            isValid = false;
            if (!firstInvalidElement) firstInvalidElement = editMinStockQuantityEl;
        }

        if (!isValid) {
            if (firstInvalidElement) firstInvalidElement.focus();
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
        // Only auto-set if the field is empty or still at a known default (1, 5, 10, or 100)
        if (isNaN(currentVal) || [1, 5, 10, 100].includes(currentVal) || minStockInput.value === '') {
            let defaultVal = '10';
            switch (unitSelect.value) {
                case 'm':
                    defaultVal = '1';
                    break;
                case 'kg':
                case 'L':
                    defaultVal = '5';
                    break;
                case 'pc':
                case 'pcs':
                    defaultVal = '10';
                    break;
                default:
                    defaultVal = '10';
            }
            minStockInput.value = defaultVal;
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
