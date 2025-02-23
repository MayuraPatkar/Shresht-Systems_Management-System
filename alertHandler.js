const { ipcMain, BrowserWindow } = require("electron");
const path = require('path');

function showAlert(message) {
    if (!message || typeof message !== 'string') {
        return;
    }

    const alertWindow = new BrowserWindow({
        width: 400,
        height: 200,
        resizable: false,
        modal: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Prevent context sharing for security
            nodeIntegration: false, // Disable Node.js integration in renderer
        },
    });

    // Load the alert HTML file
    alertWindow.loadFile(path.join(__dirname, 'public', 'alert.html')).catch((err) => {
        console.error('Failed to load alert.html:', err);
    });

    // Pass the message to the alert window once it is ready
    alertWindow.once('ready-to-show', () => {
        alertWindow.webContents.send('set-message', message);
    });

    // Clean up the window when closed
    alertWindow.on('closed', () => {
        alertWindow.destroy();
    });
}

// Listen for a custom alert trigger
ipcMain.on('show-alert', (_, message) => {
    showAlert(message);
});

module.exports = { showAlert };
