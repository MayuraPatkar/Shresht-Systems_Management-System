import { Router, Request, Response, NextFunction } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer: any = require('multer');
import fs from 'fs';
import fsSync from 'fs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { SettingsModel, UserModel } from '../models';
import logger from '../utils/logger';
import config from '../config/config';
import secureStore from '../utils/secureStore';

// Lazy-loaded utilities
let backupScheduler: any;
let backupUtil: any;
let fileCleanup: any;
try {
    backupScheduler = require('../utils/backupScheduler');
    backupUtil = require('../utils/backup');
    fileCleanup = require('../utils/fileCleanup');
} catch {
    logger.warn('Backup/cleanup utilities not available', { service: 'settings' });
}

// Import cache invalidation functions from comms route
let invalidateWhatsAppCache: () => void;
let invalidateEmailCache: () => void;
try {
    const commsRoute = require('./comms.route');
    invalidateWhatsAppCache = commsRoute.invalidateWhatsAppCache;
    invalidateEmailCache = commsRoute.invalidateEmailCache || (() => { });
} catch {
    invalidateWhatsAppCache = () => { };
    invalidateEmailCache = () => { };
}

const router: Router = Router();
const fsp = fs.promises;

const showDialog = (type: string, options: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (!(global as any).dialogEmitter) { reject(new Error('Dialog emitter not available')); return; }
        (global as any).dialogEmitter.emit(type, options, (error: Error | null, result: any) => {
            if (error) reject(error); else resolve(result);
        });
    });
};

const checkMongoTool = (toolName: string, timeout: number = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
        const checkProcess = spawn(toolName, ['--version']);
        let resolved = false;
        checkProcess.on('error', () => { if (!resolved) { resolved = true; resolve(false); } });
        checkProcess.on('close', (code) => { if (!resolved) { resolved = true; resolve(code === 0); } });
        setTimeout(() => { if (!resolved) { resolved = true; checkProcess.kill(); resolve(false); } }, timeout);
    });
};

const ALLOWED_COLLECTIONS = [
    'invoices', 'quotations', 'purchaseorders', 'ewaybills',
    'services', 'employees', 'stock', 'users', 'settings',
    'purchases', 'stocks', 'customers', 'suppliers', 'payments', 'items'
];

const COLLECTION_MAPPING: Record<string, string> = {
    'purchaseorders': 'purchaseorders', 'purchases': 'purchases',
    'stocks': 'items', 'stock': 'items', 'items': 'items', 'quotations': 'quotations',
    'invoices': 'invoices', 'ewaybills': 'ewaybills', 'services': 'services',
    'employees': 'employees', 'users': 'users', 'settings': 'settings',
    'customers': 'customers', 'suppliers': 'suppliers', 'payments': 'payments'
};

const validateCollection = (req: Request, res: Response, next: NextFunction): void => {
    const collection = req.params.collection || req.body.collection;
    if (!collection) { res.status(400).json({ success: false, message: "Collection name is required" }); return; }
    const sanitizedCollection = collection.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (!ALLOWED_COLLECTIONS.includes(sanitizedCollection)) { res.status(400).json({ success: false, message: "Invalid collection name" }); return; }
    (req as any).sanitizedCollection = COLLECTION_MAPPING[sanitizedCollection] || sanitizedCollection;
    (req as any).displayName = sanitizedCollection;
    next();
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };

const fileFilter = (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    const allowedTypes = ['.json', '.bson', '.gz', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) cb(null, true);
    else cb(new Error(`Invalid file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
};

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage, fileFilter, limits: { fileSize: 100 * 1024 * 1024, files: 1 } });

// ==================== BACKUP/RESTORE ROUTES ====================

// Export selected collection to JSON
router.get("/backup/export/:collection", validateCollection, asyncHandler(async (req: Request, res: Response) => {
    const collection = (req as any).sanitizedCollection;
    const timestamp = new Date().toISOString().split("T")[0];
    try {
        const result = await showDialog('show-save-dialog', {
            title: `Export ${collection} data`, defaultPath: `${collection}-${timestamp}.json`,
            filters: [{ name: "JSON Files", extensions: ["json"] }, { name: "Compressed JSON", extensions: ["gz"] }]
        });
        if (result.canceled) { return res.json({ success: false, cancelled: true, message: "Export cancelled by user" }); }
        const filePath = result.filePath;
        if (!filePath || typeof filePath !== 'string') throw new Error('Invalid file path selected');
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        logger.info('Starting collection export', { service: "settings", collection, filePath });
        const toolsAvailable = await checkMongoTool('mongoexport');
        if (!toolsAvailable) {
            logger.warn('MongoDB tools unavailable, using native export', { service: "settings", collection });
            const collectionModel = mongoose.connection.db!.collection(collection);
            const documents = await collectionModel.find({}).toArray();
            if (documents.length === 0) return res.json({ success: false, cancelled: true, message: `No data found in collection '${collection}' to export.` });
            await fsp.writeFile(filePath, JSON.stringify(documents, null, 2), 'utf8');
            return res.json({ success: true, message: `Successfully exported ${documents.length} documents from '${collection}' to ${path.basename(filePath)}` });
        }
        const mongoexport = spawn('mongoexport', ['--db', 'shreshtSystems', '--collection', collection, '--out', filePath, '--jsonArray', '--pretty']);
        let stdout = '', stderr = '';
        mongoexport.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        mongoexport.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        mongoexport.on('close', async (code: number | null) => {
            if (code !== 0) return res.status(500).json({ success: false, message: "Export failed", error: stderr });
            try {
                const stats = await fsp.stat(filePath);
                if (stats.size === 0) throw new Error('Export file is empty');
                return res.json({ success: true, message: `Export successful! Saved to: ${filePath}`, fileSize: stats.size, collection, timestamp: new Date().toISOString() });
            } catch (e: unknown) { return res.status(500).json({ success: false, message: "Export completed but file verification failed" }); }
        });
        mongoexport.on('error', (error: Error) => { return res.status(500).json({ success: false, message: "Export process failed to start", error: error.message }); });
    } catch (err: unknown) {
        logger.error("Export error", { service: "settings", error: (err as Error).message });
        return res.status(500).json({ success: false, message: "Export failed", error: (err as Error).message });
    }
}));

// Restore collection from backup
router.post("/backup/restore-collection", upload.single("backupFile"), validateCollection, asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No backup file uploaded" });
    const originalName = req.file.originalname;
    let filePath: string;
    if ((req.file as any).path && typeof (req.file as any).path === 'string') { filePath = (req.file as any).path; }
    else if (req.file.buffer) {
        const ext = path.extname(originalName) || '';
        filePath = path.join(os.tmpdir(), `shresht-restore-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        await fsp.writeFile(filePath, req.file.buffer);
    } else { return res.status(400).json({ success: false, message: 'Invalid uploaded file' }); }
    const collection = (req as any).sanitizedCollection;
    logger.info('Starting collection restore', { service: "settings", collection, sourceFile: originalName });
    try {
        await fsp.access(filePath, fsSync.constants.R_OK);
        const stats = await fsp.stat(filePath);
        if (stats.size === 0) throw new Error('Uploaded file is empty');
        const ext = path.extname(originalName).toLowerCase();
        let command: string, args: string[];
        if (ext === ".json") {
            const importAvailable = await checkMongoTool('mongoimport');
            if (!importAvailable) {
                const collectionModel = mongoose.connection.db!.collection(collection);
                const jsonData = await fsp.readFile(filePath, 'utf8');
                const documents = JSON.parse(jsonData);
                if (!Array.isArray(documents) || documents.length === 0) throw new Error('Invalid JSON format or empty data');
                await collectionModel.deleteMany({});
                const result = await collectionModel.insertMany(documents);
                return res.json({ success: true, message: `Successfully imported ${result.insertedCount} documents to '${collection}'` });
            }
            command = 'mongoimport'; args = ['--db', 'shreshtSystems', '--collection', collection, '--file', filePath, '--jsonArray', '--drop'];
        } else if (['.bson', '.gz', '.zip'].includes(ext)) {
            const restoreAvailable = await checkMongoTool('mongorestore');
            if (!restoreAvailable) throw new Error('MongoDB restore tools are not installed.');
            command = 'mongorestore'; args = ['--db', 'shreshtSystems', '--collection', collection, '--drop', '--archive=' + filePath];
            if (ext === '.gz') args.push('--gzip');
        } else { throw new Error(`Unsupported file format: ${ext}`); }
        const restoreProcess = spawn(command, args);
        let stdout = '', stderr = '';
        restoreProcess.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        restoreProcess.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        restoreProcess.on('close', async (code: number | null) => {
            try { await fsp.unlink(filePath); } catch { /* ignore */ }
            if (code !== 0) return res.status(500).json({ success: false, message: "Restore failed", error: stderr });
            return res.json({ success: true, message: `Restore successful from ${originalName}`, collection, fileSize: stats.size, timestamp: new Date().toISOString() });
        });
        restoreProcess.on('error', async (error: Error) => {
            try { await fsp.unlink(filePath); } catch { /* ignore */ }
            return res.status(500).json({ success: false, message: "Restore process failed to start", error: error.message });
        });
    } catch (error: unknown) {
        try { await fsp.unlink(filePath); } catch { /* ignore */ }
        return res.status(500).json({ success: false, message: "Restore failed", error: (error as Error).message });
    }
}));

// Restore database from backup
router.post("/backup/restore-database", upload.single("backupFile"), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No backup file uploaded" });
    const originalName = req.file.originalname;
    let filePath: string;
    if ((req.file as any).path && typeof (req.file as any).path === 'string') { filePath = (req.file as any).path; }
    else if (req.file.buffer) {
        const ext = path.extname(originalName) || '';
        filePath = path.join(os.tmpdir(), `shresht-restore-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        await fsp.writeFile(filePath, req.file.buffer);
    } else { return res.status(400).json({ success: false, message: 'Invalid uploaded file' }); }
    try {
        await fsp.access(filePath, fsSync.constants.R_OK);
        const stats = await fsp.stat(filePath);
        if (stats.size === 0) throw new Error('Uploaded file is empty');
        const ext = path.extname(originalName).toLowerCase();
        if (ext === ".json") return res.status(400).json({ success: false, message: "JSON format not supported for full database restore. Use mongodump format (.bson/.gz)" });
        if (['.bson', '.gz', '.zip'].includes(ext)) {
            const restoreAvailable = await checkMongoTool('mongorestore');
            if (!restoreAvailable) throw new Error('MongoDB restore tools are not installed.');
            const args = ['--db', 'shreshtSystems', '--drop', '--archive=' + filePath];
            if (ext === '.gz') args.push('--gzip');
            const restoreProcess = spawn('mongorestore', args);
            let stdout = '', stderr = '';
            restoreProcess.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
            restoreProcess.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
            restoreProcess.on('close', async (code: number | null) => {
                try { await fsp.unlink(filePath); } catch { /* ignore */ }
                if (code !== 0) return res.status(500).json({ success: false, message: "Database restore failed", error: stderr });
                return res.json({ success: true, message: `Database restore successful from ${originalName}`, fileSize: stats.size, timestamp: new Date().toISOString(), warning: "Application may need to be restarted for changes to take full effect" });
            });
            restoreProcess.on('error', async (error: Error) => {
                try { await fsp.unlink(filePath); } catch { /* ignore */ }
                return res.status(500).json({ success: false, message: "Database restore process failed to start", error: error.message });
            });
        } else { throw new Error(`Unsupported file format: ${ext}`); }
    } catch (error: unknown) {
        try { await fsp.unlink(filePath); } catch { /* ignore */ }
        return res.status(500).json({ success: false, message: "Database restore failed", error: (error as Error).message });
    }
}));

// Manual backup trigger
router.post("/backup/manual", asyncHandler(async (req: Request, res: Response) => {
    try {
        const settings = await SettingsModel.findOne() as any;
        const backupLocation = settings?.backup?.backup_location;
        if (!backupLocation || backupLocation === './backups' || backupLocation === '.\\backups') {
            return res.status(400).json({ success: false, message: 'Backup location not configured. Please set a backup location.' });
        }
        if (!backupUtil) throw new Error('Backup utility not available');
        const info = await backupUtil(backupLocation);

        // Update last_backup timestamp in the database
        try {
            settings.backup.last_backup = new Date();
            await settings.save();
        } catch (tsErr: unknown) {
            logger.warn('Failed to update last_backup timestamp after manual backup', { service: 'settings', error: (tsErr as Error).message });
        }

        return res.json({ success: true, message: 'Backup created successfully', path: info.backupPath, fileSize: info.size, timestamp: info.timestamp });
    } catch (error: unknown) {
        logger.error('Manual backup failed', { service: "settings", error: (error as Error).message });
        return res.status(500).json({ success: false, message: 'Manual backup failed', error: (error as Error).message });
    }
}));

// Backup status
router.get("/backup/status", asyncHandler(async (req: Request, res: Response) => {
    try {
        const [mongodumpAvailable, mongoexportAvailable, mongoimportAvailable, mongorestoreAvailable] = await Promise.all([
            checkMongoTool('mongodump'), checkMongoTool('mongoexport'), checkMongoTool('mongoimport'), checkMongoTool('mongorestore')
        ]);
        res.json({ success: true, tools: { mongodump: mongodumpAvailable, mongoexport: mongoexportAvailable, mongoimport: mongoimportAvailable, mongorestore: mongorestoreAvailable }, allowedCollections: ALLOWED_COLLECTIONS, maxFileSize: '100MB' });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: 'Failed to check backup tools status', error: (error as Error).message });
    }
}));

// ==================== SYSTEM SETTINGS MANAGEMENT ====================

router.get("/preferences", asyncHandler(async (req: Request, res: Response) => {
    try {
        let settingsDoc = await SettingsModel.findOne();
        if (!settingsDoc) { settingsDoc = new SettingsModel({}); await settingsDoc.save(); }
        
        const settings = settingsDoc.toObject() as any;
        
        // WhatsApp settings fallbacks
        settings.whatsapp = settings.whatsapp || {};
        if (!settings.whatsapp.phoneNumberId) {
            settings.whatsapp.phoneNumberId = process.env.PHONE_NUMBER_ID || config.whatsapp?.phoneNumberId || "";
        }
        if (!settings.whatsapp.storedTokenReference && (process.env.WHATSAPP_TOKEN || config.whatsapp?.token)) {
            settings.whatsapp.storedTokenReference = "env";
        }
        
        // Cloudinary settings fallbacks
        settings.cloudinary = settings.cloudinary || {};
        if (!settings.cloudinary.cloudName) {
            settings.cloudinary.cloudName = process.env.CLOUDINARY_CLOUD_NAME || config.cloudinary?.cloudName || "";
        }
        if (!settings.cloudinary.apiKey) {
            settings.cloudinary.apiKey = process.env.CLOUDINARY_API_KEY || config.cloudinary?.apiKey || "";
        }
        if (!settings.cloudinary.configured) {
            settings.cloudinary.configured = !!(
                settings.cloudinary.cloudName && 
                settings.cloudinary.apiKey && 
                (process.env.CLOUDINARY_API_SECRET || config.cloudinary?.apiSecret || settings.cloudinary.apiSecretEncrypted)
            );
        }

        // Email settings — strip password, expose hasPassword flag
        settings.email = settings.email || {};
        const emailHasPassword = !!(settings.email.passwordEncrypted);
        delete settings.email.passwordEncrypted;
        settings.email.hasPassword = emailHasPassword;

        res.json({ success: true, settings });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to fetch settings', error: (error as Error).message }); }
}));

router.patch("/preferences", asyncHandler(async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        Object.keys(updates).forEach(key => {
            if (settings[key] && typeof settings[key] === 'object' && typeof settings[key].toObject === 'function') {
                settings[key] = { ...settings[key].toObject(), ...updates[key] };
            } else { settings[key] = updates[key]; }
        });
        settings.updatedAt = new Date();
        await settings.save();
        try { if (backupScheduler) await backupScheduler.refreshSchedule(); } catch (e: unknown) { logger.warn('Failed to refresh backup scheduler', { service: "settings", error: (e as Error).message }); }
        res.json({ success: true, message: 'Settings updated successfully', settings });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to update settings', error: (error as Error).message }); }
}));

router.patch('/preferences/whatsapp', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { enabled, phoneNumberId, pdfBaseUrl, verifyToken } = req.body;
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.whatsapp = settings.whatsapp || {};
        if (enabled !== undefined) settings.whatsapp.enabled = !!enabled;
        if (phoneNumberId !== undefined) settings.whatsapp.phoneNumberId = String(phoneNumberId);
        if (pdfBaseUrl !== undefined) settings.whatsapp.pdfBaseUrl = String(pdfBaseUrl);
        if (verifyToken !== undefined) settings.whatsapp.verifyToken = String(verifyToken);
        settings.updatedAt = new Date();
        await settings.save();
        if (invalidateWhatsAppCache) invalidateWhatsAppCache();
        return res.json({ success: true, message: 'WhatsApp settings updated', whatsapp: settings.whatsapp });
    } catch (error: unknown) { return res.status(500).json({ success: false, message: 'Failed to update WhatsApp settings', error: (error as Error).message }); }
}));

router.post('/preferences/whatsapp/token', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Token is required' });
        const ok = await secureStore.setWhatsAppToken(token);
        if (!ok) return res.status(500).json({ success: false, message: 'Failed to store token securely' });
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.whatsapp = settings.whatsapp || {};
        settings.whatsapp.storedTokenReference = 'os-keychain';
        await settings.save();
        if (invalidateWhatsAppCache) invalidateWhatsAppCache();
        return res.json({ success: true, message: 'WhatsApp token stored securely' });
    } catch (error: unknown) { return res.status(500).json({ success: false, message: 'Failed to store WhatsApp token', error: (error as Error).message }); }
}));

router.patch('/preferences/cloudinary', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { cloudName, apiKey, apiSecret } = req.body;
        if (!cloudName || !apiKey || !apiSecret) return res.status(400).json({ success: false, message: 'All Cloudinary fields are required' });
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.cloudinary = settings.cloudinary || {};
        settings.cloudinary.cloudName = cloudName;
        settings.cloudinary.apiKey = apiKey;
        settings.cloudinary.configured = true;

        if (apiSecret !== '••••••••••••••••') {
            const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', crypto.createHash('sha256').update(secret).digest(), iv);
            const encrypted = Buffer.concat([cipher.update(apiSecret, 'utf8'), cipher.final()]);
            settings.cloudinary.apiSecretEncrypted = iv.toString('hex') + ':' + encrypted.toString('hex');
            process.env.CLOUDINARY_API_SECRET = apiSecret;
        } else if (settings.cloudinary.apiSecretEncrypted) {
            const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
            const [ivHex, dataHex] = settings.cloudinary.apiSecretEncrypted.split(":");
            const iv = Buffer.from(ivHex, "hex");
            const encrypted = Buffer.from(dataHex, "hex");
            const decipher = crypto.createDecipheriv(
                "aes-256-cbc",
                crypto.createHash("sha256").update(secret).digest(),
                iv
            );
            const decryptedSecret = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
            process.env.CLOUDINARY_API_SECRET = decryptedSecret;
        }

        await settings.save();
        process.env.CLOUDINARY_CLOUD_NAME = cloudName;
        process.env.CLOUDINARY_API_KEY = apiKey;
        return res.json({ success: true, message: 'Cloudinary settings saved successfully' });
    } catch (error: unknown) { return res.status(500).json({ success: false, message: 'Failed to update Cloudinary settings', error: (error as Error).message }); }
}));

router.patch('/preferences/email', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { enabled, host, port, secure, user, password, fromName } = req.body;
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.email = settings.email || {};
        if (enabled  !== undefined) settings.email.enabled  = !!enabled;
        if (host     !== undefined) settings.email.host     = String(host);
        if (port     !== undefined) settings.email.port     = Number(port) || 587;
        if (secure   !== undefined) settings.email.secure   = !!secure;
        if (user     !== undefined) settings.email.user     = String(user);
        if (fromName !== undefined) settings.email.fromName = String(fromName);

        // Encrypt the password if a new one is provided (not the masked placeholder)
        if (password && password !== '••••••••••••••••') {
            const { encryptEmailPassword } = require('../utils/emailService');
            settings.email.passwordEncrypted = encryptEmailPassword(password);
        }

        await settings.save();
        if (invalidateEmailCache) invalidateEmailCache();
        return res.json({ success: true, message: 'Email settings updated', email: {
            enabled: settings.email.enabled,
            host: settings.email.host,
            port: settings.email.port,
            secure: settings.email.secure,
            user: settings.email.user,
            fromName: settings.email.fromName,
            hasPassword: !!settings.email.passwordEncrypted
        }});
    } catch (error: unknown) { return res.status(500).json({ success: false, message: 'Failed to update Email settings', error: (error as Error).message }); }
}));

router.put("/company-info", asyncHandler(async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        const currentUsername = req.headers['x-username'] as string;
        
        let settings = await SettingsModel.findOne();
        if (!settings) {
            settings = new SettingsModel({});
        }
        if (!settings.company_details) {
            settings.company_details = {};
        }
        
        const allowedFields = ['company_name', 'address', 'phone', 'email', 'website', 'gstin', 'bank_details'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                (settings!.company_details as any)[field] = updates[field];
            }
        });
        
        await settings.save();
        
        const currentUser = await UserModel.findOne(currentUsername ? { username: currentUsername } : {}) || await UserModel.findOne();
        const settingsObj: any = settings ? settings.toObject() : {};
        const companyDetails = settingsObj.company_details || {};
        const legacyAdminResponse = {
            ...currentUser?.toObject(),
            ...companyDetails
        };
        
        res.json({ success: true, message: 'Company information updated successfully', admin: legacyAdminResponse });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to update company information', error: (error as Error).message }); }
}));

router.get("/company-info/export", asyncHandler(async (req: Request, res: Response) => {
    let browser: any = null;
    try {
        const { generateCompanyProfilePDF } = require('../utils/pdfGenerator');
        const settings = await SettingsModel.findOne();
        const admin = settings?.company_details as any;
        if (!admin) return res.status(404).json({ success: false, message: 'Company information not found' });

        const timestamp = new Date().toISOString().split("T")[0];
        const result = await showDialog('show-save-dialog', {
            title: "Export Company Details",
            defaultPath: `company-details-${timestamp}.pdf`,
            filters: [{ name: "PDF Files", extensions: ["pdf"] }]
        });
        if (result.canceled) { return res.json({ success: true, message: "Download cancelled by user" }); }
        const filePath = result.filePath;
        if (!filePath || typeof filePath !== 'string') throw new Error('Invalid file path selected');
        await fsp.mkdir(path.dirname(filePath), { recursive: true });

        // Build address string
        const addr = admin.address || {};
        const addressLines = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country]
            .filter(Boolean).join(', ');

        // Build phone string
        const ph = admin.phone || {};
        const phoneStr = [ph.ph1, ph.ph2].filter(Boolean).join(' / ');

        // Build bank details rows
        const bd = admin.bank_details || {};
        const bankRows = [
            ['Bank Name', bd.bank_name],
            ['Account Holder', bd.account_holder_name],
            ['Account Number', bd.account_number],
            ['Account Type', bd.type],
            ['IFSC Code', bd.ifsc_code],
            ['Branch', bd.branch],
        ].filter(([, v]) => v).map(([label, value]) => `
            <tr>
                <td class="label">${label}</td>
                <td class="value">${value}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f4f6fb;
    color: #1e293b;
    padding: 40px;
  }
  .card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08);
    padding: 40px 48px;
    max-width: 700px;
    margin: 0 auto;
  }
  .header {
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .company-name {
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.5px;
  }
  .doc-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    margin-top: 4px;
  }
  .export-date {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 6px;
  }
  .section {
    margin-bottom: 28px;
  }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f1f5f9;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; vertical-align: top; font-size: 13px; }
  td.label {
    width: 40%;
    color: #64748b;
    font-weight: 500;
    padding-right: 16px;
  }
  td.value {
    color: #1e293b;
    font-weight: 400;
  }
  .footer {
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="company-name">${admin.company_name || 'Company'}</div>
    <div class="doc-title">Company Details</div>
    <div class="export-date">Exported on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>

  <div class="section">
    <div class="section-title">General Information</div>
    <table>
      <tr><td class="label">GSTIN</td><td class="value">${admin.gstin || '—'}</td></tr>
      <tr><td class="label">Email</td><td class="value">${admin.email || '—'}</td></tr>
      <tr><td class="label">Website</td><td class="value">${admin.website || '—'}</td></tr>
      <tr><td class="label">Phone</td><td class="value">${phoneStr || '—'}</td></tr>
      <tr><td class="label">Address</td><td class="value">${addressLines || '—'}</td></tr>
    </table>
  </div>

  ${bankRows ? `<div class="section">
    <div class="section-title">Bank Details</div>
    <table>${bankRows}</table>
  </div>` : ''}

  <div class="footer">This document was auto-generated by SSMS &bull; ${timestamp}</div>
</div>
</body>
</html>`;

        // Generate PDF using Puppeteer
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({ path: filePath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });

        return res.json({ success: true, message: `Successfully exported company details to ${path.basename(filePath)}` });
    } catch (error: unknown) {
        logger.error("Company details export error", { service: "settings", error: (error as Error).message });
        return res.status(500).json({ success: false, message: "Export failed", error: (error as Error).message });
    } finally {
        if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    }
}));

router.get("/database/stats", asyncHandler(async (req: Request, res: Response) => {
    try {
        const db = mongoose.connection.db!;
        const stats = await db.stats();
        const collections = await db.listCollections().toArray();
        const collectionCounts: Record<string, number> = {};
        for (const coll of collections) { collectionCounts[coll.name] = await db.collection(coll.name).countDocuments(); }
        const settings = await SettingsModel.findOne() as any;
        res.json({
            success: true, stats: {
                database_size: stats.dataSize, database_size_mb: (stats.dataSize / (1024 * 1024)).toFixed(2),
                storage_size: stats.storageSize, storage_size_mb: (stats.storageSize / (1024 * 1024)).toFixed(2),
                index_size: stats.indexSize, index_size_mb: (stats.indexSize / (1024 * 1024)).toFixed(2),
                total_documents: Object.values(collectionCounts).reduce((a, b) => a + b, 0),
                collections: collectionCounts, last_backup: settings?.backup?.last_backup || null
            }
        });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to fetch database statistics', error: (error as Error).message }); }
}));

router.post("/database/backup-completed", asyncHandler(async (req: Request, res: Response) => {
    try {
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.backup.last_backup = new Date();
        await settings.save();
        res.json({ success: true, message: 'Backup timestamp updated', last_backup: settings.backup.last_backup });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to update backup timestamp', error: (error as Error).message }); }
}));

router.post('/cleanup/uploads', asyncHandler(async (req: Request, res: Response) => {
    try {
        const uploadsDir = process.env.UPLOADS_DIR || ((global as any).appPaths && path.join((global as any).appPaths.userData, 'uploads', 'documents')) || path.join(__dirname, '../../uploads/documents');
        const retentionDays = (config as any).uploadsRetentionDays || 7;
        if (!fileCleanup) throw new Error('File cleanup utility not available');
        const result = await fileCleanup.cleanupOldFiles(uploadsDir, retentionDays, ['.pdf']);
        return res.json({ success: true, message: 'Upload cleanup completed', result });
    } catch (error: unknown) { return res.status(500).json({ success: false, message: 'Upload cleanup failed', error: (error as Error).message }); }
}));

// Logo upload
const logoStorage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => { cb(null, path.join(__dirname, "../../public/assets/")); },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => { cb(null, `company-logo${path.extname(file.originalname)}`); }
});
const logoUpload = multer({
    storage: logoStorage,
    fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) cb(null, true);
        else cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post("/logo/upload", logoUpload.single("logo"), asyncHandler(async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const logoPath = `/assets/${req.file.filename}`;
        let settings = await SettingsModel.findOne() as any;
        if (!settings) settings = new SettingsModel({});
        settings.branding.logo_path = logoPath;
        settings.updatedAt = new Date();
        await settings.save();
        res.json({ success: true, message: 'Logo uploaded successfully', logo_path: logoPath });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to upload logo', error: (error as Error).message }); }
}));

router.get("/system-info", asyncHandler(async (req: Request, res: Response) => {
    try {
        const packageJson = require('../../package.json');
        const uptimeSeconds = Math.floor(process.uptime());
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        let uptimeFormatted = '';
        if (days > 0) uptimeFormatted += `${days}d `;
        if (hours > 0 || days > 0) uptimeFormatted += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) uptimeFormatted += `${minutes}m `;
        uptimeFormatted += `${seconds}s`;
        res.json({
            success: true, system: {
                app_name: 'Shresht Systems Management Systems', app_version: packageJson.version || '1.0.0',
                node_version: process.version, platform: os.platform(), arch: os.arch(),
                total_memory: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
                free_memory: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
                app_memory: (process.memoryUsage().rss / (1024 ** 2)).toFixed(2) + ' MB',
                uptime: uptimeFormatted.trim()
            }
        });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Failed to fetch system information', error: (error as Error).message }); }
}));

router.get("/logs/stats", asyncHandler(async (req: Request, res: Response) => {
    try {
        const appLogPath = path.join(process.cwd(), 'logs', 'app.log');
        const errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
        
        let appLogLines = 0;
        let appLogSize = '0 KB';
        try {
            const stats = await fsp.stat(appLogPath);
            appLogSize = (stats.size / 1024).toFixed(1) + ' KB';
            if (stats.size > 1024 * 1024) {
                appLogSize = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
            }
            const content = await fsp.readFile(appLogPath, 'utf8');
            appLogLines = content.split('\n').filter(line => line.trim()).length;
        } catch {}

        let errorLogLines = 0;
        let errorLogSize = '0 KB';
        let latestError = 'No errors recorded';
        try {
            const stats = await fsp.stat(errorLogPath);
            errorLogSize = (stats.size / 1024).toFixed(1) + ' KB';
            if (stats.size > 1024 * 1024) {
                errorLogSize = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
            }
            const content = await fsp.readFile(errorLogPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            errorLogLines = lines.length;
            if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                try {
                    const parsed = JSON.parse(lastLine);
                    latestError = parsed.message || lastLine;
                } catch {
                    latestError = lastLine;
                }
            }
        } catch {}

        res.json({
            success: true,
            stats: {
                app: { lines: appLogLines, size: appLogSize },
                error: { lines: errorLogLines, size: errorLogSize, latest: latestError }
            }
        });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: 'Failed to fetch logs statistics', error: (error as Error).message });
    }
}));


router.get('/download-logs', async (req: Request, res: Response) => {
    try {
        const logType = (req.query && (req.query.type as string)) || 'app';
        const logFileName = logType === 'error' ? 'error.log' : 'app.log';
        const logPath = path.join(process.cwd(), 'logs', logFileName);
        try { await fsp.access(logPath); } catch { return res.status(404).json({ success: false, message: 'Log file not found' }); }
        res.download(logPath, logFileName, (err) => {
            if (err && !res.headersSent) res.status(500).json({ success: false, message: 'Error downloading log file' });
        });
    } catch (error: unknown) { res.status(500).json({ success: false, message: 'Internal server error' }); }
});

export default router;
