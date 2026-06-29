/**
 * Utility functions for the Stock module.
 * Includes input validation, HTML escaping, and notification helpers.
 */

// Helper to prevent decimal inputs
function preventDecimals(input: HTMLInputElement | null): void {
    if (!input) return;
    input.setAttribute('step', '1');
    input.addEventListener('keypress', function (event: KeyboardEvent): void {
        if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') {
            event.preventDefault();
        }
    });
    input.addEventListener('input', function (this: HTMLInputElement): void {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

function escapeHtml(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Add success feedback for operations
function showSuccessMessage(message: string): void {
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        // Fallback for web version
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 success-notification';
        notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add error feedback for operations
function showErrorMessage(message: string): void {
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        // Fallback for web version
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 success-notification';
        notification.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

let undoTimeout: number | undefined;

function showUndoToast(message: string, itemId: string): void {
    const toast = document.getElementById('undoToast');
    const msgSpan = document.getElementById('undoToastMessage');
    const undoBtn = document.getElementById('undoToastBtn');
    const closeBtn = document.getElementById('closeUndoToastBtn');

    if (!toast || !msgSpan || !undoBtn || !closeBtn) return;

    msgSpan.textContent = message;
    
    // Show toast
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

    // Clear previous timeout
    if (undoTimeout) {
        clearTimeout(undoTimeout);
    }

    // Hide toast after 7 seconds
    undoTimeout = window.setTimeout(() => {
        hideUndoToast();
    }, 7000);

    // Event listeners
    const handleUndo = async () => {
        hideUndoToast();
        try {
            const res = await fetch('/stock/restoreItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
            });
            if (!res.ok) throw new Error('Failed to restore item');
            await fetchStockData();
            showSuccessMessage('Stock item restored!');
        } catch (err) {
            console.error(err);
            showErrorMessage('Failed to restore item.');
        }
    };

    const handleClose = () => {
        hideUndoToast();
    };

    // Replace elements to clear previous listeners
    const newUndoBtn = undoBtn.cloneNode(true);
    undoBtn.parentNode?.replaceChild(newUndoBtn, undoBtn);
    newUndoBtn.addEventListener('click', handleUndo);

    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', handleClose);
}

function hideUndoToast(): void {
    const toast = document.getElementById('undoToast');
    if (toast) {
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    }
}
