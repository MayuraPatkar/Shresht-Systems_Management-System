// Redirect to dashboard when logo is clicked
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

const wayBillsListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentWayBills();

    wayBillsListDiv.addEventListener("click", handleWayBillListClick);
    document.getElementById('newWayBill').addEventListener('click', showNewWayBillForm);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
});

let currentStep = 1;
const totalSteps = 6;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        if (currentStep === totalSteps) generatePreview();
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
});

function moveNext() {
    document.getElementById('nextBtn').click();
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        moveNext();
    }
});

// Function to change the current step
function changeStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
    }
});

function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").disabled = currentStep === totalSteps;;
}

document.getElementById("viewPreview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Load recent way bills from the server
async function loadRecentWayBills() {
    try {
        const response = await fetch(`/wayBill/recent-way-bills`);
        if (!response.ok) {
            wayBillsListDiv.innerHTML = "<h1>No way bills found</h1>";
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
    if (wayBills.length === 0) {
        wayBillsListDiv.innerHTML = "<h1>No way bills found</h1>";
        return;
    }
    wayBills.forEach(wayBill => {
        const wayBillDiv = createWayBillDiv(wayBill);
        wayBillsListDiv.appendChild(wayBillDiv);
    });
}

// Create a way bill div element
function createWayBillDiv(wayBill) {
    const wayBillDiv = document.createElement("div");
    wayBillDiv.className = "record-item";
    wayBillDiv.innerHTML = `
    <div class="paid-icon">
        <img src="./assets/delivery.png" alt="Icon">
    </div>
    <div class="details">
    <div class="info1">
        <h1>${wayBill.project_name}</h1>
        <h4>#${wayBill.wayBill_id}</h4>
        </div>
        <div class="info2">
        <p>${wayBill.buyer_name}</p>
        <p>${wayBill.buyer_address}</p>
        </div>
    </div>
    <div class="actions">
        <button class="btn btn-primary open-way-bill" data-id="${wayBill.wayBill_id}">Open</button>
        <button class="btn btn-danger delete-way-bill" data-id="${wayBill.wayBill_id}">Delete</button>
    </div>
    `;

    return wayBillDiv;
}

// Handle click events on the way bill list
async function handleWayBillListClick(event) {
    const target = event.target;
    const wayBillId = target.getAttribute("data-id");

    if (target.classList.contains("open-way-bill")) {
        await openWayBill(wayBillId);
    } else if (target.classList.contains("delete-way-bill")) {
        window.electronAPI.showAlert2('Are you sure you want to delete this way bill?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteWayBill(wayBillId);
                }
            });
        }
    };
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
        document.getElementById('newWayBill').style.display = 'none';
        document.getElementById('viewPreview').style.display = 'block';

        if (currentStep === 1) {
            changeStep(2)
        }

        document.getElementById('wayBillId').value = wayBill.wayBill_id;
        document.getElementById('projectName').value = wayBill.project_name;
        document.getElementById('buyerName').value = wayBill.buyer_name;
        document.getElementById('buyerAddress').value = wayBill.buyer_address;
        document.getElementById('buyerPhone').value = wayBill.buyer_phone;
        document.getElementById('transportMode').value = wayBill.transport_mode;
        document.getElementById('vehicleNumber').value = wayBill.vehicle_number;
        document.getElementById('placeSupply').value = wayBill.place_supply;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        wayBill.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unitPrice}" required></td>
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

// Show a confirmation box
function showConfirmBox(message, onConfirm, onCancel) {
    const confirmBox = document.getElementById('confirm_box');
    const messageElement = document.getElementById('message');
    const yesButton = document.getElementById('yes');
    const noButton = document.getElementById('no');

    messageElement.textContent = message;
    confirmBox.style.display = 'block';

    yesButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    noButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onCancel) onCancel();
    };
}

// Show the new way bill form
function showNewWayBillForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('newWayBill').style.display = 'none';
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
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
        wayBills.forEach(wayBill => {
            const wayBillDiv = createWayBillDiv(wayBill);
            wayBillsListDiv.appendChild(wayBillDiv);
        });
    } catch (error) {
        console.error("Error fetching way bills:", error);
        window.electronAPI.showAlert1("Failed to fetch way bills. Please try again later.");
    }
}

document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
    }
})