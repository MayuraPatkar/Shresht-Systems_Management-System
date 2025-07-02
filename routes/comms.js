const express = require('express');
const { Quotations,Invoices } = require('./database');
const router = express.Router();

const axios = require('axios');


async function sendWhatsAppMessage() {
    const response = await axios({
        url: 'https://graph.facebook.com/v22.0/phone_number_id/messages',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: 'phone_number',
            type: 'template',
            template:{
                name: 'discount',
                language: {
                    code: 'en_US'
                },
                components: [
                    {
                        type: 'header',
                        parameters: [
                            {
                                type: 'text',
                                text: 'John Doe'
                            }
                        ]
                    },
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: '50'
                            }
                        ]
                    }
                ]
            }
        })
    })

    console.log(response.data)
}

async function sendTextMessage() {
    const response = await axios({
        url: 'https://graph.facebook.com/v20.0/phone_number_id/messages',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: 'phone_number',
            type: 'text',
            text:{
                body: 'This is a text message'
            }
        })
    })

    console.log(response.data) 
}

async function sendMediaMessage() {
    const response = await axios({
        url: 'https://graph.facebook.com/v20.0/phone_number_id/messages',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: 'phone_number',
            type: 'image',
            image:{
                //link: 'https://dummyimage.com/600x400/000/fff.png&text=manfra.io',
                id: '512126264622813',
                caption: 'This is a media message'
            }
        })
    })

    console.log(response.data)    
}

async function uploadImage() {
    const data = new FormData()
    data.append('messaging_product', 'whatsapp')
    data.append('file', fs.createReadStream(process.cwd() + '/logo.png'), { contentType: 'image/png' })
    data.append('type', 'image/png')

    const response = await axios({
        url: 'https://graph.facebook.com/v20.0/phone_number_id/media',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        data: data
    })

    console.log(response.data)     
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