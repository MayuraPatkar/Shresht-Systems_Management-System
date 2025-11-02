/**
 * @file System Information and Database Statistics
 * @summary Handles system info display and database statistics
 */

// --- SYSTEM INFORMATION ---

/**
 * Loads system information from the server
 */
function loadSystemInfo() {
    fetch('/settings/system-info')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.system) {
                const s = data.system;
                document.getElementById("app-name").textContent = s.app_name || 'Shresht Systems Management';
                document.getElementById("app-version").textContent = s.app_version || '1.0.0';
                document.getElementById("node-version").textContent = s.node_version || '-';
                document.getElementById("platform").textContent = s.platform || '-';
                document.getElementById("total-memory").textContent = s.total_memory || '-';
                document.getElementById("free-memory").textContent = s.free_memory || '-';
                document.getElementById("arch").textContent = s.arch || '-';
                document.getElementById("uptime").textContent = s.uptime || '-';
            }
        })
        .catch(err => {
            console.error('Failed to load system info:', err);
        });
}

// --- DATABASE STATISTICS ---

/**
 * Loads database statistics from the server
 */
function loadDatabaseStats() {
    fetch('/settings/database/stats')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.stats) {
                const s = data.stats;
                document.getElementById("db-size").textContent = s.database_size_mb + ' MB';
                document.getElementById("storage-size").textContent = s.storage_size_mb + ' MB';
                document.getElementById("total-docs").textContent = s.total_documents.toLocaleString();
                
                // Update collection counts
                const collections = s.collections || {};
                document.getElementById("count-invoices").textContent = collections.invoices || 0;
                document.getElementById("count-quotations").textContent = collections.quotations || 0;
                document.getElementById("count-purchases").textContent = collections.purchaseorders || 0;
                document.getElementById("count-waybills").textContent = collections.waybills || 0;
                document.getElementById("count-stock").textContent = collections.stocks || 0;
                document.getElementById("count-services").textContent = collections.services || 0;
                document.getElementById("count-employees").textContent = collections.employees || 0;
                document.getElementById("count-attendence").textContent = collections.attendencebooks || 0;
            }
        })
        .catch(err => {
            console.error('Failed to load database stats:', err);
        });
}

/**
 * Refreshes database statistics
 */
function refreshDatabaseStats() {
    loadDatabaseStats();
    window.electronAPI.showAlert1("Statistics refreshed!");
}

// --- EVENT LISTENERS ---

/**
 * Initialize system module event listeners
 */
function initSystemModule() {
    document.getElementById("refresh-stats-button")?.addEventListener("click", refreshDatabaseStats);
}
