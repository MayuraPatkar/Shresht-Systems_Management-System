// @ts-nocheck
(function () {
    class PurchaseApi {
        async fetchRecentPurchases(): Promise<any> {
            const response = await fetch('/purchase/recent-purchases');
            if (!response.ok) throw new Error('Failed to fetch purchases');
            return response.json();
        }

        async fetchPurchaseById(id: string): Promise<any> {
            const response = await fetch(`/purchase/${id}`);
            if (!response.ok) throw new Error('Failed to fetch purchase');
            return response.json();
        }

        async deletePurchase(id: string): Promise<void> {
            const response = await fetch(`/purchase/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete purchase');
        }
        
        async generateId(): Promise<any> {
            const response = await fetch('/purchase/generate-id');
            if (!response.ok) throw new Error('Failed to generate new purchase ID');
            return response.json();
        }
        
        async fetchSuppliers(): Promise<any> {
            const response = await fetch('/purchase/suppliers/list');
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            return response.json();
        }
    }
    
    (window as any)['purchaseApi'] = new PurchaseApi();
})();
