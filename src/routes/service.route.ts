import { Router, Request, Response } from 'express';
import { InvoiceModel, ServiceModel, ItemModel, StockMovementModel } from '../models';
import moment from 'moment';
import logger from '../utils/logger';
import { previewNextId, generateNextId } from '../utils/idGenerator';

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
 */
router.get('/generate-id', async (req: Request, res: Response) => {
    try {
        const service_id = await previewNextId('service');
        return res.status(200).json({ service_id });
    } catch (err: unknown) {
        logger.error('Error generating service preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate service id' });
    }
});

// Route to get all services (invoices with service_month > 0)
router.get('/all', async (req: Request, res: Response) => {
    try {
        const services = await InvoiceModel.find({
            service_after_months: { $gt: 0 },
            $or: [
                { service_status: { $in: ['Active', 'Paused'] } },
                { service_status: { $exists: false } }
            ]
        }).sort({ createdAt: -1 });
        return res.status(200).json(services);
    } catch (error: unknown) {
        logger.error("Error fetching services:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get service notifications
router.get('/get-service', async (req: Request, res: Response) => {
    try {
        const currentDate = moment();
        const projects = await InvoiceModel.find({
            service_after_months: { $gt: 0 },
            $or: [
                { service_status: 'Active' },
                { service_status: { $exists: false } }
            ]
        }) as any[];

        const filteredProjects = projects.filter(project => {
            if (!project.service_after_months) return false;

            let targetDate: moment.Moment;
            if (project.next_service_date) {
                targetDate = moment(project.next_service_date);
            } else {
                const createdDate = moment(project.invoice_date || project.createdAt);
                targetDate = createdDate.clone().add(project.service_after_months, 'months');
            }

            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ projects: filteredProjects });
    } catch (error: unknown) {
        logger.error("Error fetching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update next service status
router.post('/update-nextService', async (req: Request, res: Response) => {
    try {
        const { invoice_id, next_service } = req.body;

        const project = await InvoiceModel.findOne({ invoice_id: invoice_id }) as any;
        if (!project) return res.status(404).json({ error: "Project not found" });

        if (next_service === "yes") {
            project.service_status = 'Active';
        } else {
            project.service_status = 'Paused';
        }
        await project.save();

        res.json({ message: "Service updated successfully" });
    } catch (error: unknown) {
        logger.error("Error updating service:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to save payment for a service
router.post("/save-payment", async (req: Request, res: Response) => {
    try {
        const {
            serviceId,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const serviceRecord = await ServiceModel.findOne({ service_id: serviceId }) as any;
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        const totalDue = serviceRecord.total_amount_with_tax || 0;
        const currentPaid = (serviceRecord.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

        if (currentPaid + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - currentPaid).toFixed(2)})` });
        }

        serviceRecord.payments.push({
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        });

        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

        if (typeof serviceRecord.updatePaymentStatus === 'function') {
            serviceRecord.updatePaymentStatus();
        } else {
            const totalDueLocal = serviceRecord.total_amount_with_tax || 0;
            if (totalDueLocal > 0 && serviceRecord.total_paid_amount >= totalDueLocal) {
                serviceRecord.payment_status = 'Paid';
            } else if (serviceRecord.total_paid_amount > 0) {
                serviceRecord.payment_status = 'Partial';
            } else {
                serviceRecord.payment_status = 'Unpaid';
            }
        }

        await serviceRecord.save();

        res.status(200).json({ message: "Payment saved successfully." });
    } catch (error: unknown) {
        logger.error("Error saving payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to update an existing payment for a service
router.put("/update-payment", async (req: Request, res: Response) => {
    try {
        const {
            serviceId,
            paymentIndex,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const serviceRecord = await ServiceModel.findOne({ service_id: serviceId }) as any;
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        if (!serviceRecord.payments || paymentIndex < 0 || paymentIndex >= serviceRecord.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const totalDue = serviceRecord.total_amount_with_tax || 0;
        const otherPaymentsTotal = (serviceRecord.payments || []).reduce((sum: number, p: any, idx: number) => {
            if (idx === Number(paymentIndex)) return sum;
            return sum + Number(p.paid_amount || 0);
        }, 0);

        if (otherPaymentsTotal + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - otherPaymentsTotal).toFixed(2)})` });
        }

        serviceRecord.payments[paymentIndex] = {
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        };

        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

        if (totalDue > 0 && serviceRecord.total_paid_amount >= totalDue) {
            serviceRecord.payment_status = 'Paid';
        } else if (serviceRecord.total_paid_amount > 0) {
            serviceRecord.payment_status = 'Partial';
        } else {
            serviceRecord.payment_status = 'Unpaid';
        }

        if (typeof serviceRecord.updatePaymentStatus === 'function') {
            serviceRecord.updatePaymentStatus();
        }

        await serviceRecord.save();

        res.status(200).json({ message: "Payment updated successfully." });
    } catch (error: unknown) {
        logger.error("Error updating payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to delete a payment from a service
router.delete("/delete-payment/:serviceId/:paymentIndex", async (req: Request, res: Response) => {
    try {
        const { serviceId, paymentIndex } = req.params;
        const index = parseInt(paymentIndex as string, 10);

        const serviceRecord = await ServiceModel.findOne({ service_id: serviceId }) as any;
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        if (!serviceRecord.payments || index < 0 || index >= serviceRecord.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        serviceRecord.payments.splice(index, 1);

        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);

        const totalDue = serviceRecord.total_amount_with_tax || 0;
        if (totalDue > 0 && serviceRecord.total_paid_amount >= totalDue) {
            serviceRecord.payment_status = 'Paid';
        } else if (serviceRecord.total_paid_amount > 0) {
            serviceRecord.payment_status = 'Partial';
        } else {
            serviceRecord.payment_status = 'Unpaid';
        }

        if (typeof serviceRecord.updatePaymentStatus === 'function') {
            serviceRecord.updatePaymentStatus();
        }

        await serviceRecord.save();

        res.status(200).json({ message: "Payment deleted successfully." });
    } catch (error: unknown) {
        logger.error("Error deleting payment:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

/**
 * Route: Create New Service Record
 */
router.post('/save-service', async (req: Request, res: Response) => {
    try {
        const {
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            next_service_month,
            items,
            non_items,
            total_tax,
            total_amount_no_tax,
            total_amount_with_tax,
            notes,
            declaration,
            terms_and_conditions
        } = req.body;

        const newServiceId = await generateNextId('service');

        const savedService = await ServiceModel.create({
            service_id: newServiceId,
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            items: items || [],
            non_items: non_items || [],
            total_tax: total_tax || 0,
            total_amount_no_tax: total_amount_no_tax || 0,
            total_amount_with_tax: total_amount_with_tax || 0,
            notes: notes || '',
            declaration: declaration || '',
            terms_and_conditions: terms_and_conditions || ''
        } as any);

        // Deduct stock for service items
        if (items && items.length > 0) {
            for (const item of items) {
                const stockItem = await ItemModel.findOne({ item_name: item.description });
                if (stockItem) {
                    await ItemModel.updateOne({ _id: stockItem._id }, { $inc: { quantity: -item.quantity } });
                    await logStockMovement(
                        stockItem._id,
                        item.description,
                        item.quantity,
                        'out',
                        'service',
                        newServiceId,
                        `Deducted for service: ${newServiceId}`
                    );
                }
            }
        }

        // Update service_stage in the invoice
        const invoice = await InvoiceModel.findOne({ invoice_id }) as any;
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (typeof service_stage !== "undefined") {
            const existingStage = Number(invoice.service_stage || 0);
            const incomingStage = Number(service_stage || 0);
            invoice.service_stage = Math.max(existingStage, incomingStage);
        }

        const serviceMonthToUse = (typeof next_service_month === 'number' && next_service_month >= 0)
            ? next_service_month
            : invoice.service_after_months;

        if (serviceMonthToUse > 0) {
            const currentServiceDate = moment(service_date);
            invoice.next_service_date = currentServiceDate.add(serviceMonthToUse, 'months').toDate();
        }

        await invoice.save();

        return res.json({
            message: "Service saved and invoice service_stage updated successfully",
            service: savedService,
            service_id: newServiceId
        });

    } catch (error: unknown) {
        logger.error("Error saving service info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update existing service record
router.put('/update-service', async (req: Request, res: Response) => {
    try {
        const {
            service_id,
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            items,
            non_items,
            total_tax,
            total_amount_no_tax,
            total_amount_with_tax,
            notes,
            declaration,
            terms_and_conditions
        } = req.body;

        const existingService = await ServiceModel.findOne({ service_id }) as any;
        if (!existingService) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Handle stock updates if items changed
        if (items) {
            for (const prev of existingService.items || []) {
                const stockItem = await ItemModel.findOne({ item_name: prev.description });
                if (stockItem) {
                    await ItemModel.updateOne({ _id: stockItem._id }, { $inc: { quantity: prev.quantity } });
                    await logStockMovement(stockItem._id, prev.description, prev.quantity, 'in', 'service', service_id, `Reverted for service update: ${service_id}`);
                }
            }
            for (const item of items) {
                const stockItem = await ItemModel.findOne({ item_name: item.description });
                if (stockItem) {
                    await ItemModel.updateOne({ _id: stockItem._id }, { $inc: { quantity: -item.quantity } });
                    await logStockMovement(stockItem._id, item.description, item.quantity, 'out', 'service', service_id, `Deducted for service update: ${service_id}`);
                }
            }
        }

        existingService.invoice_id = invoice_id || existingService.invoice_id;
        existingService.fee_amount = fee_amount !== undefined ? fee_amount : existingService.fee_amount;
        existingService.service_date = service_date || existingService.service_date;
        existingService.service_stage = service_stage !== undefined ? service_stage : existingService.service_stage;
        existingService.items = items || existingService.items;
        existingService.non_items = non_items || existingService.non_items;
        existingService.total_tax = total_tax !== undefined ? total_tax : existingService.total_tax;
        existingService.total_amount_no_tax = total_amount_no_tax !== undefined ? total_amount_no_tax : existingService.total_amount_no_tax;
        existingService.total_amount_with_tax = total_amount_with_tax !== undefined ? total_amount_with_tax : existingService.total_amount_with_tax;
        existingService.notes = notes !== undefined ? notes : existingService.notes;
        existingService.declaration = declaration !== undefined ? declaration : existingService.declaration;
        existingService.terms_and_conditions = terms_and_conditions !== undefined ? terms_and_conditions : existingService.terms_and_conditions;

        await existingService.save();

        const invoice = await InvoiceModel.findOne({ invoice_id }) as any;
        if (invoice) {
            const existingStage = Number(invoice.service_stage || 0);
            const incomingStage = Number(service_stage || 0);
            invoice.service_stage = Math.max(existingStage, incomingStage);
            await invoice.save();
        }

        res.status(200).json({ message: 'Service updated successfully', service: existingService });
    } catch (error: unknown) {
        logger.error('Error updating service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search services
router.get('/search/:query', async (req: Request, res: Response) => {
    try {
        const query = req.params.query;
        const currentDate = moment();

        const projects = await InvoiceModel.find({
            service_after_months: { $gt: 0 },
            $and: [
                {
                    $or: [
                        { service_status: 'Active' },
                        { service_status: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { customer_name: { $regex: query, $options: 'i' } },
                        { project_name: { $regex: query, $options: 'i' } },
                        { invoice_id: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        } as any) as any[];

        const filteredProjects = projects.filter(project => {
            if (!project.createdAt && !project.invoice_date) return false;
            if (!project.service_after_months) return false;

            const createdDate = moment(project.invoice_date || project.createdAt);
            const targetDate = createdDate.clone().add(project.service_after_months, 'months');
            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ service: filteredProjects });
    } catch (error: unknown) {
        logger.error("Error searching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get services with pending payments
router.get('/pending-payments', async (req: Request, res: Response) => {
    try {
        const pendingServices = await ServiceModel.find({
            payment_status: { $ne: 'Paid' }
        }).lean();

        res.status(200).json({ message: 'Pending payment services retrieved successfully', services: pendingServices });
    } catch (error: unknown) {
        logger.error('Error retrieving pending payment services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recent service records
router.get('/recent-services', async (req: Request, res: Response) => {
    try {
        const recentServices = await ServiceModel.find().sort({ createdAt: -1 }).limit(10).lean();

        const servicesWithInvoiceData = await Promise.all(
            recentServices.map(async (svc: any) => {
                const invoice = await InvoiceModel.findOne({ invoice_id: svc.invoice_id })
                    .select('customer_name customer_address customer_phone customer_gstin project_name')
                    .lean() as any;
                return {
                    ...svc,
                    customer_name: invoice?.customer_name || 'N/A',
                    customer_address: invoice?.customer_address || 'N/A',
                    customer_phone: invoice?.customer_phone || 'N/A',
                    customer_gstin: invoice?.customer_gstin || 'N/A',
                    project_name: invoice?.project_name || 'N/A'
                };
            })
        );

        res.status(200).json({ message: 'Recent services retrieved successfully', services: servicesWithInvoiceData });
    } catch (error: unknown) {
        logger.error('Error retrieving recent services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get individual service by service_id
router.get('/:serviceId', async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const serviceRecord = await ServiceModel.findOne({ service_id: serviceId }).lean() as any;
        if (!serviceRecord) {
            return res.status(404).json({ error: 'Service not found' });
        }
        const invoice = await InvoiceModel.findOne({ invoice_id: serviceRecord.invoice_id }).lean();
        res.status(200).json({
            message: 'Service retrieved successfully',
            service: { ...serviceRecord, invoice_details: invoice || null }
        });
    } catch (error: unknown) {
        logger.error('Error retrieving service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get service history
router.get('/history/:invoiceId', async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const serviceHistory = await ServiceModel.find({ invoice_id: invoiceId }).sort({ service_stage: 1 }).lean();

        res.status(200).json({ message: 'Service history retrieved successfully', services: serviceHistory });
    } catch (error: unknown) {
        logger.error('Error retrieving service history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search service records
router.get('/search-services/:query', async (req: Request, res: Response) => {
    try {
        const query = req.params.query;
        const matchingServices = await ServiceModel.find({
            $or: [
                { service_id: { $regex: query, $options: 'i' } },
                { invoice_id: { $regex: query, $options: 'i' } }
            ]
        } as any).lean();

        const matchingInvoices = await InvoiceModel.find({
            $or: [
                { customer_name: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } }
            ]
        } as any).select('invoice_id').lean() as any[];

        const invoiceIds = matchingInvoices.map(inv => inv.invoice_id);
        const servicesByCustomer = await ServiceModel.find({
            invoice_id: { $in: invoiceIds }
        }).lean();

        const allServices = [...matchingServices, ...servicesByCustomer] as any[];
        const uniqueServices = Array.from(
            new Map(allServices.map(s => [s.service_id, s])).values()
        );

        const servicesWithInvoiceData = await Promise.all(
            uniqueServices.map(async (svc: any) => {
                const invoice = await InvoiceModel.findOne({ invoice_id: svc.invoice_id })
                    .select('customer_name customer_address customer_phone customer_gstin project_name')
                    .lean() as any;
                return {
                    ...svc,
                    customer_name: invoice?.customer_name || 'N/A',
                    customer_address: invoice?.customer_address || 'N/A',
                    customer_phone: invoice?.customer_phone || 'N/A',
                    customer_gstin: invoice?.customer_gstin || 'N/A',
                    project_name: invoice?.project_name || 'N/A'
                };
            })
        );

        res.status(200).json({ message: 'Services found', services: servicesWithInvoiceData });
    } catch (error: unknown) {
        logger.error('Error searching service records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete service record
router.delete('/:serviceId', async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;

        const serviceRecord = await ServiceModel.findOne({ service_id: serviceId }) as any;
        if (!serviceRecord) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const invoiceId = serviceRecord.invoice_id;

        if (serviceRecord.items && serviceRecord.items.length > 0) {
            for (const item of serviceRecord.items) {
                const stockItem = await ItemModel.findOne({ item_name: item.description });
                if (stockItem) {
                    await ItemModel.updateOne({ _id: stockItem._id }, { $inc: { quantity: item.quantity } });
                    await logStockMovement(stockItem._id, item.description, item.quantity, 'in', 'service', serviceId as string, `Reverted for service deletion: ${serviceId}`);
                }
            }
        }

        await ServiceModel.deleteOne({ service_id: serviceId });

        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (invoice) {
            const remainingServices = await ServiceModel.find({ invoice_id: invoiceId }).lean() as any[];
            const maxStage = remainingServices.reduce((max: number, rec: any) => Math.max(max, Number(rec.service_stage || 0)), 0);
            invoice.service_stage = maxStage;
            await invoice.save();
        }

        res.status(200).json({ message: 'Service deleted successfully and invoice service_stage decremented' });
    } catch (error: unknown) {
        logger.error('Error deleting service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle service status (Active/Paused)
router.post('/toggle-status', async (req: Request, res: Response) => {
    try {
        const { invoiceId, status } = req.body;

        const project = await InvoiceModel.findOne({ invoice_id: invoiceId }) as any;
        if (!project) return res.status(404).json({ error: "Project not found" });

        if (status) {
            project.service_status = status;
        } else {
            project.service_status = (project.service_status === 'Paused') ? 'Active' : 'Paused';
        }

        await project.save();

        res.json({
            message: `Service ${project.service_status === 'Paused' ? 'paused' : 'resumed'} successfully`,
            status: project.service_status
        });

    } catch (error: unknown) {
        logger.error("Error toggling service status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
