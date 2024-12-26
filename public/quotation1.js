document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

const quotationListDiv = document.querySelector(".quotation_list .quotations");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    quotationListDiv.addEventListener("click", handleQuotationListClick);
    document.getElementById('newQuotation').addEventListener('click', showNewQuotationForm);
    document.getElementById('quotationSearchBtn').addEventListener('click', handleSearch);
});

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

function createQuotationDiv(quotation) {
    const quotationDiv = document.createElement("div");
    quotationDiv.className = "quotation-item";
    quotationDiv.style.padding = "1rem";
    quotationDiv.style.marginBottom = "1rem";
    quotationDiv.style.border = "1px solid #ddd";
    quotationDiv.style.borderRadius = "10px";
    quotationDiv.style.cursor = "pointer";
    quotationDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
    quotationDiv.style.transition = "background-color 0.3s";

    quotationDiv.addEventListener("mouseenter", () => {
        quotationDiv.style.backgroundColor = "#f0f8ff";
    });
    quotationDiv.addEventListener("mouseleave", () => {
        quotationDiv.style.backgroundColor = "#fff";
    });

    quotationDiv.innerHTML = `
        <h4>${quotation.project_name}</h4>
        <p>ID #: ${quotation.quotation_id}</p>
        <button class="btn btn-primary open-quotation" data-id="${quotation.quotation_id}">Open</button>
        <button class="btn btn-danger delete-quotation" data-id="${quotation.quotation_id}">Delete</button>
    `;

    return quotationDiv;
}

async function handleQuotationListClick(event) {
    const target = event.target;
    const quotationId = target.getAttribute("data-id");

    if (target.classList.contains("open-quotation")) {
        await openQuotation(quotationId);
    } else if (target.classList.contains("delete-quotation")) {
        showConfirmBox('Are you sure you want to delete this quotation?', async () => {
            await deleteQuotation(quotationId);
            loadRecentQuotations();
        });
    }
}

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

        document.getElementById('quotationId').value = quotation.quotation_id;
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
                <td><input type="text" value="${item.unitPrice}" required></td>
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

function showNewQuotationForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
}

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