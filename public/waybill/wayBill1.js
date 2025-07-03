// Example: Switch active class on sidebar navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

document.getElementById('dashboard').addEventListener('click', () => {
    window.location = '/dashboard';
})

document.getElementById('quotation').addEventListener('click', () => {
    window.location = '/quotation';
})

document.getElementById('postOrder').addEventListener('click', () => {
    window.location = '/purchaseorder';
})

document.getElementById('wayBill').addEventListener('click', () => {
    window.location = '/wayBill';
})

document.getElementById('invoice').addEventListener('click', () => {
    window.location = '/invoice';
})

document.getElementById('service').addEventListener('click', () => {
    window.location = '/service';
})

document.getElementById('stock').addEventListener('click', () => {
    window.location = '/stock';
})

document.getElementById('employees').addEventListener('click', () => {
    window.location = '/employee';
})

document.getElementById('analytics').addEventListener('click', () => {
    window.location = '/analytics';
})

document.getElementById('settings').addEventListener('click', () => {
    window.location = '/settings';
})

const wayBillsListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentWayBills();
    document.getElementById('newWayBill').addEventListener('click', showNewWayBillForm);
    document.getElementById('searchInput').addEventListener('click', handleSearch);
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

document.addEventListener("keydown", function (event) {
    // Prevent step change if focus is in an input, textarea, or contenteditable element
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
        <img src="../assets/delivery.png" alt="Icon">
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
    <select class="actions" onchange="handleAction(this, '${wayBill.wayBill_id}')">
        <option value="" disabled selected>Actions</option>
        <option class="open-wayBill" data-id="${wayBill.wayBill_id}" value="view">View</option>
        <option class="delete-wayBill" data-id="${wayBill.wayBill_id}" value="update">Update</option>
        <option class="delete-wayBill" data-id="${wayBill.wayBill_id}" value="delete">Delete</option>
        </select>
    `;

    return wayBillDiv;
}

function handleAction(select, id) {
    const action = select.value;
    if (action === "view") {
        viewWayBill(id);
    } else if (action === "update") {
        openWayBill(id);
    }
    else if (action === "delete") {
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

function generateViewPreviewHTML(wayBill, withTax) {
    // Use the view block fields, not the editable form table
    let itemsHTML = "";
    (wayBill.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnSac = item.HSN_SAC || item.hsn_sac || "-";
        const qty = item.quantity || "0";
        const unitPrice = item.unitPrice || item.UnitPrice || "0";
        const rate = item.rate || "0";
        const total = (qty * unitPrice).toFixed(2);

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${hsnSac}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${rate}</td>
            <td>${total}</td>
        </tr>`;
    });

    document.getElementById("preview-content2").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Way Bill #${wayBill.wayBill_id || wayBill.waybill_id || wayBill.ewayBillNumber || ""}</div>

        <div class="first-section">
            <div class="buyer-details">
                <h3>Buyer Details</h3>
                <p>${wayBill.buyer_name || wayBill.buyerName || ""}</p>
                <p>${wayBill.buyer_address || wayBill.buyerAddress || ""}</p>
                <p>${wayBill.buyer_phone || wayBill.buyerPhone || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${wayBill.project_name || wayBill.projectName || ""}</p>
                <p><strong>Transportation Mode:</strong> ${wayBill.transport_mode || wayBill.transportMode || ""}</p>
                <p><strong>Vehicle Number:</strong> ${wayBill.vehicle_number || wayBill.vehicleNumber || ""}</p>
                <p><strong>Place to Supply:</strong> ${wayBill.place_supply || wayBill.placeSupply || ""}</p>
            </div>  
        </div>
        <div class="second-section">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Rate</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        </div>
        <br>
        <div class="fifth-section">
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        </div>
        <footer>
            <p>This is a computer-generated way bill</p>
        </footer>
    </div>`;
}

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content2").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content2").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        let name = 'WayBill';
        window.electronAPI.handlePrintEvent(previewContent, "savePDF" , name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

async function viewWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch waybill");
        }

        const data = await response.json();
        const waybill = data.wayBill;

        // Hide other sections, show view section
        document.getElementById('viewPreview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('detail-projectName').textContent = waybill.project_name || '';
        document.getElementById('detail-wayBillId').textContent = waybill.wayBill_id || waybill.waybill_id || '';

        // Buyer & Consignee
        document.getElementById('detail-buyerName').textContent = waybill.buyer_name || '';
        document.getElementById('detail-buyerAddress').textContent = waybill.buyer_address || '';
        document.getElementById('detail-buyerPhone').textContent = waybill.buyer_phone || '';
        document.getElementById('detail-buyerEmail').textContent = waybill.buyer_email || '';

        // Transportation Details
        document.getElementById('detail-transportMode').textContent = waybill.transport_mode || waybill.transportMode || '';
        document.getElementById('detail-vehicleNumber').textContent = waybill.vehicle_number || waybill.vehicleNumber || '';
        document.getElementById('detail-placeSupply').textContent = waybill.place_supply || waybill.placeSupply || '';

        // Item List
        const detailItemsTableBody = document.querySelector("#detail-items-table tbody");
        detailItemsTableBody.innerHTML = "";

        (waybill.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || ''}</td>
                <td>${item.HSN_SAC || item.hsn_sac || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.unitPrice || item.UnitPrice || ''}</td>
                <td>${item.rate || ''}</td>
            `;
            detailItemsTableBody.appendChild(row);
        });

        generateViewPreviewHTML(waybill, true);

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            window.print();
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            window.print();
        };

    } catch (error) {
        console.error("Error fetching waybill:", error);
        window.electronAPI?.showAlert1("Failed to fetch waybill. Please try again later.");
    }
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
        document.getElementById('buyerEmail').value = wayBill.buyer_email || "";
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