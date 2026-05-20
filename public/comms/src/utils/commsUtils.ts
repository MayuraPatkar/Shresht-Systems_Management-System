/**
 * Comms Module Utilities
 */

class CommsUtils {
    showNotification(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        const notif = document.createElement('div');
        notif.className = `fixed top-28 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
            } text-white font-semibold`;
        notif.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${msg}</span>
            </div>
        `;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    setLoading(buttonIdOrElement: string | HTMLButtonElement, isLoading: boolean): void {
        let button: HTMLButtonElement | null = null;
        if (typeof buttonIdOrElement === 'string') {
            button = (document.getElementById(buttonIdOrElement) || document.querySelector(`button[type="submit"]`)) as HTMLButtonElement | null;
        } else {
            button = buttonIdOrElement;
        }
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.classList.add('opacity-70', 'cursor-not-allowed');
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Sending...</span>
            `;
        } else {
            button.disabled = false;
            button.classList.remove('opacity-70', 'cursor-not-allowed');
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    }

    validatePhone(phone: string): boolean {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');

        // If doesn't start with country code, assume India (+91)
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        return cleaned;
    }
}

(window as any).commsUtils = new CommsUtils();
