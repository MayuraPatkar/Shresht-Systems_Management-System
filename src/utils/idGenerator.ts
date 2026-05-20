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
 * Helper to get Prefix and Date Part
 */
async function getPrefixAndDateParams(moduleKey: string): Promise<{
    prefix: string;
    datePart: string;
    perDayCounterKey: string;
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
    const datePart = `${yy}${mm}${dd}`;

    const perDayCounterKey = `${mk}-${datePart}`;

    return { prefix, datePart, perDayCounterKey };
}

/**
 * READ-ONLY: Peeks at the next ID without incrementing the DB.
 * Use this for displaying the ID in the UI (Preview).
 */
export async function previewNextId(moduleKey: string): Promise<string> {
    const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

    // Just find the current counter state, DO NOT update
    const docDay = await CounterModel.findOne({ _id: perDayCounterKey }).lean();

    const currentSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 0;

    const paddedSeq = String(currentSeq).padStart(2, "0");
    return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * WRITE: Atomically increments the counter.
 * Use this ONLY in the final SAVE route/controller.
 */
export async function generateNextId(moduleKey: string): Promise<string> {
    const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

    // Atomically increment
    const docDay = await CounterModel.findOneAndUpdate(
        { _id: perDayCounterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 0-based logic:
    // If it was 0, it becomes 1. We want 0. So subtract 1.
    let seqDay = docDay && typeof docDay.seq === "number" ? docDay.seq - 1 : 0;
    if (seqDay < 0) seqDay = 0;

    const paddedSeq = String(seqDay).padStart(2, "0");
    return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * Syncs the counter if a custom ID matches the auto-generated pattern.
 * Prevents collision when user enters an ID like INV26010605 manually.
 * Call this AFTER successfully saving a document with a custom ID.
 */
export async function syncCounterIfNeeded(moduleKey: string, customId: string): Promise<void> {
    if (!customId || typeof customId !== "string") return;

    const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

    // Build regex to match {prefix}{YYMMDD}{seq} pattern
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapedPrefix}(\\d{6})(\\d{2,})$`);

    const match = customId.match(pattern);
    if (!match) return; // Custom ID doesn't match auto-generated format

    const idDatePart = match[1];
    const idSeq = parseInt(match[2], 10);

    // Only sync if the date part matches today's date
    if (idDatePart !== datePart) return;

    // Get current counter value
    const docDay = await CounterModel.findOne({ _id: perDayCounterKey }).lean();
    const currentSeq = docDay && typeof docDay.seq === "number" ? docDay.seq : 0;

    // If custom ID's sequence >= current counter, update counter to avoid collision
    if (idSeq >= currentSeq) {
        await CounterModel.findOneAndUpdate(
            { _id: perDayCounterKey },
            { $set: { seq: idSeq + 1 } },
            { upsert: true }
        );
    }
}
