/**
 * System Information and Database Statistics Component
 */

declare var settingsApi: any;
declare var settingsUtils: any;

class SettingsSystem {
    private systemInfoInterval: any = null;

    init(): void {
        document.getElementById("refresh-stats-button")?.addEventListener("click", () => this.refreshDatabaseStats());

        // Initialize auto-update functionality
        this.initAutoUpdate();

        // Load changelog when About section is shown
        this.loadChangelog();
        
        // Start real-time system info updates
        this.startSystemInfoUpdates();

        // Set up external links
        this.setupExternalLinks();

        // Set up log downloads
        this.setupLogDownloads();
    }

    cleanup(): void {
        this.stopSystemInfoUpdates();
    }

    loadSystemInfo(): void {
        settingsApi.getSystemInfo()
            .then((data: { success: boolean; system: SystemStaticInfo }) => {
                if (data.success && data.system) {
                    const s = data.system;
                    
                    const appNameEl = document.getElementById("app-name");
                    if (appNameEl) appNameEl.textContent = s.app_name || 'Shresht Systems Management';
                    
                    const appVersionEl = document.getElementById("app-version");
                    if (appVersionEl) appVersionEl.textContent = s.app_version || '1.0.0';
                    
                    const nodeVersionEl = document.getElementById("node-version");
                    if (nodeVersionEl) nodeVersionEl.textContent = s.node_version || '-';
                    
                    const platformEl = document.getElementById("platform");
                    if (platformEl) platformEl.textContent = s.platform || '-';
                    
                    const totalMemoryEl = document.getElementById("total-memory");
                    if (totalMemoryEl) totalMemoryEl.textContent = s.total_memory || '-';
                    
                    const archEl = document.getElementById("arch");
                    if (archEl) archEl.textContent = s.arch || '-';
                    
                    // Load dynamic values initially
                    this.updateDynamicSystemInfo();
                }
            })
            .catch((err: any) => {
                console.error('Failed to load system info:', err);
            });
    }

    updateDynamicSystemInfo(): void {
        settingsApi.getSystemInfo()
            .then((data: { success: boolean; system: SystemStaticInfo }) => {
                if (data.success && data.system) {
                    const s = data.system;
                    
                    const freeMemoryEl = document.getElementById("free-memory");
                    if (freeMemoryEl) freeMemoryEl.textContent = s.free_memory || '-';
                    
                    const uptimeEl = document.getElementById("uptime");
                    if (uptimeEl) uptimeEl.textContent = s.uptime || '-';
                }
            })
            .catch((err: any) => {
                console.error('Failed to update dynamic system info:', err);
            });
    }

    startSystemInfoUpdates(): void {
        if (this.systemInfoInterval) {
            clearInterval(this.systemInfoInterval);
        }
        this.systemInfoInterval = setInterval(() => this.updateDynamicSystemInfo(), 1000);
    }

    stopSystemInfoUpdates(): void {
        if (this.systemInfoInterval) {
            clearInterval(this.systemInfoInterval);
            this.systemInfoInterval = null;
        }
    }

    async loadChangelog(): Promise<void> {
        const container = document.getElementById('changelog-container');
        if (!container) return;

        try {
            const result = await (window as any).electronAPI.getChangelog();

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

            const currentVersion = versions[0];
            
            const html = `
                <div class="border rounded-lg border-teal-300 bg-teal-50 p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 rounded-full text-sm font-semibold bg-teal-600 text-white">
                                v${currentVersion.version}
                            </span>
                            <span class="text-xs text-teal-600 font-medium uppercase">Current Version</span>
                        </div>
                        <span class="text-sm text-gray-500">${settingsUtils.formatChangelogDate(currentVersion.date)}</span>
                    </div>
                    
                    <h4 class="font-semibold text-gray-800 mb-3">${currentVersion.title || 'Release'}</h4>
                    
                    <ul class="space-y-2">
                        ${currentVersion.changes.map((change: any) => `
                            <li class="flex items-start gap-2">
                                ${settingsUtils.getChangeTypeIcon(change.type)}
                                <span class="text-gray-700 text-sm flex-1">${change.description}</span>
                                <span class="text-xs px-2 py-0.5 rounded ${settingsUtils.getChangeTypeBadge(change.type)} capitalize flex-shrink-0">${change.type}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;

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

    loadDatabaseStats(): void {
        settingsApi.getDatabaseStats()
            .then((data: { success: boolean; stats: DatabaseStats }) => {
                if (data.success && data.stats) {
                    const s = data.stats;
                    
                    const dbSizeEl = document.getElementById("db-size");
                    if (dbSizeEl) dbSizeEl.textContent = s.database_size_mb + ' MB';
                    
                    const storageSizeEl = document.getElementById("storage-size");
                    if (storageSizeEl) storageSizeEl.textContent = s.storage_size_mb + ' MB';
                    
                    const totalDocsEl = document.getElementById("total-docs");
                    if (totalDocsEl) totalDocsEl.textContent = s.total_documents.toLocaleString();

                    const collections = s.collections || {};
                    
                    const countInvoicesEl = document.getElementById("count-invoices");
                    if (countInvoicesEl) countInvoicesEl.textContent = (collections.invoices || 0).toString();
                    
                    const countQuotationsEl = document.getElementById("count-quotations");
                    if (countQuotationsEl) countQuotationsEl.textContent = (collections.quotations || 0).toString();
                    
                    const countPurchasesEl = document.getElementById("count-purchases");
                    if (countPurchasesEl) countPurchasesEl.textContent = (collections.purchaseorders || 0).toString();
                    
                    const countWaybillsEl = document.getElementById("count-waybills");
                    if (countWaybillsEl) countWaybillsEl.textContent = (collections.waybills || 0).toString();
                    
                    const countStockEl = document.getElementById("count-stock");
                    if (countStockEl) countStockEl.textContent = (collections.stocks || 0).toString();
                    
                    const countServicesEl = document.getElementById("count-services");
                    if (countServicesEl) countServicesEl.textContent = (collections.services || 0).toString();
                    
                    const countEmployeesEl = document.getElementById("count-employees");
                    if (countEmployeesEl) countEmployeesEl.textContent = (collections.employees || 0).toString();
                    
                    const countAttendanceEl = document.getElementById("count-attendence");
                    if (countAttendanceEl) countAttendanceEl.textContent = (collections.attendencebooks || 0).toString();
                }
            })
            .catch((err: any) => {
                console.error('Failed to load database stats:', err);
            });
    }

    private refreshDatabaseStats(): void {
        this.loadDatabaseStats();
        (window as any).electronAPI.showAlert1("Statistics refreshed!");
    }

    private updateStatus(message: string, type = 'info'): void {
        const statusContainer = document.getElementById('update-status-container');
        const statusIcon = document.getElementById('update-status-icon');
        const statusText = document.getElementById('update-status-text');

        if (!statusContainer || !statusIcon || !statusText) return;

        const configs: Record<string, any> = {
            'info': { icon: 'fa-info-circle', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconColor: 'text-blue-600' },
            'success': { icon: 'fa-check-circle', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconColor: 'text-green-600' },
            'warning': { icon: 'fa-exclamation-triangle', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconColor: 'text-yellow-600' },
            'error': { icon: 'fa-times-circle', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-600' },
            'downloading': { icon: 'fa-download', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconColor: 'text-purple-600' }
        };

        const config = configs[type] || configs['info'];

        statusContainer.className = `${config.bg} p-4 rounded-lg border ${config.border}`;
        statusIcon.className = `fas ${config.icon} ${config.iconColor}`;
        statusText.className = `${config.text} font-medium`;
        statusText.textContent = message;
    }

    private toggleProgressBar(show: boolean, percent = 0, text = ''): void {
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

    private showUpdateInfo(info: any): void {
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

    private hideUpdateInfo(): void {
        const container = document.getElementById('update-info');
        if (container) container.classList.add('hidden');
    }

    private async checkForUpdates(): Promise<void> {
        const checkButton = document.getElementById('check-updates-button') as HTMLButtonElement;
        const installButton = document.getElementById('install-update-button');
        const prereleaseCheckbox = document.getElementById('allow-prerelease-checkbox') as HTMLInputElement;

        if (!checkButton) return;

        const allowPrerelease = prereleaseCheckbox ? prereleaseCheckbox.checked : false;

        checkButton.disabled = true;
        checkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking for updates...';
        this.updateStatus('Checking for updates...', 'info');
        this.hideUpdateInfo();
        installButton?.classList.add('hidden');

        try {
            const result = await (window as any).electronAPI.checkForUpdates({ allowPrerelease });

            if (result.success) {
                // Check result will trigger update events via IPC
            } else {
                if (result.isDevelopment) {
                    this.updateStatus('Update checks are only available in packaged builds', 'warning');
                } else {
                    this.updateStatus('Failed to check for updates: ' + result.error, 'error');
                }
                checkButton.disabled = false;
                checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
            }
        } catch (error) {
            console.error('Update check error:', error);
            this.updateStatus('Error checking for updates', 'error');
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
        }
    }

    private installUpdate(): void {
        this.updateStatus('Restarting application to install update...', 'info');
        (window as any).electronAPI.installUpdate();
    }

    private initAutoUpdate(): void {
        const checkButton = document.getElementById('check-updates-button');
        const installButton = document.getElementById('install-update-button');

        checkButton?.addEventListener('click', () => this.checkForUpdates());
        installButton?.addEventListener('click', () => this.installUpdate());

        (window as any).electronAPI.onUpdateAvailable((info: any) => {
            this.updateStatus('A new update is available and is being downloaded...', 'downloading');
            this.showUpdateInfo(info);
            this.toggleProgressBar(true, 0, 'Starting download...');

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
            }
        });

        (window as any).electronAPI.onUpdateNotAvailable((info: any) => {
            this.updateStatus('You are running the latest version!', 'success');
            this.toggleProgressBar(false);
            this.hideUpdateInfo();

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
            }
        });

        (window as any).electronAPI.onUpdateDownloadProgress((progress: any) => {
            const percent = Math.round(progress.percent);
            const downloaded = (progress.transferred / 1024 / 1024).toFixed(2);
            const total = (progress.total / 1024 / 1024).toFixed(2);
            const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);

            this.toggleProgressBar(true, percent, `Downloading: ${downloaded}MB / ${total}MB (${speed}MB/s)`);
            this.updateStatus(`Downloading update: ${percent}% complete`, 'downloading');
        });

        (window as any).electronAPI.onUpdateDownloaded((info: any) => {
            this.updateStatus('Update downloaded successfully! Ready to install.', 'success');
            this.toggleProgressBar(false);

            if (installButton) {
                installButton.classList.remove('hidden');
            }

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
            }
        });

        (window as any).electronAPI.onUpdateError((error: any) => {
            console.error('Update error:', error);
            this.updateStatus('Error during update: ' + error, 'error');
            this.toggleProgressBar(false);
            this.hideUpdateInfo();

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Check for Updates';
            }
        });
    }

    private setupExternalLinks(): void {
        document.querySelectorAll('.external-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const url = link.getAttribute('data-url');
                
                if (!url) {
                    console.error('No URL specified for external link');
                    return;
                }

                try {
                    if ((window as any).electronAPI && (window as any).electronAPI.openExternal) {
                        const result = await (window as any).electronAPI.openExternal(url);
                        if (!result || !result.success) {
                            console.error('Failed to open URL:', result?.message || 'Unknown error');
                            alert('Failed to open link. Please try again.');
                        }
                    } else {
                        console.error('electronAPI.openExternal not available');
                        alert('External links are not available in this environment.');
                    }
                } catch (error: any) {
                    console.error('Error opening external link:', error);
                    alert('Failed to open link: ' + error.message);
                }
            });
        });
    }

    private setupLogDownloads(): void {
        const downloadAppLogsBtn = document.getElementById('download-app-logs-button');
        const downloadErrorLogsBtn = document.getElementById('download-error-logs-button');

        if (downloadAppLogsBtn) {
            downloadAppLogsBtn.addEventListener('click', () => this.downloadLogs('app'));
        }

        if (downloadErrorLogsBtn) {
            downloadErrorLogsBtn.addEventListener('click', () => this.downloadLogs('error'));
        }
    }

    private downloadLogs(type: string): void {
        window.location.href = `/settings/download-logs?type=${type}`;
    }
}

declare var settingsSystem: any;
(window as any).settingsSystem = new SettingsSystem();
