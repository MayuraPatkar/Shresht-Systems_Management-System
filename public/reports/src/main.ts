/**
 * Reports Module - Main Orchestrator
 */

declare var reportsApi: any;
declare var reportsUtils: any;
declare function showConfirm(msg: string, cb: (res: string) => void): void;

class ReportsMain {
    currentReportSection: string = 'home';
    currentReportFilter: string = 'all';

    init(): void {
        this.setupReportCards();
        this.setupBackButtons();
        this.setupHomeButton();
        this.loadRecentReports();

        document.getElementById('delete-all-reports')?.addEventListener('click', () => this.deleteAllReports());

        this.setupFilterTabs();
        this.setupKeyboardShortcuts();

        // Check for URL parameter to auto-view a specific report
        const urlParams = new URLSearchParams(window.location.search);
        const viewReportId = urlParams.get('view');
        if (viewReportId) {
            setTimeout(() => {
                this.viewReport(viewReportId);
            }, 100);
        }
    }

    setupFilterTabs(): void {
        const filterTabs = document.querySelectorAll('.report-filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const filter = target.getAttribute('data-filter') || 'all';
                this.setReportFilter(filter);
            });
        });
    }

    setReportFilter(filter: string): void {
        this.currentReportFilter = filter;

        // Update tab styling
        const filterTabs = document.querySelectorAll('.report-filter-tab');
        filterTabs.forEach(tab => {
            if (tab.getAttribute('data-filter') === filter) {
                tab.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
                tab.classList.add('bg-indigo-600', 'text-white');
            } else {
                tab.classList.remove('bg-indigo-600', 'text-white');
                tab.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            }
        });

        // Update delete button text
        this.updateDeleteButtonText();

        // Reload reports
        this.loadRecentReports();
    }

    updateDeleteButtonText(): void {
        const deleteText = document.getElementById('delete-all-text');
        if (!deleteText) return;

        const filterLabels: Record<string, string> = {
            'all': 'Delete All Reports',
            'stock': 'Delete Stock Reports',
            'gst': 'Delete Invoice GST Reports',
            'data_worksheet': 'Delete Worksheets',
            'purchase_gst': 'Delete Purchase GST Reports'
        };

        deleteText.textContent = filterLabels[this.currentReportFilter] || 'Delete All';
    }

    setupReportCards(): void {
        const generateButtons = document.querySelectorAll('.generate-btn');
        generateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = (e.currentTarget as HTMLElement).closest('.report-card');
                if (card) {
                    const reportType = card.getAttribute('data-report') || 'home';
                    this.showReportSection(reportType);
                }
            });
        });
    }

    setupBackButtons(): void {
        document.getElementById('back-to-reports-stock')?.addEventListener('click', () => this.showReportSection('home'));
        document.getElementById('back-to-reports-gst')?.addEventListener('click', () => this.showReportSection('home'));
        document.getElementById('back-to-reports-worksheet')?.addEventListener('click', () => this.showReportSection('home'));
        document.getElementById('back-to-reports-purchase-gst')?.addEventListener('click', () => this.showReportSection('home'));
    }

    setupHomeButton(): void {
        document.getElementById('home-btn')?.addEventListener('click', () => {
            window.location.href = '/reports';
        });
    }

    showReportSection(reportType: string): void {
        // Hide all sections
        const sections = [
            'reports-home',
            'stock-report-section',
            'gst-report-section',
            'data-worksheet-section',
            'purchase-gst-report-section'
        ];

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        let activeSection: HTMLElement | null = null;

        // Show selected section
        switch (reportType) {
            case 'stock':
                activeSection = document.getElementById('stock-report-section');
                if (activeSection) activeSection.style.display = 'block';
                if ((window as any).stockReportComponent) {
                    (window as any).stockReportComponent.init();
                }
                break;
            case 'gst':
                activeSection = document.getElementById('gst-report-section');
                if (activeSection) activeSection.style.display = 'block';
                if ((window as any).gstReportComponent) {
                    (window as any).gstReportComponent.init();
                }
                break;
            case 'dataWorksheet':
            case 'data_worksheet':
                activeSection = document.getElementById('data-worksheet-section');
                if (activeSection) activeSection.style.display = 'block';
                if ((window as any).dataWorksheetReportComponent) {
                    (window as any).dataWorksheetReportComponent.init();
                }
                break;
            case 'purchaseGst':
            case 'purchase_gst':
                activeSection = document.getElementById('purchase-gst-report-section');
                if (activeSection) activeSection.style.display = 'block';
                if ((window as any).purchaseGstReportComponent) {
                    (window as any).purchaseGstReportComponent.init();
                }
                break;
            default:
                const homeEl = document.getElementById('reports-home');
                if (homeEl) homeEl.style.display = 'block';
                this.loadRecentReports();
        }

        if (activeSection) {
            const firstInput = activeSection.querySelector('input, select, textarea') as HTMLElement;
            if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }

        this.currentReportSection = reportType;
    }

    getReportTitle(report: SavedReport): string {
        if (report.report_name) return report.report_name;

        const titles: Record<string, string> = {
            'stock': 'Stock Report',
            'gst': 'Monthly GST Report',
            'data_worksheet': 'Data Worksheet'
        };
        return titles[report.report_type] || 'Report';
    }

    getReportDetails(report: SavedReport): string {
        return '';
    }

    async loadRecentReports(): Promise<void> {
        const container = document.getElementById('recent-reports');
        if (!container) return;

        try {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                    <p class="text-gray-500 mt-2">Loading recent reports...</p>
                </div>
            `;

            const data = await reportsApi.getRecentReports(this.currentReportFilter);

            if (data.success && data.reports && data.reports.length > 0) {
                container.innerHTML = data.reports.map((report: SavedReport) => {
                    const dateObj = new Date(report.generated_at || report.created_at || '');
                    const dateStr = (window as any).formatDateDisplay ? (window as any).formatDateDisplay(dateObj) : dateObj.toLocaleDateString('en-IN');
                    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const reportDetails = this.getReportDetails(report);

                    return `
                    <div class="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 group">
                        <div class="flex items-center gap-5 flex-1">
                            <div class="bg-${this.getReportColor(report.report_type)}-50 p-4 rounded-xl border-2 border-${this.getReportColor(report.report_type)}-100">
                                <i class="fas ${this.getReportIcon(report.report_type)} text-${this.getReportColor(report.report_type)}-600 text-xl"></i>
                            </div>
                            <div class="flex-1">
                                <h4 class="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors mb-2">${this.getReportTitle(report)}</h4>
                                <div class="flex items-center gap-4 text-sm">
                                    ${reportDetails ? `
                                    <div class="flex items-center gap-2 text-gray-700">
                                        <i class="fas fa-filter text-gray-400 text-xs"></i>
                                        <span class="font-medium">${reportDetails}</span>
                                    </div>
                                    <span class="text-gray-300">•</span>
                                    ` : ''}
                                    <div class="flex items-center gap-2 text-gray-500">
                                        <i class="fas fa-calendar-alt text-gray-400 text-xs"></i>
                                        <span>${dateStr}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-gray-500">
                                        <i class="fas fa-clock text-gray-400 text-xs"></i>
                                        <span>${timeStr}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 ml-6">
                            <button class="view-report-btn flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md" data-id="${report._id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="delete-report-btn text-gray-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-all" data-id="${report._id}" title="Delete Report">
                                <i class="fas fa-trash-alt text-base"></i>
                            </button>
                        </div>
                    </div>
                `;
                }).join('');

                container.onclick = (e) => {
                    const target = e.target as HTMLElement;
                    const viewBtn = target.closest('.view-report-btn');
                    const deleteBtn = target.closest('.delete-report-btn');

                    if (viewBtn) {
                        this.viewReport(viewBtn.getAttribute('data-id') || '');
                    } else if (deleteBtn) {
                        this.deleteReport(deleteBtn.getAttribute('data-id') || '');
                    }
                };
            } else {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-file-alt text-4xl text-gray-300 mb-3"></i>
                        <p>No recent reports found</p>
                        <p class="text-sm">Generate a report to see it here</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading recent reports:', error);
            container.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to load recent reports</p>
                    <button id="retry-recent-reports" class="mt-2 text-blue-600 hover:underline">Retry</button>
                </div>
            `;
            document.getElementById('retry-recent-reports')?.addEventListener('click', () => this.loadRecentReports());
        }
    }

    getReportColor(reportType: string): string {
        const colors: Record<string, string> = {
            'stock': 'blue',
            'gst': 'green',
            'data_worksheet': 'purple',
            'purchase_gst': 'orange'
        };
        return colors[reportType] || 'gray';
    }

    getReportIcon(reportType: string): string {
        const icons: Record<string, string> = {
            'stock': 'fa-boxes',
            'gst': 'fa-file-invoice-dollar',
            'data_worksheet': 'fa-solar-panel',
            'purchase_gst': 'fa-shopping-cart'
        };
        return icons[reportType] || 'fa-file-alt';
    }

    async viewReport(reportId: string): Promise<void> {
        try {
            const data = await reportsApi.getReportById(reportId);

            if (data.success && data.report) {
                const report = data.report;
                const type = report.report_type;

                this.showReportSection(type);

                if (type === 'gst' && (window as any).gstReportComponent) {
                    (window as any).gstReportComponent.loadSavedGSTReport(report);
                } else if (type === 'stock' && (window as any).stockReportComponent) {
                    (window as any).stockReportComponent.loadSavedStockReport(report);
                } else if (type === 'data_worksheet' && (window as any).dataWorksheetReportComponent) {
                    (window as any).dataWorksheetReportComponent.loadWorksheet(report);
                } else if (type === 'purchase_gst' && (window as any).purchaseGstReportComponent) {
                    (window as any).purchaseGstReportComponent.loadSavedPurchaseGSTReport(report);
                }
            } else {
                reportsUtils.showNotification('Report not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing report:', error);
            reportsUtils.showNotification('Failed to load report', 'error');
        }
    }

    deleteReport(reportId: string): void {
        showConfirm('Are you sure you want to delete this report?', async (response: string) => {
            if (response === 'Yes') {
                try {
                    const data = await reportsApi.deleteReport(reportId);
                    if (data.success) {
                        reportsUtils.showNotification('Report deleted successfully', 'success');
                        this.loadRecentReports();
                    } else {
                        reportsUtils.showNotification('Failed to delete report', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting report:', error);
                    reportsUtils.showNotification('Failed to delete report', 'error');
                }
            }
        });
    }

    async deleteAllReports(): Promise<void> {
        const filterLabels: Record<string, string> = {
            'all': 'ALL reports',
            'stock': 'all Stock reports',
            'gst': 'all Invoice GST reports',
            'data_worksheet': 'all Worksheet reports',
            'purchase_gst': 'all Purchase GST reports'
        };

        const noReportsLabels: Record<string, string> = {
            'all': 'No reports to delete',
            'stock': 'No Stock reports to delete',
            'gst': 'No Invoice GST reports to delete',
            'data_worksheet': 'No Worksheets to delete',
            'purchase_gst': 'No Purchase GST reports to delete'
        };

        try {
            const checkData = await reportsApi.getRecentReports(this.currentReportFilter);

            if (!checkData.success || !checkData.reports || checkData.reports.length === 0) {
                reportsUtils.showNotification(noReportsLabels[this.currentReportFilter] || 'No reports to delete', 'info');
                return;
            }

            const confirmMessage = `Are you sure you want to delete ${filterLabels[this.currentReportFilter] || 'ALL reports'}? This action cannot be undone.`;

            showConfirm(confirmMessage, async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const data = await reportsApi.deleteAllReports(this.currentReportFilter);

                        if (data.success) {
                            reportsUtils.showNotification(`Successfully deleted ${data.deletedCount} report(s)`, 'success');
                            this.loadRecentReports();
                        } else {
                            reportsUtils.showNotification('Failed to delete reports', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting reports:', error);
                        reportsUtils.showNotification('Failed to delete reports', 'error');
                    }
                }
            });
        } catch (error) {
            console.error('Error checking reports:', error);
            reportsUtils.showNotification('Failed to check reports', 'error');
        }
    }

    setupKeyboardShortcuts(): void {
        document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('keyboardShortcutsModal');
            if (modal) {
                modal.classList.remove('hidden');
                (document.getElementById('closeKeyboardHelpBtn') as HTMLElement)?.focus();
            }
        });

        document.getElementById('closeKeyboardModalBtn')?.addEventListener('click', () => this.closeKeyboardModal());
        document.getElementById('closeKeyboardHelpBtn')?.addEventListener('click', () => this.closeKeyboardModal());

        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('keyboardShortcutsModal');
            const isModalOpen = modal && !modal.classList.contains('hidden');

            if (isModalOpen) {
                if (e.key === 'Escape' || e.key === '?') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeKeyboardModal();
                }
                return;
            }

            const activeTagName = document.activeElement?.tagName || '';
            if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTagName)) {
                e.preventDefault();
                document.getElementById('keyboardShortcutsBtn')?.click();
                return;
            }

            if (e.altKey) {
                if (e.key === '1') {
                    e.preventDefault();
                    this.showReportSection('stock');
                } else if (e.key === '2') {
                    e.preventDefault();
                    this.showReportSection('gst');
                } else if (e.key === '3') {
                    e.preventDefault();
                    this.showReportSection('purchaseGst');
                } else if (e.key === '4') {
                    e.preventDefault();
                    this.showReportSection('dataWorksheet');
                }
                return;
            }

            if (e.key === 'Escape') {
                if (this.currentReportSection !== 'home') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showReportSection('home');
                }
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.triggerAction('generate');
                } else if (e.key === 'p') {
                    e.preventDefault();
                    this.triggerAction('print');
                } else if (e.key === 's') {
                    e.preventDefault();
                    this.triggerAction('save');
                }
            }
        }, true);
    }

    closeKeyboardModal(): void {
        document.getElementById('keyboardShortcutsModal')?.classList.add('hidden');
    }

    triggerAction(action: 'generate' | 'print' | 'save'): void {
        let btnId = '';

        if (this.currentReportSection === 'stock') {
            if (action === 'generate') btnId = 'generate-stock-report';
            else if (action === 'print') btnId = 'print-stock-report';
            else if (action === 'save') btnId = 'save-stock-pdf';
        } else if (this.currentReportSection === 'gst') {
            if (action === 'generate') btnId = 'generate-gst-report';
            else if (action === 'print') btnId = 'print-gst-report';
            else if (action === 'save') btnId = 'save-gst-pdf';
        } else if (this.currentReportSection === 'purchaseGst' || this.currentReportSection === 'purchase_gst') {
            if (action === 'generate') btnId = 'generate-purchase-gst-report';
            else if (action === 'print') btnId = 'print-purchase-gst-report';
            else if (action === 'save') btnId = 'save-purchase-gst-pdf';
        } else if (this.currentReportSection === 'dataWorksheet' || this.currentReportSection === 'data_worksheet') {
            if (action === 'generate') btnId = 'generate-worksheet';
            else if (action === 'print') btnId = 'print-worksheet-report';
            else if (action === 'save') btnId = 'save-worksheet-pdf';
        }

        if (btnId) {
            const btn = document.getElementById(btnId);
            if (btn && btn.offsetParent !== null) {
                btn.click();

                btn.classList.add('ring-4', 'ring-blue-300');
                setTimeout(() => btn.classList.remove('ring-4', 'ring-blue-300'), 200);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const main = new ReportsMain();
    (window as any).reportsMain = main;
    main.init();

    // Map global compatibility triggers to the proper modules
    (window as any).viewReport = (reportId: string) => main.viewReport(reportId);
    (window as any).loadRecentReports = () => main.loadRecentReports();
    (window as any).deleteAllReports = () => main.deleteAllReports();
    (window as any).deleteReport = (reportId: string) => main.deleteReport(reportId);
    (window as any).showReportSection = (reportType: string) => main.showReportSection(reportType);

    // Sub-components triggers mapping
    (window as any).loadSavedGSTReport = (report: any) => (window as any).gstReportComponent?.loadSavedGSTReport(report);
    (window as any).loadSavedPurchaseGSTReport = (report: any) => (window as any).purchaseGstReportComponent?.loadSavedPurchaseGSTReport(report);
    (window as any).loadSavedStockReport = (report: any) => (window as any).stockReportComponent?.loadSavedStockReport(report);
    (window as any).loadWorksheet = (report: any) => (window as any).dataWorksheetReportComponent?.loadWorksheet(report);

    // Initializers mapping
    (window as any).initStockReport = () => (window as any).stockReportComponent?.init();
    (window as any).initGSTReport = () => (window as any).gstReportComponent?.init();
    (window as any).initDataWorksheetReport = () => (window as any).dataWorksheetReportComponent?.init();
    (window as any).initPurchaseGSTReport = () => (window as any).purchaseGstReportComponent?.init();
});
