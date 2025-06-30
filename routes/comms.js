const express = require('express');
const { Quotations,Invoices } = require('./database');
const router = express.Router();

const axios = require('axios');


const registerWhatsAppNumber = async () => {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/register`;
  const data = {
    messaging_product: "whatsapp",
    pin: "111111", // use the PIN shown during registration
  };

  await axios.post(url, data, {
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    }
  });

  console.log("Number registered successfully.");
};


const sendWhatsAppMessage = async (phone, message) => {
    // registerWhatsAppNumber();    // Remove any leading '+' from the phone number
    const cleanPhone = phone.replace(/^\+/, '');
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message }
    };
    console.log('Sending message to:', cleanPhone, 'Message:', message);
    await axios.post(url, data, {
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
            'pin': "111111"
        }
    });
    return true;
};

// Mock database functions
const getUnpaidProjects = async () => {
    // Replace with your DB logic
    return 5; // Example: 5 unpaid projects
};

// --- ROUTES ---

// Get total unpaid projects
router.get('/unpaid-projects', async (req, res) => {
    try {
        const total = await getUnpaidProjects();
        res.json({ total });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch unpaid projects.' });
    }
});

// Send automated payment reminders
router.post('/send-automated-reminders', async (req, res) => {
    try {
        // Replace with your DB logic to get all unpaid clients
        const unpaidClients = [
            { phone: '+919999999999', name: 'Client A' },
            { phone: '+918888888888', name: 'Client B' }
        ];
        for (const client of unpaidClients) {
            await sendWhatsAppMessage(client.phone, `Dear ${client.name}, this is a payment reminder for your pending project.`);
        }
        res.json({ message: 'Automated payment reminders sent.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send automated reminders.' });
    }
});

// Send manual payment reminder
router.post('/send-manual-reminder', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required.' });
    try {
        await sendWhatsAppMessage(phone, 'This is a manual payment reminder from Shresht Systems.');
        res.json({ message: 'Manual payment reminder sent.' });
    } catch (err) {
        // Log the full error response from Meta
        console.error('WhatsApp API error:', err?.response?.data || err.message || err);
        res.status(500).json({ message: 'Failed to send manual reminder.', error: err?.response?.data || err.message });
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