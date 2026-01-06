const express = require('express');
const router = express.Router();
const { Invoices, service, Stock, StockMovement } = require('../models');
const moment = require('moment');
const logger = require('../utils/logger');

// Import ID generator functions
const { previewNextId, generateNextId } = require('../utils/idGenerator');

// Helper function to log stock movements
async function logStockMovement(itemId, itemName, quantityChange, movementType, referenceType, referenceId = null, notes = '') {
    try {
        await StockMovement.create({
            item_id: itemId,
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
router.get('/generate-id', async (req, res) => {
    try {
        const service_id = await previewNextId('service');
        return res.status(200).json({ service_id });
    } catch (err) {
        logger.error('Error generating service preview', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate service id' });
    }
});

// Route to get all services (invoices with service_month > 0)
router.get('/all', async (req, res) => {
    try {
        const services = await Invoices.find({
            service_month: { $gt: 0 },
            $or: [
                { service_status: { $in: ['Active', 'Paused'] } },
                { service_status: { $exists: false } }
            ]
        }).sort({ createdAt: -1 });
        return res.status(200).json(services);
    } catch (error) {
        logger.error("Error fetching services:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get service notifications
router.get('/get-service', async (req, res) => {
    try {
        const currentDate = moment();
        const projects = await Invoices.find({
            service_month: { $gt: 0 },
            $or: [
                { service_status: 'Active' },
                { service_status: { $exists: false } }
            ]
        });

        const filteredProjects = projects.filter(project => {
            if (!project.service_month) return false;

            let targetDate;
            if (project.next_service_date) {
                targetDate = moment(project.next_service_date);
            } else {
                // Fallback for legacy data: Invoice Date + service_month
                const createdDate = moment(project.invoice_date || project.createdAt);
                targetDate = createdDate.clone().add(project.service_month, 'months');
            }

            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ projects: filteredProjects });
    } catch (error) {
        logger.error("Error fetching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update next service status
router.post('/update-nextService', async (req, res) => {
    try {
        const { invoice_id, next_service } = req.body;

        const project = await Invoices.findOne({ invoice_id: invoice_id });
        if (!project) return res.status(404).json({ error: "Project not found" });

        if (next_service === "yes") {
            project.service_status = 'Active';
        } else {
            project.service_status = 'Paused';
        }
        await project.save();

        res.json({ message: "Service updated successfully" });
    } catch (error) {
        logger.error("Error updating service:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to save payment for a service
router.post("/save-payment", async (req, res) => {
    try {
        const {
            serviceId,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const serviceRecord = await service.findOne({ service_id: serviceId });
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        const totalDue = serviceRecord.total_amount_with_tax || 0;
        const currentPaid = (serviceRecord.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        if (currentPaid + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - currentPaid).toFixed(2)})` });
        }

        // Add the new payment
        serviceRecord.payments.push({
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        });

        // Recalculate total_paid_amount
        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        // Update status
        if (typeof serviceRecord.updatePaymentStatus === 'function') {
            serviceRecord.updatePaymentStatus();
        } else {
            // Fallback if method not available immediately
            const totalDue = serviceRecord.total_amount_with_tax || 0;
            if (totalDue > 0 && serviceRecord.total_paid_amount >= totalDue) {
                serviceRecord.payment_status = 'Paid';
            } else if (serviceRecord.total_paid_amount > 0) {
                serviceRecord.payment_status = 'Partial';
            } else {
                serviceRecord.payment_status = 'Unpaid';
            }
        }

        await serviceRecord.save();

        res.status(200).json({ message: "Payment saved successfully." });
    } catch (error) {
        logger.error("Error saving payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to update an existing payment for a service
router.put("/update-payment", async (req, res) => {
    try {
        const {
            serviceId,
            paymentIndex,
            paymentMode,
            paymentDate,
            paidAmount = 0,
            paymentExtra = ''
        } = req.body;

        const serviceRecord = await service.findOne({ service_id: serviceId });
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        if (!serviceRecord.payments || paymentIndex < 0 || paymentIndex >= serviceRecord.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const totalDue = serviceRecord.total_amount_with_tax || 0;
        const otherPaymentsTotal = (serviceRecord.payments || []).reduce((sum, p, idx) => {
            if (idx === Number(paymentIndex)) return sum;
            return sum + Number(p.paid_amount || 0);
        }, 0);

        if (otherPaymentsTotal + Number(paidAmount) > totalDue + 0.01) {
            return res.status(400).json({ message: `Payment amount exceeds due amount (₹ ${(totalDue - otherPaymentsTotal).toFixed(2)})` });
        }

        // Update the payment at the specified index
        serviceRecord.payments[paymentIndex] = {
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode,
            extra_details: paymentExtra || ''
        };

        // Recalculate total_paid_amount
        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        // Update status
        // totalDue is already calculated above
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
    } catch (error) {
        logger.error("Error updating payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to delete a payment from a service
router.delete("/delete-payment/:serviceId/:paymentIndex", async (req, res) => {
    try {
        const { serviceId, paymentIndex } = req.params;
        const index = parseInt(paymentIndex, 10);

        const serviceRecord = await service.findOne({ service_id: serviceId });
        if (!serviceRecord) {
            return res.status(404).json({ message: "Service not found" });
        }

        if (!serviceRecord.payments || index < 0 || index >= serviceRecord.payments.length) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Remove the payment at the specified index
        serviceRecord.payments.splice(index, 1);

        // Recalculate total_paid_amount
        serviceRecord.total_paid_amount = (serviceRecord.payments || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

        // Update status
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
    } catch (error) {
        logger.error("Error deleting payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

/**
 * Route: Create New Service Record
 * Description: Always creates a new service. Generates a fresh permanent ID here.
 */
router.post('/save-service', async (req, res) => {
    try {
        const {
            // service_id, // Ignored from frontend (it's just a preview)
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

        // Generate the permanent ID now (increments the counter)
        const newServiceId = await generateNextId('service');

        // 1. Save service entry in the service collection
        const savedService = await service.create({
            service_id: newServiceId, // Use the fresh ID
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
        });

        // 2. Deduct stock for service items
        if (items && items.length > 0) {
            for (let item of items) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    await Stock.updateOne({ _id: stockItem._id }, { $inc: { quantity: -item.quantity } });
                    // Log stock movement
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

        // 3. Update only service_stage in the invoice
        const invoice = await Invoices.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (typeof service_stage !== "undefined") {
            const existingStage = Number(invoice.service_stage || 0);
            const incomingStage = Number(service_stage || 0);
            invoice.service_stage = Math.max(existingStage, incomingStage);
        }

        // Update next_service_date based on service interval
        // Use the custom next_service_month from the form, falling back to invoice.service_month
        const serviceMonthToUse = (typeof next_service_month === 'number' && next_service_month >= 0)
            ? next_service_month
            : invoice.service_month;

        if (serviceMonthToUse > 0) {
            const currentServiceDate = moment(service_date);
            invoice.next_service_date = currentServiceDate.add(serviceMonthToUse, 'months').toDate();
        }

        await invoice.save();

        return res.json({
            message: "Service saved and invoice service_stage updated successfully",
            service: savedService,
            service_id: newServiceId // Return the final ID
        });

    } catch (error) {
        logger.error("Error saving service info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update existing service record
router.put('/update-service', async (req, res) => {
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

        const existingService = await service.findOne({ service_id });
        if (!existingService) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Handle stock updates if items changed
        if (items) {
            // Revert stock for previous items
            for (let prev of existingService.items || []) {
                const stockItem = await Stock.findOne({ item_name: prev.description });
                if (stockItem) {
                    await Stock.updateOne({ _id: stockItem._id }, { $inc: { quantity: prev.quantity } });
                    await logStockMovement(
                        stockItem._id,
                        prev.description,
                        prev.quantity,
                        'in',
                        'service',
                        service_id,
                        `Reverted for service update: ${service_id}`
                    );
                }
            }
            // Deduct stock for new items
            for (let item of items) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    await Stock.updateOne({ _id: stockItem._id }, { $inc: { quantity: -item.quantity } });
                    await logStockMovement(
                        stockItem._id,
                        item.description,
                        item.quantity,
                        'out',
                        'service',
                        service_id,
                        `Deducted for service update: ${service_id}`
                    );
                }
            }
        }

        // Update service record
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

        // Ensure invoice service_stage remains accurate
        const invoice = await Invoices.findOne({ invoice_id });
        if (invoice) {
            const existingStage = Number(invoice.service_stage || 0);
            const incomingStage = Number(service_stage || 0);
            invoice.service_stage = Math.max(existingStage, incomingStage);
            await invoice.save();
        }

        res.status(200).json({
            message: 'Service updated successfully',
            service: existingService
        });
    } catch (error) {
        logger.error('Error updating service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search services
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const currentDate = moment();

        const projects = await Invoices.find({
            service_month: { $gt: 0 },
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
        });

        const filteredProjects = projects.filter(project => {
            if (!project.createdAt && !project.invoice_date) return false;
            if (!project.service_month) return false;

            const createdDate = moment(project.invoice_date || project.createdAt);
            const targetDate = createdDate.clone().add(project.service_month, 'months');
            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ service: filteredProjects });
    } catch (error) {
        logger.error("Error searching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get services with pending payments
router.get('/pending-payments', async (req, res) => {
    try {
        const pendingServices = await service.find({
            payment_status: { $ne: 'Paid' }
        }).lean();

        res.status(200).json({
            message: 'Pending payment services retrieved successfully',
            services: pendingServices
        });
    } catch (error) {
        logger.error('Error retrieving pending payment services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recent service records
router.get('/recent-services', async (req, res) => {
    try {
        const recentServices = await service.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const servicesWithInvoiceData = await Promise.all(
            recentServices.map(async (svc) => {
                const invoice = await Invoices.findOne({ invoice_id: svc.invoice_id })
                    .select('customer_name customer_address customer_phone customer_gstin project_name')
                    .lean();
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

        res.status(200).json({
            message: 'Recent services retrieved successfully',
            services: servicesWithInvoiceData
        });
    } catch (error) {
        logger.error('Error retrieving recent services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get individual service by service_id
router.get('/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const serviceRecord = await service.findOne({ service_id: serviceId }).lean();
        if (!serviceRecord) {
            return res.status(404).json({ error: 'Service not found' });
        }
        const invoice = await Invoices.findOne({ invoice_id: serviceRecord.invoice_id }).lean();
        res.status(200).json({
            message: 'Service retrieved successfully',
            service: {
                ...serviceRecord,
                invoice_details: invoice || null
            }
        });
    } catch (error) {
        logger.error('Error retrieving service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get service history
router.get('/history/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const serviceHistory = await service.find({ invoice_id: invoiceId })
            .sort({ service_stage: 1 })
            .lean();

        res.status(200).json({
            message: 'Service history retrieved successfully',
            services: serviceHistory
        });
    } catch (error) {
        logger.error('Error retrieving service history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search service records
router.get('/search-services/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const matchingServices = await service.find({
            $or: [
                { service_id: { $regex: query, $options: 'i' } },
                { invoice_id: { $regex: query, $options: 'i' } }
            ]
        }).lean();

        const matchingInvoices = await Invoices.find({
            $or: [
                { customer_name: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } }
            ]
        }).select('invoice_id').lean();

        const invoiceIds = matchingInvoices.map(inv => inv.invoice_id);
        const servicesByCustomer = await service.find({
            invoice_id: { $in: invoiceIds }
        }).lean();

        const allServices = [...matchingServices, ...servicesByCustomer];
        const uniqueServices = Array.from(
            new Map(allServices.map(s => [s.service_id, s])).values()
        );

        const servicesWithInvoiceData = await Promise.all(
            uniqueServices.map(async (svc) => {
                const invoice = await Invoices.findOne({ invoice_id: svc.invoice_id })
                    .select('customer_name customer_address customer_phone customer_gstin project_name')
                    .lean();
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

        res.status(200).json({
            message: 'Services found',
            services: servicesWithInvoiceData
        });
    } catch (error) {
        logger.error('Error searching service records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete service record
router.delete('/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;

        const serviceRecord = await service.findOne({ service_id: serviceId });
        if (!serviceRecord) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const invoiceId = serviceRecord.invoice_id;

        if (serviceRecord.items && serviceRecord.items.length > 0) {
            for (let item of serviceRecord.items) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    await Stock.updateOne({ _id: stockItem._id }, { $inc: { quantity: item.quantity } });
                    await logStockMovement(
                        stockItem._id,
                        item.description,
                        item.quantity,
                        'in',
                        'service',
                        serviceId,
                        `Reverted for service deletion: ${serviceId}`
                    );
                }
            }
        }

        await service.deleteOne({ service_id: serviceId });

        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (invoice) {
            const remainingServices = await service.find({ invoice_id: invoiceId }).lean();
            const maxStage = remainingServices.reduce((max, rec) => Math.max(max, Number(rec.service_stage || 0)), 0);
            invoice.service_stage = maxStage;
            await invoice.save();
        }

        res.status(200).json({
            message: 'Service deleted successfully and invoice service_stage decremented'
        });
    } catch (error) {
        logger.error('Error deleting service:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle service status (Active/Paused)
router.post('/toggle-status', async (req, res) => {
    try {
        const { invoiceId, status } = req.body;

        const project = await Invoices.findOne({ invoice_id: invoiceId });
        if (!project) return res.status(404).json({ error: "Project not found" });

        // If status is provided, use it. Otherwise toggle.
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

    } catch (error) {
        logger.error("Error toggling service status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;