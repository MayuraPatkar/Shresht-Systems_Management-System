/**
 * Generic modal show/hide utilities for the Stock module.
 */

function showModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) {
        if (modalId === 'newStockModal') {
            const form = document.getElementById('newStockForm') as HTMLFormElement | null;
            if (form) form.reset();
        }
        if ((window as any).clearAllErrors) {
            (window as any).clearAllErrors();
        }
        el.classList.remove('hidden');
        const firstInput = el.querySelector('input, select, textarea') as HTMLElement | null;
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }
}

function hideModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) {
        if ((window as any).clearAllErrors) {
            (window as any).clearAllErrors();
        }
        el.classList.add('hidden');
        if (modalId === 'newStockModal') {
            const form = document.getElementById('newStockForm') as HTMLFormElement | null;
            if (form) form.reset();
        }
    }
}
