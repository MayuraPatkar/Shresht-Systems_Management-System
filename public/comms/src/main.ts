/**
 * Comms Module Main Entry Point
 */

declare var commsApi: any;
declare var commsForms: any;
declare var commsUtils: any;

document.addEventListener('DOMContentLoaded', () => {
    // Expose fetchUnpaidProjects to window so components can call it
    (window as any).fetchUnpaidProjects = async () => {
        try {
            const data = await commsApi.fetchUnpaidCount();
            const totalElement = document.getElementById('total-unpaid');

            if (totalElement) {
                totalElement.textContent = (data.count || 0).toString();

                const autoButton = document.getElementById('send-automated-reminders') as HTMLButtonElement;
                if (autoButton) {
                    if (data.count > 0) {
                        autoButton.classList.remove('cursor-not-allowed', 'opacity-70');
                        autoButton.disabled = false;
                    } else {
                        autoButton.classList.add('cursor-not-allowed', 'opacity-70');
                        autoButton.disabled = true;
                    }
                }
            }
        } catch (err) {
            commsUtils.showNotification('Failed to fetch unpaid projects.', 'error');
        }
    };

    // Initialize forms
    if (typeof commsForms !== 'undefined') {
        commsForms.init();
    }

    // Initial fetch
    (window as any).fetchUnpaidProjects();

    // Global keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                (document.activeElement as HTMLElement).blur();
            } else {
                window.location.href = '../dashboard/dashboard.html';
            }
        }
    });

    // Refresh unpaid count every 30 seconds
    setInterval((window as any).fetchUnpaidProjects, 30000);
});
