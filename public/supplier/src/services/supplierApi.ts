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

    async fetchSuppliers(search: string = '', type: string = '', status: string = '', deleted: boolean = false): Promise<any[]> {
        try {
            let url = `${this.baseUrl}?search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${type}`;
            if (status) url += `&status=${status}`;
            if (deleted) url += `&deleted=true`;

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

    async archiveSupplier(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/archive`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to archive supplier');
            return await response.json();
        } catch (error) {
            console.error('Error in archiveSupplier:', error);
            throw error;
        }
    }

    async restoreSupplier(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/restore`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to restore supplier');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreSupplier:', error);
            throw error;
        }
    }

    async deleteSupplier(id: string): Promise<void> {
        try {
            const username = sessionStorage.getItem('username') || 'Admin';
            const response = await fetch(`${this.baseUrl}/${id}?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete supplier');
        } catch (error) {
            console.error('Error in deleteSupplier:', error);
            throw error;
        }
    }

    async restoreSupplierFromTrash(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/restoreItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to restore supplier from trash');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreSupplierFromTrash:', error);
            throw error;
        }
    }

    async hardDeleteSupplier(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/hardDeleteItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to permanently delete supplier');
            return await response.json();
        } catch (error) {
            console.error('Error in hardDeleteSupplier:', error);
            throw error;
        }
    }

    async bulkRestoreSuppliers(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkRestore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk restore');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkRestoreSuppliers:', error);
            throw error;
        }
    }

    async bulkHardDeleteSuppliers(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkHardDelete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk hard delete');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkHardDeleteSuppliers:', error);
            throw error;
        }
    }
}

// Instantiate globally for now as per project pattern
(window as any).supplierApi = new SupplierApi();

