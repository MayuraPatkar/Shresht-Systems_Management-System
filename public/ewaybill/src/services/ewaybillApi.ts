/**
 * E-Way Bill Module API Layer
 */

(function () {
    class EWayBillApi {
        private baseUrl = '/eWayBill';

        async fetchRecentEWayBills(): Promise<EWayBill[]> {
            try {
                const response = await fetch(`${this.baseUrl}/recent-ewaybills`);
                if (!response.ok) throw new Error('Failed to fetch recent e-way bills');
                const data = await response.json();
                return data.eWayBill || [];
            } catch (error) {
                console.error('Error in fetchRecentEWayBills:', error);
                throw error;
            }
        }

        async getEWayBillDetails(id: string): Promise<EWayBill> {
            try {
                const response = await fetch(`${this.baseUrl}/${id}`);
                if (!response.ok) throw new Error('Failed to fetch e-way bill details');
                const data = await response.json();
                return data.eWayBill;
            } catch (error) {
                console.error('Error in getEWayBillDetails:', error);
                throw error;
            }
        }

        async saveEWayBill(data: EWayBillFormPayload): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/save-ewaybill`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to save e-way bill');
                return result;
            } catch (error) {
                console.error('Error in saveEWayBill:', error);
                throw error;
            }
        }

        async deleteEWayBill(id: string): Promise<void> {
            try {
                const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete e-way bill');
            } catch (error) {
                console.error('Error in deleteEWayBill:', error);
                throw error;
            }
        }

        async checkInvoiceExists(invoiceId: string): Promise<boolean> {
            try {
                const response = await fetch(`${this.baseUrl}/check-invoice/${encodeURIComponent(invoiceId)}`);
                if (!response.ok) return false;
                const data = await response.json();
                return !!data.exists;
            } catch (error) {
                console.warn('Error verifying existing e-way bill for invoice:', error);
                return false;
            }
        }

        async checkEWayBillNoExists(ewaybillNo: string, excludeId?: string | null): Promise<boolean> {
            try {
                let url = `${this.baseUrl}/check-ewaybill-no/${encodeURIComponent(ewaybillNo)}`;
                if (excludeId) {
                    url += `?excludeId=${encodeURIComponent(excludeId)}`;
                }
                const response = await fetch(url);
                if (!response.ok) return false;
                const data = await response.json();
                return !!data.exists;
            } catch (error) {
                console.warn('Error verifying existing e-way bill number:', error);
                return false;
            }
        }

        async fetchInvoice(invoiceId: string): Promise<any> {
            try {
                const response = await fetch(`/invoice/${encodeURIComponent(invoiceId)}`);
                if (!response.ok) throw new Error('Invoice not found');
                const data = await response.json();
                return data.invoice;
            } catch (error) {
                console.error('Error fetching invoice:', error);
                throw error;
            }
        }
    }

    // Instantiate globally
    (window as any).ewaybillApi = new EWayBillApi();
})();
