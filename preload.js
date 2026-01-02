const { contextBridge, ipcRenderer } = require("electron");

/**
 * Validates that a value is a non-empty string
 * @param {*} value - Value to validate
 * @returns {boolean} - True if valid string
 */
function isValidString(value) {
    return typeof value === "string" && value.length > 0;
}

/**
 * Validates that a callback is a function
 * @param {*} callback - Callback to validate
 * @returns {boolean} - True if valid function
 */
function isValidCallback(callback) {
    return typeof callback === "function";
}

// Expose a subset of ipcRenderer methods to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    // Print document event
    handlePrintEvent: (content, mode, name) => {
        if (content) {
            return ipcRenderer.invoke("PrintDoc", { content, mode, name });
        }
        return Promise.resolve({ success: false, error: 'No content' });
    },

    // Print quotation event (legacy spelling maintained for compatibility)
    handlePrintEventQuatation: (content, mode, name) => {
        if (content) {
            ipcRenderer.send("PrintQuatation", { content, mode, name });
        }
    },

    // Trigger custom alert events
    showAlert1: (message) => {
        if (isValidString(message)) {
            ipcRenderer.send("show-alert1", message);
        }
    },

    showAlert2: (message) => {
        if (isValidString(message)) {
            ipcRenderer.send("show-alert2", message);
        }
    },

    sendMessage: (message) => ipcRenderer.send("send-response", message),

    // Listen for messages from the main process
    receiveMessage: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("set-message", (_, message) => callback(message));
        }
    },

    // Listen for messages from the frontend
    receiveAlertResponse: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.once("receive-response", (_, message) => callback(message));
        }
    },

    // Auto-updater APIs
    checkForUpdates: (options) => ipcRenderer.invoke("manual-check-update", options),
    installUpdate: () => ipcRenderer.invoke("install-update"),

    // Listen for auto-update events
    onUpdateAvailable: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("update-available", (_, info) => callback(info));
        }
    },
    onUpdateNotAvailable: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("update-not-available", (_, info) => callback(info));
        }
    },
    onUpdateDownloadProgress: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("update-download-progress", (_, progress) => callback(progress));
        }
    },
    onUpdateDownloaded: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("update-downloaded", (_, info) => callback(info));
        }
    },
    onUpdateError: (callback) => {
        if (isValidCallback(callback)) {
            ipcRenderer.on("update-error", (_, error) => callback(error));
        }
    },
    // File dialog helpers
    openFileDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    saveFileDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    // Open the configured backup folder in the OS file manager
    openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),

    // Open external URL in default browser
    openExternal: (url) => {
        if (isValidString(url)) {
            return ipcRenderer.invoke('open-external', url);
        }
        return Promise.resolve({ success: false, error: 'Invalid URL' });
    },

    // Get safe app configuration (non-sensitive values only)
    // NEVER expose API tokens or secrets through this!
    getAppConfig: () => ipcRenderer.invoke('get-app-config'),

    // Changelog APIs
    getChangelog: () => ipcRenderer.invoke('get-changelog'),
    shouldShowChangelog: () => ipcRenderer.invoke('should-show-changelog'),
    markChangelogSeen: () => ipcRenderer.invoke('mark-changelog-seen'),
});
