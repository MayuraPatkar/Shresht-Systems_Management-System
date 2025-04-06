const express = require('express');
const router = express.Router();
const { Invoices, Quotations } = require('./database');

router.get('/overview', async (req, res) => {
    try {
        const totalProjects = await Invoices.countDocuments();
        const totalQuotations = await Quotations.countDocuments();

        // Sum of earnings for current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyEarnings = await Invoices.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear, currentMonth, 1),
                        $lt: new Date(currentYear, currentMonth + 1, 1)
                    },
                    paymentStatus: "Paid"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" },
                }
            }
        ]);

        // If no invoices for the current month, set total to 0
        const totalEarned = monthlyEarnings[0]?.total || 0;

        const totalUnpaid = await Invoices.countDocuments({ paymentStatus: "Unpaid" });

        res.json({
            totalProjects,
            totalQuotations,
            totalEarned,
            totalUnpaid
        });
    } catch (err) {
        console.error("Error fetching analytics:", err);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;