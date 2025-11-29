const express = require('express');
const router = express.Router();
const { Invoices, Quotations, Purchases } = require('../models');
const log = require('electron-log');          // preload‑side logger

router.get('/overview', async (req, res) => {
  try {
    /* ───────────────────────── Common date helpers ────────────────────────── */
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startNextMon = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    /* ────────────────────────── Simple document counts ────────────────────── */
    const totalProjects = await Invoices.countDocuments();
    const totalQuotations = await Quotations.countDocuments();

    // Count distinct projects with unpaid invoices (not invoice documents)
    const unpaidProjectsResult = await Invoices.aggregate([
      { $match: { payment_status: { $in: ['Unpaid', 'Partial'] } } },
      { $group: { _id: '$project_name' } }
    ]);
    const totalUnpaid = unpaidProjectsResult.length;

    /* ────────────────────── Monthly invoice earnings (Paid) ───────────────── */
    // Calculate total earned: Sum of payments received in current month only
    // This shows revenue collected this month
    const totalEarnedThisMonthResult = await Invoices.aggregate([
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'payments.payment_date': { $gte: startOfMonth, $lt: startNextMon },
        },
      },
      { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
    ]);
    
    // Use this month's earnings for dashboard
    const totalEarned = totalEarnedThisMonthResult.length > 0 ? totalEarnedThisMonthResult[0].total : 0;
    
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

    // Current month revenue (Payments received this month)
    const currentRevenueResult = await Invoices.aggregate([
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'payments.payment_date': { $gte: currentMonthStart, $lt: currentMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
    ]);
    const currentRevenue = currentRevenueResult.length > 0 ? currentRevenueResult[0].total : 0;

    // Previous month revenue
    const previousRevenueResult = await Invoices.aggregate([
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'payments.payment_date': { $gte: previousMonthStart, $lt: previousMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
    ]);
    const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0;

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
