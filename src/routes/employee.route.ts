import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { EmployeeModel as Employee, AttendenceBookModel as AttendenceBook } from '../models';

const router: Router = Router();

// Function to generate unique 3-digit Employee ID starting from 101
async function generateEmpId(): Promise<number> {
    if (!Employee) return 101;
    const lastEmployee = await Employee.findOne().sort({ EmpID: -1 });
    return lastEmployee ? lastEmployee.emp_id + 1 : 101;
}

// Route to add a new employee
router.post('/addEmp', async (req: Request, res: Response) => {
    try {
        if (!Employee) {
            return res.status(501).json({ message: 'Employee feature not yet implemented.' });
        }

        let { first_name, last_name, name, address, phone, email, salary, bank_details } = req.body;

        if (!first_name && name) {
            const parts = name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ');
        }

        if (!first_name || !address || !address.line1 || !address.city || isNaN(phone) || isNaN(salary)) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const emp_id = await generateEmpId();
        const newEmployee = new Employee({
            emp_id,
            first_name,
            last_name: last_name || '',
            address,
            phone,
            email,
            join_date: new Date(),
            salary,
            bank_details
        });
        await newEmployee.save();

        res.status(201).json({ message: 'Employee added successfully', employee: newEmployee });
    } catch (error: unknown) {
        logger.error('Error adding employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to get all employees
router.get('/getEmployees', async (req: Request, res: Response) => {
    try {
        if (!Employee) {
            return res.status(501).json({ message: 'Employee feature not yet implemented.' });
        }

        const employees = await Employee.find();
        res.status(200).json({ employees });
    } catch (error: unknown) {
        logger.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

function parseTimeOnly(timeString: string, baseDate: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const time = new Date(baseDate);
    time.setHours(hours, minutes, 0, 0); // Keep current date but set time
    return time;
}

// Route to mark attendance
router.post('/markAttendance', async (req: Request, res: Response) => {
    try {
        if (!AttendenceBook) {
            return res.status(501).json({ message: 'Employee feature not yet implemented.' });
        }

        const { emp_id, present, start_time, end_time, date } = req.body;

        if (emp_id === undefined || (present && (!start_time || !end_time))) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const inputDate = date ? new Date(date) : new Date();
        const startDate = new Date(inputDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(inputDate);
        endDate.setHours(23, 59, 59, 999);

        // Check if attendance already marked for this day
        const existingRecord = await AttendenceBook.findOne({
            emp_id,
            date: { $gte: startDate, $lte: endDate }
        });

        if (existingRecord) {
            return res.status(400).json({ message: 'Attendance has already been marked for this employee on this date.' });
        }

        const attendance = new AttendenceBook({
            date: inputDate,
            emp_id,
            present,
            start_time: present ? parseTimeOnly(start_time, inputDate) : undefined,
            end_time: present ? parseTimeOnly(end_time, inputDate) : undefined,
        });

        await attendance.save();
        res.status(201).json({ message: 'Attendance recorded successfully' });
    } catch (error: unknown) {
        logger.error('Error recording attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to update an employee profile
router.post('/updateEmp/:id', async (req: Request, res: Response) => {
    try {
        if (!Employee) {
            return res.status(501).json({ message: 'Employee feature not yet implemented.' });
        }

        const { id } = req.params;
        let { first_name, last_name, name, address, phone, email, salary, bank_details } = req.body;

        if (!first_name && name) {
            const parts = name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ');
        }

        if (!first_name || !address || !address.line1 || !address.city || isNaN(phone) || isNaN(salary)) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            {
                first_name,
                last_name: last_name || '',
                address,
                phone,
                email,
                salary,
                bank_details
            },
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json({ message: 'Employee updated successfully', employee: updatedEmployee });
    } catch (error: unknown) {
        logger.error('Error updating employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
