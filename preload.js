const { contextBridge, ipcRenderer } = require("electron");

// Expose a subset of ipcRenderer methods to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    // Trigger print event
    printInvoice: (content) => {
        if (content) {
            ipcRenderer.send("print-invoice", { content });
        } else {
            console.error("No content passed to printInvoice.");
        }
    },

    // Trigger custom alert event
    showAlert: (message) => {
        if (typeof message === "string") {
            ipcRenderer.send("show-alert", message);
        } else {
            console.error("Invalid message passed to showAlert. Expected a string.");
        }
    },

    // Listen for messages from the main process
    receiveMessage: (callback) => {
        if (typeof callback === "function") {
            ipcRenderer.on("set-message", (_, message) => callback(message));
        } else {
            console.error("Invalid callback passed to receiveMessage. Expected a function.");
        }
    },
});
