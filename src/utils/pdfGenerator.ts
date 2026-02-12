/**
 * PDF Generator Utility
 * Generates PDF documents from quotations/invoices for WhatsApp sharing
 * Uses Puppeteer for server-side PDF generation
 */

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import logger from "./logger";
import { formatDateDisplay as formatDate } from "./dateUtils";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface CompanyInfo {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    gstin?: string;
    email?: string;
    website?: string;
    logo?: string;
}

interface QuotationItem {
    description?: string;
    HSN_SAC?: string;
    quantity?: number | string;
    unit_price?: number | string;
    rate?: number | string;
}

interface QuotationNonItem {
    description?: string;
    price?: number | string;
    rate?: number | string;
}

interface QuotationData {
    quotation_id: string;
    quotation_date?: Date | string;
    project_name?: string;
    customer_name?: string;
    customer_address?: string;
    customer_phone?: string;
    items?: QuotationItem[];
    non_items?: QuotationNonItem[];
    total_amount_tax?: number;
    total_amount_no_tax?: number;
    total_tax?: number;
    subject?: string;
    notes?: string[];
    termsAndConditions?: string;
}

interface InvoiceItem {
    description?: string;
    HSN_SAC?: string;
    quantity?: number | string;
    unit_price?: number | string;
    rate?: number | string;
}

interface InvoiceNonItem {
    description?: string;
    price?: number | string;
    rate?: number | string;
}

interface InvoiceData {
    invoice_id: string;
    invoice_date?: Date | string;
    customer_name?: string;
    customer_address?: string;
    customer_phone?: string;
    items_original?: InvoiceItem[];
    non_items_original?: InvoiceNonItem[];
    total_amount_original?: number;
    total_amount_duplicate?: number;
    total_tax_original?: number;
}

interface PDFResult {
    success: boolean;
    path?: string;
    filename?: string;
    error?: string;
}

// ---------------------------------------------------------------------------
// Resolve UPLOADS_DIR
// ---------------------------------------------------------------------------

function resolveUploadsDir(): string {
    const envUploadsDir = process.env.UPLOADS_DIR;
    if (envUploadsDir) return path.resolve(envUploadsDir);

    if (
        (global as unknown as Record<string, Record<string, string>>).appPaths?.userData
    ) {
        return path.join(
            (global as unknown as Record<string, Record<string, string>>).appPaths.userData,
            "uploads",
            "documents"
        );
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { app } = require("electron");
        if (app && typeof app.getPath === "function") {
            return path.join(app.getPath("userData"), "uploads", "documents");
        }
    } catch {
        // Not running in Electron
    }

    return path.join(__dirname, "../../uploads/documents");
}

const UPLOADS_DIR = resolveUploadsDir();

try {
    if (fs.existsSync(UPLOADS_DIR)) {
        const stat = fs.lstatSync(UPLOADS_DIR);
        if (!stat.isDirectory()) {
            logger.error(`Uploads path exists but is not a directory: ${UPLOADS_DIR}`);
            const fallback = path.join(__dirname, "../../uploads", "documents");
            if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
        }
    } else {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
} catch (err) {
    logger.error("Failed to ensure uploads directory:", err);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format number in Indian number system
 */
function formatIndian(num: number | string, decimals = 2): string {
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(n)) return "0.00";
    const fixed = n.toFixed(decimals);
    const parts = fixed.split(".");
    let intPart = parts[0];
    const decPart = parts[1];

    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    if (rest !== "") {
        intPart = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
    return intPart + "." + decPart;
}

/**
 * Convert number to words (Indian system)
 */
function numberToWords(num: number): string {
    const ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    if (num === 0) return "Zero";
    if (num < 0) return "Minus " + numberToWords(-num);

    num = Math.floor(num);
    let words = "";

    if (Math.floor(num / 10000000) > 0) {
        words += numberToWords(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
        words += numberToWords(Math.floor(num / 100)) + " Hundred ";
        num %= 100;
    }
    if (num > 0) {
        if (num < 20) {
            words += ones[num];
        } else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) words += " " + ones[num % 10];
        }
    }
    return words.trim();
}

// ---------------------------------------------------------------------------
// HTML Generators
// ---------------------------------------------------------------------------

/**
 * Generate quotation HTML
 */
export function generateQuotationHTML(
    quotation: QuotationData,
    companyInfo: CompanyInfo = {}
): string {
    const {
        quotation_id,
        quotation_date,
        project_name,
        customer_name,
        customer_address,
        customer_phone,
        items = [],
        non_items = [],
        total_amount_tax,
        total_amount_no_tax,
        total_tax,
        subject,
        notes = [],
        termsAndConditions,
    } = quotation;

    const hasTax =
        items.some((item) => parseFloat(String(item.rate || 0)) > 0) ||
        non_items.some((item) => parseFloat(String(item.rate || 0)) > 0);

    let sno = 0;
    let itemsHTML = "";

    items.forEach((item) => {
        const description = item.description || "-";
        const hsnSac = item.HSN_SAC || "-";
        const qty = parseFloat(String(item.quantity || 0));
        const unitPrice = parseFloat(String(item.unit_price || 0));
        const rate = parseFloat(String(item.rate || 0));
        const taxableValue = qty * unitPrice;

        if (hasTax && rate > 0) {
            const cgstValue = (taxableValue * rate) / 2 / 100;
            const sgstValue = (taxableValue * rate) / 2 / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnSac}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice)}</td>
                <td>${formatIndian(taxableValue)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${formatIndian(rowTotal)}</td>
            </tr>`;
        } else {
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnSac}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice)}</td>
                <td>${formatIndian(taxableValue)}</td>
            </tr>`;
        }
    });

    non_items.forEach((item) => {
        const description = item.description || "-";
        const price = parseFloat(String(item.price || 0));
        const rate = parseFloat(String(item.rate || 0));

        if (hasTax && rate > 0) {
            const cgstValue = (price * rate) / 2 / 100;
            const sgstValue = (price * rate) / 2 / 100;
            const rowTotal = price + cgstValue + sgstValue;
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>1</td>
                <td>${formatIndian(price)}</td>
                <td>${formatIndian(price)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${formatIndian(rowTotal)}</td>
            </tr>`;
        } else {
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>1</td>
                <td>${formatIndian(price)}</td>
                <td>${formatIndian(price)}</td>
            </tr>`;
        }
    });

    const totalAmount = total_amount_tax || total_amount_no_tax || 0;
    const cgst = (total_tax || 0) / 2;
    const sgst = (total_tax || 0) / 2;

    const company = {
        name: companyInfo.name || "Shresht Systems",
        tagline: companyInfo.tagline || "CCTV & Energy Solutions",
        address: companyInfo.address || "",
        phone: companyInfo.phone || "",
        gstin: companyInfo.gstin || "",
        email: companyInfo.email || "",
        website: companyInfo.website || "",
        logo: companyInfo.logo || "",
    };

    const tableHeaders = hasTax
        ? "<th>S.No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Taxable Value</th><th>Rate (%)</th><th>Total</th>"
        : "<th>S.No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation - ${quotation_id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 15px; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand img { height: 50px; width: auto; }
        .brand h1 { font-size: 24px; color: #2c3e50; margin: 0; }
        .brand p { font-size: 12px; color: #666; margin: 0; }
        .company-details { text-align: right; font-size: 11px; }
        .company-details p { margin: 2px 0; }
        .title { text-align: center; background: #2c3e50; color: white; padding: 8px; margin: 15px 0; font-size: 16px; font-weight: bold; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .buyer-details, .doc-info { width: 48%; }
        .buyer-details p, .doc-info p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        td { font-size: 11px; }
        .totals { margin-top: 15px; }
        .totals-row { display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; }
        .totals-table td { border: none; padding: 4px 8px; }
        .totals-table .label { text-align: right; font-weight: bold; }
        .totals-table .value { text-align: right; }
        .total-words { margin-top: 10px; font-style: italic; }
        .notes { margin-top: 20px; }
        .notes h4 { margin-bottom: 5px; }
        .notes ul { margin-left: 20px; }
        .terms { margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; }
        .footer { margin-top: 30px; text-align: right; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="brand">
                ${company.logo ? `<img src="${company.logo}" alt="Logo">` : ""}
                <div>
                    <h1>${company.name}</h1>
                    <p>${company.tagline}</p>
                </div>
            </div>
            <div class="company-details">
                <p>${company.address}</p>
                <p>Ph: ${company.phone}</p>
                <p>GSTIN: ${company.gstin}</p>
                <p>${company.email}</p>
                <p>${company.website}</p>
            </div>
        </div>

        <div class="title">QUOTATION - ${quotation_id}</div>

        <div class="info-row">
            <div class="buyer-details">
                <p><strong>To:</strong></p>
                <p>${customer_name || ""}</p>
                <p>${customer_address || ""}</p>
                <p>Ph: ${customer_phone || ""}</p>
            </div>
            <div class="doc-info">
                <p><strong>Date:</strong> ${formatDate(quotation_date)}</p>
                <p><strong>Project:</strong> ${project_name || ""}</p>
                ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ""}
            </div>
        </div>

        <table>
            <thead>
                <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <table class="totals-table">
                    ${hasTax
            ? `
                    <tr><td class="label">Taxable Value:</td><td class="value">₹${formatIndian(total_amount_no_tax || 0)}</td></tr>
                    <tr><td class="label">CGST:</td><td class="value">₹${formatIndian(cgst)}</td></tr>
                    <tr><td class="label">SGST:</td><td class="value">₹${formatIndian(sgst)}</td></tr>
                    `
            : ""
        }
                    <tr style="font-weight: bold; font-size: 14px;">
                        <td class="label">Grand Total:</td>
                        <td class="value">₹${formatIndian(totalAmount)}</td>
                    </tr>
                </table>
            </div>
            <p class="total-words"><strong>Amount in Words:</strong> ${numberToWords(Math.round(totalAmount))} Rupees Only</p>
        </div>

        ${notes.length > 0
            ? `
        <div class="notes">
            <h4>Notes:</h4>
            <ul>
                ${notes.map((note) => `<li>${note}</li>`).join("")}
            </ul>
        </div>
        `
            : ""
        }

        ${termsAndConditions
            ? `
        <div class="terms">
            <h4>Terms & Conditions:</h4>
            <p>${termsAndConditions}</p>
        </div>
        `
            : ""
        }

        <div class="footer">
            <p>For ${company.name}</p>
            <div class="signature">
                <p>Authorized Signature</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate invoice HTML
 */
export function generateInvoiceHTML(
    invoice: InvoiceData,
    companyInfo: CompanyInfo = {}
): string {
    const {
        invoice_id,
        invoice_date,
        customer_name,
        customer_address,
        customer_phone,
        items_original = [],
        non_items_original = [],
        total_amount_original,
        total_amount_duplicate,
        total_tax_original,
    } = invoice;

    const displayName = customer_name || "";
    const displayAddress = customer_address || "";
    const displayPhone = customer_phone || "";

    const items = items_original;
    const nonItems = non_items_original;

    const hasTax =
        items.some((item) => parseFloat(String(item.rate || 0)) > 0) ||
        nonItems.some((item) => parseFloat(String(item.rate || 0)) > 0);

    let sno = 0;
    let itemsHTML = "";

    items.forEach((item) => {
        const description = item.description || "-";
        const hsnSac = item.HSN_SAC || "-";
        const qty = parseFloat(String(item.quantity || 0));
        const unitPrice = parseFloat(String(item.unit_price || 0));
        const rate = parseFloat(String(item.rate || 0));
        const taxableValue = qty * unitPrice;

        if (hasTax && rate > 0) {
            const cgstValue = (taxableValue * rate) / 2 / 100;
            const sgstValue = (taxableValue * rate) / 2 / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnSac}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice)}</td>
                <td>${formatIndian(taxableValue)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${formatIndian(rowTotal)}</td>
            </tr>`;
        } else {
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnSac}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice)}</td>
                <td>${formatIndian(taxableValue)}</td>
            </tr>`;
        }
    });

    nonItems.forEach((item) => {
        const description = item.description || "-";
        const price = parseFloat(String(item.price || 0));
        const rate = parseFloat(String(item.rate || 0));

        if (hasTax && rate > 0) {
            const cgstValue = (price * rate) / 2 / 100;
            const sgstValue = (price * rate) / 2 / 100;
            const rowTotal = price + cgstValue + sgstValue;
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>1</td>
                <td>${formatIndian(price)}</td>
                <td>${formatIndian(price)}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${formatIndian(rowTotal)}</td>
            </tr>`;
        } else {
            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>1</td>
                <td>${formatIndian(price)}</td>
                <td>${formatIndian(price)}</td>
            </tr>`;
        }
    });

    const totalAmount = total_amount_original || total_amount_duplicate || 0;
    const totalTax = total_tax_original || 0;
    const totalCgst = totalTax / 2;
    const totalSgst = totalTax / 2;
    const taxableValue = totalAmount - totalTax;

    const company = {
        name: companyInfo.name || "Shresht Systems",
        tagline: companyInfo.tagline || "CCTV & Energy Solutions",
        address: companyInfo.address || "",
        phone: companyInfo.phone || "",
        gstin: companyInfo.gstin || "",
        email: companyInfo.email || "",
        website: companyInfo.website || "",
        logo: companyInfo.logo || "",
    };

    const tableHeaders = hasTax
        ? "<th>S.No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Taxable Value</th><th>Rate (%)</th><th>Total</th>"
        : "<th>S.No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${invoice_id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a5f7a; padding-bottom: 10px; margin-bottom: 15px; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand img { height: 50px; width: auto; }
        .brand h1 { font-size: 24px; color: #1a5f7a; margin: 0; }
        .brand p { font-size: 12px; color: #666; margin: 0; }
        .company-details { text-align: right; font-size: 11px; }
        .company-details p { margin: 2px 0; }
        .title { text-align: center; background: #1a5f7a; color: white; padding: 8px; margin: 15px 0; font-size: 16px; font-weight: bold; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .buyer-details, .doc-info { width: 48%; }
        .buyer-details p, .doc-info p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        td { font-size: 11px; }
        .totals { margin-top: 15px; }
        .totals-row { display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; }
        .totals-table td { border: none; padding: 4px 8px; }
        .totals-table .label { text-align: right; font-weight: bold; }
        .totals-table .value { text-align: right; }
        .total-words { margin-top: 10px; font-style: italic; }
        .footer { margin-top: 30px; text-align: right; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="brand">
                ${company.logo ? `<img src="${company.logo}" alt="Logo">` : ""}
                <div>
                    <h1>${company.name}</h1>
                    <p>${company.tagline}</p>
                </div>
            </div>
            <div class="company-details">
                <p>${company.address}</p>
                <p>Ph: ${company.phone}</p>
                <p>GSTIN: ${company.gstin}</p>
                <p>${company.email}</p>
                <p>${company.website}</p>
            </div>
        </div>

        <div class="title">TAX INVOICE - ${invoice_id}</div>

        <div class="info-row">
            <div class="buyer-details">
                <p><strong>Bill To:</strong></p>
                <p>${displayName}</p>
                <p>${displayAddress}</p>
                <p>Ph: ${displayPhone}</p>
            </div>
            <div class="doc-info">
                <p><strong>Invoice Date:</strong> ${formatDate(invoice_date)}</p>
                <p><strong>Invoice No:</strong> ${invoice_id}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <table class="totals-table">
                    ${hasTax
            ? `
                    <tr><td class="label">Taxable Value:</td><td class="value">₹${formatIndian(taxableValue)}</td></tr>
                    <tr><td class="label">CGST:</td><td class="value">₹${formatIndian(totalCgst)}</td></tr>
                    <tr><td class="label">SGST:</td><td class="value">₹${formatIndian(totalSgst)}</td></tr>
                    `
            : ""
        }
                    <tr style="font-weight: bold; font-size: 14px;">
                        <td class="label">Grand Total:</td>
                        <td class="value">₹${formatIndian(totalAmount)}</td>
                    </tr>
                </table>
            </div>
            <p class="total-words"><strong>Amount in Words:</strong> ${numberToWords(Math.round(totalAmount))} Rupees Only</p>
        </div>

        <div class="footer">
            <p>For ${company.name}</p>
            <div class="signature">
                <p>Authorized Signature</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

/**
 * Generate PDF from HTML using Puppeteer
 */
export async function generatePDF(html: string, filename: string): Promise<PDFResult> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

    try {
        const outputPath = path.join(UPLOADS_DIR, `${filename}.pdf`);

        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
            margin: { top: "0", bottom: "0", left: "0", right: "0" },
        });

        return { success: true, path: outputPath, filename: `${filename}.pdf` };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("PDF generation error:", error);
        return { success: false, error: message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Generate quotation PDF
 */
export async function generateQuotationPDF(
    quotation: QuotationData,
    companyInfo: CompanyInfo = {}
): Promise<PDFResult> {
    const html = generateQuotationHTML(quotation, companyInfo);
    return generatePDF(html, quotation.quotation_id);
}

/**
 * Generate invoice PDF
 */
export async function generateInvoicePDF(
    invoice: InvoiceData,
    companyInfo: CompanyInfo = {}
): Promise<PDFResult> {
    const html = generateInvoiceHTML(invoice, companyInfo);
    return generatePDF(html, invoice.invoice_id);
}

/**
 * Get file path for a generated PDF
 */
export function getPDFPath(filename: string): string {
    return path.join(UPLOADS_DIR, filename);
}

/**
 * Delete a generated PDF
 */
export function deletePDF(filename: string): void {
    try {
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        logger.warn(`Failed to delete PDF: ${filename}`, error);
    }
}

export { UPLOADS_DIR };
