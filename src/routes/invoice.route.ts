import { Router, Request, Response } from 'express';
import { InvoiceModel, ItemModel, StockMovementModel, InvoiceStatus } from '../models';
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
            buyerCustomerId = '',
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
            status,
        } = req.body;

        if (!projectName) {
            return res.status(400).json({ message: 'Missing required fields: projectName.' });
        }

        // Map items to schema structures
        const mappedItems = items.map((item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const discPercent = Number(item.discount_percent) || 0;
            const taxableValue = qty * price * (1 - discPercent / 100);
            const gstRate = Number(item.rate || item.gst_rate) || 0;
            const total = taxableValue * (1 + gstRate / 100);

            return {
                item_id: item.item_id || item._id || undefined,
                description: item.description || '',
                hsn_sac: item.HSN_SAC || item.hsn_sac || '',
                unit: item.unit || 'PCS',
                quantity: qty,
                unit_price: price,
                taxable_value: Number(taxableValue.toFixed(2)),
                gst_rate: gstRate,
                discount_percent: discPercent,
                total: Number(total.toFixed(2))
            };
        });

        // Compute other charges structure
        let other_charges: any = undefined;
        if (non_items && non_items.length > 0) {
            const firstNonItem = non_items[0];
            other_charges = {
                description: firstNonItem.description || '',
                price: Number(firstNonItem.price) || 0,
                rate: Number(firstNonItem.rate || firstNonItem.gst_rate) || 0,
                total: Number(firstNonItem.price) * (1 + Number(firstNonItem.rate || firstNonItem.gst_rate || 0) / 100)
            };
        }

        // Helper to compute totals
        const computeTotals = (mappedItemsList: any[], nonItemsList: any[]) => {
            let taxableValue = 0;
            let totalTax = 0;
            let cgst = 0;
            let sgst = 0;
            let igst = 0;

            mappedItemsList.forEach((item) => {
                taxableValue += item.taxable_value || 0;
                const itemTax = (item.taxable_value || 0) * (item.gst_rate || 0) / 100;
                totalTax += itemTax;
                cgst += itemTax / 2;
                sgst += itemTax / 2;
            });

            nonItemsList.forEach((item) => {
                const itemPrice = Number(item.price) || 0;
                taxableValue += itemPrice;
                const itemTax = itemPrice * (Number(item.rate || item.gst_rate) || 0) / 100;
                totalTax += itemTax;
                cgst += itemTax / 2;
                sgst += itemTax / 2;
            });

            const rawGrandTotal = taxableValue + totalTax;
            const grandTotalRounded = Math.round(rawGrandTotal);
            const roundOff = Number((grandTotalRounded - rawGrandTotal).toFixed(2));

            return {
                taxable_value: Number(taxableValue.toFixed(2)),
                cgst: Number(cgst.toFixed(2)),
                sgst: Number(sgst.toFixed(2)),
                igst: Number(igst.toFixed(2)),
                total_tax: Number(totalTax.toFixed(2)),
                round_off: roundOff,
                grand_total: grandTotalRounded
            };
        };

        // Build customer snapshot
        const customer_snapshot: any = {};
        if (buyerName) customer_snapshot.name = buyerName;
        if (buyerPhone) customer_snapshot.phone = buyerPhone;
        if (buyerEmail) customer_snapshot.email = buyerEmail;
        if (buyerGSTIN) customer_snapshot.gstin = buyerGSTIN;
        let customerAddressStr = '';
        if (buyerAddress) {
            if (typeof buyerAddress === 'string') {
                customer_snapshot.billing_address = { line1: buyerAddress };
                customerAddressStr = buyerAddress;
            } else {
                customer_snapshot.billing_address = buyerAddress;
                customerAddressStr = [
                    buyerAddress.line1,
                    buyerAddress.line2,
                    buyerAddress.city,
                    buyerAddress.state ? buyerAddress.state + (buyerAddress.pincode ? ' - ' + buyerAddress.pincode : '') : ''
                ].filter(val => val && String(val).trim() !== "").join(', ');
            }
        }

        // Build consignee sub-document
        const consignee: any = {};
        let consigneeAddressStr = '';
        if (consigneeName) consignee.name = consigneeName;
        if (consigneeAddress) {
            if (typeof consigneeAddress === 'string') {
                consignee.address = { line1: consigneeAddress };
                consigneeAddressStr = consigneeAddress;
            } else {
                consignee.address = consigneeAddress;
                consigneeAddressStr = [
                    consigneeAddress.line1,
                    consigneeAddress.line2,
                    consigneeAddress.city,
                    consigneeAddress.state ? consigneeAddress.state + (consigneeAddress.pincode ? ' - ' + consigneeAddress.pincode : '') : ''
                ].filter(val => val && String(val).trim() !== "").join(', ');
            }
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
            items_original = mappedItems;
            non_items_original = non_items;
        } else if (type === 'duplicate') {
            items_duplicate = mappedItems;
            non_items_duplicate = non_items;
        } else {
            return res.status(400).json({ message: 'type must be "original" or "duplicate"' });
        }

        const totals_original = computeTotals(items_original, non_items_original);
        const totals_duplicate = computeTotals(items_duplicate, non_items_duplicate);

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

            // Update snapshot and service fields
            if (buyerCustomerId) {
                existingInvoice.customer_id = buyerCustomerId;
            }
            existingInvoice.customer_snapshot = customer_snapshot;
            existingInvoice.consignee = consignee;
            existingInvoice.totals_original = totals_original;
            existingInvoice.totals_duplicate = totals_duplicate;
            existingInvoice.other_charges = other_charges;

            // Update fields
            Object.assign(existingInvoice, {
                project_name: projectName,
                invoice_date: invoiceDate,
                po_number: poNumber,
                po_date: poDate,
                quotation_id: quotationId || undefined,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_after_months: serviceAfterMonths,
                next_service_date: nextServiceDate,
                service_status: (Number(serviceAfterMonths) > 0) ? 'Active' : existingInvoice.service_status,
                margin: margin,
                customer_name: buyerName,
                customer_address: customerAddressStr,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                customer_GSTIN: buyerGSTIN,
                consignee_name: consigneeName,
                consignee_address: consigneeAddressStr,
                items_original: items_original,
                items_duplicate: items_duplicate,
                non_items_original: non_items_original,
                non_items_duplicate: non_items_duplicate,
                total_amount_original: totals_original.grand_total,
                total_amount_duplicate: totals_duplicate.grand_total,
                total_tax_original: totals_original.total_tax,
                total_tax_duplicate: totals_duplicate.total_tax,
                declaration: declaration,
                termsAndConditions: termsAndConditions
            });

            if (status) {
                existingInvoice.status = status;
            }

            if (typeof existingInvoice.updatePaymentStatus === 'function') {
                existingInvoice.updatePaymentStatus();
            }

            const updatedInvoice = await existingInvoice.save();
            return res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });

        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW INVOICE
            // ---------------------------------------------------------

            const newId = await generateNextId('invoice');

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
                invoice_no: newId,
                invoice_id: newId,
                status: status || InvoiceStatus.DRAFT,
                invoice_date: invoiceDate || new Date(),
                project_name: projectName,
                po_number: poNumber,
                po_date: poDate,
                quotation_id: quotationId || undefined,
                customer_id: buyerCustomerId || undefined,
                customer_snapshot: customer_snapshot,
                consignee: consignee,
                items_original: items_original,
                items_duplicate: items_original,
                other_charges: other_charges,
                totals_original: totals_original,
                totals_duplicate: totals_original, // For new invoice, duplicate starts as original
                dc_number: dcNumber,
                dc_date: dcDate,
                service_after_months: serviceAfterMonths,
                next_service_date: nextServiceDate,
                service_status: (Number(serviceAfterMonths) > 0) ? 'Active' : 'Closed',
                margin: margin,
                customer_name: buyerName,
                customer_address: customerAddressStr,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                customer_GSTIN: buyerGSTIN,
                consignee_name: consigneeName,
                consignee_address: consigneeAddressStr,
                non_items_original: non_items,
                non_items_duplicate: non_items,
                total_amount_original: totals_original.grand_total,
                total_amount_duplicate: totals_original.grand_total,
                total_tax_original: totals_original.total_tax,
                total_tax_duplicate: totals_original.total_tax,
                declaration: declaration,
                termsAndConditions: termsAndConditions
            });

            if (typeof invoice.updatePaymentStatus === 'function') {
                invoice.updatePaymentStatus();
            }

            const savedInvoice = await invoice.save();

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
            .select("project_name invoice_id status customer_name customer_phone customer_address payment_status total_amount_duplicate total_paid_amount invoice_date createdAt");

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
