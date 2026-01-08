const express = require('express');
const router = express.Router();
const { Invoices, Quotations, Purchases } = require('../models');
const logger = require('../utils/logger');          // custom logger

router.get('/overview', async (req, res) => {
  try {
    /* ───────────────────────── Common date helpers ────────────────────────── */
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startNextMon = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    /* ────────────────────────── Simple document counts ────────────────────── */
    const totalProjects = await Invoices.countDocuments();
    const totalQuotations = await Quotations.countDocuments();

    // Count total unpaid invoices (not distinct projects)
    const totalUnpaid = await Invoices.countDocuments({
      payment_status: { $in: ['Unpaid', 'Partial'] }
    });

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

    /* ────────────────────── Pending services (invoices due for service) ───────────── */
    // Count invoices where service is due now (same logic as /service/get-service)
    // Service is due when: current date >= invoice_date + service_month months
    const invoicesWithService = await Invoices.find({
      $or: [
        { service_status: 'Active' },
        { service_status: { $exists: false }, service_after_months: { $gt: 0 } }
      ]
    }).lean();
    const remainingServices = invoicesWithService.filter(invoice => {
      const invoiceDate = invoice.invoice_date || invoice.createdAt;
      if (!invoiceDate || !invoice.service_after_months) return false;

      const baseDate = new Date(invoiceDate);
      const targetDate = new Date(baseDate);
      targetDate.setMonth(targetDate.getMonth() + invoice.service_after_months);

      return now >= targetDate;
    }).length;

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
    logger.error('Error fetching analytics:', err);
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
    logger.error('Error fetching comparison analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
