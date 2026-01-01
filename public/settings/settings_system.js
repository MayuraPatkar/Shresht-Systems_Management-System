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

// --- CHANGELOG DISPLAY ---

/**
 * Gets the icon for a change type
 */
function getChangeTypeIcon(type) {
    const icons = {
        'feature': '<i class="fas fa-star text-yellow-500"></i>',
        'improvement': '<i class="fas fa-arrow-up text-blue-500"></i>',
        'bugfix': '<i class="fas fa-bug text-red-500"></i>',
        'security': '<i class="fas fa-shield-alt text-green-500"></i>',
        'breaking': '<i class="fas fa-exclamation-triangle text-orange-500"></i>'
    };
    return icons[type] || '<i class="fas fa-circle text-gray-400"></i>';
}

/**
 * Gets the badge class for a change type
 */
function getChangeTypeBadge(type) {
    const badges = {
        'feature': 'bg-yellow-100 text-yellow-800',
        'improvement': 'bg-blue-100 text-blue-800',
        'bugfix': 'bg-red-100 text-red-800',
        'security': 'bg-green-100 text-green-800',
        'breaking': 'bg-orange-100 text-orange-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Formats a date string
 */
function formatChangelogDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * Loads and displays the changelog in the About section
 */
async function loadChangelog() {
    const container = document.getElementById('changelog-container');
    if (!container) return;

    try {
        const result = await window.electronAPI.getChangelog();

        if (!result.success || !result.changelog || !result.changelog.versions) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Unable to load changelog</p>
                </div>
            `;
            return;
        }

        const versions = result.changelog.versions;

        if (versions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-info-circle text-2xl mb-2"></i>
                    <p>No release history available</p>
                </div>
            `;
            return;
        }

        let html = '';

        versions.forEach((version, index) => {
            const isLatest = index === 0;

            html += `
                <div class="border rounded-lg ${isLatest ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'} p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 rounded-full text-sm font-semibold ${isLatest ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}">
                                v${version.version}
                            </span>
                            ${isLatest ? '<span class="text-xs text-teal-600 font-medium uppercase">Current</span>' : ''}
                        </div>
                        <span class="text-sm text-gray-500">${formatChangelogDate(version.date)}</span>
                    </div>
                    
                    <h4 class="font-semibold text-gray-800 mb-3">${version.title || 'Release'}</h4>
                    
                    <ul class="space-y-2">
                        ${version.changes.map(change => `
                            <li class="flex items-start gap-2">
                                ${getChangeTypeIcon(change.type)}
                                <span class="text-gray-700 text-sm">${change.description}</span>
                                <span class="text-xs px-2 py-0.5 rounded ${getChangeTypeBadge(change.type)} capitalize">${change.type}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load changelog:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>Error loading changelog</p>
            </div>
        `;
    }
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

    // Load changelog when About section is shown
    loadChangelog();
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
    const prereleaseCheckbox = document.getElementById('allow-prerelease-checkbox');

    if (!checkButton) return;

    // Get pre-release preference from checkbox
    const allowPrerelease = prereleaseCheckbox ? prereleaseCheckbox.checked : false;

    // Disable button and show checking status
    checkButton.disabled = true;
    checkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking for updates...';
    updateStatus('Checking for updates...', 'info');
    hideUpdateInfo();
    installButton?.classList.add('hidden');

    try {
        const result = await window.electronAPI.checkForUpdates({ allowPrerelease });

        if (result.success) {
            // Check result will trigger update events via IPC
        } else {
            // Check if it's development mode
            if (result.isDevelopment) {
                updateStatus('Update checks are only available in packaged builds', 'warning');
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
        const percent = Math.round(progress.percent);
        const downloaded = (progress.transferred / 1024 / 1024).toFixed(2);
        const total = (progress.total / 1024 / 1024).toFixed(2);
        const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);

        toggleProgressBar(true, percent, `Downloading: ${downloaded}MB / ${total}MB (${speed}MB/s)`);
        updateStatus(`Downloading update: ${percent}% complete`, 'downloading');
    });

    window.electronAPI.onUpdateDownloaded((info) => {
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

// --- EXTERNAL LINKS HANDLER ---

/**
 * Sets up external link handlers for opening URLs in default browser
 */
function setupExternalLinks() {
    document.querySelectorAll('.external-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-url');
            
            if (!url) {
                console.error('No URL specified for external link');
                return;
            }

            try {
                if (window.electronAPI && window.electronAPI.openExternal) {
                    const result = await window.electronAPI.openExternal(url);
                    if (!result || !result.success) {
                        console.error('Failed to open URL:', result?.message || 'Unknown error');
                        alert('Failed to open link. Please try again.');
                    }
                } else {
                    console.error('electronAPI.openExternal not available');
                    alert('External links are not available in this environment.');
                }
            } catch (error) {
                console.error('Error opening external link:', error);
                alert('Failed to open link: ' + error.message);
            }
        });
    });
}

// Initialize external links when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExternalLinks);
} else {
    setupExternalLinks();
}
