/**
 * System Information and Database Statistics Component
 */

declare var settingsApi: any;
declare var settingsUtils: any;

class SettingsSystem {
    private systemInfoInterval: any = null;

    init(): void {

        // Initialize auto-update functionality
        this.initAutoUpdate();

        // Load changelog when About section is shown
        this.loadChangelog();
        
        // Start real-time system info updates
        this.startSystemInfoUpdates();

        // Load database stats initially
        this.loadDatabaseStats();

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
                    if (appNameEl) appNameEl.textContent = s.app_name || 'Shresht Systems';
                    
                    const appVersionEl = document.getElementById("app-version");
                    const appVersionBadgeEl = document.getElementById("app-version-badge");
                    const currentVersionEl = document.getElementById("update-current-version");
                    
                    const versionStr = s.app_version || '1.0.0';
                    if (appVersionEl) appVersionEl.textContent = `v${versionStr}`;
                    if (appVersionBadgeEl) appVersionBadgeEl.textContent = `v${versionStr}`;
                    if (currentVersionEl) currentVersionEl.textContent = versionStr;
                    
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

                    const healthUptimeStatusEl = document.getElementById("health-uptime-status");
                    if (healthUptimeStatusEl) healthUptimeStatusEl.textContent = s.uptime || '-';

                    const healthRamStatusEl = document.getElementById("health-ram-status");
                    if (healthRamStatusEl) healthRamStatusEl.textContent = s.app_memory || '-';
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
        // Load initial static data first, which then calls dynamic info
        this.loadSystemInfo();
        this.systemInfoInterval = setInterval(() => this.updateDynamicSystemInfo(), 2000);
    }

    stopSystemInfoUpdates(): void {
        if (this.systemInfoInterval) {
            clearInterval(this.systemInfoInterval);
            this.systemInfoInterval = null;
        }
    }



    async loadChangelog(): Promise<void> {
        const fallbackContainer = document.getElementById('changelog-container');
        const badge = document.getElementById('notes-version-badge');
        const dateEl = document.getElementById('notes-date');
        
        const featuresList = document.getElementById('changelog-features-list');
        const improvementsList = document.getElementById('changelog-improvements-list');
        const bugfixesList = document.getElementById('changelog-bugfixes-list');

        try {
            const result = await (window as any).electronAPI.getChangelog();

            if (!result.success || !result.changelog || !result.changelog.versions) {
                return;
            }

            const versions = result.changelog.versions;
            if (versions.length === 0) return;

            const currentVersion = versions[0];
            
            if (badge) badge.textContent = `v${currentVersion.version}`;
            if (dateEl) dateEl.textContent = settingsUtils.formatChangelogDate(currentVersion.date);

            // Reorganize release notes by type
            const changes = currentVersion.changes || [];
            
            const features = changes.filter((c: any) => c.type === 'feature');
            const improvements = changes.filter((c: any) => c.type === 'improvement');
            const fixes = changes.filter((c: any) => c.type === 'fix' || c.type === 'bugfix');

            if (featuresList) {
                featuresList.innerHTML = features.length > 0 
                    ? features.map((c: any) => `<li class="leading-relaxed py-0.5">${c.description}</li>`).join('')
                    : `<li class="text-slate-400 italic list-none pl-0">No new features in this version.</li>`;
            }

            if (improvementsList) {
                improvementsList.innerHTML = improvements.length > 0 
                    ? improvements.map((c: any) => `<li class="leading-relaxed py-0.5">${c.description}</li>`).join('')
                    : `<li class="text-slate-400 italic list-none pl-0">No improvements in this version.</li>`;
            }

            if (bugfixesList) {
                bugfixesList.innerHTML = fixes.length > 0 
                    ? fixes.map((c: any) => `<li class="leading-relaxed py-0.5">${c.description}</li>`).join('')
                    : `<li class="text-slate-400 italic list-none pl-0">No bug fixes in this version.</li>`;
            }

            // Populate fallback legacy container hidden so no DOM references break
            if (fallbackContainer) {
                fallbackContainer.innerHTML = `<div class="hidden">v${currentVersion.version}</div>`;
            }

        } catch (error) {
            console.error('Failed to load changelog:', error);
        }
    }

    loadDatabaseStats(): void {
        settingsApi.getDatabaseStats()
            .then((data: { success: boolean }) => {
                const healthDbStatus = document.getElementById("health-db-status");
                if (healthDbStatus) {
                    healthDbStatus.textContent = data.success ? "Connected" : "Error";
                }
            })
            .catch((err: any) => {
                console.error('Failed to load database stats:', err);
                const healthDbStatus = document.getElementById("health-db-status");
                if (healthDbStatus) healthDbStatus.textContent = "Error";
            });
    }

    private updateStatus(message: string, type = 'info'): void {
        const statusContainer = document.getElementById('update-status-container');
        const statusIcon = document.getElementById('update-status-icon');
        const statusText = document.getElementById('update-status-text');

        if (!statusContainer || !statusIcon || !statusText) return;

        const configs: Record<string, any> = {
            'info': { icon: 'fa-info-circle', bg: 'bg-blue-50/50', border: 'border-blue-200/50', text: 'text-blue-700', iconColor: 'text-blue-500' },
            'success': { icon: 'fa-check-circle', bg: 'bg-emerald-50/40', border: 'border-emerald-250/30', text: 'text-emerald-700', iconColor: 'text-emerald-600' },
            'warning': { icon: 'fa-exclamation-triangle', bg: 'bg-amber-50/40', border: 'border-amber-250/30', text: 'text-amber-700', iconColor: 'text-amber-600' },
            'error': { icon: 'fa-times-circle', bg: 'bg-rose-50/40', border: 'border-rose-250/30', text: 'text-rose-700', iconColor: 'text-rose-600' },
            'downloading': { icon: 'fa-arrow-down-long', bg: 'bg-purple-50/50', border: 'border-purple-200/40', text: 'text-purple-700', iconColor: 'text-purple-650' }
        };

        const config = configs[type] || configs['info'];

        statusContainer.className = `${config.bg} p-3 rounded-lg border ${config.border} flex items-center gap-2`;
        statusIcon.className = `fas ${config.icon} ${config.iconColor} text-xs`;
        statusText.className = `${config.text} text-[11px] font-semibold`;
        statusText.textContent = message;

        // Also update upper Health Overview panel status
        const healthUpdateStatus = document.getElementById("health-update-status");
        if (healthUpdateStatus) {
            if (type === 'success') {
                healthUpdateStatus.textContent = "Up to Date";
                healthUpdateStatus.className = "text-xs font-semibold text-slate-700";
            } else if (type === 'downloading' || type === 'info' && message.includes('Checking')) {
                healthUpdateStatus.textContent = "Checking...";
                healthUpdateStatus.className = "text-xs font-semibold text-purple-600 animate-pulse";
            } else if (type === 'error' || type === 'warning') {
                healthUpdateStatus.textContent = "Pending Check";
                healthUpdateStatus.className = "text-xs font-semibold text-slate-700";
            } else {
                healthUpdateStatus.textContent = "Update Pending";
                healthUpdateStatus.className = "text-xs font-semibold text-purple-600 font-bold";
            }
        }
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
        if (info.version) {
            html += `<div><strong>Version:</strong> ${info.version}</div>`;
            const latestVerEl = document.getElementById("update-latest-version");
            if (latestVerEl) latestVerEl.textContent = info.version;
        }
        if (info.releaseDate) html += `<div><strong>Date:</strong> ${new Date(info.releaseDate).toLocaleDateString()}</div>`;
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
        checkButton.innerHTML = '<i class="fas fa-spinner fa-spin text-[10px]"></i> Checking...';
        this.updateStatus('Checking for updates...', 'info');
        this.hideUpdateInfo();
        installButton?.classList.add('hidden');

        try {
            const result = await (window as any).electronAPI.checkForUpdates({ allowPrerelease });

            if (result.success) {
                // Event bindings handle further updates
            } else {
                if (result.isDevelopment) {
                    this.updateStatus('Update check bypassed in Dev Mode', 'warning');
                } else {
                    this.updateStatus('Check failed: ' + result.error, 'error');
                }
                checkButton.disabled = false;
                checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
            }
        } catch (error) {
            console.error('Update check error:', error);
            this.updateStatus('Error checking updates', 'error');
            checkButton.disabled = false;
            checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
        }
    }

    private installUpdate(): void {
        this.updateStatus('Restarting to install update...', 'info');
        (window as any).electronAPI.installUpdate();
    }

    private initAutoUpdate(): void {
        const checkButton = document.getElementById('check-updates-button');
        const installButton = document.getElementById('install-update-button');

        checkButton?.addEventListener('click', () => this.checkForUpdates());
        installButton?.addEventListener('click', () => this.installUpdate());

        (window as any).electronAPI.onUpdateAvailable((info: any) => {
            this.updateStatus('A new version is ready for download', 'downloading');
            this.showUpdateInfo(info);
            this.toggleProgressBar(true, 0, 'Starting download...');

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
            }
        });

        (window as any).electronAPI.onUpdateNotAvailable((info: any) => {
            this.updateStatus('Running the latest software version', 'success');
            this.toggleProgressBar(false);
            this.hideUpdateInfo();

            const appVersionBadgeEl = document.getElementById("app-version-badge");
            const latestVerEl = document.getElementById("update-latest-version");
            if (latestVerEl && appVersionBadgeEl) {
                latestVerEl.textContent = appVersionBadgeEl.textContent?.replace('v', '') || '-';
            }

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
            }
        });

        (window as any).electronAPI.onUpdateDownloadProgress((progress: any) => {
            const percent = Math.round(progress.percent);
            const downloaded = (progress.transferred / 1024 / 1024).toFixed(1);
            const total = (progress.total / 1024 / 1024).toFixed(1);

            this.toggleProgressBar(true, percent, `Downloading: ${percent}% (${downloaded}MB / ${total}MB)`);
            this.updateStatus(`Downloading: ${percent}%`, 'downloading');
        });

        (window as any).electronAPI.onUpdateDownloaded((info: any) => {
            this.updateStatus('Update downloaded successfully!', 'success');
            this.toggleProgressBar(false);

            if (installButton) {
                installButton.classList.remove('hidden');
            }

            const latestVerEl = document.getElementById("update-latest-version");
            if (latestVerEl && info.version) {
                latestVerEl.textContent = info.version;
            }

            // Health overview update
            const healthUpdateStatus = document.getElementById("health-update-status");
            if (healthUpdateStatus) {
                healthUpdateStatus.textContent = "Ready to Install";
                healthUpdateStatus.className = "text-xs font-semibold text-emerald-600 font-bold";
            }

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
            }
        });

        (window as any).electronAPI.onUpdateError((error: any) => {
            console.error('Update error:', error);
            this.updateStatus('Error updating: ' + error, 'error');
            this.toggleProgressBar(false);
            this.hideUpdateInfo();

            if (checkButton) {
                (checkButton as HTMLButtonElement).disabled = false;
                checkButton.innerHTML = '<i class="fas fa-arrows-rotate text-[10px]"></i> Check';
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
