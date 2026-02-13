/**
 * preload.ts
 * 
 * Preload script for the Electron application.
 * Exposes a safe subset of Electron APIs to the renderer process
 * via the contextBridge.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * Validates that a value is a non-empty string
 * @param value - Value to validate
 * @returns True if valid string
 */
function isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/**
 * Validates that a callback is a function
 * @param callback - Callback to validate
 * @returns True if valid function
 */
function isValidCallback(callback: unknown): callback is Function {
    return typeof callback === 'function';
}

// Expose a subset of ipcRenderer methods to the renderer process
const electronAPI: ElectronAPI = {
    // Print document event
    handlePrintEvent: (content: string, mode: string, name: string): Promise<PrintResult> => {
        if (content) {
            return ipcRenderer.invoke('PrintDoc', { content, mode, name } as PrintDocOptions);
        }
        return Promise.resolve({ success: false, error: 'No content' });
    },

    // Print quotation event (legacy spelling maintained for compatibility)
    handlePrintEventQuatation: (content: string, mode: string, name: string): void => {
        if (content) {
            ipcRenderer.send('PrintQuatation', { content, mode, name } as PrintDocOptions);
        }
    },

    // Trigger custom alert events
    showAlert1: (message: string): void => {
        if (isValidString(message)) {
            ipcRenderer.send('show-alert1', message);
        }
    },

    showAlert2: (message: string): void => {
        if (isValidString(message)) {
            ipcRenderer.send('show-alert2', message);
        }
    },

    sendMessage: (message: unknown): void => {
        ipcRenderer.send('send-response', message);
    },

    // Listen for messages from the main process
    receiveMessage: (callback: (message: unknown) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('set-message', (_event: IpcRendererEvent, message: unknown) => callback(message));
        }
    },

    // Listen for messages from the frontend
    receiveAlertResponse: (callback: (message: unknown) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.once('receive-response', (_event: IpcRendererEvent, message: unknown) => callback(message));
        }
    },

    // Auto-updater APIs
    checkForUpdates: (options?: UpdateCheckOptions): Promise<UpdateCheckResult> => {
        return ipcRenderer.invoke('manual-check-update', options);
    },

    installUpdate: (): Promise<void> => {
        return ipcRenderer.invoke('install-update');
    },

    // Listen for auto-update events
    onUpdateAvailable: (callback: (info: UpdateInfo) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('update-available', (_event: IpcRendererEvent, info: UpdateInfo) => callback(info));
        }
    },

    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('update-not-available', (_event: IpcRendererEvent, info: UpdateInfo) => callback(info));
        }
    },

    onUpdateDownloadProgress: (callback: (progress: ProgressInfo) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('update-download-progress', (_event: IpcRendererEvent, progress: ProgressInfo) => callback(progress));
        }
    },

    onUpdateDownloaded: (callback: (info: UpdateInfo) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('update-downloaded', (_event: IpcRendererEvent, info: UpdateInfo) => callback(info));
        }
    },

    onUpdateError: (callback: (error: string) => void): void => {
        if (isValidCallback(callback)) {
            ipcRenderer.on('update-error', (_event: IpcRendererEvent, error: string) => callback(error));
        }
    },

    // File dialog helpers
    openFileDialog: (options?: DialogOptions): Promise<OpenDialogResult> => {
        return ipcRenderer.invoke('show-open-dialog', options);
    },

    saveFileDialog: (options?: DialogOptions): Promise<SaveDialogResult> => {
        return ipcRenderer.invoke('show-save-dialog', options);
    },

    showMessageBox: (options: MessageBoxOptions): Promise<MessageBoxResult> => {
        return ipcRenderer.invoke('show-message-box', options);
    },

    // Open the configured backup folder in the OS file manager
    openBackupFolder: (): Promise<OpenFolderResult> => {
        return ipcRenderer.invoke('open-backup-folder');
    },

    // Open external URL in default browser
    openExternal: (url: string): Promise<OpenExternalResult> => {
        if (isValidString(url)) {
            return ipcRenderer.invoke('open-external', url);
        }
        return Promise.resolve({ success: false, message: 'Invalid URL' });
    },

    // Get safe app configuration (non-sensitive values only)
    // NEVER expose API tokens or secrets through this!
    getAppConfig: (): Promise<AppConfig> => {
        return ipcRenderer.invoke('get-app-config');
    },

    // Changelog APIs
    getChangelog: (): Promise<ChangelogResult> => {
        return ipcRenderer.invoke('get-changelog');
    },

    shouldShowChangelog: (): Promise<VersionCheckResult> => {
        return ipcRenderer.invoke('should-show-changelog');
    },

    markChangelogSeen: (): Promise<MarkSeenResult> => {
        return ipcRenderer.invoke('mark-changelog-seen');
    },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
