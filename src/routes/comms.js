const express = require('express');
const path = require('path');
const fs = require('fs');
const { Quotations, Invoices, Admin } = require('../models');
const router = express.Router();
const axios = require('axios');
const config = require('../config/config');
const pdfGenerator = require('../utils/pdfGenerator');
const cloudStorage = require('../utils/cloudStorage');
const logger = require('../utils/logger');

// Load WhatsApp credentials from env/config; fallback to secure store and DB settings
const secureStore = require('../utils/secureStore');
let cachedWhatsApp = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache for credential lookups

async function resolveWhatsAppCredentials() {
    if (cachedWhatsApp && (Date.now() - cachedAt) < CACHE_TTL_MS) return cachedWhatsApp;

    // Priorities: env -> secure store (keytar) -> settings DB -> config.pdfBaseUrl / defaults
    let token = process.env.WHATSAPP_TOKEN || config.whatsapp.token || '';
    try {
        if (!token) {
            token = await secureStore.getWhatsAppToken();
        }
    } catch (e) {
        // ignore
    }

    // Phone Number ID: env -> config -> settings
    let phoneNumberId = process.env.PHONE_NUMBER_ID || config.whatsapp.phoneNumberId || '';
    if (!phoneNumberId) {
        // Try to read from settings DB
        try {
            const { Settings } = require('../models');
            const settings = await Settings.findOne();
            if (settings && settings.whatsapp && settings.whatsapp.phoneNumberId) {
                phoneNumberId = settings.whatsapp.phoneNumberId;
            }
        } catch (err) {
            logger.warn('Failed to read WhatsApp phoneNumberId from settings:', err && err.message);
        }
    }

    const pdfBaseUrl = (config.whatsapp && config.whatsapp.pdfBaseUrl) || (await (async () => {
        try {
            const { Settings } = require('../models');
            const settings = await Settings.findOne();
            return settings?.whatsapp?.pdfBaseUrl || '';
        } catch (e) { return '' }
    })()) || '';

    cachedAt = Date.now();
    cachedWhatsApp = { token, phoneNumberId, pdfBaseUrl };
    return cachedWhatsApp;
}

/**
 * Get company info from Admin model for PDF generation
 * @returns {Promise<Object>} Company information
 */
async function getCompanyInfo() {
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return {};
        }
        return {
            name: admin.company || 'Shresht Systems',
            tagline: 'CCTV & Energy Solutions',
            address: admin.address || '',
            phone: admin.phone?.ph1 || '',
            gstin: admin.GSTIN || '',
            email: admin.email || '',
            website: admin.website || ''
        };
    } catch (error) {
        logger.error('Error fetching company info:', error);
        return {};
    }
}

// Helper to build WhatsApp API URL
function getWhatsAppApiUrl(phoneNumberId, endpoint = 'messages') {
    if (!phoneNumberId) {
        throw new Error('WhatsApp Phone Number ID is not configured');
    }
    return `https://graph.facebook.com/v20.0/${phoneNumberId}/${endpoint}`;
}

// Check if WhatsApp is properly configured (runtime async version)
async function checkWhatsAppConfig() {
    const creds = await resolveWhatsAppCredentials();
    if (!creds || !creds.token || !creds.phoneNumberId) {
        throw new Error('WhatsApp API is not configured. Please configure token and phone number ID from Settings or environment.');
    }
    return true;
}

// Generic function to send WhatsApp text message
async function sendWhatsAppMessage(phone, message) {
    // Validate WhatsApp configuration before sending
    // checkWhatsAppConfig(); // now resolved at runtime
    
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
        console.log('WhatsApp message sent:', data);
        return data;
    } catch (err) {
        console.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        throw err;
    }
}

async function sendPaymentReminder(phone, amount_due) {
    // Validate WhatsApp configuration before sending (runtime)
    // checkWhatsAppConfig();
    // Send WhatsApp “Reminder” template
    // {{1}} → amount   (text)
    // {{2}} → invoice No         (text)
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
                        { type: 'text', text: amount_due },  // {{1}}
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
        console.log('sent:', data);
    } catch (err) {
        console.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        throw err;
    }
}

// POST /send-manual-reminder
router.post('/send-manual-reminder', async (req, res) => {
    const { phoneNumber, invoiceId } = req.body;

    // ── Basic validation ───────────────────────────────────────────────
    if (!phoneNumber)
        return res.status(400).json({ message: 'Phone number is required.' });
    if (!invoiceId)
        return res.status(400).json({ message: 'Invoice ID is required.' });

    try {
        // ── 1. Look up the invoice ───────────────────────────────────────
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found.' });

        // ── 2. Bail out if already settled ───────────────────────────────
        const isPaid = invoice.payment_status?.toUpperCase() === 'PAID';
        if (isPaid) {
            return res
                .status(200)
                .json({ message: 'Invoice already paid. No reminder sent.' });
        }

        // ── 3. Compute the amount still due ──────────────────────────────
        const totalDue = invoice.total_amount_original || 0;
        const totalPaid = invoice.total_paid_amount || 0;
        const amountDue = Math.max(totalDue - totalPaid, 0);

        // ── 4. Fire off the WhatsApp reminder ────────────────────────────
        await sendPaymentReminder(
            phoneNumber,
            amountDue.toFixed(2)            // {{1}}
        );


        return res.json({ message: 'Manual payment reminder sent successfully.' });
    } catch (err) {
        console.error(
            'WhatsApp API error:',
            err?.response?.data || err.message || err
        );
        return res.status(500).json({
            message: 'Failed to send manual reminder.',
            error: err?.response?.data || err.message,
        });
    }
});


/**
 * Send a simple message using the "simple_message" template
 * Template structure:
 * - Body: "Dear Customer, {{1}} Thank You, SHRESHT SYSTEMS"
 * 
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} message - The message content for {{1}} parameter
 */
async function sendSimpleMessageTemplate(phone, message) {
    // Validate WhatsApp configuration before sending
    // checkWhatsAppConfig();
    
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
                        { type: 'text', text: message }  // {{1}} - The message content
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
        logger.info('Simple message sent successfully', { 
            to: phone, 
            messageId: data.messages?.[0]?.id 
        });
        return data;
    } catch (err) {
        logger.error('WhatsApp API error (simple_message)', {
            error: err?.response?.data || err.message,
            phone
        });
        throw err;
    }
}


/**
 * Send document via WhatsApp using the "sending_documents" template
 * Template structure:
 * - Header: Document PDF attachment (REQUIRED)
 * - Body: {{1}} = Customer Name, {{2}} = Document Type (quotation/invoice), 
 *         {{3}} = Reference No, {{4}} = Date, {{5}} = Amount
 * - Footer: Contact information (static)
 * 
 * @param {string} phone - Recipient phone number (with country code)
 * @param {object} docDetails - Document details
 * @param {string} docDetails.documentUrl - URL to document PDF (REQUIRED - must be publicly accessible)
 * @param {string} docDetails.documentType - Type of document (e.g., "quotation", "invoice")
 * @param {string} docDetails.customerName - Customer/Buyer name
 * @param {string} docDetails.referenceNo - Document reference number (e.g., QT-1092, INV-001)
 * @param {string} docDetails.date - Document date (formatted as DD MMM YYYY)
 * @param {string} docDetails.amount - Total amount (formatted with ₹ symbol)
 */
async function sendDocumentTemplate(phone, docDetails) {
    // Validate WhatsApp configuration before sending
    await checkWhatsAppConfig();
    
    const { documentType, customerName, referenceNo, date, amount, documentUrl } = docDetails;
    
    // Document URL is required for this template
    if (!documentUrl) {
        throw new Error('Document URL is required. The WhatsApp template requires a PDF attachment.');
    }
    
    // Build template components
    const components = [
        // Header component with document (REQUIRED)
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
        // Body component with all 5 parameters
        {
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },    // {{1}} - Customer Name
                { type: 'text', text: documentType },    // {{2}} - Document Type (quotation/invoice)
                { type: 'text', text: referenceNo },     // {{3}} - Reference No
                { type: 'text', text: date },            // {{4}} - Date
                { type: 'text', text: amount }           // {{5}} - Amount
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
    } catch (err) {
        logger.error('WhatsApp API error (sending_documents)', {
            error: err?.response?.data || err.message,
            phone,
            referenceNo: docDetails.referenceNo
        });
        throw err;
    }
}

/**
 * Format date to "DD MMM YYYY" format for WhatsApp template
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateForTemplate(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

/**
 * Format amount with Indian Rupee symbol
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount string
 */
function formatAmountForTemplate(amount) {
    // Format with Indian number system (lakhs, crores)
    const formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(amount);
    return `₹${formatted}`;
}

// Send invoice using template (auto-generates PDF)
router.post('/send-invoice', async (req, res) => {
    const { phone, invoiceId, documentUrl: providedUrl } = req.body;
    if (!phone || !invoiceId) return res.status(400).json({ message: 'Phone and Invoice ID required.' });
    
    try {
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            logger.warn(`Invoice not found: ${invoiceId}`);
            return res.status(404).json({ message: `Invoice "${invoiceId}" not found. Please check the invoice ID.` });
        }
        
        let documentUrl = providedUrl;
        
        // If no URL provided, generate PDF and upload to cloud or use local URL
        if (!documentUrl) {
            const companyInfo = await getCompanyInfo();
            const pdfResult = await pdfGenerator.generateInvoicePDF(invoice, companyInfo);
            
            if (!pdfResult.success) {
                logger.error('Failed to generate invoice PDF:', { error: pdfResult.error, invoiceId });
                return res.status(500).json({ 
                    message: 'Failed to generate PDF.', 
                    error: pdfResult.error 
                });
            }
            
            // Try to upload to cloud storage (Cloudinary) for public accessibility
            if (cloudStorage.isConfigured()) {
                const uploadResult = await cloudStorage.uploadPDF(pdfResult.path, invoiceId);
                if (uploadResult.success) {
                    documentUrl = uploadResult.url;
                    logger.info(`Invoice PDF uploaded to cloud: ${documentUrl}`);
                } else {
                    logger.warn(`Cloud upload failed, using local URL: ${uploadResult.error}`);
                }
            }
            
            // Fallback to local URL if cloud upload failed or not configured
            if (!documentUrl) {
                const baseUrl = config.whatsapp.pdfBaseUrl || `http://localhost:${config.port}`;
                documentUrl = `${baseUrl}/documents/${pdfResult.filename}`;
                
                if (documentUrl.includes('localhost') || documentUrl.includes('127.0.0.1')) {
                    logger.warn(`Invoice PDF URL uses localhost which may not be accessible by WhatsApp: ${documentUrl}`);
                }
            }
            
            logger.info(`Generated invoice PDF: ${documentUrl}`);
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
        
        res.json({ 
            message: 'Invoice sent via WhatsApp.',
            pdfUrl: documentUrl
        });
    } catch (err) {
        logger.error('Error sending invoice:', { error: err?.response?.data || err.message, invoiceId });
        res.status(500).json({ 
            message: 'Failed to send invoice.', 
            error: err?.response?.data || err.message 
        });
    }
});

// Send quotation using template (auto-generates PDF)
router.post('/send-quotation', async (req, res) => {
    const { phone, quotationId, documentUrl: providedUrl } = req.body;
    if (!phone || !quotationId) return res.status(400).json({ message: 'Phone and Quotation ID required.' });
    
    try {
        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            logger.warn(`Quotation not found: ${quotationId}`);
            return res.status(404).json({ message: `Quotation "${quotationId}" not found. Please check the quotation ID.` });
        }
        
        let documentUrl = providedUrl;
        
        // If no URL provided, generate PDF and upload to cloud or use local URL
        if (!documentUrl) {
            const companyInfo = await getCompanyInfo();
            const pdfResult = await pdfGenerator.generateQuotationPDF(quotation, companyInfo);
            
            if (!pdfResult.success) {
                logger.error('Failed to generate quotation PDF:', { error: pdfResult.error, quotationId });
                return res.status(500).json({ 
                    message: 'Failed to generate PDF.', 
                    error: pdfResult.error 
                });
            }
            
            // Try to upload to cloud storage (Cloudinary) for public accessibility
            if (cloudStorage.isConfigured()) {
                const uploadResult = await cloudStorage.uploadPDF(pdfResult.path, quotationId);
                if (uploadResult.success) {
                    documentUrl = uploadResult.url;
                    logger.info(`Quotation PDF uploaded to cloud: ${documentUrl}`);
                } else {
                    logger.warn(`Cloud upload failed, using local URL: ${uploadResult.error}`);
                }
            }
            
            // Fallback to local URL if cloud upload failed or not configured
            if (!documentUrl) {
                const baseUrl = config.whatsapp.pdfBaseUrl || `http://localhost:${config.port}`;
                documentUrl = `${baseUrl}/documents/${pdfResult.filename}`;
                
                if (documentUrl.includes('localhost') || documentUrl.includes('127.0.0.1')) {
                    logger.warn(`Quotation PDF URL uses localhost which may not be accessible by WhatsApp: ${documentUrl}`);
                }
            }
            
            logger.info(`Generated quotation PDF: ${documentUrl}`);
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
        
        res.json({ 
            message: 'Quotation sent via WhatsApp.',
            pdfUrl: documentUrl
        });
    } catch (err) {
        logger.error('Error sending quotation:', { error: err?.response?.data || err.message, quotationId });
        res.status(500).json({ 
            message: 'Failed to send quotation.', 
            error: err?.response?.data || err.message 
        });
    }
});

// Send generic document using template (for any document type)
// Can be used for waybills, purchase orders, or any other documents
router.post('/send-document', async (req, res) => {
    const { phone, documentType, customerName, referenceNo, date, amount, documentUrl } = req.body;
    
    // Validation
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });
    if (!documentUrl) return res.status(400).json({ message: 'Document URL is required. Please provide a publicly accessible URL to the document PDF.' });
    if (!documentType) return res.status(400).json({ message: 'Document type is required.' });
    if (!customerName) return res.status(400).json({ message: 'Customer name is required.' });
    if (!referenceNo) return res.status(400).json({ message: 'Reference number is required.' });
    if (!date) return res.status(400).json({ message: 'Date is required.' });
    if (amount === undefined || amount === null) return res.status(400).json({ message: 'Amount is required.' });
    
    try {
        await sendDocumentTemplate(phone, {
            documentType: documentType, // e.g., 'quotation', 'invoice', 'waybill', 'purchase order'
            customerName: customerName,
            referenceNo: referenceNo,
            date: formatDateForTemplate(date),
            amount: formatAmountForTemplate(parseFloat(amount) || 0),
            documentUrl: documentUrl
        });
        
        res.json({ message: 'Document sent via WhatsApp.' });
    } catch (err) {
        console.error('Error sending document:', err);
        res.status(500).json({ 
            message: 'Failed to send document.', 
            error: err?.response?.data || err.message 
        });
    }
});

// Send custom message using simple_message template
router.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
        return res.status(400).json({ message: 'Phone number and message are required.' });
    }
    
    try {
        await sendSimpleMessageTemplate(phoneNumber, message);
        res.json({ message: 'Message sent successfully via WhatsApp.' });
    } catch (err) {
        logger.error('Error sending message:', { error: err?.response?.data || err.message, phone: phoneNumber });
        res.status(500).json({ message: 'Failed to send message.', error: err?.response?.data || err.message });
    }
});

// Send automated reminders to all unpaid invoices
router.post('/send-automated-reminders', async (req, res) => {
    try {
        // Find all unpaid and partially paid invoices
        const unpaidInvoices = await Invoices.find({
            payment_status: { $in: ['Unpaid', 'Partial'] }
        });
        
        if (unpaidInvoices.length === 0) {
            return res.json({ message: 'No unpaid invoices found.' });
        }
        
        let successCount = 0;
        let failCount = 0;
        
        // Send reminders to each unpaid invoice
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
            } catch (err) {
                console.error(`Failed to send reminder for invoice ${invoice.invoice_id}:`, err);
                failCount++;
            }
        }
        
        res.json({ 
            message: `Sent ${successCount} reminders successfully. ${failCount > 0 ? `${failCount} failed.` : ''}`,
            success: successCount,
            failed: failCount
        });
    } catch (err) {
        console.error('Error sending automated reminders:', err);
        res.status(500).json({ message: 'Failed to send automated reminders.', error: err.message });
    }
});

module.exports = router;
