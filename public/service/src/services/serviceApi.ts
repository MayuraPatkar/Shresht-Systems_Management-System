/**
 * Service Module API Layer
 */

(function () {
    class ServiceApi {
        private baseUrl = '/service';

        async fetchDueServices(): Promise<Service[]> {
            try {
                const response = await fetch(`${this.baseUrl}/get-service`);
                if (!response.ok) throw new Error('Failed to fetch due services');
                const data = await response.json();
                return data.projects || [];
            } catch (error) {
                console.error('Error loading due services:', error);
                throw error;
            }
        }

        async fetchAllServices(): Promise<Service[]> {
            try {
                const response = await fetch(`${this.baseUrl}/all`);
                if (!response.ok) throw new Error('Failed to fetch all services');
                return await response.json();
            } catch (error) {
                console.error('Error loading all services:', error);
                throw error;
            }
        }

        async fetchCompletedServices(): Promise<Service[]> {
            try {
                const response = await fetch(`${this.baseUrl}/recent-services`);
                if (!response.ok) throw new Error('Failed to fetch completed services');
                const data = await response.json();
                return data.services || [];
            } catch (error) {
                console.error('Error loading completed services:', error);
                throw error;
            }
        }

        async fetchInvoices(): Promise<ServiceInvoiceOption[]> {
            try {
                const response = await fetch('/invoice/all');
                if (!response.ok) throw new Error('Failed to fetch invoices');
                return await response.json();
            } catch (error) {
                console.error('Error loading invoices:', error);
                throw error;
            }
        }

        async fetchStockNames(): Promise<string[]> {
            try {
                const response = await fetch('/stock/get-names');
                if (!response.ok) throw new Error('Failed to fetch stock names');
                return await response.json();
            } catch (error) {
                console.error('Error loading stock names:', error);
                throw error;
            }
        }

        async fetchServiceDetails(serviceId: string): Promise<Service> {
            try {
                const response = await fetch(`${this.baseUrl}/${serviceId}`);
                if (!response.ok) throw new Error('Failed to fetch service');
                const data = await response.json();
                return data.service;
            } catch (error) {
                console.error('Error fetching service details:', error);
                throw error;
            }
        }

        async generateServiceId(): Promise<string> {
            try {
                const response = await fetch(`${this.baseUrl}/generate-id`);
                if (!response.ok) throw new Error('Failed to generate ID');
                const data = await response.json();
                return data.service_id;
            } catch (error) {
                console.error('Error generating service ID:', error);
                throw error;
            }
        }

        async deletePayment(serviceId: string, paymentIndex: number): Promise<void> {
            try {
                const res = await fetch(`${this.baseUrl}/delete-payment/${serviceId}/${paymentIndex}`, {
                    method: 'DELETE'
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to delete payment');
                }
            } catch (error) {
                console.error('Error deleting payment:', error);
                throw error;
            }
        }

        async savePayment(payload: {
            serviceId: string;
            paidAmount: number;
            paymentDate: string;
            paymentMode: string;
            paymentExtra: string;
        }): Promise<void> {
            try {
                const response = await fetch(`${this.baseUrl}/save-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save payment');
                }
            } catch (error) {
                console.error('Error saving payment:', error);
                throw error;
            }
        }

        async updatePayment(payload: {
            serviceId: string;
            paymentIndex: number;
            paidAmount: number;
            paymentDate: string;
            paymentMode: string;
            paymentExtra: string;
        }): Promise<void> {
            try {
                const response = await fetch(`${this.baseUrl}/update-payment`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update payment');
                }
            } catch (error) {
                console.error('Error updating payment:', error);
                throw error;
            }
        }

        async toggleStatus(invoiceId: string): Promise<void> {
            try {
                const res = await fetch(`${this.baseUrl}/toggle-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoiceId })
                });
                if (!res.ok) throw new Error('Failed to toggle service status');
            } catch (error) {
                console.error('Error in toggleStatus:', error);
                throw error;
            }
        }

        async closeServiceSchedule(invoiceId: string): Promise<void> {
            try {
                const response = await fetch(`/invoice/close-service/${invoiceId}`, {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('Failed to close service schedule');
            } catch (error) {
                console.error('Error in closeServiceSchedule:', error);
                throw error;
            }
        }

        async fetchHistory(invoiceId: string): Promise<Service[]> {
            try {
                const response = await fetch(`${this.baseUrl}/history/${invoiceId}`);
                if (!response.ok) throw new Error('Failed to fetch history');
                const data = await response.json();
                return data.services || [];
            } catch (error) {
                console.error('Error in fetchHistory:', error);
                throw error;
            }
        }

        async saveService(serviceData: Service): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/save-service`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serviceData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to save service');
                return result;
            } catch (error) {
                console.error('Error saving service:', error);
                throw error;
            }
        }

        async updateService(serviceData: Service): Promise<any> {
            try {
                const response = await fetch(`${this.baseUrl}/update-service`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serviceData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to update service');
                return result;
            } catch (error) {
                console.error('Error updating service:', error);
                throw error;
            }
        }

        async updateNextService(invoiceId: string, nextService: string): Promise<void> {
            try {
                const response = await fetch(`${this.baseUrl}/update-nextService`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        invoice_id: invoiceId,
                        next_service: nextService
                    })
                });
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || 'Failed to update next service schedule');
                }
            } catch (error) {
                console.error('Error updating next service:', error);
                throw error;
            }
        }
    }

    // Instantiate globally
    (window as any).serviceApi = new ServiceApi();
})();
