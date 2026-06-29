class QuotationApi {
    async fetchRecentQuotations(status = ''): Promise<any> {
        const response = await fetch(`/quotation/recent-quotations${status ? `?status=${encodeURIComponent(status)}` : ''}`);
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

    async archiveQuotation(id: string): Promise<any> {
        const response = await fetch(`/quotation/${id}/archive`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to archive quotation');
        return response.json();
    }

    async restoreQuotationFromArchive(id: string): Promise<any> {
        const response = await fetch(`/quotation/${id}/restore-from-archive`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to restore quotation');
        return response.json();
    }
}
(window as any)['quotationApi'] = new QuotationApi();

