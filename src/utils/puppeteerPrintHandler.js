const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require("./logger");
const { dialog, BrowserWindow, shell } = require('electron');

/**
 * Puppeteer-based PDF and Print Handler
 * Provides better rendering quality and more control over PDF generation
 * Specifically optimized for quotation documents to match preview exactly
 */

class PuppeteerPrintHandler {
    constructor() {
        this.browser = null;
        this.isInitialized = false;
        this.tempFiles = new Set();
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

            // Add disconnect handler
            this.browser.on('disconnected', () => {
                logger.info('Puppeteer browser disconnected');
                this.browser = null;
                this.isInitialized = false;
            });

            this.isInitialized = true;
            logger.info('Puppeteer browser initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Puppeteer', { error });
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
            try {
                await page.evaluate(() => document.fonts.ready);
            } catch (e) {
                // If fonts API isn't available, continue
                logger.warn('Font readiness wait failed in generatePDF', { error: e.message });
            }

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
            logger.info(`PDF generated successfully: ${outputPath}`);
            return { success: true, path: outputPath };
        } catch (error) {
            logger.error('Error generating PDF', { error });
            return { success: false, error: error.message };
        }
    }

    /**
     * Print HTML content (opens system print dialog)
     */
    async print(htmlContent, options = {}) {
        const { useNativeDialog = true, mainWindow = null, fallbackOnError = true } = options;
        try {
            await this.initialize();
            // Reinitialize if browser disconnected
            if (!this.browser || !this.browser.isConnected()) {
                await this.initialize();
            }
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

            // Temporary HTML path used for BrowserWindow and temp PDF path used for fallback
            let tempHtmlPath = null;
            // First: try to print using a hidden BrowserWindow (native print dialog)
            if (useNativeDialog && typeof BrowserWindow !== 'undefined') {
                let win;
                try {
                    win = new BrowserWindow({
                        show: false,
                        parent: mainWindow || undefined,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            sandbox: false
                            ,
                            webSecurity: false,
                            allowRunningInsecureContent: true
                        }
                    });

                    // Write HTML to a temporary file and load it to avoid data URL length and loading issues
                    const os = require('os');
                    tempHtmlPath = path.join(os.tmpdir(), `print-${Date.now()}.html`);
                    logger.info('Temporary HTML file created for BrowserWindow print', { path: tempHtmlPath });
                    try {
                        fs.writeFileSync(tempHtmlPath, fullHTML, 'utf8');
                    } catch (writeErr) {
                        logger.warn('Failed to write temporary HTML file for BrowserWindow print', { error: writeErr.message });
                    }
                    // Track temp html file for cleanup
                    try { this.tempFiles.add(tempHtmlPath); } catch (e) { /* ignore */ }
                    await win.loadFile(tempHtmlPath);

                    // Wait until page loaded
                    await new Promise((resolve, reject) => {
                        const bwLoadTimeoutMs = 60000; // increase BrowserWindow load timeout
                        const timeout = setTimeout(() => {
                            reject(new Error('BrowserWindow load timeout'));
                        }, bwLoadTimeoutMs);
                        win.webContents.once('dom-ready', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    });

                    // Wait for fonts to be ready
                    try {
                        await win.webContents.executeJavaScript('document.fonts.ready');
                    } catch (e) {
                        logger.warn('Font readiness wait failed in BrowserWindow print', { error: e.message });
                    }

                    // Small delay to ensure rendering
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const printed = await new Promise((resolve) => {
                        win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
                            resolve({ success, failureReason });
                        });
                    });

                    // Don't close here; let finally close the win if created

                    if (printed.success) {
                        logger.info('Native print dialog opened successfully via BrowserWindow');
                        return { success: true };
                    }

                    // If print failed and fallback is disabled, return the failure
                    if (!fallbackOnError) {
                        return { success: false, error: printed.failureReason || 'Native print failed' };
                    }
                    // Else, continue to fallback to PDF-based printing
                    logger.warn('Native print failed, falling back to PDF open', { reason: printed.failureReason });
                } catch (err) {
                    logger.warn('BrowserWindow-based printing not available or failed, will fallback to PDF', { error: err.message });
                    // Continue to PDF fallback
                } finally {
                    if (win) {
                        try { win.close(); } catch(e) { /* ignore */ }
                    }
                    // Attempt to delete the temp HTML file we created
                    try {
                        if (typeof tempHtmlPath !== 'undefined' && tempHtmlPath) {
                            try { fs.unlinkSync(tempHtmlPath); } catch (unlinkErr) { /* ignore */ }
                            try { this.tempFiles.delete(tempHtmlPath); } catch(e){}
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            // ---------- FALLBACK: Use Puppeteer to generate a temporary PDF and open it ----------
            const createPage = async () => {
                // Ensure browser is connected or reinitialize
                if (!this.browser || !this.browser.isConnected()) {
                    await this.initialize();
                }
                return await this.browser.newPage();
            };

            let page;
            let tempPath = null;
            try {
                page = await createPage();

            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });

            // Try setting content with a retry in case the frame gets detached
            let setContentAttempts = 0;
            const maxSetContentAttempts = 2;
            while (setContentAttempts < maxSetContentAttempts) {
                try {
                    await page.setContent(fullHTML, {
                        waitUntil: ['networkidle0', 'domcontentloaded', 'load']
                    });
                    break; // success
                } catch (e) {
                    setContentAttempts++;
                    logger.warn('setContent attempt failed', { attempt: setContentAttempts, error: e.message });
                    try { await page.close(); } catch (closeErr) { /* ignore */ }
                    if (setContentAttempts < maxSetContentAttempts) {
                        page = await createPage();
                        // small backoff
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } else {
                        throw e; // rethrow the last error
                    }
                }
            }

            try {
                await page.evaluate(() => document.fonts.ready);
            } catch (e) {
                logger.warn('Font readiness wait failed in print fallback', { error: e.message });
            }
            await new Promise(resolve => setTimeout(resolve, 1000));

                // Generate a temporary PDF and open with system viewer for printing
                tempPath = path.join(require('os').tmpdir(), `print-${Date.now()}.pdf`);
                // Track temp files for cleanup
                try { this.tempFiles.add(tempPath); } catch (e) { /* ignore */ }
                await page.pdf({
                path: tempPath,
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });

                logger.info('Temporary PDF generated for printing', { path: tempPath });

            } finally {
                // Ensure the page is always closed if we created one
                if (page) {
                    try { await page.close(); } catch (e) { /* ignore */ }
                }
            }

            // Open the PDF with the default system viewer (which allows printing)
            if (!tempPath) {
                logger.error('No temporary PDF path available to open');
                return { success: false, error: 'PDF generation failed' };
            }
            const openResult = await shell.openPath(tempPath);
            if (typeof openResult === 'string' && openResult.length > 0) {
                logger.error('Failed to open PDF in viewer', { openResult });
                return { success: false, error: openResult };
            }

            // Schedule deletion of temp PDF to avoid accumulation
            const deleteAfterMs = 60 * 1000; // 1 minute
            setTimeout(async () => {
                try {
                    await fs.promises.unlink(tempPath);
                    logger.info('Deleted temporary PDF', { path: tempPath });
                    // Remove from set
                    try { this.tempFiles.delete(tempPath); } catch(e){}
                } catch (unlinkErr) {
                    // Not critical if deletion fails
                    logger.warn('Failed to delete temporary PDF', { error: unlinkErr.message });
                }
            }, deleteAfterMs);

            logger.info('Print dialog opened successfully');
            return { success: true };
        } catch (error) {
            logger.error('Error printing', { error });
            return { success: false, error: error.message };
        }
    }

    /**
     * Cleanup browser instance
     */
    async cleanup() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                logger.warn('Error closing Puppeteer browser (might be already closed)', { error: error.message });
            }
            this.browser = null;
            this.isInitialized = false;
            logger.info('Puppeteer browser closed');
        }
        // Attempt to clean up any remaining temporary files we've created
        if (this.tempFiles && this.tempFiles.size > 0) {
            const files = Array.from(this.tempFiles);
            const unlinkPromises = files.map(async (p) => {
                try {
                    if (fs.existsSync(p)) {
                        await fs.promises.unlink(p);
                        logger.info('Deleted temporary file on cleanup', { path: p });
                    }
                } catch (e) {
                    logger.warn('Failed to delete temporary file on cleanup', { path: p, error: e.message });
                }
            });
            await Promise.all(unlinkPromises);
            this.tempFiles.clear();
        }
    }
}

// Create singleton instance
const puppeteerHandler = new PuppeteerPrintHandler();

/**
 * Setup IPC handlers for Puppeteer-based printing
 */
function setupPuppeteerHandlers(mainWindow, ipcMain) {
    const safeSend = (sender, channel, payload) => {
        try {
            if (sender && !sender.isDestroyed()) {
                sender.send(channel, payload);
            } else {
                logger.warn(`safeSend: WebContents destroyed - channel:${channel}`);
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
                const result = await puppeteerHandler.print(content, { useNativeDialog: true, mainWindow });
                if (!result.success) {
                    safeSend(event.sender, 'printFailed', { error: result.error });
                }
                else {
                    safeSend(event.sender, 'printDone');
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await puppeteerHandler.generatePDF(content, filePath);
                    safeSend(event.sender, 'PDFSaved', result);
                }
            }
        } catch (error) {
            logger.error('Error in Puppeteer print handler', { error });
            safeSend(event.sender, 'printProcessError', { error: error.message });
        }
    });

    // Handle general document print/PDF requests
    ipcMain.on('PrintDoc', async (event, { content, mode, name }) => {
        try {
            if (mode === 'print') {
                safeSend(event.sender, 'printStarted');
                const result = await puppeteerHandler.print(content, { useNativeDialog: true, mainWindow });
                if (!result.success) {
                    safeSend(event.sender, 'printFailed', { error: result.error });
                }
                else {
                    safeSend(event.sender, 'printDone');
                }
            } else if (mode === 'savePDF') {
                const { filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'Save PDF',
                    defaultPath: `${name}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (filePath) {
                    const result = await puppeteerHandler.generatePDF(content, filePath);
                    safeSend(event.sender, 'PDFSaved', result);
                }
            }
        } catch (error) {
            logger.error('Error in Puppeteer print handler', { error });
            safeSend(event.sender, 'printProcessError', { error: error.message });
        }
    });

    logger.info('Puppeteer print handlers registered successfully');
}

// Cleanup on app exit
process.on('exit', async () => {
    await puppeteerHandler.cleanup();
});

module.exports = { setupPuppeteerHandlers, puppeteerHandler };
