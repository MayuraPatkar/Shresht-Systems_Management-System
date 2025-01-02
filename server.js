// index.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shreshtSystems';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Routes
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const stockRoutes = require('./routes/stock');
const invoiceRoutes = require('./routes/invoice');
const quotationRoutes = require('./routes/quotation');
const purchaseRoutes = require('./routes/purchaseOrder');
const wayBillRoutes = require('./routes/wayBill');
const serviceRoutes = require('./routes/service');

app.use('/', viewRoutes);
app.use('/login', authRoutes);
app.use('/stock', stockRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/quotation', quotationRoutes);
app.use('/purchaseOrder', purchaseRoutes);
app.use('/wayBill', wayBillRoutes);
app.use('/service', serviceRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
});

module.exports = app;