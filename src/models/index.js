// Central export point for all database models
const Admin = require('./Admin');
const Quotation = require('./Quotation');
const Invoice = require('./Invoice');
const Purchase = require('./Purchase');
const EWayBill = require('./EWayBill');
const Stock = require('./Stock');
const Service = require('./Service');
const Employee = require('./Employee');
const AttendanceBook = require('./AttendanceBook');
const Settings = require('./Settings');
const Counters = require('./Counter');
const StockMovement = require('./StockMovement');
const Report = require('./Report');

module.exports = {
    Admin,
    Quotations: Quotation,
    Invoices: Invoice,
    Purchases: Purchase,
    EWayBills: EWayBill,
    Stock,
    service: Service,
    Employee,
    AttendenceBook: AttendanceBook,
    Settings,
    Counters,
    StockMovement,
    Report
};
