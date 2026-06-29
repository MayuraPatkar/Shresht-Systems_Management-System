/**
 * Invoice Module API Layer
 */

class InvoiceApi {
    private baseUrl = '/invoice';

    async fetchRecentInvoices(status: string = '', deleted: boolean = false): Promise<Invoice[]> {
        try {
            let url = `${this.baseUrl}/recent-invoices?`;
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += `deleted=true&`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch recent invoices');
            const data = await response.json();
            return data.invoices || [];
        } catch (error) {
            console.error('Error in fetchRecentInvoices:', error);
            throw error;
        }
    }

    async getInvoiceById(id: string): Promise<Invoice | null> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`);
            if (!response.ok) throw new Error(`Failed to fetch invoice ${id}`);
            const data = await response.json();
            return data.invoice || null;
        } catch (error) {
            console.error('Error in getInvoiceById:', error);
            throw error;
        }
    }

    async saveInvoice(data: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/save-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to save invoice');
            return result;
        } catch (error) {
            console.error('Error in saveInvoice:', error);
            throw error;
        }
    }

    async savePayment(data: {
        invoiceId: string;
        paidAmount: number;
        paymentDate: string;
        paymentMode: string;
        paymentExtra: string;
    }): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/save-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to save payment');
            return result;
        } catch (error) {
            console.error('Error in savePayment:', error);
            throw error;
        }
    }

    async updatePayment(data: {
        invoiceId: string;
        paidAmount: number;
        paymentDate: string;
        paymentMode: string;
        paymentExtra: string;
        paymentIndex: number;
    }): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/update-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update payment');
            return result;
        } catch (error) {
            console.error('Error in updatePayment:', error);
            throw error;
        }
    }

    async deletePayment(invoiceId: string, paymentIndex: number): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/delete-payment/${invoiceId}/${paymentIndex}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to delete payment');
            return result;
        } catch (error) {
            console.error('Error in deletePayment:', error);
            throw error;
        }
    }

    async archiveInvoice(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/archive`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to archive invoice');
            return await response.json();
        } catch (error) {
            console.error('Error in archiveInvoice:', error);
            throw error;
        }
    }

    async restoreInvoice(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/restore`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to restore invoice');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreInvoice:', error);
            throw error;
        }
    }

    async restoreInvoiceFromTrash(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/restoreItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to restore invoice from trash');
            return await response.json();
        } catch (error) {
            console.error('Error in restoreInvoiceFromTrash:', error);
            throw error;
        }
    }

    async hardDeleteInvoice(id: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/hardDeleteItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to permanently delete invoice');
            return await response.json();
        } catch (error) {
            console.error('Error in hardDeleteInvoice:', error);
            throw error;
        }
    }

    async bulkRestoreInvoices(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkRestore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk restore');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkRestoreInvoices:', error);
            throw error;
        }
    }

    async bulkHardDeleteInvoices(ids: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/bulkHardDelete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk hard delete');
            return await response.json();
        } catch (error) {
            console.error('Error in bulkHardDeleteInvoices:', error);
            throw error;
        }
    }
}

// Instantiate globally as per project pattern
(window as any).invoiceApi = new InvoiceApi();
