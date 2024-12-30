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

        .container {
    background: #fff;
    margin: auto;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    max-width: 800px;
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
    max-width: 120px;
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

.first-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.info-section,
.buyer-details {
    font-size: 14px;
    margin-bottom: 20px;
}

.info-section p,
.buyer-details p {
    margin: 3px 0;
}

.container table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    table-layout: auto; /* Allow columns to adjust size based on content */
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

.declaration {
    font-size: 14px;
    line-height: 1.5;
}

.signature {
    text-align: left;
}

.signature-space {
    margin-top: 20px;
    border: 1px dashed #333;
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
                printWindow.close();
            });
        });
    });
}

module.exports = { handlePrintEvent };
