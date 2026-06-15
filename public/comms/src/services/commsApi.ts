/**
 * Comms Module API Layer
 */

declare var commsUtils: any;

class CommsApi {
    async searchCustomers(query: string): Promise<any[]> {
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Failed to search customers');
            return await res.json();
        } catch (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
    }

    async getCustomerDetails(id: string): Promise<any> {
        try {
            const res = await fetch(`/api/customers/${id}/full-details`);
            if (!res.ok) throw new Error('Failed to fetch customer details');
            return await res.json();
        } catch (error) {
            console.error('Error fetching customer details:', error);
            throw error;
        }
    }

    async fetchAllInvoices(): Promise<any[]> {
        try {
            const res = await fetch('/invoice/all');
            if (!res.ok) throw new Error('Failed to fetch invoices');
            return await res.json();
        } catch (error) {
            console.error('Error fetching invoices:', error);
            throw error;
        }
    }

    async fetchRecentQuotations(): Promise<any> {
        try {
            const res = await fetch('/quotation/recent-quotations');
            if (!res.ok) throw new Error('Failed to fetch recent quotations');
            return await res.json();
        } catch (error) {
            console.error('Error fetching recent quotations:', error);
            throw error;
        }
    }

    async fetchUnpaidCount(): Promise<UnpaidCountResponse> {
        try {
            const res = await fetch('/invoice/unpaid-count');
            if (!res.ok) throw new Error('Failed to fetch unpaid projects');
            return await res.json();
        } catch (error) {
            console.error('Error fetching unpaid projects:', error);
            throw error;
        }
    }

    async sendManualReminder(data: ManualReminderData): Promise<CommsApiResponse> {
        try {
            const res = await fetch('/comms/send-manual-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to send reminder');
            return result;
        } catch (error) {
            console.error('Error sending manual reminder:', error);
            throw error;
        }
    }

    async sendMessage(data: SendMessageData): Promise<CommsApiResponse> {
        try {
            const res = await fetch('/comms/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to send message');
            return result;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async sendInvoice(data: SendInvoiceData): Promise<CommsApiResponse> {
        try {
            const res = await fetch('/comms/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to send invoice');
            return result;
        } catch (error) {
            console.error('Error sending invoice:', error);
            throw error;
        }
    }

    async sendQuotation(data: SendQuotationData): Promise<CommsApiResponse> {
        try {
            const res = await fetch('/comms/send-quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to send quotation');
            return result;
        } catch (error) {
            console.error('Error sending quotation:', error);
            throw error;
        }
    }

    async sendAutomatedReminders(): Promise<CommsApiResponse> {
        try {
            const res = await fetch('/comms/send-automated-reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to send automated reminders');
            return result;
        } catch (error) {
            console.error('Error sending automated reminders:', error);
            throw error;
        }
    }
}

(window as any).commsApi = new CommsApi();
