const { ipcMain, BrowserWindow } = require("electron");
const path = require('path');
const log = require("electron-log");

function createAlertWindow(message, htmlFile, responseHandler) {
    if (!message || typeof message !== 'string') {
        return null;
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
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    log.info(`Loading alert window with file: ${htmlFile}`);
    if (!alertWindow.isDestroyed()) {
        alertWindow.loadFile(path.join(__dirname, 'public', htmlFile)).catch((err) => {
            log.error(`Failed to load ${htmlFile}:`, err);
        });
    }

    alertWindow.once('ready-to-show', () => {
        alertWindow.webContents.send('set-message', message);
        if (responseHandler) {
            responseHandler(alertWindow);
        }
    });

    alertWindow.on('closed', () => {
        alertWindow.destroy();
    });

    return alertWindow;
}

function showAlert1(message) {
    createAlertWindow(message, 'alert1.html', null);
}

function showAlert2(mainWindow, message) {
    const alertWindow = createAlertWindow(message, "alert2.html", (alertWindow) => {
        ipcMain.once("send-response", (_, response) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("receive-response", response);
            }
            // Close alert window
            if (alertWindow && !alertWindow.isDestroyed()) {
                alertWindow.destroy();
            }
        });
    });
}

ipcMain.on('show-alert1', (_, message) => {
    showAlert1(message);
});

ipcMain.on('show-alert2', (_, message) => {
    showAlert2(message);
});

module.exports = { showAlert1, showAlert2 };