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
    
    // Initialize auto-update functionality
    initAutoUpdate();
}

// --- AUTO-UPDATE FUNCTIONALITY ---

/**
 * Updates the UI status display
 */
function updateStatus(message, type = 'info') {
    const statusContainer = document.getElementById('update-status-container');
    const statusIcon = document.getElementById('update-status-icon');
    const statusText = document.getElementById('update-status-text');
    
    if (!statusContainer || !statusIcon || !statusText) return;
    
    // Update icon and colors based on type
    const configs = {
        'info': { icon: 'fa-info-circle', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconColor: 'text-blue-600' },
        'success': { icon: 'fa-check-circle', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconColor: 'text-green-600' },
        'warning': { icon: 'fa-exclamation-triangle', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconColor: 'text-yellow-600' },
        'error': { icon: 'fa-times-circle', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-600' },
        'downloading': { icon: 'fa-download', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconColor: 'text-purple-600' }
    };
    
    const config = configs[type] || configs['info'];
    
    // Update classes
    statusContainer.className = `${config.bg} p-4 rounded-lg border ${config.border}`;
    statusIcon.className = `fas ${config.icon} ${config.iconColor}`;
    statusText.className = `${config.text} font-medium`;
    statusText.textContent = message;
}

/**
 * Shows/hides the progress bar
 */
function toggleProgressBar(show, percent = 0, text = '') {
    const container = document.getElementById('update-progress-container');
    const bar = document.getElementById('update-progress-bar');
    const progressText = document.getElementById('update-progress-text');
    
    if (!container || !bar || !progressText) return;
    
    if (show) {
        container.classList.remove('hidden');
        bar.style.width = `${percent}%`;
        progressText.textContent = text;
    } else {
        container.classList.add('hidden');
    }
}

/**
 * Shows update information
 */
function showUpdateInfo(info) {
    const container = document.getElementById('update-info');
    const details = document.getElementById('update-details');
    
    if (!container || !details) return;
    
    container.classList.remove('hidden');
    
    let html = '';
    if (info.version) html += `<div><strong>Version:</strong> ${info.version}</div>`;
    if (info.releaseDate) html += `<div><strong>Release Date:</strong> ${new Date(info.releaseDate).toLocaleDateString()}</div>`;
    if (info.releaseName) html += `<div><strong>Release:</strong> ${info.releaseName}</div>`;
    
    details.innerHTML = html;
}

/**
 * Hides update information
 */
function hideUpdateInfo() {
    const container = document.getElementById('update-info');
    if (container) container.classList.add('hidden');
}

/**
 * Handles the manual update check
 */
async function checkForUpdates() {
    const checkButton = document.getElementById('check-updates-button');
    const installButton = document.getElementById('install-update-button');
    
    if (!checkButton) return;
    
    // Disable button and show checking status
    checkButton.disabled = true;
    checkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking for updates...';
    updateStatus('Checking for updates...', 'info');
    hideUpdateInfo();
    installButton?.classList.add('hidden');
    
    try {
        const result = await window.electronAPI.checkForUpdates();
        
        if (result.success) {
            // Check result will trigger update events via IPC
            console.log('Update check initiated successfully');
        } else {
            // Check if it's development mode
            if (result.isDevelopment) {
                updateStatus('Update checks are only available in packaged builds', 'warning');
                console.log('Development mode detected:', result.error);
            } else {
                updateStatus('Failed to check for updates: ' + result.error, 'error');
            }
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    } catch (error) {
        console.error('Update check error:', error);
        updateStatus('Error checking for updates', 'error');
        checkButton.disabled = false;
        checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
    }
}

/**
 * Handles the install update action
 */
function installUpdate() {
    updateStatus('Restarting application to install update...', 'info');
    window.electronAPI.installUpdate();
}

/**
 * Initialize auto-update event listeners
 */
function initAutoUpdate() {
    const checkButton = document.getElementById('check-updates-button');
    const installButton = document.getElementById('install-update-button');
    
    // Add click handlers
    checkButton?.addEventListener('click', checkForUpdates);
    installButton?.addEventListener('click', installUpdate);
    
    // Listen for update events from main process
    window.electronAPI.onUpdateAvailable((info) => {
        console.log('Update available:', info);
        updateStatus('A new update is available and is being downloaded...', 'downloading');
        showUpdateInfo(info);
        toggleProgressBar(true, 0, 'Starting download...');
        
        // Re-enable check button
        if (checkButton) {
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    });
    
    window.electronAPI.onUpdateNotAvailable((info) => {
        console.log('Update not available:', info);
        updateStatus('You are running the latest version!', 'success');
        toggleProgressBar(false);
        hideUpdateInfo();
        
        // Re-enable check button
        if (checkButton) {
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    });
    
    window.electronAPI.onUpdateDownloadProgress((progress) => {
        console.log('Download progress:', progress);
        const percent = Math.round(progress.percent);
        const downloaded = (progress.transferred / 1024 / 1024).toFixed(2);
        const total = (progress.total / 1024 / 1024).toFixed(2);
        const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);
        
        toggleProgressBar(true, percent, `Downloading: ${downloaded}MB / ${total}MB (${speed}MB/s)`);
        updateStatus(`Downloading update: ${percent}% complete`, 'downloading');
    });
    
    window.electronAPI.onUpdateDownloaded((info) => {
        console.log('Update downloaded:', info);
        updateStatus('Update downloaded successfully! Ready to install.', 'success');
        toggleProgressBar(false);
        
        // Show install button
        if (installButton) {
            installButton.classList.remove('hidden');
        }
        
        // Re-enable check button
        if (checkButton) {
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    });
    
    window.electronAPI.onUpdateError((error) => {
        console.error('Update error:', error);
        updateStatus('Error during update: ' + error, 'error');
        toggleProgressBar(false);
        hideUpdateInfo();
        
        // Re-enable check button
        if (checkButton) {
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    });
}

