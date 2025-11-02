const express = require('express');
const router  = express.Router();
const { Invoices, Quotations, Purchases } = require('../models');
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
    const totalUnpaid     = await Invoices.countDocuments({ payment_status: 'Unpaid' });

    /* ────────────────────── Monthly invoice earnings (Paid) ───────────────── */
    const [{ total: totalEarned = 0 } = {}] = await Invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lt: startNextMon },
          payment_status: 'Paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount_original' } } },
    ]);

    /* ─────────────────────── Monthly purchase expenditure ─────────────────── */
    // Use $or to match either purchase_date or createdAt within current month
    const [{ total: totalExpenditure = 0 } = {}] = await Purchases.aggregate([
      {
        $match: {
          $or: [
            { purchase_date: { $gte: startOfMonth, $lt: startNextMon } },
            { createdAt: { $gte: startOfMonth, $lt: startNextMon } },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]);

    /* ────────────────────── Remaining service months (invoices) ───────────── */
    // Count invoices with service_month > 0 (active services)
    const remainingServices = await Invoices.countDocuments({ 
      service_month: { $gt: 0 } 
    });

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

// New endpoint for month-over-month comparison
router.get('/comparison', async (req, res) => {
  try {
    const now = new Date();
    
    // Current month dates
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Previous month dates
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current month revenue (Paid invoices)
    const [{ total: currentRevenue = 0 } = {}] = await Invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
          payment_status: 'Paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount_original' } } },
    ]);

    // Previous month revenue
    const [{ total: previousRevenue = 0 } = {}] = await Invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
          payment_status: 'Paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount_original' } } },
    ]);

    // Current month projects
    const currentProjects = await Invoices.countDocuments({
      createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
    });

    // Previous month projects
    const previousProjects = await Invoices.countDocuments({
      createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
    });

    // Current month quotations
    const currentQuotations = await Quotations.countDocuments({
      createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
    });

    // Previous month quotations
    const previousQuotations = await Quotations.countDocuments({
      createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
    });

    res.json({
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
      },
      projects: {
        current: currentProjects,
        previous: previousProjects,
      },
      quotations: {
        current: currentQuotations,
        previous: previousQuotations,
      },
    });
  } catch (err) {
    log.error('Error fetching comparison analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
