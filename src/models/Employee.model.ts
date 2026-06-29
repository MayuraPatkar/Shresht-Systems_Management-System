import mongoose, { Document, Schema, Model } from "mongoose";

export interface IEmployee extends Document {
    emp_id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    join_date: Date;
    salary: number;
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
            type: String,
            trim: true
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
