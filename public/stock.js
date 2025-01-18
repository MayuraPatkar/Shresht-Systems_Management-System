document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
}

function hideModal() {
    ['addItem', 'addToStock', 'removeFromStock', 'editItem'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById('backdrop').style.display = 'none';
}

function addItemDiv() {
    showModal('addItem');
}

function addToStockDiv(itemId) {
    showModal('addToStock');
    document.getElementById('addToStock').setAttribute('data-item-id', itemId);
}

function removeFromStockDiv(itemId) {
    showModal('removeFromStock');
    document.getElementById('removeFromStock').setAttribute('data-item-id', itemId);
}

function editItemDiv(itemId, HSN_SAC, name, unitPrice, quantity, threshold, GST, min_quantity) {
    showModal('editItem');
    document.getElementById('editItem').setAttribute('data-item-id', itemId);
    document.getElementById('edit_item_name').value = name;
    document.getElementById('edit_HSN_SAC').value = HSN_SAC;
    document.getElementById('edit_unit_price').value = unitPrice;
    document.getElementById('edit_quantity').value = quantity;
    document.getElementById('edit_threshold').value = threshold;
    document.getElementById('edit_GST').value = GST;
    document.getElementById('edit_min_quantity').value = min_quantity;
}

async function addItem() {
    try {
        const itemName = document.getElementById('item_name').value;
        const HSN_SAC = document.getElementById('HSN_SAC').value;
        const unitPrice = parseFloat(document.getElementById('unit_price').value);
        const quantity = parseInt(document.getElementById('item_quantity').value, 10);
        const threshold = parseInt(document.getElementById('threshold').value, 10);
        const GST = parseFloat(document.getElementById('GST').value);
        const min_quantity = parseInt(document.getElementById('min_quantity').value, 10);

        if (!itemName || isNaN(unitPrice) || isNaN(quantity) || isNaN(threshold) || isNaN(GST) || isNaN(min_quantity)) {
            window.electronAPI.showAlert('Please fill all fields correctly.');
            return;
        }

        const response = await fetch('/stock/addItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName, HSN_SAC, unitPrice, quantity, threshold, GST, min_quantity })
        });

        if (!response.ok) throw new Error('Failed to add item');
        await fetchStockData();
        hideModal();
    } catch (error) {
        console.error('Error adding item:', error);
        window.electronAPI.showAlert('Failed to add item. Please try again.');
    }
}

async function addToStock() {
    try {
        const itemId = document.getElementById('addToStock').getAttribute('data-item-id');
        const quantity = parseInt(document.getElementById('add_quantity').value, 10);

        if (isNaN(quantity)) {
            window.electronAPI.showAlert('Please enter a valid quantity.');
            return;
        }

        const response = await fetch('/stock/addToStock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });

        if (!response.ok) throw new Error('Failed to add quantity');
        await fetchStockData();
        hideModal();
    } catch (error) {
        console.error('Error adding item:', error);
        window.electronAPI.showAlert('Failed to add item. Please try again.');
    }
}

async function removeFromStock() {
    try {
        const itemId = document.getElementById('removeFromStock').getAttribute('data-item-id');
        const quantity = parseInt(document.getElementById('remove_quantity').value, 10);

        if (isNaN(quantity)) {
            window.electronAPI.showAlert('Please enter a valid quantity.');
            return;
        }

        const response = await fetch('/stock/removeFromStock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });

        if (!response.ok) throw new Error('Failed to remove quantity');
        await fetchStockData();
        hideModal();
    } catch (error) {
        console.error('Error removing item:', error);
        window.electronAPI.showAlert('Failed to remove item. Please try again.');
    }
}

async function editItem() {
    try {
        const itemId = document.getElementById('editItem').getAttribute('data-item-id');
        const itemName = document.getElementById('edit_item_name').value;
        const HSN_SAC = document.getElementById('edit_HSN_SAC').value;
        const unitPrice = parseFloat(document.getElementById('edit_unit_price').value);
        const quantity = parseInt(document.getElementById('edit_quantity').value, 10);
        const threshold = parseInt(document.getElementById('edit_threshold').value, 10);
        const GST = parseFloat(document.getElementById('edit_GST').value);
        const min_quantity = parseInt(document.getElementById('edit_min_quantity').value, 10);

        if (!itemName || isNaN(unitPrice) || isNaN(quantity) || isNaN(threshold) || isNaN(GST) || isNaN(min_quantity)) {
            window.electronAPI.showAlert('Please fill all fields correctly.');
            return;
        }

        const response = await fetch('/stock/editItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, itemName, HSN_SAC, unitPrice, quantity, threshold, GST, min_quantity })
        });

        if (!response.ok) throw new Error('Failed to edit item');
        await fetchStockData();
        hideModal();
    } catch (error) {
        console.error('Error editing item:', error);
        window.electronAPI.showAlert('Failed to edit item. Please try again.');
    }
}

async function lowStock() {
    try {
        const response = await fetch('/stock/getStock');
        if (!response.ok) {
            throw new Error('Failed to fetch stock data');
        }
        const stockData = await response.json();
        stockData.forEach(item => {
            if (item.quantity < item.min_quantity) {
                const tableBody = document.getElementById('stock-table-body');
                tableBody.innerHTML = '';


                const row = document.createElement('tr');
                row.classList.toggle('low-stock', item.quantity < item.min_quantity);

                row.innerHTML = `
                    <td>${item.itemName}</td>
                    <td>${item.HSN_SAC}</td>
                    <td>${item.unitPrice}</td>
                    <td>${item.quantity}</td>
                    <td>${item.threshold}</td>
                    <td>${item.GST}</td>
                    <td>${item.quantity < item.min_quantity ? 'Low Stock' : 'In Stock'}</td>
                    <td>
                        <button class="btn" onclick="addToStockDiv('${item._id}')">Add</button>
                        <button class="btn" onclick="removeFromStockDiv('${item._id}')">Remove</button>
                        <button class="btn" onclick="editItemDiv('${item._id}', '${item.HSN_SAC}', '${item.itemName}', '${item.unitPrice}', '${item.quantity}', '${item.threshold}', '${item.GST}', '${item.min_quantity}')">Edit</button>
                    </td>
                `;
                tableBody.appendChild(row);
            };
        });
    } catch (error) {
        console.error('Error fetching stock data:', error);
        window.electronAPI.showAlert('Error fetching stock data. Please try again.');
    }
}

async function fetchStockData() {
    try {
        const response = await fetch('/stock/getStock');
        if (!response.ok) {
            throw new Error('Failed to fetch stock data');
        }
        const stockData = await response.json();
        renderStockTable(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        window.electronAPI.showAlert('Error fetching stock data. Please try again.');
    }
}

function renderStockTable(data) {
    const tableBody = document.getElementById('stock-table-body');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.classList.toggle('low-stock', item.quantity < item.min_quantity);

        row.innerHTML = `
            <td>${item.itemName}</td>
            <td>${item.HSN_SAC}</td>
            <td>${item.unitPrice}</td>
            <td>${item.quantity}</td>
            <td>${item.threshold}</td>
            <td>${item.GST}</td>
            <td>${item.quantity < item.min_quantity ? 'Low Stock' : 'In Stock'}</td>
            <td>
                <button class="btn" onclick="addToStockDiv('${item._id}')">Add</button>
                <button class="btn" onclick="removeFromStockDiv('${item._id}')">Remove</button>
                <button class="btn" onclick="editItemDiv('${item._id}', '${item.HSN_SAC}', '${item.itemName}', '${item.unitPrice}', '${item.quantity}', '${item.threshold}', '${item.GST}', '${item.min_quantity}')">Edit</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Initial fetch
fetchStockData();

// Event listener for backdrop click to close modals
document.getElementById('backdrop').addEventListener('click', hideModal);