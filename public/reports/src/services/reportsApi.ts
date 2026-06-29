/**
 * Reports Module - API Client Service
 */

class ReportsApi {
    async getRecentReports(filter?: string): Promise<{ success: boolean; reports?: SavedReport[] }> {
        let url = '/reports/saved';
        if (filter && filter !== 'all') {
            url += `?type=${filter}`;
        }
        const response = await fetch(url);
        return response.json();
    }

    async getReportById(id: string): Promise<{ success: boolean; report?: SavedReport }> {
        const response = await fetch(`/reports/${id}`);
        return response.json();
    }

    async deleteReport(id: string): Promise<{ success: boolean }> {
        const response = await fetch(`/reports/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    async deleteAllReports(filter?: string): Promise<{ success: boolean; deletedCount?: number }> {
        let url = '/reports/all';
        if (filter && filter !== 'all') {
            url += `?type=${filter}`;
        }
        const response = await fetch(url, {
            method: 'DELETE'
        });
        return response.json();
    }

    async getStockMovements(params: URLSearchParams): Promise<{ success: boolean; movements?: StockMovement[]; summary?: any }> {
        const response = await fetch(`/reports/stock?${params.toString()}`);
        return response.json();
    }

    async getAllStock(): Promise<any[]> {
        const response = await fetch('/stock/all');
        return response.json();
    }

    async getStockItemsWithIds(): Promise<Array<{ id: string; name: string }>> {
        const response = await fetch('/stock/get-items-with-ids');
        return response.json();
    }

    async getGstReport(month: string, year: string): Promise<{ success: boolean; report?: any }> {
        const response = await fetch(`/reports/gst?month=${month}&year=${year}`);
        return response.json();
    }

    async getAllInvoices(): Promise<any[]> {
        const response = await fetch('/invoice/all');
        return response.json();
    }

    async getPurchaseGstReport(month: string, year: string): Promise<{ success: boolean; report?: any }> {
        const response = await fetch(`/reports/purchase-gst?month=${month}&year=${year}`);
        return response.json();
    }

    async getRecentPurchaseOrders(): Promise<{ purchaseOrder?: any[] }> {
        const response = await fetch('/purchase-order/recent-purchase-orders');
        return response.json();
    }

    async saveDataWorksheet(payload: any): Promise<Response> {
        return fetch('/reports/data-worksheet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    }

    async getWorksheetCss(): Promise<string> {
        const response = await fetch('../css/dataWorksheetPreview.css');
        if (response.ok) {
            return response.text();
        }
        throw new Error('Failed to load CSS');
    }

    async getStockStatement(params: URLSearchParams): Promise<{ success: boolean; data?: any[]; totals?: any }> {
        const response = await fetch(`/reports/stock-statement?${params.toString()}`);
        return response.json();
    }
}

declare var reportsApi: any;
(window as any).reportsApi = new ReportsApi();
