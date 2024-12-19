document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

function addItemDiv() {
    document.getElementById('addItem').style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
}

function addToStockDiv(itemId) {
    document.getElementById('addToStock').style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
    document.getElementById('addToStock').setAttribute('data-item-id', itemId);
}

function removeFromStockDiv(itemId) {
    document.getElementById('removeFromStock').style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
    document.getElementById('removeFromStock').setAttribute('data-item-id', itemId);
}

function editItemDiv(itemId, name, unitPrice, quantity) {
    document.getElementById('editItem').style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
    document.getElementById('editItem').setAttribute('data-item-id', itemId);
    document.getElementById('edit_item_name').value = name;
    document.getElementById('edit_unit_price').value = unitPrice;
    document.getElementById('edit_quantity').value = quantity;
}

// Generic function to close all modals
function closeModal() {
    ['addItem', 'addToStock', 'removeFromStock', 'editItem'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById('backdrop').style.display = 'none';
}

// Add item to stock
async function addItem() {
    try {
        const itemName = document.getElementById('item_name').value;
        const unitPrice = parseFloat(document.getElementById('unit_price').value);
        const quantity = parseInt(document.getElementById('item_quantity').value, 10);

        if (!itemName || isNaN(unitPrice) || isNaN(quantity)) {
            window.electronAPI.showAlert('Please fill all fields correctly.');
            return;
        }

        const response = await fetch('/stock/addItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName, unitPrice, quantity })
        });

        if (!response.ok) throw new Error('Failed to add item');
        await fetchStockData();
        closeModal();
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
        console.log(itemId)
        const response = await fetch('/stock/addToStock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });

        if (!response.ok) throw new Error('Failed to add quantity');
        await fetchStockData();
        closeModal();
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
        closeModal();
    } catch (error) {
        console.error('Error removing item:', error);
        window.electronAPI.showAlert('Failed to remove item. Please try again.');
    }
}

async function editItem() {
    try {
        const itemId = document.getElementById('editItem').getAttribute('data-item-id');
        const itemName = document.getElementById('edit_item_name').value;
        const unitPrice = parseFloat(document.getElementById('edit_unit_price').value);
        const quantity = parseInt(document.getElementById('edit_quantity').value, 10);

        if (!itemName || isNaN(unitPrice) || isNaN(quantity)) {
            window.electronAPI.showAlert('Please fill all fields correctly.');
            return;
        }

        const response = await fetch('/stock/editItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, itemName, unitPrice, quantity })
        });

        if (!response.ok) throw new Error('Failed to edit item');
        await fetchStockData();
        closeModal();
    } catch (error) {
        console.error('Error editing item:', error);
        window.electronAPI.showAlert('Failed to edit item. Please try again.');
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
        row.classList.toggle('low-stock', item.quantity < 5);

        row.innerHTML = `
            <td>${item.itemName}</td>
            <td>${item.unitPrice}</td>
            <td>${item.quantity}</td>
            <td>${item.quantity < 5 ? 'Low Stock' : 'In Stock'}</td>
            <td>
                <button class="btn" onclick="addToStockDiv('${item._id}')">Add</button>
                <button class="btn" onclick="removeFromStockDiv('${item._id}')">Remove</button>
                <button class="btn" onclick="editItemDiv('${item._id}', '${item.name}', '${item.unitPrice}', '${item.quantity}')">Edit</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Initial fetch
fetchStockData();

// Event listener for backdrop click to close modals
document.getElementById('backdrop').addEventListener('click', closeModal);
