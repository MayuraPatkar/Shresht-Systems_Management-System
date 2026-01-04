const totalSteps = 6;
let quotationId = '';
let totalAmountNoTax = 0;
let totalAmountTax = 0;
let totalTax = 0;

// Initialize the step indicator on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
        stepIndicator.textContent = `Step 1 of ${totalSteps}`;
    }
});

function normalizeTermsHTML(raw) {
    if (!raw) return '';
    // If it already contains HTML list or block tags, return as-is
    if (/<\s*(ul|li|ol|p|br|div|h[1-6])/.test(raw)) return raw;
    // Otherwise, treat as newline separated text and convert to <ul><li>...
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return `<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
}


async function getQuotationHeaderHTML() {
    if (window.SectionRenderers && typeof window.SectionRenderers.renderQuotationDocumentHeader === "function") {
        return await window.SectionRenderers.renderQuotationDocumentHeader();
    }
    // Fallback header if SectionRenderers not loaded
    return `
        <div class="header">
            <div class="quotation-brand">
                <div class="logo">
                    <img src="../assets/icon.png" alt="Shresht Logo">
                </div>
                <div class="quotation-brand-text">
                    <h1>SHRESHT SYSTEMS</h1>
                    <p class="quotation-tagline">CCTV & Security Solutions</p>
                </div>
            </div>
            <div class="company-details">
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>
    `;
}


document.getElementById("view-preview").addEventListener("click", async () => {
    changeStep(totalSteps);
    await generatePreview();
});

// Open a quotation for editing
async function openQuotation(quotationId) {
    const data = await fetchDocumentById('quotation', quotationId);
    if (!data) return;

    const quotation = data.quotation;

    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-quotation').style.display = 'none';
    document.getElementById('view-preview').style.display = 'block';
    if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }

    const idInput = document.getElementById('id');
    idInput.value = quotation.quotation_id;
    idInput.readOnly = true;
    idInput.style.backgroundColor = '#f3f4f6'; // Light gray to indicate disabled
    document.getElementById('project-name').value = quotation.project_name;
    // Use input-safe ISO date for the date field
    document.getElementById('quotation-date').value = toInputDate(quotation.quotation_date);
    document.getElementById('buyer-name').value = quotation.customer_name;
    document.getElementById('buyer-address').value = quotation.customer_address;
    document.getElementById('buyer-phone').value = quotation.customer_phone;
    document.getElementById('buyer-email').value = quotation.customer_email;

    const itemsContainer = document.getElementById("items-container");
    const nonItemsContainer = document.getElementById("non-items-container");
    const specificationsContainer = document.getElementById("specifications-container");
    const itemsTableBody = document.querySelector("#items-table tbody");
    const nonItemsTableBody = document.querySelector("#non-items-table tbody");
    const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");

    // Clear existing content
    if (itemsContainer) itemsContainer.innerHTML = "";
    if (nonItemsContainer) nonItemsContainer.innerHTML = "";
    if (specificationsContainer) specificationsContainer.innerHTML = "";
    itemsTableBody.innerHTML = "";
    nonItemsTableBody.innerHTML = "";
    itemsSpecificationsTableBody.innerHTML = "";

    // Load items
    (quotation.items || []).forEach((item, index) => {
        // Create table row first
        const row = document.createElement("tr");
        row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
        itemsTableBody.appendChild(row);

        // Create card
        if (itemsContainer) {
            const card = document.createElement("div");
            card.className = "item-card";
            card.setAttribute("draggable", "true");
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" placeholder="Enter item description" class="item_name" value="${item.description || ''}" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" placeholder="Code" value="${item.HSN_SAC || ''}" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" placeholder="0" min="1" value="${item.quantity || ''}" required>
                    </div>
                    <div class="item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.unit_price || ''}" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">

                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            itemsContainer.appendChild(card);

            // Setup autocomplete for loaded items
            const cardInput = card.querySelector(".item_name");
            const cardSuggestions = card.querySelector(".suggestions");

            if (cardInput && cardSuggestions) {
                cardInput.addEventListener("input", function () {
                    showSuggestions(cardInput, cardSuggestions);
                    // Update specifications table when item description changes (with debounce)
                    clearTimeout(cardInput.specUpdateTimeout);
                    cardInput.specUpdateTimeout = setTimeout(() => {
                        if (cardInput.value.trim()) {
                            updateSpecificationsTable();
                        }
                    }, 500);
                });

                cardInput.addEventListener("keydown", function (event) {
                    handleKeyboardNavigation(event, cardInput, cardSuggestions);
                });

                // Close suggestions handled by global listener
            }

            // Sync card inputs with table inputs
            const cardInputs = card.querySelectorAll('input');
            const rowInputs = row.querySelectorAll('input');
            cardInputs.forEach((input, idx) => {
                input.addEventListener('input', () => {
                    if (rowInputs[idx]) {
                        rowInputs[idx].value = input.value;
                    }
                });
            });

            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                updateItemNumbers();
                updateSpecificationsTable();
            });
        }
    });

    // Load non-items
    (quotation.non_items || []).forEach((item, index) => {
        // Create table row first
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><div class="item-number">${itemsTableBody.rows.length}</div></td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="number" value="${item.price || ''}" placeholder="Price" required></td>
                <td><input type="number" value="${item.rate || ''}" placeholder="Rate" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
        nonItemsTableBody.appendChild(row);

        // Create card
        if (nonItemsContainer) {
            const card = document.createElement("div");
            card.className = "non-item-card";
            card.setAttribute("draggable", "true");
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="non-item-field description">
                        <input type="text" placeholder="e.g., Installation Charges" value="${item.description || ''}" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.price || ''}" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            nonItemsContainer.appendChild(card);

            // Sync card inputs with table inputs
            const cardInputs = card.querySelectorAll('input');
            const rowInputs = row.querySelectorAll('input');
            cardInputs.forEach((input, idx) => {
                input.addEventListener('input', () => {
                    if (rowInputs[idx]) {
                        rowInputs[idx].value = input.value;
                    }
                });
            });

            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                updateNonItemNumbers();
                updateSpecificationsTable();
            });

            // Add listener for description change to update specifications
            const descriptionInput = card.querySelector('.non-item-field.description input');
            if (descriptionInput) {
                descriptionInput.addEventListener('input', () => {
                    clearTimeout(descriptionInput.specUpdateTimeout);
                    descriptionInput.specUpdateTimeout = setTimeout(() => {
                        if (descriptionInput.value.trim()) {
                            updateSpecificationsTable();
                        }
                    }, 500);
                });
            }
        }
    });

    // Combine items and non_items for specifications
    const allItemsForSpecs = [
        ...(quotation.items || []).map(item => ({ ...item, type: 'item' })),
        ...(quotation.non_items || []).map(item => ({ ...item, type: 'non_item' }))
    ];

    allItemsForSpecs.forEach((item, index) => {
        // Create specification card
        if (specificationsContainer) {
            const card = document.createElement('div');
            card.className = 'spec-card';
            card.setAttribute('draggable', 'true');
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="spec-field description">
                        <input type="text" value="${item.description || ''}" readonly style="background: #f9fafb; cursor: not-allowed;">
                    </div>
                    <div class="spec-field specification">
                        <input type="text" placeholder="Enter specifications" value="${item.specification || ''}" required>
                    </div>
                `;
            specificationsContainer.appendChild(card);
        }

        // Also create table row
        const row = document.createElement("tr");
        row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
        itemsSpecificationsTableBody.appendChild(row);
    });
}

// Clone a quotation - copies items, content, and customer details
async function cloneQuotation(sourceQuotationId) {
    try {
        // Fetch the source quotation
        const data = await fetchDocumentById('quotation', sourceQuotationId);
        if (!data) {
            window.electronAPI.showAlert1("Failed to load quotation for cloning.");
            return;
        }

        const quotation = data.quotation;

        // Show the form (similar to showNewQuotationForm)
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-quotation').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';
        if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
            document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
        }

        // Generate a new ID for the clone
        const idResponse = await fetch("/quotation/generate-id");
        if (!idResponse.ok) throw new Error("Failed to generate new quotation ID");
        const { quotation_id: newId } = await idResponse.json();

        // Set the new ID and make it editable (it's a new quotation)
        const idInput = document.getElementById('id');
        idInput.value = newId;
        idInput.readOnly = false;
        idInput.style.backgroundColor = ''; // Reset to default (editable)
        quotationId = newId;

        // Store the source quotation ID for audit trail
        sessionStorage.setItem('duplicated_from', sourceQuotationId);

        // Store the source quotation content for preview generation
        sessionStorage.setItem('clone_content', JSON.stringify({
            subject: quotation.subject || '',
            letter_1: quotation.letter_1 || '',
            letter_2: quotation.letter_2 || [],
            letter_3: quotation.letter_3 || '',
            headline: quotation.headline || '',
            notes: quotation.notes || [],
            termsAndConditions: quotation.termsAndConditions || ''
        }));

        // Copy project name (append " (Clone)" to indicate copy if desired, but user just asked for details)
        document.getElementById('project-name').value = quotation.project_name || '';

        // Set date to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('quotation-date').value = `${yyyy}-${mm}-${dd}`;

        // Copy customer fields - include customer details as requested
        document.getElementById('buyer-name').value = quotation.customer_name || '';
        document.getElementById('buyer-address').value = quotation.customer_address || '';
        document.getElementById('buyer-phone').value = quotation.customer_phone || '';
        document.getElementById('buyer-email').value = quotation.customer_email || '';

        // Get containers
        const itemsContainer = document.getElementById("items-container");
        const nonItemsContainer = document.getElementById("non-items-container");
        const specificationsContainer = document.getElementById("specifications-container");
        const itemsTableBody = document.querySelector("#items-table tbody");
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");

        // Clear existing content
        if (itemsContainer) itemsContainer.innerHTML = "";
        if (nonItemsContainer) nonItemsContainer.innerHTML = "";
        if (specificationsContainer) specificationsContainer.innerHTML = "";
        itemsTableBody.innerHTML = "";
        nonItemsTableBody.innerHTML = "";
        itemsSpecificationsTableBody.innerHTML = "";

        // Copy items (same logic as openQuotation)
        (quotation.items || []).forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="text" value="${item.HSN_SAC || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
            itemsTableBody.appendChild(row);

            if (itemsContainer) {
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" placeholder="Enter item description" class="item_name" value="${item.description || ''}" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" placeholder="Code" value="${item.HSN_SAC || ''}" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" placeholder="0" min="1" value="${item.quantity || ''}" required>
                    </div>
                    <div class="item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.unit_price || ''}" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                // Setup autocomplete
                const cardInput = card.querySelector(".item_name");
                const cardSuggestions = card.querySelector(".suggestions");
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener("input", function () {
                        showSuggestions(cardInput, cardSuggestions);
                        clearTimeout(cardInput.specUpdateTimeout);
                        cardInput.specUpdateTimeout = setTimeout(() => {
                            if (cardInput.value.trim()) {
                                updateSpecificationsTable();
                            }
                        }, 500);
                    });
                    cardInput.addEventListener("keydown", function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });
                }

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });

                // Remove button
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                    updateSpecificationsTable();
                });
            }
        });

        // Copy non-items
        (quotation.non_items || []).forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="item-number">${itemsTableBody.rows.length}</div></td>
                <td><input type="text" value="${item.description || ''}" placeholder="Item Description" required></td>
                <td><input type="number" value="${item.price || ''}" placeholder="Price" required></td>
                <td><input type="number" value="${item.rate || ''}" placeholder="Rate" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
            nonItemsTableBody.appendChild(row);

            if (nonItemsContainer) {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="non-item-field description">
                        <input type="text" placeholder="e.g., Installation Charges" value="${item.description || ''}" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" placeholder="0.00" step="0.01" value="${item.price || ''}" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" placeholder="0" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });

                // Remove button
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateNonItemNumbers();
                    updateSpecificationsTable();
                });

                // Description change listener
                const descriptionInput = card.querySelector('.non-item-field.description input');
                if (descriptionInput) {
                    descriptionInput.addEventListener('input', () => {
                        clearTimeout(descriptionInput.specUpdateTimeout);
                        descriptionInput.specUpdateTimeout = setTimeout(() => {
                            if (descriptionInput.value.trim()) {
                                updateSpecificationsTable();
                            }
                        }, 500);
                    });
                }
            }
        });

        // Copy specifications
        const allItemsForSpecs = [
            ...(quotation.items || []).map(item => ({ ...item, type: 'item' })),
            ...(quotation.non_items || []).map(item => ({ ...item, type: 'non_item' }))
        ];

        allItemsForSpecs.forEach((item, index) => {
            if (specificationsContainer) {
                const card = document.createElement('div');
                card.className = 'spec-card';
                card.setAttribute('draggable', 'true');
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="spec-field description">
                        <input type="text" value="${item.description || ''}" readonly style="background: #f9fafb; cursor: not-allowed;">
                    </div>
                    <div class="spec-field specification">
                        <input type="text" placeholder="Enter specifications" value="${item.specification || ''}" required>
                    </div>
                `;
                specificationsContainer.appendChild(card);
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
            itemsSpecificationsTableBody.appendChild(row);
        });

        // Generate preview - content will be populated from sessionStorage in duplicate mode
        await generatePreview();

        // Show success toast
        if (typeof showToast === 'function') {
            showToast(`Quotation cloned from ${sourceQuotationId}.`);
        }

    } catch (error) {
        console.error("Error cloning quotation:", error);
        window.electronAPI.showAlert1("Failed to clone quotation. Please try again.");
    }
}

// Function to get the quotation id
async function getId() {
    try {
        const response = await fetch("/quotation/generate-id");
        if (!response.ok) throw new Error("Failed to fetch quotation id");

        const data = await response.json();
        document.getElementById('id').value = data.quotation_id;
        quotationId = data.quotation_id;
        if (quotationId) await generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

async function generateFilePages(files) {
    if (!files || files.length === 0) return '';

    const getFilePath = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const filePath = await window.electronAPI.saveFile(buffer, file.name);
        return filePath;
    };

    const headerHTML = await getQuotationHeaderHTML();

    const pages = await Promise.all(Array.from(files).map(async (file) => {
        const imagePath = await getFilePath(file);

        return `
            <div class="preview-container doc-quotation">
                ${headerHTML}

                <div class="files-section" style="margin: 20px 0; text-align: center;">
                    <img src="${imagePath}" alt="Uploaded File" style="max-width: 100%; max-height: 800px; object-fit: contain;">
                </div>

                <footer>
                    <p>This is a computer-generated quotation.</p>
                </footer>
            </div>
        `;
    }));

    return pages.join('');
}



// Function to generate the preview for both tax rate and without tax rate
async function generatePreview() {
    // Capture any existing user edits BEFORE regenerating the preview
    // This preserves user modifications to contenteditable fields
    const existingContent = {
        subject: document.querySelector("#preview-content .quotation-letter-content p[contenteditable]")?.innerText.replace("Subject:", "").trim() || null,
        letter_1: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1]?.innerText.trim() || null,
        letter_2: (() => {
            const items = document.querySelectorAll("#preview-content .quotation-letter-content ul[contenteditable] li");
            return items.length > 0 ? Array.from(items).map(li => li.innerText.trim()) : null;
        })(),
        letter_3: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2]?.innerText.trim() || null,
        notes: (() => {
            const items = document.querySelector("#preview-content .notes-section ul")?.querySelectorAll("li");
            return items && items.length > 0 ? Array.from(items).map(li => li.innerText.trim()) : null;
        })(),
        termsAndConditions: document.querySelector("#preview-content .terms-section")?.innerHTML.trim() || null,
        headline: document.querySelector("#preview-content .headline-section p[contenteditable]")?.innerText.trim() || null
    };

    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};
    const phoneStr = company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '');

    if (!quotationId) {
        quotationId = document.getElementById('id').value;
    }
    const projectName = document.getElementById("project-name").value || "";
    const quotationDate = document.getElementById("quotation-date").value || "";
    const buyerName = document.getElementById("buyer-name").value || "";
    const buyerAddress = document.getElementById("buyer-address").value || "";
    const buyerPhone = document.getElementById("buyer-phone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');
    const headerHTML = await getQuotationHeaderHTML();

    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let grandTotal = 0;
    let roundOff = 0;
    let sno = 0;

    const allRenderableItems = [];
    const CHARS_PER_LINE = 60;

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[5].querySelector("input").value) > 0);

    // Process regular items
    for (const row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnSac = row.cells[2].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[3].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[4].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[5].querySelector("input").value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;
        let itemHTML = "";

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>${hsnSac}</td><td>${qty}</td><td>${formatIndian(unitPrice, 2)}</td><td>${formatIndian(taxableValue, 2)}</td><td>${rate.toFixed(2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;
            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>${hsnSac}</td><td>${qty}</td><td>${formatIndian(unitPrice, 2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    // Process non-items
    const nonItems = Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
        descriptions: row.querySelector('input[placeholder="Item Description"]').value,
        price: row.querySelector('input[placeholder="Price"]').value,
        rate: row.querySelector('input[placeholder="Rate"]').value,
    }));

    for (const item of nonItems) {
        const description = item.descriptions || '-';
        const price = Number(item.price) || 0;
        const rate = Number(item.rate) || 0;

        let rowTotal = price;
        totalTaxableValue += price; // Add non-item price to taxable value

        if (hasTax && rate > 0) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (price * cgstPercent) / 100;
            const sgstValue = (price * sgstPercent) / 100;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            rowTotal += cgstValue + sgstValue;
        }

        totalPrice += rowTotal; // Add the final row total to the grand total

        // Generate HTML with consistent columns: S.No, Description, HSN/SAC, Qty, Unit Price, [Taxable Value, Rate %], Total
        let itemHTML = "";
        if (hasTax) {
            // With tax: 8 columns (S.No, Description, HSN/SAC, Qty, Unit Price, Taxable Value, Rate %, Total)
            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>-</td><td>-</td><td>${formatIndian(price, 2)}</td><td>${formatIndian(price, 2)}</td><td>${rate.toFixed(2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        } else {
            // Without tax: 6 columns (S.No, Description, HSN/SAC, Qty, Unit Price, Total)
            itemHTML = `<tr><td>${sno + 1}</td><td>${description}</td><td>-</td><td>-</td><td>${formatIndian(price, 2)}</td><td>${formatIndian(rowTotal, 2)}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    grandTotal = totalPrice; // Use totalPrice which now includes non-items
    roundOff = Math.round(grandTotal) - grandTotal;
    totalTax = totalCGST + totalSGST;
    totalAmountNoTax = totalTaxableValue;
    totalAmountTax = (totalPrice + roundOff).toFixed(2);

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
                <p>₹ ${formatIndian(Math.round(totalPrice), 2)}</p>
            </div>
        </div>
    `;

    const ITEMS_PER_PAGE = 20; // Represents available lines on a page for items.
    const SUMMARY_SECTION_ROW_COUNT = 8; // Estimated height of totals, payment, and notes sections.

    // Build pages with the new logic
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    allRenderableItems.forEach((item, index) => {
        const isLastItem = index === allRenderableItems.length - 1;

        // Calculate the space this item will take up.
        const itemSpace = item.rowCount;

        // If this is the last item, the required space must also include the summary.
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        // Condition to create a new page:
        // 1. If the current page is not empty AND
        // 2. EITHER this item (if not the last) overflows the page
        // 3. OR this item (if it IS the last) plus the summary overflows the page.
        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {

            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += item.html;
        currentPageRowCount += item.rowCount;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    const itemsPageHTML = itemPages.map((pageHTML, index) => {
        const isLastItemsPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${projectName || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S. No</th>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            ${hasTax ? `
                            <th>Taxable Value (₹)</th>
                            <th>Rate (%)</th>` : ""}
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
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
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                    <li>All prices are exclusive of taxes unless stated otherwise.</li>    
                    <li>Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.</li>
                    <li>Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                    <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>              
                    <li>All applicable taxes and duties are included unless stated otherwise.</li>
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
    }).join('');


    // Remove the separate summary page
    const summaryPageHTML = ``;

    // const files = document.getElementById('files');
    // const files = document.getElementById('files');
    const tabStatus = sessionStorage.getItem('currentTab-status');
    const isClone = tabStatus === 'clone';
    const isUpdate = tabStatus === 'update';

    // Format the date for display (DD/MM/YYYY format)
    const formattedDate = formatDateIndian(quotationDate);

    // Get clone content if in clone mode
    let cloneContent = null;
    if (isClone) {
        try {
            const storedContent = sessionStorage.getItem('clone_content');
            if (storedContent) {
                cloneContent = JSON.parse(storedContent);
            }
        } catch (e) {
            console.error('Failed to parse clone content:', e);
        }
    }

    if (!isUpdate && !isClone) {
        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
            <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${projectName}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">We appreciate the opportunity to submit our proposal for the supply, installation, and commissioning of ${projectName}. At <strong>${company.company}</strong>, we are committed to delivering high-quality, industry-standard solutions tailored to meet your specific requirements.</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                <li>Cutting-edge technology and premium-grade equipment</li>
                <li>Expert installation by certified professionals</li>
                <li>Comprehensive commissioning and quality assurance</li>
                <li>Reliable after-sales support and service</li>
            </ul>
            
            <p contenteditable="true">We are confident that our offering will add significant value to your operations. Please find the detailed quotation enclosed for your review. Should you require any further information or modifications, feel free to contact us.</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            <h3>Terms & Conditions</h3>
            <ul>
                <li><strong>Lead Time:</strong> Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                <li><strong>Payment Terms:</strong>
                    <ul>
                        <li>50% advance upon order confirmation.</li>
                        <li>40% before dispatch of materials.</li>
                        <li>10% after successful installation and commissioning.</li>
                    </ul>
                </li>
                <li><strong>Warranty:</strong>
                    <ul>
                        <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>
                        <li>Any defects arising due to manufacturing faults will be rectified as per warranty terms.</li>
                        <li>Warranty does not cover damages due to improper handling, unauthorized modifications, or external factors.</li>
                    </ul>
                </li>
                <li><strong>Customer Scope:</strong> Provision of necessary infrastructure such as power supply, water, and secure storage for materials.</li>
                <li><strong>Quote Validity:</strong> 30 days from the date of issue.</li>
                <li><strong>Taxes & Duties:</strong> All applicable taxes and duties are included unless stated otherwise.</li>
                <li><strong>Force Majeure:</strong> The company shall not be liable for delays or non-performance due to circumstances beyond its control.</li>
            </ul>
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
        // generateFilePages(files)
    } else if (isClone && cloneContent) {
        // Clone mode - use content from source quotation stored in sessionStorage
        const itemsPageHTMLDup = itemPages.map((pageHTML, index) => {
            const isLastItemsPage = index === itemPages.length - 1;
            return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${cloneContent.headline || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S. No</th>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            ${hasTax ? `
                            <th>Taxable Value (₹)</th>
                            <th>Rate (%)</th>` : ""}
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
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
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                   ${(cloneContent.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
        }).join('');

        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
            <p contenteditable="true"><strong>Subject:</strong> ${cloneContent.subject || ''}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">${cloneContent.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                ${(cloneContent.letter_2 || []).map(li => `<li>${li}</li>`).join('')}
            </ul>
            
            <p contenteditable="true">${cloneContent.letter_3 || ''}</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTMLDup}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            ${normalizeTermsHTML(cloneContent.termsAndConditions || '')}
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
    } else {
        try {
            const response = await fetch(`/quotation/${quotationId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch quotation");
            }

            const data = await response.json();
            const quotation = data.quotation;

            const itemsPageHTML = itemPages.map((pageHTML, index) => {
                const isLastItemsPage = index === itemPages.length - 1;
                return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S. No</th>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            ${hasTax ? `
                            <th>Taxable Value (₹)</th>
                            <th>Rate (%)</th>` : ""}
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
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
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                   ${(quotation.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
            }).join('');

            document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
            <p contenteditable="true"><strong>Subject:</strong> ${quotation.subject || ''}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">${quotation.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                ${(quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('')}
            </ul>
            
            <p contenteditable="true">${quotation.letter_3 || ''}</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            ${normalizeTermsHTML(quotation.termsAndConditions || '')}
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
            // generateFilePages(files)

        } catch (error) {

        }
    }

    // Restore any previously captured user edits to the contenteditable elements
    // This runs AFTER the preview HTML has been regenerated
    if (existingContent.subject !== null) {
        const subjectEl = document.querySelector("#preview-content .quotation-letter-content p[contenteditable]");
        if (subjectEl) subjectEl.innerHTML = `<strong>Subject:</strong> ${existingContent.subject}`;
    }
    if (existingContent.letter_1 !== null) {
        const letter1El = document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1];
        if (letter1El) letter1El.innerText = existingContent.letter_1;
    }
    if (existingContent.letter_2 !== null) {
        const letter2El = document.querySelector("#preview-content .quotation-letter-content ul[contenteditable]");
        if (letter2El) letter2El.innerHTML = existingContent.letter_2.map(li => `<li>${li}</li>`).join('');
    }
    if (existingContent.letter_3 !== null) {
        const letter3El = document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2];
        if (letter3El) letter3El.innerText = existingContent.letter_3;
    }
    if (existingContent.notes !== null) {
        const notesEl = document.querySelector("#preview-content .notes-section ul");
        if (notesEl) notesEl.innerHTML = existingContent.notes.map(li => `<li>${li}</li>`).join('');
    }
    if (existingContent.termsAndConditions !== null) {
        const termsEl = document.querySelector("#preview-content .terms-section");
        if (termsEl) termsEl.innerHTML = existingContent.termsAndConditions;
    }
    if (existingContent.headline !== null) {
        const headlineEl = document.querySelector("#preview-content .headline-section p[contenteditable]");
        if (headlineEl) headlineEl.innerHTML = `<u>${existingContent.headline}</u>`;
    }
}



// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    const result = await sendDocumentToServer("/quotation/save-quotation", data);
    // Clear clone-related data from sessionStorage after successful save
    if (result) {
        sessionStorage.removeItem('duplicated_from');
        sessionStorage.removeItem('clone_content');
        sessionStorage.setItem('currentTab-status', 'update');
    }
    return result;
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", async () => {
    const quotationData = collectFormData();
    const ok = await sendToServer(quotationData, false);
    if (ok) window.electronAPI.showAlert1("Quotation saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        await sendToServer(quotationData, true);
        let name = `Quotation-${quotationId}`;
        window.electronAPI.handlePrintEventQuatation(previewContent, "print", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "Save as PDF" button
document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
        const quotationData = collectFormData();
        await sendToServer(quotationData, true);
        let name = `Quotation-${quotationId}`;
        window.electronAPI.handlePrintEventQuatation(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});


// Helper: convert various date values into YYYY-MM-DD for <input type="date">
function toInputDate(value) {
    // Accept Date object, ISO string, timestamp, or null/undefined.
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Function to collect form data
function collectFormData() {
    // Helper function to get specification from either table or cards
    const getSpecification = (desc) => {
        // First, try to find in specification table
        const specRow = Array.from(document.querySelectorAll("#items-specifications-table tbody tr"))
            .find(spec => spec.querySelector("td:nth-child(2)")?.textContent === desc);
        if (specRow) {
            const specValue = specRow.querySelector("td:nth-child(3) input")?.value;
            if (specValue) return specValue;
        }
        // Fallback: check specification cards
        const specCard = Array.from(document.querySelectorAll("#specifications-container .spec-card"))
            .find(card => card.querySelector(".spec-field.description input")?.value === desc);
        if (specCard) {
            return specCard.querySelector(".spec-field.specification input")?.value || "";
        }
        return "";
    };

    return {
        quotation_id: document.getElementById("id").value,
        projectName: document.getElementById("project-name").value,
        quotationDate: document.getElementById("quotation-date").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            HSN_SAC: row.querySelector("td:nth-child(3) input").value,
            quantity: Number(row.querySelector("td:nth-child(4) input").value) || 0,
            unit_price: Number(row.querySelector("td:nth-child(5) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(6) input").value) || 0,
            specification: getSpecification(row.querySelector("td:nth-child(2) input").value)
        })),
        non_items: Array.from(document.querySelectorAll("#non-items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            price: Number(row.querySelector("td:nth-child(3) input").value) || 0,
            rate: Number(row.querySelector("td:nth-child(4) input").value) || 0,
            specification: getSpecification(row.querySelector("td:nth-child(2) input").value)
        })),
        totalTax: totalTax,
        totalAmountNoTax: totalAmountNoTax,
        totalAmountTax: totalAmountTax,

        // Include duplicated_from for audit trail if this is a duplicated quotation
        duplicated_from: sessionStorage.getItem('duplicated_from') || null,

        subject: document.querySelector("#preview-content .quotation-letter-content p[contenteditable]")?.innerText.replace("Subject:", "").trim() || '',
        letter_1: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1]?.innerText.trim() || '',
        letter_2: Array.from(document.querySelectorAll("#preview-content .quotation-letter-content ul[contenteditable] li") || []).map(li => li.innerText.trim()),
        letter_3: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2]?.innerText.trim() || '',
        notes: Array.from(document.querySelector("#preview-content .notes-section ul")?.querySelectorAll("li") || []).map(li => li.innerText.trim()),
        termsAndConditions: document.querySelector("#preview-content .terms-section")?.innerHTML.trim() || '',
        headline: document.querySelector("#preview-content .headline-section p[contenteditable]")?.innerText.trim() || ''
    };
}



/**
 * Validates the current step before allowing navigation to the next.
 * This is called by globalScript.js via the hook.
 */
window.validateCurrentStep = async function () {
    // currentStep is a global variable from globalScript.js

    if (currentStep === 1) {
        const projectName = document.getElementById('project-name');
        const quoteDate = document.getElementById('quotation-date');
        const idInput = document.getElementById('id');
        const enteredId = idInput.value.trim();

        // Check for duplicate ID if not in update mode and ID is provided
        if (sessionStorage.getItem('currentTab-status') !== 'update' && enteredId) {
            try {
                const response = await fetch(`/quotation/${enteredId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.quotation) {
                        window.electronAPI.showAlert1("Quotation with this ID already exists. Please use a different ID.");
                        idInput.focus();
                        return false;
                    }
                }
            } catch (error) {
                console.error("Error checking for duplicate quotation ID:", error);
                window.electronAPI.showAlert1("Error verifying Quotation ID. Please try again.");
                return false;
            }
        }

        if (!projectName.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Project Name.");
            projectName.focus();
            return false;
        }
        if (!quoteDate.value) {
            window.electronAPI.showAlert1("Please select a Quotation Date.");
            quoteDate.focus();
            return false;
        }
    }

    if (currentStep === 2) {
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
            window.electronAPI.showAlert1("Please enter the Address.");
            buyerAddress.focus();
            return false;
        }
        if (!buyerPhone.value.trim()) {
            window.electronAPI.showAlert1("Please enter the Phone Number.");
            buyerPhone.focus();
            return false;
        }
        // Ensure phone is 10 digits
        const phoneClean = buyerPhone.value.replace(/\D/g, '');
        if (!/^\d{10}$/.test(phoneClean)) {
            window.electronAPI.showAlert1("Please enter a valid 10-digit phone number.");
            buyerPhone.focus();
            return false;
        }
        // If email provided, ensure it's valid
        if (buyerEmail && buyerEmail.value.trim()) {
            const emailVal = buyerEmail.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                window.electronAPI.showAlert1("Please enter a valid email address.");
                buyerEmail.focus();
                return false;
            }
        }
    }

    if (currentStep === 3) {
        const itemsContainer = document.getElementById('items-container');
        const itemCards = itemsContainer.querySelectorAll('.item-card');

        if (itemCards.length === 0) {
            window.electronAPI.showAlert1("Please add at least one item to the quotation.");
            return false;
        }

        // Validate individual fields inside the cards
        let isValid = true;
        itemCards.forEach((card, index) => {
            if (!isValid) return; // Stop checking if already failed

            const desc = card.querySelector('.item_name');
            const qty = card.querySelector('.item-field.qty input'); // Quantity
            const price = card.querySelector('.item-field.price input'); // Price

            if (!desc.value.trim()) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Description is required.`);
                desc.focus();
                isValid = false;
            } else if (!qty.value || parseFloat(qty.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Quantity must be greater than 0.`);
                qty.focus();
                isValid = false;
            } else if (!price.value || parseFloat(price.value) < 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Price is required.`);
                price.focus();
                isValid = false;
            }
        });

        if (!isValid) return false;
    }

    return true;
};

// Add input sanitization and constraints for phone field
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('buyer-phone');
    if (phoneInput) {
        // Ensure numeric keyboard on mobile and maxlength
        phoneInput.setAttribute('inputmode', 'numeric');
        phoneInput.setAttribute('maxlength', '10');
        phoneInput.setAttribute('pattern', '[0-9]{10}');

        phoneInput.addEventListener('input', () => {
            // Strip non-digits and limit to 10 characters
            const cleaned = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
        });
    }

    const emailInput = document.getElementById('buyer-email');
    if (emailInput) {
        // Limit length and basic cleanup
        emailInput.setAttribute('maxlength', '254');
        emailInput.addEventListener('input', () => {
            // Trim spaces and remove internal whitespace
            const cleaned = emailInput.value.trim().replace(/\s+/g, '');
            if (emailInput.value !== cleaned) emailInput.value = cleaned;
        });
    }
});

// Expose the function to be called from other scripts
