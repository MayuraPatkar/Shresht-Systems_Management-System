const { app, BrowserWindow, screen, dialog } = require('electron');
const path = require('path');
const { handlePrintEvent } = require('./printHandler');
const { showAlert } = require('./alertHandler');
const http = require('http');
require('electron-reloader')(module);

let mainWindow;

const checkServerRunning = (callback) => {
    http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
            callback(true);
        } else {
            callback(false);
        }
    }).on('error', (err) => {
        callback(false);
    });
};

const createMainWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        x: 0,
        y: 0,
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'public', 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.setMenu(null);

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadURL('http://localhost:3000')
        .catch(err => {
            console.error(new Date(), "Failed to load URL in mainWindow:", err);
            dialog.showErrorBox('Error', `Failed to load application. Please check if the server is running. Error: ${err.message}`);
            app.quit();
        });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    handlePrintEvent();
    showAlert();
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.on('ready', async () => {
        try {
            require('./server');
            checkServerRunning((isRunning) => {
                if (isRunning) {
                    createMainWindow();
                } else {
                    console.error(new Date(), "Server did not start in time.");
                    dialog.showErrorBox('Error', 'Failed to start application. The server did not start in time.');
                    app.quit();
                }
            });
        } catch (error) {
            console.error(new Date(), "App initialization failed:", error);
            dialog.showErrorBox('Error', `App initialization failed. Error: ${error.message}`);
            app.quit();
        }
    });

    process.on('uncaughtException', (error) => {
        console.error(new Date(), "Unhandled exception in main process:", error);
        dialog.showErrorBox('Error', `Unhandled exception in main process. Error: ${error.message}`);
    });
}