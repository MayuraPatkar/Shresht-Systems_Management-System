// Central export point for all database models
const Admin = require('./Admin');
const Quotation = require('./Quotation');
const Invoice = require('./Invoice');
const Purchase = require('./Purchase');
const WayBill = require('./WayBill');
const Stock = require('./Stock');
const Service = require('./Service');
const Employee = require('./Employee');
const AttendanceBook = require('./AttendanceBook');
const Settings = require('./Settings');

module.exports = {
    Admin,
    Quotations: Quotation,
    Invoices: Invoice,
    Purchases: Purchase,
    wayBills: WayBill,
    Stock,
    service: Service,
    Employee,
    AttendenceBook: AttendanceBook, // Keep original name for backward compatibility
    Settings
};
