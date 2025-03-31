const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { handlePrintEvent } = require("./printHandler");
const { showAlert1, showAlert2 } = require("./alertHandler");

require("electron-reload")(path.join(__dirname), {
  electron: require(path.join(__dirname, "node_modules", "electron")),
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
    icon: path.join(__dirname, "public", "assets", "icon.ico"),
    webPreferences: {
      nodeIntegration: false, // Disabled for better security
      contextIsolation: true, // Ensures safer IPC communication
      enableRemoteModule: false,
      devTools: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenu(null);
  mainWindow.maximize();

  // Open DevTools only in development mode
  if (process.env.NODE_ENV === "development") {
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 1000);
  }

  mainWindow.loadURL("http://localhost:3000").catch((err) => {
    console.error("Failed to load frontend:", err);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Setup handlers with mainWindow as parameter
  handlePrintEvent(mainWindow);
  // Pass mainWindow to showAlert2
  ipcMain.on("show-alert2", (_, message) => {
    showAlert2(mainWindow, message);
  });
}

// Start the application
app.whenReady().then(() => {
  // Start Express server (ensure `server.js` exists and runs properly)
  try {
    require("./server");
  } catch (err) {
    console.error("Failed to start Express server:", err);
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
