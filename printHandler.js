const { ipcMain, BrowserWindow } = require("electron");

let printWindow = null;

function handlePrintEvent() {
    ipcMain.on("print", (event, { content, printOptions }) => {
        if (printWindow) {
            printWindow.close();
        }

        printWindow = new BrowserWindow({
            width: 800,
            height: 1123,
            show: false,
            parent: null,
            webPreferences: {
                offscreen: true,
            },
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <html>
            <head>
            <style>
                @page {
                    size: A4;
                    argin: 10mm;
                }

                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow: hidden;        
                }

                .container {
                    background: #fff;
                    width: 210mm;
                    height: 297mm;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .header .logo img {
                    max-width: 250px;
                }

                .header .company-details {
                    text-align: right;
                }

                .header .company-details h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #007bff;
                }

                .header .company-details p {
                    margin: 2px 0;
                    font-size: 14px;
                }

                .invoice-title {
                    text-align: center;
                    margin: 20px 0;
                    font-size: 20px;
                    color: #007bff;
                    font-weight: bold;
                }

                .title {
                    text-align: center;
                    font-size: 20px;
                    color: #007bff;
                    font-weight: bold;
                }

                .first-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }

                .info-section,
                .buyer-details {
                    padding:3%;
                    font-size: 18px;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }

                .buyer-details p {
                .info-section p,
                    margin: 3px 0;
                }

                .container table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    table-layout: auto;
                }

                .container table th,
                .container table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                    font-size: 10px;
                }
            
                .container table th {
                    background-color: #007bff;
                    color: #fff;
                    font-weight: bold;
                }

                .second-section {
                    display: flex;
                    justify-content: space-between;
                }

                .totals {
                    text-align: right;
                }

                .totals p,
                .totals h3 {
                    margin: 5px 0;
                    font-size: 14px;
                }

                .totals h3 {
                    color: #007bff;
                    font-weight: bold;
                }

                .bank-details {
                    font-size: 14px;
                }

                .terms-section {
                    padding: 3%;
                    font-size: 18px;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }

                .declaration {
                    font-size: 14px;
                    line-height: 1.5;
                }

                .signature {
                    text-align: left;
                }

                .signature-space {
                    margin-top: 20px;
                    width: 150px;
                    height: 40px;
                }

                footer {
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                    margin-top: 20px;
                }
            </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
        `)}`).catch(error => {
            console.error("Error loading print content:", error);
            event.sender.send('print-error', error.message);
            printWindow.close();
            printWindow = null;
        });

        printWindow.webContents.on("did-finish-load", () => {
            const options = printOptions || { silent: false, printBackground: true };

            printWindow.webContents.print(options, (success, failureReason) => {
                if (!success) {
                    console.error("Print failed:", failureReason);
                    event.sender.send('print-error', failureReason);
                } else {
                    event.sender.send('print-success');
                }

                printWindow.close();
                printWindow = null;
            });
        });

        printWindow.on('closed', () => {
            printWindow = null;
        });
    });
}

module.exports = { handlePrintEvent };
