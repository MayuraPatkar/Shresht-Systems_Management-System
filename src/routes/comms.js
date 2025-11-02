const express = require('express');
const { Quotations, Invoices } = require('../models');
const router = express.Router();
const axios = require('axios');

// Load WhatsApp credentials from environment variables
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Helper to build WhatsApp API URL
function getWhatsAppApiUrl(endpoint = 'messages') {
    return `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/${endpoint}`;
}

// Generic function to send WhatsApp text message
async function sendWhatsAppMessage(phone, message) {
    const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
    };

    try {
        const { data } = await axios.post(
            getWhatsAppApiUrl('messages'),
            payload,
            { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
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
        const { data } = await axios.post(
            getWhatsAppApiUrl('messages'),
            payload,
            { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
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


// Send invoice
router.post('/send-invoice', async (req, res) => {
    const { phone, invoiceId } = req.body;
    if (!phone || !invoiceId) return res.status(400).json({ message: 'Phone and Invoice ID required.' });
    try {
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }
        
        const totalAmount = invoice.total_amount_original || 0;
        await sendWhatsAppMessage(phone, `Your invoice (ID: ${invoiceId}) from Shresht Systems. Total Amount: ₹${totalAmount.toFixed(2)}`);
        res.json({ message: 'Invoice sent via WhatsApp.' });
    } catch (err) {
        console.error('Error sending invoice:', err);
        res.status(500).json({ message: 'Failed to send invoice.', error: err.message });
    }
});

// Send quotation
router.post('/send-quotation', async (req, res) => {
    const { phone, quotationId } = req.body;
    if (!phone || !quotationId) return res.status(400).json({ message: 'Phone and Quotation ID required.' });
    try {
        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found.' });
        }
        
        await sendWhatsAppMessage(phone, `Your quotation (ID: ${quotationId}) from Shresht Systems. Total Amount: ₹${quotation.total_amount || 0}`);
        res.json({ message: 'Quotation sent via WhatsApp.' });
    } catch (err) {
        console.error('Error sending quotation:', err);
        res.status(500).json({ message: 'Failed to send quotation.', error: err.message });
    }
});

// Send custom message
router.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
        return res.status(400).json({ message: 'Phone number and message are required.' });
    }
    
    try {
        await sendWhatsAppMessage(phoneNumber, message);
        res.json({ message: 'Message sent successfully via WhatsApp.' });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Failed to send message.', error: err.message });
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
