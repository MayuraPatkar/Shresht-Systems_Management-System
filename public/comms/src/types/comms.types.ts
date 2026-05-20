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
