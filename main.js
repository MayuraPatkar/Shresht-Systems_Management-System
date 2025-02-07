const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { handlePrintEvent } = require('./printHandler');
const { showAlert } = require('./alertHandler');

// To support hot-reloading in development
require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
});

let mainWindow;

app.on('ready', () => {
    // Start Express server
    require('./server');

    // Get primary display dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the Electron BrowserWindow
    mainWindow = new BrowserWindow({
        width,
        height,
        x: 0,
        y: 0,
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'public', 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true, // Enable Node.js integration (optional, ensure security for production)
            preload: path.join(__dirname, 'preload.js'), // Preload script
        },
    });

    // Optionally remove menu bar
    mainWindow.setMenu(null);

    // Open Developer Tools for debugging (comment out in production)
    mainWindow.webContents.openDevTools();

    // Load the Express server in the Electron window
    mainWindow.loadURL('http://localhost:3000');

    // Initialize event handlers
    handlePrintEvent(); // Ensure this function is implemented in `printHandler.js`
    // showAlert(); // Ensure this function is implemented in `alertHandler.js`

    // Handle window close event
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

// Quit the app when all windows are closed (except for Mac)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Re-create the window on macOS when the app is activated
app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

// Helper function to create the main window
function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.loadURL('http://localhost:3000');
}
