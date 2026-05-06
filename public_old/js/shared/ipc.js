/**
 * IPC (Inter-Process Communication) Wrapper
 * Centralized wrapper for Electron API calls
 */

/**
 * Show a simple alert message (alert1)
 * @param {string} message - Message to display
 */
function showAlert(message) {
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        console.warn('Electron API not available, falling back to browser alert');
        alert(message);
    }
}

/**
 * Show a confirmation dialog (alert2)
 * @param {string} message - Message to display
 * @param {Function} callback - Callback function that receives "Yes" or "No"
 */
function showConfirm(message, callback) {
    if (window.electronAPI && window.electronAPI.showAlert2) {
        window.electronAPI.showAlert2(message);
        if (window.electronAPI.receiveAlertResponse) {
            window.electronAPI.receiveAlertResponse(callback);
        }
    } else {
        console.warn('Electron API not available, falling back to browser confirm');
        const result = confirm(message);
        callback(result ? "Yes" : "No");
    }
}

/**
 * Handle print event (print or save as PDF)
 * @param {string} content - HTML content to print
 * @param {string} action - "print" or "savePDF"
 * @param {string} filename - Filename for PDF (optional)
 */
function handlePrint(content, action, filename = 'document') {
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(content, action, filename);
    } else {
        console.error('Electron API not available for printing');
        if (action === 'print') {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.print();
        } else {
            showAlert('PDF save functionality requires Electron environment');
        }
    }
}

/**
 * Send message to main process
 * @param {string} channel - IPC channel name
 * @param {any} data - Data to send
 */
function sendMessage(channel, data) {
    if (window.electronAPI && window.electronAPI[channel]) {
        window.electronAPI[channel](data);
    } else {
        console.warn(`IPC channel '${channel}' not available`);
    }
}

/**
 * Receive message from main process
 * @param {string} channel - IPC channel name
 * @param {Function} callback - Callback function
 */
function receiveMessage(channel, callback) {
    if (window.electronAPI && window.electronAPI[channel]) {
        window.electronAPI[channel](callback);
    } else {
        console.warn(`IPC channel '${channel}' not available`);
    }
}

/**
 * Navigate to a page (handles Electron routing)
 * @param {string} path - Path to navigate to (e.g., '/dashboard', '/invoice')
 */
function navigateTo(path) {
    window.location.href = path;
}

/**
 * Open file dialog
 * @param {Object} options - Dialog options
 * @returns {Promise<string|null>} Selected file path or null
 */
async function openFileDialog(options = {}) {
    if (window.electronAPI && window.electronAPI.openFileDialog) {
        return await window.electronAPI.openFileDialog(options);
    }
    console.warn('File dialog not available in browser environment');
    return null;
}

/**
 * Save file dialog
 * @param {Object} options - Dialog options
 * @returns {Promise<string|null>} Selected file path or null
 */
async function saveFileDialog(options = {}) {
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        return await window.electronAPI.saveFileDialog(options);
    }
    console.warn('Save dialog not available in browser environment');
    return null;
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.showAlert = showAlert;
    window.showConfirm = showConfirm;
    window.handlePrint = handlePrint;
    window.sendMessage = sendMessage;
    window.receiveMessage = receiveMessage;
    window.navigateTo = navigateTo;
    window.openFileDialog = openFileDialog;
    window.saveFileDialog = saveFileDialog;
}
