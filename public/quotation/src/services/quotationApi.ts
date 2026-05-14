export class QuotationApi {
    async fetchRecentQuotations(): Promise<any> {
        const response = await fetch('/quotation/recent-quotations');
        if (!response.ok) throw new Error('Failed to fetch quotations');
        return response.json();
    }

    async fetchQuotationById(id: string): Promise<any> {
        const response = await fetch(`/api/documents/quotation/${id}`);
        if (!response.ok) throw new Error('Failed to fetch quotation');
        return response.json();
    }

    async deleteQuotation(id: string): Promise<void> {
        const response = await fetch(`/quotation/delete/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete quotation');
    }
}
(window as any)['quotationApi'] = new QuotationApi();

