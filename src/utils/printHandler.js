const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * Legacy print handler - kept for backwards compatibility
 * Primary printing is now handled by puppeteerPrintHandler.js
 * This handler is no longer registered for IPC events
 */
function handlePrintEvent(mainWindow) {
    // Legacy handler - IPC handlers are now in puppeteerPrintHandler.js
}

module.exports = { handlePrintEvent };