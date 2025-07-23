const quotationListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    document.getElementById('new-quotation').addEventListener('click', showNewQuotationForm);

    // Attach search to Enter key only, not click
    document.getElementById('search-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
});

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotations");
        }

        const data = await response.json();
        renderQuotations(data.quotation);
    } catch (error) {
        console.error("Error loading quotations:", error);
        quotationListDiv.innerHTML = "<p>Failed to load quotations. Please try again later.</p>";
    }
}

// Render quotations in the list
function renderQuotations(quotations) {
    quotationListDiv.innerHTML = "";
    if (!quotations || quotations.length === 0) {
        quotationListDiv.innerHTML = "<h1>No quotations found</h1>";
        return;
    }
    quotations.forEach(quotation => {
        const quotationCard = createQuotationCard(quotation);
        quotationListDiv.appendChild(quotationCard);
    });
}

// Create a quotation card element
function createQuotationCard(quotation) {
    const quotationCard = document.createElement("div");
    quotationCard.className = "record-item no-select";
    quotationCard.innerHTML = `
        <div class="paid-icon">
            <img src="../assets/quotation.png" alt="Quotation Icon">
        </div>
        <div class="record-item-details" >
            <div class="record-item-info-1">
                <h1>${quotation.project_name}</h1>
                <h4 class="copy-text">${quotation.quotation_id}</h4>
                <div id="toast" style="display:none;position:absolute;bottom:20px;left:275px;background:#333;color:#fff;padding:10px 20px;border-radius:5px;">Copied!</div>
            </div>   
        </div>
        <div class="record-item-details">
            <div class="record-item-info-2">
                <h2>Customer</h2>
                <p>${quotation.customer_name}</p>
                <p>${quotation.customer_address}</p>
            </div>
        </div>
        <div class="record-item-details">
            <div class="record-item-info-3">
                <h2>Amount</h2>
                <p>₹${formatIndian(quotation.total_amount_tax, 2)}</p>
            </div>
        </div>
        <select class="actions">
            <option value="" disabled selected>Actions</option>
            <option value="view">View</option>
            <option value="viewWTax">View With TAX</option>
            <option value="compactView">Compact View</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
        </select>
    `;

    const copyElement = quotationCard.querySelector('.copy-text');

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 500);
    }

    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(copyElement.textContent.trim());
            showToast('Copied!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });


    // Attach event listener in JS, not inline
    quotationCard.querySelector('.actions').addEventListener('change', function () {
        handleQuotationAction(this, quotation.quotation_id);
    });

    return quotationCard;
}

// Handle actions from the actions dropdown
function handleQuotationAction(select, quotationId) {
    const action = select.value;
    if (action === "view") {
        viewQuotation(quotationId, viewType = 1);
    } else if (action === "viewWTax") {
        viewQuotation(quotationId, viewType = 2);
    } else if (action === "compactView") {
        viewQuotation(quotationId, viewType = 3);
    } else if (action === "update") {
          sessionStorage.setItem('currentTab-status', 'update');
        openQuotation(quotationId);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteQuotation(quotationId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

// Open a quotation for editing
async function openQuotation(quotationId) {
    try {
        const response = await fetch(`/quotation/${quotationId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotation");
        }

        const data = await response.json();
        const quotation = data.quotation;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-quotation').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';
        if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
            document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
        }

        document.getElementById('id').value = quotation.quotation_id;
        document.getElementById('project-name').value = quotation.project_name;
        document.getElementById('quotation-date').value = formatDate(quotation.quotation_date);
        document.getElementById('buyer-name').value = quotation.customer_name;
        document.getElementById('buyer-address').value = quotation.customer_address;
        document.getElementById('buyer-phone').value = quotation.customer_phone;
        document.getElementById('buyer-email').value = quotation.customer_email;

        const itemsTableBody = document.querySelector("#items-table tbody");
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");
        itemsTableBody.innerHTML = "";
        nonItemsTableBody.innerHTML = "";
        itemsSpecificationsTableBody.innerHTML = "";

        (quotation.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${itemsTableBody.children.length + 1}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            itemsTableBody.appendChild(row);
        });

        (quotation.non_items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${nonItemsTableBody.children.length + 1}</td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="number" value="${item.price || ''}" placeholder="Price" required></td>
                <td><input type="number" value="${item.rate || ''}" placeholder="Rate" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
            nonItemsTableBody.appendChild(row);
        });

        (quotation.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${itemsSpecificationsTableBody.children.length + 1}</td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
            itemsSpecificationsTableBody.appendChild(row);
        });

        (quotation.non_items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${itemsSpecificationsTableBody.children.length + 1}</td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
            itemsSpecificationsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Delete a quotation
async function deleteQuotation(quotationId) {
    try {
        const response = await fetch(`/quotation/${quotationId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete quotation");
        }

        window.electronAPI.showAlert1("Quotation deleted successfully");
        loadRecentQuotations();
    } catch (error) {
        console.error("Error deleting quotation:", error);
        window.electronAPI.showAlert1("Failed to delete quotation. Please try again later.");
    }
}

// Show the new quotation form
function showNewQuotationForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-quotation').style.display = 'none';
    document.getElementById('view-preview').style.display = 'block';
    document.getElementById('view').style.display = 'none';

    if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/quotation/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            quotationListDiv.innerHTML = `<h1>${errorText}</h1>`;
            return;
        }

        const data = await response.json();
        const quotations = data.quotation;
        quotationListDiv.innerHTML = "";
        (quotations || []).forEach(quotation => {
            const quotationCard = createQuotationCard(quotation);
            quotationListDiv.appendChild(quotationCard);
        });
    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}