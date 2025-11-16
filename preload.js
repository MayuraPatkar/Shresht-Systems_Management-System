const { contextBridge, ipcRenderer } = require("electron");

// Expose a subset of ipcRenderer methods to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    // Trigger print event
    handlePrintEvent: (content, mode, name) => {
        if (content) {
            ipcRenderer.send("PrintDoc", { content, mode, name });
        } else {
            console.error("No content passed to print.");
        }
    },

    // Trigger print event
    handlePrintEventQuatation: (content, mode, name) => {
        if (content) {
            ipcRenderer.send("PrintQuatation", { content, mode, name });
        } else {
            console.error("No content passed to print.");
        }
    },

    // Trigger custom alert event
    showAlert1: (message) => {
        if (typeof message === "string") {
            ipcRenderer.send("show-alert1", message);
        } else {
            console.error("Invalid message passed to showAlert. Expected a string.");
        }
    },

    showAlert2: (message) => {
        if (typeof message === "string") {
            ipcRenderer.send("show-alert2", message);
        } else {
            console.error("Invalid message passed to showAlert. Expected a string.");
        }
    },

    sendMessage: (message) => ipcRenderer.send("send-response", message),

    // Listen for messages from the main process
    receiveMessage: (callback) => {
        if (typeof callback === "function") {
            ipcRenderer.on("set-message", (_, message) => callback(message));
        } else {
            console.error("Invalid callback passed to receiveMessage. Expected a function.");
        }
    },

    // Listen for messages from the frontend
    receiveAlertResponse: (callback) => {
        ipcRenderer.once("receive-response", (_, message) => {
            callback(message);
        });
    },

    // Auto-updater APIs
    checkForUpdates: () => ipcRenderer.invoke("manual-check-update"),
    installUpdate: () => ipcRenderer.invoke("install-update"),
    
    // Listen for auto-update events
    onUpdateAvailable: (callback) => {
        ipcRenderer.on("update-available", (_, info) => callback(info));
    },
    onUpdateNotAvailable: (callback) => {
        ipcRenderer.on("update-not-available", (_, info) => callback(info));
    },
    onUpdateDownloadProgress: (callback) => {
        ipcRenderer.on("update-download-progress", (_, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on("update-downloaded", (_, info) => callback(info));
    },
    onUpdateError: (callback) => {
        ipcRenderer.on("update-error", (_, error) => callback(error));
    },
});
