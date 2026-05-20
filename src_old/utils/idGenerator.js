const { Counters, Settings } = require('../models');
const logger = require('../utils/logger');

const moduleToSettingKey = {
  invoice: { prefix: 'invoice_prefix' },
  quotation: { prefix: 'quotation_prefix' },
  purchaseOrder: { prefix: 'purchase_prefix' },
  eWayBill: { prefix: 'ewaybill_prefix' },
  service: { prefix: 'service_prefix' }
};

async function getSettingsValue(key, defaultValue = null) {
  try {
    const s = await Settings.findOne().lean();
    if (!s || !s.numbering) return defaultValue;
    return s.numbering[key] !== undefined ? s.numbering[key] : defaultValue;
  } catch (err) {
    logger.error('Failed to read settings for id generator', { error: err.message || err });
    return defaultValue;
  }
}

/**
 * Helper to get Prefix and Date Part
 */
async function getPrefixAndDateParams(moduleKey) {
  const mk = String(moduleKey);
  const mapping = moduleToSettingKey[mk] || {};
  const prefixKey = mapping.prefix;

  const defaultPrefix = mk === 'service' ? 'SRV' : mk.toUpperCase().slice(0, 3);
  const prefix = await getSettingsValue(prefixKey, defaultPrefix);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(yyyy).slice(-2);
  const datePart = `${yy}${mm}${dd}`;

  const perDayCounterKey = `${mk}-${datePart}`;

  return { prefix, datePart, perDayCounterKey };
}

/**
 * READ-ONLY: Peeks at the next ID without incrementing the DB.
 * Use this for displaying the ID in the UI (Preview).
 */
async function previewNextId(moduleKey) {
  const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

  // Just find the current counter state, DO NOT update
  const docDay = await Counters.findOne({ _id: perDayCounterKey }).lean();

  // If no document exists for today, the count is 0.
  // If it exists, 'seq' is the count of IDs already generated.
  // So the NEXT ID is simply equal to the current 'seq'.
  // Example: seq is 5 (IDs 00-04 exist). Next ID is 05.
  let currentSeq = (docDay && typeof docDay.seq === 'number') ? docDay.seq : 0;

  const paddedSeq = String(currentSeq).padStart(2, '0');
  return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * WRITE: Atomically increments the counter.
 * Use this ONLY in the final SAVE route/controller.
 */
async function generateNextId(moduleKey) {
  const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

  // Atomically increment
  const docDay = await Counters.findOneAndUpdate(
    { _id: perDayCounterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // 0-based logic:
  // If it was 0, it becomes 1. We want 0. So subtract 1.
  let seqDay = (typeof docDay.seq === 'number') ? docDay.seq - 1 : 0;
  if (seqDay < 0) seqDay = 0;

  const paddedSeq = String(seqDay).padStart(2, '0');
  return `${prefix}${datePart}${paddedSeq}`;
}

/**
 * Syncs the counter if a custom ID matches the auto-generated pattern.
 * Prevents collision when user enters an ID like INV26010605 manually.
 * Call this AFTER successfully saving a document with a custom ID.
 */
async function syncCounterIfNeeded(moduleKey, customId) {
  if (!customId || typeof customId !== 'string') return;

  const { prefix, datePart, perDayCounterKey } = await getPrefixAndDateParams(moduleKey);

  // Build regex to match {prefix}{YYMMDD}{seq} pattern
  // prefix can be any string, datePart is 6 digits (YYMMDD), seq is 2+ digits
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}(\\d{6})(\\d{2,})$`);

  const match = customId.match(pattern);
  if (!match) return; // Custom ID doesn't match auto-generated format

  const idDatePart = match[1];
  const idSeq = parseInt(match[2], 10);

  // Only sync if the date part matches today's date
  if (idDatePart !== datePart) return;

  // Get current counter value
  const docDay = await Counters.findOne({ _id: perDayCounterKey }).lean();
  const currentSeq = (docDay && typeof docDay.seq === 'number') ? docDay.seq : 0;

  // If custom ID's sequence >= current counter, update counter to avoid collision
  // The counter stores how many IDs have been generated (0-based: seq=5 means IDs 00-04 used)
  // So if custom ID uses seq=05, we need counter to be at least 6 (so next auto-gen is 06)
  if (idSeq >= currentSeq) {
    await Counters.findOneAndUpdate(
      { _id: perDayCounterKey },
      { $set: { seq: idSeq + 1 } },
      { upsert: true }
    );
  }
}

module.exports = { previewNextId, generateNextId, syncCounterIfNeeded };