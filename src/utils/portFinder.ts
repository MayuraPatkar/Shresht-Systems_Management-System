/**
 * Port Finder Utility
 *
 * Handles automatic port detection and persistence for the Express server.
 * - Checks if a port is available before binding
 * - Remembers last successful port for faster startup
 * - Auto-detects available port if preferred port is in use
 */

import net from "net";
import fs from "fs";
import path from "path";
import logger from "./logger";

// Cache file location (in project root)
const PORT_CACHE_FILE = path.join(__dirname, "../../.port-cache");

interface PortResult {
    port: number;
    source: string;
}

interface FindPortOptions {
    defaultPort?: number;
    maxRetries?: number;
    useCache?: boolean;
    logger?: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
}

interface StartupBannerOptions {
    port: number;
    source: string;
    appName?: string;
    appVersion?: string;
    logger?: { info: (...args: unknown[]) => void };
}

/**
 * Check if a port is available for binding
 */
export function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once("error", () => {
            resolve(false);
        });

        server.once("listening", () => {
            server.close(() => {
                resolve(true);
            });
        });

        server.listen(port, "127.0.0.1");
    });
}

/**
 * Get the last successfully used port from cache
 */
export function getLastUsedPort(): number | null {
    try {
        if (fs.existsSync(PORT_CACHE_FILE)) {
            const data = fs.readFileSync(PORT_CACHE_FILE, "utf8").trim();
            const port = parseInt(data, 10);
            if (!isNaN(port) && port > 0 && port < 65536) {
                return port;
            }
        }
    } catch {
        // Ignore read errors, will use default
    }
    return null;
}

/**
 * Save the successfully used port to cache
 */
export function saveLastUsedPort(port: number): void {
    try {
        fs.writeFileSync(PORT_CACHE_FILE, String(port), "utf8");
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("Could not cache port:", message);
    }
}

/**
 * Find an available port with intelligent fallback
 *
 * Priority order:
 * 1. Environment variable PORT (if set and available)
 * 2. Last cached port (if available)
 * 3. Default port (if available)
 * 4. Auto-detect next available port (default + 1, +2, etc.)
 */
export async function findAvailablePort(options: FindPortOptions = {}): Promise<PortResult> {
    const {
        defaultPort = 3000,
        maxRetries = 10,
        useCache = true,
        logger: customLogger = logger,
    } = options;

    const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
    const cachedPort = useCache ? getLastUsedPort() : null;

    // Try ports in priority order
    const portsToTry: PortResult[] = [];

    // Priority 1: Environment variable
    if (envPort && !isNaN(envPort)) {
        portsToTry.push({ port: envPort, source: "environment variable (PORT)" });
    }

    // Priority 2: Cached port (if different from env)
    if (cachedPort && cachedPort !== envPort) {
        portsToTry.push({ port: cachedPort, source: "cached (last successful)" });
    }

    // Priority 3: Default port (if different from above)
    if (defaultPort !== envPort && defaultPort !== cachedPort) {
        portsToTry.push({ port: defaultPort, source: "default" });
    }

    // Try priority ports first
    for (const { port, source } of portsToTry) {
        if (await isPortAvailable(port)) {
            if (useCache) saveLastUsedPort(port);
            return { port, source };
        } else {
            customLogger.warn(`Port ${port} is in use (${source})`);
        }
    }

    // Priority 4: Auto-detect starting from default port
    const startPort = defaultPort;
    customLogger.info(`Searching for available port starting from ${startPort}...`);

    for (let i = 0; i < maxRetries; i++) {
        const port = startPort + i;

        // Skip if already tried
        if (portsToTry.some((p) => p.port === port)) continue;

        if (await isPortAvailable(port)) {
            customLogger.info(`✓ Found available port: ${port} (auto-detected)`);
            if (useCache) saveLastUsedPort(port);
            return { port, source: "auto-detected" };
        } else {
            customLogger.warn(`✗ Port ${port} is in use`);
        }
    }

    // All ports exhausted
    const error: Error & { code?: string } = new Error(
        `No available ports found. Tried ports ${startPort}-${startPort + maxRetries - 1}. ` +
        `Please close other applications or set a custom PORT in your .env file.`
    );
    error.code = "ENOPORTS";
    throw error;
}

/**
 * Print a startup banner with server information
 */
export function printStartupBanner(options: StartupBannerOptions): void {
    const {
        port,
        source,
        appName = "Server",
        appVersion = "",
        logger: bannerLogger = console,
    } = options;

    const url = `http://localhost:${port}`;
    const versionStr = appVersion ? ` v${appVersion}` : "";

    bannerLogger.info(`${appName}${versionStr} running on ${url} (port source: ${source})`);
}
