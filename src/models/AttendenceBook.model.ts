import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAttendenceBook extends Document {
    date: Date;
    emp_id: number;
    present: boolean;
    start_time?: Date;
    end_time?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendenceBook>(
    {
        date: {
            type: Date,
            default: Date.now,
            index: true
        },
        emp_id: {
            type: Number,
            required: true,
            index: true
        },
        present: {
            type: Boolean,
            required: true
        },
        start_time: {
            type: Date
        },
        end_time: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

export const AttendenceBookModel: Model<IAttendenceBook> =
    mongoose.models.AttendenceBook || mongoose.model<IAttendenceBook>("AttendenceBook", attendanceSchema);
