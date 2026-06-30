// @ts-nocheck
// TypeScript controller for the Document Creation & Edit Form
declare const documentApi: any;
declare const companyConfig: any;
declare const SectionRenderers: any;

let currentDocId: string | null = null;
let isUpdateMode = false;

function formatDateForPreview(dateStr: string): string {
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

function updatePreviewRecipient() {
    const name = (document.getElementById('recipient-name-input') as HTMLInputElement).value.trim();
    const address = (document.getElementById('recipient-address-input') as HTMLTextAreaElement).value.trim();
    const phone = (document.getElementById('recipient-phone-input') as HTMLInputElement).value.trim();
    const container = document.getElementById('preview-recipient-info');

    if (container) {
        if (!name && !address && !phone) {
            container.innerHTML = `<p class="doc-body-empty">No recipient details specified.</p>`;
            return;
        }

        let html = '';
        if (name) html += `<p class="doc-recipient-name">${name}</p>`;
        if (address) html += `<p class="doc-recipient-details whitespace-pre-wrap">${address}</p>`;
        if (phone) html += `<p class="doc-recipient-phone">Ph: ${phone}</p>`;

        container.innerHTML = html;
    }
}

function syncPreview() {
    // Subject
    const titleVal = (document.getElementById('doc-title-input') as HTMLInputElement).value.trim();
    const previewSubject = document.getElementById('preview-subject');
    if (previewSubject) {
        previewSubject.textContent = titleVal || 'Untitled Document';
    }

    // Date
    const dateVal = (document.getElementById('doc-date-input') as HTMLInputElement).value;
    const previewDate = document.getElementById('preview-doc-date');
    if (previewDate) {
        previewDate.textContent = dateVal ? `Date: ${formatDateForPreview(dateVal)}` : '';
    }

    updatePreviewRecipient();
}

async function loadCompanyHeader() {
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

async function loadCustomers() {
    const custSelect = document.getElementById('customer-select') as HTMLSelectElement;
    if (!custSelect) return;

    try {
        const response = await fetch('/api/customers');
        if (response.ok) {
            const customers = await response.json();
            customers.forEach((c: any) => {
                const opt = document.createElement('option');
                opt.value = c._id;
                
                const firstName = c.customer?.first_name || '';
                const lastName = c.customer?.last_name || '';
                opt.textContent = c.customer?.name || `${firstName} ${lastName}`.trim();
                opt.dataset.cust = JSON.stringify(c);
                custSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error fetching customers list:", err);
    }
}

async function handleSave() {
    const date = (document.getElementById('doc-date-input') as HTMLInputElement).value;
    const title = (document.getElementById('doc-title-input') as HTMLInputElement).value.trim();
    const recipientName = (document.getElementById('recipient-name-input') as HTMLInputElement).value.trim();
    const recipientAddress = (document.getElementById('recipient-address-input') as HTMLTextAreaElement).value.trim();
    const recipientPhone = (document.getElementById('recipient-phone-input') as HTMLInputElement).value.trim();
    const body = (document.getElementById('preview-body') as HTMLElement).innerHTML;
    const docNo = (document.getElementById('doc-no-input') as HTMLInputElement).value;

    if (!title) {
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1("Document Title/Subject is required.");
        } else {
            alert("Document Title/Subject is required.");
        }
        return;
    }

    const payload = {
        id: currentDocId,
        documentNumber: docNo,
        date: date ? new Date(date) : new Date(),
        title,
        recipientName,
        recipientAddress,
        recipientPhone,
        body,
        isUpdate: isUpdateMode
    };

    try {
        const result = await documentApi.saveDocument(payload);
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1(result.message || "Document saved successfully");
        } else {
            alert(result.message || "Document saved successfully");
        }
        window.location.href = '/document';
    } catch (err: any) {
        console.error("Failed to save document:", err);
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1(err.message || "Failed to save document.");
        } else {
            alert(err.message || "Failed to save document.");
        }
    }
}

async function initForm() {
    await loadCompanyHeader();
    await loadCustomers();

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    const action = urlParams.get('action');

    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const dateInput = document.getElementById('doc-date-input') as HTMLInputElement;
    const docNoInput = document.getElementById('doc-no-input') as HTMLInputElement;

    if (editId && action === 'edit') {
        isUpdateMode = true;
        currentDocId = editId;
        if (headerTitle) headerTitle.textContent = "Edit Document";
        if (headerSubtitle) headerSubtitle.textContent = "Modify Custom Letter / Document";

        try {
            const doc = await documentApi.fetchDocumentById(editId);
            if (doc) {
                if (docNoInput) docNoInput.value = doc.documentNumber || '';
                const previewDocNo = document.getElementById('preview-doc-no');
                if (previewDocNo) previewDocNo.textContent = doc.documentNumber || '';

                if (dateInput && doc.date) {
                    dateInput.value = new Date(doc.date).toISOString().split('T')[0];
                }
                
                (document.getElementById('doc-title-input') as HTMLInputElement).value = doc.title || '';
                (document.getElementById('recipient-name-input') as HTMLInputElement).value = doc.recipientName || '';
                (document.getElementById('recipient-address-input') as HTMLTextAreaElement).value = doc.recipientAddress || '';
                (document.getElementById('recipient-phone-input') as HTMLInputElement).value = doc.recipientPhone || '';
                
                const previewBody = document.getElementById('preview-body');
                if (previewBody) previewBody.innerHTML = doc.body || '';

                syncPreview();
            }
        } catch (err) {
            console.error("Failed to load document details for editing:", err);
        }
    } else {
        // Create Mode
        isUpdateMode = false;
        if (headerTitle) headerTitle.textContent = "New Document";
        if (headerSubtitle) headerSubtitle.textContent = "Create Custom Letter / Document";

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = today;

        // Fetch new ID
        try {
            const { documentNumber } = await documentApi.generateNextId();
            if (docNoInput) docNoInput.value = documentNumber;
            const previewDocNo = document.getElementById('preview-doc-no');
            if (previewDocNo) previewDocNo.textContent = documentNumber;
        } catch (err) {
            console.error("Failed to generate document ID:", err);
        }

        syncPreview();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initForm();

    // Setup input listeners to dynamically sync form inputs to preview
    const inputs = ['doc-title-input', 'doc-date-input', 'recipient-name-input', 'recipient-address-input', 'recipient-phone-input'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', syncPreview);
            el.addEventListener('change', syncPreview);
        }
    });

    // Customer Selection Change Listener
    const custSelect = document.getElementById('customer-select') as HTMLSelectElement;
    if (custSelect) {
        custSelect.addEventListener('change', () => {
            const val = custSelect.value;
            if (!val) return;

            const opt = custSelect.options[custSelect.selectedIndex];
            const custDataStr = opt.dataset.cust;
            if (custDataStr) {
                const c = JSON.parse(custDataStr);
                
                // Recipient Name
                const firstName = c.customer?.first_name || '';
                const lastName = c.customer?.last_name || '';
                const fullName = c.customer?.name || `${firstName} ${lastName}`.trim();
                
                // Recipient Address
                let addrStr = '';
                if (c.billing_address) {
                    const addr = c.billing_address;
                    const parts = [
                        addr.line1,
                        addr.line2,
                        addr.city,
                        addr.state,
                        addr.pincode
                    ];
                    addrStr = parts.filter(Boolean).join(', ');
                }

                // Recipient Phone
                const phone = c.customer?.phone || '';

                // Set values
                (document.getElementById('recipient-name-input') as HTMLInputElement).value = fullName;
                (document.getElementById('recipient-address-input') as HTMLTextAreaElement).value = addrStr;
                (document.getElementById('recipient-phone-input') as HTMLInputElement).value = phone;

                syncPreview();
            }
        });
    }

    // Save Button Listener
    const saveBtn = document.getElementById('save-document-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }

    // Back Button Listener
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/document';
        });
    }
});
