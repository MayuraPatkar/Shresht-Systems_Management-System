const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");

function handlePrintEvent(mainWindow) {
    // Read unified CSS from external file (single source of truth for all document types)
    const documentStylesPath = path.join(__dirname, '../../public/css/shared/documentStyles.css');
    const iconPath = path.join(__dirname, '../../public/assets/icon2.png');
    const logoPath = path.join(__dirname, '../../public/assets/logo.png');
    const qrCodePath = path.join(__dirname, '../../public/assets/shresht-systems-payment-QR-code.jpg');
    
    let cssContent = '';
    let logoBase64 = '';
    let qrCodeBase64 = '';
    
    try {
        cssContent = fs.readFileSync(documentStylesPath, 'utf-8');
        
        // Convert local image path in CSS to a Base64 data URI for printing
        const iconBuffer = fs.readFileSync(iconPath);
        const iconBase64 = iconBuffer.toString('base64');
        const iconDataUri = `data:image/png;base64,${iconBase64}`;
        
        cssContent = cssContent.replace('url("../../assets/icon2.png")', `url("${iconDataUri}")`);

        // Convert logo and QR code to Base64 for embedding in HTML
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

        const qrCodeBuffer = fs.readFileSync(qrCodePath);
        qrCodeBase64 = `data:image/jpeg;base64,${qrCodeBuffer.toString('base64')}`;

        log.info('Successfully loaded and processed documentStyles.css and image assets for print handler');
    } catch (error) {
        log.error('Error reading documentStyles.css or image assets:', error);
        // Fallback to basic styles if CSS file can't be read
        cssContent = `
            @page { size: A4; margin: 0; }
            body { font-family: Arial, sans-serif; }
            .preview-container { padding: 20px; }
        `;
    }
    
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
                <meta charset="UTF-8">
                <style>
                * {
                    font-family: Arial, Helvetica, sans-serif !important;
                }
                ${cssContent}
            </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `)}`);

            // Wait for content to fully load before printing
            await printWindow.webContents.executeJavaScript('document.fonts.ready');

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
                            printBackground: true, 
                            pageSize: 'A4',
                            marginsType: 0,
                            landscape: false,
                            preferCSSPageSize: true,
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
            <meta charset="UTF-8">
            <style>
                * {
                    font-family: Arial, Helvetica, sans-serif !important;
                }
                ${cssContent}
            </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
        `)}`);

            // Wait for content to fully load before printing
            await printWindow.webContents.executeJavaScript('document.fonts.ready');

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
                            printBackground: true,
                            pageSize: 'A4',
                            marginsType: 0,
                            landscape: false,
                            preferCSSPageSize: true,
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
}

module.exports = { handlePrintEvent };