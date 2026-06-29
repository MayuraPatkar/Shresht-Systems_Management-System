#!/usr/bin/env node
// Initialize Counters from existing documents in DB to avoid ID collisions
const connectDB = require('../src/config/database');
const { Settings, Quotations, Invoices, Purchases, service, wayBills, Counters } = require('../src/models');
const mongoose = require('mongoose');

async function getMaxNumericSuffix(docs, idField) {
  let max = 0;
  for (const doc of docs) {
    const id = doc[idField] || '';
    const m = id.match(/(\d+)$/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (!isNaN(val) && val > max) max = val;
    }
  }
  return max;
}

async function init() {
  await connectDB();
  console.log('Connected to DB for counters init.');

  const s = await Settings.findOne().lean();
  const numbering = (s && s.numbering) || {};

  // Map models
  const modules = [
    { key: 'invoice', model: Invoices, idField: 'invoice_id', start: numbering.invoice_start || 1 },
    { key: 'quotation', model: Quotations, idField: 'quotation_id', start: numbering.quotation_start || 1 },
    { key: 'purchaseOrder', model: Purchases, idField: 'purchase_order_id', start: numbering.purchase_start || 1 },
    { key: 'service', model: service, idField: 'service_id', start: numbering.service_start || 1 },
    { key: 'wayBill', model: wayBills, idField: 'waybill_id', start: numbering.waybill_start || 1 }
  ];

  for (const mod of modules) {
    const docs = await mod.model.find().select(mod.idField).lean();
    const maxSuffix = await getMaxNumericSuffix(docs, mod.idField);
    const seed = Math.max(maxSuffix + 1, mod.start);
    console.log(`Initializing counter for ${mod.key} to ${seed}`);
    await Counters.findOneAndUpdate({ _id: mod.key }, { $set: { seq: seed } }, { upsert: true });

    // Additionally, seed per-day counters for documents that use date-included IDs:
    // e.g., PREFIX-YYYYMMDD or PREFIX-YYYYMMDD-0001
    const perDayMap = {};
    const dateRegex = /-(\d{8})(?:-(\d+))?$/;
    for (const d of docs) {
      const id = d[mod.idField] || '';
      const m = id.match(dateRegex);
      if (m) {
        const datePart = m[1];
        const suffix = m[2] ? parseInt(m[2], 10) : 0; // if no suffix, treat as 0
        if (!perDayMap[datePart] || suffix > perDayMap[datePart]) {
          perDayMap[datePart] = suffix;
        }
      }
    }
    for (const [datePart, maxSuffixForDay] of Object.entries(perDayMap)) {
      const key = `${mod.key}-${datePart}`;
      const seqToSet = maxSuffixForDay + 1; // store as next seq to be incremented +1
      console.log(`Initializing per-day counter ${key} to ${seqToSet}`);
      await Counters.findOneAndUpdate({ _id: key }, { $set: { seq: seqToSet } }, { upsert: true });
    }
  }

  console.log('Counters initialization completed.');
  process.exit(0);
}

init().catch(err => {
  console.error('Error initializing counters:', err);
  process.exit(1);
});
