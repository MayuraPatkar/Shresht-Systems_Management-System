import { Router, Request, Response } from 'express';
import { InvoiceModel, ItemModel, StockMovementModel } from '../models';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { previewNextId, generateNextId, syncCounterIfNeeded } from '../utils/idGenerator';

const router: Router = Router();

// Helper function to log stock movements
async function logStockMovement(
    itemId: any,
    itemName: string,
    quantityChange: number,
    movementType: string,
    referenceType: string,
    referenceId: string | null = null,
    notes: string = ''
): Promise<void> {
    try {
        await StockMovementModel.create({
            item_id: itemId,
            item_name: itemName,
            quantity_change: quantityChange,
            movement_type: movementType,
            reference_type: referenceType,
            reference_id: referenceId,
            notes: notes
        } as any);
    } catch (error: unknown) {
        logger.error('Error logging stock movement:', error);
    }
}

/**
 * Route: Generate a Preview ID
 * Description: returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req: Request, res: Response) => {
    try {
        const invoice_id = await previewNextId('invoice');
        return res.status(200).json({ invoice_id });
    } catch (err: unknown) {
        logger.error('Error generating invoice preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate invoice id' });
    }
});

// Test and List routes
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json({ message: "Invoice routes are working!" });
});

router.get("/get-all", async (req: Request, res: Response) => {
    try {
        const invoices = await InvoiceModel.find();
        return res.status(200).json({ invoices });
    } catch (error: unknown) {
        logger.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/all", async (req: Request, res: Response) => {
    try {
        const invoices = await InvoiceModel.find().sort({ createdAt: -1 });
        return res.status(200).json(invoices);
    } catch (error: unknown) {
        logger.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Compute total due helper
function computeTotalDue(inv: any): number {
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
}

/**
 * Route: Save or Update Invoice
 * Description: Creates a new Invoice (generating a fresh ID) or updates an existing one.
 * Handles complex stock deduction logic based on 'original' vs 'duplicate' status.
 */
router.post("/save-invoice", async (req: Request, res: Response) => {
    try {
        const {
            type,
            invoiceId = '',
            invoiceDate = '',
            projectName,
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
            quotationId = '',
            serviceAfterMonths = 0,
            margin = 0,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            buyerGSTIN = '',
            consigneeName = '',
            consigneeAddress = '',
            items = [] as any[],
            non_items = [] as any[],
            totalAmountOriginal = 0,
            totalAmountDuplicate = 0,
            totalTaxOriginal = 0,
            totalTaxDuplicate = 0,
            declaration = '',
            termsAndConditions = '',
            isCustomId = false
        } = req.body;

        let total_amount_original = totalAmountOriginal;
        let total_amount_duplicate = totalAmountDuplicate;
        let total_tax_original = totalTaxOriginal;
        let total_tax_duplicate = totalTaxDuplicate;

        if (!projectName) {
            return res.status(400).json({ message: 'Missing required fields: projectName.' });
        }

        // Attempt to find an existing invoice
        let existingInvoice: any = null;
        if (invoiceId) {
            existingInvoice = await InvoiceModel.findOne({ invoice_id: invoiceId });
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
                // A. Revert previous items (Add back to stock)
                for (const prev of existingInvoice.items_original) {
                    if (!prev.description) continue;
                    const itemName = prev.description.trim();

                    let stockItem = await ItemModel.findOne({ item_name: itemName });
                    if (!stockItem) {
                        stockItem = await ItemModel.findOne({ item_name: { $regex: new RegExp(`^${itemName}$`, 'i') } });
                    }

                    if (stockItem) {
                        (stockItem as any).quantity = ((stockItem as any).quantity || 0) + Number(prev.quantity || 0);
                        await stockItem.save();
                    }
                }

                // B. Deduct new items (Remove from stock)
                for (const cur of items_original) {
                    if (!cur.description) continue;
                    const itemName = cur.description.trim();

                    let stockItem = await ItemModel.findOne({ item_name: itemName });
                    if (!stockItem) {
                        stockItem = await ItemModel.findOne({ item_name: { $regex: new RegExp(`^${itemName}$`, 'i') } });
                    }

                    if (stockItem) {
                        (stockItem as any).quantity = ((stockItem as any).quantity || 0) - Number(cur.quantity || 0);
                        await stockItem.save();
                    }
                }

                // Sync Stock Movements
                const currentInvoiceId = invoiceId || existingInvoice.invoice_id;

                const existingMovements = await StockMovementModel.find({
                    reference_type: 'invoice',
                    reference_id: currentInvoiceId
                });

                const movementPool = [...existingMovements];

                for (const cur of items_original) {
                    if (!cur.description) continue;
                    const itemName = cur.description.trim();
                    const qty = Number(cur.quantity || 0);

                    let stockItem = await ItemModel.findOne({ item_name: itemName });
                    if (!stockItem) {
                        stockItem = await ItemModel.findOne({ item_name: { $regex: new RegExp(`^${itemName}$`, 'i') } });
                    }
                    const finalItemName = stockItem ? stockItem.item_name : itemName;

                    const matchIndex = movementPool.findIndex((m: any) =>
                        m.item_name === finalItemName ||
                        m.item_name.toLowerCase() === finalItemName.toLowerCase()
                    );

                    if (matchIndex !== -1) {
                        const movement = movementPool[matchIndex] as any;
                        movement.quantity_change = qty;
                        await movement.save();
                        movementPool.splice(matchIndex, 1);
                    } else {
                        if (stockItem) {
                            await logStockMovement(
                                stockItem._id,
                                finalItemName,
                                qty,
                                'out',
                                'invoice',
                                currentInvoiceId,
                                `Invoice Generated`
                            );
                        }
                    }
                }

                // Delete any remaining movements in the pool
                for (const unusedMovement of movementPool) {
                    await StockMovementModel.deleteOne({ _id: unusedMovement._id });
                }
            }

            // Calculate next service date
            let nextServiceDate: Date | undefined = undefined;
            if (Number(serviceAfterMonths) > 0) {
                const baseDate = new Date(invoiceDate || new Date());
                const targetDate = new Date(baseDate);
                targetDate.setMonth(targetDate.getMonth() + Number(serviceAfterMonths));
                nextServiceDate = targetDate;
            }

            // Update fields
            Object.assign(existingInvoice, {
                project_name: projectName,
                invoice_date: invoiceDate,
                po_number: poNumber,
                po_date: poDate,
                quotation_id: quotationId,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_after_months: serviceAfterMonths,
                next_service_date: nextServiceDate,
                service_status: (Number(serviceAfterMonths) > 0) ? 'Active' : existingInvoice.service_status,
                margin: margin,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                customer_GSTIN: buyerGSTIN,
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

            let newId: string;
            if (isCustomId && invoiceId && invoiceId.trim()) {
                const existingCustom = await InvoiceModel.findOne({ invoice_id: invoiceId.trim() });
                if (existingCustom) {
                    return res.status(400).json({ message: `Invoice ID "${invoiceId}" already exists. Please use a different ID.` });
                }
                newId = invoiceId.trim();
            } else {
                newId = await generateNextId('invoice');
            }

            // Stock Logic: Deduct stock for new invoice
            if (type === 'original') {
                for (const item of items_original) {
                    if (!item.description) continue;
                    const itemName = item.description.trim();

                    let stockItem = await ItemModel.findOne({ item_name: itemName });
                    if (!stockItem) {
                        stockItem = await ItemModel.findOne({ item_name: { $regex: new RegExp(`^${itemName}$`, 'i') } });
                    }

                    if (stockItem) {
                        (stockItem as any).quantity = ((stockItem as any).quantity || 0) - Number(item.quantity || 0);
                        await stockItem.save();

                        await logStockMovement(
                            stockItem._id,
                            stockItem.item_name,
                            item.quantity,
                            'out',
                            'invoice',
                            newId,
                            `Deducted for new invoice: ${newId}`
                        );
                    }
                }
            }

            // Calculate next service date for new invoice
            let nextServiceDate: Date | undefined = undefined;
            if (Number(serviceAfterMonths) > 0) {
                const baseDate = new Date(invoiceDate || new Date());
                const targetDate = new Date(baseDate);
                targetDate.setMonth(targetDate.getMonth() + Number(serviceAfterMonths));
                nextServiceDate = targetDate;
            }

            const invoice = new InvoiceModel({
                invoice_id: newId,
                invoice_date: invoiceDate || new Date(),
                project_name: projectName,
                po_number: poNumber,
                po_date: poDate,
                quotation_id: quotationId,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_after_months: serviceAfterMonths,
                next_service_date: nextServiceDate,
                service_status: (Number(serviceAfterMonths) > 0) ? 'Active' : 'Closed',
                margin: margin,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                customer_GSTIN: buyerGSTIN,
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

            if (isCustomId && newId) {
                await syncCounterIfNeeded('invoice', newId);
            }

            return res.status(201).json({
                message: 'Invoice saved successfully',
                invoice: savedInvoice,
                invoice_id: newId
            });
        }
    } catch (error: unknown) {
        logger.error('Error saving invoice:', error);
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
});

// Route to get the 10 most recent invoices
router.get("/recent-invoices", async (req: Request, res: Response) => {
    try {
        const recentInvoices = await InvoiceModel.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name invoice_id customer_name customer_phone customer_address payment_status total_amount_duplicate total_paid_amount invoice_date createdAt");

        res.status(200).json({
            message: "Recent invoices retrieved successfully",
            invoices: recentInvoices,
        });
    } catch (error: unknown) {
        logger.error("Error retrieving recent invoices:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Get count of unpaid invoices
router.get('/unpaid-count', async (req: Request, res: Response) => {
    try {
        const count = await InvoiceModel.countDocuments({
            payment_status: { $in: ['Unpaid', 'Partial'] }
        });

        res.status(200).json({ count });
    } catch (error: unknown) {
        logger.error("Error getting unpaid count:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to get a specific invoice by ID
router.get("/:invoice_id", async (req: Request, res: Response) => {
    try {
        const { invoice_id } = req.params;
        const invoice = await InvoiceModel.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json({ invoice });
    } catch (error: unknown) {
        logger.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.post("/save-payment", async (req: Request, res: Response) => {
    try {
        const {
            invoiceId,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        const totalDue = computeTotalDue(invoice);
        const currentPaid = (invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

        if (currentPaid + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - currentPaid).toFixed(2)})` });
        }

        invoice.payments.push({
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        });

        invoice.total_paid_amount = (invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

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

        res.status(200).json({ message: "Payment saved successfully." });
    } catch (error: unknown) {
        logger.error("Error saving payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Update existing payment
router.put("/update-payment", async (req: Request, res: Response) => {
    try {
        const {
            invoiceId,
            paymentIndex,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (!invoice.payments || paymentIndex < 0 || paymentIndex >= invoice.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const totalDue = computeTotalDue(invoice);

        const otherPaymentsTotal = (invoice.payments || []).reduce((sum: number, p: any, idx: number) => {
            if (idx === Number(paymentIndex)) return sum;
            return sum + Number(p.paid_amount || 0);
        }, 0);

        if (otherPaymentsTotal + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - otherPaymentsTotal).toFixed(2)})` });
        }

        invoice.payments[paymentIndex] = {
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        };

        invoice.total_paid_amount = (invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

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
    } catch (error: unknown) {
        logger.error("Error updating payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Delete a payment
router.delete("/delete-payment/:invoiceId/:paymentIndex", async (req: Request, res: Response) => {
    try {
        const { invoiceId, paymentIndex } = req.params;
        const index = parseInt(paymentIndex as string, 10);

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (!invoice.payments || index < 0 || index >= invoice.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        invoice.payments.splice(index, 1);

        invoice.total_paid_amount = (invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

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
    } catch (error: unknown) {
        logger.error("Error deleting payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Search invoice
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    const searchQuery = Array.isArray(query) ? query[0] : query;
    if (!searchQuery) return res.status(400).send('Query parameter is required.');

    let invoices: any[] = [];
    try {
        if (searchQuery.toLowerCase() === 'unpaid') {
            invoices = await InvoiceModel.find({
                payment_status: { $regex: 'unpaid', $options: 'i' }
            });
        } else {
            invoices = await InvoiceModel.find({
                $or: [
                    { invoice_id: { $regex: searchQuery, $options: 'i' } },
                    { project_name: { $regex: searchQuery, $options: 'i' } },
                    { customer_name: { $regex: searchQuery, $options: 'i' } },
                    { customer_phone: { $regex: searchQuery, $options: 'i' } },
                    { customer_email: { $regex: searchQuery, $options: 'i' } },
                ]
            } as any);
        }

        if (invoices.length === 0) {
            return res.status(404).send('No invoice found.');
        } else {
            return res.status(200).json({ invoices });
        }
    } catch (err: unknown) {
        logger.error(err);
        return res.status(500).send('Failed to fetch invoice.');
    }
});

// Route to delete an invoice
router.delete("/:invoiceId", async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            return res.status(404).json({ message: 'invoice not found' });
        }

        // Reverse stock changes (add back the quantity deducted)
        if (invoice.items_original && invoice.items_original.length > 0) {
            for (const item of invoice.items_original) {
                if (!item.description) continue;
                const stockItem = await ItemModel.findOne({ item_name: item.description });
                if (stockItem) {
                    (stockItem as any).quantity = ((stockItem as any).quantity || 0) + Number(item.quantity || 0);
                    await stockItem.save();
                }
            }
        }

        // Delete associated stock movements
        await StockMovementModel.deleteMany({
            reference_type: 'invoice',
            reference_id: invoiceId
        });

        await InvoiceModel.deleteOne({ invoice_id: invoiceId });
        res.status(200).json({ message: 'invoice deleted successfully' });
    } catch (error: unknown) {
        logger.error("Error deleting invoice:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Close service - set service_status to Closed
router.post("/close-service/:invoiceId", async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        invoice.service_status = 'Closed';
        await invoice.save();

        res.status(200).json({
            message: 'Service closed successfully. No further services will be scheduled.',
            invoice
        });
    } catch (error: unknown) {
        logger.error("Error closing service:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

export default router;
