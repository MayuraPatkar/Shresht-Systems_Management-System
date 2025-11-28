const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const { dialog } = require('electron');

/**
 * Puppeteer-based PDF and Print Handler
 * Provides better rendering quality and more control over PDF generation
 * Specifically optimized for quotation documents to match preview exactly
 */

class PuppeteerPrintHandler {
    constructor() {
        this.browser = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Puppeteer browser instance
     */
    async initialize() {
        if (this.isInitialized && this.browser) {
            // Check if browser is still connected
            try {
                if (this.browser.isConnected()) {
                    return;
                }
            } catch (e) {
                // Browser disconnected, reinitialize
                this.isInitialized = false;
                this.browser = null;
            }
        }

        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--font-render-hinting=none'
                ]
            });
            this.isInitialized = true;
            log.info('Puppeteer browser initialized successfully');
        } catch (error) {
            log.error('Failed to initialize Puppeteer:', error);
            throw error;
        }
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

            // Replace image paths in both CSS files
            const processedDocumentStyles = documentStyles.replace(/url\(["']?\.\.\/\.\.\/assets\/icon2\.png["']?\)/g, `url("${iconDataUri}")`);
            const processedQuotationStyles = quotationStyles.replace(/url\(["']?\.\.\/\.\.\/assets\/icon2\.png["']?\)/g, `url("${iconDataUri}")`);

            // Combine both CSS files
            const combinedCSS = `
/* Document Styles */
${processedDocumentStyles}

/* Quotation Styles */
${processedQuotationStyles}
`;

            return {
                css: combinedCSS,
                iconDataUri,
                iconPngDataUri,
                logoBase64,
                qrCodeBase64
            };
        } catch (error) {
            log.error('Error loading assets:', error);
            throw error;
        }
    }

    /**
     * Process HTML content and replace image paths with base64
     */
    processContent(content, assets) {
        let processed = content;
        // Replace all variations of image source paths
        processed = processed.replace(/src=["']\.\.\/assets\/icon\.png["']/g, `src="${assets.iconPngDataUri}"`);
        processed = processed.replace(/src=["']\.\.\/assets\/icon2\.png["']/g, `src="${assets.iconDataUri}"`);
        processed = processed.replace(/src=["']\.\.\/assets\/logo\.png["']/g, `src="${assets.logoBase64}"`);
        processed = processed.replace(/src=["']\.\.\/assets\/shresht-systems-payment-QR-code\.jpg["']/g, `src="${assets.qrCodeBase64}"`);
        // Also handle paths that might have different formats
        processed = processed.replace(/src=["']\.\.\\assets\\icon\.png["']/g, `src="${assets.iconPngDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\icon2\.png["']/g, `src="${assets.iconDataUri}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\logo\.png["']/g, `src="${assets.logoBase64}"`);
        processed = processed.replace(/src=["']\.\.\\assets\\shresht-systems-payment-QR-code\.jpg["']/g, `src="${assets.qrCodeBase64}"`);
        return processed;
    }

    /**
     * Generate PDF from HTML content
     * Optimized for quotation documents to match preview exactly
     */
    async generatePDF(htmlContent, outputPath) {
        try {
            await this.initialize();
            const assets = await this.loadAssets();
            const processedContent = this.processContent(htmlContent, assets);

            const fullHTML = `
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
                        
                        /* Page setup for print */
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        
                        @media print {
                            html, body {
                                width: 210mm;
                                height: 297mm;
                            }
                            
                            .preview-container {
                                page-break-after: always;
                                page-break-inside: avoid;
                            }
                            
                            .preview-container:last-child {
                                page-break-after: auto;
                            }
                        }
                        
                        /* Loaded CSS styles */
                        ${assets.css}
                        
                        /* Print-specific overrides for exact preview match */
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
                        
                        /* Pages WITHOUT items table - fixed height to prevent overflow */
                        .preview-container:has(.quotation-letter-content),
                        .preview-container:has(.terms-section):not(:has(.items-section)) {
                            height: 297mm !important;
                            max-height: 297mm !important;
                            overflow: hidden !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                        
                        /* Pages WITH items table - natural height, content flows */
                        .preview-container:has(.items-section) {
                            height: auto !important;
                            min-height: auto !important;
                            max-height: none !important;
                            overflow: visible !important;
                            display: block !important;
                            page-break-inside: avoid;
                        }
                        
                        /* Footer positioning - always at bottom for fixed pages */
                        .preview-container:has(.quotation-letter-content) footer,
                        .preview-container:has(.terms-section):not(:has(.items-section)) footer {
                            position: absolute !important;
                            bottom: 15px !important;
                            left: 0 !important;
                            right: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 30px !important;
                        }
                        
                        /* Footer for items pages - relative positioning */
                        .preview-container:has(.items-section) footer {
                            position: relative !important;
                            margin-top: 20px !important;
                            padding: 0 !important;
                        }
                        
                        /* Letter content page - ensure content fits */
                        .doc-quotation .quotation-letter-content {
                            font-size: 12px !important;
                            line-height: 1.5 !important;
                            margin: 15px 0 !important;
                            flex: 1;
                            overflow: hidden !important;
                        }
                        
                        .doc-quotation .quotation-letter-content p {
                            margin: 8px 0 !important;
                            line-height: 1.5 !important;
                        }
                        
                        .doc-quotation .quotation-letter-content ul {
                            margin: 8px 0 15px 0 !important;
                            padding-left: 25px !important;
                        }
                        
                        .doc-quotation .quotation-letter-content ul li {
                            margin: 5px 0 !important;
                            line-height: 1.4 !important;
                        }
                        
                        /* Signature block at end of letter */
                        .doc-quotation .quotation-letter-content p:last-child {
                            margin-top: 20px !important;
                            line-height: 1.6 !important;
                        }
                        
                        /* Terms section - compact for fitting */
                        .doc-quotation .terms-section {
                            font-size: 11px !important;
                            line-height: 1.4 !important;
                            padding: 12px 15px !important;
                            margin: 10px 0 !important;
                            max-height: calc(297mm - 200px) !important;
                            overflow: hidden !important;
                        }
                        
                        .doc-quotation .terms-section h3 {
                            font-size: 13px !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .doc-quotation .terms-section ul {
                            margin: 5px 0 !important;
                            padding-left: 20px !important;
                        }
                        
                        .doc-quotation .terms-section li {
                            margin: 4px 0 !important;
                            line-height: 1.4 !important;
                        }
                        
                        .doc-quotation .terms-section ul ul {
                            margin: 3px 0 !important;
                        }
                        
                        /* Closing section - compact */
                        .doc-quotation .closing-section {
                            font-size: 12px !important;
                            line-height: 1.5 !important;
                            padding: 12px 15px !important;
                            margin: 10px 0 !important;
                        }
                        
                        .doc-quotation .closing-section p {
                            margin: 5px 0 !important;
                        }
                        
                        /* Header - slightly more compact */
                        .doc-quotation .header {
                            background: #1a365d !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            padding: 15px 25px !important;
                            margin-bottom: 15px !important;
                        }
                        
                        .doc-quotation .header .quotation-brand-text h1 {
                            font-size: 22px !important;
                            line-height: 1.1 !important;
                        }
                        
                        .doc-quotation .header .company-details p {
                            font-size: 11px !important;
                            line-height: 1.4 !important;
                        }
                        
                        /* Title - compact */
                        .doc-quotation .title {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            padding: 10px 15px !important;
                            font-size: 16px !important;
                            margin-bottom: 15px !important;
                        }
                        
                        /* Date section */
                        .doc-quotation .quotation-letter-date {
                            margin: 10px 0 !important;
                        }
                        
                        /* Items section - natural flow, no extra spacing */
                        .doc-quotation .items-section {
                            margin-bottom: 0 !important;
                        }
                        
                        /* Fifth section (totals, bank details) - immediately after table */
                        .doc-quotation .fifth-section {
                            margin-top: 20px !important;
                            gap: 15px !important;
                            page-break-inside: avoid !important;
                        }
                        
                        .doc-quotation .fifth-section-sub3 {
                            padding: 8px 12px !important;
                            font-size: 12px !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .doc-quotation .fifth-section .bank-details {
                            padding: 12px !important;
                            gap: 12px !important;
                        }
                        
                        .doc-quotation .fifth-section .bank-details-sub2 p {
                            font-size: 11px !important;
                            line-height: 1.4 !important;
                            margin: 1px 0 !important;
                        }
                        
                        .doc-quotation .fifth-section .QR-code {
                            width: 80px !important;
                            height: 80px !important;
                            padding: 5px !important;
                        }
                        
                        .doc-quotation .fifth-section h3 {
                            font-size: 13px !important;
                            margin-bottom: 5px !important;
                            padding-bottom: 5px !important;
                        }
                        
                        .totals-section .totals-section-sub1 p,
                        .totals-section .totals-section-sub2 p {
                            padding: 8px 12px !important;
                            font-size: 12px !important;
                        }
                        
                        .totals-section .totals-section-sub1 p:last-child,
                        .totals-section .totals-section-sub2 p:last-child {
                            padding: 10px 12px !important;
                            font-size: 13px !important;
                        }
                        
                        /* Notes section - compact */
                        .doc-quotation .notes-section {
                            padding: 10px 15px !important;
                            margin: 10px 0 !important;
                            font-size: 11px !important;
                        }
                        
                        .doc-quotation .notes-section p {
                            margin-bottom: 5px !important;
                        }
                        
                        .doc-quotation .notes-section ul {
                            margin: 3px 0 !important;
                            padding-left: 18px !important;
                        }
                        
                        .doc-quotation .notes-section li {
                            margin: 3px 0 !important;
                            line-height: 1.4 !important;
                        }
                        
                        /* Table header colors */
                        .doc-quotation table th,
                        .doc-standard .fourth-section table th {
                            background: #1a365d !important;
                            color: #ffffff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            padding: 8px 10px !important;
                            font-size: 10px !important;
                        }
                        
                        .doc-quotation table td {
                            padding: 8px 10px !important;
                            font-size: 11px !important;
                        }
                        
                        /* Alternating row backgrounds */
                        .doc-quotation table tbody tr:nth-child(even),
                        .doc-standard .fourth-section table tbody tr:nth-child(even) {
                            background-color: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Totals section styling */
                        .totals-section .totals-section-sub1 p:last-child,
                        .totals-section .totals-section-sub2 p:last-child {
                            background: #1a365d !important;
                            color: #ffffff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .totals-section .totals-section-sub1 p {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Bank details section */
                        .bank-details {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Notes and terms sections */
                        .notes-section, .terms-section {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Continuation text */
                        .continuation-text {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            margin: 10px 0 !important;
                            padding: 6px !important;
                            font-size: 11px !important;
                        }
                        
                        /* Headline section */
                        .doc-quotation .headline-section {
                            font-size: 14px !important;
                            margin-bottom: 8px !important;
                        }
                    </style>
                </head>
                <body>
                    ${processedContent}
                </body>
                </html>
            `;

            const page = await this.browser.newPage();

            // Set viewport for A4 at 96 DPI (standard screen DPI)
            await page.setViewport({
                width: 794,  // A4 width in pixels at 96 DPI
                height: 1123, // A4 height in pixels at 96 DPI
                deviceScaleFactor: 2 // Higher quality rendering
            });

            await page.setContent(fullHTML, {
                waitUntil: ['networkidle0', 'domcontentloaded', 'load']
            });

            // Wait for fonts to load
            await page.evaluateHandle('document.fonts.ready');
            
            // Additional wait to ensure all content is rendered
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate PDF with settings optimized for exact preview match
            const pdfBuffer = await page.pdf({
                path: outputPath,
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                },
                displayHeaderFooter: false
            });

            await page.close();
            log.info(`PDF generated successfully: ${outputPath}`);
            return { success: true, path: outputPath };
        } catch (error) {
            log.error('Error generating PDF:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Print HTML content (opens system print dialog)
     */
    async print(htmlContent) {
        try {
            await this.initialize();
            const assets = await this.loadAssets();
            const processedContent = this.processContent(htmlContent, assets);

            const fullHTML = `
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
                        
                        /* Footer for fixed pages */
                        .preview-container:has(.quotation-letter-content) footer,
                        .preview-container:has(.terms-section):not(:has(.items-section)) footer {
                            position: absolute !important;
                            bottom: 15px !important;
                            left: 0 !important;
                            right: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 30px !important;
                        }
                        
                        /* Footer for items pages */
                        .preview-container:has(.items-section) footer {
                            position: relative !important;
                            margin-top: 20px !important;
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
                            font-size: 12px !important;
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
                            font-size: 11px !important;
                            line-height: 1.4 !important;
                            padding: 12px 15px !important;
                            margin: 10px 0 !important;
                        }
                        
                        .doc-quotation .closing-section {
                            font-size: 12px !important;
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
                            font-size: 22px !important;
                        }
                        
                        .doc-quotation .header .company-details p {
                            font-size: 11px !important;
                        }
                        
                        .doc-quotation .title {
                            padding: 10px 15px !important;
                            font-size: 16px !important;
                            margin-bottom: 15px !important;
                        }
                        
                        .doc-quotation table th {
                            background: #1a365d !important;
                            color: #ffffff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            padding: 8px 10px !important;
                            font-size: 10px !important;
                        }
                        
                        .doc-quotation table td {
                            padding: 8px 10px !important;
                            font-size: 11px !important;
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
                            font-size: 11px !important;
                        }
                    </style>
                </head>
                <body>
                    ${processedContent}
                </body>
                </html>
            `;

            const page = await this.browser.newPage();
            
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });
            
            await page.setContent(fullHTML, {
                waitUntil: ['networkidle0', 'domcontentloaded', 'load']
            });

            await page.evaluateHandle('document.fonts.ready');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate a temporary PDF and open with system viewer for printing
            const tempPath = path.join(require('os').tmpdir(), `print-${Date.now()}.pdf`);
            await page.pdf({
                path: tempPath,
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });

            await page.close();

            // Open the PDF with the default system viewer (which allows printing)
            const { shell } = require('electron');
            await shell.openPath(tempPath);

            log.info('Print dialog opened successfully');
            return { success: true };
        } catch (error) {
            log.error('Error printing:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cleanup browser instance
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
            log.info('Puppeteer browser closed');
        }
    }
}

// Create singleton instance
const puppeteerHandler = new PuppeteerPrintHandler();

/**
 * Setup IPC handlers for Puppeteer-based printing
 */
function setupPuppeteerHandlers(mainWindow, ipcMain) {
    // Handle quotation print/PDF requests
    ipcMain.on('PrintQuatation', async (event, { content, mode, name }) => {
        try {
            if (mode === 'print') {
                const result = await puppeteerHandler.print(content);
                if (!result.success) {
                    event.sender.send('printFailed', { error: result.error });
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await puppeteerHandler.generatePDF(content, filePath);
                    event.sender.send('PDFSaved', result);
                }
            }
        } catch (error) {
            log.error('Error in Puppeteer print handler:', error);
            event.sender.send('printProcessError', { error: error.message });
        }
    });

    // Handle general document print/PDF requests
    ipcMain.on('PrintDoc', async (event, { content, mode, name }) => {
        try {
            if (mode === 'print') {
                const result = await puppeteerHandler.print(content);
                if (!result.success) {
                    event.sender.send('printFailed', { error: result.error });
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await puppeteerHandler.generatePDF(content, filePath);
                    event.sender.send('PDFSaved', result);
                }
            }
        } catch (error) {
            log.error('Error in Puppeteer print handler:', error);
            event.sender.send('printProcessError', { error: error.message });
        }
    });

    log.info('Puppeteer print handlers registered successfully');
}

// Cleanup on app exit
process.on('exit', async () => {
    await puppeteerHandler.cleanup();
});

module.exports = { setupPuppeteerHandlers, puppeteerHandler };
