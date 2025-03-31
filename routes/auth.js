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

router.get("/admin-info", async (req, res) => {
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin data not found" });
        }
        res.json(admin);
    } catch (error) {
        console.error("Error fetching admin info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change Username
router.post("/change-username", async (req, res) => {
    const { username } = req.body;
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        admin.username = username;
        await admin.save();
        res.json({ message: "Username updated successfully" });
    } catch (error) {
        console.error("Error changing username:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change Password
router.post("/change-password", async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const admin = await Admin.findOne();
        if (!admin || admin.password !== oldPassword) {
            return res.status(401).json({ message: "Invalid old password" });
        }
        admin.password = newPassword;
        await admin.save();
        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Export Data
router.get("/export-data", async (req, res) => {
    const { format } = req.query;
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin data not found" });
        }

        let data;
        if (format === "csv") {
            data = `Username,Address,Email\n${admin.username},${admin.address},${admin.email}`;
            res.setHeader("Content-Type", "text/csv");
        } else if (format === "xml") {
            data = `<admin><username>${admin.username}</username><address>${admin.address}</address><email>${admin.email}</email></admin>`;
            res.setHeader("Content-Type", "application/xml");
        } else {
            data = JSON.stringify(admin, null, 2);
            res.setHeader("Content-Type", "application/json");
        }

        res.setHeader("Content-Disposition", `attachment; filename=admin_data.${format}`);
        res.send(data);
    } catch (error) {
        console.error("Error exporting data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
