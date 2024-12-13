const { ipcMain, BrowserWindow } = require("electron");

function handlePrintEvent() {
    ipcMain.on("print-invoice", (event, { content }) => {
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
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        padding: 0;
                        box-sizing: border-box;
                        width: 210mm; /* A4 width */
                        height: 297mm; /* A4 height */
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    table th, table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    .form-group label {
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                ${content.date}
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
