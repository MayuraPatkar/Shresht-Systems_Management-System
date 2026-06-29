document.addEventListener('DOMContentLoaded', () => {
    (window as any).stockReportComponent?.init();
    document.getElementById('home-btn')?.addEventListener('click', () => window.location.href = '/stock');
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        (document.getElementById('generate-stock-report') as HTMLButtonElement | null)?.click();
    });
});
