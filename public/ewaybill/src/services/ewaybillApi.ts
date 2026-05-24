/**
 * E-Way Bill Module API Layer
 */

(function () {
    class EWayBillApi {
        private baseUrl = '/eWayBill';

        async fetchRecentEWayBills(status?: string, deleted?: boolean): Promise<EWayBill[]> {
            try {
                let url = `${this.baseUrl}/recent-ewaybills`;
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (deleted !== undefined) params.append('deleted', deleted.toString());
                const queryString = params.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
                const response = await fetch(url);
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

        async archiveEWayBill(id: string): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/${id}/archive`, { method: 'PUT' });
                if (!response.ok) throw new Error('Failed to archive e-way bill');
                return await response.json();
            } catch (error) {
                console.error('Error in archiveEWayBill:', error);
                throw error;
            }
        }

        async restoreEWayBill(id: string): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/${id}/restore`, { method: 'PUT' });
                if (!response.ok) throw new Error('Failed to restore e-way bill');
                return await response.json();
            } catch (error) {
                console.error('Error in restoreEWayBill:', error);
                throw error;
            }
        }

        async restoreEWayBillFromTrash(id: string): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/restoreItem`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: id })
                });
                if (!response.ok) throw new Error('Failed to restore e-way bill from trash');
                return await response.json();
            } catch (error) {
                console.error('Error in restoreEWayBillFromTrash:', error);
                throw error;
            }
        }

        async hardDeleteEWayBill(id: string): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/hardDeleteItem`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: id })
                });
                if (!response.ok) throw new Error('Failed to permanently delete e-way bill');
                return await response.json();
            } catch (error) {
                console.error('Error in hardDeleteEWayBill:', error);
                throw error;
            }
        }

        async bulkRestoreEWayBills(ids: string[]): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/bulkRestore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds: ids })
                });
                if (!response.ok) throw new Error('Failed to bulk restore e-way bills');
                return await response.json();
            } catch (error) {
                console.error('Error in bulkRestoreEWayBills:', error);
                throw error;
            }
        }

        async bulkHardDeleteEWayBills(ids: string[]): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/bulkHardDelete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds: ids })
                });
                if (!response.ok) throw new Error('Failed to bulk permanently delete e-way bills');
                return await response.json();
            } catch (error) {
                console.error('Error in bulkHardDeleteEWayBills:', error);
                throw error;
            }
        }
    }

    // Instantiate globally
    (window as any).ewaybillApi = new EWayBillApi();
})();
