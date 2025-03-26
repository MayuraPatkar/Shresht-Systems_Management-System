const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");

function handlePrintEvent(mainWindow) {
    ipcMain.on("PrintDoc", (event, { content, mode }) => {
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
            font-size: 36px;
            color: rgb(0, 33, 141);
        }

        .header .company-details p {
            margin: 2px 0;
            font-size: 14px;
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
            font-size: 14px;
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
            font-size: 14px;
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
            font-size: 14px;
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
            font-size: 14px;
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

        printWindow.webContents.once("did-finish-load", async () => {
            if (mode === "print") {
                // Print the document
                printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                    if (!success) console.error("Print failed:", errorType);
                });
            } else if (mode === "savePDF") {
                // Show save dialog to user
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: "document.pdf",
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (filePath) {
                    try {
                        const data = await printWindow.webContents.printToPDF({ printBackground: true });
                        fs.writeFileSync(filePath, data);
                        console.log("PDF saved at:", filePath);
                        event.sender.send("PDFSaved", { success: true, path: filePath });
                    } catch (error) {
                        console.error("Error saving PDF:", error);
                        event.sender.send("PDFSaved", { success: false, error });
                    }
                }
            }

            printWindow.close();
        });
    });


    ipcMain.on("PrintQuatation", (event, { content, mode }) => {
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
                    font-size: 36px;
                    color:rgb(0, 33, 141);
                }

                .header .company-details p {
                    margin: 2px 0;
                    font-size: 14px;
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

                .terms-section {
                    padding: 3%;
                    font-size: 20px;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }

                .closing-section {
                    font-size: 20px;
                    line-height: 1.5;
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

        printWindow.webContents.once("did-finish-load", async () => {
            if (mode === "print") {
                // Print the document
                printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                    if (!success) console.error("Print failed:", errorType);
                });
            } else if (mode === "savePDF") {
                // Show save dialog to user
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: "document.pdf",
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (filePath) {
                    try {
                        const data = await printWindow.webContents.printToPDF({ printBackground: true });
                        fs.writeFileSync(filePath, data);
                        console.log("PDF saved at:", filePath);
                        event.sender.send("PDFSaved", { success: true, path: filePath });
                    } catch (error) {
                        console.error("Error saving PDF:", error);
                        event.sender.send("PDFSaved", { success: false, error });
                    }
                }
            }

            printWindow.close();
        });
    });
}

module.exports = { handlePrintEvent };