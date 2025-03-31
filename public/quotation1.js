const quotationListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    quotationListDiv.addEventListener("click", handleQuotationListClick);
    document.getElementById('newQuotation').addEventListener('click', showNewQuotationForm);
    document.getElementById('quotationSearchBtn').addEventListener('click', handleSearch);
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
    if (quotations.length === 0) {
        quotationListDiv.innerHTML = "<h3>No quotations found</h3>";
        return;
    }
    quotations.forEach(quotation => {
        const quotationDiv = createQuotationDiv(quotation);
        quotationListDiv.appendChild(quotationDiv);
    });
}

// Create a quotation div element
function createQuotationDiv(quotation) {
    const quotationDiv = document.createElement("div");
    quotationDiv.className = "record-item";
    quotationDiv.innerHTML = `
    <div class="paid-icon">
        <img src="./assets/quotation.png" alt="Icon">
    </div>
        <div class="details">
            <div class="info1">
                <h1>${quotation.project_name}</h1>
                <h4>#${quotation.quotation_id}</h4>
            </div>
            <div class="info2">
                <p>${quotation.buyer_name}</p>
                <p>${quotation.buyer_address}</p>
            </div>    
        </div>
        <div class="actions">
            <button class="btn btn-primary open-quotation" data-id="${quotation.quotation_id}">Open</button>
            <button class="btn btn-danger delete-quotation" data-id="${quotation.quotation_id}">Delete</button>
        </div>
    `;

    return quotationDiv;
}

// Handle click events on the quotation list
async function handleQuotationListClick(event) {
    const target = event.target;
    const quotationId = target.getAttribute("data-id");

    if (target.classList.contains("open-quotation")) {
        await openQuotation(quotationId);
    } else if (target.classList.contains("delete-quotation")) {
        window.electronAPI.showAlert2('Are you sure you want to delete this quotation?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteQuotation(quotationId);
                }
            });
        }
    }
};

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
        document.getElementById('newQuotation').style.display = 'none';
        document.getElementById('viewPreview').style.display = 'block';
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;


        document.getElementById('Id').value = quotation.quotation_id;
        document.getElementById('projectName').value = quotation.project_name;
        document.getElementById('buyerName').value = quotation.buyer_name;
        document.getElementById('buyerAddress').value = quotation.buyer_address;
        document.getElementById('buyerPhone').value = quotation.buyer_phone;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        quotation.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unitPrice}" required></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;

            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert("Failed to fetch quotation. Please try again later.");
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

        window.electronAPI.showAlert("Quotation deleted successfully");
        loadRecentQuotations();
    } catch (error) {
        console.error("Error deleting quotation:", error);
        window.electronAPI.showAlert("Failed to delete quotation. Please try again later.");
    }
}

// Show the new quotation form
function showNewQuotationForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('newQuotation').style.display = 'none';
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('quotationSearchInput').value;
    if (!query) {
        window.electronAPI.showAlert("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/quotation/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            quotationListDiv.innerHTML = `<p>${errorText}</p>`;
            return;
        }

        const data = await response.json();
        const quotations = data.quotation;
        quotationListDiv.innerHTML = "";
        quotations.forEach(quotation => {
            const quotationDiv = createQuotationDiv(quotation);
            quotationListDiv.appendChild(quotationDiv);
        });
    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI.showAlert("Failed to fetch quotation. Please try again later.");
    }
}

document.getElementById("quotationSearchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
    }
});