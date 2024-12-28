const { ipcMain, BrowserWindow } = require("electron");

function handlePrintEvent() {
    ipcMain.on("print", (event, { content }) => {
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false, // Hide the window during printing
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
            width: 210mm;
            overflow: hidden;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }

        .header .logo img {
            max-width: 100px;
        }

        .header .company-details h1 {
            margin: 0;
            font-size: 18px;
            color: #007bff;
        }

        .header .company-details p {
            margin: 2px 0;
            font-size: 12px;
            color: #555;
        }

        hr {
            border: 0;
            height: 1px;
            background: #ddd;
            margin: 10px 0;
        }

        .info-section table,
        .buyer-details table,
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .info-section td,
        .buyer-details td,
        .items-table td,
        .items-table th {
            padding: 5px;
            text-align: left;
            border: 1px solid #ddd;
            font-size: 12px;
        }

        .items-table th {
            background: #f1f1f1;
            font-weight: bold;
        }

        .totals {
            text-align: right;
            margin-top: 10px;
        }

        .totals p,
        .totals h3 {
            margin: 5px 0;
            font-size: 12px;
        }

        .bank-details p {
            margin: 5px 0;
            font-size: 12px;
        }

        .declaration,
        .signature {
            margin-top: 15px;
            text-align: left;
            font-size: 12px;
        }

        .signature-space {
            width: 80px;
            height: 25px;
        }

        footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #777;
        }

        .page-break {
            page-break-before: always;
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
                printWindow.close();
            });
        });
    });
}

module.exports = { handlePrintEvent };
