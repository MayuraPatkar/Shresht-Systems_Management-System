document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

async function fetchStockData() {
    const response = await fetch('/api/stock');
    const stockData = await response.json();
    renderStockTable(stockData);
}

function renderStockTable(data) {
    const tableBody = document.getElementById('stock-table-body');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.classList.toggle('low-stock', item.quantity < 5);

        row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.quantity < 5 ? 'Low Stock' : 'In Stock'}</td>
                    <td>
                        <button class="btn" onclick="updateStock('${item.id}', 1)">Add</button>
                        <button class="btn" onclick="updateStock('${item.id}', -1)">Remove</button>
                    </td>
                `;
        tableBody.appendChild(row);
    });
}

async function updateStock(id, delta) {
    await fetch(`/api/stock/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
    });
    fetchStockData();
}

// Initial fetch
fetchStockData();