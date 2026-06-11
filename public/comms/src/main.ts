/**
 * Comms Module Main Entry Point
 */

declare var commsApi: any;
declare var commsForms: any;
declare var commsUtils: any;

document.addEventListener('DOMContentLoaded', () => {
    // Expose fetchUnpaidProjects to window so components can call it
    (window as any).fetchUnpaidProjects = async () => {
        if (typeof commsForms !== 'undefined' && typeof commsForms.loadReminderStats === 'function') {
            await commsForms.loadReminderStats();
        }
    };

    // Initialize forms
    if (typeof commsForms !== 'undefined') {
        commsForms.init();
    }

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

    // Refresh unpaid count stats every 30 seconds
    setInterval(() => {
        if (typeof (window as any).fetchUnpaidProjects === 'function') {
            (window as any).fetchUnpaidProjects();
        }
    }, 30000);
});
