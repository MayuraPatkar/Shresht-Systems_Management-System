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
 * Report parameters interface
 */
export interface IReportParameters {
    start_date?: Date;
    end_date?: Date;
    month?: unknown;
    year?: number;
    filters?: unknown;
}

/**
 * Report summary interface
 */
export interface IReportSummary {
    total_records?: number;
    total_value?: number;
}

/**
 * Report document interface
 */
export interface IReport extends Document {
    schema_version: number;

    report_type: "stock" | "invoice_gst" | "purchase_gst" | "data_worksheet";
    report_name: string;

    parameters?: IReportParameters;
    data: unknown;
    summary?: IReportSummary;

    generated_by?: string;
    last_accessed?: Date;
    access_count: number;

    deletion: ISoftDelete;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    recordAccess(): Promise<IReport>;
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
 * Report parameters sub-schema
 */
const parametersSchema = new Schema<IReportParameters>(
    {
        start_date: { type: Date },
        end_date: { type: Date },
        month: { type: Schema.Types.Mixed },
        year: { type: Number },
        filters: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

/**
 * Report summary sub-schema
 */
const summarySchema = new Schema<IReportSummary>(
    {
        total_records: { type: Number },
        total_value: { type: Number },
    },
    { _id: false }
);

/**
 * Report schema
 */
const reportSchema = new Schema<IReport>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        report_type: {
            type: String,
            required: true,
            enum: ["stock", "invoice_gst", "purchase_gst", "data_worksheet"],
            index: true,
        },

        report_name: {
            type: String,
            required: true,
        },

        parameters: {
            type: parametersSchema,
        },

        data: {
            type: Schema.Types.Mixed,
            required: true,
        },

        summary: {
            type: summarySchema,
        },

        generated_by: {
            type: String,
            trim: true,
        },

        last_accessed: {
            type: Date,
        },

        access_count: {
            type: Number,
            default: 0,
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
 * Method: update access stats
 */
reportSchema.methods.recordAccess = function () {
    this.last_accessed = new Date();
    this.access_count += 1;
    return this.save();
};

/**
 * Indexes
 */
reportSchema.index({ report_type: 1, createdAt: -1 });
reportSchema.index({ report_type: 1, "parameters.month": 1, "parameters.year": 1 });
reportSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const ReportModel: Model<IReport> =
    mongoose.models.Report || mongoose.model<IReport>("Report", reportSchema);
