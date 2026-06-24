/**
 * voucherApi.ts
 */

const VoucherAPI = {
    async fetchVouchersList(filters: IVoucherFilters = {}): Promise<IVoucher[]> {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                queryParams.append(key, String(val));
            }
        });
        const url = `/voucher/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.vouchers) {
            return data.vouchers;
        }
        throw new Error(data.message || 'Failed to fetch vouchers');
    },

    async fetchNextVoucherNumber(): Promise<string> {
        const res = await fetch('/voucher/next-number');
        const data = await res.json();
        if (data.success && data.voucherNumber) {
            return data.voucherNumber;
        }
        throw new Error(data.message || 'Failed to fetch next voucher number');
    },

    async fetchVoucherById(id: string): Promise<IVoucher> {
        const res = await fetch(`/voucher/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (res.ok && data.success && data.voucher) {
            return data.voucher;
        }
        throw new Error(data.message || 'Failed to fetch voucher');
    },

    async createVoucher(payload: Partial<IVoucher>): Promise<{ success: boolean; voucher: IVoucher; paymentId: string; message?: string }> {
        const res = await fetch('/voucher/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            return data;
        }
        throw new Error(data.message || 'Failed to create voucher');
    },

    async updateVoucher(id: string, payload: Partial<IVoucher>): Promise<{ success: boolean; voucher: IVoucher; message?: string }> {
        const res = await fetch(`/voucher/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            return data;
        }
        throw new Error(data.message || 'Failed to update voucher');
    },

    async deleteVoucherById(id: string): Promise<{ success: boolean; message: string }> {
        const res = await fetch(`/voucher/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            return data;
        }
        throw new Error(data.message || 'Failed to delete voucher');
    },

    async fetchParties(type: 'Customer' | 'Supplier'): Promise<{ id: string; name: string }[]> {
        console.log('VoucherAPI.fetchParties called with type:', type);
        try {
            const url = `/payment/get-parties/${type}`;
            console.log('VoucherAPI.fetchParties fetching url:', url);
            const res = await fetch(url);
            console.log('VoucherAPI.fetchParties response status:', res.status, res.statusText);
            if (!res.ok) return [];
            const data = await res.json();
            console.log('VoucherAPI.fetchParties received count:', data.length);
            return data;
        } catch (e) {
            console.error('Failed to fetch parties from backend:', e);
            return [];
        }
    }
};

(window as any).VoucherAPI = VoucherAPI;
