// @ts-nocheck
(function () {
    class PurchaseOrderApi {
        async fetchRecentPurchaseOrders(): Promise<any> {
            const response = await fetch('/purchaseOrder/recent-purchase-orders');
            if (!response.ok) throw new Error('Failed to fetch purchase orders');
            return response.json();
        }

        async fetchPurchaseOrderById(id: string): Promise<any> {
            const response = await fetch(`/purchaseOrder/${id}`);
            if (!response.ok) throw new Error('Failed to fetch purchase order');
            return response.json();
        }

        async deletePurchaseOrder(id: string): Promise<void> {
            // Note: the backend route might be different depending on implementation,
            // using the shared documentManager deleteDocument is usually preferred for deletes
            const response = await fetch(`/purchaseOrder/delete/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete purchase order');
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
