/**
 * Server-side Date Utilities
 * Unified date formatting for backend (PDFs, emails, WhatsApp messages)
 * All user-visible dates use DD/MM/YYYY format
 */

/**
 * Format date for display - DD/MM/YYYY format
 * Primary format for all user-visible dates
 */
export function formatDateDisplay(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format date for human-readable messages - DD MMM YYYY format
 * Used in WhatsApp messages, emails, and reports
 * Example: "09 Jan 2026"
 */
export function formatDateReadable(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}
