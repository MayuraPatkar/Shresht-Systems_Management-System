/**
 * Type definitions for the exposed Electron API
 */
interface PrintDocOptions {
  content: string;
  mode: string;
  name: string;
}

interface PrintResult {
  success: boolean;
  error?: string;
}

interface UpdateCheckOptions {
  allowPrerelease?: boolean;
}

interface UpdateCheckResult {
  success: boolean;
  updateInfo?: UpdateInfo | null;
  error?: string;
  isDevelopment?: boolean;
}

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | ReleaseNoteInfo[];
}

interface ReleaseNoteInfo {
  version: string;
  note: string;
}

interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface DialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
  message?: string;
  buttonLabel?: string;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

interface OpenDialogResult {
  canceled: boolean;
  filePaths?: string[];
  error?: string;
}

interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

interface MessageBoxResult {
  response: number;
  checkboxChecked: boolean;
}

interface OpenFolderResult {
  success: boolean;
  path?: string;
  message?: string;
}

interface OpenExternalResult {
  success: boolean;
  url?: string;
  message?: string;
}

interface AppConfig {
  version: string;
  environment: string;
  [key: string]: unknown;
}

interface ChangelogResult {
  success: boolean;
  changelog?: unknown;
  error?: string;
}

interface VersionCheckResult {
  success: boolean;
  currentVersion?: string;
  lastSeenVersion?: string | null;
  showChangelog?: boolean;
  error?: string;
}

interface MarkSeenResult {
  success: boolean;
  version?: string;
  error?: string;
}

/**
* Interface for the Electron API exposed to the renderer
*/
interface ElectronAPI {
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