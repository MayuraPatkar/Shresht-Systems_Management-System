const express = require('express');
const router  = express.Router();
const { Invoices, Quotations, Purchases } = require('./database');
const log = require('electron-log');          // preload‑side logger

router.get('/overview', async (req, res) => {
  try {
    /* ───────────────────────── Common date helpers ────────────────────────── */
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startNextMon = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    /* ────────────────────────── Simple document counts ────────────────────── */
    const totalProjects   = await Invoices.countDocuments();
    const totalQuotations = await Quotations.countDocuments();
    const totalUnpaid     = await Invoices.countDocuments({ paymentStatus: 'Unpaid' });

    /* ────────────────────── Monthly invoice earnings (Paid) ───────────────── */
    const [{ total: totalEarned = 0 } = {}] = await Invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lt: startNextMon },
          paymentStatus: 'Paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    /* ─────────────────────── Monthly purchase expenditure ─────────────────── */
    const [{ total: totalExpenditure = 0 } = {}] = await Purchases.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lt: startNextMon },
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }, // field name → adapt if different
    ]);

    /* ────────────────────── Remaining service months (invoices) ───────────── */
    // Assuming each invoice has `service_month` > 0 while service is still pending.
    const [{ total: remainingServices = 0 } = {}] = await Invoices.aggregate([
      { $match: { service_month: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$service_month' } } },
    ]);

    /* ────────────────────────────── Response ──────────────────────────────── */
    res.json({
      totalProjects,
      totalQuotations,
      totalEarned,
      totalUnpaid,
      totalExpenditure,
      remainingServices,
    });
  } catch (err) {
    log.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
