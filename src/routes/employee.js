const express = require('express');
const router = express.Router();
const { Employee, AttendenceBook } = require('../models');
const log = require("electron-log"); // Import electron-log in the preload process


// Function to generate unique 3-digit Employee ID starting from 101
async function generateEmpId() {
    const lastEmployee = await Employee.findOne().sort({ EmpID: -1 });
    return lastEmployee ? lastEmployee.emp_id + 1 : 101;
}

// Route to add a new employee
router.post('/addEmp', async (req, res) => {
    try {
        const { name, address, phone, email, salary } = req.body;

        if (!name || !address || isNaN(phone) || isNaN(salary)) {
            return res.status(400).json({ message: 'Invalid input. Please provide all required fields correctly.' });
        }

        const emp_id = await generateEmpId();
        const newEmployee = new Employee({ emp_id, name, address, phone, email, join_date: new Date(), salary });
        await newEmployee.save();

        res.status(201).json({ message: 'Employee added successfully', employee: newEmployee });
    } catch (error) {
        log.error('Error adding employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to get all employees
router.get('/getEmployees', async (req, res) => {
    try {
        // Use lean() for better performance when no Mongoose methods needed
        const employees = await Employee.find()
            .select('emp_id name address phone email join_date salary')
            .lean();
        res.status(200).json({ employees });
    } catch (error) {
        log.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


function parseTimeOnly(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0); // Keep current date but set time
    return time;
}

// Route to mark attendance
router.post('/markAttendance', async (req, res) => {
    try {
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
    } catch (error) {
        log.error('Error recording attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
