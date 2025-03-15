const { ipcMain, BrowserWindow } = require("electron");

function handlePrintEvent(mainWindow) {
    ipcMain.on("PrintDoc", (event, { content }) => {
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            parent: mainWindow,
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
                }

                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow: hidden;      
                }

                .container {
                    background: #fff !important;
                    // width: 210mm;
                    // height: 297mm;
                    width: 250mm;
                    height: 337mm;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    margin: 0;
                    padding: 0;
                }

                /* 
        header section starts here
        */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 2px;
            margin-bottom: 2px;
        }

        .header .logo img {
            max-width: 300px;
        }

        .header .company-details {
            text-align: right;
        }

        .header .company-details h1 {
            margin: 0;
            font-size: 30px;
            color: #007bff;
        }

        .header .company-details p {
            margin: 2px 0;
            font-size: 20px;
        }

        /* 
        title section starts here
        */
        .title {
            text-align: center;
            font-size: 25px;
            color: #007bff;
            font-weight: bold;
        }

        /* 
        first-section starts here
        */
        .first-section {
            display: flex;
            justify-content: space-evenly;
             font-size: 20px;
        }

        .info-section{
            text-align: right;
        }

        .info-section,
        .buyer-details {
            padding: 0.2%;
            font-size: 20px;
            line-height: 1.0;
            width: 50%;
        }

        .buyer-details p .info-section p {
            margin: 3px 0;
        }

        /* 
        second-section starts here
        */
        .second-section {
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            flex-direction: column;
        }

        .container table {
            width: 99%;
            border-collapse: collapse;
            table-layout: auto;
        }

        .container table th,
        .container table td {
            border: 1px solid #000000;
            padding: 7px;
            text-align: left;
            font-size: 12px;
        }

        .container table th {
            background-color: #007bff;
            color: #fff;
            font-weight: bold;
        }

        /* 
        third-section starts here
        */

        .third-section {
            display: flex;
            justify-content: space-evenly;
        }

        .totals-section {
            width: 50%;
            text-align: right;
            font-size: 20px;
        }

        .bank-details {
            width: 50%;
            text-align: left;
            font-size: 14px;
        }

        /* 
        forth-section starts here
        */

        .forth-section {
            margin: 0;
            margin-bottom: 2px;
        }

        .forth-section p {
            margin-top: 0;
        }

        .declaration {
            font-size: 12px;
            line-height: 1.5;
        }

        .forth-section .declaration p {
            margin-bottom: 0;
        }

        /* 
        fifth-section starts here
        */

        .fifth-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .terms-section {
            padding: 1%;
            font-size: 12px;
            line-height: 1.0;
        }

        .signature {
            text-align: left;
        }

        .signature p {
            margin-top: 0;
        }

        .signature-space {
            width: 150px;
            height: 20px;
        }

        footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 10px;
        }
                
                @media print {
                    th {
                        background-color: #007bff !important;
                        color: #fff !important;
                    }
                }

            </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
        `)}`);

        printWindow.webContents.on("did-finish-load", () => {
            // Trigger the print dialog with printBackground option enabled
            printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                if (!success) console.error("Print failed:", errorType);
            });
        });
    });

    ipcMain.on("PrintQuatation", (event, { content }) => {
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            parent: mainWindow,
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
                }

                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow: hidden;      
                }

                .container {
                    background: #fff !important;
                    // width: 210mm;
                    // height: 297mm;
                    width: 250mm;
                    height: 337mm;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    margin: 0;
                    padding: 0;
                }

                /* 
                    header section starts here
                */

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .header .logo img {
                    max-width: 300px;
                }

                .header .company-details {
                    text-align: right;
                }

                .header .company-details h1 {
                    margin: 0;
                    font-size: 30px;
                    color: #007bff;
                }

                .header .company-details p {
                    margin: 2px 0;
                    font-size: 20px;
                }

                .title {
                    text-align: center;
                    font-size: 25px;
                    color: #007bff;
                    font-weight: bold;
                }

                .first-section {
                    display: flex;
                    flex-direction: Column;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }

                .info-section,
                .buyer-details {
                    padding:3%;
                    font-size: 20px;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }

                .buyer-details p .info-section p {
                    margin: 0;
                }

                .container table {
                    width: 99%;
                    border-collapse: collapse;
                    table-layout: auto;
                }

                .container table th,
                .container table td {
                    border: 1px solid #000000;
                    padding: 10px;
                    text-align: left;
                    font-size: 12px;
                }
            
                .container table th {
                    background-color: #007bff !important;
                    color: #fff !important;
                    font-weight: bold;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
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
                    font-size: 20px;
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
                
                @media print {
                    th {
                        background-color: #007bff !important;
                        color: #fff !important;
                    }
                }

            </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
        `)}`);

        printWindow.webContents.on("did-finish-load", () => {
            // Trigger the print dialog with printBackground option enabled
            printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                if (!success) console.error("Print failed:", errorType);
            });
        });
    });
}

module.exports = { handlePrintEvent };