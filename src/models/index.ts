// Central export point for all database models

export { AdminModel, IAdmin } from "./Admin.model";
export { CounterModel, ICounter } from "./Counter.model";
export { CustomerModel, ICustomer } from "./Customer.model";
export { EWayBillModel, IEWayBill } from "./EWayBill.model";
export { InvoiceModel, IInvoice } from "./Invoice.model";
export { PaymentModel, IPayment } from "./Payment.model";
export { PurchaseModel, IPurchase } from "./Purchase.model";
export { QuotationModel, IQuotation } from "./Quotation.model";
export { ReportModel, IReport } from "./Report.model";
export { ServiceModel, IService } from "./Service.model";
export { SettingsModel, ISettings } from "./Settings.model";
export { ItemModel, IItem } from "./Stock.model";
export { StockMovementModel, IStockMovement } from "./StockMovement.model";
export { SupplierModel, ISupplier } from "./Supplier.model";

// ── Aliases expected by the JS route files (src/routes/*.js) ──
// The JS routes destructure names like { Admin, Invoices, Stock, ... }
// from require('../models'). These aliases bridge the TS model names
// to the legacy JS names so that both TS and JS consumers work.
import { AdminModel } from "./Admin.model";
import { CounterModel } from "./Counter.model";
import { EWayBillModel } from "./EWayBill.model";
import { InvoiceModel } from "./Invoice.model";
import { PurchaseModel } from "./Purchase.model";
import { QuotationModel } from "./Quotation.model";
import { ReportModel } from "./Report.model";
import { ServiceModel } from "./Service.model";
import { SettingsModel } from "./Settings.model";
import { ItemModel } from "./Stock.model";
import { StockMovementModel } from "./StockMovement.model";
import { SupplierModel } from "./Supplier.model";

// Re-export under the names the JS routes expect
export const Admin = AdminModel;
export const Counters = CounterModel;
export const Invoices = InvoiceModel;
export const Quotations = QuotationModel;
export const Purchases = PurchaseModel;
export const EWayBills = EWayBillModel;
export const Stock = ItemModel;
export const StockMovement = StockMovementModel;
export const service = ServiceModel;
export const Settings = SettingsModel;
export const Report = ReportModel;
export const Suppliers = SupplierModel;
