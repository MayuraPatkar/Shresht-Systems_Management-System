// @ts-nocheck
// TypeScript controller for the Document Details & Print Page
declare const documentApi: any;
declare const companyConfig: any;
declare const SectionRenderers: any;

let currentDocId: string | null = null;
let loadedDocument: any = null;

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

async function loadCompanyConfig() {
    try {
        if (window.companyConfig && window.companyConfig.getCompanyHeaderHTML) {
            const headerHTML = await window.companyConfig.getCompanyHeaderHTML();
            const container = document.getElementById('company-header-container');
            if (container) container.innerHTML = headerHTML;
            
            const info = await window.companyConfig.getCompanyInfo();
            const companyNamePreview = document.getElementById('preview-company-name');
            if (companyNamePreview) {
                companyNamePreview.textContent = info?.company || 'Shresht Systems';
            }
        } else {
            // Fallback
            const container = document.getElementById('company-header-container');
            if (container && window.SectionRenderers && window.SectionRenderers.renderHeaderSync) {
                container.innerHTML = window.SectionRenderers.renderHeaderSync();
            }
        }
    } catch (e) {
        console.error("Failed to load company header config:", e);
    }
}

async function loadDocumentDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        window.location.href = '/document';
        return;
    }

    currentDocId = id;

    try {
        loadedDocument = await documentApi.fetchDocumentById(id);
        if (!loadedDocument) {
            window.location.href = '/document';
            return;
        }

        renderDocument(loadedDocument);
    } catch (err) {
        console.error("Failed to fetch document details:", err);
        window.location.href = '/document';
    }
}

function renderDocument(doc: any) {
    // Header Title & Subtitle
    const docNo = doc.documentNumber || '-';
    const titleVal = doc.title || 'Untitled Document';
    
    const headerSubtitle = document.getElementById('header-subtitle');
    if (headerSubtitle) headerSubtitle.textContent = docNo;

    // Doc Number & Date in paper preview
    const previewDocNo = document.getElementById('preview-doc-no');
    if (previewDocNo) previewDocNo.textContent = docNo;

    const previewDocDate = document.getElementById('preview-doc-date');
    if (previewDocDate) {
        previewDocDate.textContent = doc.date ? `Date: ${formatDate(doc.date)}` : '';
    }

    // Recipient Info
    const name = doc.recipientName || '';
    const address = doc.recipientAddress || '';
    const phone = doc.recipientPhone || '';
    const recipientContainer = document.getElementById('preview-recipient-info');
    
    if (recipientContainer) {
        if (!name && !address && !phone) {
            recipientContainer.innerHTML = `<p class="italic text-slate-400">No recipient details specified.</p>`;
        } else {
            let html = '';
            if (name) html += `<p class="font-semibold text-slate-800">${name}</p>`;
            if (address) html += `<p class="text-slate-600 whitespace-pre-wrap">${address}</p>`;
            if (phone) html += `<p class="text-slate-500">Ph: ${phone}</p>`;
            recipientContainer.innerHTML = html;
        }
    }

    // Subject
    const previewSubject = document.getElementById('preview-subject');
    if (previewSubject) previewSubject.textContent = titleVal;

    // Body
    const previewBody = document.getElementById('preview-body');
    if (previewBody) previewBody.innerHTML = doc.body || '<p class="italic text-slate-400">Empty Document Body</p>';
    
    // Page Title
    document.title = `Document ${docNo} - Details`;
}

function printDocument() {
    if (!loadedDocument) return;
    
    const content = document.getElementById('view-preview-content')?.innerHTML;
    if (!content) return;

    const docNo = loadedDocument.documentNumber || 'Document';
    const name = `Letter-${docNo}`;

    if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation) {
        (window as any).electronAPI.handlePrintEventQuatation(content, 'print', name);
    } else {
        window.print();
    }
}

function saveAsPDF() {
    if (!loadedDocument) return;
    
    const content = document.getElementById('view-preview-content')?.innerHTML;
    if (!content) return;

    const docNo = loadedDocument.documentNumber || 'Document';
    const name = `Letter-${docNo}`;

    if ((window as any).electronAPI && (window as any).electronAPI.handlePrintEventQuatation) {
        (window as any).electronAPI.handlePrintEventQuatation(content, 'savePDF', name);
    } else {
        window.print();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadCompanyConfig();
    await loadDocumentDetails();

    // Bind Print Button
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printDocument);
    }

    // Bind PDF Button
    const pdfBtn = document.getElementById('pdf-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', saveAsPDF);
    }

    // Bind Edit Button
    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (currentDocId) {
                window.location.href = `/document/form?id=${encodeURIComponent(currentDocId)}&action=edit`;
            }
        });
    }

    // Bind Back Button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/document';
        });
    }
});
