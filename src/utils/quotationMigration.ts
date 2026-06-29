import { QuotationModel } from "../models/Quotation.model";
import logger from "./logger";
import { normalizeQuotationDocument, QUOTATION_SCHEMA_VERSION } from "./quotationSchema";

export async function migrateLegacyQuotations(): Promise<void> {
    const legacyQuery: any = {
        $or: [
            { schema_version: { $exists: false } },
            { schema_version: { $lt: QUOTATION_SCHEMA_VERSION } },
            { quotation_no: { $exists: false } },
            { totals: { $exists: false } },
            { customer_snapshot: { $exists: false } },
            { is_deleted: { $exists: false } },
        ],
    };

    const legacyQuotations = await QuotationModel.find(legacyQuery).limit(500);
    if (legacyQuotations.length === 0) return;

    for (const quotation of legacyQuotations as any[]) {
        const normalized = normalizeQuotationDocument(quotation);
        quotation.schema_version = QUOTATION_SCHEMA_VERSION;
        quotation.quotation_no = normalized.quotation_no;
        quotation.valid_till = normalized.valid_till;
        quotation.quotation_status = normalized.quotation_status || "Draft";
        quotation.customer_id = normalized.customer_id;
        quotation.customer_snapshot = normalized.customer_snapshot;
        quotation.items = normalized.items;
        quotation.other_charges = normalized.other_charges;
        quotation.discount = normalized.discount;
        quotation.totals = normalized.totals;
        quotation.content = normalized.content;
        quotation.is_deleted = normalized.is_deleted;
        quotation.deleted_at = normalized.deleted_at;
        quotation.deleted_by = normalized.deleted_by;
        quotation.deletion = quotation.deletion || { is_deleted: normalized.is_deleted };
        quotation.deletion.is_deleted = normalized.is_deleted;
        quotation.deletion.deleted_at = normalized.deleted_at;
        quotation.deletion.deleted_by = normalized.deleted_by;
        await quotation.save();
    }

    logger.info(`Migrated ${legacyQuotations.length} quotation records to schema v${QUOTATION_SCHEMA_VERSION}`);
}

export default migrateLegacyQuotations;
