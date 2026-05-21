/**
 * Invoice Module API Layer
 */

class InvoiceApi {
    private baseUrl = '/invoice';

    async fetchRecentInvoices(): Promise<Invoice[]> {
        try {
            const response = await fetch(`${this.baseUrl}/recent-invoices`);
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
}

// Instantiate globally as per project pattern
(window as any).invoiceApi = new InvoiceApi();
