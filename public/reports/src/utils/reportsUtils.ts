/**
 * Reports Module - Utilities and Shared Functions
 */

declare function formatIndian(amount: any, decimals?: number): string;
declare var formatDateIndian: any;

class ReportsUtils {
    formatCurrency(amount: number): string {
        if (typeof formatIndian === 'function') {
            return '₹' + formatIndian(amount, 2);
        }
        return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.showAlert1 === 'function') {
            electronAPI.showAlert1(message);
        } else {
            // Create a toast notification
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
                type === 'success' ? 'bg-green-600' :
                type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white font-medium`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    }

    printReport(htmlContent: string, filename: string): void {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.handlePrintEvent === 'function') {
            electronAPI.handlePrintEvent(htmlContent, 'print', filename);
        } else {
            // Fallback for browser
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            }
        }
    }

    async saveReportPDF(htmlContent: string, filename: string): Promise<void> {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.handlePrintEvent === 'function') {
            try {
                const result = await electronAPI.handlePrintEvent(htmlContent, 'savePDF', filename);
                if (result && result.error) {
                    this.showNotification(`Failed to save PDF: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('PDF save error:', error);
                this.showNotification('Failed to save PDF', 'error');
            }
        } else {
            this.showNotification('PDF save requires Electron environment', 'error');
        }
    }

    generatePrintableReport(title: string, content: string, options: { subtitle?: string } = {}): string {
        const today = (window as any).formatDateDisplay ? (window as any).formatDateDisplay(new Date()) : new Date().toLocaleDateString('en-IN');

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    background: white;
                    color: #333;
                }
                
                .report-container {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .report-header {
                    text-align: center;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                
                .company-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 5px;
                }
                
                .company-address {
                    font-size: 12px;
                    color: #666;
                }
                
                .report-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 20px 0 10px;
                    color: #333;
                }
                
                .report-date {
                    font-size: 12px;
                    color: #666;
                }
                
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                
                .report-table th,
                .report-table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                
                .report-table th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                    color: #374151;
                }
                
                .report-table tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                
                .report-summary {
                    display: flex;
                    justify-content: space-around;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f3f4f6;
                    border-radius: 8px;
                }
                
                .summary-item {
                    text-align: center;
                }
                
                .summary-label {
                    font-size: 12px;
                    color: #666;
                }
                
                .summary-value {
                    font-size: 18px;
                    font-weight: bold;
                    color: #1e40af;
                }
                
                .report-footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }
                
                .text-right {
                    text-align: right;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .font-bold {
                    font-weight: bold;
                }
                
                .total-row {
                    background-color: #e5e7eb !important;
                    font-weight: bold;
                }
                
                @media print {
                    body {
                        padding: 0;
                    }
                    
                    .report-container {
                        max-width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="report-header">
                    <div class="company-name">SHRESHT SYSTEMS</div>
                    <div class="company-address">
                        3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113<br>
                        Ph: 7204657707 / 9901730305 | Email: shreshtsystems@gmail.com<br>
                        GSTIN: 29AGCPN4093N1ZS
                    </div>
                    <div class="report-title">${title}</div>
                    <div class="report-date">Generated on: ${today}</div>
                    ${options.subtitle ? `<div class="report-date">${options.subtitle}</div>` : ''}
                </div>
                
                ${content}
                
                <div class="report-footer">
                    <p>This is a computer-generated report from Shresht Systems Management System</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

declare var reportsUtils: any;
(window as any).reportsUtils = new ReportsUtils();
