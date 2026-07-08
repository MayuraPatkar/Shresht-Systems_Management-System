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

    /**
     * Fetch procurement filters dropdown lists
     */
    async getProcurementFiltersOptions(): Promise<any> {
        return this.fetchJson('/analytics/procurement/filters');
    }

    /**
     * Fetch procurement analytics data consolidated report
     */
    async getProcurementData(filters: {
        dateRange?: string;
        startDate?: string;
        endDate?: string;
        supplier?: string;
        product?: string;
        category?: string;
        status?: string;
        branch?: string;
        warehouse?: string;
        buyer?: string;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, val]) => {
            if (val) {
                queryParams.append(key, val);
            }
        });

        const url = `/analytics/procurement-data?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch inventory filters dropdown lists
     */
    async getInventoryFiltersOptions(): Promise<any> {
        return this.fetchJson('/analytics/inventory/filters');
    }

    /**
     * Fetch inventory analytics data consolidated report
     */
    async getInventoryData(filters: {
        dateRange?: string;
        startDate?: string;
        endDate?: string;
        warehouse?: string;
        brand?: string;
        category?: string;
        supplier?: string;
        product?: string;
        status?: string;
        location?: string;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, val]) => {
            if (val) {
                queryParams.append(key, val);
            }
        });

        const url = `/analytics/inventory-data?${queryParams.toString()}`;
        return this.fetchJson(url);
    }
}

declare var analyticsApi: any;
(window as any).analyticsApi = new AnalyticsApi();
