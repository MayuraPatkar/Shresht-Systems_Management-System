import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router: Router = Router();

// TODO: Employee feature is planned for future implementation.
// The Employee and AttendenceBook models are not yet defined in the new
// TypeScript model layer. Once the models are created, uncomment / update
// the imports below and remove the placeholder types.

// Placeholder types until official models are created
interface IEmployeeDoc {
    emp_id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    join_date: Date;
    salary: number;
    save(): Promise<IEmployeeDoc>;
}

interface IAttendenceDoc {
    date: Date;
    emp_id: string;
    present: boolean;
    start_time: Date;
    end_time: Date;
    save(): Promise<IAttendenceDoc>;
}

// Stub model references — replace with real models when implemented
let Employee: any;
let AttendenceBook: any;
try {
    // Attempt to load models if they exist
    const models = require('../models');
    Employee = models.Employee;
    AttendenceBook = models.AttendenceBook;
} catch {
    // Models not yet available — routes will return 501
}

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

        const { name, address, phone, email, salary } = req.body;

        if (!name || !address || isNaN(phone) || isNaN(salary)) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const emp_id = await generateEmpId();
        const newEmployee = new Employee({ emp_id, name, address, phone, email, join_date: new Date(), salary });
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

function parseTimeOnly(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0); // Keep current date but set time
    return time;
}

// Route to mark attendance
router.post('/markAttendance', async (req: Request, res: Response) => {
    try {
        if (!AttendenceBook) {
            return res.status(501).json({ message: 'Employee feature not yet implemented.' });
        }

        const { emp_id, present, start_time, end_time } = req.body;

        if (!emp_id || !start_time || !end_time) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const attendance = new AttendenceBook({
            date: new Date(),  // Today's date
            emp_id,
            present,
            start_time: parseTimeOnly(start_time),
            end_time: parseTimeOnly(end_time),
        });

        await attendance.save();
        res.status(201).json({ message: 'Attendance recorded successfully' });
    } catch (error: unknown) {
        logger.error('Error recording attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
