/**
 * Document Management Utilities
 * Common CRUD operations for document modules (quotation, invoice, purchaseOrder, wayBill)
 */

/**
 * Generic delete function for documents
 * @param {string} endpoint - API endpoint (e.g., 'quotation', 'invoice', 'purchaseOrder', 'wayBill')
 * @param {string} documentId - Document ID to delete
 * @param {string} documentType - Document type for messages (e.g., 'Quotation', 'Invoice')
 * @param {Function} reloadCallback - Callback function to reload the list after deletion
 */
async function deleteDocument(endpoint, documentId, documentType, reloadCallback) {
    try {
        const response = await fetch(`/${endpoint}/${documentId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Failed to delete ${documentType.toLowerCase()}`);
        }

        window.electronAPI.showAlert1(`${documentType} deleted successfully`);
        if (reloadCallback && typeof reloadCallback === 'function') {
            reloadCallback();
        }
    } catch (error) {
        console.error(`Error deleting ${documentType.toLowerCase()}:`, error);
        window.electronAPI.showAlert1(`Failed to delete ${documentType.toLowerCase()}. Please try again later.`);
    }
}

/**
 * Generic search function for documents
 * @param {string} endpoint - API endpoint (e.g., 'quotation', 'invoice')
 * @param {string} query - Search query
 * @param {HTMLElement} resultsContainer - Container element to display results
 * @param {Function} cardCreator - Function to create card for each result
 * @param {string} noResultsMessage - Message to show when no results found
 */
async function searchDocuments(endpoint, query, resultsContainer, cardCreator, noResultsMessage = "No results found") {
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/${endpoint}/search/${query}`);
        if (!response.ok) {
            resultsContainer.innerHTML = `<h1>${noResultsMessage}</h1>`;
            return;
        }

        const data = await response.json();
        const documents = data[endpoint] || data[`${endpoint}s`] || data.invoices || data.quotation || data.purchaseOrder || [];
        
        resultsContainer.innerHTML = "";
        
        if (Array.isArray(documents)) {
            documents.forEach(doc => {
                const card = cardCreator(doc);
                resultsContainer.appendChild(card);
            });
        }
        
        if (resultsContainer.innerHTML === "") {
            resultsContainer.innerHTML = `<h1>${noResultsMessage}</h1>`;
        }
    } catch (error) {
        console.error(`Error searching ${endpoint}:`, error);
        window.electronAPI.showAlert1(`Failed to search ${endpoint}. Please try again later.`);
    }
}

/**
 * Generic function to show new document form
 * @param {Object} options - Configuration options
 * @param {string} options.homeId - ID of home section element
 * @param {string} options.formId - ID of form section element
 * @param {string} options.newButtonId - ID of new button to hide
 * @param {string} options.previewButtonId - ID of preview button to show (optional)
 * @param {string} options.viewId - ID of view section to hide (optional)
 * @param {string} options.stepIndicatorId - ID of step indicator element (optional)
 * @param {number} options.currentStep - Current step number (optional)
 * @param {number} options.totalSteps - Total steps (optional)
 * @param {Function} options.additionalSetup - Additional setup function (optional)
 */
function showNewDocumentForm(options) {
    const {
        homeId = 'home',
        formId = 'new',
        newButtonId,
        previewButtonId,
        viewId = 'view',
        stepIndicatorId = 'step-indicator',
        currentStep,
        totalSteps,
        additionalSetup
    } = options;

    // Toggle visibility
    const homeElement = document.getElementById(homeId);
    const formElement = document.getElementById(formId);
    const viewElement = document.getElementById(viewId);
    
    if (homeElement) homeElement.style.display = 'none';
    if (formElement) formElement.style.display = 'block';
    if (viewElement) viewElement.style.display = 'none';

    // Toggle buttons
    if (newButtonId) {
        const newButton = document.getElementById(newButtonId);
        if (newButton) newButton.style.display = 'none';
    }
    
    if (previewButtonId) {
        const previewButton = document.getElementById(previewButtonId);
        if (previewButton) previewButton.style.display = 'block';
    }

    // Update step indicator
    if (stepIndicatorId && currentStep && totalSteps) {
        const stepIndicator = document.getElementById(stepIndicatorId);
        if (stepIndicator) {
            stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
        }
    }

    // Run additional setup if provided
    if (additionalSetup && typeof additionalSetup === 'function') {
        additionalSetup();
    }
}

/**
 * Generic function to show home/list view
 * @param {Object} options - Configuration options
 * @param {string} options.homeId - ID of home section element
 * @param {string} options.formId - ID of form section element (optional)
 * @param {string} options.viewId - ID of view section element (optional)
 * @param {Function} options.reloadCallback - Callback to reload list (optional)
 */
function showDocumentList(options) {
    const {
        homeId = 'home',
        formId = 'new',
        viewId = 'view',
        reloadCallback
    } = options;

    const homeElement = document.getElementById(homeId);
    const formElement = document.getElementById(formId);
    const viewElement = document.getElementById(viewId);
    
    if (homeElement) homeElement.style.display = 'block';
    if (formElement) formElement.style.display = 'none';
    if (viewElement) viewElement.style.display = 'none';

    if (reloadCallback && typeof reloadCallback === 'function') {
        reloadCallback();
    }
}

/**
 * Extract items from table for form submission
 * @param {string} tableSelector - CSS selector for the items table
 * @param {Array} columnSelectors - Array of objects defining columns: {selector: string, key: string, type: 'text'|'number'}
 * @returns {Array} Array of item objects
 */
function extractTableItems(tableSelector, columnSelectors) {
    const rows = document.querySelectorAll(`${tableSelector} tbody tr`);
    return Array.from(rows).map(row => {
        const item = {};
        columnSelectors.forEach((col, index) => {
            const cellSelector = col.selector || `td:nth-child(${index + 1}) input`;
            const cell = row.querySelector(cellSelector);
            
            if (cell) {
                const value = cell.value || cell.textContent;
                item[col.key] = col.type === 'number' ? (Number(value) || 0) : value;
            }
        });
        return item;
    });
}

/**
 * Create a generic action handler for dropdown selects in document cards
 * @param {string} documentId - Document ID
 * @param {Object} actions - Object mapping action values to handler functions
 * @param {HTMLSelectElement} selectElement - The select element
 */
function handleDocumentAction(documentId, actions, selectElement) {
    const action = selectElement.value;
    
    if (actions[action] && typeof actions[action] === 'function') {
        actions[action](documentId);
    }
    
    // Reset select to default
    selectElement.selectedIndex = 0;
}

/**
 * Generic function to send document data to server
 * @param {string} endpoint - API endpoint (e.g., '/quotation/save-quotation', '/invoice/save-invoice')
 * @param {Object} data - Document data to send
 * @param {string} successMessage - Success message to display (optional)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function sendDocumentToServer(endpoint, data, successMessage = null) {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
            return false;
        }
        
        if (successMessage) {
            window.electronAPI.showAlert1(successMessage);
        }
        
        return true;
    } catch (error) {
        console.error("Error sending document to server:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
        return false;
    }
}

/**
 * Generic function to fetch document by ID
 * @param {string} endpoint - API endpoint (e.g., '/quotation', '/invoice')
 * @param {string} documentId - Document ID to fetch
 * @returns {Promise<Object|null>} Document data or null if failed
 */
async function fetchDocumentById(endpoint, documentId) {
    try {
        const response = await fetch(`/${endpoint}/${documentId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        window.electronAPI.showAlert1(`Failed to fetch ${endpoint}. Please try again later.`);
        return null;
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.deleteDocument = deleteDocument;
    window.searchDocuments = searchDocuments;
    window.showNewDocumentForm = showNewDocumentForm;
    window.showDocumentList = showDocumentList;
    window.extractTableItems = extractTableItems;
    window.handleDocumentAction = handleDocumentAction;
    window.sendDocumentToServer = sendDocumentToServer;
    window.fetchDocumentById = fetchDocumentById;
}
