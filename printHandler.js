const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const log = require("electron-log");

function handlePrintEvent(mainWindow) {
    ipcMain.on("PrintDoc", async (event, { content, mode, name }) => {
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            parent: mainWindow,
            webPreferences: {
                offscreen: false,
            },
        });

        try {
            await
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

                .preview-container {
                    background-image: url("https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/icon2.png");
                    background-repeat: no-repeat;
                    background-position: center;
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
            color: rgb(0, 8, 116);
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
            margin-bottom: 10px;
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
            text-align: center;
        }

        .info-section,
        .buyer-details {
            padding: 0.2%;
            font-size: 20px;
            line-height: 1;
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

        .preview-container table {
            width: 99%;
            border-collapse: collapse;
            table-layout: auto;
        }

        .preview-container table th,
        .preview-container table td {
            border: 1px solid #000000;
            padding: 7px;
            text-align: left;
            font-size: 20px;
        }
        
        .preview-container table th{
            font-size: 22px;
        }

        .preview-container table th {
            background-color: #007bff;
            color: #fff;
            font-weight: bold;
        }

        /* 
        third-section starts here
        */

        .third-section {
            line-height: 1;
            display: flex;
            justify-content: space-evenly;
        }

        .totals-section {
            line-height: 0.2;
            width: 50%;
            text-align: right;
            font-size: 20px;
        }

        .bank-details {
            line-height: 0.2;
            width: 50%;
            text-align: left;
            font-size: 20px;
        }

        #totalInWords, p { 
        font-size: 20px;
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
            line-height: 1;
            font-size: 18px;
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
        }

        .terms-section {
            line-height: 0.2;
            padding: 1%;
            font-size: 20px;
        }

        .signature {
        margin-top: 100px;
            text-align: left;
        }

        .signature p {
        font-size: 20px;
            margin-top: 0;
        }

        .signature-space {
            width: 150px;
            height: 30px;
        }

        footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 10px;
        }
                    .QR-code {
            width: 125px;
            height: 125px;
            margin: 1.5rem 0;
        }

        .QR-code img {
            height: 100%;
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

            if (mode === "print") {
                printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                    if (!success) {
                        log.error("Print failed:", errorType);
                        event.sender.send("printFailed", { error: errorType }); // Send error to renderer
                    }
                    printWindow.close();
                });
            } else if (mode === "savePDF") {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (filePath) {
                    try {
                        const data = await printWindow.webContents.printToPDF({
                            printBackground: true, pageSize: 'A4',
                            marginsType: 0,
                            landscape: false,
                        });
                        await fs.promises.writeFile(filePath, data);
                        event.sender.send("PDFSaved", { success: true, path: filePath });
                    } catch (error) {
                        log.error("Error saving PDF:", error);
                        event.sender.send("PDFSaved", { success: false, error });
                    }
                }
                printWindow.close();
            }
        } catch (err) {
            log.error("Error in print process:", err);
            event.sender.send("printProcessError", { error: err.message }); // Send error to renderer
            if (!printWindow.isDestroyed()) {
                printWindow.close();
            }
        }
    });


    ipcMain.on("PrintQuatation", async (event, { content, mode, name }) => {
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            parent: mainWindow,
            webPreferences: {
                offscreen: true,
            },
        });
        try {
            await
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

                .preview-container {
                    //background: #fff !important;
                    // width: 210mm;
                    // height: 297mm;
                    background-image: url("https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/icon2.png");
                    background-repeat: no-repeat;
                    background-position: center;
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
                    color:rgb(0, 8, 116);
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

                .preview-container table {
                    width: 99%;
                    border-collapse: collapse;
                    table-layout: auto;
                }

                .preview-container table th,
                .preview-container table td {
                    border: 1px solid #000000;
                    padding: 10px;
                    text-align: left;
                    font-size: 18px;
                }
                
                .preview-container table th {
                    font-size: 20px;
                }
            
                .preview-container table th {
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

                .totals-section {
                    margin: 20px 0;
                    text-align: right;
                    font-size: 20px;
                }

                .totals-section p,
                .totals-section h3 {
                    margin: 5px 0;
                    font-size: 20px;
                }

                .totals-section h3 {
                    color: #007bff;
                    font-weight: bold;
                }

                #totalInWords, p {
                    font-size: 20px;
                }

                .notes-section {
                    padding: 3%;
                    font-size: 14px;
                    margin-top: 20px;
                    line-height: 1.5;
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

                footer p{
                    font-size: 12px;
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

            if (mode === "print") {
                printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                    if (!success) {
                        log.error("Print failed:", errorType);
                        event.sender.send("printFailed", { error: errorType }); // Send error to renderer
                    }
                    printWindow.close();
                });
            } else if (mode === "savePDF") {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (filePath) {
                    try {
                        const data = await printWindow.webContents.printToPDF({ printBackground: true });
                        await fs.promises.writeFile(filePath, data);
                        event.sender.send("PDFSaved", { success: true, path: filePath });
                    } catch (error) {
                        log.error("Error saving PDF:", error);
                        event.sender.send("PDFSaved", { success: false, error });
                    }
                }
                printWindow.close();
            }
        } catch (err) {
            log.error("Error in print process:", err);
            event.sender.send("printProcessError", { error: err.message }); // Send error to renderer
            if (!printWindow.isDestroyed()) {
                printWindow.close();
            }
        }
    });
}

module.exports = { handlePrintEvent };