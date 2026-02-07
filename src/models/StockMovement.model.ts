import mongoose, { Document, Schema, Model, Types } from "mongoose";

/**
 * Reference sub-document interface
 */
export interface IReference {
    type?: "Purchase" | "Invoice" | "PurchaseReturn" | "SalesReturn" | "Service" | "Manual" | "Adjustment";
    id?: Types.ObjectId;
    number?: string;
}

/**
 * StockMovement document interface
 * Immutable ledger of all stock movements (IN / OUT)
 */
export interface IStockMovement extends Document {
    schema_version: number;

    item_id: Types.ObjectId;

    // Snapshot fields (audit safety)
    item_name: string;
    hsn_sac?: string;

    // Movement
    direction: "IN" | "OUT";
    quantity: number;

    // Stock snapshot
    stock_before: number;
    stock_after: number;

    // Reference (what caused this movement)
    reference?: IReference;

    // Valuation
    unit_price?: number;
    total_value?: number;

    // Audit
    remarks?: string;
    created_by?: string;

    createdAt: Date;
    updatedAt: Date;

    // Virtual
    formattedDate: string;
}

/**
 * Reference sub-schema
 */
const referenceSchema = new Schema<IReference>(
    {
        type: {
            type: String,
            enum: ["Purchase", "Invoice", "PurchaseReturn", "SalesReturn", "Service", "Manual", "Adjustment"],
            default: "Manual",
            index: true,
        },
        id: {
            type: Schema.Types.ObjectId,
            index: true,
        },
        number: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

/**
 * StockMovement schema
 */
const stockMovementSchema = new Schema<IStockMovement>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        item_id: {
            type: Schema.Types.ObjectId,
            ref: "Item",
            required: true,
            index: true,
        },

        // Snapshot fields (audit safety)
        item_name: {
            type: String,
            required: true,
            trim: true,
        },

        hsn_sac: {
            type: String,
            trim: true,
        },

        // Movement
        direction: {
            type: String,
            enum: ["IN", "OUT"],
            required: true,
            index: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 0,
        },

        // Stock snapshot
        stock_before: {
            type: Number,
            required: true,
        },

        stock_after: {
            type: Number,
            required: true,
        },

        // Reference (what caused this movement)
        reference: {
            type: referenceSchema,
        },

        // Valuation
        unit_price: {
            type: Number,
        },

        total_value: {
            type: Number,
        },

        // Audit
        remarks: {
            type: String,
            trim: true,
        },

        created_by: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Virtual: formatted date (India)
 */
stockMovementSchema.virtual("formattedDate").get(function (this: IStockMovement) {
    return this.createdAt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
});

/**
 * Indexes
 */
stockMovementSchema.index({ item_id: 1, createdAt: -1 });
stockMovementSchema.index({ "reference.type": 1, "reference.id": 1 });
stockMovementSchema.index({ direction: 1, createdAt: -1 });

/**
 * Model
 */
export const StockMovementModel: Model<IStockMovement> =
    mongoose.models.StockMovement || mongoose.model<IStockMovement>("StockMovement", stockMovementSchema);
