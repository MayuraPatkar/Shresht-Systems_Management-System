/**
 * Sales Analytics API Service
 */

class AnalyticsApi {
    private async fetchJson(url: string): Promise<any> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API request failed on: ${url}`, error);
            throw error;
        }
    }

    /**
     * Fetch all filters dropdown lists (customers, products, salespersons, categories, branches, etc.)
     */
    async getFiltersOptions(): Promise<any> {
        return this.fetchJson('/analytics/sales/filters');
    }

    /**
     * Fetch sales analytics data consolidated report
     * @param filters query object of active filters
     */
    async getSalesData(filters: {
        dateRange?: string;
        startDate?: string;
        endDate?: string;
        customer?: string;
        salesperson?: string;
        product?: string;
        category?: string;
        branch?: string;
        status?: string;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, val]) => {
            if (val) {
                queryParams.append(key, val);
            }
        });

        const url = `/analytics/sales-data?${queryParams.toString()}`;
        return this.fetchJson(url);
    }
}

declare var analyticsApi: any;
(window as any).analyticsApi = new AnalyticsApi();
