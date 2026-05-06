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
