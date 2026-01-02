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
 *   - fs: File system utilities for log management.
 *   - printHandler: Custom module for print event handling.
 *   - alertHandler: Custom module for alert dialogs.
 */

// Load environment variables FIRST before any other imports
// In development: loads from .env file
// In production: uses system environment variables
require('./src/utils/envLoader');

const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");
const logger = require("./src/utils/logger");
const fs = require("fs");
const mongoose = require('mongoose');
const { autoUpdater } = require("electron-updater");
const { handlePrintEvent } = require("./src/utils/printHandler");
const { setupQuotationHandlers } = require("./src/utils/quotationPrintHandler");
const autoBackup = require("./src/utils/backup");
require('./src/utils/alertHandler');
const EventEmitter = require("events");

// Create a global event emitter for server-main communication
global.dialogEmitter = new EventEmitter();

// Configure auto-updater logging
// use electron-log for autoUpdater (Winston logger doesn't have electron-log transports)
autoUpdater.autoDownload = true; // Automatically download updates
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

// Pre-release configuration:
// - Default to false (stable releases only)
// - User can enable pre-releases via Settings -> About -> "Include pre-release versions" checkbox
autoUpdater.allowPrerelease = false;

// Auto-updater event listeners
autoUpdater.on('checking-for-update', () => {
  logger.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  logger.info('Update available:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  logger.info('Update not available:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  logger.info(message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info('Update downloaded:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', info);
  }
  // Popup removed - user can restart via in-app restart button in settings
});

autoUpdater.on('error', (error) => {
  logger.error('Auto-updater error:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', error.message);
  }
});

// Security: Prevent new window creation from renderer
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    logger.warn(`Blocked new window creation: ${navigationUrl}`);
  });
});

// Enable additional security measures
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-dev-shm-usage');

// Set secure defaults
app.setAsDefaultProtocolClient('shresht-systems');

// Define paths for data directories based on whether app is packaged
const userDataPath = app.getPath('userData');
const appPath = app.isPackaged ? userDataPath : __dirname;

// Set up directory paths
const logDir = path.join(appPath, "logs");
const backupDir = path.join(appPath, "backups");

// Ensure required directories exist
[logDir, backupDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      logger.error(`Failed to create directory ${dir}:`, err);
    }
  }
});

// Make paths globally available
global.appPaths = {
  logs: logDir,
  backups: backupDir,
  userData: userDataPath,
  root: appPath
};

const maxLogDays = 7; // Maximum number of log files to keep

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
          logger.info(`Deleted old log file: ${fileInfo.name}`);
        } catch (unlinkErr) {
          logger.error(`Error deleting old log file ${fileInfo.name}:`, unlinkErr);
        }
      });

      await Promise.all(deletePromises);
      logger.info(`Cleaned up ${filesToDelete.length} old log files`);
    }
  } catch (err) {
    logger.error("Error cleaning old logs:", err);
  }
}

// Log file naming is handled by the Winston logger in `src/utils/logger`.

// Clean up old logs at startup
cleanOldLogs().catch(err => logger.error("Failed to clean old logs:", err));
logger.info("---------------------------***App started***---------------------------");

let mainWindow; // Reference to the main application window

/**
 * Setup IPC handlers for file dialog operations.
 * These handlers allow the renderer process and server to request file dialogs.
 */
function setupIPCHandlers() {
  // Handle save dialog requests for backup exports
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    } catch (error) {
      logger.error('Error showing save dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Handle open dialog requests for backup imports
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    } catch (error) {
      logger.error('Error showing open dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Handle message box dialogs
  ipcMain.handle('show-message-box', async (event, options) => {
    try {
      const result = await dialog.showMessageBox(mainWindow, options);
      return result;
    } catch (error) {
      logger.error('Error showing message box:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Setup server-to-main communication for dialogs
  global.dialogEmitter.on('show-save-dialog', async (options, callback) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      callback(null, result);
    } catch (error) {
      logger.error('Error showing save dialog from server:', error);
      callback(error, null);
    }
  });

  global.dialogEmitter.on('show-open-dialog', async (options, callback) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      callback(null, result);
    } catch (error) {
      logger.error('Error showing open dialog from server:', error);
      callback(error, null);
    }
  });

  // Handle manual update check requests from renderer
  ipcMain.handle('manual-check-update', async (event, options = {}) => {
    try {
      const allowPrerelease = options.allowPrerelease || false;
      logger.info(`Manual update check requested (allowPrerelease: ${allowPrerelease})`);

      // Check if in development mode (unpacked app)
      if (!app.isPackaged) {
        logger.info('App is not packaged - update check skipped in development mode');
        return {
          success: false,
          error: 'Update checks are only available in production builds. Use "npm run build" to create a packaged version.',
          isDevelopment: true
        };
      }

      // Configure pre-release based on user preference
      autoUpdater.allowPrerelease = allowPrerelease;
      logger.info(`Auto-updater configured: allowPrerelease=${allowPrerelease}`);

      const result = await autoUpdater.checkForUpdates();

      // Handle null result (no updates available or error)
      if (result && result.updateInfo) {
        return { success: true, updateInfo: result.updateInfo };
      } else {
        // Update check completed but result is null (likely no update available)
        // The update-not-available event will be triggered separately
        return { success: true, updateInfo: null };
      }
    } catch (error) {
      logger.error('Manual update check failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle request to open the backup folder in OS file manager
  ipcMain.handle('open-backup-folder', async () => {
    try {
      const { shell } = require('electron');
      let folderPath = global.appPaths && global.appPaths.backups;

      // Try to get custom backup location from settings
      try {
        // Ensure DB is connected
        if (mongoose.connection.readyState === 1) {
          let Settings;
          try {
            Settings = mongoose.model('Settings');
          } catch (e) {
            Settings = require('./src/models/Settings');
          }
          
          const settings = await Settings.findOne();
          if (settings && settings.backup && settings.backup.backup_location) {
            folderPath = settings.backup.backup_location;
          }
        }
      } catch (dbErr) {
        logger.warn('Failed to fetch settings for backup folder:', dbErr);
      }

      if (!folderPath) {
        logger.warn('Backup folder not configured');
        return { success: false, message: 'Backup folder not configured' };
      }

      // Resolve relative paths
      if (!path.isAbsolute(folderPath)) {
        folderPath = path.resolve(global.appPaths.root, folderPath);
      }

      const result = await shell.openPath(folderPath);
      // shell.openPath returns '' on success, or an error string on failure
      if (typeof result === 'string' && result.length > 0) {
        logger.error('Failed to open backup folder:', result);
        return { success: false, message: result };
      }
      return { success: true, path: folderPath };
    } catch (error) {
      logger.error('Error opening backup folder:', error);
      return { success: false, message: error.message };
    }
  });

  // Handle request to open external URL in default browser
  ipcMain.handle('open-external', async (event, url) => {
    try {
      const { shell } = require('electron');
      
      // Validate URL to prevent security issues
      if (!url || typeof url !== 'string') {
        logger.warn('Invalid URL provided to open-external');
        return { success: false, message: 'Invalid URL' };
      }

      // Only allow http and https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        logger.warn('Blocked non-http URL:', url);
        return { success: false, message: 'Only HTTP(S) URLs are allowed' };
      }

      await shell.openExternal(url);
      logger.info('Opened external URL:', url);
      return { success: true, url };
    } catch (error) {
      logger.error('Error opening external URL:', error);
      return { success: false, message: error.message };
    }
  });

  // Handle install update request
  ipcMain.handle('install-update', () => {
    logger.info('Install update requested');
    setImmediate(() => autoUpdater.quitAndInstall());
  });

  // Handle get-app-config request from renderer
  // Returns ONLY safe, non-sensitive configuration values
  ipcMain.handle('get-app-config', () => {
    const { getSafeConfig } = require('./src/utils/envLoader');
    return getSafeConfig();
  });

  // Handle changelog-related IPC requests
  ipcMain.handle('get-changelog', () => {
    try {
      const changelogPath = path.join(__dirname, 'json', 'changelog.json');
      const changelog = require(changelogPath);
      return { success: true, changelog: changelog };
    } catch (error) {
      logger.error('Failed to load changelog:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current app version and check if changelog should be shown
  ipcMain.handle('get-version-info', () => {
    try {
      const packageJson = require('./package.json');
      const currentVersion = packageJson.version;

      // Check last seen version from app settings
      const store = require('electron').app;
      const lastSeenVersion = store.lastSeenVersion || null;

      return {
        success: true,
        currentVersion: currentVersion,
        lastSeenVersion: lastSeenVersion,
        showChangelog: lastSeenVersion !== currentVersion
      };
    } catch (error) {
      logger.error('Failed to get version info:', error);
      return { success: false, error: error.message };
    }
  });

  // Mark changelog as seen for current version
  ipcMain.handle('mark-changelog-seen', () => {
    try {
      const packageJson = require('./package.json');
      const currentVersion = packageJson.version;

      // Store last seen version in app
      const store = require('electron').app;
      store.lastSeenVersion = currentVersion;

      // Also save to a file for persistence across app restarts
      const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
      let settings = {};

      try {
        if (fs.existsSync(settingsPath)) {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
      } catch (e) {
        // Ignore read errors, start fresh
      }

      settings.lastSeenVersion = currentVersion;
      settings.lastSeenAt = new Date().toISOString();

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      logger.info(`Changelog marked as seen for version ${currentVersion}`);
      return { success: true, version: currentVersion };
    } catch (error) {
      logger.error('Failed to mark changelog as seen:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if changelog should be shown (reads from persisted settings)
  ipcMain.handle('should-show-changelog', () => {
    try {
      const packageJson = require('./package.json');
      const currentVersion = packageJson.version;

      const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
      let lastSeenVersion = null;

      try {
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          lastSeenVersion = settings.lastSeenVersion || null;
        }
      } catch (e) {
        // Ignore read errors
      }

      return {
        success: true,
        currentVersion: currentVersion,
        lastSeenVersion: lastSeenVersion,
        showChangelog: lastSeenVersion !== currentVersion
      };
    } catch (error) {
      logger.error('Failed to check changelog status:', error);
      return { success: false, error: error.message, showChangelog: false };
    }
  });

  logger.info("IPC handlers for dialogs and updates registered successfully");
}

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
      //mainWindow.webContents.openDevTools();
    });

    // Enhanced frontend loading with retry logic
    const maxRetries = 5;
    let retries = 0;

    // Get the actual server port (set by app.whenReady)
    const serverPort = global.serverPort || 3000;
    const serverUrl = `http://localhost:${serverPort}`;

    const loadFrontend = async () => {
      try {
        await mainWindow.loadURL(serverUrl);
        logger.info(`Frontend loaded successfully from ${serverUrl}`);
      } catch (err) {
        retries++;
        logger.warn(`Failed to load frontend (attempt ${retries}/${maxRetries})`, { error: err.message });

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
                <p>The application server is not responding on port ${serverPort}.</p>
                <p>Please ensure the server is running.</p>
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
      const allowedOrigin = `http://localhost:${serverPort}`;

      // Only allow navigation to localhost with the correct port
      if (parsedUrl.origin !== allowedOrigin) {
        event.preventDefault();
        logger.warn('Blocked navigation to:', navigationUrl);
      }
    });

    // Handle new window requests
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Block popup windows for security
      logger.warn('Blocked popup window:', url);
      return { action: 'deny' };
    });

    // Setup custom event handlers with mainWindow as parameter
    handlePrintEvent(mainWindow);

    // Setup Native Print handlers for quotations
    setupQuotationHandlers(mainWindow, ipcMain);

    logger.info("Main window created successfully");

  } catch (error) {
    logger.error("Failed to create main window:", error);
    throw error;
  }
}

// Start the application when Electron is ready
app.whenReady().then(async () => {
  // Setup IPC handlers FIRST before anything else loads
  setupIPCHandlers();

  // Start Express server with proper error handling
  try {
    const server = require("./server");

    // Wait for server to be ready and get the actual port
    const { port: actualPort } = await server.serverReady;

    // Store the actual port globally for use in window creation
    global.serverPort = actualPort;

    logger.info(`Express server started successfully on port ${actualPort}`);

    createWindow();

  } catch (err) {
    logger.error("Failed to start Express server:", err);

    // Show error dialog to user with more details
    const { dialog } = require('electron');

    let errorMessage = 'Failed to start the backend server';
    let errorDetail = 'The application may not function properly. Please check the logs.';

    // Check for port-related errors
    if (err.code === 'ENOPORTS') {
      errorMessage = 'No available ports found';
      errorDetail = err.message + '\n\nPlease close other applications or set a custom PORT in your .env file.';
    } else if (err.message && err.message.includes('already in use')) {
      errorMessage = 'Port conflict detected';
      errorDetail = err.message;
    }

    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Server Error',
      message: errorMessage,
      detail: errorDetail,
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

async function performBackupOnClose() {
  try {
    // Ensure DB is connected
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    // Get Settings
    let Settings;
    try {
      Settings = mongoose.model('Settings');
    } catch (e) {
      try {
        Settings = require('./src/models/Settings');
      } catch (err) {
        logger.error('Could not load Settings model for backup:', err);
        return;
      }
    }

    const settings = await Settings.findOne();
    if (!settings || !settings.backup || !settings.backup.auto_backup_enabled) {
      return;
    }

    const { backup_frequency, last_backup } = settings.backup;
    const now = new Date();
    let shouldBackup = false;

    if (backup_frequency === 'on_close') {
      shouldBackup = true;
    } else if (backup_frequency === 'daily') {
      if (!last_backup || (now - new Date(last_backup)) > 20 * 60 * 60 * 1000 || new Date(last_backup).getDate() !== now.getDate()) {
        shouldBackup = true;
      }
    } else if (backup_frequency === 'weekly') {
      if (!last_backup || (now - new Date(last_backup)) > 6 * 24 * 60 * 60 * 1000) {
        shouldBackup = true;
      }
    } else if (backup_frequency === 'monthly') {
      if (!last_backup || (now - new Date(last_backup)) > 28 * 24 * 60 * 60 * 1000) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      logger.info(`Performing on-close backup (Reason: ${backup_frequency})...`);
      
      // Create a small splash window to inform user
      let splash = new BrowserWindow({
        width: 400,
        height: 200,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        skipTaskbar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      
      const htmlContent = `
        <style>
          body { margin: 0; overflow: hidden; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <div id="container" style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fff; border: 2px solid #2563eb; box-sizing: border-box; padding: 20px; text-align: center;">
          <h3 id="title" style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">Backing up data...</h3>
          <div id="message" style="font-size: 14px; color: #4b5563; margin-bottom: 15px;">Please wait, do not close the application.</div>
          <div id="spinner" style="border: 3px solid #f3f3f3; border-top: 3px solid #2563eb; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
        </div>
      `;
      
      splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      try {
        // Wait a moment for window to render
        await new Promise(resolve => setTimeout(resolve, 800));

        await autoBackup();
        
        // Update last_backup
        settings.backup.last_backup = new Date();
        await settings.save();
        logger.info('On-close backup completed successfully');

        // Show success message
        if (!splash.isDestroyed()) {
          await splash.webContents.executeJavaScript(`
            document.getElementById('title').textContent = 'Backup Complete!';
            document.getElementById('title').style.color = '#059669';
            document.getElementById('message').textContent = 'Your data has been safely backed up.';
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('container').style.borderColor = '#059669';
          `);
        }

        // Keep visible for 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        logger.error('On-close backup failed:', err);
        if (!splash.isDestroyed()) {
          try {
            await splash.webContents.executeJavaScript(`
              document.getElementById('title').textContent = 'Backup Failed';
              document.getElementById('title').style.color = '#dc2626';
              document.getElementById('message').textContent = 'Please check logs for details.';
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('container').style.borderColor = '#dc2626';
            `);
          } catch (e) { /* ignore */ }
        }
        // Keep error visible for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
      } finally {
        if (splash && !splash.isDestroyed()) splash.close();
      }
    }
  } catch (error) {
    logger.error('Error in performBackupOnClose:', error);
  }
}

app.on("before-quit", async (event) => {
  if (isQuitting) return;

  event.preventDefault();
  isQuitting = true;
  
  await performBackupOnClose();
  
  app.exit(0);
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.info("---------------------------***App closed***----------------------------");
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
  logger.error('Uncaught Exception:', error);

  // Don't exit immediately, let the app handle it gracefully
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-error', {
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason instanceof Error ? reason.stack : reason);
});