// @ts-nocheck
class DocumentApi {
    async fetchAllDocuments(includeDeleted = false): Promise<any> {
        const response = await fetch(`/document/all?includeDeleted=${includeDeleted}`);
        if (!response.ok) throw new Error('Failed to fetch documents');
        return response.json();
    }

    async fetchDocumentById(id: string): Promise<any> {
        const response = await fetch(`/document/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error('Failed to fetch document');
        return response.json();
    }

    async deleteDocument(id: string): Promise<void> {
        const response = await fetch(`/document/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete document');
    }

    async restoreDocument(id: string): Promise<any> {
        const response = await fetch(`/document/${encodeURIComponent(id)}/restore`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to restore document');
        return response.json();
    }

    async saveDocument(data: any): Promise<any> {
        const response = await fetch('/document/save-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to save document');
        }
        return response.json();
    }

    async generateNextId(): Promise<any> {
        const response = await fetch('/document/generate-id');
        if (!response.ok) throw new Error('Failed to generate document ID');
        return response.json();
    }
}

(window as any)['documentApi'] = new DocumentApi();
