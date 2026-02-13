/**
 * Type definitions for the exposed Electron API
 */
export interface PrintDocOptions {
  content: string;
  mode: string;
  name: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface UpdateCheckOptions {
  allowPrerelease?: boolean;
}

export interface UpdateCheckResult {
  success: boolean;
  updateInfo?: UpdateInfo | null;
  error?: string;
  isDevelopment?: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | ReleaseNoteInfo[];
}

export interface ReleaseNoteInfo {
  version: string;
  note: string;
}

export interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
  message?: string;
  buttonLabel?: string;
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths?: string[];
  error?: string;
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface MessageBoxResult {
  response: number;
  checkboxChecked: boolean;
}

export interface OpenFolderResult {
  success: boolean;
  path?: string;
  message?: string;
}

export interface OpenExternalResult {
  success: boolean;
  url?: string;
  message?: string;
}

export interface AppConfig {
  version: string;
  environment: string;
  [key: string]: unknown;
}

export interface ChangelogResult {
  success: boolean;
  changelog?: unknown;
  error?: string;
}

export interface VersionCheckResult {
  success: boolean;
  currentVersion?: string;
  lastSeenVersion?: string | null;
  showChangelog?: boolean;
  error?: string;
}

export interface MarkSeenResult {
  success: boolean;
  version?: string;
  error?: string;
}

/**
* Interface for the Electron API exposed to the renderer
*/
export interface ElectronAPI {
  handlePrintEvent: (content: string, mode: string, name: string) => Promise<PrintResult>;
  handlePrintEventQuatation: (content: string, mode: string, name: string) => void;
  showAlert1: (message: string) => void;
  showAlert2: (message: string) => void;
  sendMessage: (message: unknown) => void;
  receiveMessage: (callback: (message: unknown) => void) => void;
  receiveAlertResponse: (callback: (message: unknown) => void) => void;
  checkForUpdates: (options?: UpdateCheckOptions) => Promise<UpdateCheckResult>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: ProgressInfo) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  openFileDialog: (options?: DialogOptions) => Promise<OpenDialogResult>;
  saveFileDialog: (options?: DialogOptions) => Promise<SaveDialogResult>;
  showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResult>;
  openBackupFolder: () => Promise<OpenFolderResult>;
  openExternal: (url: string) => Promise<OpenExternalResult>;
  getAppConfig: () => Promise<AppConfig>;
  getChangelog: () => Promise<ChangelogResult>;
  shouldShowChangelog: () => Promise<VersionCheckResult>;
  markChangelogSeen: () => Promise<MarkSeenResult>;
}