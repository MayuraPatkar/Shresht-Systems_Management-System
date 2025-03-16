const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { handlePrintEvent } = require('./printHandler');
const { showAlert } = require('./alertHandler');

let mainWindow;

app.on('ready', () => {
    // Start Express server
    require('./server');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the Electron window
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'public', 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.setMenu(null);
    mainWindow.maximize();

    // Load the Express server in the Electron window
    mainWindow.loadURL('http://localhost:3000');
    handlePrintEvent(mainWindow);
    showAlert();
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});