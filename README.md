# Shresht Systems Management System

A comprehensive desktop management system for Shresht Systems, built with Electron, Express, and MongoDB. This professional application streamlines business processes including quotations, invoices, purchase orders, waybills, employee management, analytics, and communications.

**Version:** 2.6.0  
**Website:** https://shreshtsystems.com

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Usage](#usage)
- [Documentation](#documentation)
- [Development](#development)
- [Security](#security)
- [Collaboration](#collaboration)
- [License](#license)

---

## Features

### Core Modules
- **Quotation Management:** Create, edit, view, and export quotations with professional templates
- **Invoice Management:** Generate, update, and track invoices with payment status
- **Purchase Orders:** Manage supplier orders and track inventory
- **Waybills:** Create and manage waybills for shipments and deliveries
- **Service Management:** Track services, maintenance, and customer support
- **Stock Management:** Monitor inventory levels and stock movements

### Administrative Features
- **Employee Management:** Add, view, and manage employee profiles and attendance
- **Analytics Dashboard:** Visualize business metrics, sales trends, and project statuses
- **Communication:** Send payment reminders and documents via WhatsApp integration
- **Settings:** Admin credentials, company info, and data export/import

### Technical Features
- **Professional Logging:** Winston-based logging with daily rotation
- **Database Backups:** Automated MongoDB backups with timestamp
- **Input Validation:** Comprehensive validation using express-validator
- **Rate Limiting:** Protection against abuse with configurable limits
- **Security Headers:** Helmet.js for secure HTTP headers
- **Error Handling:** Centralized error handling middleware

---

## Project Structure

```
Shresht-Systems_Management-System/
├── src/                           # Application source code
│   ├── config/                    # Configuration
│   │   ├── config.js              # Environment config loader
│   │   └── database.js            # MongoDB connection
│   │
│   ├── models/                    # Mongoose models (separated)
│   │   ├── index.js               # Model exports
│   │   ├── Admin.js               # User/Admin model
│   │   ├── Invoice.js             # Invoice model
│   │   ├── Quotation.js           # Quotation model
│   │   ├── Purchase.js            # Purchase order model
│   │   ├── WayBill.js             # Waybill model
│   │   ├── Service.js             # Service model
│   │   ├── Stock.js               # Stock/inventory model
│   │   ├── Employee.js            # Employee model
│   │   ├── AttendanceBook.js      # Attendance model
│   │   └── Settings.js            # Settings model
│   │
│   ├── routes/                    # Express route handlers
│   │   ├── auth.js                # Authentication routes
│   │   ├── invoice.js             # Invoice CRUD operations
│   │   ├── quotation.js           # Quotation operations
│   │   ├── purchaseOrder.js       # Purchase order routes
│   │   ├── wayBill.js             # Waybill routes
│   │   ├── service.js             # Service routes
│   │   ├── stock.js               # Stock management routes
│   │   ├── employee.js            # Employee routes
│   │   ├── analytics.js           # Analytics endpoints
│   │   ├── comms.js               # Communication routes
│   │   ├── settings.js            # Settings routes
│   │   └── views.js               # View rendering routes
│   │
│   ├── middleware/                # Express middleware
│   │   ├── errorHandler.js        # Centralized error handling
│   │   ├── rateLimiter.js         # Rate limiting (3 limiters)
│   │   └── validators.js          # Input validation rules (12+)
│   │
│   ├── utils/                     # Utility functions
│   │   ├── logger.js              # Winston logger with rotation
│   │   ├── backup.js              # MongoDB backup utility
│   │   ├── initDatabase.js        # Database initialization
│   │   ├── hashPasswords.js       # Password hashing utility
│   │   ├── alertHandler.js        # Electron alert dialogs
│   │   └── printHandler.js        # Print/PDF generation
│   │
│   └── services/                  # Business logic layer (future)
│
├── public/                        # Frontend assets
│   ├── global/                    # Shared styles & scripts
│   │   ├── globalScript.js        # Common frontend logic
│   │   ├── globalStyle.css        # Global styles
│   │   ├── formStyle.css          # Form styles
│   │   ├── viewStyle.css          # View styles
│   │   └── companyConfig.js       # Dynamic company data
│   │
│   ├── invoice/                   # Invoice module
│   │   ├── invoice.html           # Invoice page
│   │   ├── invoice_home.js        # Invoice list
│   │   ├── invoice_form.js        # Invoice form
│   │   └── invoice_view.js        # Invoice viewer
│   │
│   ├── quotation/                 # Quotation module
│   ├── purchaseOrder/             # Purchase order module
│   ├── waybill/                   # Waybill module
│   ├── service/                   # Service module
│   ├── stock/                     # Stock module
│   ├── employees/                 # Employee module
│   ├── analytics/                 # Analytics dashboard
│   ├── comms/                     # Communication module
│   ├── settings/                  # Settings module
│   ├── dashboard/                 # Main dashboard
│   ├── calculations/              # Calculation tools
│   ├── alert/                     # Alert modals
│   ├── assets/                    # Images & icons
│   └── css/                       # Tailwind CSS
│
├── main.js                        # Electron main process
├── server.js                      # Express server entry point
├── preload.js                     # Electron preload (IPC bridge)
├── .env                           # Environment variables
├── package.json                   # Dependencies & scripts
├── tailwind.config.js             # Tailwind configuration
│
├── backups/                       # Database backups
├── logs/                          # Application logs
├── uploads/                       # Uploaded files
└── json/                          # Static data files
```

---

## Getting Started

### Prerequisites

- **Node.js** (v16+ recommended, v18+ for best performance)
- **npm** (comes with Node.js)
- **MongoDB** (v4.0+, local or cloud instance)
  - Local: https://www.mongodb.com/try/download/community
  - Cloud: https://www.mongodb.com/atlas

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MayuraPatkar/Shresht-Systems_Management-System.git
   cd Shresht-Systems_Management-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   
   # MongoDB Configuration
   MONGO_URI=mongodb://127.0.0.1:27017/shreshtSystems
   
   # Security (change in production!)
   JWT_SECRET=your-super-secret-jwt-key-change-this
   SESSION_SECRET=your-session-secret-change-this
   
   # Logging
   LOG_LEVEL=info
   ```

4. **Start the application:**
   ```bash
   npm start
   ```
   
   This will:
   - Build Tailwind CSS
   - Start the Express server
   - Launch the Electron desktop app
   - Connect to MongoDB
   - Initialize default admin user

### Alternative Start Methods

```bash
# Development mode (with hot reload)
npm run dev

# Server only (no Electron window)
npm run server

# Build CSS in watch mode
npm run build-css
```

---

## Architecture

### Technology Stack

- **Frontend:** HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **Backend:** Node.js, Express v5
- **Database:** MongoDB with Mongoose ODM
- **Desktop:** Electron v38
- **Logging:** Winston v3
- **Validation:** express-validator v7
- **Security:** Helmet, bcrypt, express-rate-limit

### Design Patterns

- **MVC Architecture:** Models, Routes (Controllers), Views
- **Middleware Chain:** Rate limiting → Validation → Business logic → Error handling
- **Repository Pattern:** Mongoose models with clean separation
- **Service Layer Ready:** `src/services/` for complex business logic

### Security Features

- ✅ **Helmet.js** - Security headers (CSP, HSTS, etc.)
- ✅ **Rate Limiting** - 3 limiters (auth: 5/15min, API: 100/15min, create: 10/min)
- ✅ **Input Validation** - 12+ validation rule sets
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Context Isolation** - Electron security best practices
- ✅ **CORS** - Configured for localhost only
- ✅ **SQL Injection Protection** - Mongoose parameterized queries

---

## Usage

### First Launch

1. **Default Login:**
   - Username: `admin`
   - Password: `admin123` (change immediately in Settings!)

2. **Update Company Info:**
   - Navigate to **Settings** → **Company Details**
   - Update name, address, GSTIN, bank details, etc.

3. **Add Employees:**
   - Go to **Employees** → **Add New**
   - Fill in employee details

### Creating Documents

#### Quotations
1. Navigate to **Quotation** module
2. Click **New Quotation**
3. Fill in customer details and line items
4. Preview and export as PDF or print

#### Invoices
1. Navigate to **Invoice** module
2. Click **New Invoice**
3. Enter invoice details and items
4. Mark payment status
5. Export or print

#### Purchase Orders, Waybills, Services
- Similar workflow for each module
- Use the sidebar to navigate between modules

### Communication

- **Send Reminders:** Go to **Comms** → Select documents → Send via WhatsApp
- **Track Status:** View sent/pending in communication history

### Analytics

- **Dashboard:** Overview of sales, pending invoices, stock levels
- **Comparison:** Month-over-month, year-over-year analysis
- **Export Data:** Download reports as CSV/PDF

---

## Documentation

### Configuration Files

- **`.env`** - Environment variables (create from `.env.example`)
- **`src/config/config.js`** - Centralized configuration loader
- **`src/config/database.js`** - MongoDB connection with retry logic
- **`tailwind.config.js`** - Tailwind CSS customization

### Database Models

All models are in `src/models/` with:
- Indexes for performance
- Timestamps (createdAt, updatedAt)
- Virtual fields
- Custom methods

**Example:**
```javascript
const { Invoice, Quotation, Employee } = require('./src/models');
```

### API Routes

All routes follow RESTful conventions:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoice/all` | Get all invoices |
| GET | `/invoice/:id` | Get invoice by ID |
| POST | `/invoice/save-invoice` | Create new invoice |
| PUT | `/invoice/:id` | Update invoice |
| DELETE | `/invoice/:id` | Delete invoice |

### Middleware

**Error Handling:**
```javascript
const { asyncHandler } = require('./src/middleware/errorHandler');

router.get('/data', asyncHandler(async (req, res) => {
    // Errors automatically caught and handled
}));
```

**Validation:**
```javascript
const validators = require('./src/middleware/validators');

router.post('/save', 
    validators.createInvoice,  // Validate input
    asyncHandler(async (req, res) => {
        // Validated data available
    })
);
```

### Logging

Winston logger with daily rotation:

```javascript
const logger = require('./src/utils/logger');

logger.info('Application started');
logger.error('Error occurred:', error);
logger.warn('Warning message');
```

Logs stored in `logs/`:
- `app.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Uncaught exceptions

---

## Development

### Available Scripts

```bash
# Start production build
npm start

# Development mode (hot reload)
npm run dev

# Backend server only
npm run server

# Build CSS (watch mode)
npm run build-css

# Build CSS (production, minified)
npm run build-css-prod

# Database backup
npm run backup

# View logs
npm run logs

# Clean build artifacts
npm run clean
```

### Project Guidelines

- **Code Style:** Follow existing patterns
- **Commits:** Use clear, descriptive messages
- **Testing:** Test before committing
- **Documentation:** Update README for new features

### Adding New Features

1. **Model:** Add in `src/models/`
2. **Routes:** Add in `src/routes/`
3. **Validation:** Add rules in `src/middleware/validators.js`
4. **Frontend:** Add in `public/<module>/`
5. **Test:** Verify all CRUD operations

---

## Security

### Best Practices Implemented

- ✅ No `nodeIntegration` in Electron renderer
- ✅ Context isolation enabled
- ✅ Secure IPC communication via preload script
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ Password hashing with bcrypt
- ✅ Environment-based secrets
- ✅ HTTPS-ready configuration
- ✅ Security headers via Helmet
- ✅ CORS restricted to localhost

### Production Checklist

- [ ] Change default admin password
- [ ] Update JWT_SECRET and SESSION_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB with authentication
- [ ] Enable HTTPS
- [ ] Review and update CORS settings
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Run security audit: `npm audit`

---

---

## Collaboration

We welcome contributions! Here's how to get involved:

### Contributing

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Shresht-Systems_Management-System.git
   cd Shresht-Systems_Management-System
   ```

3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes:**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

5. **Test your changes:**
   ```bash
   npm start
   # Test all affected features
   ```

6. **Commit with clear messages:**
   ```bash
   git add .
   git commit -m "feat: Add new feature description"
   ```
   
   Use conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test additions/changes
   - `chore:` Build/tool changes

7. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request:**
   - Describe your changes clearly
   - Reference any related issues
   - Include screenshots if UI changes

### Development Guidelines

- **Code Quality:**
  - Write clean, readable code
  - Use meaningful variable/function names
  - Follow DRY (Don't Repeat Yourself) principle
  
- **Testing:**
  - Test all CRUD operations
  - Verify error handling
  - Check edge cases

- **Documentation:**
  - Update README for new features
  - Add JSDoc comments for functions
  - Document API endpoints

- **Security:**
  - Never commit secrets or passwords
  - Validate all user inputs
  - Follow security best practices

### Reporting Issues

Found a bug or have a suggestion?

1. **Search existing issues** to avoid duplicates
2. **Open a new issue** with:
   - Clear title
   - Detailed description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Feature Requests

- Open an issue with `[Feature Request]` in the title
- Explain the use case and benefits
- Provide examples or mockups if possible

---

## Troubleshooting

### Common Issues

**MongoDB Connection Failed:**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows: net start MongoDB
# Linux/Mac: sudo systemctl start mongod
```

**Port Already in Use:**
```bash
# Change PORT in .env file
PORT=3001
```

**Module Not Found:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Electron Won't Start:**
```bash
# Try clearing cache
npm cache clean --force
npm install
```

### Getting Help

- 📖 Read the documentation in `docs/` folder
- 🐛 Check [existing issues](https://github.com/MayuraPatkar/Shresht-Systems_Management-System/issues)
- 💬 Open a new issue with detailed information
- 📧 Contact: support@shreshtsystems.com

---

## Changelog

### Version 2.6.0 (2025-10-19)
- ✅ **Fixed:** MongoDB deprecation warnings removed
- ✅ **Restructured:** Professional MVC architecture with src/ directory
- ✅ **Added:** Winston logging with daily rotation
- ✅ **Added:** Input validation middleware (12+ rule sets)
- ✅ **Added:** Rate limiting (3 configurable limiters)
- ✅ **Added:** Centralized error handling
- ✅ **Improved:** Security with Helmet.js and CORS
- ✅ **Moved:** Handlers to src/utils/ for better organization
- ✅ **Separated:** Database models into individual files
- ✅ **Updated:** All packages to latest stable versions

### Version 2.5.6 (Previous)
- Initial structured release

---

## Acknowledgments

- Built with ❤️ for Shresht Systems
- Powered by [Electron](https://www.electronjs.org/), [Express](https://expressjs.com/), and [MongoDB](https://www.mongodb.com/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Font Awesome](https://fontawesome.com/)

---

## License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2025 Mayura Patkar - Shresht Systems

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## Contact & Support

- 🌐 **Website:** [https://shreshtsystems.com](https://shreshtsystems.com)
- 📧 **Email:** support@shreshtsystems.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/MayuraPatkar/Shresht-Systems_Management-System/issues)
- 📦 **Repository:** [GitHub](https://github.com/MayuraPatkar/Shresht-Systems_Management-System)

---

<div align="center">

**Made with ❤️ by [Mayura Patkar](https://github.com/MayuraPatkar) for Shresht Systems**

⭐ **Star this repo if you find it helpful!** ⭐

</div>
