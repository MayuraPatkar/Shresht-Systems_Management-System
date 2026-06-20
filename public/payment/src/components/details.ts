/**
 * details.ts
 *
 * Frontend controller for payment details page.
 */

(function (): void {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let currentPayment: IPaymentRecord | null = null;
    let shortcutsModalRef: HTMLElement | null = null;

    // URL Param check
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('id');

    if (!paymentId) {
        window.location.href = '/payment';
        return;
    }

    // ── DOM Refs ──────────────────────────────────────────
    const $headerTitle = document.getElementById('header-title') as HTMLElement;
    const $homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
    
    // Details Display DOM Refs
    const $detailsIcon = document.getElementById('details-icon') as HTMLElement;
    const $detailsAmount = document.getElementById('details-amount') as HTMLElement;
    const $detailsDirection = document.getElementById('details-direction') as HTMLElement;
    const $detailsAdvanceBadge = document.getElementById('details-advance-badge') as HTMLElement;
    const $detailsRefundBadge = document.getElementById('details-refund-badge') as HTMLElement;
    const $detailsRefundedBadge = document.getElementById('details-refunded-badge') as HTMLElement;
    const $detailsDate = document.getElementById('details-date') as HTMLElement;
    const $detailsMode = document.getElementById('details-mode') as HTMLElement;
    
    const $detailsTransaction = document.getElementById('details-transaction') as HTMLElement;
    const $detailsParty = document.getElementById('details-party') as HTMLElement;
    const $detailsReference = document.getElementById('details-reference') as HTMLElement;
    const $detailsCreated = document.getElementById('details-created') as HTMLElement;
    const $detailsVoucher = document.getElementById('details-voucher') as HTMLElement;
    const $detailsRemarks = document.getElementById('details-remarks') as HTMLElement;

    // Party Card DOM Refs
    const $detailsPartyExpanded = document.getElementById('details-party-expanded') as HTMLDivElement;
    const $detailsPartyName = document.getElementById('details-party-name') as HTMLElement;
    const $detailsPartyPhone = document.getElementById('details-party-phone') as HTMLElement;
    const $detailsPartyEmail = document.getElementById('details-party-email') as HTMLElement;
    const $detailsPartyGstin = document.getElementById('details-party-gstin') as HTMLElement;
    const $detailsPartyAddress = document.getElementById('details-party-address') as HTMLElement;

    // Reference Card DOM Refs
    const $detailsRefExpanded = document.getElementById('details-ref-expanded') as HTMLDivElement;
    const $detailsRefId = document.getElementById('details-ref-id') as HTMLElement;
    const $detailsRefStatus = document.getElementById('details-ref-status') as HTMLElement;
    const $detailsRefAmount = document.getElementById('details-ref-amount') as HTMLElement;
    const $detailsRefDate = document.getElementById('details-ref-date') as HTMLElement;

    // Action Buttons
    const $detailsEditBtn = document.getElementById('details-edit-btn') as HTMLButtonElement;
    const $detailsRefundBtn = document.getElementById('details-refund-btn') as HTMLButtonElement;
    const $detailsDeleteBtn = document.getElementById('details-delete-btn') as HTMLButtonElement | null;
    const $detailsPdfBtn = document.getElementById('details-pdf-btn') as HTMLButtonElement;



    // ── Helper functions ───────────────────────────────────
    function getTransactionTypeLabel(p: IPaymentRecord): string {
        if (p.is_refund) {
            return p.direction === 'IN' ? 'Refund Received' : 'Refund Issued';
        }
        if (p.is_advance) {
            return p.direction === 'IN' ? 'Advance Received' : 'Advance Paid';
        }
        return p.direction === 'IN' ? 'Payment Received' : 'Payment Sent';
    }



    function getReceiptHTML(
        payment: IPaymentRecord,
        companyInfo: any = null,
        partyDetails: { name: string; phone: string; gstin: string; email: string; address: string } | null = null,
        refDetails: { id: string; date: string; amount: number; paid: number; refunded: number; balance: number; status: string } | null = null
    ): string {
        const type = getTransactionTypeLabel(payment);
        const amountStr = formatCurrency(payment.amount);
        const dateStr = formatDate(payment.payment_date);
        
        // Company branding fallbacks
        const company = companyInfo || {
            company_name: 'SHRESHT SYSTEMS',
            address: { line1: 'Company Address', line2: '', city: '', state: '', pincode: '', country: 'India' },
            phone: { ph1: '0000000000', ph2: '' },
            email: 'email@company.com',
            website: 'www.company.com',
            gstin: 'GSTIN Number'
        };
        const companyName = (company.company_name || 'SHRESHT SYSTEMS').toUpperCase();
        const companyAddress = typeof company.address === 'string'
            ? company.address
            : [company.address?.line1, company.address?.line2, company.address?.city, company.address?.state ? company.address.state + (company.address.pincode ? ' - ' + company.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
        const companyPhone = company.phone ? `${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}` : '';
        
        // Status resolution
        let statusLabel = 'PAID';
        let statusBadgeClass = 'badge-paid';
        if (payment.is_refund) {
            statusLabel = 'REFUND';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_already_refunded) {
            statusLabel = 'REFUNDED';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_advance) {
            statusLabel = 'ADVANCE';
            statusBadgeClass = 'badge-partial'; // amber
        } else if (payment.status) {
            const statusLower = payment.status.toLowerCase();
            if (statusLower === 'partially paid' || statusLower === 'partial') {
                statusLabel = 'PARTIALLY PAID';
                statusBadgeClass = 'badge-partial';
            } else if (statusLower === 'pending') {
                statusLabel = 'PENDING';
                statusBadgeClass = 'badge-pending';
            }
        }

        // Amount in Words
        const numToWords = (window as any).numberToWords;
        const amountInWords = numToWords ? `${numToWords(payment.amount)} Rupees Only` : '';

        // Mode badge class
        let modeBadgeClass = 'mode-cash';
        const modeVal = payment.mode || 'Cash';
        if (modeVal === 'UPI') modeBadgeClass = 'mode-upi';
        else if (modeVal === 'Bank Transfer') modeBadgeClass = 'mode-bank';
        else if (modeVal === 'Cheque') modeBadgeClass = 'mode-cheque';

        // Party fields
        const partyName = partyDetails?.name || payment.party_name || '-';
        const partyPhone = partyDetails?.phone || '-';
        const partyGstin = partyDetails?.gstin || '-';
        const partyEmail = partyDetails?.email || '-';
        const partyAddress = partyDetails?.address || '-';

        // Settlement table
        let settlementHTML = '';
        if (refDetails && payment.reference_type === 'Invoice') {
            const outstanding = refDetails.balance;
            const isSettled = outstanding <= 0;
            const settlementStatusLabel = isSettled ? 'FULLY SETTLED' : 'OUTSTANDING';
            const settlementStatusClass = isSettled ? 'status-badge badge-paid' : 'status-badge badge-partial';
            
            settlementHTML = `
                <div class="settlement-card">
                    <div class="card-title">Invoice Settlement Summary</div>
                    <table class="settlement-table">
                        <thead>
                            <tr>
                                <th>Invoice Number</th>
                                <th class="amount-col">Invoice Amount</th>
                                <th class="amount-col">Amount Paid</th>
                                <th class="amount-col">Balance Amount</th>
                                <th style="text-align: center; width: 140px;">Settlement Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="strong">${refDetails.id}</td>
                                <td class="amount-col">₹&nbsp;${formatCurrency(refDetails.amount).replace('₹', '').trim()}</td>
                                <td class="amount-col">₹&nbsp;${formatCurrency(refDetails.paid).replace('₹', '').trim()}</td>
                                <td class="amount-col strong">₹&nbsp;${formatCurrency(outstanding).replace('₹', '').trim()}</td>
                                <td style="text-align: center;">
                                    <span class="${settlementStatusClass}" style="padding: 3px 10px; font-size: 9px;">${settlementStatusLabel}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        const printTimeStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <html>
            <head>
                <title>Payment Receipt - ${payment._id}</title>
                <style>
                    body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #1e293b;
                        background-color: #ffffff;
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    h1, h2, h3, p { margin: 0; }
                    .receipt-container {
                        width: 210mm;
                        max-width: 210mm;
                        min-height: 297mm;
                        margin: 30px auto;
                        padding: 30px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-sizing: border-box;
                        position: relative;
                        background: #ffffff url("../assets/icon2.png") no-repeat center/40%;
                    }
                    @media print {
                        @page {
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .receipt-container {
                            margin: 0;
                            padding: 30px;
                            box-shadow: none;
                            border: none;
                            border-radius: 0;
                            width: 100%;
                            max-width: 100%;
                            min-height: 100%;
                        }
                    }
                    
                    /* Exact Invoice Header Banner styles */
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 20px 30px;
                        margin-bottom: 24px;
                        background: #1a365d;
                        border-radius: 12px;
                        color: #ffffff;
                        border: none;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        box-sizing: border-box;
                    }
                    .quotation-brand {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    }
                    .logo {
                        width: 80px;
                        height: 80px;
                        background: #ffffff;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        box-sizing: border-box;
                    }
                    .logo img {
                        width: 50px;
                        height: 50px;
                        object-fit: contain;
                    }
                    .quotation-brand-text h1 {
                        margin: 0;
                        color: #ffffff;
                        font-size: 26px;
                        letter-spacing: -0.5px;
                        font-weight: 800;
                        line-height: 1.1;
                    }
                    .quotation-tagline {
                        margin: 4px 0 0 0;
                        color: #e2e8f0;
                        font-size: 13px;
                        font-weight: 500;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }
                    .company-details {
                        text-align: right;
                        line-height: 1.6;
                    }
                    .company-details p {
                        margin: 0;
                        color: #f1f5f9;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    
                    /* Title & Badge Row */
                    .receipt-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                    .receipt-title-box h2 { font-size: 24px; font-weight: 800; color: #1e3a66; letter-spacing: -0.5px; text-transform: uppercase; }
                    .receipt-meta { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
                    .receipt-meta span { color: #1e293b; font-weight: 600; }
                    
                    /* Badges */
                    .status-badge { padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; display: inline-block; text-align: center; }
                    .badge-paid { background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
                    .badge-partial { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
                    .badge-pending { background-color: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
                    .badge-refunded { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
                    
                    /* Two-Column Grid */
                    .info-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; margin-bottom: 24px; }
                    .info-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
                    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
                    
                    /* Customer Info */
                    .party-details { font-size: 12px; line-height: 1.6; }
                    .party-name { font-size: 14px; font-weight: 700; color: #1e3a66; margin-bottom: 4px; }
                    .party-info-row { display: flex; margin-top: 4px; }
                    .party-info-label { color: #64748b; width: 60px; flex-shrink: 0; font-weight: 600; }
                    .party-info-value { color: #1e293b; font-weight: 550; }
                    
                    /* Amount Box */
                    .amount-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                    .amount-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
                    .amount-value { font-size: 30px; font-weight: 950; color: #1e3a66; letter-spacing: -0.5px; }
                    .amount-words-box { font-size: 10px; color: #64748b; font-style: italic; font-weight: 600; margin-top: 6px; max-width: 100%; text-transform: capitalize; }
                    
                    /* Details Grid */
                    .details-grid-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 12px; }
                    .detail-row { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #f8fafc; padding-bottom: 6px; }
                    .detail-label { color: #64748b; font-weight: 600; }
                    .detail-value { color: #1e293b; font-weight: 600; text-align: right; }
                    
                    /* Mode Badges */
                    .mode-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
                    .mode-cash { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                    .mode-upi { background-color: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
                    .mode-bank { background-color: #faf5ff; color: #7c3aed; border: 1px solid #e9d5ff; }
                    .mode-cheque { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                    
                    /* Settlement Table */
                    .settlement-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
                    .settlement-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .settlement-table th { text-align: left; padding: 8px 10px; background-color: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
                    .settlement-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: 500; color: #334155; }
                    .settlement-table td.strong { font-weight: 700; color: #1e293b; }
                    .settlement-table td.amount-col { text-align: right; }
                    .settlement-table th.amount-col { text-align: right; }
                    
                    /* Footer */
                    .footer-note { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 500; }
                    
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <!-- Brand Navy Header (Exact Invoice Style) -->
                    <div class="header">
                        <div class="quotation-brand">
                            <div class="logo">
                                <img src="../assets/icon.png" alt="SSMS Logo">
                            </div>
                            <div class="quotation-brand-text">
                                <h1>${companyName}</h1>
                                <p class="quotation-tagline">CCTV & Energy Solutions</p>
                            </div>
                        </div>
                        <div class="company-details">
                            <p>${companyAddress}</p>
                            <p>Ph: ${companyPhone}</p>
                            <p>GSTIN: ${company.gstin}</p>
                            <p>Email: ${company.email}</p>
                            <p>Website: ${company.website}</p>
                        </div>
                    </div>
                    
                    <!-- Title row -->
                    <div class="receipt-header-row">
                        <div class="receipt-title-box">
                            <h2>Payment Receipt</h2>
                            <div class="receipt-meta">
                                Receipt No: <span>${payment._id.substring(payment._id.length - 6).toUpperCase()}</span> &nbsp;|&nbsp; 
                                Date: <span>${dateStr}</span>
                            </div>
                        </div>
                        <div>
                            <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                        </div>
                    </div>
                    
                    <!-- Two Column Section (Party & Amount) -->
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="card-title">Received From</div>
                            <div class="party-details">
                                <div class="party-name">${partyName}</div>
                                <div class="party-info-row">
                                    <span class="party-info-label">Address:</span>
                                    <span class="party-info-value">${partyAddress}</span>
                                </div>
                                <div class="party-info-row">
                                    <span class="party-info-label">Phone:</span>
                                    <span class="party-info-value">${partyPhone}</span>
                                </div>
                                <div class="party-info-row">
                                    <span class="party-info-label">GSTIN:</span>
                                    <span class="party-info-value">${partyGstin}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="amount-card">
                            <div class="amount-title">Amount Received</div>
                            <div class="amount-value">${amountStr}</div>
                            ${amountInWords ? `<div class="amount-words-box">${amountInWords} Only</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Transaction Details Grid Card -->
                    <div class="details-grid-card">
                        <div class="card-title">Transaction Details</div>
                        <div class="details-grid">
                            <div class="detail-row">
                                <span class="detail-label">Transaction ID:</span>
                                <span class="detail-value">${payment.transaction_details || payment._id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Date:</span>
                                <span class="detail-value">${dateStr}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Mode:</span>
                                <span class="detail-value">
                                    <span class="mode-badge ${modeBadgeClass}">${modeVal}</span>
                                </span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Transaction Type:</span>
                                <span class="detail-value">${type}</span>
                            </div>
                            <div class="detail-row" style="grid-column: span 2;">
                                <span class="detail-label">Reference Document:</span>
                                <span class="detail-value">
                                    ${payment.reference_type ? `${payment.reference_type} (${payment.reference_id || '-'})` : '-'}
                                </span>
                            </div>
                            ${payment.remarks ? `
                            <div class="detail-row" style="grid-column: span 2; border-bottom: none;">
                                <span class="detail-label">Remarks:</span>
                                <span class="detail-value" style="text-align: left; font-weight: 500;">${payment.remarks}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Settlement summary section -->
                    ${settlementHTML}
                    
                    <!-- Footer Note -->
                    <div class="footer-note">
                        This receipt confirms successful receipt of payment. Generated by SSMS ERP on ${printTimeStr}.
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // ── Helper functions ───────────────────────────────────
    function formatCurrency(n: number): string {
        return '₹ ' + Number(n || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(d: string | undefined): string {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function escapeHtml(value: string | undefined): string {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function valOrDash(value: string | undefined): string {
        const trimmed = String(value || '').trim();
        return trimmed || '-';
    }

    function todayISO(): string {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function showToast(msg: string, isError?: boolean): void {
        const $toast = document.getElementById('toast') as HTMLElement;
        const $msg = document.getElementById('toast-message') as HTMLElement;
        if (!$toast || !$msg) return;
        $msg.textContent = msg;
        $toast.className = $toast.className.replace('bg-green-600', '').replace('bg-red-600', '');
        $toast.classList.add(isError ? 'bg-red-600' : 'bg-green-600');
        $toast.classList.remove('hidden');
        setTimeout(() => $toast.classList.add('hidden'), 3000);
    }

    function showInlineError(input: HTMLElement, message: string) {
        if (!input.id) {
            input.id = 'input-val-' + Math.random().toString(36).substring(2, 11);
        }
        clearInlineError(input);

        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'error-message-inline';
        errorMsg.style.cssText = 'font-size: 11px; font-weight: 600; color: #dc2626; margin-top: 4px; transition: all 0.2s ease-in-out;';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            parent.appendChild(errorMsg);
        }

        const clearHandler = () => {
            clearInlineError(input);
            input.removeEventListener('input', clearHandler);
            input.removeEventListener('change', clearHandler);
        };
        input.addEventListener('input', clearHandler);
        input.addEventListener('change', clearHandler);
    }

    function clearInlineError(input: HTMLElement) {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');

        const errorId = `${input.id}-error`;
        const errorMsg = document.getElementById(errorId);
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    function clearFormErrors() {
        const form = document.getElementById('payment-form');
        if (!form) return;
        const errorMsgs = form.querySelectorAll('.error-message-inline');
        errorMsgs.forEach(el => el.remove());

        const errorInputs = form.querySelectorAll('[aria-invalid="true"]');
        errorInputs.forEach(input => {
            (input as HTMLElement).style.borderColor = '';
            (input as HTMLElement).style.boxShadow = '';
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });
    }

    function paymentPartyType(payment: IPaymentRecord): 'Customer' | 'Supplier' {
        return payment.party_type || (payment.direction === 'IN' ? 'Customer' : 'Supplier');
    }

    function referenceLabel(payment: IPaymentRecord): string {
        const refType = valOrDash(payment.reference_type);
        const refId = valOrDash(payment.reference_id);
        return refId === '-' ? refType : `${refType}: ${refId}`;
    }

    async function handleReferenceClick(event: MouseEvent, type: string, refDbId: string, path: string) {
        event.preventDefault();
        event.stopPropagation();

        const link = event.currentTarget as HTMLAnchorElement || (event.target as HTMLElement).closest('a');
        const originalHtml = link ? link.innerHTML : null;

        // Show inline loading state on the link
        if (link) {
            link.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:0.8em;"></i>';
            (link as HTMLElement).style.pointerEvents = 'none';
        }

        const showAlert = (msg: string) => {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1(msg);
            } else {
                alert(msg);
            }
        };

        const restoreLink = () => {
            if (link && originalHtml !== null) {
                link.innerHTML = originalHtml;
                (link as HTMLElement).style.pointerEvents = '';
            }
        };

        try {
            const res = await fetch(`/payment/get-reference-details/${type}/${refDbId}`);

            if (res.status === 404) {
                restoreLink();
                showAlert(`This ${type} record no longer exists. It may have been permanently deleted.`);
                return;
            }

            if (!res.ok) {
                restoreLink();
                showAlert(`Unable to verify the linked ${type} record. Server returned an error (${res.status}). Please try again.`);
                return;
            }

            const data = await res.json();
            if (data.success && data.details) {
                if (data.details.deletion?.is_deleted) {
                    restoreLink();
                    showAlert(`This ${type} record has been deleted and is no longer accessible.`);
                } else {
                    // Record exists and is active — navigate
                    window.location.href = path;
                }
            } else {
                restoreLink();
                showAlert(`This ${type} record no longer exists. It may have been permanently deleted.`);
            }
        } catch (err) {
            console.error('Error verifying reference document:', err);
            restoreLink();
            showAlert(`Could not reach the server to verify this ${type} record. Please check your connection and try again.`);
        }
    }
    (window as any).handleReferenceClick = handleReferenceClick;

    function getReferenceLinkHtml(p: IPaymentRecord): string {
        const refType = valOrDash(p.reference_type);
        const refId = valOrDash(p.reference_id);
        if (refId === '-' || !p.reference_type || !p.reference_id) return refType === '-' ? '-' : refType;
        if (p.reference_type === 'Adjustment') return `${escapeHtml(p.reference_type)}: ${escapeHtml(p.reference_id)}`;

        let path = '';
        if (p.reference_type === 'Invoice') {
            path = `../invoice/invoice.html?view=${p.reference_id}`;
        } else if (p.reference_type === 'Purchase') {
            path = `../purchase/purchase.html?view=${p.reference_id}`;
        } else if (p.reference_type === 'Service') {
            path = `../service/service.html?view=${p.reference_id}`;
        } else {
            return `${escapeHtml(p.reference_type)}: ${escapeHtml(p.reference_id)}`;
        }
        return `${escapeHtml(p.reference_type)}: <a href="${path}" onclick="handleReferenceClick(event, '${p.reference_type}', '${p.reference_id}', '${path}')" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold" title="View Linked Document: ${escapeHtml(p.reference_type)} ${escapeHtml(p.reference_id)}">${escapeHtml(p.reference_id)}</a>`;
    }

    // ── API Calls ──────────────────────────────────────────
    async function fetchFullDetails() {
        try {
            const res = await fetch(`/payment/${paymentId}`);
            const data: IApiResponse = await res.json();
            if (data.success && data.payment) {
                currentPayment = data.payment;
                populateDetails(data.payment);
            } else {
                showToast(data.message || 'Failed to load details', true);
            }
        } catch (e) {
            console.error('Failed to load details', e);
            showToast('Failed to load payment profile', true);
        }
    }



    async function deletePayment(): Promise<IApiResponse> {
        const res = await fetch(`/payment/${paymentId}`, { method: 'DELETE' });
        return res.json();
    }



    async function fetchDetailsParty(type: 'Customer' | 'Supplier', id: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-party-details-by-id/${type}/${id}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                
                let name = '-';
                let phone = '-';
                let email = '-';
                let gstin = party.gstin || '-';
                let address = null;

                if (type === 'Customer') {
                    const contact = party.customer;
                    name = contact?.name || contact?.first_name || '-';
                    phone = contact?.phone || '-';
                    email = contact?.email || '-';
                    address = party.billing_address;
                } else if (type === 'Supplier') {
                    name = party.supplier_name || '-';
                    phone = party.phone || '-';
                    email = party.email || '-';
                    address = party.billing_address || party.address;
                }

                let addrStr = '-';
                if (address) {
                    addrStr = [address.line1, address.line2, address.city, address.state, address.pincode]
                        .filter(Boolean).join(', ');
                }

                $detailsPartyName.textContent = name;
                $detailsPartyPhone.textContent = phone;
                $detailsPartyGstin.textContent = gstin;
                $detailsPartyEmail.textContent = email;
                $detailsPartyAddress.textContent = addrStr;

                $detailsPartyExpanded.classList.remove('hidden');
            } else {
                $detailsPartyExpanded.classList.add('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch expanded party details:', e);
            $detailsPartyExpanded.classList.add('hidden');
        }
    }

    async function fetchDetailsReference(type: 'Invoice' | 'Purchase' | 'Service', refId: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-reference-details/${type}/${refId}`);
            const data = await res.json();
            if (data.success && data.details) {
                const details = data.details;

                let idStr = '-';
                let dateStr = '-';
                let rawAmount = 0;
                let statusStr = '-';

                if (type === 'Invoice') {
                    idStr = details.invoice_no || details.invoice_id || '-';
                    dateStr = details.invoice_date ? formatDate(details.invoice_date) : '-';
                    rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    statusStr = details.status || '-';
                } else if (type === 'Purchase') {
                    idStr = details.purchase_invoice_no || details.purchase_order_no || '-';
                    dateStr = details.purchase_date ? formatDate(details.purchase_date) : '-';
                    rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    statusStr = details.status || '-';
                } else if (type === 'Service') {
                    idStr = details.service_no || '-';
                    dateStr = details.service_date ? formatDate(details.service_date) : '-';
                    rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    statusStr = details.status || '-';
                }

                const rawPaid = details.total_paid_amount || 0;
                const rawRefund = details.refund_amount || 0;
                const rawBalance = Math.max(0, rawAmount - rawPaid + rawRefund);

                const $refTypeText = document.getElementById('details-ref-type-text');
                if ($refTypeText) $refTypeText.textContent = type;

                $detailsRefId.textContent = idStr;
                $detailsRefDate.textContent = dateStr;
                $detailsRefAmount.textContent = formatCurrency(rawAmount);

                const $refPaid = document.getElementById('details-ref-paid');
                const $refRefunded = document.getElementById('details-ref-refunded');
                const $refBalance = document.getElementById('details-ref-balance');

                if ($refPaid) $refPaid.textContent = formatCurrency(rawPaid);
                if ($refRefunded) $refRefunded.textContent = formatCurrency(rawRefund);
                if ($refBalance) $refBalance.textContent = formatCurrency(rawBalance);
                
                $detailsRefStatus.textContent = statusStr;
                $detailsRefStatus.className = 'font-bold text-sm uppercase';
                const lowerStatus = statusStr.toLowerCase();
                if (lowerStatus === 'paid') {
                    $detailsRefStatus.classList.add('text-green-600');
                } else if (lowerStatus === 'unpaid' || lowerStatus === 'overdue') {
                    $detailsRefStatus.classList.add('text-red-600');
                } else if (lowerStatus === 'partially paid' || lowerStatus === 'partial') {
                    $detailsRefStatus.classList.add('text-amber-600');
                } else {
                    $detailsRefStatus.classList.add('text-gray-600');
                }

                $detailsRefExpanded.classList.remove('hidden');
            } else {
                $detailsRefExpanded.classList.add('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch expanded reference details:', e);
            $detailsRefExpanded.classList.add('hidden');
        }
    }

    function populateDetails(payment: IPaymentRecord) {
        const isIn = payment.direction === 'IN';

        // Document title and header
        const formattedId = payment._id.substring(payment._id.length - 6).toUpperCase();
        document.title = `Payment Detail | ${payment.party_name || payment.party_display_id || 'Ref'}`;
        $headerTitle.textContent = `Payment ID: ${formattedId}`;

        // Set Breadcrumb payment ID
        const $breadcrumbPaymentId = document.getElementById('breadcrumb-payment-id');
        if ($breadcrumbPaymentId) {
            $breadcrumbPaymentId.textContent = `Payment #${formattedId}`;
        }

        // Set Payment Amount
        $detailsAmount.textContent = formatCurrency(payment.amount);
        $detailsAmount.className = `text-3xl font-extrabold tracking-tight ${isIn ? 'text-green-700' : 'text-slate-800'}`;

        // Set Single Status Badge
        const $statusBadge = document.getElementById('details-status-badge') as HTMLElement;
        if ($statusBadge) {
            let statusText = 'Completed';
            let bgClass = 'bg-green-100 text-green-800';
            
            if (payment.is_refund) {
                statusText = 'Refund';
                bgClass = 'bg-amber-100 text-amber-800';
            } else if (payment.is_already_refunded) {
                statusText = 'Refunded';
                bgClass = 'bg-red-100 text-red-800';
            } else if (payment.is_advance) {
                statusText = 'Advance';
                bgClass = 'bg-blue-100 text-blue-800';
            }

            $statusBadge.textContent = statusText;
            $statusBadge.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${bgClass}`;
        }

        // Set header elements
        const $headerType = document.getElementById('header-type');
        const $headerMethod = document.getElementById('header-method');
        const $headerDate = document.getElementById('header-date');
        const $headerTxId = document.getElementById('header-tx-id');
        const $headerLinkedDoc = document.getElementById('header-linked-doc');

        if ($headerType) $headerType.textContent = isIn ? 'Money In' : 'Money Out';
        if ($headerMethod) $headerMethod.textContent = payment.mode || '-';
        if ($headerDate) $headerDate.textContent = formatDate(payment.payment_date);
        if ($headerTxId) $headerTxId.textContent = payment.transaction_details || '-';
        if ($headerLinkedDoc) $headerLinkedDoc.innerHTML = getReferenceLinkHtml(payment);

        // Transaction Details
        $detailsTransaction.textContent = valOrDash(payment.transaction_details);
        $detailsMode.textContent = payment.mode || '-';
        $detailsDate.textContent = formatDate(payment.payment_date);
        $detailsParty.textContent = `${paymentPartyType(payment)}${payment.party_display_id || payment.party_id ? `: ${payment.party_display_id || payment.party_id}` : ''}`;
        $detailsReference.innerHTML = getReferenceLinkHtml(payment);
        $detailsCreated.textContent = formatDate(payment.createdAt);
        
        const vNo = (payment as any).voucher_no;
        if (vNo) {
            $detailsVoucher.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">${escapeHtml(vNo)}</span>`;
        } else {
            $detailsVoucher.textContent = '-';
        }

        $detailsRemarks.textContent = valOrDash(payment.remarks);

        // Populate Financial Details
        const $financialAmount = document.getElementById('financial-amount');
        const $financialRefund = document.getElementById('financial-refund');
        const $financialNet = document.getElementById('financial-net');
        const $financialMode = document.getElementById('financial-mode');

        const refundAmt = payment.is_already_refunded ? payment.amount : 0; 
        if ($financialAmount) $financialAmount.textContent = formatCurrency(payment.amount);
        if ($financialRefund) $financialRefund.textContent = formatCurrency(refundAmt);
        if ($financialNet) $financialNet.textContent = formatCurrency(payment.amount - refundAmt);
        if ($financialMode) $financialMode.textContent = payment.mode || '-';

        // Populate Activity Timeline
        const $timeline = document.getElementById('activity-timeline');
        if ($timeline) {
            let timelineHTML = '';
            // Payment Created
            timelineHTML += `
                <div class="relative">
                    <span class="absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                        <i class="fas fa-check text-[8px] text-blue-600"></i>
                    </span>
                    <p class="text-xs font-bold text-slate-800">Payment Created</p>
                    <p class="text-[10px] text-slate-500 font-medium">${formatDate(payment.createdAt)}</p>
                </div>
            `;
            // Linked Document
            if (payment.reference_id) {
                timelineHTML += `
                    <div class="relative">
                        <span class="absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white">
                            <i class="fas fa-link text-[8px] text-emerald-600"></i>
                        </span>
                        <p class="text-xs font-bold text-slate-800">Linked to ${payment.reference_type || 'Document'} #${payment.reference_id}</p>
                        <p class="text-[10px] text-slate-500 font-medium">${formatDate(payment.payment_date)}</p>
                    </div>
                `;
            }
            // Refund state
            if (payment.is_refund) {
                timelineHTML += `
                    <div class="relative">
                        <span class="absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 ring-4 ring-white">
                            <i class="fas fa-undo text-[8px] text-amber-600"></i>
                        </span>
                        <p class="text-xs font-bold text-slate-800">Refund Processed</p>
                        <p class="text-[10px] text-slate-500 font-medium">${formatDate(payment.payment_date)}</p>
                    </div>
                `;
            } else if (payment.is_already_refunded) {
                timelineHTML += `
                    <div class="relative">
                        <span class="absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-100 ring-4 ring-white">
                            <i class="fas fa-exclamation-circle text-[8px] text-red-600"></i>
                        </span>
                        <p class="text-xs font-bold text-slate-800">Refund Issued</p>
                        <p class="text-[10px] text-slate-500 font-medium">${formatDate(payment.payment_date)}</p>
                    </div>
                `;
            }

            $timeline.innerHTML = timelineHTML;
        }

        // Set Party profile link href
        const $partyProfileBtn = document.getElementById('party-profile-btn') as HTMLAnchorElement | null;
        if ($partyProfileBtn && payment.party_id) {
            const pType = paymentPartyType(payment);
            $partyProfileBtn.href = pType === 'Customer' ? `../customer/customer_details.html?id=${payment.party_id}` : `../supplier/supplier_details.html?id=${payment.party_id}`;
            $partyProfileBtn.textContent = pType === 'Customer' ? 'Open Customer Profile' : 'View Supplier';
        }

        if (payment.is_already_refunded || payment.is_refund) {
            $detailsRefundBtn.disabled = true;
            $detailsRefundBtn.classList.add('opacity-50', 'cursor-not-allowed');
            $detailsRefundBtn.title = payment.is_refund ? 'Cannot refund a refund transaction' : 'This payment has already been refunded';
        } else {
            $detailsRefundBtn.disabled = false;
            $detailsRefundBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            $detailsRefundBtn.title = 'Refund Transaction (Ctrl+U)';
        }

        // Fetch expanded cards
        $detailsPartyExpanded.classList.add('hidden');
        $detailsRefExpanded.classList.add('hidden');

        if (payment.party_id) {
            fetchDetailsParty(paymentPartyType(payment), payment.party_id);
        }

        if (payment.reference_id && payment.reference_type && payment.reference_type !== 'Adjustment') {
            fetchDetailsReference(payment.reference_type as any, payment.reference_id);
        }
    }



    // ── Keyboard Shortcuts ─────────────────────────────────
    function injectShortcutsStyles(): void {
        if (document.getElementById('shortcuts-custom-styles')) return;
        const style = document.createElement('style');
        style.id = 'shortcuts-custom-styles';
        style.textContent = `
            #shortcuts-modal.hidden { opacity: 0; pointer-events: none; display: none !important; }
            .shortcuts-panel { width: 100%; animation: fadeIn 0.25s ease-out forwards; }
            .shortcut-row { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.5rem; border-bottom: 1px solid #f1f5f9; border-radius: 6px; }
            .shortcut-row:hover { background-color: #f8fafc; }
            .shortcut-keys { display: flex; align-items: center; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
            .shortcut-keys kbd { background-color: #ffffff; border: 1px solid #e2e8f0; border-bottom-width: 2px; border-radius: 0.375rem; padding: 0.2rem 0.5rem; font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; font-weight: 600; color: #334155; }
        `;
        document.head.appendChild(style);
    }

    function renderShortcutKeys(keys: string[]): string {
        const isMac = navigator.userAgent.toLowerCase().includes('mac');
        return `<div class="shortcut-keys">${keys.map((key, index) => {
            const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
            const separator = index > 0 ? '<span class="text-slate-300 font-medium">+</span>' : '';
            return `${separator}<kbd>${displayKey}</kbd>`;
        }).join('')}</div>`;
    }

    function injectShortcutsModalHTML(): void {
        if (document.getElementById('shortcuts-modal')) return;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'shortcuts-modal';
        modalDiv.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center hidden opacity-0 transition-opacity duration-200';
        modalDiv.setAttribute('role', 'dialog');
        modalDiv.setAttribute('aria-modal', 'true');
        modalDiv.setAttribute('aria-label', 'Keyboard Shortcuts');
        
        const rows = [
            ['Edit Payment', ['Ctrl', 'E']],
            ['Refund Transaction', ['Ctrl', 'U']],
            ['Delete Payment', ['Ctrl', 'Delete']],
            ['Close Shortcuts / Escape', ['Esc']],
            ['Back to Payments', ['Ctrl', 'H']],
            ['Keyboard Shortcuts', ['?']]
        ].map(([label, keys]) => `
            <div class="shortcut-row">
                <span class="text-xs font-semibold text-slate-600">${label as string}</span>
                ${renderShortcutKeys(keys as string[])}
            </div>
        `).join('');

        modalDiv.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto shortcuts-panel">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <i class="fas fa-keyboard text-lg"></i>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-800 tracking-tight">Keyboard Shortcuts</h2>
                    </div>
                    <button id="close-shortcuts" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Close shortcuts help modal">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
                <div class="p-6">
                    <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <i class="fas fa-bolt text-yellow-600"></i>
                        Payment Details Actions
                    </h3>
                    <div class="space-y-1">${rows}</div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    function showShortcutsModal(): void {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.remove('hidden');
        shortcutsModalRef.offsetHeight;
        shortcutsModalRef.classList.remove('opacity-0');
        document.getElementById('close-shortcuts')?.focus();
    }

    function hideShortcutsModal(): void {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.add('opacity-0');
        setTimeout(() => shortcutsModalRef?.classList.add('hidden'), 200);
    }

    function initShortcutsModal(): void {
        injectShortcutsStyles();
        injectShortcutsModalHTML();
        shortcutsModalRef = document.getElementById('shortcuts-modal');
        document.getElementById('shortcuts-btn')?.addEventListener('click', showShortcutsModal);
        document.getElementById('close-shortcuts')?.addEventListener('click', hideShortcutsModal);
        shortcutsModalRef?.addEventListener('click', (event) => {
            if (event.target === shortcutsModalRef) hideShortcutsModal();
        });
    }

    function isTypingContext(): boolean {
        const active = document.activeElement;
        if (!active) return false;
        const tagName = active.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (active as HTMLElement).isContentEditable;
    }

    // ── Event Handlers ─────────────────────────────────────
    $homeBtn.addEventListener('click', () => {
        window.location.href = '/payment';
    });

    $detailsEditBtn.addEventListener('click', () => {
        window.location.href = `/payment?id=${paymentId}&edit=true`;
    });

    $detailsRefundBtn.addEventListener('click', () => {
        window.location.href = `/payment?id=${paymentId}&refund=true`;
    });

    $detailsPdfBtn?.addEventListener('click', async () => {
        if (!currentPayment) return;
        
        // Fetch company info dynamically
        const companyInfo = (window as any).companyConfig ? await (window as any).companyConfig.getCompanyInfo() : null;
        
        // Extract party details from the DOM elements
        const partyDetails = {
            name: $detailsPartyName.textContent || '-',
            phone: $detailsPartyPhone.textContent || '-',
            gstin: $detailsPartyGstin.textContent || '-',
            email: $detailsPartyEmail.textContent || '-',
            address: $detailsPartyAddress.textContent || '-'
        };
        
        // Extract reference details if available
        let refDetails = null;
        if (currentPayment.reference_id && currentPayment.reference_type && currentPayment.reference_type !== 'Adjustment') {
            const paidText = document.getElementById('details-ref-paid')?.textContent || '0';
            const refundedText = document.getElementById('details-ref-refunded')?.textContent || '0';
            const balanceText = document.getElementById('details-ref-balance')?.textContent || '0';
            
            refDetails = {
                id: $detailsRefId.textContent || '-',
                date: $detailsRefDate.textContent || '-',
                amount: parseFloat(($detailsRefAmount.textContent || '0').replace(/[^0-9.-]/g, '')) || 0,
                paid: parseFloat(paidText.replace(/[^0-9.-]/g, '')) || 0,
                refunded: parseFloat(refundedText.replace(/[^0-9.-]/g, '')) || 0,
                balance: parseFloat(balanceText.replace(/[^0-9.-]/g, '')) || 0,
                status: $detailsRefStatus.textContent || '-'
            };
        }
        
        const htmlContent = getReceiptHTML(currentPayment, companyInfo, partyDetails, refDetails);
        const cleanPartyName = (currentPayment.party_name || currentPayment.party_display_id || 'Receipt').replace(/[^a-zA-Z0-9-_]/g, '_');
        const paymentDate = currentPayment.payment_date ? currentPayment.payment_date.split('T')[0] : '';
        const filename = `PaymentReceipt-${cleanPartyName}${paymentDate ? '-' + paymentDate : ''}`;
        
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.handlePrintEvent === 'function') {
            electronAPI.handlePrintEvent(htmlContent, 'savePDF', filename);
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                showToast('Popup blocked. Please allow popups to save/print PDF.', true);
            }
        }
    });

    $detailsDeleteBtn?.addEventListener('click', () => {
        if (!currentPayment) return;
        const confirmedMsg = 'Are you sure you want to delete this payment transaction?';
        const showConfirm = (window as any).showConfirm;
        
        if (showConfirm) {
            showConfirm(confirmedMsg, async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const result = await deletePayment();
                        if (result.success) {
                            showToast('Payment deleted successfully');
                            setTimeout(() => {
                                window.location.href = '/payment';
                            }, 1000);
                        } else {
                            showToast(result.message || 'Failed to delete payment', true);
                        }
                    } catch (err) {
                        console.error('Delete error:', err);
                        showToast('Failed to delete payment', true);
                    }
                }
            });
        } else {
            if (confirm(confirmedMsg)) {
                deletePayment().then(result => {
                    if (result.success) {
                        showToast('Payment deleted successfully');
                        setTimeout(() => {
                            window.location.href = '/payment';
                        }, 1000);
                    } else {
                        showToast(result.message || 'Failed to delete payment', true);
                    }
                }).catch(err => {
                    console.error(err);
                    showToast('Failed to delete payment', true);
                });
            }
        }
    });

    // Keyboard Shortcuts listener
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const keyLower = e.key.toLowerCase();
        const isCtrlPressed = e.ctrlKey || e.metaKey;

        if (e.key === '?' && !isTypingContext()) {
            e.preventDefault();
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }
        if (isCtrlPressed && e.key === '/') {
            e.preventDefault();
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }
        if (e.key === 'Escape' && shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            hideShortcutsModal();
            return;
        }

        if (isCtrlPressed && keyLower === 'e' && !isTypingContext()) {
            e.preventDefault();
            $detailsEditBtn.click();
            return;
        }
        if (isCtrlPressed && keyLower === 'u' && !isTypingContext()) {
            e.preventDefault();
            if (!$detailsRefundBtn.disabled) {
                $detailsRefundBtn.click();
            }
            return;
        }
        if (isCtrlPressed && e.key === 'Delete' && !isTypingContext()) {
            e.preventDefault();
            $detailsDeleteBtn?.click();
            return;
        }
        if (isCtrlPressed && keyLower === 'h' && !isTypingContext()) {
            e.preventDefault();
            $homeBtn.click();
            return;
        }
    });

    // ── Init ───────────────────────────────────────────────
    initShortcutsModal();
    fetchFullDetails();

})();
