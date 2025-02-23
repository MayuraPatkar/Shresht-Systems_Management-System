const { ipcMain, BrowserWindow } = require("electron");

function handlePrintEvent(mainWindow) {
    ipcMain.on("PrintDoc", (event, { content }) => {
        console.log("Printing document...");
        
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            parent: mainWindow, // Set the parent to the main window
            webPreferences: {
                offscreen: true,
            },
        });

        // Load the HTML content into the print window
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
        `)}`);

        printWindow.webContents.on("did-finish-load", () => {
            // Trigger the print dialog
            printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                if (!success) console.error("Print failed:", errorType);

                // Clean up: Close the window after printing
                // printWindow.close();
            });
        });
    });
}

module.exports = { handlePrintEvent };