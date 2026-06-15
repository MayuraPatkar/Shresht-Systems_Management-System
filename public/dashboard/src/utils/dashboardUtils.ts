/**
 * Dashboard Module Utilities
 */

declare function showAlert(message: string): void;

class DashboardUtils {
    showErrorMessage(containerId: string, message: string): void {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    animateCounter(id: string, end: number | string | null | undefined, isCurrency: boolean = false, duration: number = 1000, delay: number = 10): void {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`animateCounter: Element with id "${id}" not found`);
            return;
        }

        if (end === undefined || end === null || Number.isNaN(Number(end))) {
            console.warn(`animateCounter: Invalid value for ${id}:`, end);
            end = 0;
        }

        let endNum = Number(end);

        if (endNum === 0) {
            el.textContent = isCurrency ? `₹${(window as any).formatIndian(0)}` : (window as any).formatIndian(0);
            return;
        }

        setTimeout(() => {
            const t0 = performance.now();
            const run = (now: number) => {
                const p = Math.min((now - t0) / duration, 1);
                const value = endNum * p;

                el.textContent = isCurrency
                    ? `₹${(window as any).formatIndian(value, 2)}`
                    : (window as any).formatIndian(Math.floor(value));

                if (p < 1) requestAnimationFrame(run);
            };
            requestAnimationFrame(run);
        }, delay);
    }

    updateDateTime(): void {
        const now = new Date();
        const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');

        if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, dateOptions);
        if (timeEl) timeEl.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    formatTimeAgo(date: string | Date | undefined): string {
        if (!date) return 'Unknown';
        const now = new Date();
        const past = new Date(date);

        if (isNaN(past.getTime())) return 'Unknown';

        const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (seconds < 0) return past.toLocaleDateString();

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return past.toLocaleDateString();
    }

    getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    formatLakhs(num: number): string {
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
        return `₹${formatIndian(num)}`;
    }
}

declare var dashboardUtils: any;
(window as any).dashboardUtils = new DashboardUtils();
