/**
 * Global TypeScript declarations for the Electron application.
 * 
 * Provides type definitions for global objects and extensions
 * used across the main process, preload scripts, and server.
 */

import { EventEmitter } from 'events';
import { App } from 'electron';

// Extend the NodeJS global object
declare global {
    /**
     * Application path configuration.
     * Set by main.ts during application initialization.
     */
    interface AppPaths {
        /** Path to logs directory */
        logs: string;
        /** Path to user data directory */
        userData: string;
        /** Root application path */
        root: string;
    }

    /**
     * Global namespace extensions for Node.js
     */
    namespace NodeJS {
        interface Global {
            /** Event emitter for server-main process communication (dialogs) */
            dialogEmitter: EventEmitter;
            /** Application paths configuration */
            appPaths: AppPaths;
            /** Current server port (set dynamically) */
            serverPort: number;
        }
    }

    // Also declare as var for direct access
    var dialogEmitter: EventEmitter;
    var appPaths: AppPaths;
    var serverPort: number;
}

/**
 * Extend Electron's App interface for custom properties
 */
declare module 'electron' {
    interface App {
        /** Last seen changelog version (persisted in memory) */
        lastSeenVersion?: string;
    }
}

/**
 * Types for IPC communication between main and renderer processes
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

export interface DialogResult {
    canceled: boolean;
    filePath?: string;
    filePaths?: string[];
    error?: string;
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

export interface VersionInfo {
    success: boolean;
    currentVersion?: string;
    lastSeenVersion?: string | null;
    showChangelog?: boolean;
    error?: string;
}

export interface ChangelogResult {
    success: boolean;
    changelog?: unknown;
    error?: string;
}

export interface MarkSeenResult {
    success: boolean;
    version?: string;
    error?: string;
}

export interface SafeAppConfig {
    version: string;
    environment: string;
    [key: string]: unknown;
}

/**
 * Server startup result
 */
export interface ServerStartResult {
    server: import('http').Server;
    port: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
    status: 'OK' | 'ERROR';
    timestamp: string;
    uptime?: number;
    database?: string;
    memory?: NodeJS.MemoryUsage;
    version?: string;
    port?: number;
    error?: string;
}

// Ensure this is treated as a module
export { };
