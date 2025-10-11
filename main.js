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

const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");
const log = require("electron-log");
const fs = require("fs");
const { handlePrintEvent } = require("./printHandler");
require('./alertHandler');

// Security: Prevent new window creation from renderer
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    log.warn(`Blocked new window creation: ${navigationUrl}`);
  });
});

// Enable additional security measures
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-dev-shm-usage');

// Set secure defaults
app.setAsDefaultProtocolClient('shresht-systems');


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
async function cleanOldLogs() {
  try {
    const files = await fs.promises.readdir(logDir);
    const logFiles = files
      .filter((file) => file.startsWith("main-") && file.endsWith(".log"))
      .map(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        return { name: file, path: filePath, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time (newest first)

    if (logFiles.length > maxLogDays) {
      const filesToDelete = logFiles.slice(maxLogDays);
      
      const deletePromises = filesToDelete.map(async (fileInfo) => {
        try {
          await fs.promises.unlink(fileInfo.path);
          log.info(`Deleted old log file: ${fileInfo.name}`);
        } catch (unlinkErr) {
          log.error(`Error deleting old log file ${fileInfo.name}:`, unlinkErr);
        }
      });

      await Promise.all(deletePromises);
      log.info(`Cleaned up ${filesToDelete.length} old log files`);
    }
  } catch (err) {
    log.error("Error cleaning old logs:", err);
  }
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
cleanOldLogs().catch(err => log.error("Failed to clean old logs:", err));
log.info("---------------------------***App started***---------------------------");


// Enable hot-reload for development only
if (process.env.NODE_ENV === "development") {
  try {
    require("electron-reload")(path.join(__dirname), {
      electron: require(path.join(__dirname, "node_modules", "electron")),
      hardResetMethod: 'exit'
    });
  } catch (err) {
    log.warn("electron-reload not available:", err.message);
  }
}

let mainWindow; // Reference to the main application window

/**
 * Creates the main application window and sets up event handlers.
 */
async function createWindow() {
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
      width: Math.min(width, 1920), // Cap width for very large displays
      height: Math.min(height, 1080), // Cap height for very large displays
      minWidth: 1024,
      minHeight: 768,
      x: 0,
      y: 0,
      show: false, // Don't show until ready
      autoHideMenuBar: true,
      frame: true,
      icon: path.join(__dirname, "public", "assets", "icon.ico"),
      webPreferences: {
        nodeIntegration: false, // Disabled for better security
        contextIsolation: true, // Ensures safer IPC communication
        enableRemoteModule: false,
        devTools: process.env.NODE_ENV === "development",
        preload: path.join(__dirname, "preload.js"),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
    });

    mainWindow.setMenu(null);

    // Show window when ready to prevent flash
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.maximize();
      
      // Open DevTools only in development mode
      if (process.env.NODE_ENV === "development") {
        setTimeout(() => {
          mainWindow.webContents.openDevTools();
        }, 1000);
      }
    });

    // Enhanced frontend loading with retry logic
    const maxRetries = 5;
    let retries = 0;
    
    const loadFrontend = async () => {
      try {
        await mainWindow.loadURL("http://localhost:3000");
        log.info("Frontend loaded successfully");
      } catch (err) {
        retries++;
        log.warn(`Failed to load frontend (attempt ${retries}/${maxRetries}):`, err.message);
        
        if (retries < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          return loadFrontend();
        } else {
          // Load local error page as fallback
          const errorPage = `data:text/html,
            <html>
              <head><title>Connection Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Unable to Connect to Server</h1>
                <p>The application server is not responding. Please ensure the server is running.</p>
                <button onclick="location.reload()">Retry</button>
              </body>
            </html>`;
          await mainWindow.loadURL(errorPage);
          throw err;
        }
      }
    };

    await loadFrontend();

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    // Handle navigation security
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      // Only allow navigation to localhost and the app's domain
      if (parsedUrl.origin !== 'http://localhost:3000') {
        event.preventDefault();
        log.warn('Blocked navigation to:', navigationUrl);
      }
    });

    // Handle new window requests
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Block popup windows for security
      log.warn('Blocked popup window:', url);
      return { action: 'deny' };
    });

    // Setup custom event handlers with mainWindow as parameter
    handlePrintEvent(mainWindow);
    
    log.info("Main window created successfully");
    
  } catch (error) {
    log.error("Failed to create main window:", error);
    throw error;
  }
}

// Start the application when Electron is ready
app.whenReady().then(async () => {
  // Start Express server with proper error handling
  try {
    const server = require("./server");
    log.info("Express server started successfully");
    
    // Wait a moment for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    createWindow();
  } catch (err) {
    log.error("Failed to start Express server:", err);
    
    // Show error dialog to user
    const { dialog } = require('electron');
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Server Error',
      message: 'Failed to start the backend server',
      detail: 'The application may not function properly. Please check the logs.',
      buttons: ['Continue Anyway', 'Exit'],
      defaultId: 1
    });
    
    if (result.response === 0) {
      createWindow();
    } else {
      app.quit();
      return;
    }
  }
});

// Graceful shutdown handling
let isQuitting = false;

app.on("before-quit", (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    log.info("Application shutting down gracefully...");
    
    // Give time for any pending operations
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
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

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  
  // Don't exit immediately, let the app handle it gracefully
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-error', {
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});