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
    width: 210.058mm;
    height: 296.926mm;
                        -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                                        margin: 0;
                    padding: 0;
}

.first-section {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #007bff;
}

.first-section .logo img {
    max-width: 300px;
}

.first-section .company-details {
    text-align: right;
}

.first-section .company-details h1 {
    margin: 0;
    font-size: 36px;
    color: rgb(0, 8, 116);
}

.first-section .company-details p {
    margin: 2px 0;
    font-size: 14px;
}

.second-section p {
    text-align: center;
    font-size: 25px;
    color: #007bff;
    font-weight: bold;
    margin: 0;
}

.third-section {
    display: flex;
        justify-content: space-evenly;
        font-size: 16px;
    }

    .third-section p {  
        margin: 5px;
    }

    .third-section .info-section {
        text-align: left;
        margin-left: 250px;
}

.third-section .info-section,
.third-section .buyer-details {
    padding: 0.2%;
    font-size: 16px;
    line-height: 1.0;
    width: 50%;
}

.fourth-section {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    flex-direction: column;
}

.fourth-section table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
    background: #f9fbfd; !important;
    border-radius: 8px;
    overflow: hidden;
    min-width: 600px;
                        -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
}

.fourth-section table th,
.fourth-section table td {
    border: 1px solid #858585ff !important;
    padding: 0.5rem 1.1rem;
    text-align: left;
    font-size: 0.9rem;
                        -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
}

.fourth-section table th {
    background: #2657b0ff !important;
    color: #ffffffff !important;
    font-weight: 700;
    font-size: 1rem;
}

.fifth-section {
    display: flex;
    justify-content: space-evenly;
    margin-top: 0.5rem;
}

.fifth-section-sub1 {
    width: 100%;
    display: flex;
}

.fifth-section-sub2 {
    display: flex;
    flex-direction: column;
    width: 68%;
}

.fifth-section .fifth-section-sub2 h3 {
    font-size: 1.1rem;
}

.fifth-section .totals-section {
    width: 32%;
    text-align: left;
    font-size: 16px;
    display: flex;
    justify-content: space-evenly;
}

.fifth-section .totals-section p {
    float: left;
    margin: 0;
}

.fifth-section .bank-details {
    text-align: left;
    font-size: 16px;
    display: flex;
}

.fifth-section .bank-details-sub2 {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.fifth-section-sub3 {
    display: flex;
    margin-bottom: 10px;
    font-size: 1rem;
}

.fifth-section-sub3-1 {
    width: 30%;
}

.fifth-section-sub3-2 {
    width: 70%;
    margin-left: 0;
}

.fifth-section .fifth-section-sub2 h3{
    margin: 0;
}

.fifth-section .QR-code {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    margin: 10px 10px;
}

.fifth-section .QR-code img {
    height: 100%;
}

.fifth-section .bank-details-sub2 p {
    margin: 0;
}

.fifth-section .bank-details-sub2 h4 {
    margin: 0;
}

.sixth-section {
    margin: 0;
}

.sixth-section p {
    margin-top: 0;
}

.sixth-section .declaration {
    font-size: 16px;
    line-height: 1.5;
}

.sixth-section .declaration p {
    margin-bottom: 0;
}

.seventh-section {
    padding: 1%;
    font-size: 16px;
    line-height: 1.0;
    margin-top: 0;
}

.seventh-section p {
    margin: 0;
}

.seventh-section .terms-section h4{
margin-bottom: 5px;
}


.eighth-section {
    /* height: 4%; */
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.eighth-section p {
    margin: 0;
    /* margintop: 0; */
}

.eighth-section-space {
    margin-right: 0;
    width: 150px;
    height: 25px;
}

.ninth-section {
    text-align: center;
    font-size: 12px;
    color: #777;
}

                
                @media print {
                    th {
                        background-color: #f0f4fa !important;
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

.headline-section {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: bold;
    color: #000000ff;
}

                .preview-container table {
    width: 99.9%;
    border-collapse: collapse;
    margin-top: 0.5rem;
    background: #f9fbfd;
    border-radius: 8px;
    overflow: hidden;
    min-width: 600px;
}

.preview-container table th,
.preview-container table td {
    border: 1px solid #9ca0a8;
    padding: 0.6rem 0.8rem;
    text-align: right;
    font-size: 0.9rem;
}

.preview-container table td:nth-child(1),
.preview-container table td:nth-child(2),
.preview-container table td:nth-child(3) {
    text-align: left;
}

.preview-container table th {
    background: #f0f4fa;
    color:  #2a4d8f;
    font-weight: 700;
    font-size: 0.9rem;
    text-align: center;
}

.second-section {
    display: flex;
    justify-content: space-between;
}

.fifth-section {
    display: flex;
    justify-content: space-evenly;
    margin-top: 0.5rem;
}

.fifth-section-sub1 {
    width: 100%;
    display: flex;
}

.fifth-section-sub2 {
    display: flex;
    flex-direction: column;
    width: 68%;
}

.fifth-section .fifth-section-sub2 h3 {
    font-size: 1.1rem;
}

.fifth-section-sub3 {
    display: flex;
}

.fifth-section .totals-section {
    width: 32%;
    text-align: left;
    font-size: 16px;
    display: flex;
    justify-content:space-between;
}

.fifth-section .totals-section p {
    margin: 12px 0; 
}

.fifth-section .totals-section h3{
        margin: 10px 0; 
}

.fifth-section .totals-section .totals-section-sub1 {
    text-align: center;
    width: 40%;
}

.fifth-section .totals-section .totals-section-sub2 {
    width: 60%;
    text-align: right;
}

.fifth-section .bank-details {
    text-align: left;
    font-size: 16px;
    display: flex;
}

.fifth-section .bank-details-sub2 {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.fifth-section-sub3 {
    display: flex;
    margin-bottom: 10px;
    font-size: 1rem;
}

.fifth-section-sub3-1 {
    width: 25%;
}

.fifth-section-sub3-2 {
text-align: left;
    width: 75%;
}

.fifth-section .QR-code {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    margin: 10px 10px;
    margin-left: 0;
}

.fifth-section .QR-code img {
    height: 100%;
}

.fifth-section .bank-details-sub2 p,
.fifth-section .bank-details-sub2 h3 {
    margin: 0;
}

.notes-section {
    padding: 3%;
    font-size: 16px;
    line-height: 1.5;
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

.closing-section {
    font-size: 1.1rem;
}

footer {
    text-align: center;
    font-size: 12px;
    color: #777;
    margin-top: 20px;
}

footer p {
    font-size: 14px;
}

#image-preview-container {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
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