/**
 * Alert Handler (Electron)
 *
 * Creates modal alert windows for displaying messages and
 * collecting user responses via IPC.
 */

import { ipcMain, BrowserWindow } from "electron";
import path from "path";
import logger from "./logger";

/**
 * Creates a reusable modal alert window.
 */
function createAlertWindow(
    parentWindow: BrowserWindow,
    message: string,
    htmlFile: string
): BrowserWindow | null {
    // Validate inputs
    if (!parentWindow || parentWindow.isDestroyed()) {
        logger.error("Cannot create an alert without a valid parent window.");
        return null;
    }
    if (!message || typeof message !== "string") {
        logger.error("Invalid message provided for alert.");
        return null;
    }

    const alertWindow = new BrowserWindow({
        width: 400,
        height: 200,
        resizable: false,
        frame: false,
        alwaysOnTop: true,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, "../../preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    alertWindow.loadFile(path.join(__dirname, "../../public", htmlFile)).catch((err: Error) => {
        logger.error(`Failed to load ${htmlFile}:`, err);
    });

    // Send the message after the content has loaded
    alertWindow.webContents.once("did-finish-load", () => {
        alertWindow.webContents.send("set-message", message);
    });

    return alertWindow;
}

// IPC handler for a simple alert (no response needed)
ipcMain.on("show-alert1", (event, message: string) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (parentWindow) {
        createAlertWindow(parentWindow, message, "alert/alert1.html");
    }
});

// IPC handler for an alert that expects a response
ipcMain.on("show-alert2", (event, message: string) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!parentWindow) return;

    const alertWindow = createAlertWindow(parentWindow, message, "alert/alert2.html");

    if (alertWindow) {
        ipcMain.once("send-response", (_, response: unknown) => {
            if (parentWindow && !parentWindow.isDestroyed()) {
                parentWindow.webContents.send("receive-response", response);
            }
            if (alertWindow && !alertWindow.isDestroyed()) {
                alertWindow.close();
            }
        });
    }
});

export { createAlertWindow };
