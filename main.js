/**
 * main.js
 * 
 * Main process entry point for the Electron application.
 * 
 * Responsibilities:
 *   - Creates and manages the main application window.
 *   - Sets up logging with daily log rotation and cleanup.
 *   - Integrates with Express backend server.
 *   - Handles IPC events for printing and alert dialogs.
 *   - Configures Electron security and development tools.
 * 
 * Modules Used:
 *   - electron: Core Electron APIs for app, window, and IPC management.
 *   - path: File path utilities.
 *   - electron-log: Logging utility for Electron.
 *   - fs: File system utilities for log management.
 *   - printHandler: Custom module for print event handling.
 *   - alertHandler: Custom module for alert dialogs.
 */

const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const log = require("electron-log");
const fs = require("fs");
const { handlePrintEvent } = require("./printHandler");
require('./alertHandler');


const logDir = path.join(__dirname, "logs");
const maxLogDays = 7; // Maximum number of log files to keep

// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

/**
 * Deletes log files older than the allowed number of days.
 * Keeps only the most recent `maxLogDays` log files.
 */
function cleanOldLogs() {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      log.error("Error reading log directory:", err);
      return;
    }

    const logFiles = files.filter((file) => file.startsWith("main-") && file.endsWith(".log"));

    if (logFiles.length > maxLogDays) {
      logFiles.sort(); // Sort by name (which includes date)
      const filesToDelete = logFiles.slice(0, logFiles.length - maxLogDays);

      filesToDelete.forEach((fileToDelete) => {
        const filePathToDelete = path.join(logDir, fileToDelete);
        fs.unlink(filePathToDelete, (unlinkErr) => {
          if (unlinkErr) {
            log.error(`Error deleting old log file ${fileToDelete}:`, unlinkErr);
          } else {
            log.info(`Deleted old log file: ${fileToDelete}`);
          }
        });
      });
    }
  });
}

// Configure electron-log to use date-based file names
log.transports.file.resolvePathFn = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return path.join(logDir, `main-${year}-${month}-${day}.log`);
};

// Clean up old logs at startup
cleanOldLogs();
log.info("---------------------------***App started***---------------------------");


// Enable hot-reload for development
require("electron-reload")(path.join(__dirname), {
  electron: require(path.join(__dirname, "node_modules", "electron")),
});

let mainWindow; // Reference to the main application window

/**
 * Creates the main application window and sets up event handlers.
 */
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
  // if (process.env.NODE_ENV === "development") {
  //   setTimeout(() => {
  //     mainWindow.webContents.openDevTools();
  //   }, 1000);
  // }

  // Load the frontend (React/HTML app)
  mainWindow.loadURL("http://localhost:3000").catch((err) => {
    log.error("Failed to load frontend:", err);
  });

  // Open DevTools only in development mode
  // setTimeout(() => {
  //   mainWindow.webContents.openDevTools();
  // }, 1000);


  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Setup custom event handlers with mainWindow as parameter
  handlePrintEvent(mainWindow);
}

// Start the application when Electron is ready
app.whenReady().then(() => {
  // Start Express server (ensure `server.js` exists and runs properly)
  try {
    require("./server");
  } catch (err) {
    log.error("Failed to start Express server:", err);
  }

  createWindow();
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    log.info("-------------***All windows closed. Exiting application***-------------");
    app.quit();
  }
});

// Re-create a window in the app when the dock icon is clicked (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});