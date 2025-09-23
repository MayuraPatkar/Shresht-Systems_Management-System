const { ipcMain, BrowserWindow } = require("electron");
const path = require('path');

/**
 * Creates a reusable modal alert window.
 * @param {BrowserWindow} parentWindow - The parent window to which the modal will be attached.
 * @param {string} message - The message to display in the alert.
 * @param {string} htmlFile - The path to the HTML file for the alert window's content.
 * @returns {BrowserWindow | null} The created alert window or null if arguments are invalid.
 */
function createAlertWindow(parentWindow, message, htmlFile) {
    // Validate inputs
    if (!parentWindow || parentWindow.isDestroyed()) {
        console.error("Cannot create an alert without a valid parent window.");
        return null;
    }
    if (!message || typeof message !== 'string') {
        console.error("Invalid message provided for alert.");
        return null;
    }

    const alertWindow = new BrowserWindow({
        width: 400,
        height: 200,
        resizable: false,
        frame: false,
        alwaysOnTop: true,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    alertWindow.loadFile(path.join(__dirname, 'public', htmlFile)).catch((err) => {
        console.error(`Failed to load ${htmlFile}:`, err);
    });

    // Send the message after the content has loaded
    alertWindow.webContents.once('did-finish-load', () => {
        alertWindow.webContents.send('set-message', message);
    });

    return alertWindow;
}

// IPC handler for a simple alert (no response needed)
ipcMain.on('show-alert1', (event, message) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    createAlertWindow(parentWindow, message, 'alert/alert1.html');
});

// IPC handler for an alert that expects a response
ipcMain.on('show-alert2', (event, message) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const alertWindow = createAlertWindow(parentWindow, message, "alert/alert2.html");

    // Only proceed if the window was created successfully
    if (alertWindow) {
        ipcMain.once("send-response", (_, response) => {
            if (parentWindow && !parentWindow.isDestroyed()) {
                parentWindow.webContents.send("receive-response", response);
            }
            // Gracefully close the alert window
            if (alertWindow && !alertWindow.isDestroyed()) {
                alertWindow.close();
            }
        });
    }
});