import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface IBankDetails {
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    branch?: string;
}

export interface IEmployee extends Document {
    emp_id: number;
    name: string;
    address: IAddress;
    phone: string;
    email: string;
    join_date: Date;
    salary: number;
    bank_details?: IBankDetails;
    is_active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
    {
        emp_id: {
            type: Number,
            required: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        address: {
            line1: { type: String, trim: true },
            line2: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true }
        },
        bank_details: {
            bank_name: { type: String, trim: true },
            account_holder_name: { type: String, trim: true },
            account_number: { type: String, trim: true },
            ifsc_code: { type: String, trim: true },
            branch: { type: String, trim: true }
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true
        },
        join_date: {
            type: Date,
            default: Date.now
        },
        salary: {
            type: Number,
            required: true
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export const EmployeeModel: Model<IEmployee> =
    mongoose.models.Employee || mongoose.model<IEmployee>("Employee", employeeSchema);
