/**
 * Stock Report Module Component
 */

declare var reportsApi: any;
declare var reportsUtils: any;
declare var formatDateIndian: any;

class StockReportComponent {
    stockReportData: StockMovement[] = [];
    stockReportInitialized: boolean = false;
    stockReportSummary: StockReportSummary | null = null;

    // Autocomplete State
    stockItems: Array<{ id: string; name: string }> = [];
    selectedItemId: string | null = null;
    selectedSuggestionIndex: number = -1;

    init(): void {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
        if (startDateInput) {
            startDateInput.value = (window as any).formatDateInput ? (window as any).formatDateInput(startDate) : startDate.toISOString().split('T')[0];
        }

        const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
        if (endDateInput) {
            endDateInput.value = (window as any).getTodayForInput ? (window as any).getTodayForInput() : endDate.toISOString().split('T')[0];
        }

        if (!this.stockReportInitialized) {
            document.getElementById('generate-stock-report')?.addEventListener('click', () => this.generateStockReport());
            document.getElementById('clear-stock-filters')?.addEventListener('click', () => this.clearStockFilters());
            document.getElementById('print-stock-report')?.addEventListener('click', () => this.printStockReport());
            document.getElementById('save-stock-pdf')?.addEventListener('click', () => this.saveStockReportPDF());
            this.stockReportInitialized = true;

            this.loadStockItemSuggestions();
            this.setupStockItemAutocomplete();
        }

        this.clearStockFilters();
    }

    clearStockFilters(): void {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
        if (startDateInput) {
            startDateInput.value = (window as any).formatDateInput ? (window as any).formatDateInput(startDate) : startDate.toISOString().split('T')[0];
        }

        const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
        if (endDateInput) {
            endDateInput.value = (window as any).getTodayForInput ? (window as any).getTodayForInput() : endDate.toISOString().split('T')[0];
        }

        const movementTypeInput = document.getElementById('stock-movement-type') as HTMLSelectElement;
        if (movementTypeInput) {
            movementTypeInput.value = 'all';
        }

        const itemFilterInput = document.getElementById('stock-item-filter') as HTMLInputElement;
        if (itemFilterInput) {
            itemFilterInput.value = '';
        }

        this.selectedItemId = null;

        const tbody = document.getElementById('stock-report-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                        <p>Select filters and click "Generate Report" to view data</p>
                    </td>
                </tr>
            `;
        }

        const summaryEl = document.getElementById('stock-report-summary');
        if (summaryEl) summaryEl.style.display = 'none';

        const printBtn = document.getElementById('print-stock-report');
        if (printBtn) printBtn.style.display = 'none';

        const saveBtn = document.getElementById('save-stock-pdf');
        if (saveBtn) saveBtn.style.display = 'none';
    }

    async generateStockReport(): Promise<void> {
        const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
        const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
        const movementTypeInput = document.getElementById('stock-movement-type') as HTMLSelectElement;
        const itemFilterInput = document.getElementById('stock-item-filter') as HTMLInputElement;

        const startDate = startDateInput?.value || '';
        const endDate = endDateInput?.value || '';
        const movementType = movementTypeInput?.value || 'all';
        const itemFilter = itemFilterInput?.value || '';

        const tbody = document.getElementById('stock-report-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                    <p class="text-gray-500 mt-2">Generating report...</p>
                </td>
            </tr>
        `;

        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (movementType && movementType !== 'all') params.append('movement_type', movementType);

            if (this.selectedItemId) {
                params.append('item_id', this.selectedItemId);
            } else if (itemFilter) {
                params.append('item_name', itemFilter);
            }

            const data = await reportsApi.getStockMovements(params);

            if (data.success && data.movements) {
                this.stockReportData = data.movements;

                if (this.stockReportData.length === 0) {
                    reportsUtils.showNotification('No stock movements found for the selected criteria.', 'info');
                    const emptySummary: StockReportSummary = { total_in: 0, total_out: 0, total_adjustments: 0, net_change: 0 };
                    this.stockReportSummary = emptySummary;
                    this.renderStockReport([], emptySummary);
                    return;
                }

                let summary: StockReportSummary = { total_in: 0, total_out: 0, total_adjustments: 0, net_change: 0 };

                if (data.summary) {
                    const inQty = data.summary.in ? (data.summary.in.total_quantity || 0) : 0;
                    const outQty = data.summary.out ? (data.summary.out.total_quantity || 0) : 0;
                    const adjQty = data.summary.adjustment ? (data.summary.adjustment.total_quantity || 0) : 0;

                    summary.total_in = inQty;
                    summary.total_out = Math.abs(outQty);
                    summary.total_adjustments = adjQty;
                    summary.net_change = inQty + outQty + adjQty;
                }

                this.stockReportSummary = summary;
                this.renderStockReport(data.movements, summary);
            } else {
                await this.generateStockReportFromStock(startDate, endDate, movementType, itemFilter);
            }
        } catch (error) {
            console.error('Error generating stock report:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                        <p>Failed to generate report</p>
                        <button id="retry-stock-report" class="mt-2 text-blue-600 hover:underline">Retry</button>
                    </td>
                </tr>
            `;
            document.getElementById('retry-stock-report')?.addEventListener('click', () => this.generateStockReport());
        }
    }

    async generateStockReportFromStock(startDate: string, endDate: string, movementType: string, itemFilter: string): Promise<void> {
        const tbody = document.getElementById('stock-report-body');
        if (!tbody) return;

        try {
            const data = await reportsApi.getAllStock();

            if (data && data.length > 0) {
                let movements: StockMovement[] = data.map((stock: any) => ({
                    timestamp: stock.createdAt || stock.created_at || new Date().toISOString(),
                    item_name: stock.item_name || stock.itemName || 'Unknown Item',
                    movement_type: 'in' as const,
                    quantity_change: stock.quantity || stock.Quantity || 0,
                    reference_type: 'stock',
                    reference_id: stock._id,
                    notes: `Initial stock entry - ${stock.item_id || ''}`
                }));

                if (startDate) {
                    const start = new Date(startDate);
                    movements = movements.filter(m => new Date(m.timestamp) >= start);
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    movements = movements.filter(m => new Date(m.timestamp) <= end);
                }
                if (itemFilter) {
                    const filter = itemFilter.toLowerCase();
                    movements = movements.filter(m => m.item_name.toLowerCase().includes(filter));
                }

                const summary: StockReportSummary = {
                    total_in: movements.reduce((sum, m) => sum + (m.movement_type === 'in' ? m.quantity_change : 0), 0),
                    total_out: movements.reduce((sum, m) => sum + (m.movement_type === 'out' ? Math.abs(m.quantity_change) : 0), 0),
                    total_adjustments: movements.reduce((sum, m) => sum + (m.movement_type === 'adjustment' ? m.quantity_change : 0), 0),
                    net_change: 0
                };
                summary.net_change = summary.total_in - summary.total_out + summary.total_adjustments;

                this.stockReportData = movements;
                this.stockReportSummary = summary;
                this.renderStockReport(movements, summary);
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-gray-500">
                            <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                            <p>No stock data found for the selected criteria</p>
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                        <p>Failed to fetch stock data</p>
                    </td>
                </tr>
            `;
        }
    }

    renderStockReport(movements: StockMovement[], summary: StockReportSummary | null): void {
        const tbody = document.getElementById('stock-report-body');
        if (!tbody) return;

        const visibleMovements = movements ? movements.filter(m => m.movement_type !== 'adjustment') : [];

        if (!visibleMovements || visibleMovements.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No stock movements found for the selected criteria</p>
                    </td>
                </tr>
            `;
            const summaryEl = document.getElementById('stock-report-summary');
            if (summaryEl) summaryEl.style.display = 'none';

            const printBtn = document.getElementById('print-stock-report');
            if (printBtn) printBtn.style.display = 'none';

            const saveBtn = document.getElementById('save-stock-pdf');
            if (saveBtn) saveBtn.style.display = 'none';
            return;
        }

        tbody.innerHTML = visibleMovements.map(movement => {
            const typeClass = movement.movement_type === 'in' ? 'text-green-600' :
                movement.movement_type === 'out' ? 'text-red-600' : 'text-yellow-600';
            const typeIcon = movement.movement_type === 'in' ? 'fa-arrow-down' :
                movement.movement_type === 'out' ? 'fa-arrow-up' : 'fa-exchange-alt';

            let quantityPrefix = '';
            if (movement.movement_type === 'in') quantityPrefix = '+';
            else if (movement.movement_type === 'out') quantityPrefix = '-';

            const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(movement.timestamp) : new Date(movement.timestamp).toLocaleDateString('en-IN');

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 border-b">${formattedDate}</td>
                    <td class="px-4 py-3 border-b font-medium">${movement.item_name}</td>
                    <td class="px-4 py-3 border-b">
                        <span class="${typeClass} flex items-center gap-2">
                            <i class="fas ${typeIcon}"></i>
                            ${movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                        </span>
                    </td>
                    <td class="px-4 py-3 border-b font-medium ${typeClass}">
                        ${quantityPrefix}${Math.abs(movement.quantity_change)}
                    </td>
                    <td class="px-4 py-3 border-b text-gray-600">
                        ${movement.reference_type ? `${movement.reference_type}: ${movement.reference_id || ''}` : '-'}
                    </td>
                    <td class="px-4 py-3 border-b text-gray-500">${movement.notes || '-'}</td>
                </tr>
            `;
        }).join('');

        if (summary) {
            const inEl = document.getElementById('summary-stock-in');
            if (inEl) inEl.textContent = (summary.total_in || 0).toString();

            const outEl = document.getElementById('summary-stock-out');
            if (outEl) outEl.textContent = (summary.total_out || 0).toString();

            const netEl = document.getElementById('summary-net-change');
            if (netEl) netEl.textContent = (summary.net_change || 0).toString();

            const summaryEl = document.getElementById('stock-report-summary');
            if (summaryEl) summaryEl.style.display = 'grid';
        }

        const printBtn = document.getElementById('print-stock-report');
        if (printBtn) printBtn.style.display = 'flex';

        const saveBtn = document.getElementById('save-stock-pdf');
        if (saveBtn) saveBtn.style.display = 'flex';
    }

    generateStockReportHTML(): string {
        const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
        const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;

        const startDate = startDateInput?.value || '';
        const endDate = endDateInput?.value || '';

        let summaryIn = '0';
        let summaryOut = '0';
        let summaryAdj = '0';
        let summaryNet = '0';

        if (this.stockReportSummary) {
            summaryIn = (this.stockReportSummary.total_in || 0).toString();
            summaryOut = (this.stockReportSummary.total_out || 0).toString();
            summaryAdj = (this.stockReportSummary.total_adjustments || 0).toString();
            summaryNet = (this.stockReportSummary.net_change || 0).toString();
        } else {
            summaryIn = document.getElementById('summary-stock-in')?.textContent || '0';
            summaryOut = document.getElementById('summary-stock-out')?.textContent || '0';
            summaryAdj = document.getElementById('summary-adjustments')?.textContent || '0';
            summaryNet = document.getElementById('summary-net-change')?.textContent || '0';
        }

        const tableContent = this.stockReportData.map(movement => {
            const quantityPrefix = movement.movement_type === 'in' ? '+' :
                movement.movement_type === 'out' ? '-' : '';
            const formattedDate = typeof formatDateIndian === 'function' ? formatDateIndian(movement.timestamp) : new Date(movement.timestamp).toLocaleDateString('en-IN');
            return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${movement.item_name}</td>
                    <td>${movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}</td>
                    <td class="text-right">${quantityPrefix}${Math.abs(movement.quantity_change)}</td>
                    <td>${movement.reference_type ? `${movement.reference_type}: ${movement.reference_id || ''}` : '-'}</td>
                    <td>${movement.notes || '-'}</td>
                </tr>
            `;
        }).join('');

        const content = `
            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-label">Total Stock In</div>
                    <div class="summary-value" style="color: #16a34a;">${summaryIn}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Stock Out</div>
                    <div class="summary-value" style="color: #dc2626;">${summaryOut}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Adjustments</div>
                    <div class="summary-value" style="color: #ca8a04;">${summaryAdj}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Net Change</div>
                    <div class="summary-value">${summaryNet}</div>
                </div>
            </div>
            
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th>Type</th>
                        <th class="text-right">Quantity</th>
                        <th>Reference</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableContent}
                </tbody>
            </table>
        `;

        const startStr = typeof formatDateIndian === 'function' ? formatDateIndian(startDate) : new Date(startDate).toLocaleDateString('en-IN');
        const endStr = typeof formatDateIndian === 'function' ? formatDateIndian(endDate) : new Date(endDate).toLocaleDateString('en-IN');
        const subtitle = `Period: ${startStr} to ${endStr}`;

        return reportsUtils.generatePrintableReport('Stock Movement Report', content, { subtitle });
    }

    printStockReport(): void {
        const html = this.generateStockReportHTML();
        reportsUtils.printReport(html, 'stock-report');
    }

    saveStockReportPDF(): void {
        const html = this.generateStockReportHTML();
        const filename = `stock-report-${new Date().getTime()}`;
        reportsUtils.saveReportPDF(html, filename);
    }

    loadSavedStockReport(report: SavedReport): void {
        if (!report || !report.data) return;

        if (report.parameters) {
            const startDateInput = document.getElementById('stock-start-date') as HTMLInputElement;
            if (report.parameters.start_date && startDateInput) {
                startDateInput.value = report.parameters.start_date.split('T')[0];
            }

            const endDateInput = document.getElementById('stock-end-date') as HTMLInputElement;
            if (report.parameters.end_date && endDateInput) {
                endDateInput.value = report.parameters.end_date.split('T')[0];
            }

            const filters = report.parameters.filters || report.parameters;

            const movementTypeInput = document.getElementById('stock-movement-type') as HTMLSelectElement;
            if (movementTypeInput) {
                movementTypeInput.value = filters.movement_type || 'all';
            }

            const itemFilterInput = document.getElementById('stock-item-filter') as HTMLInputElement;
            if (itemFilterInput) {
                itemFilterInput.value = filters.item_name || '';
            }
        }

        this.stockReportData = report.data.movements || [];

        let summary = report.data.summary;

        if (summary && summary.in && summary.out) {
            const renderSummary: StockReportSummary = {
                total_in: summary.in.total_quantity || 0,
                total_out: summary.out.total_quantity || 0,
                total_adjustments: summary.adjustment ? summary.adjustment.total_quantity : 0,
                net_change: 0
            };
            renderSummary.net_change = renderSummary.total_in - renderSummary.total_out + renderSummary.total_adjustments;
            summary = renderSummary;
        }

        this.stockReportSummary = summary;
        this.renderStockReport(this.stockReportData, summary);
    }

    async loadStockItemSuggestions(): Promise<void> {
        try {
            const data = await reportsApi.getStockItemsWithIds();
            if (data) {
                this.stockItems = data;
            }
        } catch (error) {
            console.error('Error loading stock item suggestions:', error);
        }
    }

    setupStockItemAutocomplete(): void {
        const input = document.getElementById('stock-item-filter') as HTMLInputElement;
        const suggestionsList = document.getElementById('stock-item-suggestions-list');

        if (!input || !suggestionsList) return;

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            suggestionsList.innerHTML = '';
            this.selectedSuggestionIndex = -1;
            this.selectedItemId = null;

            if (query.length === 0) {
                suggestionsList.style.display = 'none';
                return;
            }

            const filtered = this.stockItems.filter(item => item.name.toLowerCase().includes(query));

            if (filtered.length === 0) {
                suggestionsList.style.display = 'none';
                return;
            }

            suggestionsList.style.display = 'block';

            filtered.forEach((item, index) => {
                const li = document.createElement('li');
                li.textContent = item.name;
                li.dataset.itemId = item.id;
                li.addEventListener('click', () => {
                    input.value = item.name;
                    this.selectedItemId = item.id;
                    suggestionsList.style.display = 'none';
                    this.selectedSuggestionIndex = -1;
                });
                suggestionsList.appendChild(li);
            });
        });

        input.addEventListener('keydown', (e) => {
            const items = suggestionsList.querySelectorAll('li');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % items.length;
                this.updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + items.length) % items.length;
                this.updateSelection(items);
            } else if (e.key === 'Enter') {
                if (suggestionsList.style.display !== 'none' && this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    const selectedItem = items[this.selectedSuggestionIndex] as HTMLElement;
                    input.value = selectedItem.textContent || '';
                    this.selectedItemId = selectedItem.dataset.itemId || null;
                    suggestionsList.style.display = 'none';
                    this.selectedSuggestionIndex = -1;
                }
            } else if (e.key === 'Escape') {
                suggestionsList.style.display = 'none';
                this.selectedSuggestionIndex = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target as Node) && !suggestionsList.contains(e.target as Node)) {
                suggestionsList.style.display = 'none';
            }
        });
    }

    private updateSelection(items: NodeListOf<HTMLLIElement>): void {
        items.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
}

declare var stockReportComponent: StockReportComponent;
(window as any).stockReportComponent = new StockReportComponent();
