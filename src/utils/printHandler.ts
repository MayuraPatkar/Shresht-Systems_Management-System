/**
 * Legacy print handler - kept for backwards compatibility
 * Primary printing is now handled by quotationPrintHandler.ts
 * This handler is no longer registered for IPC events
 */

import type { BrowserWindow } from "electron";

export function handlePrintEvent(_mainWindow: BrowserWindow): void {
    // Legacy handler - IPC handlers are now in quotationPrintHandler.ts
}
