const { Counters, Settings } = require('../models');
const logger = require('../utils/logger');

/**
 * Map moduleKey to setting names used in Settings.numbering
 */
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

async function generateNextId(moduleKey, options = {}) {
  // Normalize
  const mk = String(moduleKey);
  const mapping = moduleToSettingKey[mk] || {};
  const prefixKey = mapping.prefix;

  // Get prefix from settings, default to 3-char uppercase of module key
  const defaultPrefix = mk === 'service' ? 'SRV' : mk.toUpperCase().slice(0, 3);
  const prefix = await getSettingsValue(prefixKey, defaultPrefix);

  // Construct date part: YYMMDD
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(yyyy).slice(-2);
  const datePart = `${yy}${mm}${dd}`;

  // Use per-day counter key: module-YYMMDD (e.g., invoice-251201)
  const perDayCounterKey = `${mk}-${datePart}`;

  // Increment sequence for this day
  let seqDay;
  if (options.peek) {
    const docDay = await Counters.findOne({ _id: perDayCounterKey });
    seqDay = docDay ? docDay.seq : 0;
  } else {
    const docDay = await Counters.findOneAndUpdate(
      { _id: perDayCounterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // Sequence is 0-based for the first document of the day
    // docDay.seq will be 1 after first increment, so subtract 1 to get 0
    seqDay = (typeof docDay.seq === 'number') ? docDay.seq - 1 : 0;
  }

  if (seqDay < 0) seqDay = 0;

  // Always pad sequence to 2 digits (e.g., 00, 01, ..., 99, 100)
  const paddedSeq = String(seqDay).padStart(2, '0');

  // Final Format: PREFIX + YY + MM + DD + SEQUENCE
  // Example: QUO25120100
  return `${prefix}${datePart}${paddedSeq}`;
}

module.exports = { generateNextId };
