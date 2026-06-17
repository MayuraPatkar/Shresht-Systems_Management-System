import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminModel, SettingsModel } from '../models';
import logger from '../utils/logger';

const router: Router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        // Get security settings
        const settings = await SettingsModel.findOne();
        const maxAttempts = settings?.security?.max_login_attempts || 5;
        const lockoutDuration = settings?.security?.lockout_duration || 15; // minutes

        // Fetch the user document from the collection
        const user = await AdminModel.findOne(username ? { username } : {});
        if (!user || user.username !== username) {
            // Fallback to the main admin account to track failed attempts and prevent username enumeration
            const fallbackUser = await AdminModel.findOne({ role: 'admin' }) || await AdminModel.findOne();
            if (fallbackUser) {
                if (fallbackUser.lockUntil && fallbackUser.lockUntil > new Date(Date.now())) {
                    const remainingTime = Math.ceil((fallbackUser.lockUntil.getTime() - Date.now()) / 60000);
                    return res.status(423).json({
                        success: false,
                        message: `Account is locked. Try again in ${remainingTime} minute(s).`,
                        locked: true,
                        remainingTime
                    });
                }

                fallbackUser.loginAttempts = (fallbackUser.loginAttempts || 0) + 1;

                if (fallbackUser.loginAttempts >= maxAttempts) {
                    fallbackUser.lockUntil = new Date(Date.now() + lockoutDuration * 60000);
                    await fallbackUser.save();
                    logger.warn('Fallback admin account locked due to failed attempts with invalid username', {
                        service: "auth",
                        event: "account_locked",
                        username: fallbackUser.username,
                        attemptedUsername: username,
                        lockDurationMinutes: lockoutDuration
                    });
                    return res.status(423).json({
                        success: false,
                        message: `Account locked for ${lockoutDuration} minutes due to too many failed attempts.`,
                        locked: true,
                        remainingTime: lockoutDuration
                    });
                }

                await fallbackUser.save();
                const attemptsRemaining = maxAttempts - fallbackUser.loginAttempts;
                logger.warn('Authentication failed (invalid username)', {
                    service: "auth",
                    event: "login_failed",
                    attemptedUsername: username,
                    attemptsRemaining
                });
                return res.status(401).json({
                    success: false,
                    message: `Invalid credentials. ${attemptsRemaining} attempt(s) remaining.`,
                    attemptsRemaining
                });
            }
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > new Date(Date.now())) {
            const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
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
        user.lockUntil = undefined;
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
    } catch (error: unknown) {
        logger.error('Login error', { service: "auth", error: (error as Error).message });
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get("/admin-info", async (req: Request, res: Response) => {
    try {
        const admin = await AdminModel.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin data not found" });
        }
        res.json(admin);
    } catch (error: unknown) {
        logger.error("Error fetching admin info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change Username
router.post("/change-username", async (req: Request, res: Response) => {
    const { username } = req.body;
    try {
        const admin = await AdminModel.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        if (admin.username === username) {
            return res.status(400).json({ message: "New username must be different from current username" });
        }
        admin.username = username;
        await admin.save();
        res.json({ message: "Username updated successfully" });
    } catch (error: unknown) {
        logger.error("Error changing username:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change Password
router.post("/change-password", async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const admin = await AdminModel.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from old password" });
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
    } catch (error: unknown) {
        logger.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Export Data
router.get("/export-data", async (req: Request, res: Response) => {
    const { format } = req.query;
    try {
        const admin = await AdminModel.findOne();
        if (!admin) {
            return res.status(404).json({ message: "Admin data not found" });
        }

        const addr = (admin as any).address || {};
        const addressStr = typeof addr === 'string' ? addr : [addr.line1, addr.line2, addr.city, addr.state ? addr.state + (addr.pincode ? ' - ' + addr.pincode : '') : ''].filter(Boolean).join(', ');

        let data: string;
        if (format === "csv") {
            data = `Username,Address,Email\n${admin.username},${addressStr},${admin.email}`;
            res.setHeader("Content-Type", "text/csv");
        } else if (format === "xml") {
            data = `<admin><username>${admin.username}</username><address>${addressStr}</address><email>${admin.email}</email></admin>`;
            res.setHeader("Content-Type", "application/xml");
        } else {
            data = JSON.stringify(admin, null, 2);
            res.setHeader("Content-Type", "application/json");
        }

        res.setHeader("Content-Disposition", `attachment; filename=admin_data.${format}`);
        res.send(data);
    } catch (error: unknown) {
        logger.error("Error exporting data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
