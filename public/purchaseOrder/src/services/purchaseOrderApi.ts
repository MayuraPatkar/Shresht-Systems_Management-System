// @ts-nocheck
(function () {
    class PurchaseOrderApi {
        async fetchRecentPurchaseOrders(status: string = '', deleted: boolean = false): Promise<any> {
            let url = '/purchaseOrder/recent-purchase-orders?';
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += 'deleted=true&';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch purchase orders');
            return response.json();
        }

        async fetchPurchaseOrderById(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/${id}`);
            if (!response.ok) throw new Error('Failed to fetch purchase order');
            return response.json();
        }

        async archivePurchaseOrder(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/${id}/archive`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to archive purchase order');
            return response.json();
        }

        async restorePurchaseOrder(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/${id}/restore`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to restore purchase order');
            return response.json();
        }

        async deletePurchaseOrder(id: string): Promise<void> {
            const response = await fetch(`/purchaseOrder/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete purchase order');
        }

        async restorePurchaseOrderFromTrash(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/restoreItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to restore purchase order from trash');
            return response.json();
        }

        async hardDeletePurchaseOrder(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/hardDeleteItem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: id })
            });
            if (!response.ok) throw new Error('Failed to permanently delete purchase order');
            return response.json();
        }

        async bulkRestorePurchaseOrders(ids: string[]): Promise<any> {
            const response = await fetch(`/purchaseOrder/bulkRestore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk restore');
            return response.json();
        }

        async bulkHardDeletePurchaseOrders(ids: string[]): Promise<any> {
            const response = await fetch(`/purchaseOrder/bulkHardDelete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids })
            });
            if (!response.ok) throw new Error('Failed bulk hard delete');
            return response.json();
        }
        
        async generateId(): Promise<any> {
            const response = await fetch('/purchaseOrder/generate-id');
            if (!response.ok) throw new Error('Failed to generate new purchase order ID');
            return response.json();
        }
        
        async fetchSuppliers(): Promise<any> {
            const response = await fetch('/purchaseOrder/suppliers/list');
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            return response.json();
        }
    }
    
    (window as any)['purchaseOrderApi'] = new PurchaseOrderApi();
})();
