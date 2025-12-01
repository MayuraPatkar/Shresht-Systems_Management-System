const { Counters, Settings } = require('../models');
const logger = require('../utils/logger');

const moduleToSettingKey = {
  invoice: { prefix: 'invoice_prefix' },
  quotation: { prefix: 'quotation_prefix' },
  purchaseOrder: { prefix: 'purchase_prefix' },
  wayBill: { prefix: 'waybill_prefix' },
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

module.exports = { previewNextId, generateNextId };