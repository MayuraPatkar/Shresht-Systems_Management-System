/**
 * Calculations Module Utilities
 */

class CalculationsUtils {
    showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        const notif = document.createElement('div');
        notif.className = `fixed top-28 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
            } text-white font-semibold`;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    deg2rad(d: number): number {
        return d * Math.PI / 180;
    }

    rad2deg(r: number): number {
        return r * 180 / Math.PI;
    }
}

declare var calculationsUtils: any;
(window as any).calculationsUtils = new CalculationsUtils();
