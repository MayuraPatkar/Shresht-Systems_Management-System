import { CounterModel } from "../models/Counter.model";
import { SettingsModel } from "../models/Settings.model";
import logger from "../utils/logger";

/**
 * Mapping from module key to the corresponding settings numbering field
 */
const moduleToSettingKey: Record<string, { prefix: string }> = {
    invoice: { prefix: "invoice_prefix" },
    quotation: { prefix: "quotation_prefix" },
    purchaseOrder: { prefix: "purchase_prefix" },
    purchase: { prefix: "purchase_prefix" },
    eWayBill: { prefix: "ewaybill_prefix" },
    service: { prefix: "service_prefix" },
};

/**
 * Read a value from the numbering section of Settings
 */
async function getSettingsValue(key: string, defaultValue: string | null = null): Promise<string | null> {
    try {
        const s = await SettingsModel.findOne().lean();
        if (!s || !s.numbering) return defaultValue;
        const numbering = s.numbering as Record<string, string | undefined>;
        return numbering[key] !== undefined ? (numbering[key] as string) : defaultValue;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Failed to read settings for id generator", { error: message });
        return defaultValue;
    }
}

/**
 * Return the financial-year start year for a given date.
 * FY runs April 1 – March 31: Jan/Feb/Mar belong to the previous year's FY.
 */
function getFYStartYear(date: Date): number {
    const month = date.getMonth(); // 0-indexed: Jan=0, Feb=1, Mar=2, Apr=3
    return month < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

/**
 * Helper to get Prefix, Date Part, counter key, and isYearly flag
 */
async function getPrefixAndDateParams(moduleKey: string): Promise<{
    prefix: string;
    datePart: string;
    counterKey: string;
    isYearly: boolean;
}> {
    const mk = String(moduleKey);
    const mapping = moduleToSettingKey[mk] || {};
    const prefixKey = mapping.prefix;

    const defaultPrefix = mk === "service" ? "SRV" : mk.toUpperCase().slice(0, 3);
    const prefix = (await getSettingsValue(prefixKey, defaultPrefix)) || defaultPrefix;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yy = String(yyyy).slice(-2);

    const isYearly = ['quotation', 'purchaseOrder', 'invoice', 'service'].includes(mk);
    
    let datePart = `${yy}${mm}${dd}`;
    let counterKey = `${mk}-${datePart}`;

    if (isYearly) {
        const fyStart = getFYStartYear(now);
        counterKey = `${mk}-FY${fyStart}`;
        const currentYearYY = String(fyStart).slice(-2);
        const nextYearYY = String(fyStart + 1).slice(-2);
        datePart = `${currentYearYY}${nextYearYY}`; // YY of current FY and next FY, e.g. "2627"
    }

    return { prefix, datePart, counterKey, isYearly };
}

/**
 * READ-ONLY: Peeks at the next ID without incrementing the DB.
 * Use this for displaying the ID in the UI (Preview).
 */
export async function previewNextId(moduleKey: string): Promise<string> {
    const { prefix, datePart, counterKey, isYearly } = await getPrefixAndDateParams(moduleKey);

    const docDay = await CounterModel.findOne({ _id: counterKey }).lean();

    let nextSeq = 0;
    let paddedSeq = "";
    
    if (isYearly) {
        nextSeq = docDay && typeof docDay.seq === "number" ? docDay.seq + 1 : 1;
        paddedSeq = String(nextSeq);
    } else {
        nextSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 0;
        paddedSeq = String(nextSeq).padStart(2, "0");
    }

    return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * WRITE: Atomically increments the counter and returns the generated ID.
 * Use this ONLY in the final SAVE route/controller.
 */
export async function generateNextId(moduleKey: string): Promise<string> {
    const { prefix, datePart, counterKey, isYearly } = await getPrefixAndDateParams(moduleKey);

    // Atomically increment
    const docDay = await CounterModel.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let nextSeq = 0;
    let paddedSeq = "";
    
    if (isYearly) {
        nextSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 1;
        paddedSeq = String(nextSeq);
    } else {
        nextSeq = docDay && typeof docDay.seq === "number" ? docDay.seq - 1 : 0;
        if (nextSeq < 0) nextSeq = 0;
        paddedSeq = String(nextSeq).padStart(2, "0");
    }

    return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * Syncs the counter if a custom ID matches the auto-generated pattern.
 * Prevents collision when user enters an ID manually.
 */
export async function syncCounterIfNeeded(moduleKey: string, customId: string): Promise<void> {
    if (!customId || typeof customId !== "string") return;

    const { prefix, datePart, counterKey, isYearly } = await getPrefixAndDateParams(moduleKey);

    // Build regex to match prefix pattern
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    if (isYearly) {
        const pattern = new RegExp(`^${escapedPrefix}(\\d{4})(\\d+)$`);
        const match = customId.match(pattern);
        if (!match) return;

        const idYearPart = match[1];
        const idSeq = parseInt(match[2], 10);

        if (idYearPart !== datePart) return;

        const docDay = await CounterModel.findOne({ _id: counterKey }).lean();
        const currentSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 0;

        if (idSeq > currentSeq) {
            await CounterModel.findOneAndUpdate(
                { _id: counterKey },
                { $set: { seq: idSeq } },
                { upsert: true }
            );
        }
    } else {
        const pattern = new RegExp(`^${escapedPrefix}(\\d{6})(\\d{2,})$`);
        const match = customId.match(pattern);
        if (!match) return;

        const idDatePart = match[1];
        const idSeq = parseInt(match[2], 10);

        if (idDatePart !== datePart) return;

        const docDay = await CounterModel.findOne({ _id: counterKey }).lean();
        const currentSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 0;

        if (idSeq >= currentSeq) {
            await CounterModel.findOneAndUpdate(
                { _id: counterKey },
                { $set: { seq: idSeq + 1 } },
                { upsert: true }
            );
        }
    }
}
