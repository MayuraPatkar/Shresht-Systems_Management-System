/**
 * Native Electron Print Handler
 * Replaces Puppeteer for faster, lighter printing using hidden BrowserWindows.
 */

import { BrowserWindow, dialog, shell, IpcMain, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import logger from "./logger";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface PrintAssets {
    css: string;
    iconDataUri: string;
    iconPngDataUri: string;
    logoBase64: string;
    qrCodeBase64: string;
}

interface PrintResult {
    success: boolean;
    error?: string;
    path?: string;
    canceled?: boolean;
}

interface PrintOptions {
    mainWindow?: BrowserWindow | null;
}

// ---------------------------------------------------------------------------
// QuotationPrintHandler Class
// ---------------------------------------------------------------------------

class QuotationPrintHandler {
    private tempFiles: Set<string>;

    constructor() {
        this.tempFiles = new Set();
    }

    /**
     * Load CSS and image assets as base64
     */
    async loadAssets(): Promise<PrintAssets> {
        const documentStylesPath = path.join(__dirname, "../../public/css/shared/documentStyles.css");
        const quotationStylesPath = path.join(__dirname, "../../public/css/shared/quotationStyles.css");
        const iconPath = path.join(__dirname, "../../public/assets/icon2.png");
        const iconPngPath = path.join(__dirname, "../../public/assets/icon.png");
        const logoPath = path.join(__dirname, "../../public/assets/logo.png");
        const qrCodePath = path.join(__dirname, "../../public/assets/shresht-systems-payment-QR-code.jpg");

        try {
            const documentStyles = fs.readFileSync(documentStylesPath, "utf-8");
            const quotationStyles = fs.readFileSync(quotationStylesPath, "utf-8");

            const iconBuffer = fs.readFileSync(iconPath);
            const iconDataUri = `data:image/png;base64,${iconBuffer.toString("base64")}`;

            const iconPngBuffer = fs.readFileSync(iconPngPath);
            const iconPngDataUri = `data:image/png;base64,${iconPngBuffer.toString("base64")}`;

            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

            const qrCodeBuffer = fs.readFileSync(qrCodePath);
            const qrCodeBase64 = `data:image/jpeg;base64,${qrCodeBuffer.toString("base64")}`;

            // Replace image paths in CSS files
            const replaceUrl = (cssText: string, fileName: string, dataUri: string): string => {
                const patterns = [
                    new RegExp(`url\\(["']?\\.{2}\\/{1,2}assets\\/${fileName}["']?\\)`, "g"),
                    new RegExp(`url\\(["']?\\.{1}\\/assets\\/${fileName}["']?\\)`, "g"),
                    new RegExp(`url\\(["']?assets\\/${fileName}["']?\\)`, "g"),
                    new RegExp(`url\\(["']?\\/assets\\/${fileName}["']?\\)`, "g"),
                ];
                let result = cssText;
                patterns.forEach((pat) => {
                    result = result.replace(pat, `url("${dataUri}")`);
                });
                return result;
            };

            let processedDoc = replaceUrl(documentStyles, "icon2.png", iconDataUri);
            processedDoc = replaceUrl(processedDoc, "icon.png", iconPngDataUri);
            processedDoc = replaceUrl(processedDoc, "logo.png", logoBase64);
            processedDoc = replaceUrl(processedDoc, "shresht-systems-payment-QR-code.jpg", qrCodeBase64);

            let processedQuot = replaceUrl(quotationStyles, "icon2.png", iconDataUri);
            processedQuot = replaceUrl(processedQuot, "icon.png", iconPngDataUri);
            processedQuot = replaceUrl(processedQuot, "logo.png", logoBase64);
            processedQuot = replaceUrl(processedQuot, "shresht-systems-payment-QR-code.jpg", qrCodeBase64);

            const combinedCSS = `
/* Document Styles */
${processedDoc}

/* Quotation Styles */
${processedQuot}
`;

            return { css: combinedCSS, iconDataUri, iconPngDataUri, logoBase64, qrCodeBase64 };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("Asset load failed", { service: "print_handler", error: message });
            throw error;
        }
    }

    /**
     * Process HTML content and replace image paths with base64
     */
    processContent(content: string, assets: PrintAssets): string {
        let processed = content;

        const replaceSrc = (text: string, patterns: RegExp[], dataUri: string): string => {
            let out = text;
            patterns.forEach((pat) => {
                out = out.replace(pat, `src="${dataUri}"`);
            });
            return out;
        };

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/icon\.png["']/g,
            /src=["']\.\.\\assets\\icon\.png["']/g,
            /src=["']\.\/assets\/icon\.png["']/g,
            /src=["']assets\/icon\.png["']/g,
            /src=["']\/assets\/icon\.png["']/g,
        ], assets.iconPngDataUri);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/icon\.png["']/g,
            /srcset=["']\.\.\/assets\/icon\.png["']/g,
        ], assets.iconPngDataUri);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/icon2\.png["']/g,
            /src=["']\.\.\\assets\\icon2\.png["']/g,
            /src=["']\.\/assets\/icon2\.png["']/g,
            /src=["']assets\/icon2\.png["']/g,
            /src=["']\/assets\/icon2\.png["']/g,
        ], assets.iconDataUri);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/icon2\.png["']/g,
            /srcset=["']\.\.\/assets\/icon2\.png["']/g,
        ], assets.iconDataUri);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/logo\.png["']/g,
            /src=["']\.\.\\assets\\logo\.png["']/g,
            /src=["']\.\/assets\/logo\.png["']/g,
            /src=["']assets\/logo\.png["']/g,
            /src=["']\/assets\/logo\.png["']/g,
        ], assets.logoBase64);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/logo\.png["']/g,
            /srcset=["']\.\.\/assets\/logo\.png["']/g,
        ], assets.logoBase64);

        processed = replaceSrc(processed, [
            /src=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\.\.\\assets\\shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /src=["']\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
        ], assets.qrCodeBase64);

        processed = replaceSrc(processed, [
            /data-src=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
            /srcset=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g,
        ], assets.qrCodeBase64);

        // Handle backslash paths
        processed = processed.replace(/src=["']\.\.\\assets\\icon\.png["']/g, `src="${assets.iconPngDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\icon2\.png["']/g, `src="${assets.iconDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\logo\.png["']/g, `src="${assets.logoBase64}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\shresht-systems-payment-QR-code\.jpg["']/g, `src="${assets.qrCodeBase64}"`);

        return processed;
    }

    /**
     * Construct the full HTML document with styles and assets
     */
    async buildFullHTML(htmlContent: string): Promise<string> {
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
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    @page { size: A4; margin: 0; }
                    @media print {
                        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .preview-container { page-break-after: always; }
                        .preview-container:last-child { page-break-after: auto; }
                    }
                    ${assets.css}
                    .preview-container {
                        width: 210mm !important; max-width: 210mm !important; min-height: 297mm !important;
                        margin: 0 !important; padding: 25px 30px !important;
                        box-shadow: none !important; border: none !important; border-radius: 0 !important;
                        background: #ffffff url("${assets.iconDataUri}") no-repeat center/40% !important;
                        position: relative; overflow: visible !important;
                    }
                    .preview-container:has(.quotation-letter-content),
                    .preview-container:has(.terms-section):not(:has(.items-section)) {
                        height: 297mm !important; max-height: 297mm !important; overflow: hidden !important;
                        display: flex !important; flex-direction: column !important;
                    }
                    .preview-container:has(.items-section) {
                        height: auto !important; min-height: auto !important; max-height: none !important;
                        overflow: visible !important; display: block !important;
                    }
                    .doc-quotation .items-section { margin-bottom: 0 !important; }
                    .doc-quotation .fifth-section { margin-top: 20px !important; page-break-inside: avoid !important; }
                    .doc-quotation .quotation-letter-content { font-size: 13px !important; line-height: 1.5 !important; margin: 15px 0 !important; }
                    .doc-quotation .quotation-letter-content p { margin: 8px 0 !important; }
                    .doc-quotation .quotation-letter-content ul { margin: 8px 0 15px 0 !important; padding-left: 25px !important; }
                    .doc-quotation .quotation-letter-content ul li { margin: 5px 0 !important; }
                    .doc-quotation .terms-section { font-size: 12px !important; line-height: 1.4 !important; padding: 12px 15px !important; margin: 10px 0 !important; }
                    .doc-quotation .closing-section { font-size: 13px !important; padding: 12px 15px !important; margin: 10px 0 !important; }
                    .doc-quotation .header {
                        background: #1a365d !important; -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important; padding: 15px 25px !important; margin-bottom: 15px !important;
                    }
                    .doc-quotation .header .quotation-brand-text h1 { font-size: 24px !important; }
                    .doc-quotation .header .company-details p { font-size: 12px !important; }
                    .doc-quotation .title { padding: 10px 15px !important; font-size: 18px !important; margin-bottom: 15px !important; }
                    .doc-quotation table th {
                        background: #1a365d !important; color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                        padding: 8px 10px !important; font-size: 11px !important;
                    }
                    .doc-quotation table td { padding: 8px 10px !important; font-size: 12px !important; }
                    .totals-section .totals-section-sub1 p:last-child,
                    .totals-section .totals-section-sub2 p:last-child {
                        background: #1a365d !important; color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    }
                    .doc-quotation .notes-section { padding: 10px 15px !important; font-size: 12px !important; }
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
    async createHiddenWindow(
        fullHTML: string,
        mainWindow: BrowserWindow | null
    ): Promise<{ win: BrowserWindow; tempHtmlPath: string }> {
        const win = new BrowserWindow({
            show: false,
            parent: mainWindow || undefined,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false,
            },
        });

        const tempHtmlPath = path.join(os.tmpdir(), `print-${Date.now()}.html`);
        try {
            fs.writeFileSync(tempHtmlPath, fullHTML, "utf8");
            this.tempFiles.add(tempHtmlPath);
        } catch (writeErr: unknown) {
            const message = writeErr instanceof Error ? writeErr.message : String(writeErr);
            logger.error("Temp HTML write failed", { service: "print_handler", path: tempHtmlPath, error: message });
            throw writeErr;
        }

        try {
            await win.loadFile(tempHtmlPath);

            try {
                await win.webContents.executeJavaScript("document.fonts.ready");
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                logger.warn("Font readiness wait timeout", { service: "print_handler", error: message });
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
            return { win, tempHtmlPath };
        } catch (error) {
            if (!win.isDestroyed()) win.close();
            throw error;
        }
    }

    /**
     * Print HTML content (opens system print dialog)
     */
    async print(htmlContent: string, options: PrintOptions = {}): Promise<PrintResult> {
        const { mainWindow = null } = options;
        let win: BrowserWindow | null = null;
        let tempHtmlPath: string | null = null;

        try {
            const fullHTML = await this.buildFullHTML(htmlContent);
            const result = await this.createHiddenWindow(fullHTML, mainWindow);
            win = result.win;
            tempHtmlPath = result.tempHtmlPath;

            const printed = await new Promise<{ success: boolean; failureReason?: string }>((resolve) => {
                win!.webContents.print(
                    { silent: false, printBackground: true },
                    (success: boolean, failureReason: string) => {
                        resolve({ success, failureReason });
                    }
                );
            });

            if (printed.success) {
                return { success: true };
            } else {
                logger.warn("Print failed or cancelled", { reason: printed.failureReason });
                return { success: false, error: printed.failureReason };
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("Print process failed", { service: "print_handler", error: message });
            return { success: false, error: message };
        } finally {
            if (win && !win.isDestroyed()) win.close();
            this.cleanupTempFile(tempHtmlPath);
        }
    }

    /**
     * Generate PDF from HTML content
     */
    async generatePDF(htmlContent: string, outputPath: string): Promise<PrintResult> {
        let win: BrowserWindow | null = null;
        let tempHtmlPath: string | null = null;

        try {
            const fullHTML = await this.buildFullHTML(htmlContent);
            const result = await this.createHiddenWindow(fullHTML, null);
            win = result.win;
            tempHtmlPath = result.tempHtmlPath;

            const pdfData = await win.webContents.printToPDF({
                printBackground: true,
                pageSize: "A4",
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
            });

            fs.writeFileSync(outputPath, pdfData);
            return { success: true, path: outputPath };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("PDF generation failed", { service: "print_handler", error: message });
            return { success: false, error: message };
        } finally {
            if (win && !win.isDestroyed()) win.close();
            this.cleanupTempFile(tempHtmlPath);
        }
    }

    cleanupTempFile(filePath: string | null): void {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                this.tempFiles.delete(filePath);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                logger.warn("Temp file cleanup failed", { service: "print_handler", path: filePath, error: message });
            }
        }
    }
}

// Create singleton instance
const quotationPrintHandler = new QuotationPrintHandler();

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

interface PrintDocPayload {
    content: string;
    mode: "print" | "savePDF";
    name: string;
}

/**
 * Setup IPC handlers for Quotation printing
 */
function setupQuotationHandlers(mainWindow: BrowserWindow, ipcMain: IpcMain): void {
    const safeSend = (sender: Electron.WebContents | null, channel: string, payload?: unknown): void => {
        try {
            if (sender && !sender.isDestroyed()) {
                sender.send(channel, payload);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn("safeSend: failed to send IPC", { error: message });
        }
    };

    // Handle quotation print/PDF requests
    ipcMain.on("PrintQuatation", async (event: IpcMainEvent, { content, mode, name }: PrintDocPayload) => {
        try {
            if (mode === "print") {
                safeSend(event.sender, "printStarted");
                const result = await quotationPrintHandler.print(content, { mainWindow });
                if (!result.success) {
                    safeSend(event.sender, "printFailed", { error: result.error });
                } else {
                    safeSend(event.sender, "printDone");
                }
            } else if (mode === "savePDF") {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (filePath) {
                    const result = await quotationPrintHandler.generatePDF(content, filePath);
                    safeSend(event.sender, "PDFSaved", result);
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("Quotation print handler error", { service: "print_handler", error: message });
            safeSend(event.sender, "printProcessError", { error: message });
        }
    });

    // Handle general document print/PDF requests
    ipcMain.handle("PrintDoc", async (event: IpcMainInvokeEvent, { content, mode, name }: PrintDocPayload): Promise<PrintResult> => {
        try {
            if (mode === "print") {
                safeSend(event.sender, "printStarted");
                const result = await quotationPrintHandler.print(content, { mainWindow });
                if (!result.success) {
                    safeSend(event.sender, "printFailed", { error: result.error });
                    return { success: false, error: result.error };
                } else {
                    safeSend(event.sender, "printDone");
                    return { success: true };
                }
            } else if (mode === "savePDF") {
                const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
                    title: "Save PDF",
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
                });

                if (canceled || !filePath) {
                    return { success: false, canceled: true };
                }

                return await quotationPrintHandler.generatePDF(content, filePath);
            }

            return { success: false, error: "Unknown mode" };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error("Document print handler error", { service: "print_handler", error: message });
            return { success: false, error: message };
        }
    });
}

export { setupQuotationHandlers, quotationPrintHandler };
