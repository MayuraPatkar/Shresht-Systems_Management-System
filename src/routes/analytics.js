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

    /* ─────────────── Parallel execution of all queries for better performance ───────────── */
    const [
      totalProjects,
      totalQuotations,
      unpaidProjectsResult,
      totalEarnedAllTime,
      totalExpenditure,
      remainingServices
    ] = await Promise.all([
      // Simple document counts
      Invoices.countDocuments(),
      Quotations.countDocuments(),
      
      // Count distinct projects with unpaid invoices
      Invoices.aggregate([
        { $match: { payment_status: { $in: ['Unpaid', 'Partial'] } } },
        { $group: { _id: '$project_name' } }
      ]),
      
      // Calculate total earned: Sum of total_paid_amount for all invoices
      Invoices.aggregate([
        { $group: { _id: null, total: { $sum: '$total_paid_amount' } } },
      ]),
      
      // Monthly purchase expenditure
      Purchases.aggregate([
        {
          $match: {
            $or: [
              { purchase_date: { $gte: startOfMonth, $lt: startNextMon } },
              { createdAt: { $gte: startOfMonth, $lt: startNextMon } },
            ],
          },
        },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
      
      // Count invoices with service_month > 0 (active services)
      Invoices.countDocuments({ service_month: { $gt: 0 } })
    ]);
    
    const totalUnpaid = unpaidProjectsResult.length;
    const totalEarned = totalEarnedAllTime.length > 0 ? totalEarnedAllTime[0].total : 0;
    const totalExpenditureValue = totalExpenditure.length > 0 ? totalExpenditure[0].total : 0;

    /* ────────────────────────────── Response ──────────────────────────────── */
    res.json({
      totalProjects,
      totalQuotations,
      totalEarned,
      totalUnpaid,
      totalExpenditure: totalExpenditureValue,
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

    // Execute all queries in parallel for better performance
    const [
      currentRevenueResult,
      previousRevenueResult,
      currentProjects,
      previousProjects,
      currentQuotations,
      previousQuotations
    ] = await Promise.all([
      // Current month revenue
      Invoices.aggregate([
        { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'payments.payment_date': { $gte: currentMonthStart, $lt: currentMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
      ]),
      
      // Previous month revenue
      Invoices.aggregate([
        { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'payments.payment_date': { $gte: previousMonthStart, $lt: previousMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
      ]),
      
      // Current month projects
      Invoices.countDocuments({
        createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
      }),
      
      // Previous month projects
      Invoices.countDocuments({
        createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
      }),
      
      // Current month quotations
      Quotations.countDocuments({
        createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
      }),
      
      // Previous month quotations
      Quotations.countDocuments({
        createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
      })
    ]);

    const currentRevenue = currentRevenueResult.length > 0 ? currentRevenueResult[0].total : 0;
    const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0;

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
