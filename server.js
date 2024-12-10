const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === '123') {
        // Send success response with 200 status
        res.status(200).json({ message: 'Login successful' });
    } else {
        // Send failure response with 401 status
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/billing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'billing.html'));
});

app.get('/quotaion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quotation.html'));
});


app.get('/wayBill', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'wayBill.html'));
});


app.get('/postorder', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'postOrder.html'));
});


app.get('/stock', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stock.html'));
});


app.get('/employee', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'employee.html'));
});


app.get('/database', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'database.html'));
});


app.get('/analitics', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analitics.html'));
});


app.get('/management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'management.html'));
});



app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
});

module.exports = app;
