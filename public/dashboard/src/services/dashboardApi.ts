/**
 * Dashboard API Service
 */

class DashboardApi {
    async fetchWithRetry(url: string, options: any = {}, retries = 3, delay = 1000): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                console.warn(`Fetch attempt ${i + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async getOverview() {
        return this.fetchWithRetry('/analytics/overview');
    }

    async getPerformanceMetrics() {
        return this.fetchWithRetry('/analytics/comparison');
    }

    async getQuotations() {
        return this.fetchWithRetry('/quotation/all');
    }

    async getInvoices() {
        return this.fetchWithRetry('/invoice/all');
    }

    async getEwaybills() {
        return this.fetchWithRetry('/eWayBill/recent-ewaybills');
    }

    async getServices() {
        return this.fetchWithRetry('/service/recent-services');
    }

    async getReports() {
        return this.fetchWithRetry('/reports/saved?limit=10');
    }

    async getPurchaseOrders() {
        return this.fetchWithRetry('/purchaseOrder/recent-purchase-orders');
    }

    async getStock() {
        return this.fetchWithRetry('/stock/all');
    }

    async getPendingServices() {
        return this.fetchWithRetry('/service/get-service');
    }

    async getPendingPayments() {
        return this.fetchWithRetry('/service/pending-payments');
    }
}

declare var dashboardApi: any;
(window as any).dashboardApi = new DashboardApi();
