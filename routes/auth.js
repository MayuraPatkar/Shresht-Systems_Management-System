const express = require('express');
const router = express.Router();
const { Admin } = require('./database');

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
