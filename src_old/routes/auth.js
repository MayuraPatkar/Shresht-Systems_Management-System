const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Admin, Settings } = require('../models');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const validators = require('../middleware/validators');

// Login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Get security settings
        const settings = await Settings.findOne();
        const maxAttempts = settings?.security?.max_login_attempts || 5;
        const lockoutDuration = settings?.security?.lockout_duration || 15; // minutes

        // Fetch the user document from the collection
        const user = await Admin.findOne(username ? { username } : {});
        if (!user || user.username !== username) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            logger.warn('Login attempt on locked account', {
                service: "auth",
                event: "login_blocked",
                username: user.username,
                remainingMinutes: remainingTime
            });
            return res.status(423).json({
                success: false,
                message: `Account is locked. Try again in ${remainingTime} minute(s).`,
                locked: true,
                remainingTime
            });
        }

        // Use bcrypt to compare hashed passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            // Lock account if max attempts reached
            if (user.loginAttempts >= maxAttempts) {
                user.lockUntil = new Date(Date.now() + lockoutDuration * 60000);
                await user.save();
                logger.warn('Account locked due to failed attempts', {
                    service: "auth",
                    event: "account_locked",
                    username: user.username,
                    lockDurationMinutes: lockoutDuration
                });
                return res.status(423).json({
                    success: false,
                    message: `Account locked for ${lockoutDuration} minutes due to too many failed attempts.`,
                    locked: true,
                    remainingTime: lockoutDuration
                });
            }

            await user.save();
            const attemptsRemaining = maxAttempts - user.loginAttempts;
            logger.warn('Authentication failed', {
                service: "auth",
                event: "login_failed",
                username: user.username,
                attemptsRemaining
            });
            return res.status(401).json({
                success: false,
                message: `Invalid credentials. ${attemptsRemaining} attempt(s) remaining.`,
                attemptsRemaining
            });
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lastLogin = new Date();
        await user.save();

        const role = user.role;

        logger.info('User logged in', {
            service: "auth",
            event: "login_success",
            username: user.username,
            role: role
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            role: role,
            username: user.username,
            sessionTimeout: settings?.security?.session_timeout || 30
        });
    } catch (error) {
        logger.error('Login error', { service: "auth", error: error.message });
        res.status(500).json({ success: false, message: 'Internal server error' });
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
        logger.error("Error fetching admin info:", error);
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
        logger.error("Error changing username:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change Password
router.post("/change-password", async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Verify old password using bcrypt
        const isValidOldPassword = await bcrypt.compare(oldPassword, admin.password);
        if (!isValidOldPassword) {
            return res.status(401).json({ message: "Invalid old password" });
        }

        // Hash and save new password
        const saltRounds = 10;
        admin.password = await bcrypt.hash(newPassword, saltRounds);
        await admin.save();
        res.json({ message: "Password updated successfully" });
    } catch (error) {
        logger.error("Error changing password:", error);
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
        logger.error("Error exporting data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
