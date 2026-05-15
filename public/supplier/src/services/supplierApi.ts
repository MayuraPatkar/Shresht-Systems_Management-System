/**
 * Supplier Module API Layer
 */

// Global declarations for shared utilities
declare function showAlert(msg: string): void;
declare function showConfirm(msg: string, cb: (res: string) => void): void;
declare function formatDateDisplay(date: any): string;
declare function formatIndian(amount: any, decimals?: number): string;

// Shared Supplier Module Globals
declare const supplierApi: any;
declare const supplierTable: any;
declare const supplierForms: any;
declare function fetchSuppliers(): void;

class SupplierApi {
    private baseUrl = '/api/suppliers';

    async fetchSuppliers(search: string = '', type: string = '', status: string = ''): Promise<any[]> {
        try {
            let url = `${this.baseUrl}?search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${type}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            return await response.json();
        } catch (error) {
            console.error('Error in fetchSuppliers:', error);
            throw error;
        }
    }

    async getSupplierDetails(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/full-details`);
            if (!response.ok) throw new Error('Failed to fetch supplier details');
            return await response.json();
        } catch (error) {
            console.error('Error in getSupplierDetails:', error);
            throw error;
        }
    }

    async saveSupplier(data: any, id?: string): Promise<any> {
        try {
            const url = id ? `${this.baseUrl}/${id}` : this.baseUrl;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save supplier');
            return result;
        } catch (error) {
            console.error('Error in saveSupplier:', error);
            throw error;
        }
    }

    async deleteSupplier(id: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete supplier');
        } catch (error) {
            console.error('Error in deleteSupplier:', error);
            throw error;
        }
    }
}

// Instantiate globally for now as per project pattern
(window as any).supplierApi = new SupplierApi();

