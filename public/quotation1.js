document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

document.addEventListener("DOMContentLoaded", () => {
    const quotationListDiv = document.querySelector(".quotation_list .quotations");

    // Function to load recent quotations from the server
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

    // Function to render quotations
    function renderQuotations(quotations) {
        quotationListDiv.innerHTML = "";

        quotations.forEach(quotation => {
            const quotationDiv = document.createElement("div");
            quotationDiv.className = "quotation-item";
            quotationDiv.style.padding = "1rem";
            quotationDiv.style.marginBottom = "1rem";
            quotationDiv.style.border = "1px solid #ddd";
            quotationDiv.style.borderRadius = "10px";
            quotationDiv.style.cursor = "pointer";
            quotationDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
            quotationDiv.style.transition = "background-color 0.3s";

            // Add hover effect
            quotationDiv.addEventListener("mouseenter", () => {
                quotationDiv.style.backgroundColor = "#f0f8ff";
            });
            quotationDiv.addEventListener("mouseleave", () => {
                quotationDiv.style.backgroundColor = "#fff";
            });

            // Quotation content
            quotationDiv.innerHTML = `
                <h4>${quotation.project_name}</h4>
                <p>ID #: ${quotation.quotation_id}</p>
                <button class="btn btn-primary open-quotation" data-id="${quotation.quotation_id}">Open</button>
                <button class="btn btn-danger delete-quotation" data-id="${quotation.quotation_id}">Delete</button>
            `;

            quotationListDiv.appendChild(quotationDiv);
        });
    }

    // Event delegation for open and delete buttons
    quotationListDiv.addEventListener("click", async (event) => {
        const target = event.target;
        const quotationId = target.getAttribute("data-id");

        if (target.classList.contains("open-quotation")) {
            await openQuotation(quotationId);
        } else if (target.classList.contains("delete-quotation")) {
            await deleteQuotation(quotationId);
            loadRecentQuotations();
        }
    });

    // Function to open a quotation
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

            document.getElementById('projectName').value = quotation.project_name;
            document.getElementById('buyerName').value = quotation.buyer_name;
            document.getElementById('buyerAddress').value = quotation.buyer_address;
            document.getElementById('buyerPhone').value = quotation.buyer_phone;

            // Clear existing rows
            const itemsTableBody = document.querySelector("#items-table tbody");
            itemsTableBody.innerHTML = "";

            // Populate items
            quotation.items.forEach(item => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="text" value="${item.hsnSac}" required></td>
                    <td><input type="number" value="${item.qty}" min="1" required></td>
                    <td><input type="text" value="${item.uom}" required></td>
                    <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required></td>
                    <td><input type="number" value="${item.taxableValue}" min="0.01" step="0.01" required readonly></td>
                    <td><input type="number" value="${item.cgstPercent}" min="0" step="0.01" required></td>
                    <td><input type="number" value="${item.cgstValue}" min="0" step="0.01" required readonly></td>
                    <td><input type="number" value="${item.sgstPercent}" min="0" step="0.01" required></td>
                    <td><input type="number" value="${item.sgstValue}" min="0" step="0.01" required readonly></td>
                    <td><input type="number" value="${item.totalPrice}" min="0" step="0.01" required readonly></td>
                    <td><button type="button" class="remove-item-btn">Remove</button></td>
                `;

                itemsTableBody.appendChild(row);
            });

            document.getElementById('total_amount').value = quotation.total_amount;
            document.getElementById('CGST').value = quotation.CGST;
            document.getElementById('SGST').value = quotation.SGST;
            document.getElementById('round_off').value = quotation.round_off;
            document.getElementById('grand_total').value = quotation.grand_total;

        } catch (error) {
            console.error("Error fetching quotation:", error);
            window.electronAPI.showAlert("Failed to fetch quotation. Please try again later.");
        }
    }

    // Function to delete a quotation
    async function deleteQuotation(quotationId) {
        try {
            const response = await fetch(`/quotation/${quotationId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete quotation");
            }

            window.electronAPI.showAlert("Quotation deleted successfully");
        } catch (error) {
            console.error("Error deleting quotation:", error);
            window.electronAPI.showAlert("Failed to delete quotation. Please try again later.");
        }
    }

    loadRecentQuotations();
});

document.getElementById('newQuotation').addEventListener('click', () => {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
});