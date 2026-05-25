// @ts-nocheck
(function () {
    class PurchaseApi {
        async fetchRecentPurchases(status: string = '', deleted: boolean = false): Promise<any> {
            let url = '/purchase/recent-purchases?';
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += `deleted=true&`;
            const response = await fetch(url);
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

        async archivePurchase(id: string): Promise<any> {
            const response = await fetch(`/purchase/${id}/archive`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to archive purchase');
            return response.json();
        }

        async restorePurchase(id: string): Promise<any> {
            const response = await fetch(`/purchase/${id}/restore`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to restore purchase');
            return response.json();
        }

        async restorePurchaseFromTrash(id: string): Promise<any> {
            const response = await fetch(`/purchase/restoreItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to restore purchase from trash');
            return response.json();
        }

        async hardDeletePurchase(id: string): Promise<any> {
            const response = await fetch(`/purchase/hardDeleteItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to permanently delete purchase');
            return response.json();
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
