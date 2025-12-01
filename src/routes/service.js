const express = require('express');
const router = express.Router();
const { Invoices, service, Stock, StockMovement } = require('../models');
const moment = require('moment');
const logger = require('../utils/logger');

// Function to generate a unique ID for each Service
const { generateNextId } = require('../utils/idGenerator');

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

// Route to generate a new service ID
router.get('/generate-id', async (req, res) => {
    try {
        const service_id = await generateNextId('service');
        return res.status(200).json({ service_id });
    } catch (err) {
        logger.error('Error generating service id', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate service id' });
    }
});

// Route to get all services (invoices with service_month > 0)
router.get('/all', async (req, res) => {
    try {
        const services = await Invoices.find({ service_month: { $ne: 0 } }).sort({ createdAt: -1 });
        return res.status(200).json(services);
    } catch (error) {
        logger.error("Error fetching services:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get service notifications (all invoices with service_month > 0 and due)
router.get('/get-service', async (req, res) => {
    try {
        const currentDate = moment();
        // Fetch invoices where service_month is not zero
        const projects = await Invoices.find({ service_month: { $ne: 0 } });

        // Filter invoices based on service_month and invoice_date/createdAt
        const filteredProjects = projects.filter(project => {
            if (!project.createdAt && !project.invoice_date) return false;
            if (!project.service_month) return false;

            const createdDate = moment(project.invoice_date || project.createdAt);
            const targetDate = createdDate.clone().add(project.service_month, 'months');
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
        logger.info(invoice_id, next_service);

        // Check if project exists
        const project = await Invoices.findOne({ invoice_id: invoice_id });
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Update project with service_month
        if (next_service === "yes") {
            // Double the service_month interval for next service
            project.service_month = project.service_month * 2;
            await project.save();
        } else {
            // Mark as no further service
            project.service_month = 0;
            await project.save();
        }

        res.json({ message: "Service updated successfully" });
    } catch (error) {
        logger.error("Error updating service:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to save a new service entry and update service_stage in invoice
router.post('/save-service', async (req, res) => {
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
            notes
        } = req.body;

        // 1. Save service entry in the service collection
        const savedService = await service.create({
            service_id,
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            items: items || [],
            non_items: non_items || [],
            total_tax: total_tax || 0,
            total_amount_no_tax: total_amount_no_tax || 0,
            total_amount_with_tax: total_amount_with_tax || 0,
            notes: notes || ''
        });

        // 2. Deduct stock for service items
        if (items && items.length > 0) {
            for (let item of items) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    stockItem.quantity -= item.quantity;
                    await stockItem.save();
                    // Log stock movement
                    await logStockMovement(
                        item.description,
                        item.quantity,
                        'out',
                        'service',
                        service_id,
                        `Deducted for service: ${service_id}`
                    );
                }
            }
        }

        // 3. Update only service_stage in the invoice - ensure we don't regress the stage number
        const invoice = await Invoices.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (typeof service_stage !== "undefined") {
            // Ensure stage stored on invoice is maximum of existing and submitted to avoid regression
            const existingStage = Number(invoice.service_stage || 0);
            const incomingStage = Number(service_stage || 0);
            invoice.service_stage = Math.max(existingStage, incomingStage);
            await invoice.save();
        }
        
        // Return details including saved service
        return res.json({ message: "Service saved and invoice service_stage updated successfully", service: savedService });

        // Should never reach here, but fallback
        res.json({ message: "Service saved and invoice service_stage updated successfully" });
    } catch (error) {
        logger.error("Error saving service info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update existing service record (MUST be before parameterized routes like /search/:query)
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
            notes
        } = req.body;

        const existingService = await service.findOne({ service_id });
        if (!existingService) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Handle stock updates if items changed
        if (items) {
            // Revert stock for previous items
            for (let prev of existingService.items || []) {
                await Stock.updateOne({ item_name: prev.description }, { $inc: { quantity: prev.quantity } });
                await logStockMovement(
                    prev.description,
                    prev.quantity,
                    'in',
                    'service',
                    service_id,
                    `Reverted for service update: ${service_id}`
                );
            }
            // Deduct stock for new items
            for (let item of items) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    stockItem.quantity -= item.quantity;
                    await stockItem.save();
                    await logStockMovement(
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

        await existingService.save();

        // 3. Ensure invoice service_stage remains accurate (no regression)
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

// Search services by customer name, project name, or invoice ID
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const currentDate = moment();

        // Search in invoices where service_month is not zero
        const projects = await Invoices.find({
            service_month: { $ne: 0 },
            $or: [
                { customer_name: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { invoice_id: { $regex: query, $options: 'i' } }
            ]
        });

        // Filter based on service due date
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

// Get recent service records (last 10 completed services from Service collection)
router.get('/recent-services', async (req, res) => {
    try {
        const recentServices = await service.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Populate invoice details for each service
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

        // Populate invoice details
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

// Get service history for a specific invoice
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

// Search service records by service_id, customer name, or invoice_id
router.get('/search-services/:query', async (req, res) => {
    try {
        const query = req.params.query;

        // First, find matching services
        const matchingServices = await service.find({
            $or: [
                { service_id: { $regex: query, $options: 'i' } },
                { invoice_id: { $regex: query, $options: 'i' } }
            ]
        }).lean();

        // Also search by customer name in invoices
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

        // Combine and deduplicate results
        const allServices = [...matchingServices, ...servicesByCustomer];
        const uniqueServices = Array.from(
            new Map(allServices.map(s => [s.service_id, s])).values()
        );

        // Populate invoice details
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

// Delete service record and decrement invoice service_stage
router.delete('/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;

        const serviceRecord = await service.findOne({ service_id: serviceId });
        if (!serviceRecord) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const invoiceId = serviceRecord.invoice_id;

        // Revert stock for service items before deletion
        if (serviceRecord.items && serviceRecord.items.length > 0) {
            for (let item of serviceRecord.items) {
                await Stock.updateOne({ item_name: item.description }, { $inc: { quantity: item.quantity } });
                await logStockMovement(
                    item.description,
                    item.quantity,
                    'in',
                    'service',
                    serviceId,
                    `Reverted for service deletion: ${serviceId}`
                );
            }
        }

        // Delete the service record
        await service.deleteOne({ service_id: serviceId });

        // Recompute invoice service_stage based on remaining service records for that invoice
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (invoice) {
            // Find max stage among existing service records for this invoice
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

module.exports = router;
