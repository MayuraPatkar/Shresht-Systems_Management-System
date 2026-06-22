interface IVoucher {
    _id?: string;
    voucherNumber: string;
    date: string | Date;
    partyName: string;
    partyType: 'Customer' | 'Supplier' | 'Other';
    amount: number;
    amountInWords: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    chequeNumber?: string;
    bankName?: string;
    chequeDate?: string | Date;
    referenceNumber?: string;
    paidTowards: string;
    createdBy?: string;
    transactionId?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface IVoucherFilters {
    startDate?: string;
    endDate?: string;
    voucherNumber?: string;
    paymentMethod?: string;
    partyType?: string;
    partyName?: string;
    amountMin?: number | string;
    amountMax?: number | string;
    paidTowards?: string;
}
