const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

const electronReload = require('electron-reload');

electronReload(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

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
        icon: path.join(__dirname, 'public','assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
        },
    });
    mainWindow.setMenu(null);
    mainWindow.webContents.openDevTools();

    // Load the Express server in the Electron window
    mainWindow.loadURL('http://localhost:3000');

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
