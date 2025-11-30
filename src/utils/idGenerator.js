const { Counters, Settings } = require('../models');
const logger = require('../utils/logger');

/**
 * Map moduleKey to setting names used in Settings.numbering
 */
const moduleToSettingKey = {
  invoice: { prefix: 'invoice_prefix', start: 'invoice_start', pad: 'invoice_pad', includeDate: 'invoice_include_date' },
  quotation: { prefix: 'quotation_prefix', start: 'quotation_start', pad: 'quotation_pad', includeDate: 'quotation_include_date' },
  purchaseOrder: { prefix: 'purchase_prefix', start: 'purchase_start', pad: 'purchase_pad', includeDate: 'purchase_include_date' },
  wayBill: { prefix: 'waybill_prefix', start: 'waybill_start', pad: 'waybill_pad', includeDate: 'waybill_include_date' },
  service: { prefix: 'service_prefix', start: 'service_start', pad: 'service_pad', includeDate: 'service_include_date' }
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
  const startKey = mapping.start;

  const defaultPad = Number(await getSettingsValue(mapping.pad, 6));
  const defaultIncludeDate = Boolean(await getSettingsValue(mapping.includeDate, false));

  const prefix = await getSettingsValue(prefixKey, (mk === 'service' ? 'SRV' : mk.toUpperCase().slice(0,3)));
  const start = await getSettingsValue(startKey, 1);

  // If includeDate is true: return ID of form PREFIX-YYYYMMDD for the first document of the day.
  // For additional documents within the same day return PREFIX-YYYYMMDD-<padded_seq>.
  const includeDate = options.includeDate ?? defaultIncludeDate ?? false;
  if (includeDate) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;

    // Use per-day counter key so we can generate a suffix only if >1
    const perDayCounterKey = `${mk}-${datePart}`;
    const docDay = await Counters.findOneAndUpdate(
      { _id: perDayCounterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let seqDay = docDay.seq;
    // Use start if configured and seq < start
    if (start && Number.isInteger(start) && seqDay < start) {
      docDay.seq = start;
      await docDay.save();
      seqDay = docDay.seq;
    }

    const pad = Number(options.pad ?? defaultPad ?? 6);
    if (seqDay <= 1) {
      // First document of the day: return date-only id
      return `${prefix}-${datePart}`;
    }
    const paddedSuffix = String(seqDay).padStart(Number(pad), '0');
    return `${prefix}-${datePart}${paddedSuffix}`;
  }

  // Otherwise use an incrementing counter for unlimited sequential IDs
  const counterId = mk;
  const doc = await Counters.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let seq = doc.seq;

  // If seq is less than start, set to start
  if (start && Number.isInteger(start) && seq < start) {
    doc.seq = start;
    await doc.save();
    seq = doc.seq;
  }

  const pad = Number(options.pad ?? defaultPad ?? 6);
  const padded = String(seq).padStart(Number(pad), '0');
  return `${prefix}-${padded}`;
}

module.exports = { generateNextId };
