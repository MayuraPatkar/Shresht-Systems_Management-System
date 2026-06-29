/**
 * paymentApi.ts
 */

const PaymentAPI = {
    async fetchPaymentsList(): Promise<IPaymentRecord[]> {
        const res = await fetch('/payment/list');
        const data = await res.json();
        if (data.success && data.payments) {
            return data.payments;
        }
        throw new Error(data.message || 'Failed to fetch payments');
    },

    async savePayment(payload: IPaymentPayload, editingId: string | null): Promise<IApiResponse> {
        const url: string = editingId ? `/payment/${editingId}` : '/payment/create';
        const method: string = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    async deletePaymentById(id: string): Promise<IApiResponse> {
        const res = await fetch(`/payment/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async fetchParties(type: 'Customer' | 'Supplier'): Promise<{id: string, name: string}[]> {
        try {
            const res = await fetch(`/payment/get-parties/${type}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch parties', e);
            return [];
        }
    },

    async fetchPartyDetails(type: 'Customer' | 'Supplier', partyName: string): Promise<any> {
        if (!partyName) return null;
        try {
            const res = await fetch(`/payment/get-party-details/${type}/${encodeURIComponent(partyName)}`);
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch party details', e);
            throw e;
        }
    }
};
