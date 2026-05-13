/**
 * Customer Module API Layer
 */

// Global declarations for shared utilities
declare function showAlert(msg: string): void;
declare function showConfirm(msg: string, cb: (res: string) => void): void;
declare function formatDateDisplay(date: any): string;
declare function formatIndian(amount: any, decimals?: number): string;

// Shared Customer Module Globals
declare const customerApi: any;
declare const customerTable: any;
declare const customerForms: any;
declare function fetchCustomers(): void;

class CustomerApi {
    private baseUrl = '/api/customers';

    async fetchCustomers(search: string = '', type: string = '', status: string = ''): Promise<any[]> {
        try {
            let url = `${this.baseUrl}?search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${type}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch customers');
            return await response.json();
        } catch (error) {
            console.error('Error in fetchCustomers:', error);
            throw error;
        }
    }

    async getCustomerDetails(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/full-details`);
            if (!response.ok) throw new Error('Failed to fetch customer details');
            return await response.json();
        } catch (error) {
            console.error('Error in getCustomerDetails:', error);
            throw error;
        }
    }

    async saveCustomer(data: any, id?: string): Promise<any> {
        try {
            const url = id ? `${this.baseUrl}/${id}` : this.baseUrl;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save customer');
            return result;
        } catch (error) {
            console.error('Error in saveCustomer:', error);
            throw error;
        }
    }

    async deleteCustomer(id: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete customer');
        } catch (error) {
            console.error('Error in deleteCustomer:', error);
            throw error;
        }
    }
}

// Instantiate globally for now as per project pattern
(window as any).customerApi = new CustomerApi();
