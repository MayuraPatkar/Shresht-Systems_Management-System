/**
 * Comms Module Types
 */

interface CommsApiResponse {
    message?: string;
    success?: boolean;
}

interface UnpaidCountResponse {
    count: number;
}

// ─── WhatsApp types ────────────────────────────────────────────────────────────

interface ManualReminderData {
    phoneNumber: string;
    invoiceId: string;
}

interface SendMessageData {
    phoneNumber: string;
    message: string;
}

interface SendInvoiceData {
    phone: string;
    invoiceId: string;
}

interface SendQuotationData {
    phone: string;
    quotationId: string;
}

// ─── Email types ───────────────────────────────────────────────────────────────

interface SendEmailMessageData {
    email: string;
    subject?: string;
    message: string;
}

interface SendEmailInvoiceData {
    email: string;
    invoiceId: string;
    /** Optional rendered print HTML — when provided, uses the same high-fidelity
     *  quotationPrintHandler PDF generation path as WhatsApp / PDF save. */
    htmlContent?: string;
}

interface SendEmailQuotationData {
    email: string;
    quotationId: string;
    /** Optional rendered print HTML — when provided, uses the same high-fidelity
     *  quotationPrintHandler PDF generation path as WhatsApp / PDF save. */
    htmlContent?: string;
}

interface SendEmailReminderData {
    email: string;
    invoiceId: string;
}

interface SendEmailPaymentData {
    email: string;
    paymentId: string;
    htmlContent: string;
    documentType: string;
    partyName?: string;
    amount?: number;
    date?: string;
}

// ─── Channel type ──────────────────────────────────────────────────────────────

type CommsChannel = 'whatsapp' | 'email' | 'both';
