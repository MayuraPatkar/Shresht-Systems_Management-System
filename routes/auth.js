const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define Admin Schema and Model
const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    phone: {
        ph1: { type: String, required: true },
        ph2: { type: String, required: false },
    },
    GSTIN: { type: String, required: true },
    bank_details: {
        bank_name: { type: String, required: true },
        name: { type: String, required: true },
        accountNo: { type: Number, required: true },
        type: { type: String, required: true },
        IFSC_code: { type: String, required: true },
        branch: { type: String, required: true },
    },
});

const Admin = mongoose.model('Admin', adminSchema);

// Login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Fetch the single admin document from the collection
        const admin = await Admin.findOne();

        if (!admin || admin.username !== username) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare provided password with the stored hashed password
        if (password != admin.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
