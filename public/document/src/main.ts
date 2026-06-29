// @ts-nocheck
// TypeScript controller for the Custom Documents List Page
declare const documentApi: any;
declare const moment: any;

let loadedDocuments: any[] = [];
let isTrashMode = false;

function triggerRefreshAnimation(btn: HTMLButtonElement) {
    btn.classList.remove('spinning');
    void btn.offsetWidth; // Force reflow to restart animation
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 650);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
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

async function loadDocuments() {
    const tbody = document.getElementById("document-tbody");
    const mobileCards = document.getElementById("document-cards-mobile");
    if (!tbody || !mobileCards) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="w-full px-4 py-12 flex flex-col items-center justify-center text-slate-400">
                <i class="fas fa-spinner fa-spin text-3xl mb-2 text-blue-500"></i>
                <p>Loading documents...</p>
            </td>
        </tr>
    `;
    mobileCards.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <i class="fas fa-spinner fa-spin text-2xl text-blue-500 mr-2"></i>
            <span class="text-slate-500">Loading...</span>
        </div>
    `;

    try {
        loadedDocuments = await documentApi.fetchAllDocuments(isTrashMode);
        renderDocumentsList(loadedDocuments);
    } catch (error) {
        console.error("Failed to load documents:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="w-full px-4 py-12 text-center text-rose-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Failed to load documents. Please check backend connection.</p>
                </td>
            </tr>
        `;
        mobileCards.innerHTML = `
            <div class="text-center py-8 text-rose-500">
                <i class="fas fa-exclamation-circle text-xl mb-1"></i>
                <p>Failed to load documents.</p>
            </div>
        `;
    }
}

function renderDocumentsList(documents: any[]) {
    const tbody = document.getElementById("document-tbody");
    const mobileCards = document.getElementById("document-cards-mobile");
    if (!tbody || !mobileCards) return;

    tbody.innerHTML = "";
    mobileCards.innerHTML = "";

    if (documents.length === 0) {
        const noDocsMessage = isTrashMode 
            ? "No deleted documents found in trash." 
            : "No documents created yet. Click 'New Document' to get started!";
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="w-full px-6 py-12 text-center text-slate-400">
                    <i class="fas fa-file-alt text-3xl mb-3 text-slate-300"></i>
                    <p class="text-sm font-medium">${noDocsMessage}</p>
                </td>
            </tr>
        `;
        mobileCards.innerHTML = `
            <div class="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
                <i class="fas fa-file-alt text-2xl mb-2 text-slate-300"></i>
                <p class="text-xs">${noDocsMessage}</p>
            </div>
        `;
        return;
    }

    documents.forEach((doc: any) => {
        // Table row for Desktop
        const tr = document.createElement("tr");
        tr.className = "document-row border-b border-slate-100 hover:bg-slate-50/50 text-slate-700";
        tr.tabIndex = 0;
        
        const docId = doc._id;
        const docNo = doc.documentNumber || '-';
        const docDate = formatDate(doc.date);
        const docTitle = doc.title || 'Untitled Document';
        const docRecipient = doc.recipientName || 'General (No Recipient)';

        // Dropdown actions HTML depending on trash mode
        let actionsHTML = "";
        if (isTrashMode) {
            actionsHTML = `
                <div class="flex items-center justify-end gap-2 pr-4">
                    <button class="restore-doc-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer" data-id="${docId}">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                </div>
            `;
        } else {
            actionsHTML = `
                <div class="flex items-center justify-end gap-2 pr-4">
                    <button class="view-doc-btn bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer" data-id="${docId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="edit-doc-btn bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer" data-id="${docId}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-doc-btn bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer" data-id="${docId}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-slate-800">${docNo}</td>
            <td class="px-6 py-4 text-slate-500">${docDate}</td>
            <td class="px-6 py-4 font-medium max-w-xs truncate" title="${docTitle}">${docTitle}</td>
            <td class="px-6 py-4 text-slate-600 truncate max-w-xs" title="${docRecipient}">${docRecipient}</td>
            <td class="px-6 py-4 text-right">${actionsHTML}</td>
        `;
        tbody.appendChild(tr);

        // Click row to view details (only in normal mode)
        if (!isTrashMode) {
            tr.addEventListener("click", (e) => {
                const target = e.target as HTMLElement;
                if (!target.closest("button")) {
                    window.location.href = `/document/details?id=${encodeURIComponent(docId)}`;
                }
            });
        }

        // Mobile Card
        const card = document.createElement("div");
        card.className = "bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3";
        
        let mobileActionsHTML = "";
        if (isTrashMode) {
            mobileActionsHTML = `
                <button class="restore-doc-btn flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer" data-id="${docId}">
                    <i class="fas fa-undo"></i> Restore
                </button>
            `;
        } else {
            mobileActionsHTML = `
                <button class="view-doc-btn bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer" data-id="${docId}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="edit-doc-btn bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer" data-id="${docId}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-doc-btn bg-rose-55 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 flex-1 cursor-pointer" data-id="${docId}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            `;
        }

        card.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-bold text-slate-800 text-sm">${docNo}</span>
                <span class="text-xs text-slate-500">${docDate}</span>
            </div>
            <div>
                <h4 class="font-semibold text-slate-800 text-sm truncate">${docTitle}</h4>
                <p class="text-xs text-slate-500 mt-0.5 truncate">Recipient: ${docRecipient}</p>
            </div>
            <div class="flex gap-2 pt-1 border-t border-slate-50">
                ${mobileActionsHTML}
            </div>
        `;
        mobileCards.appendChild(card);
    });

    // Wire up buttons
    document.querySelectorAll(".view-doc-btn").forEach((btn: any) => {
        btn.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            window.location.href = `/document/details?id=${encodeURIComponent(id)}`;
        });
    });

    document.querySelectorAll(".edit-doc-btn").forEach((btn: any) => {
        btn.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            window.location.href = `/document/form?id=${encodeURIComponent(id)}&action=edit`;
        });
    });

    document.querySelectorAll(".delete-doc-btn").forEach((btn: any) => {
        btn.addEventListener("click", async (e: Event) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            const doc = loadedDocuments.find(d => d._id === id);
            const docNo = doc ? doc.documentNumber : "selected";
            
            const message = `Are you sure you want to delete Document "${docNo}"?`;
            
            const executeDelete = async () => {
                try {
                    await documentApi.deleteDocument(id);
                    if ((window as any).electronAPI?.showAlert1) {
                        (window as any).electronAPI.showAlert1("Document deleted successfully");
                    } else {
                        alert("Document deleted successfully");
                    }
                    loadDocuments();
                } catch (err) {
                    console.error("Delete failed:", err);
                    if ((window as any).electronAPI?.showAlert1) {
                        (window as any).electronAPI.showAlert1("Failed to delete document");
                    } else {
                        alert("Failed to delete document");
                    }
                }
            };

            if ((window as any).electronAPI?.showAlert2 && (window as any).electronAPI?.receiveAlertResponse) {
                (window as any).electronAPI.showAlert2(message);
                (window as any).electronAPI.receiveAlertResponse((response: string) => {
                    if (response === "Yes") executeDelete();
                });
            } else if (confirm(message)) {
                await executeDelete();
            }
        });
    });

    document.querySelectorAll(".restore-doc-btn").forEach((btn: any) => {
        btn.addEventListener("click", async (e: Event) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            try {
                await documentApi.restoreDocument(id);
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Document restored successfully");
                } else {
                    alert("Document restored successfully");
                }
                loadDocuments();
            } catch (err) {
                console.error("Restore failed:", err);
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Failed to restore document");
                } else {
                    alert("Failed to restore document");
                }
            }
        });
    });
}

function filterDocuments(query: string) {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
        renderDocumentsList(loadedDocuments);
        return;
    }

    const filtered = loadedDocuments.filter((doc: any) => {
        return (
            (doc.documentNumber && doc.documentNumber.toLowerCase().includes(lowerQuery)) ||
            (doc.title && doc.title.toLowerCase().includes(lowerQuery)) ||
            (doc.recipientName && doc.recipientName.toLowerCase().includes(lowerQuery))
        );
    });
    renderDocumentsList(filtered);
}

function updateHeaderVisibility() {
    const searchWrapper = document.getElementById('search-wrapper');
    const refreshBtn = document.getElementById('refresh-btn');
    const trashBtn = document.getElementById('showDeletedBtn');
    const closeTrashBtn = document.getElementById('close-trash-btn');
    const newDocumentBtn = document.getElementById('new-document-btn');
    const headerTitle = document.getElementById('header-title');
    const subtitle = document.getElementById('list-subtitle');

    if (isTrashMode) {
        if (searchWrapper) searchWrapper.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'flex';
        if (trashBtn) trashBtn.style.display = 'none';
        if (closeTrashBtn) closeTrashBtn.style.display = 'flex';
        if (newDocumentBtn) newDocumentBtn.style.display = 'none';
        if (headerTitle) headerTitle.textContent = "Trash - Documents";
        if (subtitle) subtitle.textContent = "Deleted Custom Letters & Documents";
    } else {
        if (searchWrapper) searchWrapper.style.display = 'flex';
        if (refreshBtn) refreshBtn.style.display = 'flex';
        if (trashBtn) trashBtn.style.display = 'flex';
        if (closeTrashBtn) closeTrashBtn.style.display = 'none';
        if (newDocumentBtn) newDocumentBtn.style.display = 'flex';
        if (headerTitle) headerTitle.textContent = "Documents";
        if (subtitle) subtitle.textContent = "All Custom Letters & Documents";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDocuments();
    updateHeaderVisibility();

    // New Document button handler
    const newBtn = document.getElementById("new-document-btn");
    if (newBtn) {
        newBtn.addEventListener("click", () => {
            window.location.href = "/document/form";
        });
    }

    // Refresh button handler
    const refreshBtn = document.getElementById("refresh-btn") as HTMLButtonElement;
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            triggerRefreshAnimation(refreshBtn);
            loadDocuments();
        });
    }

    // Trash button handler
    const trashBtn = document.getElementById("showDeletedBtn");
    if (trashBtn) {
        trashBtn.addEventListener("click", () => {
            isTrashMode = true;
            updateHeaderVisibility();
            loadDocuments();
        });
    }

    // Close trash button handler
    const closeTrashBtn = document.getElementById("close-trash-btn");
    if (closeTrashBtn) {
        closeTrashBtn.addEventListener("click", () => {
            isTrashMode = false;
            updateHeaderVisibility();
            loadDocuments();
        });
    }

    // Search input handler
    const searchInput = document.getElementById("search-input") as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener("input", (e: Event) => {
            filterDocuments(searchInput.value);
        });
    }
});
