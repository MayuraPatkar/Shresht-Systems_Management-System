const express = require('express');
const { Quotations, Invoices } = require('../src/models');
const router = express.Router();
const axios = require('axios');

// Load WhatsApp credentials from environment variables
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Helper to build WhatsApp API URL
function getWhatsAppApiUrl(endpoint = 'messages') {
    return `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/${endpoint}`;
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
        const isPaid =
            (invoice.status?.toUpperCase?.() === 'PAID') ||  // string field
            Boolean(invoice.paidAt);                         // timestamp field
        if (isPaid) {
            return res
                .status(200)
                .json({ message: 'Invoice already paid. No reminder sent.' });
        }

        // ── 3. Compute the amount still due ──────────────────────────────
        const amountDue = Math.max((invoice.total_amount || 0) - (invoice.paid_amount || 0), 0);

        // ── 4. Fire off the WhatsApp reminder ────────────────────────────
        await sendPaymentReminder(
            phoneNumber,
            amountDue            // {{1}}
        );


        return res.json({ message: 'Manual payment reminder sent.' });
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
        await sendWhatsAppMessage(phone, `Your invoice (ID: ${invoiceId}) from Shresht Systems is attached.`);
        res.json({ message: 'Invoice sent via WhatsApp.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send invoice.' });
    }
});

// Send quotation
router.post('/send-quotation', async (req, res) => {
    const { phone, quotationId } = req.body;
    if (!phone || !quotationId) return res.status(400).json({ message: 'Phone and Quotation ID required.' });
    try {
        await sendWhatsAppMessage(phone, `Your quotation (ID: ${quotationId}) from Shresht Systems is attached.`);
        res.json({ message: 'Quotation sent via WhatsApp.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send quotation.' });
    }
});

module.exports = router;
