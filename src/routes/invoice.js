const express = require('express');
const router = express.Router();
const { Invoices, Stock, StockMovement } = require('../models');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Import ID generator functions
const { previewNextId, generateNextId } = require('../utils/idGenerator');

// Helper function to log stock movements
async function logStockMovement(itemName, quantityChange, movementType, referenceType, referenceId = null, notes = '') {
    try {
        await StockMovement.create({
            item_name: itemName,
            quantity_change: quantityChange,
            movement_type: movementType,
            reference_type: referenceType,
            reference_id: referenceId,
            notes: notes
        });
    } catch (error) {
        logger.error('Error logging stock movement:', error);
    }
}

/**
 * Route: Generate a Preview ID
 * Description: returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req, res) => {
    try {
        const invoice_id = await previewNextId('invoice');
        return res.status(200).json({ invoice_id });
    } catch (err) {
        logger.error('Error generating invoice preview', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate invoice id' });
    }
});

// Test and List routes
router.get("/test", (req, res) => {
    res.status(200).json({ message: "Invoice routes are working!" });
});

router.get("/get-all", async (req, res) => {
    try {
        const invoices = await Invoices.find();
        return res.status(200).json({ invoices });
    } catch (error) {
        logger.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/all", async (req, res) => {
    try {
        const invoices = await Invoices.find().sort({ createdAt: -1 });
        return res.status(200).json(invoices);
    } catch (error) {
        logger.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Route: Save or Update Invoice
 * Description: Creates a new Invoice (generating a fresh ID) or updates an existing one.
 * Handles complex stock deduction logic based on 'original' vs 'duplicate' status.
 */
router.post("/save-invoice", async (req, res) => {
    try {
        const {
            type,
            invoiceId = '', // Could be a preview ID (new) or existing ID (update)
            invoiceDate = '',
            projectName,
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
            serviceMonth = 0,
            margin = 0,
            wayBillNumber = '',
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            consigneeName = '',
            consigneeAddress = '',
            items = [],
            non_items = [],
            totalAmountOriginal = 0,
            totalAmountDuplicate = 0,
            totalTaxOriginal = 0,
            totalTaxDuplicate = 0,
            declaration = '',
            termsAndConditions = ''
        } = req.body;

        let total_amount_original = totalAmountOriginal;
        let total_amount_duplicate = totalAmountDuplicate;
        let total_tax_original = totalTaxOriginal;
        let total_tax_duplicate = totalTaxDuplicate;

        if (!projectName) {
            return res.status(400).json({ message: 'Missing required fields: projectName.' });
        }

        // Attempt to find an existing invoice
        let existingInvoice = null;
        if (invoiceId) {
            existingInvoice = await Invoices.findOne({ invoice_id: invoiceId });
        }

        let items_original = existingInvoice?.items_original || [];
        let items_duplicate = existingInvoice?.items_duplicate || [];
        let non_items_original = existingInvoice?.non_items_original || [];
        let non_items_duplicate = existingInvoice?.non_items_duplicate || [];

        // Handle item assignment based on type
        if (type === 'original') {
            items_original = items;
            non_items_original = non_items;
        } else if (type === 'duplicate') {
            items_duplicate = items;
            non_items_duplicate = non_items;
        } else {
            return res.status(400).json({ message: 'type must be "original" or "duplicate"' });
        }

        // Handle financial totals inheritance
        if (existingInvoice) {
            if (totalAmountOriginal == 0 && totalTaxOriginal == 0) {
                total_amount_original = existingInvoice.total_amount_original;
                total_tax_original = existingInvoice.total_tax_original;
            }
            if (totalAmountDuplicate == 0 && totalTaxDuplicate == 0) {
                total_amount_duplicate = existingInvoice.total_amount_duplicate;
                total_tax_duplicate = existingInvoice.total_tax_duplicate;
            }
        }

        if (existingInvoice) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING INVOICE
            // ---------------------------------------------------------

            // Stock Logic: Only update stock if we're changing the 'original' copy
            if (type === 'original') {
                // Revert previous items
                for (let prev of existingInvoice.items_original) {
                    await Stock.updateOne({ item_name: prev.description }, { $inc: { quantity: prev.quantity } });
                    await logStockMovement(
                        prev.description,
                        prev.quantity,
                        'in',
                        'invoice',
                        invoiceId,
                        `Reverted for invoice update: ${invoiceId}`
                    );
                }
                // Deduct new items
                for (let cur of items_original) {
                    await Stock.updateOne({ item_name: cur.description }, { $inc: { quantity: -cur.quantity } });
                    await logStockMovement(
                        cur.description,
                        cur.quantity,
                        'out',
                        'invoice',
                        invoiceId,
                        `Deducted for invoice update: ${invoiceId}`
                    );
                }
            }

            // Update fields
            Object.assign(existingInvoice, {
                project_name: projectName,
                invoice_date: invoiceDate,
                po_number: poNumber,
                po_date: poDate,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_month: serviceMonth,
                margin: margin,
                Waybill_id: wayBillNumber,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                consignee_name: consigneeName,
                consignee_address: consigneeAddress,
                items_original: items_original,
                items_duplicate: items_duplicate,
                non_items_original: non_items_original,
                non_items_duplicate: non_items_duplicate,
                total_amount_original: total_amount_original,
                total_amount_duplicate: total_amount_duplicate,
                total_tax_original: total_tax_original,
                total_tax_duplicate: total_tax_duplicate,
                declaration: declaration,
                termsAndConditions: termsAndConditions
            });

            const updatedInvoice = await existingInvoice.save();
            return res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });

        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW INVOICE
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('invoice');

            // Stock Logic: Deduct stock for new invoice
            if (type === 'original') {
                for (let item of items_original) {
                    const stockItem = await Stock.findOne({ item_name: item.description });
                    if (stockItem) {
                        stockItem.quantity -= item.quantity;
                        await stockItem.save();
                        await logStockMovement(
                            item.description,
                            item.quantity,
                            'out',
                            'invoice',
                            newId,
                            `Deducted for new invoice: ${newId}`
                        );
                    }
                }
            }

            const invoice = new Invoices({
                invoice_id: newId, // Use fresh ID
                invoice_date: invoiceDate || new Date(),
                project_name: projectName,
                po_number: poNumber,
                po_date: poDate,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_month: serviceMonth,
                margin: margin,
                Waybill_id: wayBillNumber,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                consignee_name: consigneeName,
                consignee_address: consigneeAddress,
                items_original: items,
                items_duplicate: items,
                non_items_original: non_items,
                non_items_duplicate: non_items,
                total_amount_original: total_amount_original,
                total_amount_duplicate: total_amount_duplicate,
                total_tax_original: total_tax_original,
                total_tax_duplicate: total_tax_duplicate,
                declaration: declaration,
                termsAndConditions: termsAndConditions
            });

            const savedInvoice = await invoice.save();
            return res.status(201).json({
                message: 'Invoice saved successfully',
                invoice: savedInvoice,
                invoice_id: newId // Return the final ID
            });
        }
    } catch (error) {
        logger.error('Error saving invoice:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent invoices
router.get("/recent-invoices", async (req, res) => {
    try {
        const recentInvoices = await Invoices.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name invoice_id customer_name customer_phone customer_address payment_status total_amount_duplicate total_paid_amount invoice_date createdAt");

        res.status(200).json({
            message: "Recent invoices retrieved successfully",
            invoices: recentInvoices,
        });
    } catch (error) {
        logger.error("Error retrieving recent invoices:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get count of unpaid invoices
router.get('/unpaid-count', async (req, res) => {
    try {
        const count = await Invoices.countDocuments({
            payment_status: { $in: ['Unpaid', 'Partial'] }
        });

        res.status(200).json({ count });
    } catch (error) {
        logger.error("Error getting unpaid count:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to get a specific invoice by ID
router.get("/:invoice_id", async (req, res) => {
    try {
        const { invoice_id } = req.params;
        const invoice = await Invoices.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json({ invoice });
    } catch (error) {
        logger.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.post("/save-payment", async (req, res) => {
    try {
        const {
            invoiceId,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Compute total due: prefer duplicate total, fallback to computed sum of items/non-items
        const computeTotalDue = (inv) => {
            const dup = Number(inv.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
            const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
            let subtotal = 0;
            let tax = 0;
            for (const it of items) {
                const qty = Number(it.quantity || 0);
                const unit = Number(it.unit_price || 0);
                const rate = Number(it.rate || 0);
                const taxable = qty * unit;
                subtotal += taxable;
                tax += taxable * (rate / 100);
            }
            for (const nit of nonItems) {
                const price = Number(nit.price || 0);
                const rate = Number(nit.rate || 0);
                subtotal += price;
                tax += price * (rate / 100);
            }
            return Number((subtotal + tax).toFixed(2));
        };

        const totalDue = computeTotalDue(invoice);
        const currentPaid = (invoice.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        
        // Validate payment amount
        if (currentPaid + Number(paidAmount) > totalDue + 0.01) { // Allow small float margin
             return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - currentPaid).toFixed(2)})` });
        }

        // Add the new payment
        invoice.payments.push({
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        });

        // Recalculate total_paid_amount from all payments to avoid drift
        invoice.total_paid_amount = (invoice.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        // Auto-determine payment status based on recalculated totals
        if (totalDue > 0 && invoice.total_paid_amount >= totalDue) {
            invoice.payment_status = 'Paid';
        } else if (invoice.total_paid_amount > 0) {
            invoice.payment_status = 'Partial';
        } else {
            invoice.payment_status = 'Unpaid';
        }

        // Allow model hook if present
        if (typeof invoice.updatePaymentStatus === 'function') {
            invoice.updatePaymentStatus();
        }

        await invoice.save();

        res.status(200).json({ message: "Payment saved successfully." });
    } catch (error) {
        console.error("Error saving payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Update existing payment
router.put("/update-payment", async (req, res) => {
    try {
        const {
            invoiceId,
            paymentIndex,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (!invoice.payments || paymentIndex < 0 || paymentIndex >= invoice.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Compute total due
        const computeTotalDue = (inv) => {
            const dup = Number(inv.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
            const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
            let subtotal = 0;
            let tax = 0;
            for (const it of items) {
                const qty = Number(it.quantity || 0);
                const unit = Number(it.unit_price || 0);
                const rate = Number(it.rate || 0);
                const taxable = qty * unit;
                subtotal += taxable;
                tax += taxable * (rate / 100);
            }
            for (const nit of nonItems) {
                const price = Number(nit.price || 0);
                const rate = Number(nit.rate || 0);
                subtotal += price;
                tax += price * (rate / 100);
            }
            return Number((subtotal + tax).toFixed(2));
        };

        const totalDue = computeTotalDue(invoice);
        
        // Calculate paid amount excluding the one being updated
        const otherPaymentsTotal = (invoice.payments || []).reduce((sum, p, idx) => {
            if (idx === Number(paymentIndex)) return sum;
            return sum + Number(p.paid_amount || 0);
        }, 0);
        
        if (otherPaymentsTotal + Number(paidAmount) > totalDue + 0.01) {
             return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - otherPaymentsTotal).toFixed(2)})` });
        }

        // Update the payment at the specified index
        invoice.payments[paymentIndex] = {
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        };

        // Recalculate total_paid_amount
        invoice.total_paid_amount = (invoice.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        if (totalDue > 0 && invoice.total_paid_amount >= totalDue) {
            invoice.payment_status = 'Paid';
        } else if (invoice.total_paid_amount > 0) {
            invoice.payment_status = 'Partial';
        } else {
            invoice.payment_status = 'Unpaid';
        }

        if (typeof invoice.updatePaymentStatus === 'function') {
            invoice.updatePaymentStatus();
        }

        await invoice.save();

        res.status(200).json({ message: "Payment updated successfully." });
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Delete a payment
router.delete("/delete-payment/:invoiceId/:paymentIndex", async (req, res) => {
    try {
        const { invoiceId, paymentIndex } = req.params;
        const index = parseInt(paymentIndex, 10);

        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (!invoice.payments || index < 0 || index >= invoice.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Remove the payment at the specified index
        invoice.payments.splice(index, 1);

        // Recalculate total_paid_amount
        invoice.total_paid_amount = (invoice.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        // Recalculate payment status
        const computeTotalDue = (inv) => {
            const dup = Number(inv.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
            const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
            let subtotal = 0;
            let tax = 0;
            for (const it of items) {
                const qty = Number(it.quantity || 0);
                const unit = Number(it.unit_price || 0);
                const rate = Number(it.rate || 0);
                const taxable = qty * unit;
                subtotal += taxable;
                tax += taxable * (rate / 100);
            }
            for (const nit of nonItems) {
                const price = Number(nit.price || 0);
                const rate = Number(nit.rate || 0);
                subtotal += price;
                tax += price * (rate / 100);
            }
            return Number((subtotal + tax).toFixed(2));
        };

        const totalDue = computeTotalDue(invoice);

        if (totalDue > 0 && invoice.total_paid_amount >= totalDue) {
            invoice.payment_status = 'Paid';
        } else if (invoice.total_paid_amount > 0) {
            invoice.payment_status = 'Partial';
        } else {
            invoice.payment_status = 'Unpaid';
        }

        if (typeof invoice.updatePaymentStatus === 'function') {
            invoice.updatePaymentStatus();
        }

        await invoice.save();

        res.status(200).json({ message: "Payment deleted successfully." });
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Search invoice
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    let invoices = [];
    try {
        if (query.toLowerCase() === 'unpaid') {
            invoices = await Invoices.find({
                payment_status: { $regex: 'unpaid', $options: 'i' }
            });
        } else {
            invoices = await Invoices.find({
                $or: [
                    { invoice_id: { $regex: query, $options: 'i' } },
                    { project_name: { $regex: query, $options: 'i' } },
                    { customer_name: { $regex: query, $options: 'i' } },
                    { customer_phone: { $regex: query, $options: 'i' } },
                    { customer_email: { $regex: query, $options: 'i' } },
                ]
            });
        }

        if (invoices.length === 0) {
            return res.status(404).send('No invoice found.');
        } else {
            return res.status(200).json({ invoices });
        }
    } catch (err) {
        logger.log(err);
        return res.status(500).send('Failed to fetch invoice.');
    }
});

// Route to delete a invoice
router.delete("/:invoiceId", async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: 'invoice not found' });
        }

        // Reverse stock changes (add back the quantity deducted)
        if (invoice.items_original && invoice.items_original.length > 0) {
            for (const item of invoice.items_original) {
                if (!item.description) continue;
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    stockItem.quantity = (stockItem.quantity || 0) + Number(item.quantity || 0);
                    await stockItem.save();
                }
            }
        }

        // Delete associated stock movements
        await StockMovement.deleteMany({ 
            reference_type: 'invoice', 
            reference_id: invoiceId 
        });

        await Invoices.deleteOne({ invoice_id: invoiceId });
        res.status(200).json({ message: 'invoice deleted successfully' });
    } catch (error) {
        logger.error("Error deleting invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Close service - set service_status to Closed
router.post("/close-service/:invoiceId", async (req, res) => {
    try {
        const { invoiceId } = req.params;
        
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Set service_status to Closed
        invoice.service_status = 'Closed';
        await invoice.save();

        logger.info(`Service closed for invoice ${invoiceId}`);
        res.status(200).json({ 
            message: 'Service closed successfully. No further services will be scheduled.', 
            invoice 
        });
    } catch (error) {
        logger.error("Error closing service:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = router;