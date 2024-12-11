document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

let currentStep = 1;
        const totalSteps = 4;

        document.getElementById("nextBtn").addEventListener("click", () => {
            if (currentStep < totalSteps) {
                document.getElementById(`step-${currentStep}`).classList.remove("active");
                currentStep++;
                document.getElementById(`step-${currentStep}`).classList.add("active");
            }
            updateNavigation();
        });

        document.getElementById("prevBtn").addEventListener("click", () => {
            if (currentStep > 1) {
                document.getElementById(`step-${currentStep}`).classList.remove("active");
                currentStep--;
                document.getElementById(`step-${currentStep}`).classList.add("active");
            }
            updateNavigation();
        });

        function updateNavigation() {
            document.getElementById("prevBtn").disabled = currentStep === 1;
            document.getElementById("nextBtn").disabled = currentStep === totalSteps;
        }

document.getElementById('save').addEventListener('click', () => {
    sendToServer();
})

document.getElementById('add-item-btn').addEventListener('click', () => {
    addItem();
})

// Function to dynamically add items to the invoice
function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="number" placeholder="Price (₹)" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn" nonce="ab" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

// Function to remove a specific item row
function removeItem(button) {
    button.parentElement.parentElement.remove();
}

// Function to collect form data and send to server
async function sendToServer() {
    const items = [];
    document.querySelectorAll("#items-table tbody tr").forEach(row => {
        const description = row.cells[0].querySelector("input").value;
        const quantity = parseInt(row.cells[1].querySelector("input").value, 10);
        const price = parseFloat(row.cells[2].querySelector("input").value);

        if (description && quantity > 0 && price >= 0) {
            items.push({ description, qty: quantity, price });
        }
    });

    const invoiceData = {
        invoiceNumber: document.getElementById("invoiceNumber").value,
        date: document.getElementById("date").value,
        buyer: document.getElementById("buyer").value,
        items,
        totalAmount: parseFloat(document.getElementById("totalAmount").value),
        tax: parseFloat(document.getElementById("tax").value)
    };

    try {
        const response = await fetch("http://localhost:3000/save-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoiceData)
        });

        if (response.ok) {
            alert("Invoice saved successfully!");
            document.getElementById("invoice-form").reset();
            document.querySelector("#items-table tbody").innerHTML = ""; // Clear items table
        } else {
            alert("Error saving invoice.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to connect to server.");
    }
}