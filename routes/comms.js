const express = require('express');
const { Quotations, Invoices } = require('./database');
const router = express.Router();
const axios = require('axios');

// Load WhatsApp credentials from environment variables
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Helper to build WhatsApp API URL
function getWhatsAppApiUrl(endpoint = 'messages') {
    return `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/${endpoint}`;
}

async function registerNumber() {
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/register`;
  const resp = await axios.post(
    url,
    { messaging_product: 'whatsapp', pin: '111111' },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
  console.log(resp.data); // expect { success: true }
}


// Send WhatsApp “Reminder” template
// {{1}} → card / product name   (text)
// {{2}} → last‑4 digits         (text)
// {{3}} → scheduled date        (text)

async function sendPaymentReminder(
  phone,
  cardName = 'CS Mutual Credit Plus',
  last4    = '1234',
  dueDate  = 'Mar 22, 2024'
) {
  const payload = {
    messaging_product: 'whatsapp',
    to: phone.replace(/^\+/, ''),              // digits only
    type: 'template',
    template: {
      name: 'pay_reminder',                    // EXACT name in Manager
      language: { code: 'en_US' },               // or 'en_US' if that’s the locale you added
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: cardName },  // {{1}}
            { type: 'text', text: last4 },     // {{2}}
            { type: 'text', text: dueDate }    // {{3}}
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


// Send WhatsApp Text Message
async function sendTextMessage(phone, text) {
    const response = await axios({
        url: getWhatsAppApiUrl('messages'),
        method: 'post',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: text }
        })
    });

    console.log(response.data);
}

// Send WhatsApp Media Message
async function sendMediaMessage(phone, mediaId, caption = '') {
    const response = await axios({
        url: getWhatsAppApiUrl('messages'),
        method: 'post',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'image',
            image: {
                id: mediaId,
                caption: caption
            }
        })
    });

    console.log(response.data);
}

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
        await sendPaymentReminder(phone, 'This is a manual payment reminder from Shresht Systems.');
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