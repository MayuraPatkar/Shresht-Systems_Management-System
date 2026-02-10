import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Soft delete sub-document interface
 */
export interface ISoftDelete {
    is_deleted: boolean;
    deleted_at?: Date;
    deleted_by?: string;
}

/**
 * Item document interface
 */
export interface IItem extends Document {
    schema_version: number;

    item_name: string;
    hsn_sac?: string;
    specifications?: string;
    brand?: string;
    category?: string;

    item_type: "Material" | "Asset";
    unit: string;

    purchase_price: number;
    selling_price?: number;
    gst_rate: number;
    margin: number;

    stock_quantity: number;
    min_stock_quantity: number;

    remarks?: string;

    is_active: boolean;

    deletion: ISoftDelete;

    createdAt: Date;
    updatedAt: Date;

    // Virtual
    isLowStock: boolean;
}

/**
 * Soft delete sub-schema
 */
const softDeleteSchema = new Schema<ISoftDelete>(
    {
        is_deleted: { type: Boolean, default: false },
        deleted_at: { type: Date },
        deleted_by: { type: String },
    },
    { _id: false }
);

/**
 * Item schema
 */
const stockSchema = new Schema<IItem>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        // Item identity
        item_name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        hsn_sac: {
            type: String,
            trim: true,
            index: true,
        },

        specifications: {
            type: String,
            trim: true,
        },

        brand: {
            type: String,
            trim: true,
            index: true,
        },

        category: {
            type: String,
            trim: true,
            index: true,
        },

        item_type: {
            type: String,
            enum: ["Material", "Asset"],
            default: "Material",
            index: true,
        },

        unit: {
            type: String,
            default: "Nos",
        },

        // Pricing & tax
        purchase_price: {
            type: Number,
            required: true,
        },

        selling_price: {
            type: Number,
        },

        gst_rate: {
            type: Number,
            required: true,
        },

        margin: {
            type: Number,
            default: 0,
        },

        // Stock
        stock_quantity: {
            type: Number,
            default: 0,
        },

        min_stock_quantity: {
            type: Number,
            default: 5,
        },

        // Audit
        remarks: {
            type: String,
            trim: true,
        },

        is_active: {
            type: Boolean,
            default: true,
            index: true,
        },

        deletion: {
            type: softDeleteSchema,
            default: () => ({ is_deleted: false }),
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Virtual: Low stock alert
 */
stockSchema.virtual("isLowStock").get(function (this: IItem) {
    return this.stock_quantity <= this.min_stock_quantity;
});

/**
 * Indexes
 */
stockSchema.index({ item_name: 1, category: 1 });
stockSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const ItemModel: Model<IItem> =
    mongoose.models.Item || mongoose.model<IItem>("Item", stockSchema);
