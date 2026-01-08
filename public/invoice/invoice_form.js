const totalSteps = 7;
let invoiceId = '';
let totalAmountOriginal = 0;
let totalAmountDuplicate = 0;
let totalTaxOriginal = 0;
let totalTaxDuplicate = 0;
let currentDeclaration = "";
let currentTermsAndConditions = "";
let isCustomId = false; // Tracks if user manually entered a custom ID

// Initialize listener for custom ID input
document.addEventListener('DOMContentLoaded', () => {
    const idInput = document.getElementById('id');
    if (idInput) {
        idInput.addEventListener('input', () => {
            invoiceId = idInput.value.trim();
            isCustomId = true; // User manually typed in the ID field
        });
    }
});

document.getElementById("view-preview").addEventListener("click", async () => {
    // Navigate step-by-step to trigger validation at each step
    const navigateToPreview = async () => {
        // If already on preview step, just generate preview
        if (currentStep === totalSteps) {
            await generatePreview();
            return;
        }

        const nextBtn = document.getElementById('next-btn');
        if (!nextBtn) return;

        const stepBefore = currentStep;
        nextBtn.click();

        // Wait for validation and step change
        await new Promise(resolve => setTimeout(resolve, 100));

        // If step didn't change, validation failed - stop
        if (currentStep === stepBefore) return;

        // If reached preview, generate it
        if (currentStep === totalSteps) {
            await generatePreview();
            return;
        }

        // Continue to next step
        await navigateToPreview();
    };

    await navigateToPreview();
});

// Validate current step before navigation
window.validateCurrentStep = async function () {
    // Step 1: Import from Quotation / Invoice ID validation
    if (currentStep === 1) {
        const idInput = document.getElementById('id');
        const enteredId = idInput.value.trim();

        // Check for duplicate ID if not in update mode and ID is provided
        if (sessionStorage.getItem('currentTab-status') !== 'update' && enteredId) {
            try {
                const response = await fetch(`/invoice/${enteredId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.invoice) {
                        window.electronAPI.showAlert1("Invoice with this ID already exists. Please use a different ID.");
                        idInput.focus();
                        return false;
                    }
                }
                // 404 is expected for new custom IDs - this is the desired outcome
            } catch (error) {
                // Network errors should block, but don't log 404s as errors
                console.error("Error checking for duplicate invoice ID:", error);
                window.electronAPI.showAlert1("Error verifying Invoice ID. Please try again.");
                return false;
            }
        }
    }

    // Step 2: Project details
    if (currentStep === 2) {
        const projectName = document.getElementById('project-name');
        const serviceMonths = document.getElementById('service-months');

        if (!projectName.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Project Name.");
            projectName.focus();
            return false;
        }

        if (!serviceMonths.value || Number(serviceMonths.value) < 0) {
            window.electronAPI.showAlert1("Please enter valid Service Months (0 or greater).");
            serviceMonths.focus();
            return false;
        }
    }

    // Step 3: Recipient details
    if (currentStep === 3) {
        const buyerName = document.getElementById('buyer-name');
        const buyerAddress = document.getElementById('buyer-address');
        const buyerPhone = document.getElementById('buyer-phone');
        const buyerEmail = document.getElementById('buyer-email');

        if (!buyerName.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Buyer Name.");
            buyerName.focus();
            return false;
        }
        if (!buyerAddress.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Buyer Address.");
            buyerAddress.focus();
            return false;
        }
        if (!buyerPhone.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Buyer Phone Number.");
            buyerPhone.focus();
            return false;
        }
        // Validate phone length (10 digits)
        const cleanedPhone = (buyerPhone.value || '').replace(/\D/g, '');
        if (cleanedPhone.length !== 10) {
            window.electronAPI.showAlert1("Please enter a valid 10-digit Buyer Phone Number.");
            buyerPhone.focus();
            return false;
        }
        // Validate email if provided
        if (buyerEmail && buyerEmail.value.trim()) {
            const cleanedEmail = buyerEmail.value.trim().replace(/\s+/g, '');
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(cleanedEmail)) {
                window.electronAPI.showAlert1("Please enter a valid Buyer Email address.");
                buyerEmail.focus();
                return false;
            }
        }
    }

    // Step 5: Item list - ensure at least one item and validate its fields
    if (currentStep === 5) {
        const itemsTable = document.querySelector('#items-table tbody');
        if (!itemsTable || itemsTable.rows.length === 0) {
            window.electronAPI.showAlert1("Please add at least one item.");
            return false;
        }
        for (const [index, row] of Array.from(itemsTable.rows).entries()) {
            const desc = row.querySelector('td:nth-child(2) input');
            const qty = row.querySelector('td:nth-child(4) input');
            const price = row.querySelector('td:nth-child(5) input');
            if (!desc || !desc.value.trim()) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Description is required.`);
                desc?.focus();
                return false;
            }
            if (!qty || Number(qty.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Quantity must be greater than 0.`);
                qty?.focus();
                return false;
            }
            if (!price || Number(price.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Unit Price must be greater than 0.`);
                price?.focus();
                return false;
            }
        }
    }

    return true;
};

// Add input sanitization and constraints for phone/email
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('buyer-phone');
    if (phoneInput) {
        phoneInput.setAttribute('inputmode', 'numeric');
        phoneInput.setAttribute('maxlength', '10');
        phoneInput.setAttribute('pattern', '[0-9]{10}');
        phoneInput.addEventListener('input', () => {
            const cleaned = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
        });
    }

    const emailInput = document.getElementById('buyer-email');
    if (emailInput) {
        emailInput.setAttribute('maxlength', '254');
        emailInput.addEventListener('input', () => {
            const cleaned = emailInput.value.trim().replace(/\s+/g, '');
            if (emailInput.value !== cleaned) emailInput.value = cleaned;
        });
    }
});

// Hook that runs before advancing a step; return false to cancel navigation
window.beforeStepAdvance = async function (step) {
    // If we're on Step 1 (Import from Quotation) and NOT updating an existing invoice, import the quotation data
    // Allow import even if custom invoice ID is provided
    if (step === 1 && sessionStorage.getItem('currentTab-status') !== 'update') {
        const quotationId = document.getElementById("quotation-id").value;
        if (!quotationId) return true; // nothing to import

        try {
            const response = await fetch(`/quotation/${quotationId}`);
            if (!response.ok) throw new Error('Failed to fetch quotation');
            const data = await response.json();
            const quotation = data.quotation;

            document.getElementById("project-name").value = quotation.project_name;
            document.getElementById("buyer-name").value = quotation.customer_name;
            document.getElementById("buyer-address").value = quotation.customer_address;
            document.getElementById("buyer-phone").value = quotation.customer_phone;
            document.getElementById("buyer-email").value = quotation.customer_email;

            // Clear existing items
            const itemsTableBody = document.querySelector("#items-table tbody");
            itemsTableBody.innerHTML = "";
            const itemsContainer = document.getElementById("items-container");
            itemsContainer.innerHTML = "";
            const nonItemsTableBody = document.querySelector("#non-items-table tbody");
            nonItemsTableBody.innerHTML = "";
            const nonItemsContainer = document.getElementById("non-items-container");
            nonItemsContainer.innerHTML = "";

            // Add items with both cards and table rows
            let sno = 1;
            (quotation.items || []).forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${sno}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" min="1" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${sno}</div></td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="text" value="${item.HSN_SAC}" required></td>
                    <td><input type="number" value="${item.quantity}" min="1" required></td>
                    <td><input type="number" value="${item.unit_price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                itemsTableBody.appendChild(row);

                // Setup autocomplete for loaded items
                const cardInput = card.querySelector('.item-field.description input');
                const cardSuggestions = card.querySelector('.suggestions');
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', function () {
                        showSuggestions(cardInput, cardSuggestions);
                    });
                    cardInput.addEventListener('keydown', function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });
                }

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Integer validation for quantity
                const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', '1');
                        input.addEventListener('keypress', function (event) {
                            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', function () {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                });

                sno++;
            });

            // Add non-items with both cards and table rows
            (quotation.non_items || []).forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${sno}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><div class="item-number">${sno}</div></td>
                    <td><input type="text" value="${item.description}" required></td>
                    <td><input type="number" value="${item.price}" required></td>
                    <td><input type="number" value="${item.rate}" required></td>
                    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
                `;
                nonItemsTableBody.appendChild(row);

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Integer validation for quantity
                const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', '1');
                        input.addEventListener('keypress', function (event) {
                            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', function () {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                });

                sno++;
            });

            return true; // allow navigation to continue
        } catch (error) {
            console.error("Error:", error);
            window.electronAPI.showAlert1("Failed to fetch quotation.");
            return false; // cancel navigation
        }
    }

    return true; // default: allow navigation
};

// Open an invoice for editing
async function openInvoice(id) {
    try {
        const type = sessionStorage.getItem('update-invoice');
        const response = await fetch(`/invoice/${id}`);
        if (!response.ok) throw new Error("Failed to fetch invoice");

        const data = await response.json();
        const invoice = data.invoice;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-invoice').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';

        // Ensure we open the EDIT form at step 2 (Project Details) regardless of previous state
        changeStep(2);

        // Helper function to format date to YYYY-MM-DD for input fields
        const formatDateForInput = (dateString) => {
            if (!dateString) return "";
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const idInput = document.getElementById('id');
        idInput.value = invoice.invoice_id;
        idInput.readOnly = true;
        idInput.style.backgroundColor = '#f3f4f6'; // Light gray to indicate disabled

        const quotationIdInput = document.getElementById('quotation-id');
        if (quotationIdInput) quotationIdInput.value = invoice.quotation_id || '';
        document.getElementById('invoice-date').value = formatDateForInput(invoice.invoice_date);
        document.getElementById('project-name').value = invoice.project_name || '';
        document.getElementById('purchase-order-number').value = invoice.po_number || '';
        document.getElementById('purchase-order-date').value = formatDateForInput(invoice.po_date);
        document.getElementById('delivery-challan-number').value = invoice.dc_number || '';
        document.getElementById('delivery-challan-date').value = formatDateForInput(invoice.dc_date);
        document.getElementById('service-months').value = invoice.service_after_months || 0;
        document.getElementById('margin').value = invoice.margin || 0;
        document.getElementById('buyer-name').value = invoice.customer_name || '';
        document.getElementById('buyer-address').value = invoice.customer_address || '';
        document.getElementById('buyer-phone').value = invoice.customer_phone || '';
        document.getElementById('buyer-email').value = invoice.customer_email || '';
        document.getElementById('consignee-name').value = invoice.consignee_name || '';
        document.getElementById('consignee-address').value = invoice.consignee_address || '';

        // Populate content fields
        currentDeclaration = invoice.declaration || "";
        currentTermsAndConditions = invoice.termsAndConditions || "";

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";
        const itemsContainer = document.getElementById("items-container");
        itemsContainer.innerHTML = "";
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        nonItemsTableBody.innerHTML = "";
        const nonItemsContainer = document.getElementById("non-items-container");
        nonItemsContainer.innerHTML = "";
        let s = 1;

        if (type == 'original') {
            invoice.items_original.forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" min="1" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                <td><div class="item-number">${s}</div></td>
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
                itemsTableBody.appendChild(row);

                // Setup autocomplete for loaded items
                const cardInput = card.querySelector('.item-field.description input');
                const cardSuggestions = card.querySelector('.suggestions');
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', function () {
                        showSuggestions(cardInput, cardSuggestions);
                    });
                    cardInput.addEventListener('keydown', function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });
                }

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Integer validation for quantity
                const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', '1');
                        input.addEventListener('keypress', function (event) {
                            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', function () {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                });

                s++;
            });

            invoice.non_items_original.forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                <td><div class="item-number">${s}</div></td>
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="number" value="${item.price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
                nonItemsTableBody.appendChild(row);

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Integer validation for quantity
                const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', '1');
                        input.addEventListener('keypress', function (event) {
                            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', function () {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                });

                s++;
            });
        } else {
            invoice.items_duplicate.forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" min="1" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                <td>${s}</td>
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
                itemsTableBody.appendChild(row);

                // Setup autocomplete for loaded items
                const cardInput = card.querySelector('.item-field.description input');
                const cardSuggestions = card.querySelector('.suggestions');
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener('input', function () {
                        showSuggestions(cardInput, cardSuggestions);
                    });
                    cardInput.addEventListener('keydown', function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });
                }

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Integer validation for quantity
                const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
                qtyInputs.forEach(input => {
                    if (input) {
                        input.setAttribute('step', '1');
                        input.addEventListener('keypress', function (event) {
                            if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
                        });
                        input.addEventListener('input', function () {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                });

                s++;
            });

            invoice.non_items_duplicate.forEach(item => {
                // Create card
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${s}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description}" placeholder="Description" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" value="${item.price}" placeholder="Price" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" value="${item.rate}" placeholder="Rate" required>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                // Create hidden table row
                const row = document.createElement("tr");
                row.innerHTML = `
                <td>${s}</td>
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="number" value="${item.price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
                nonItemsTableBody.appendChild(row);

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, index) => {
                    input.addEventListener('input', () => {
                        rowInputs[index].value = input.value;
                    });
                });

                // Add remove button event listener
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                });

                s++;
            });
        }
    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
    }
}

// Function to get the invoice id
async function getId() {
    try {
        const response = await fetch("/invoice/generate-id");
        if (!response.ok) throw new Error("Failed to fetch invoice id");

        const data = await response.json();
        document.getElementById('id').value = data.invoice_id;
        invoiceId = data.invoice_id;
        if (invoiceId) generatePreview();
    } catch (error) {
        console.error("Error fetching invoice id:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice id. Please try again later.");
    }
}

// NOTE: calculateInvoice function below is invoice-specific and differs from the shared version
// in js/shared/calculations.js. This version includes special handling for non-items table
// which is specific to the invoice form workflow. Keep this local version.
function calculateInvoice(itemsTable) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let sno = 1;
    let itemsHTML = "";

    // Check if rate column is populated - rate is the 6th column (index 5)
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[5]?.querySelector("input")?.value || 0) > 0);

    for (const row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnSac = row.cells[2].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[3].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[4].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[5].querySelector("input").value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
            sno++;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${sno}</td>   
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
            sno++;
        }
    }

    const nonItemsTable = document.querySelector('#non-items-table tbody');
    const rows = Array.from(nonItemsTable.querySelectorAll('tr'));

    for (const row of rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const unitPrice = parseFloat(row.cells[2].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[3].querySelector("input").value || "0");

        totalTaxableValue += unitPrice;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (unitPrice * cgstPercent) / 100;
            const sgstValue = (unitPrice * sgstPercent) / 100;
            const rowTotal = unitPrice + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemsHTML += `
            <tr>
                <td>${sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>-</td>
                <td>${formatIndian(unitPrice, 2)}</td>
                <td>${formatIndian(unitPrice, 2)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${formatIndian(rowTotal, 2)}</td>
            </tr>
        `;
            sno++;
        } else {
            const rowTotal = unitPrice;
            totalPrice += rowTotal;

            itemsHTML += `
            <tr>
                <td>${sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>-</td>
                <td>${unitPrice.toFixed(2)}</td>
                <td>${rowTotal.toFixed(2)}</td>
            </tr>
        `;
            sno++;
        }
    }


    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;

    let type = sessionStorage.getItem('update-invoice');
    if (type === 'original') {
        totalAmountOriginal = Number(finalTotal.toFixed(2));
        totalTaxOriginal = Number((totalCGST + totalSGST).toFixed(2));
    } else if (type === 'duplicate') {
        totalAmountDuplicate = Number(finalTotal.toFixed(2));
        totalTaxDuplicate = Number((totalCGST + totalSGST).toFixed(2));
    }

    const totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(finalTotal, 2)}</p>
            </div>
        </div>
    `;

    return {
        totalPrice,
        totalCGST,
        totalSGST,
        totalTaxableValue,
        roundOff,
        grandTotal,
        finalTotal,
        itemsHTML,
        totalsHTML,
        hasTax
    };
}

// Function to generate the invoice preview
async function generatePreview() {
    // Capture current edits if they exist in the preview container
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
        const declarationEl = previewContainer.querySelector('.declaration');
        const termsEl = previewContainer.querySelector('.terms-section');

        // Only update if the element exists and has content (to avoid overwriting with null/empty on first load)
        if (declarationEl && declarationEl.innerHTML.trim() !== "") {
            currentDeclaration = declarationEl.innerHTML;
        }
        if (termsEl && termsEl.innerHTML.trim() !== "") {
            currentTermsAndConditions = termsEl.innerHTML;
        }
    }

    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};

    if (!invoiceId) invoiceId = document.getElementById('id').value;
    const projectName = document.getElementById("project-name").value;
    const poNumber = document.getElementById("purchase-order-number").value || '';
    const dcNumber = document.getElementById("delivery-challan-number").value || '';
    const buyerName = document.getElementById("buyer-name").value;
    const invoiceDate = document.getElementById('invoice-date')?.value || '';
    const buyerAddress = document.getElementById("buyer-address").value;
    const buyerPhone = document.getElementById("buyer-phone").value;
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    const {
        itemsHTML,
        totalsHTML,
        finalTotal,
        hasTax
    } = calculateInvoice(itemsTable);

    // Split items into rows for pagination
    const itemRows = itemsHTML.split('</tr>').filter(row => row.trim().length > 0).map(row => row + '</tr>');

    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;

    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    itemRows.forEach((row, index) => {
        const isLastItem = index === itemRows.length - 1;
        const itemSpace = 1; // Each row takes 1 line
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {
            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += row;
        currentPageRowCount += itemSpace;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    // Generate pages
    const pagesHTML = itemPages.map((pageHTML, index) => {
        const isLastPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-standard doc-quotation">
            <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="${company.company} Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>${company.company.toUpperCase()}</h1>
                <p class="quotation-tagline">CCTV & Energy Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>${company.address}</p>
            <p>Ph: ${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}</p>
            <p>GSTIN: ${company.GSTIN}</p>
            <p>Email: ${company.email}</p>
            <p>Website: ${company.website}</p>
        </div>
    </div>

            <div class="second-section">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <p>INVOICE-${invoiceId}</p>
                    <p><strong>Date: </strong>${invoiceDate || '-'}</p>
                </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Bill To:</strong></p>
                    <p>${buyerName}</p>
                    <p>${buyerAddress}</p>
                    <p>Ph. ${buyerPhone}</p>
                </div>
                <div class="info-section">
                    <p><strong>Project:</strong> ${projectName || '-'}</p>
                    <p><strong>P.O No:</strong> ${poNumber || '-'}</p>
                    <p><strong>D.C No:</strong> ${dcNumber || '-'}</p>
                </div>
            </div>
            ` : ''}

            <div class="fourth-section">
                <table>
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            ${hasTax ? `
                            <th>Taxable Value (₹)</th>
                            <th>Tax Rate (%)</th> ` : ""}
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastPage ? `<div class="continuation-text" style="text-align: center; margin: 20px 0; font-style: italic; color: #666;">Continued on next page...</div>` : ''}

            ${isLastPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(finalTotal)} Only.
                            </span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.name || company.company}</p>
                                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                                <p><strong>Account No: </strong>${bank.accountNo || ''}</p>
                                <p><strong>IFSC Code: </strong>${bank.IFSC_code || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>

            <div class="sixth-section">
                <div class="declaration" contenteditable="true">
                    ${currentDeclaration ? currentDeclaration : `<p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>`}
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    ${currentTermsAndConditions ? currentTermsAndConditions : `
                    <h4>Terms & Conditions:</h4>
                    <p>1. Payment should be made within 15 days from the date of invoice.</p>
                    <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                    <p>3. Goods once sold will not be taken back.</p>`}
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${company.company.toUpperCase()}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated invoice.</p>
            </div>
        </div>
        `;
    }).join('');

    // Generate preview content
    document.getElementById("preview-content").innerHTML = pagesHTML;
}

let isSaving = false;

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    return await sendDocumentToServer("/invoice/save-invoice", data);
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", async () => {
    if (isSaving) return;

    const saveBtn = document.getElementById("save-btn");
    const originalText = saveBtn.innerHTML;

    try {
        isSaving = true;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const wasNewInvoice = sessionStorage.getItem('currentTab-status') !== 'update';
        const invoiceData = collectFormData();
        const response = await sendToServer(invoiceData, false);


        if (response) {
            window.electronAPI.showAlert1("Invoice saved successfully!");

            // Update ID if returned to prevent duplicate creation on subsequent saves
            if (response.invoice_id) {
                invoiceId = response.invoice_id;
                const idInput = document.getElementById('id');
                if (idInput) idInput.value = invoiceId;
                // Ensure subsequent saves are treated as updates
                sessionStorage.setItem('update-invoice', 'original');
            }
            if (wasNewInvoice) {
                sessionStorage.removeItem('currentTab-status');
                window.location = '/invoice';
            }
        }
    } catch (error) {
        console.error("Save error:", error);
        window.electronAPI.showAlert1("Failed to save invoice.");
    } finally {
        isSaving = false;
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
});

// Function to collect form data
function collectFormData() {
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const { finalTotal } = calculateInvoice(itemsTable);

    // Scrape content from preview if available
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
        const declarationEl = previewContainer.querySelector('.declaration');
        const termsEl = previewContainer.querySelector('.terms-section');

        if (declarationEl) currentDeclaration = declarationEl.innerHTML;
        if (termsEl) currentTermsAndConditions = termsEl.innerHTML;
    }

    return {
        type: sessionStorage.getItem('update-invoice'),
        projectName: document.getElementById("project-name").value,
        invoiceId: document.getElementById("id").value,
        isCustomId: isCustomId, // Flag to indicate user-provided custom ID
        quotationId: document.getElementById("quotation-id")?.value || '',
        invoiceDate: document.getElementById("invoice-date").value,
        poNumber: document.getElementById("purchase-order-number").value || '',
        poDate: document.getElementById("purchase-order-date").value || null,
        dcNumber: document.getElementById("delivery-challan-number").value || '',
        dcDate: document.getElementById("delivery-challan-date").value,
        serviceAfterMonths: document.getElementById("service-months").value,
        margin: document.getElementById("margin").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        consigneeName: document.getElementById("consignee-name").value,
        consigneeAddress: document.getElementById("consignee-address").value,
        declaration: currentDeclaration,
        termsAndConditions: currentTermsAndConditions,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            HSN_SAC: row.querySelector("td:nth-child(3) input").value,
            quantity: Number(row.querySelector("td:nth-child(4) input").value) || 0,
            unit_price: Number(row.querySelector("td:nth-child(5) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(6) input").value) || 0,
        })),
        non_items: Array.from(document.querySelectorAll("#non-items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            price: Number(row.querySelector("td:nth-child(3) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(4) input").value) || 0,
        })),
        totalAmountOriginal: totalAmountOriginal,
        totalAmountDuplicate: totalAmountDuplicate,
        totalTaxOriginal: totalTaxOriginal,
        totalTaxDuplicate: totalTaxDuplicate
    };
}

// Global delegation for quantity inputs in Invoice Form
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('keypress', function (e) {
        if (e.target && (e.target.matches('.item-field.qty input') || e.target.closest('td:nth-child(4)')?.querySelector('input') === e.target)) {
            if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') {
                e.preventDefault();
            }
        }
    });
    document.body.addEventListener('input', function (e) {
        if (e.target && (e.target.matches('.item-field.qty input') || e.target.closest('td:nth-child(4)')?.querySelector('input') === e.target)) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        }
    });
});
