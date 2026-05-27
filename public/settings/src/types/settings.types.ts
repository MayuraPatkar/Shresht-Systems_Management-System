/**
 * Settings Module Types
 */

interface AdminAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

interface AdminPhone {
    ph1: string;
    ph2: string;
}

interface BankDetails {
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    branch: string;
}

interface AdminData {
    company_name: string;
    address: AdminAddress | string;
    state?: string;
    phone: AdminPhone;
    email: string;
    website: string;
    gstin: string;
    bank_details: BankDetails;
}

interface NumberingPref {
    invoice_prefix?: string;
    quotation_prefix?: string;
    purchase_prefix?: string;
    service_prefix?: string;
}

interface NotificationsPref {
    stock_inactive_months?: number;
}

interface BackupPref {
    auto_backup_enabled?: boolean;
    backup_frequency?: string;
    retention_days?: number;
    backup_location?: string;
    last_backup?: string;
}

interface SecurityPref {
    session_timeout?: number;
    max_login_attempts?: number;
    lockout_duration?: number;
}

interface WhatsAppPref {
    phoneNumberId?: string;
    storedTokenReference?: string;
    enabled?: boolean;
}

interface CloudinaryPref {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
}

interface SystemPreferences {
    numbering?: NumberingPref;
    notifications?: NotificationsPref;
    backup?: BackupPref;
    security?: SecurityPref;
    whatsapp?: WhatsAppPref;
    cloudinary?: CloudinaryPref;
}

interface SystemStaticInfo {
    app_name?: string;
    app_version?: string;
    node_version?: string;
    platform?: string;
    total_memory?: string;
    arch?: string;
    free_memory?: string;
    uptime?: string;
}

interface DatabaseStats {
    database_size_mb: number;
    storage_size_mb: number;
    total_documents: number;
    collections?: Record<string, number>;
}

interface ChangelogChange {
    type: 'feature' | 'improvement' | 'bugfix' | 'security' | 'breaking';
    description: string;
}

interface ChangelogVersion {
    version: string;
    date: string;
    title?: string;
    changes: ChangelogChange[];
}

interface ChangelogData {
    versions: ChangelogVersion[];
}
