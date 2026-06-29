/**
 * Email Service Utility
 * Sends emails via SMTP using Nodemailer.
 * Credentials are resolved from SettingsModel (similar to WhatsApp credential resolution).
 */

import nodemailer, { Transporter } from 'nodemailer';
import { SettingsModel } from '../models';
import logger from './logger';
import crypto from 'crypto';

// ─── Credential Cache ───────────────────────────────────────────────────────

interface EmailCreds {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
}

let cachedCreds: EmailCreds | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

let cachedTransport: Transporter | null = null;

/** Invalidate the cached email credentials and transport. Call when settings change. */
export function invalidateEmailCache(): void {
    cachedCreds = null;
    cachedAt = 0;
    cachedTransport = null;
    logger.info('Email cache invalidated', { service: 'email' });
}

// ─── Encryption Helpers ──────────────────────────────────────────────────────
// Simple AES-256-CBC encryption (same key approach as secureStore fallback)
const ENCRYPT_ALGO = 'aes-256-cbc';
const ENCRYPT_KEY_BASE = process.env.SESSION_SECRET || 'shresht-email-key-change-in-prod';

function deriveKey(base: string): Buffer {
    return crypto.createHash('sha256').update(base).digest();
}

export function encryptEmailPassword(plaintext: string): string {
    const key = deriveKey(ENCRYPT_KEY_BASE);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPT_ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptEmailPassword(encrypted: string): string {
    try {
        const [ivHex, encHex] = encrypted.split(':');
        const key = deriveKey(ENCRYPT_KEY_BASE);
        const iv = Buffer.from(ivHex, 'hex');
        const encBuf = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv(ENCRYPT_ALGO, key, iv);
        return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
    } catch {
        return '';
    }
}

// ─── Credential Resolution ────────────────────────────────────────────────────

async function resolveEmailCredentials(): Promise<EmailCreds> {
    if (cachedCreds && (Date.now() - cachedAt) < CACHE_TTL_MS) return cachedCreds;

    try {
        const settings = await SettingsModel.findOne();
        const emailCfg = settings?.email as any;

        if (!emailCfg || !emailCfg.enabled) {
            throw new Error('Email is not enabled. Please configure Email SMTP in Settings.');
        }

        const password = emailCfg.passwordEncrypted
            ? decryptEmailPassword(emailCfg.passwordEncrypted)
            : '';

        cachedCreds = {
            host:     emailCfg.host     || '',
            port:     emailCfg.port     || 587,
            secure:   emailCfg.secure   || false,
            user:     emailCfg.user     || '',
            password,
            fromName: emailCfg.fromName || 'Shresht Systems',
        };
        cachedAt = Date.now();

        logger.info('Email credentials resolved', {
            service: 'email',
            host: cachedCreds.host,
            port: cachedCreds.port,
            user: cachedCreds.user,
        });

        return cachedCreds;
    } catch (err: any) {
        throw new Error(`Failed to resolve email credentials: ${err.message}`);
    }
}

async function getTransport(): Promise<Transporter> {
    if (cachedTransport && cachedCreds && (Date.now() - cachedAt) < CACHE_TTL_MS) {
        return cachedTransport;
    }

    const creds = await resolveEmailCredentials();

    cachedTransport = nodemailer.createTransport({
        host: creds.host,
        port: creds.port,
        secure: creds.secure,
        auth: {
            user: creds.user,
            pass: creds.password,
        },
    });

    return cachedTransport;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; path: string; contentType?: string }[];
}

/**
 * Send an email via the configured SMTP transport.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
    const creds = await resolveEmailCredentials();
    const transport = await getTransport();

    const from = `"${creds.fromName}" <${creds.user}>`;

    const info = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
    });

    logger.info('Email sent successfully', {
        service: 'email',
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
    });

    return { messageId: info.messageId };
}

/**
 * Check if email is configured. Throws if not.
 */
export async function checkEmailConfig(): Promise<void> {
    await resolveEmailCredentials();
}

// ─── HTML Template Helpers ─────────────────────────────────────────────────

/**
 * Wraps content in a simple branded HTML email shell.
 */
export function buildEmailShell(bodyContent: string, companyName = 'Shresht Systems'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 32px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
  .header p { margin: 4px 0 0; color: #bfdbfe; font-size: 13px; }
  .body { padding: 32px; }
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; text-align: center; }
  .footer strong { color: #64748b; }
  table.detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
  table.detail-table th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 10px 12px; }
  table.detail-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .badge-paid   { background: #dcfce7; color: #166534; }
  .badge-unpaid { background: #fee2e2; color: #991b1b; }
  .badge-partial{ background: #fef3c7; color: #92400e; }
  .amount-highlight { font-size: 22px; font-weight: 700; color: #2563eb; }
  .cta-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${companyName}</h1>
    <p>Business Management System</p>
  </div>
  <div class="body">
    ${bodyContent}
  </div>
  <div class="footer">
    <strong>${companyName}</strong><br>
    This is an automated email. Please do not reply directly to this message.
  </div>
</div>
</body>
</html>`;
}

/**
 * Build a payment reminder email HTML body.
 */
export function buildReminderEmailBody(options: {
    customerName: string;
    invoiceId: string;
    amountDue: string;
    dueDate?: string;
    companyName?: string;
}): string {
    const { customerName, invoiceId, amountDue, dueDate, companyName = 'Shresht Systems' } = options;
    const dueDateStr = dueDate ? `<strong>Due Date:</strong> ${dueDate}` : '';

    const body = `
<p style="font-size:16px; color:#334155;">Dear <strong>${customerName}</strong>,</p>
<p style="color:#475569;">This is a friendly reminder that you have an outstanding invoice that requires your attention.</p>
<div class="cta-box">
  <div style="font-size:13px; color:#64748b; margin-bottom:6px;">Outstanding Amount</div>
  <div class="amount-highlight">₹${amountDue}</div>
  <div style="margin-top:8px; font-size:13px; color:#64748b;">Invoice: <strong>${invoiceId}</strong>${dueDate ? ` &nbsp;|&nbsp; ${dueDateStr}` : ''}</div>
</div>
<p style="color:#475569;">Kindly arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.</p>
<p style="color:#94a3b8; font-size:13px;">For any queries, please contact us directly.</p>
<p style="color:#334155;">Regards,<br><strong>${companyName}</strong></p>`;

    return buildEmailShell(body, companyName);
}

/**
 * Build a simple custom message email HTML body.
 */
export function buildCustomMessageEmailBody(options: {
    message: string;
    companyName?: string;
}): string {
    const { message, companyName = 'Shresht Systems' } = options;
    const body = `
<p style="font-size:15px; color:#334155; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
<br>
<p style="color:#475569; font-size:13px;">Regards,<br><strong>${companyName}</strong></p>`;
    return buildEmailShell(body, companyName);
}

/**
 * Build a document-sharing email HTML body (invoice, quotation, receipt, voucher).
 */
export function buildDocumentEmailBody(options: {
    documentType: string;
    customerName: string;
    referenceNo: string;
    date: string;
    amount: string;
    companyName?: string;
}): string {
    const { documentType, customerName, referenceNo, date, amount, companyName = 'Shresht Systems' } = options;
    const typeLabel = documentType.charAt(0).toUpperCase() + documentType.slice(1);
    const body = `
<p style="font-size:16px; color:#334155;">Dear <strong>${customerName}</strong>,</p>
<p style="color:#475569;">Please find your <strong>${typeLabel}</strong> attached to this email.</p>
<table class="detail-table">
  <tr><th>${typeLabel} No.</th><td>${referenceNo}</td></tr>
  <tr><th>Date</th><td>${date}</td></tr>
  <tr><th>Amount</th><td><strong style="color:#2563eb;">${amount}</strong></td></tr>
</table>
<p style="color:#475569; font-size:13px;">The document is attached as a PDF. Please contact us if you have any questions.</p>
<p style="color:#334155;">Regards,<br><strong>${companyName}</strong></p>`;
    return buildEmailShell(body, companyName);
}
