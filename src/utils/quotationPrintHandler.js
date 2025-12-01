const { BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require("./logger");

/**
 * Native Electron Print Handler
 * Replaces Puppeteer for faster, lighter printing using hidden BrowserWindows.
 */
class QuotationPrintHandler {
    constructor() {
        this.tempFiles = new Set();
    }

    /**
     * Load CSS and image assets as base64
     * Loads both documentStyles.css and quotationStyles.css for complete styling
     */
    async loadAssets() {
        const documentStylesPath = path.join(__dirname, '../../public/css/shared/documentStyles.css');
        const quotationStylesPath = path.join(__dirname, '../../public/css/shared/quotationStyles.css');
        const iconPath = path.join(__dirname, '../../public/assets/icon2.png');
        const iconPngPath = path.join(__dirname, '../../public/assets/icon.png');
        const logoPath = path.join(__dirname, '../../public/assets/logo.png');
        const qrCodePath = path.join(__dirname, '../../public/assets/shresht-systems-payment-QR-code.jpg');

        try {
            // Load both CSS files
            const documentStyles = fs.readFileSync(documentStylesPath, 'utf-8');
            const quotationStyles = fs.readFileSync(quotationStylesPath, 'utf-8');

            // Convert images to base64
            const iconBuffer = fs.readFileSync(iconPath);
            const iconDataUri = `data:image/png;base64,${iconBuffer.toString('base64')}`;

            const iconPngBuffer = fs.readFileSync(iconPngPath);
            const iconPngDataUri = `data:image/png;base64,${iconPngBuffer.toString('base64')}`;

            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

            const qrCodeBuffer = fs.readFileSync(qrCodePath);
            const qrCodeBase64 = `data:image/jpeg;base64,${qrCodeBuffer.toString('base64')}`;

            // Replace image paths in both CSS files - support a few common path formats
            const replaceUrl = (cssText, fileName, dataUri) => {
                const patterns = [
                    new RegExp(`url\\(["']?\\.{2}\\/{1,2}assets\\/${fileName}["']?\\)`, 'g'),
                    new RegExp(`url\\(["']?\\.{1}\\/assets\\/${fileName}["']?\\)`, 'g'),
                    new RegExp(`url\\(["']?assets\\/${fileName}["']?\\)`, 'g'),
                    new RegExp(`url\\(["']?\\/assets\\/${fileName}["']?\\)`, 'g'),
                ];
                let result = cssText;
                patterns.forEach(pat => { result = result.replace(pat, `url("${dataUri}")`); });
                return result;
            };

            const processedDocumentStyles = replaceUrl(documentStyles, 'icon2.png', iconDataUri);
            const processedDocumentStyles2 = replaceUrl(processedDocumentStyles, 'icon.png', iconPngDataUri);
            const processedDocumentStyles3 = replaceUrl(processedDocumentStyles2, 'logo.png', logoBase64);
            const processedDocumentStyles4 = replaceUrl(processedDocumentStyles3, 'shresht-systems-payment-QR-code.jpg', qrCodeBase64);

            const processedQuotationStyles = replaceUrl(quotationStyles, 'icon2.png', iconDataUri);
            const processedQuotationStyles2 = replaceUrl(processedQuotationStyles, 'icon.png', iconPngDataUri);
            const processedQuotationStyles3 = replaceUrl(processedQuotationStyles2, 'logo.png', logoBase64);
            const processedQuotationStyles4 = replaceUrl(processedQuotationStyles3, 'shresht-systems-payment-QR-code.jpg', qrCodeBase64);

            // Combine both CSS files
            const combinedCSS = `
/* Document Styles */
${processedDocumentStyles4}

/* Quotation Styles */
${processedQuotationStyles4}
`;

            return {
                css: combinedCSS,
                iconDataUri,
                iconPngDataUri,
                logoBase64,
                qrCodeBase64
            };
        } catch (error) {
            logger.error('Error loading assets', { error });
            throw error;
        }
    }

    /**
     * Process HTML content and replace image paths with base64
     */
    processContent(content, assets) {
        let processed = content;
        // Replace all variations of image source paths
        const replaceSrc = (text, patterns, dataUri) => {
            let out = text;
            patterns.forEach(pat => { out = out.replace(pat, `src="${dataUri}"`); });
            return out;
        };

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/icon\.png["']/g,
            /src=["']\.\.\\assets\\icon\.png["']/g,
            /src=["']\.\/assets\/icon\.png["']/g,
            /src=["']assets\/icon\.png["']/g,
            /src=["']\/assets\/icon\.png["']/g
        ], assets.iconPngDataUri);

        // Also replace data-src and srcset occurrences
        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/icon\.png["']/g,
            /srcset=["']\.\.\/assets\/icon\.png["']/g
        ], assets.iconPngDataUri);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/icon2\.png["']/g,
            /src=["']\.\.\\assets\\icon2\.png["']/g,
            /src=["']\.\/assets\/icon2\.png["']/g,
            /src=["']assets\/icon2\.png["']/g,
            /src=["']\/assets\/icon2\.png["']/g
        ], assets.iconDataUri);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/icon2\.png["']/g,
            /srcset=["']\.\.\/assets\/icon2\.png["']/g
        ], assets.iconDataUri);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/logo\.png["']/g,
            /src=["']\.\.\\assets\\logo\.png["']/g,
            /src=["']\.\/assets\/logo\.png["']/g,
            /src=["']assets\/logo\.png["']/g,
            /src=["']\/assets\/logo\.png["']/g
        ], assets.logoBase64);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/logo\.png["']/g,
            /srcset=["']\.\.\/assets\/logo\.png["']/g
        ], assets.logoBase64);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\.\.\\assets\\shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\/assets\/shresht-systems-payment-QR-code\.jpg["']/g
        ], assets.qrCodeBase64);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /srcset=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g
        ], assets.qrCodeBase64);
        
        // Also handle paths that might have different formats
        processed = processed.replace(/src=["']\.\.\\assets\\icon\.png["']/g, `src="${assets.iconPngDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\icon2\.png["']/g, `src="${assets.iconDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\logo\.png["']/g, `src="${assets.logoBase64}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\shresht-systems-payment-QR-code\.jpg["']/g, `src="${assets.qrCodeBase64}"`);
        return processed;
    }

    /**
     * Construct the full HTML document with styles and assets
     */
    async buildFullHTML(htmlContent) {
        const assets = await this.loadAssets();
        const processedContent = this.processContent(htmlContent, assets);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    /* Reset and base styles */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    html, body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    @media print {
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .preview-container {
                            page-break-after: always;
                        }
                        
                        .preview-container:last-child {
                            page-break-after: auto;
                        }
                    }
                    
                    ${assets.css}
                    
                    /* Print overrides - page fitting */
                    .preview-container {
                        width: 210mm !important;
                        max-width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 25px 30px !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        background: #ffffff url("${assets.iconDataUri}") no-repeat center/40% !important;
                        position: relative;
                        overflow: visible !important;
                    }
                    
                    /* Pages WITHOUT items table - fixed height */
                    .preview-container:has(.quotation-letter-content),
                    .preview-container:has(.terms-section):not(:has(.items-section)) {
                        height: 297mm !important;
                        max-height: 297mm !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    
                    /* Pages WITH items table - natural height */
                    .preview-container:has(.items-section) {
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    
                    /* Items section - no extra space */
                    .doc-quotation .items-section {
                        margin-bottom: 0 !important;
                    }
                    
                    /* Fifth section immediately after table */
                    .doc-quotation .fifth-section {
                        margin-top: 20px !important;
                        page-break-inside: avoid !important;
                    }
                    
                    /* Compact letter content */
                    .doc-quotation .quotation-letter-content {
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                        margin: 15px 0 !important;
                    }
                    
                    .doc-quotation .quotation-letter-content p {
                        margin: 8px 0 !important;
                    }
                    
                    .doc-quotation .quotation-letter-content ul {
                        margin: 8px 0 15px 0 !important;
                        padding-left: 25px !important;
                    }
                    
                    .doc-quotation .quotation-letter-content ul li {
                        margin: 5px 0 !important;
                    }
                    
                    /* Compact terms section */
                    .doc-quotation .terms-section {
                        font-size: 12px !important;
                        line-height: 1.4 !important;
                        padding: 12px 15px !important;
                        margin: 10px 0 !important;
                    }
                    
                    .doc-quotation .closing-section {
                        font-size: 13px !important;
                        padding: 12px 15px !important;
                        margin: 10px 0 !important;
                    }
                    
                    /* Compact header */
                    .doc-quotation .header {
                        background: #1a365d !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        padding: 15px 25px !important;
                        margin-bottom: 15px !important;
                    }
                    
                    .doc-quotation .header .quotation-brand-text h1 {
                        font-size: 24px !important;
                    }
                    
                    .doc-quotation .header .company-details p {
                        font-size: 12px !important;
                    }
                    
                    .doc-quotation .title {
                        padding: 10px 15px !important;
                        font-size: 18px !important;
                        margin-bottom: 15px !important;
                    }
                    
                    .doc-quotation table th {
                        background: #1a365d !important;
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        padding: 8px 10px !important;
                        font-size: 11px !important;
                    }
                    
                    .doc-quotation table td {
                        padding: 8px 10px !important;
                        font-size: 12px !important;
                    }
                    
                    .totals-section .totals-section-sub1 p:last-child,
                    .totals-section .totals-section-sub2 p:last-child {
                        background: #1a365d !important;
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .doc-quotation .notes-section {
                        padding: 10px 15px !important;
                        font-size: 12px !important;
                    }
                </style>
            </head>
            <body>
                ${processedContent}
            </body>
            </html>
        `;
    }

    /**
     * Create a hidden window and load content
     */
    async createHiddenWindow(fullHTML, mainWindow) {
        const win = new BrowserWindow({
            show: false,
            parent: mainWindow || undefined,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false, // Needed for local resource loading if any
                allowRunningInsecureContent: true
            }
        });

        // Write HTML to a temporary file
        const tempHtmlPath = path.join(os.tmpdir(), `print-${Date.now()}.html`);
        try {
            fs.writeFileSync(tempHtmlPath, fullHTML, 'utf8');
            this.tempFiles.add(tempHtmlPath);
        } catch (writeErr) {
            logger.error('Failed to write temporary HTML file', { error: writeErr.message });
            throw writeErr;
        }

        try {
            await win.loadFile(tempHtmlPath);
            
            // Wait for fonts
            try {
                await win.webContents.executeJavaScript('document.fonts.ready');
            } catch (e) {
                logger.warn('Font readiness wait failed', { error: e.message });
            }
            
            // Small delay for rendering
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return { win, tempHtmlPath };
        } catch (error) {
            if (!win.isDestroyed()) win.close();
            throw error;
        }
    }

    /**
     * Print HTML content (opens system print dialog)
     */
    async print(htmlContent, options = {}) {
        const { mainWindow = null } = options;
        let win = null;
        let tempHtmlPath = null;

        try {
            const fullHTML = await this.buildFullHTML(htmlContent);
            const result = await this.createHiddenWindow(fullHTML, mainWindow);
            win = result.win;
            tempHtmlPath = result.tempHtmlPath;

            const printed = await new Promise((resolve) => {
                win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
                    resolve({ success, failureReason });
                });
            });

            if (printed.success) {
                logger.info('Print dialog opened successfully');
                return { success: true };
            } else {
                logger.warn('Print failed or cancelled', { reason: printed.failureReason });
                return { success: false, error: printed.failureReason };
            }

        } catch (error) {
            logger.error('Error printing', { error });
            return { success: false, error: error.message };
        } finally {
            if (win && !win.isDestroyed()) {
                win.close();
            }
            this.cleanupTempFile(tempHtmlPath);
        }
    }

    /**
     * Generate PDF from HTML content
     */
    async generatePDF(htmlContent, outputPath) {
        let win = null;
        let tempHtmlPath = null;

        try {
            const fullHTML = await this.buildFullHTML(htmlContent);
            const result = await this.createHiddenWindow(fullHTML, null);
            win = result.win;
            tempHtmlPath = result.tempHtmlPath;

            const pdfData = await win.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
            });

            fs.writeFileSync(outputPath, pdfData);
            logger.info(`PDF generated successfully: ${outputPath}`);
            return { success: true, path: outputPath };

        } catch (error) {
            logger.error('Error generating PDF', { error });
            return { success: false, error: error.message };
        } finally {
            if (win && !win.isDestroyed()) {
                win.close();
            }
            this.cleanupTempFile(tempHtmlPath);
        }
    }

    cleanupTempFile(path) {
        if (path && fs.existsSync(path)) {
            try {
                fs.unlinkSync(path);
                this.tempFiles.delete(path);
            } catch (e) {
                logger.warn('Failed to delete temp file', { path, error: e.message });
            }
        }
    }
}

// Create singleton instance
const quotationPrintHandler = new QuotationPrintHandler();

/**
 * Setup IPC handlers for Quotation printing
 */
function setupQuotationHandlers(mainWindow, ipcMain) {
    const safeSend = (sender, channel, payload) => {
        try {
            if (sender && !sender.isDestroyed()) {
                sender.send(channel, payload);
            }
        } catch (err) {
            logger.warn('safeSend: failed to send IPC', { error: err.message });
        }
    };

    // Handle quotation print/PDF requests
    ipcMain.on('PrintQuatation', async (event, { content, mode, name }) => {
        try {
            if (mode === 'print') {
                safeSend(event.sender, 'printStarted');
                const result = await quotationPrintHandler.print(content, { mainWindow });
                if (!result.success) {
                    safeSend(event.sender, 'printFailed', { error: result.error });
                } else {
                    safeSend(event.sender, 'printDone');
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await quotationPrintHandler.generatePDF(content, filePath);
                    safeSend(event.sender, 'PDFSaved', result);
                }
            }
        } catch (error) {
            logger.error('Error in Quotation print handler', { error });
            safeSend(event.sender, 'printProcessError', { error: error.message });
        }
    });

    // Handle general document print/PDF requests (reusing the same handler for now)
    ipcMain.on('PrintDoc', async (event, { content, mode, name }) => {
        try {
            if (mode === 'print') {
                safeSend(event.sender, 'printStarted');
                const result = await quotationPrintHandler.print(content, { mainWindow });
                if (!result.success) {
                    safeSend(event.sender, 'printFailed', { error: result.error });
                } else {
                    safeSend(event.sender, 'printDone');
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await quotationPrintHandler.generatePDF(content, filePath);
                    safeSend(event.sender, 'PDFSaved', result);
                }
            }
        } catch (error) {
            logger.error('Error in Document print handler', { error });
            safeSend(event.sender, 'printProcessError', { error: error.message });
        }
    });

    logger.info('Quotation print handlers registered successfully');
}

module.exports = { setupQuotationHandlers, quotationPrintHandler };
