const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");

/**
 * Legacy print handler - kept for backwards compatibility
 * Primary printing is now handled by puppeteerPrintHandler.js
 * This handler is no longer registered for IPC events
 */
function handlePrintEvent(mainWindow) {
    // Log that this handler is loaded but not registering IPC handlers
    // All IPC handlers are now in puppeteerPrintHandler.js for consistent rendering
    log.info("Legacy print handler loaded (IPC handlers delegated to Puppeteer)");
}

module.exports = { handlePrintEvent };