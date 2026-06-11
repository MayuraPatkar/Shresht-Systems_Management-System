import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { QuotationModel, InvoiceModel, AdminModel, SettingsModel } from '../models';
import config from '../config/config';
import logger from '../utils/logger';
import secureStore from '../utils/secureStore';
import { formatDateReadable as formatDateForTemplate } from '../utils/dateUtils';

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
    if (!phoneNumberId) {
        try {
            const settings = await SettingsModel.findOne();
            if (settings && (settings as any).whatsapp && (settings as any).whatsapp.phoneNumberId) {
                phoneNumberId = (settings as any).whatsapp.phoneNumberId;
            }
        } catch (err: unknown) {
            logger.warn('Settings DB lookup failed', { service: "messaging", error: (err as Error).message });
        }
    }

    const pdfBaseUrl = (config.whatsapp && config.whatsapp.pdfBaseUrl) || (await (async () => {
        try {
            const settings = await SettingsModel.findOne();
            return (settings as any)?.whatsapp?.pdfBaseUrl || '';
        } catch { return ''; }
    })()) || '';

    cachedAt = Date.now();
    cachedWhatsApp = { token, phoneNumberId, pdfBaseUrl };

    logger.info('WhatsApp credentials resolved', {
        service: "messaging",
        hasToken: !!token,
        hasPhoneNumberId: !!phoneNumberId,
        hasPdfBaseUrl: !!pdfBaseUrl
    });

    return cachedWhatsApp;
}

/**
 * Get company info from Admin model for PDF generation
 */
async function getCompanyInfo(): Promise<Record<string, string>> {
    try {
        const admin = await AdminModel.findOne() as any;
        if (!admin) {
            return {};
        }
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

async function sendPaymentReminder(phone: string, amount_due: string): Promise<void> {
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
        await axios.post(
            getWhatsAppApiUrl(creds.phoneNumberId, 'messages'),
            payload,
            { headers: { Authorization: `Bearer ${creds.token}` } }
        );
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
        const amountDue = Math.max(totalDue - totalPaid, 0);

        await sendPaymentReminder(phoneNumber, amountDue.toFixed(2));

        return res.json({ message: 'Manual payment reminder sent successfully.' });
    } catch (err: any) {
        logger.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
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
    const { phone, invoiceId, documentUrl: providedUrl } = req.body;
    if (!phone || !invoiceId) return res.status(400).json({ message: 'Phone and Invoice ID required.' });

    try {
        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            logger.warn(`Invoice not found: ${invoiceId}`);
            return res.status(404).json({ message: `Invoice "${invoiceId}" not found. Please check the invoice ID.` });
        }

        let documentUrl = providedUrl;
        let isCloudUploaded = false;

        if (!documentUrl && pdfGenerator) {
            const companyInfo = await getCompanyInfo();
            const pdfResult = await pdfGenerator.generateInvoicePDF(invoice, companyInfo);

            if (!pdfResult.success) {
                logger.error('Invoice PDF generation failed', { service: "messaging", error: pdfResult.error, invoiceId });
                return res.status(500).json({
                    message: 'Failed to generate PDF.',
                    error: pdfResult.error
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

        await sendDocumentTemplate(phone, {
            documentType: 'invoice',
            customerName: customerName,
            referenceNo: invoiceId,
            date: formatDateForTemplate(invoiceDate),
            amount: formatAmountForTemplate(totalAmount),
            documentUrl: documentUrl
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
        res.status(500).json({
            message: 'Failed to send invoice.',
            error: err?.response?.data || err.message
        });
    }
});

// Send quotation using template (auto-generates PDF)
router.post('/send-quotation', async (req: Request, res: Response) => {
    const { phone, quotationId, documentUrl: providedUrl } = req.body;
    if (!phone || !quotationId) return res.status(400).json({ message: 'Phone and Quotation ID required.' });

    try {
        const quotation = await QuotationModel.findOne({ quotation_no: quotationId }) as any;
        if (!quotation) {
            logger.warn(`Quotation not found: ${quotationId}`);
            return res.status(404).json({ message: `Quotation "${quotationId}" not found. Please check the quotation ID.` });
        }

        let documentUrl = providedUrl;
        let isCloudUploaded = false;

        if (!documentUrl && pdfGenerator) {
            const companyInfo = await getCompanyInfo();
            const pdfResult = await pdfGenerator.generateQuotationPDF(quotation, companyInfo);

            if (!pdfResult.success) {
                logger.error('Quotation PDF generation failed', { service: "messaging", error: pdfResult.error, quotationId });
                return res.status(500).json({
                    message: 'Failed to generate PDF.',
                    error: pdfResult.error
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

        await sendDocumentTemplate(phone, {
            documentType: 'quotation',
            customerName: customerName,
            referenceNo: quotationId,
            date: formatDateForTemplate(quotationDate),
            amount: formatAmountForTemplate(totalAmount),
            documentUrl: documentUrl
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
        res.status(500).json({
            message: 'Failed to send quotation.',
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
        await sendDocumentTemplate(phone, {
            documentType: documentType,
            customerName: customerName,
            referenceNo: referenceNo,
            date: formatDateForTemplate(date),
            amount: formatAmountForTemplate(parseFloat(amount) || 0),
            documentUrl: documentUrl
        });

        res.json({ message: 'Document sent via WhatsApp.' });
    } catch (err: any) {
        logger.error('Error sending document:', err);
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
        await sendSimpleMessageTemplate(phoneNumber, message);
        res.json({ message: 'Message sent successfully via WhatsApp.' });
    } catch (err: any) {
        logger.error('Message send failed', { service: "messaging", error: err?.response?.data || err.message, phone: phoneNumber });
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
            try {
                const totalDue = invoice.total_amount_original || 0;
                const totalPaid = invoice.total_paid_amount || 0;
                const amountDue = Math.max(totalDue - totalPaid, 0);
                const phone = invoice.customer_phone;

                if (phone && amountDue > 0) {
                    await sendPaymentReminder(phone, amountDue.toFixed(2));
                    successCount++;
                }
            } catch (err: unknown) {
                logger.error(`Failed to send reminder for invoice ${invoice.invoice_id}:`, err);
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

export default router;
