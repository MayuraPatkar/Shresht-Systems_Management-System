import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { QuotationModel, InvoiceModel, UserModel, SettingsModel, CommunicationModel } from '../models';
import config from '../config/config';
import logger from '../utils/logger';
import secureStore from '../utils/secureStore';
import { formatDateReadable as formatDateForTemplate } from '../utils/dateUtils';
import { quotationPrintHandler } from '../utils/quotationPrintHandler';
import * as emailService from '../utils/emailService';

// Lazy-loaded utilities (may not be available in all environments)
let pdfGenerator: any;
let cloudStorage: any;
try {
    pdfGenerator = require('../utils/pdfGenerator');
    cloudStorage = require('../utils/cloudStorage');
} catch {
    logger.warn('PDF generator or cloud storage not available', { service: 'messaging' });
}

const router: Router = Router();

// WhatsApp credentials cache
interface WhatsAppCreds {
    token: string;
    phoneNumberId: string;
    pdfBaseUrl: string;
    verifyToken: string;
}

let cachedWhatsApp: WhatsAppCreds | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidate the cached WhatsApp credentials
 * Call this when settings are updated to force re-fetching credentials
 */
export function invalidateWhatsAppCache(): void {
    cachedWhatsApp = null;
    cachedAt = 0;
    logger.info('WhatsApp cache invalidated', { service: "messaging" });
}

/**
 * Invalidate the cached Email credentials
 * Call this when settings are updated to force re-fetching credentials
 */
export function invalidateEmailCache(): void {
    emailService.invalidateEmailCache();
}

async function resolveWhatsAppCredentials(): Promise<WhatsAppCreds> {
    if (cachedWhatsApp && (Date.now() - cachedAt) < CACHE_TTL_MS) return cachedWhatsApp;

    let token = process.env.WHATSAPP_TOKEN || (config.whatsapp && config.whatsapp.token) || '';

    if (!token) {
        try {
            token = await secureStore.getWhatsAppToken() || '';
        } catch (e: unknown) {
            logger.warn('Secure store lookup failed', { service: "messaging", error: (e as Error).message });
        }
    }

    let phoneNumberId = process.env.PHONE_NUMBER_ID || (config.whatsapp && config.whatsapp.phoneNumberId) || '';
    let verifyToken = process.env.VERIFY_TOKEN || (config.whatsapp && config.whatsapp.verifyToken) || '';
    
    try {
        const settings = await SettingsModel.findOne();
        if (settings && (settings as any).whatsapp) {
            if (!phoneNumberId && (settings as any).whatsapp.phoneNumberId) {
                phoneNumberId = (settings as any).whatsapp.phoneNumberId;
            }
            if (!verifyToken && (settings as any).whatsapp.verifyToken) {
                verifyToken = (settings as any).whatsapp.verifyToken;
            }
        }
    } catch (err: unknown) {
        logger.warn('Settings DB lookup failed', { service: "messaging", error: (err as Error).message });
    }

    const pdfBaseUrl = (config.whatsapp && config.whatsapp.pdfBaseUrl) || (await (async () => {
        try {
            const settings = await SettingsModel.findOne();
            return (settings as any)?.whatsapp?.pdfBaseUrl || '';
        } catch { return ''; }
    })()) || '';

    cachedAt = Date.now();
    cachedWhatsApp = { token, phoneNumberId, pdfBaseUrl, verifyToken };

    logger.info('WhatsApp credentials resolved', {
        service: "messaging",
        hasToken: !!token,
        hasPhoneNumberId: !!phoneNumberId,
        hasPdfBaseUrl: !!pdfBaseUrl,
        hasVerifyToken: !!verifyToken
    });

    return cachedWhatsApp;
}

/**
 * Get company info from Admin model for PDF generation
 */
async function getCompanyInfo(): Promise<Record<string, string>> {
    try {
        const settings = await SettingsModel.findOne();
        if (!settings || !settings.company_details) {
            return {};
        }
        const admin = settings.company_details as any;
        const addr = admin.address || {};
        const addressStr = typeof addr === 'string' ? addr : [addr.line1, addr.line2, addr.city, addr.state ? addr.state + (addr.pincode ? ' - ' + addr.pincode : '') : ''].filter(Boolean).join(', ');
        return {
            name: admin.company_name || 'Shresht Systems',
            tagline: 'CCTV & Energy Solutions',
            address: addressStr,
            phone: admin.phone?.ph1 || '',
            gstin: admin.gstin || '',
            email: admin.email || '',
            website: admin.website || ''
        };
    } catch (error: unknown) {
        logger.error('Company info fetch failed', { service: "messaging", error: (error as Error).message });
        return {};
    }
}

async function logCommunication(options: {
    recipient: string;
    type?: "WhatsApp" | "Email" | "SMS";
    messageType: "Invoice" | "Quotation" | "Manual Reminder" | "Automated Reminder" | "Document" | "Custom Message";
    referenceId?: string;
    content?: string;
    documentUrl?: string;
    status: "Success" | "Failed";
    errorMessage?: string;
    messageId?: string;
}) {
    try {
        await CommunicationModel.create({
            recipient: options.recipient,
            type: options.type || "WhatsApp",
            messageType: options.messageType,
            referenceId: options.referenceId,
            content: options.content,
            documentUrl: options.documentUrl,
            status: options.status,
            errorMessage: options.errorMessage,
            messageId: options.messageId,
            sentAt: new Date()
        });
    } catch (err) {
        logger.error("Failed to save communication log to database:", err);
    }
}

function getWhatsAppApiUrl(phoneNumberId: string, endpoint: string = 'messages'): string {
    if (!phoneNumberId) {
        throw new Error('WhatsApp Phone Number ID is not configured');
    }
    return `https://graph.facebook.com/v20.0/${phoneNumberId}/${endpoint}`;
}

async function checkWhatsAppConfig(): Promise<boolean> {
    const creds = await resolveWhatsAppCredentials();
    if (!creds || !creds.token || !creds.phoneNumberId) {
        throw new Error('WhatsApp API is not configured. Please configure token and phone number ID from Settings or environment.');
    }
    return true;
}

async function sendWhatsAppMessage(phone: string, message: string): Promise<any> {
    const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
    };

    try {
        const creds = await resolveWhatsAppCredentials();
        if (!creds.token || !creds.phoneNumberId) throw new Error('WhatsApp is not configured');
        const { data } = await axios.post(
            getWhatsAppApiUrl(creds.phoneNumberId, 'messages'),
            payload,
            { headers: { Authorization: `Bearer ${creds.token}` } }
        );
        return data;
    } catch (err: any) {
        logger.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        throw err;
    }
}

async function sendPaymentReminder(phone: string, amount_due: string): Promise<any> {
    const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
            name: 'pay_reminder',
            language: { code: 'en_US' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: amount_due },
                    ]
                }
            ]
        }
    };

    try {
        const creds = await resolveWhatsAppCredentials();
        if (!creds.token || !creds.phoneNumberId) throw new Error('WhatsApp is not configured');
        const { data } = await axios.post(
            getWhatsAppApiUrl(creds.phoneNumberId, 'messages'),
            payload,
            { headers: { Authorization: `Bearer ${creds.token}` } }
        );
        return data;
    } catch (err: any) {
        logger.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        throw err;
    }
}

// POST /send-manual-reminder
router.post('/send-manual-reminder', async (req: Request, res: Response) => {
    const { phoneNumber, invoiceId } = req.body;

    if (!phoneNumber)
        return res.status(400).json({ message: 'Phone number is required.' });
    if (!invoiceId)
        return res.status(400).json({ message: 'Invoice ID is required.' });

    let amountDue = 0;
    try {
        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found.' });

        const isPaid = invoice.payment_status?.toUpperCase() === 'PAID';
        if (isPaid) {
            return res.status(200).json({ message: 'Invoice already paid. No reminder sent.' });
        }

        const totalDue = invoice.total_amount_original || 0;
        const totalPaid = invoice.total_paid_amount || 0;
        amountDue = Math.max(totalDue - totalPaid, 0);

        const result = await sendPaymentReminder(phoneNumber, amountDue.toFixed(2));
        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phoneNumber,
            messageType: "Manual Reminder",
            referenceId: invoiceId,
            content: `Payment reminder for Invoice ${invoiceId}. Amount due: ₹${amountDue.toFixed(2)}`,
            status: "Success",
            messageId
        });

        return res.json({ message: 'Manual payment reminder sent successfully.' });
    } catch (err: any) {
        logger.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phoneNumber,
            messageType: "Manual Reminder",
            referenceId: invoiceId,
            content: `Payment reminder for Invoice ${invoiceId}. Amount due: ₹${amountDue.toFixed(2)}`,
            status: "Failed",
            errorMessage: errMsg
        });
        return res.status(500).json({
            message: 'Failed to send manual reminder.',
            error: err?.response?.data || err.message,
        });
    }
});

async function sendSimpleMessageTemplate(phone: string, message: string): Promise<any> {
    const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
            name: 'simple_message',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: message }
                    ]
                }
            ]
        }
    };

    try {
        const creds = await resolveWhatsAppCredentials();
        if (!creds.token || !creds.phoneNumberId) throw new Error('WhatsApp is not configured');
        const { data } = await axios.post(
            getWhatsAppApiUrl(creds.phoneNumberId, 'messages'),
            payload,
            { headers: { Authorization: `Bearer ${creds.token}` } }
        );
        logger.info('Simple message sent', {
            service: "messaging",
            to: phone,
            messageId: data.messages?.[0]?.id
        });
        return data;
    } catch (err: any) {
        logger.error('WhatsApp API error (simple_message)', {
            service: "messaging",
            error: err?.response?.data || err.message,
            phone
        });
        throw err;
    }
}

interface DocDetails {
    documentUrl: string;
    documentType: string;
    customerName: string;
    referenceNo: string;
    date: string;
    amount: string;
}

async function sendDocumentTemplate(phone: string, docDetails: DocDetails): Promise<any> {
    await checkWhatsAppConfig();

    const { documentType, customerName, referenceNo, date, amount, documentUrl } = docDetails;

    if (!documentUrl) {
        throw new Error('Document URL is required. The WhatsApp template requires a PDF attachment.');
    }

    const components = [
        {
            type: 'header',
            parameters: [
                {
                    type: 'document',
                    document: {
                        link: documentUrl,
                        filename: `${referenceNo}.pdf`
                    }
                }
            ]
        },
        {
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: documentType },
                { type: 'text', text: referenceNo },
                { type: 'text', text: date },
                { type: 'text', text: amount }
            ]
        }
    ];

    const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
            name: 'sending_documents',
            language: { code: 'en' },
            components: components
        }
    };

    try {
        const creds = await resolveWhatsAppCredentials();
        const { data } = await axios.post(
            getWhatsAppApiUrl(creds.phoneNumberId, 'messages'),
            payload,
            { headers: { Authorization: `Bearer ${creds.token}` } }
        );
        logger.info('Document template sent successfully', {
            to: phone,
            referenceNo: docDetails.referenceNo,
            messageId: data.messages?.[0]?.id
        });
        return data;
    } catch (err: any) {
        logger.error('WhatsApp API error (sending_documents)', {
            service: "messaging",
            error: err?.response?.data || err.message,
            phone,
            referenceNo: docDetails.referenceNo
        });
        throw err;
    }
}

function formatAmountForTemplate(amount: number): string {
    const formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(amount);
    return `₹${formatted}`;
}

// Send invoice using template (auto-generates PDF)
router.post('/send-invoice', async (req: Request, res: Response) => {
    const { phone, invoiceId, documentUrl: providedUrl, htmlContent } = req.body;
    if (!phone || !invoiceId) return res.status(400).json({ message: 'Phone and Invoice ID required.' });

    let documentUrl = providedUrl;
    try {
        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            logger.warn(`Invoice not found: ${invoiceId}`);
            return res.status(404).json({ message: `Invoice "${invoiceId}" not found. Please check the invoice ID.` });
        }

        let isCloudUploaded = false;

        if (!documentUrl && pdfGenerator) {
            let pdfResult;
            if (htmlContent) {
                // Use the same native Electron-based PDF generation as PDF save (via quotationPrintHandler)
                try {
                    const tempFilename = `${invoiceId}.pdf`;
                    const outputPath = path.join(pdfGenerator.UPLOADS_DIR, tempFilename);
                    const printResult = await quotationPrintHandler.generatePDF(htmlContent, outputPath);
                    if (printResult.success) {
                        pdfResult = {
                            success: true,
                            path: outputPath,
                            filename: tempFilename
                        };
                    } else {
                        pdfResult = {
                            success: false,
                            error: printResult.error
                        };
                    }
                } catch (e: any) {
                    pdfResult = {
                        success: false,
                        error: e.message
                    };
                }
            } else {
                const companyInfo = await getCompanyInfo();
                pdfResult = await pdfGenerator.generateInvoicePDF(invoice, companyInfo);
            }

            if (!pdfResult || !pdfResult.success) {
                logger.error('Invoice PDF generation failed', { service: "messaging", error: pdfResult ? pdfResult.error : 'Unknown error', invoiceId });
                return res.status(500).json({
                    message: 'Failed to generate PDF.',
                    error: pdfResult ? pdfResult.error : 'Unknown error'
                });
            }

            if (cloudStorage && cloudStorage.isConfigured()) {
                const uploadResult = await cloudStorage.uploadPDF(pdfResult.path, invoiceId);
                if (uploadResult.success) {
                    documentUrl = uploadResult.url;
                    isCloudUploaded = true;
                    logger.info('Invoice PDF uploaded to cloud', { service: "messaging", url: documentUrl, invoiceId });

                    try {
                        const fileCleanup = require('../utils/fileCleanup');
                        await fileCleanup.removeFile(pdfResult.path, (global.appPaths && global.appPaths.userData) || __dirname);
                    } catch (e: any) {
                        logger.warn('Failed to delete local PDF after cloud upload:', e && e.message);
                    }
                } else {
                    logger.warn(`Cloud upload failed, using local URL: ${uploadResult.error}`);
                }
            }

            if (!documentUrl) {
                const baseUrl = config.whatsapp.pdfBaseUrl || `http://localhost:${config.port}`;
                documentUrl = `${baseUrl}/documents/${pdfResult.filename}`;

                if (documentUrl.includes('localhost') || documentUrl.includes('127.0.0.1')) {
                    logger.warn('Localhost URL may not be accessible', { service: "messaging", url: documentUrl });
                }
            }

            logger.info('Generated invoice PDF', { service: "messaging", url: documentUrl });
        }

        const totalAmount = invoice.total_amount_original || invoice.total_amount_duplicate || 0;
        const customerName = invoice.customer_name || 'Customer';
        const invoiceDate = invoice.invoice_date || invoice.createdAt || new Date();

        const result = await sendDocumentTemplate(phone, {
            documentType: 'invoice',
            customerName: customerName,
            referenceNo: invoiceId,
            date: formatDateForTemplate(invoiceDate),
            amount: formatAmountForTemplate(totalAmount),
            documentUrl: documentUrl
        });
        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phone,
            messageType: "Invoice",
            referenceId: invoiceId,
            content: `Invoice PDF sent to ${customerName}. Reference: ${invoiceId}. Amount: ${formatAmountForTemplate(totalAmount)}`,
            documentUrl: documentUrl,
            status: "Success",
            messageId
        });

        // Auto-delete temp PDF from Cloudinary after 3 minutes
        if (isCloudUploaded && cloudStorage) {
            setTimeout(async () => {
                try {
                    await cloudStorage.deletePDF(invoiceId);
                    logger.info(`Auto-deleted temp PDF from Cloudinary: ${invoiceId}`);
                } catch (e: any) {
                    logger.warn(`Failed to auto-delete temp PDF from Cloudinary: ${invoiceId}`, e && e.message);
                }
            }, 3 * 60 * 1000);
        }

        res.json({
            message: 'Invoice sent via WhatsApp.',
            pdfUrl: documentUrl
        });
    } catch (err: any) {
        logger.error('Invoice send failed', { service: "messaging", error: err?.response?.data || err.message, invoiceId });
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phone,
            messageType: "Invoice",
            referenceId: invoiceId,
            content: `Invoice PDF sent to customer. Reference: ${invoiceId}`,
            documentUrl: documentUrl,
            status: "Failed",
            errorMessage: errMsg
        });
        res.status(500).json({
            message: 'Failed to send invoice.',
            error: err?.response?.data || err.message
        });
    }
});

// Send quotation using template (auto-generates PDF)
router.post('/send-quotation', async (req: Request, res: Response) => {
    const { phone, quotationId, documentUrl: providedUrl, htmlContent } = req.body;
    if (!phone || !quotationId) return res.status(400).json({ message: 'Phone and Quotation ID required.' });

    let documentUrl = providedUrl;
    try {
        const quotation = await QuotationModel.findOne({ quotation_no: quotationId }) as any;
        if (!quotation) {
            logger.warn(`Quotation not found: ${quotationId}`);
            return res.status(404).json({ message: `Quotation "${quotationId}" not found. Please check the quotation ID.` });
        }

        let isCloudUploaded = false;

        if (!documentUrl && pdfGenerator) {
            let pdfResult;
            if (htmlContent) {
                // Use the same native Electron-based PDF generation as PDF save
                try {
                    const tempFilename = `${quotationId}.pdf`;
                    const outputPath = path.join(pdfGenerator.UPLOADS_DIR, tempFilename);
                    const printResult = await quotationPrintHandler.generatePDF(htmlContent, outputPath);
                    if (printResult.success) {
                        pdfResult = {
                            success: true,
                            path: outputPath,
                            filename: tempFilename
                        };
                    } else {
                        pdfResult = {
                            success: false,
                            error: printResult.error
                        };
                    }
                } catch (e: any) {
                    pdfResult = {
                        success: false,
                        error: e.message
                    };
                }
            } else {
                const companyInfo = await getCompanyInfo();
                pdfResult = await pdfGenerator.generateQuotationPDF(quotation, companyInfo);
            }

            if (!pdfResult || !pdfResult.success) {
                logger.error('Quotation PDF generation failed', { service: "messaging", error: pdfResult?.error, quotationId });
                return res.status(500).json({
                    message: 'Failed to generate PDF.',
                    error: pdfResult?.error
                });
            }

            if (cloudStorage && cloudStorage.isConfigured()) {
                const uploadResult = await cloudStorage.uploadPDF(pdfResult.path, quotationId);
                if (uploadResult.success) {
                    documentUrl = uploadResult.url;
                    isCloudUploaded = true;
                    logger.info('Quotation PDF uploaded to cloud', { service: "messaging", url: documentUrl, quotationId });

                    try {
                        const fileCleanup = require('../utils/fileCleanup');
                        await fileCleanup.removeFile(pdfResult.path, (global.appPaths && global.appPaths.userData) || __dirname);
                    } catch (e: any) {
                        logger.warn('Failed to delete local PDF after cloud upload:', e && e.message);
                    }
                } else {
                    logger.warn(`Cloud upload failed, using local URL: ${uploadResult.error}`);
                }
            }

            if (!documentUrl) {
                const baseUrl = config.whatsapp.pdfBaseUrl || `http://localhost:${config.port}`;
                documentUrl = `${baseUrl}/documents/${pdfResult.filename}`;

                if (documentUrl.includes('localhost') || documentUrl.includes('127.0.0.1')) {
                    logger.warn('Localhost URL may not be accessible', { service: "messaging", url: documentUrl });
                }
            }

            logger.info('Generated quotation PDF', { service: "messaging", url: documentUrl });
        }

        const totalAmount = quotation.total_amount_tax || quotation.total_amount_no_tax || 0;
        const customerName = quotation.customer_name || 'Customer';
        const quotationDate = quotation.quotation_date || quotation.createdAt || new Date();

        const result = await sendDocumentTemplate(phone, {
            documentType: 'quotation',
            customerName: customerName,
            referenceNo: quotationId,
            date: formatDateForTemplate(quotationDate),
            amount: formatAmountForTemplate(totalAmount),
            documentUrl: documentUrl
        });
        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phone,
            messageType: "Quotation",
            referenceId: quotationId,
            content: `Quotation PDF sent to ${customerName}. Reference: ${quotationId}. Amount: ${formatAmountForTemplate(totalAmount)}`,
            documentUrl: documentUrl,
            status: "Success",
            messageId
        });

        // Auto-delete temp PDF from Cloudinary after 3 minutes
        if (isCloudUploaded && cloudStorage) {
            setTimeout(async () => {
                try {
                    await cloudStorage.deletePDF(quotationId);
                    logger.info(`Auto-deleted temp PDF from Cloudinary: ${quotationId}`);
                } catch (e: any) {
                    logger.warn(`Failed to auto-delete temp PDF from Cloudinary: ${quotationId}`, e && e.message);
                }
            }, 3 * 60 * 1000);
        }

        res.json({
            message: 'Quotation sent via WhatsApp.',
            pdfUrl: documentUrl
        });
    } catch (err: any) {
        logger.error('Error sending quotation:', { error: err?.response?.data || err.message, quotationId });
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phone,
            messageType: "Quotation",
            referenceId: quotationId,
            content: `Quotation PDF sent to customer. Reference: ${quotationId}`,
            documentUrl: documentUrl,
            status: "Failed",
            errorMessage: errMsg
        });
        res.status(500).json({
            message: 'Failed to send quotation.',
            error: err?.response?.data || err.message
        });
    }
});

// Send payment receipt or voucher using template (auto-generates PDF)
router.post('/send-payment', async (req: Request, res: Response) => {
    const { phone, paymentId, htmlContent, documentType, partyName, amount, date } = req.body;
    if (!phone || !paymentId || !htmlContent || !documentType) {
        return res.status(400).json({ message: 'Phone, Payment ID, HTML Content, and Document Type are required.' });
    }

    let documentUrl = '';
    let isCloudUploaded = false;
    const tempFilename = `${paymentId.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    const outputPath = path.join(pdfGenerator.UPLOADS_DIR, tempFilename);

    try {
        // Generate PDF using quotationPrintHandler
        const printResult = await quotationPrintHandler.generatePDF(htmlContent, outputPath);
        if (!printResult.success) {
            logger.error('Payment PDF generation failed', { service: "messaging", error: printResult.error, paymentId });
            return res.status(500).json({ message: 'Failed to generate PDF.', error: printResult.error });
        }

        // Upload to Cloudinary if configured
        if (cloudStorage && cloudStorage.isConfigured()) {
            const uploadResult = await cloudStorage.uploadPDF(outputPath, paymentId);
            if (uploadResult.success) {
                documentUrl = uploadResult.url;
                isCloudUploaded = true;
                logger.info('Payment PDF uploaded to cloud', { service: "messaging", url: documentUrl, paymentId });

                try {
                    const fileCleanup = require('../utils/fileCleanup');
                    await fileCleanup.removeFile(outputPath, (global.appPaths && global.appPaths.userData) || __dirname);
                } catch (e: any) {
                    logger.warn('Failed to delete local PDF after cloud upload:', e && e.message);
                }
            } else {
                logger.warn(`Cloud upload failed, using local URL: ${uploadResult.error}`);
            }
        }

        if (!documentUrl) {
            const baseUrl = config.whatsapp.pdfBaseUrl || `http://localhost:${config.port}`;
            documentUrl = `${baseUrl}/documents/${tempFilename}`;
        }

        // Send via WhatsApp
        const result = await sendDocumentTemplate(phone, {
            documentType: documentType,
            customerName: partyName || 'Valued Client',
            referenceNo: paymentId,
            date: date || formatDateForTemplate(new Date()),
            amount: amount ? formatAmountForTemplate(parseFloat(amount) || 0) : '0.00',
            documentUrl: documentUrl
        });

        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phone,
            messageType: 'Document',
            referenceId: paymentId,
            content: `${documentType === 'payment voucher' ? 'Payment Voucher' : 'Payment Receipt'} PDF sent to ${partyName || 'Valued Client'}. Reference: ${paymentId}. Amount: ${amount || '0.00'}`,
            documentUrl: documentUrl,
            status: "Success",
            messageId
        });

        // Auto-delete temp PDF from Cloudinary after 3 minutes
        if (isCloudUploaded && cloudStorage) {
            setTimeout(async () => {
                try {
                    await cloudStorage.deletePDF(paymentId);
                    logger.info('Temporary payment PDF deleted from cloud storage', { service: "messaging", paymentId });
                } catch (e: any) {
                    logger.error('Error auto-deleting payment PDF:', { service: "messaging", error: e.message || String(e), paymentId });
                }
            }, 180000);
        }

        res.json({
            message: `${documentType === 'payment voucher' ? 'Voucher' : 'Receipt'} sent via WhatsApp.`,
            pdfUrl: documentUrl
        });
    } catch (err: any) {
        logger.error('Payment document send failed', { service: "messaging", error: err?.response?.data || err.message, paymentId });
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phone,
            messageType: 'Document',
            referenceId: paymentId,
            content: `${documentType === 'payment voucher' ? 'Payment Voucher' : 'Payment Receipt'} PDF sent. Reference: ${paymentId}`,
            documentUrl: documentUrl,
            status: "Failed",
            errorMessage: errMsg
        });
        res.status(500).json({
            message: 'Failed to send payment document.',
            error: err?.response?.data || err.message
        });
    }
});

// Send generic document
router.post('/send-document', async (req: Request, res: Response) => {
    const { phone, documentType, customerName, referenceNo, date, amount, documentUrl } = req.body;

    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });
    if (!documentUrl) return res.status(400).json({ message: 'Document URL is required. Please provide a publicly accessible URL to the document PDF.' });
    if (!documentType) return res.status(400).json({ message: 'Document type is required.' });
    if (!customerName) return res.status(400).json({ message: 'Customer name is required.' });
    if (!referenceNo) return res.status(400).json({ message: 'Reference number is required.' });
    if (!date) return res.status(400).json({ message: 'Date is required.' });
    if (amount === undefined || amount === null) return res.status(400).json({ message: 'Amount is required.' });

    try {
        const result = await sendDocumentTemplate(phone, {
            documentType: documentType,
            customerName: customerName,
            referenceNo: referenceNo,
            date: formatDateForTemplate(date),
            amount: formatAmountForTemplate(parseFloat(amount) || 0),
            documentUrl: documentUrl
        });
        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phone,
            messageType: "Document",
            referenceId: referenceNo,
            content: `Document (${documentType}) sent to ${customerName}. Reference: ${referenceNo}. Amount: ${formatAmountForTemplate(parseFloat(amount) || 0)}`,
            documentUrl: documentUrl,
            status: "Success",
            messageId
        });

        res.json({ message: 'Document sent via WhatsApp.' });
    } catch (err: any) {
        logger.error('Error sending document:', err);
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phone,
            messageType: "Document",
            referenceId: referenceNo,
            content: `Document (${documentType}) sent to ${customerName}. Reference: ${referenceNo}`,
            documentUrl: documentUrl,
            status: "Failed",
            errorMessage: errMsg
        });
        res.status(500).json({
            message: 'Failed to send document.',
            error: err?.response?.data || err.message
        });
    }
});

// Send custom message
router.post('/send-message', async (req: Request, res: Response) => {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
        return res.status(400).json({ message: 'Phone number and message are required.' });
    }

    try {
        const result = await sendSimpleMessageTemplate(phoneNumber, message);
        const messageId = result?.messages?.[0]?.id;

        await logCommunication({
            recipient: phoneNumber,
            messageType: "Custom Message",
            content: message,
            status: "Success",
            messageId
        });

        res.json({ message: 'Message sent successfully via WhatsApp.' });
    } catch (err: any) {
        logger.error('Message send failed', { service: "messaging", error: err?.response?.data || err.message, phone: phoneNumber });
        const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
        await logCommunication({
            recipient: phoneNumber,
            messageType: "Custom Message",
            content: message,
            status: "Failed",
            errorMessage: errMsg
        });
        res.status(500).json({ message: 'Failed to send message.', error: err?.response?.data || err.message });
    }
});

// Send automated reminders to all unpaid invoices
router.post('/send-automated-reminders', async (req: Request, res: Response) => {
    try {
        const unpaidInvoices = await InvoiceModel.find({
            payment_status: { $in: ['Unpaid', 'Partial'] }
        }) as any[];

        if (unpaidInvoices.length === 0) {
            return res.json({ message: 'No unpaid invoices found.' });
        }

        let successCount = 0;
        let failCount = 0;

        for (const invoice of unpaidInvoices) {
            const phone = invoice.customer_phone;
            const totalDue = invoice.total_amount_original || 0;
            const totalPaid = invoice.total_paid_amount || 0;
            const amountDue = Math.max(totalDue - totalPaid, 0);

            try {
                if (phone && amountDue > 0) {
                    const result = await sendPaymentReminder(phone, amountDue.toFixed(2));
                    const messageId = result?.messages?.[0]?.id;

                    await logCommunication({
                        recipient: phone,
                        messageType: "Automated Reminder",
                        referenceId: invoice.invoice_id,
                        content: `Automated payment reminder for Invoice ${invoice.invoice_id}. Amount due: ₹${amountDue.toFixed(2)}`,
                        status: "Success",
                        messageId
                    });
                    successCount++;
                }
            } catch (err: any) {
                logger.error(`Failed to send reminder for invoice ${invoice.invoice_id}:`, err);
                const errMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || String(err);
                if (phone) {
                    await logCommunication({
                        recipient: phone,
                        messageType: "Automated Reminder",
                        referenceId: invoice.invoice_id,
                        content: `Automated payment reminder for Invoice ${invoice.invoice_id}. Amount due: ₹${amountDue.toFixed(2)}`,
                        status: "Failed",
                        errorMessage: errMsg
                    });
                }
                failCount++;
            }
        }

        res.json({
            message: `Sent ${successCount} reminders successfully. ${failCount > 0 ? `${failCount} failed.` : ''}`,
            success: successCount,
            failed: failCount
        });
    } catch (err: unknown) {
        logger.error('Error sending automated reminders:', err);
        res.status(500).json({ message: 'Failed to send automated reminders.', error: (err as Error).message });
    }
});

// ─── EMAIL ENDPOINTS ─────────────────────────────────────────────────────────

/**
 * Get company info helper (shared)
 */
async function getCompanyInfoForEmail(): Promise<{ name: string; phone?: string; email?: string }> {
    try {
        const settings = await SettingsModel.findOne();
        const cd = settings?.company_details as any;
        return {
            name: cd?.company_name || 'Shresht Systems',
            phone: cd?.phone?.ph1 || '',
            email: cd?.email || '',
        };
    } catch {
        return { name: 'Shresht Systems' };
    }
}

// POST /comms/send-email-message — Send custom text message via email
router.post('/send-email-message', async (req: Request, res: Response) => {
    const { email, subject, message } = req.body;
    if (!email || !message) {
        return res.status(400).json({ message: 'Email address and message are required.' });
    }

    try {
        await emailService.checkEmailConfig();
        const company = await getCompanyInfoForEmail();
        const html = emailService.buildCustomMessageEmailBody({ message, companyName: company.name });
        const result = await emailService.sendEmail({
            to: email,
            subject: subject || `Message from ${company.name}`,
            html,
            text: message
        });

        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Custom Message',
            content: message,
            status: 'Success',
            messageId: result.messageId
        });

        return res.json({ message: 'Message sent successfully via Email.' });
    } catch (err: any) {
        logger.error('Email message send failed', { service: 'email', error: err.message, email });
        const errMsg = err.message || String(err);
        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Custom Message',
            content: message,
            status: 'Failed',
            errorMessage: errMsg
        });
        return res.status(500).json({ message: 'Failed to send email message.', error: errMsg });
    }
});

// POST /comms/send-email-invoice — Send invoice as email with PDF attachment
router.post('/send-email-invoice', async (req: Request, res: Response) => {
    const { email, invoiceId } = req.body;
    if (!email || !invoiceId) {
        return res.status(400).json({ message: 'Email and Invoice ID are required.' });
    }

    try {
        await emailService.checkEmailConfig();

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) return res.status(404).json({ message: `Invoice "${invoiceId}" not found.` });

        const company = await getCompanyInfo();
        const companyObj = await getCompanyInfoForEmail();
        const totalAmount = invoice.total_amount_original || invoice.total_amount_duplicate || 0;
        const customerName = invoice.customer_name || 'Customer';
        const invoiceDate = invoice.invoice_date || invoice.createdAt || new Date();

        let pdfPath: string | undefined;
        let pdfFilename = `${invoiceId}.pdf`;

        if (pdfGenerator) {
            const pdfResult = await pdfGenerator.generateInvoicePDF(invoice, company);
            if (pdfResult && pdfResult.success) {
                pdfPath = pdfResult.path;
                pdfFilename = pdfResult.filename || pdfFilename;
            }
        }

        const html = emailService.buildDocumentEmailBody({
            documentType: 'Invoice',
            customerName,
            referenceNo: invoiceId,
            date: formatDateForTemplate(invoiceDate),
            amount: formatAmountForTemplate(totalAmount),
            companyName: companyObj.name
        });

        const attachments = pdfPath
            ? [{ filename: pdfFilename, path: pdfPath, contentType: 'application/pdf' }]
            : [];

        const result = await emailService.sendEmail({
            to: email,
            subject: `Invoice ${invoiceId} from ${companyObj.name}`,
            html,
            attachments
        });

        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Invoice',
            referenceId: invoiceId,
            content: `Invoice ${invoiceId} emailed to ${customerName}. Amount: ${formatAmountForTemplate(totalAmount)}`,
            status: 'Success',
            messageId: result.messageId
        });

        // Clean up temp PDF if generated locally
        if (pdfPath) {
            try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
        }

        return res.json({ message: 'Invoice sent via Email.' });
    } catch (err: any) {
        logger.error('Email invoice send failed', { service: 'email', error: err.message, invoiceId });
        const errMsg = err.message || String(err);
        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Invoice',
            referenceId: invoiceId,
            status: 'Failed',
            errorMessage: errMsg
        });
        return res.status(500).json({ message: 'Failed to send invoice via email.', error: errMsg });
    }
});

// POST /comms/send-email-quotation — Send quotation as email with PDF attachment
router.post('/send-email-quotation', async (req: Request, res: Response) => {
    const { email, quotationId } = req.body;
    if (!email || !quotationId) {
        return res.status(400).json({ message: 'Email and Quotation ID are required.' });
    }

    try {
        await emailService.checkEmailConfig();

        const quotation = await QuotationModel.findOne({ quotation_no: quotationId }) as any;
        if (!quotation) return res.status(404).json({ message: `Quotation "${quotationId}" not found.` });

        const company = await getCompanyInfo();
        const companyObj = await getCompanyInfoForEmail();
        const totalAmount = quotation.total_amount_tax || quotation.total_amount_no_tax || 0;
        const customerName = quotation.customer_name || 'Customer';
        const quotationDate = quotation.quotation_date || quotation.createdAt || new Date();

        let pdfPath: string | undefined;
        let pdfFilename = `${quotationId}.pdf`;

        if (pdfGenerator) {
            const pdfResult = await pdfGenerator.generateQuotationPDF(quotation, company);
            if (pdfResult && pdfResult.success) {
                pdfPath = pdfResult.path;
                pdfFilename = pdfResult.filename || pdfFilename;
            }
        }

        const html = emailService.buildDocumentEmailBody({
            documentType: 'Quotation',
            customerName,
            referenceNo: quotationId,
            date: formatDateForTemplate(quotationDate),
            amount: formatAmountForTemplate(totalAmount),
            companyName: companyObj.name
        });

        const attachments = pdfPath
            ? [{ filename: pdfFilename, path: pdfPath, contentType: 'application/pdf' }]
            : [];

        const result = await emailService.sendEmail({
            to: email,
            subject: `Quotation ${quotationId} from ${companyObj.name}`,
            html,
            attachments
        });

        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Quotation',
            referenceId: quotationId,
            content: `Quotation ${quotationId} emailed to ${customerName}. Amount: ${formatAmountForTemplate(totalAmount)}`,
            status: 'Success',
            messageId: result.messageId
        });

        if (pdfPath) {
            try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
        }

        return res.json({ message: 'Quotation sent via Email.' });
    } catch (err: any) {
        logger.error('Email quotation send failed', { service: 'email', error: err.message, quotationId });
        const errMsg = err.message || String(err);
        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Quotation',
            referenceId: quotationId,
            status: 'Failed',
            errorMessage: errMsg
        });
        return res.status(500).json({ message: 'Failed to send quotation via email.', error: errMsg });
    }
});

// POST /comms/send-email-reminder — Send payment reminder via email
router.post('/send-email-reminder', async (req: Request, res: Response) => {
    const { email, invoiceId } = req.body;
    if (!email || !invoiceId) {
        return res.status(400).json({ message: 'Email and Invoice ID are required.' });
    }

    try {
        await emailService.checkEmailConfig();

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) return res.status(404).json({ message: `Invoice "${invoiceId}" not found.` });

        const isPaid = invoice.payment_status?.toUpperCase() === 'PAID';
        if (isPaid) {
            return res.status(200).json({ message: 'Invoice already paid. No reminder sent.' });
        }

        const totalDue = invoice.total_amount_original || 0;
        const totalPaid = invoice.total_paid_amount || 0;
        const amountDue = Math.max(totalDue - totalPaid, 0);
        const customerName = invoice.customer_name || 'Customer';
        const dueDate = invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString('en-IN')
            : undefined;

        const companyObj = await getCompanyInfoForEmail();
        const html = emailService.buildReminderEmailBody({
            customerName,
            invoiceId,
            amountDue: amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            dueDate,
            companyName: companyObj.name
        });

        const result = await emailService.sendEmail({
            to: email,
            subject: `Payment Reminder — Invoice ${invoiceId} | ${companyObj.name}`,
            html
        });

        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Manual Reminder',
            referenceId: invoiceId,
            content: `Payment reminder emailed for Invoice ${invoiceId}. Amount due: ₹${amountDue.toFixed(2)}`,
            status: 'Success',
            messageId: result.messageId
        });

        return res.json({ message: 'Payment reminder sent successfully via Email.' });
    } catch (err: any) {
        logger.error('Email reminder send failed', { service: 'email', error: err.message, invoiceId });
        const errMsg = err.message || String(err);
        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Manual Reminder',
            referenceId: invoiceId,
            status: 'Failed',
            errorMessage: errMsg
        });
        return res.status(500).json({ message: 'Failed to send payment reminder via email.', error: errMsg });
    }
});

// POST /comms/send-email-payment — Send receipt/voucher PDF via email
router.post('/send-email-payment', async (req: Request, res: Response) => {
    const { email, paymentId, htmlContent, documentType, partyName, amount, date } = req.body;
    if (!email || !paymentId || !htmlContent || !documentType) {
        return res.status(400).json({ message: 'Email, Payment ID, HTML Content, and Document Type are required.' });
    }

    const tempFilename = `${paymentId.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    let pdfPath: string | undefined;

    try {
        await emailService.checkEmailConfig();

        if (pdfGenerator) {
            const outputPath = path.join(pdfGenerator.UPLOADS_DIR, tempFilename);
            const printResult = await quotationPrintHandler.generatePDF(htmlContent, outputPath);
            if (printResult.success) {
                pdfPath = outputPath;
            }
        }

        const companyObj = await getCompanyInfoForEmail();
        const typeLabel = documentType === 'payment voucher' ? 'Payment Voucher' : 'Payment Receipt';
        const formattedAmount = amount ? formatAmountForTemplate(parseFloat(amount) || 0) : '—';
        const formattedDate = date ? formatDateForTemplate(date) : formatDateForTemplate(new Date());

        const html = emailService.buildDocumentEmailBody({
            documentType: typeLabel,
            customerName: partyName || 'Valued Client',
            referenceNo: paymentId,
            date: formattedDate,
            amount: formattedAmount,
            companyName: companyObj.name
        });

        const attachments = pdfPath
            ? [{ filename: tempFilename, path: pdfPath, contentType: 'application/pdf' }]
            : [];

        const result = await emailService.sendEmail({
            to: email,
            subject: `${typeLabel} — ${paymentId} | ${companyObj.name}`,
            html,
            attachments
        });

        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Document',
            referenceId: paymentId,
            content: `${typeLabel} emailed to ${partyName || 'Valued Client'}. Reference: ${paymentId}. Amount: ${formattedAmount}`,
            status: 'Success',
            messageId: result.messageId
        });

        if (pdfPath) {
            try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
        }

        return res.json({ message: `${typeLabel} sent via Email.` });
    } catch (err: any) {
        logger.error('Email payment send failed', { service: 'email', error: err.message, paymentId });
        const errMsg = err.message || String(err);
        await logCommunication({
            recipient: email,
            type: 'Email',
            messageType: 'Document',
            referenceId: paymentId,
            status: 'Failed',
            errorMessage: errMsg
        });
        if (pdfPath) {
            try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
        }
        return res.status(500).json({ message: 'Failed to send payment document via email.', error: errMsg });
    }
});

// ─── WEBHOOK ROUTES ───────────────────────────────────────────────────────────

// GET /webhook - WhatsApp Webhook verification
router.get('/webhook', async (req: Request, res: Response) => {
    try {
        const creds = await resolveWhatsAppCredentials();
        const verifyToken = creds.verifyToken || config.whatsapp.verifyToken || '';
        
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === verifyToken) {
            logger.info('WhatsApp webhook verified successfully', { service: 'messaging' });
            return res.status(200).send(challenge);
        } else {
            logger.warn('WhatsApp webhook verification failed: Token mismatch', { 
                service: 'messaging', 
                receivedToken: token,
                expectedToken: verifyToken ? 'configured' : 'empty'
            });
            return res.sendStatus(403);
        }
    } catch (err: any) {
        logger.error('Error during webhook verification:', err);
        return res.sendStatus(500);
    }
});

// POST /webhook - Handle WhatsApp status updates
router.post('/webhook', async (req: Request, res: Response) => {
    const body = req.body;

    // Check if it's a WhatsApp webhook event
    if (body.object === 'whatsapp_business_account') {
        try {
            if (body.entry && Array.isArray(body.entry)) {
                for (const entry of body.entry) {
                    if (entry.changes && Array.isArray(entry.changes)) {
                        for (const change of entry.changes) {
                            if (change.value && change.value.statuses && Array.isArray(change.value.statuses)) {
                                for (const statusObj of change.value.statuses) {
                                    const messageId = statusObj.id;
                                    const waStatus = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
                                    
                                    // Map WhatsApp status to schema format
                                    let mappedStatus: "Sent" | "Delivered" | "Read" | "Failed" | null = null;
                                    if (waStatus === 'sent') mappedStatus = 'Sent';
                                    else if (waStatus === 'delivered') mappedStatus = 'Delivered';
                                    else if (waStatus === 'read') mappedStatus = 'Read';
                                    else if (waStatus === 'failed') mappedStatus = 'Failed';

                                    if (mappedStatus && messageId) {
                                        // Update database record matching this messageId
                                        const query: any = { messageId };
                                        const updateData: any = { status: mappedStatus };
                                        
                                        if (waStatus === 'failed' && statusObj.errors && statusObj.errors.length > 0) {
                                            updateData.errorMessage = statusObj.errors[0].message || statusObj.errors[0].title || 'Unknown failure';
                                        }

                                        const updatedComm = await CommunicationModel.findOneAndUpdate(query, updateData, { returnDocument: 'after' });
                                        if (updatedComm) {
                                            logger.info(`WhatsApp webhook updated message ${messageId} to status: ${mappedStatus}`, { service: 'messaging' });
                                        } else {
                                            logger.debug(`Received WhatsApp status update for unrecognized messageId: ${messageId}`, { service: 'messaging' });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        } catch (error: any) {
            logger.error('Error handling WhatsApp webhook payload:', error);
            return res.status(500).send('Webhook processing error');
        }
    } else {
        // Return 404 if event is not from WhatsApp API
        return res.sendStatus(404);
    }
});

export default router;
