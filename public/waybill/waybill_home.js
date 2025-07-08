// Sidebar navigation active state and navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Sidebar navigation routing (IDs must match HTML)
document.getElementById('dashboard-link').addEventListener('click', () => {
    window.location = '/dashboard';
});
document.getElementById('quotation-link').addEventListener('click', () => {
    window.location = '/quotation';
});
document.getElementById('invoice-link').addEventListener('click', () => {
    window.location = '/invoice';
});
document.getElementById('waybill-link').addEventListener('click', () => {
    window.location = '/wayBill';
});
document.getElementById('service-link').addEventListener('click', () => {
    window.location = '/service';
});
document.getElementById('purchase-bill-link').addEventListener('click', () => {
    window.location = '/purchaseorder';
});
document.getElementById('stock-link').addEventListener('click', () => {
    window.location = '/stock';
});
document.getElementById('comms-link').addEventListener('click', () => {
    window.location = '/comms';
});
document.getElementById('employees-link').addEventListener('click', () => {
    window.location = '/employee';
});
document.getElementById('analytics-link').addEventListener('click', () => {
    window.location = '/analytics';
});
document.getElementById('inventory-link').addEventListener('click', () => {
    window.location = '/inventory';
});
document.getElementById('calculations-link').addEventListener('click', () => {
    window.location = '/calculations';
});
document.getElementById('settings-link').addEventListener('click', () => {
    window.location = '/settings';
});

// Main content references
const wayBillsListDiv = document.querySelector(".records");

// Header buttons
document.addEventListener("DOMContentLoaded", () => {
    loadRecentWayBills();
    document.getElementById('new-waybill-btn').addEventListener('click', showNewWayBillForm);
    document.getElementById('search-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
    document.getElementById('view-preview-btn').addEventListener('click', () => {
        changeStep(totalSteps);
        generatePreview();
    });
    document.getElementById('view-preview-btn').style.display = 'none'
});

// Step navigation
let currentStep = 1;
const totalSteps = 6;

document.getElementById("next-btn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        if (currentStep === totalSteps) generatePreview();
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
});

document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
});

function updateNavigation() {
    document.getElementById("prev-btn").disabled = currentStep === 1;
    document.getElementById("next-btn").disabled = currentStep === totalSteps;
}

// Keyboard navigation
function moveNext() {
    document.getElementById('next-btn').click();
}
document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        moveNext();
    }
});
document.addEventListener("keydown", function (event) {
    const active = document.activeElement;
    if (
        active &&
        (
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable
        )
    ) {
        return;
    }
    if (event.key === "Backspace") {
        if (currentStep > 1) {
            changeStep(currentStep - 1);
        }
    }
});

// Change step function
function changeStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Load recent way bills from the server
async function loadRecentWayBills() {
    try {
        const response = await fetch(`/wayBill/recent-way-bills`);
        if (!response.ok) {
            wayBillsListDiv.innerHTML = "<h1>No Waybills Found</h1>";
            return;
        }
        const data = await response.json();
        renderWayBills(data.wayBill);
    } catch (error) {
        console.error("Error loading way bills:", error);
        wayBillsListDiv.innerHTML = "<p>Failed to load way bills. Please try again later.</p>";
    }
}

// Render way bills in the list
function renderWayBills(wayBills) {
    wayBillsListDiv.innerHTML = "";
    if (!wayBills || wayBills.length === 0) {
        wayBillsListDiv.innerHTML = "<h1>No Waybills Found</h1>";
        return;
    }
    wayBills.forEach(wayBill => {
        const wayBillDiv = createWayBillCard(wayBill);
        wayBillsListDiv.appendChild(wayBillDiv);
    });
}

// Create a way bill card element
function createWayBillCard(wayBill) {
    const wayBillDiv = document.createElement("div");
    wayBillDiv.className = "record-item";
    wayBillDiv.innerHTML = `
    <div class="paid-icon">
        <img src="../assets/delivery.png" alt="Way Bill Icon">
    </div>
    <div class="details">
        <div class="info1">
            <h1>${wayBill.project_name}</h1>
            <h4>#${wayBill.waybill_id}</h4>
        </div>
        <div class="info2">
            <p>${wayBill.customer_name}</p>
            <p>${wayBill.customer_address}</p>
        </div>
    </div>
    <select class="actions">
        <option value="" disabled selected>Actions</option>
        <option value="view">View</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
    </select>
    `;
    wayBillDiv.querySelector('.actions').addEventListener('change', function () {
        handleWayBillAction(this, wayBill.waybill_id);
    });
    return wayBillDiv;
}

// Handle actions from the actions dropdown
function handleWayBillAction(select, wayBillId) {
    const action = select.value;
    if (action === "view") {
        viewWayBill(wayBillId);
    } else if (action === "update") {
        openWayBill(wayBillId);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this way bill?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteWayBill(wayBillId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

// Open a way bill for editing
async function openWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch way bill");
        }
        const data = await response.json();
        const wayBill = data.wayBill;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-waybill-btn').style.display = 'none';
        document.getElementById('view-preview-btn').style.display = 'block';

        if (currentStep === 1) {
            changeStep(2);
        }

        document.getElementById('waybill-id').value = wayBill.waybill_id;
        document.getElementById('project-name').value = wayBill.project_name;
        document.getElementById('buyer-name').value = wayBill.customer_name;
        document.getElementById('buyer-address').value = wayBill.customer_address;
        document.getElementById('buyer-phone').value = wayBill.customer_phone;
        document.getElementById('buyer-email').value = wayBill.customer_email || "";
        document.getElementById('transport-mode').value = wayBill.transport_mode;
        document.getElementById('vehicle-number').value = wayBill.vehicle_number;
        document.getElementById('place-supply').value = wayBill.place_supply;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        (wayBill.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching way bill:", error);
        window.electronAPI.showAlert1("Failed to fetch way bill. Please try again later.");
    }
}

// Delete a way bill
async function deleteWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete way bill");
        }

        window.electronAPI.showAlert1("Way bill deleted successfully");
        loadRecentWayBills();
    } catch (error) {
        console.error("Error deleting way bill:", error);
        window.electronAPI.showAlert1("Failed to delete way bill. Please try again later.");
    }
}

// Show the new way bill form
function showNewWayBillForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new'). style.display = 'block';
    document.getElementById('new-waybill-btn').style.display = 'none';
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/wayBill/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            wayBillsListDiv.innerHTML = `<h1>${errorText}</h1>`;
            return;
        }

        const data = await response.json();
        const wayBills = data.wayBills;
        wayBillsListDiv.innerHTML = "";
        (wayBills || []).forEach(wayBill => {
            const wayBillDiv = createWayBillCard(wayBill);
            wayBillsListDiv.appendChild(wayBillDiv);
        });
    } catch (error) {
        console.error("Error fetching way bills:", error);
        window.electronAPI.showAlert1("Failed to fetch way bills. Please try again later.");
    }
}