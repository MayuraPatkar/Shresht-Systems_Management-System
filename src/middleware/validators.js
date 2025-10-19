const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array() 
        });
    }
    next();
};

// Common validation rules
const validators = {
    // Admin/Auth validators
    register: [
        body('company').trim().notEmpty().withMessage('Company name is required'),
        body('username').trim().notEmpty().withMessage('Username is required')
            .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('phone.ph1').matches(/^[0-9]{10}$/).withMessage('Valid phone number is required'),
        body('GSTIN').trim().notEmpty().withMessage('GSTIN is required'),
        validate
    ],

    login: [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        validate
    ],

    // Invoice validators
    createInvoice: [
        body('invoice_id').trim().notEmpty().withMessage('Invoice ID is required'),
        body('project_name').trim().notEmpty().withMessage('Project name is required'),
        body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
        body('customer_phone').optional().matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
        body('customer_email').optional().isEmail().withMessage('Invalid email'),
        body('items_original').isArray({ min: 1 }).withMessage('At least one item is required'),
        validate
    ],

    updateInvoice: [
        param('id').isMongoId().withMessage('Invalid invoice ID'),
        body('project_name').optional().trim().notEmpty().withMessage('Project name cannot be empty'),
        validate
    ],

    // Quotation validators
    createQuotation: [
        body('quotation_id').trim().notEmpty().withMessage('Quotation ID is required'),
        body('project_name').trim().notEmpty().withMessage('Project name is required'),
        body('customer_name').optional().trim(),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        validate
    ],

    // Stock validators
    createStock: [
        body('item_name').trim().notEmpty().withMessage('Item name is required'),
        body('unit_price').isNumeric().withMessage('Unit price must be a number'),
        body('GST').isNumeric().withMessage('GST must be a number'),
        body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
        body('type').trim().notEmpty().withMessage('Type is required'),
        validate
    ],

    updateStock: [
        param('id').isMongoId().withMessage('Invalid stock ID'),
        body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
        validate
    ],

    // WayBill validators
    createWayBill: [
        body('waybill_id').trim().notEmpty().withMessage('WayBill ID is required'),
        body('project_name').trim().notEmpty().withMessage('Project name is required'),
        body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
        body('transport_mode').trim().notEmpty().withMessage('Transport mode is required'),
        body('vehicle_number').trim().notEmpty().withMessage('Vehicle number is required'),
        validate
    ],

    // Purchase Order validators
    createPurchase: [
        body('purchase_order_id').trim().notEmpty().withMessage('Purchase order ID is required'),
        body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        validate
    ],

    // Service validators
    createService: [
        body('service_id').trim().notEmpty().withMessage('Service ID is required'),
        body('invoice_id').trim().notEmpty().withMessage('Invoice ID is required'),
        body('fee_amount').optional().isNumeric().withMessage('Fee amount must be a number'),
        validate
    ],

    // Employee validators
    createEmployee: [
        body('emp_id').trim().notEmpty().withMessage('Employee ID is required'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
        validate
    ],

    // Search validators
    search: [
        query('q').trim().notEmpty().withMessage('Search query is required'),
        validate
    ],

    // ID parameter validator
    mongoId: [
        param('id').isMongoId().withMessage('Invalid ID format'),
        validate
    ],
};

module.exports = validators;
