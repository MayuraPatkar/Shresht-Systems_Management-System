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

    async fetchCustomers(search: string = '', type: string = '', status: string = '', deleted: boolean = false): Promise<any[]> {
        try {
            let url = `${this.baseUrl}?search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${type}`;
            if (status) url += `&status=${status}`;
            if (deleted) url += `&deleted=true`;

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

    async archiveCustomer(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/archive`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to archive customer');
            return await response.json();
        } catch (error) {
            console.error('Error in archiveCustomer:', error);
            throw error;
        }
    }

    async restoreCustomer(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/restore`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to restore customer');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreCustomer:', error);
            throw error;
        }
    }

    async deleteCustomer(id: string): Promise<void> {
        try {
            const username = sessionStorage.getItem('username') || 'Admin';
            const response = await fetch(`${this.baseUrl}/${id}?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete customer');
        } catch (error) {
            console.error('Error in deleteCustomer:', error);
            throw error;
        }
    }

    async restoreCustomerFromTrash(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/restoreItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to restore customer from trash');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreCustomerFromTrash:', error);
            throw error;
        }
    }

    async hardDeleteCustomer(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/hardDeleteItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to permanently delete customer');
            return await response.json();
        } catch (error) {
            console.error('Error in hardDeleteCustomer:', error);
            throw error;
        }
    }

    async bulkRestoreCustomers(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkRestore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk restore');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkRestoreCustomers:', error);
            throw error;
        }
    }

    async bulkHardDeleteCustomers(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkHardDelete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk hard delete');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkHardDeleteCustomers:', error);
            throw error;
        }
    }
}

// Instantiate globally for now as per project pattern
(window as any).customerApi = new CustomerApi();
