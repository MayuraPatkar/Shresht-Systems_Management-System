const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { handlePrintEvent } = require('./printHandler');
const { showAlert } = require('./alertHandler');

require('electron-reload')(path.join(__dirname), {
  electron: require(`${__dirname}/node_modules/electron`),
});

let mainWindow;

function createWindow() {
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
      nodeIntegration: true,
      contextIsolation: true, // Recommended for security
      devToolsOpen: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setMenu(null);
  mainWindow.maximize();

  setTimeout(() => {
    mainWindow.webContents.openDevTools();
  }, 1000);


  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup handlers
  handlePrintEvent(mainWindow);
  showAlert();
}

app.on('ready', () => {
  // Start Express server
  require('./server');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});