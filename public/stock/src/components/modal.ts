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
        el.classList.remove('hidden');
        const firstInput = el.querySelector('input, select, textarea') as HTMLElement | null;
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }
}

function hideModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('hidden');
        if (modalId === 'newStockModal') {
            const form = document.getElementById('newStockForm') as HTMLFormElement | null;
            if (form) form.reset();
        }
    }
}
