const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const config = require('./config');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));

// MongoDB Connection
async function connectDB() { // Use async function for cleaner promise handling
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Successfully connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        console.error('Exiting process due to database connection failure');
        process.exit(1); // Exit the process on critical failure
    }
}

connectDB(); // Call the database connection function

// Routes - Importing route modules
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const stockRoutes = require('./routes/stock');
const invoiceRoutes = require('./routes/invoice');
const quotationRoutes = require('./routes/quotation');
const purchaseRoutes = require('./routes/purchaseOrder');
const wayBillRoutes = require('./routes/wayBill');
const serviceRoutes = require('./routes/service');

// Using routes middleware
app.use('/', viewRoutes);
app.use('/login', authRoutes);
app.use('/stock', stockRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/quotation', quotationRoutes);
app.use('/purchaseOrder', purchaseRoutes);
app.use('/wayBill', wayBillRoutes);
app.use('/service', serviceRoutes);

// Centralized Error Handling Middleware (Example - adjust based on your needs)
app.use((err, req, res, next) => {
    console.error('Global error handler caught an error:', err);
    if (res.headersSent) { // Check if headers already sent to prevent error after response sent
        return next(err); // Delegate to default Express error handler
    }
    res.status(500).send({ error: 'Something went wrong!', details: err.message }); // Send generic error response
});


// Start the server
const server = app.listen(config.port, () => { 
    console.log(`Express server running at http://localhost:${config.port}`);
});

// Handle server startup errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;
    switch (error.code) {
        case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});


module.exports = app;