/**
 * Port Finder Utility
 * 
 * Handles automatic port detection and persistence for the Express server.
 * - Checks if a port is available before binding
 * - Remembers last successful port for faster startup
 * - Auto-detects available port if preferred port is in use
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Cache file location (in project root)
const PORT_CACHE_FILE = path.join(__dirname, '../../.port-cache');

/**
 * Check if a port is available for binding
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is available
 */
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(true);
            });
        });

        server.listen(port, '127.0.0.1');
    });
}

/**
 * Get the last successfully used port from cache
 * @returns {number|null} - Cached port number or null if not found
 */
function getLastUsedPort() {
    try {
        if (fs.existsSync(PORT_CACHE_FILE)) {
            const data = fs.readFileSync(PORT_CACHE_FILE, 'utf8').trim();
            const port = parseInt(data, 10);
            if (!isNaN(port) && port > 0 && port < 65536) {
                return port;
            }
        }
    } catch (err) {
        // Ignore read errors, will use default
    }
    return null;
}

/**
 * Save the successfully used port to cache
 * @param {number} port - Port number to cache
 */
function saveLastUsedPort(port) {
    try {
        fs.writeFileSync(PORT_CACHE_FILE, String(port), 'utf8');
    } catch (err) {
        // Ignore write errors, non-critical
        logger.warn('Could not cache port:', err.message);
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
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.defaultPort - Default port to start with (default: 3000)
 * @param {number} options.maxRetries - Maximum ports to try (default: 10)
 * @param {boolean} options.useCache - Whether to use port caching (default: true)
 * @param {Object} options.logger - Logger instance for output
 * @returns {Promise<{port: number, source: string}>} - Available port and its source
 */
async function findAvailablePort(options = {}) {
    const {
        defaultPort = 3000,
        maxRetries = 10,
        useCache = true,
        logger: customLogger = logger
    } = options;

    const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
    const cachedPort = useCache ? getLastUsedPort() : null;

    // Try ports in priority order
    const portsToTry = [];

    // Priority 1: Environment variable
    if (envPort && !isNaN(envPort)) {
        portsToTry.push({ port: envPort, source: 'environment variable (PORT)' });
    }

    // Priority 2: Cached port (if different from env)
    if (cachedPort && cachedPort !== envPort) {
        portsToTry.push({ port: cachedPort, source: 'cached (last successful)' });
    }

    // Priority 3: Default port (if different from above)
    if (defaultPort !== envPort && defaultPort !== cachedPort) {
        portsToTry.push({ port: defaultPort, source: 'default' });
    }

    // Try priority ports first
    for (const { port, source } of portsToTry) {
        if (await isPortAvailable(port)) {
            if (useCache) saveLastUsedPort(port);
            return { port, source };
        } else {
            logger.warn(`Port ${port} is in use (${source})`);
        }
    }

    // Priority 4: Auto-detect starting from default port
    const startPort = defaultPort;
    logger.info(`Searching for available port starting from ${startPort}...`);

    for (let i = 0; i < maxRetries; i++) {
        const port = startPort + i;

        // Skip if already tried
        if (portsToTry.some(p => p.port === port)) continue;

        if (await isPortAvailable(port)) {
            logger.info(`✓ Found available port: ${port} (auto-detected)`);
            if (useCache) saveLastUsedPort(port);
            return { port, source: 'auto-detected' };
        } else {
            logger.warn(`✗ Port ${port} is in use`);
        }
    }

    // All ports exhausted
    const error = new Error(
        `No available ports found. Tried ports ${startPort}-${startPort + maxRetries - 1}. ` +
        `Please close other applications or set a custom PORT in your .env file.`
    );
    error.code = 'ENOPORTS';
    throw error;
}

/**
 * Print a startup banner with server information
 * @param {Object} options - Banner options
 * @param {number} options.port - Server port
 * @param {string} options.source - Port source description
 * @param {string} options.appName - Application name
 * @param {string} options.appVersion - Application version
 * @param {Object} options.logger - Logger instance
 */
function printStartupBanner(options = {}) {
    const {
        port,
        source,
        appName = 'Server',
        appVersion = '',
        logger = console
    } = options;

    const url = `http://localhost:${port}`;
    const versionStr = appVersion ? ` v${appVersion}` : '';

    logger.info(`${appName}${versionStr} running on ${url} (port source: ${source})`);
}

module.exports = {
    isPortAvailable,
    getLastUsedPort,
    saveLastUsedPort,
    findAvailablePort,
    printStartupBanner
};
