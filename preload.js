const { contextBridge, ipcRenderer } = require("electron");

// Expose a subset of ipcRenderer methods
contextBridge.exposeInMainWorld("electronAPI", {
    printInvoice: (content) => ipcRenderer.send("print-invoice", { content }),
});
