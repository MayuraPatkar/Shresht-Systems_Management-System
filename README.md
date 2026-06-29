# Shresht Systems Management System

A comprehensive desktop management system for Shresht Systems, built with Electron, Express, and MongoDB. This professional application streamlines business processes including quotations, invoices, purchase orders, waybills, service management, stock tracking, reports, analytics, and communications.

**Version:** 4.0.0  
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
- **Quotation Management:** Create, edit, view, and export quotations with professional templates. Fully migrates converted quotations with active links to corresponding invoices.
- **Invoice Management:** Generate, update, and track invoices with payment status and stock deduction. Includes smart payment calculation & tracking.
- **Purchase Orders:** Manage supplier orders, track inventory, and link purchase documents seamlessly.
- **Waybills:** Create and manage waybills for shipments and deliveries.
- **Service Management:** Track services, maintenance with automatic stock deduction for parts used.
- **Stock Management:** Monitor inventory levels, stock movements, and low stock alerts.

### Reports Module
- **Stock Report:** Track all stock in/out movements with date filters and item search.
- **Monthly GST Report:** Invoice-based tax summaries with HSN/SAC breakdown.
- **Data Worksheet:** Solar installation calculator with energy savings estimates (migrated from Calculations).
- **Print/PDF Export:** All reports support print and PDF generation.

### Administrative Features
- **Employee Management:** Add, view, and manage employee profiles and attendance.
- **Analytics Dashboard:** Visualize business metrics, sales trends, and project statuses.
- **Communication:** Send payment reminders and documents via WhatsApp integration.
- **Settings:** Admin credentials, company info, backup/restore, and data export/import.

### Technical Features
- **Unit Testing Suite (NEW):** Robust backend test suite powered by Vitest (`npm test`).
- **Dynamic Data Migrations (NEW):** Batch migrations (V2) with smart dependency-resolving logic for status updates (e.g. converting quotation statuses, tracking purchase orders to received purchases, and compiling payment progress).
- **Human-Readable ID Resolutions (NEW):** Automatic resolution of raw MongoDB ObjectIDs to their user-facing document numbers on payment records and logs.
- **UI & Grid Alignment Enhancements (NEW):** Optimized layouts for customer, supplier, and payment registers (such as displaying primary street address line1 instead of city/state).
- **Professional Logging:** Winston-based logging with daily rotation.
- **Database Backups:** Automated MongoDB backups with timestamp.
- **Input Validation:** Comprehensive validation using express-validator.
- **Rate Limiting:** Protection against abuse with configurable limits.
- **Security Headers:** Helmet.js for secure HTTP headers.
- **Error Handling:** Centralized error handling middleware.
- **Auto Updates:** GitHub-based automatic updates via electron-updater.
- **Stock Movement Tracking:** Automatic logging of all stock changes for audit trails.

---

## Project Structure

```
Shresht-Systems_Management-System/
├── src/                           # Application source code
│   ├── config/                    # Configuration
│   │   ├── config.ts              # Environment config loader
│   │   └── database.ts            # MongoDB connection
│   │
│   ├── models/                    # Mongoose models (.model.ts files)
│   │   ├── index.ts               # Model exports
│   │   ├── User.model.ts          # User/Admin model
│   │   ├── Counter.model.ts       # Auto-increment counters
│   │   ├── Customer.model.ts      # Customer model
│   │   ├── Supplier.model.ts      # Supplier model
│   │   ├── Invoice.model.ts       # Invoice model
│   │   ├── Quotation.model.ts     # Quotation model
│   │   ├── Purchase.model.ts      # Purchase model
│   │   ├── PurchaseOrder.model.ts # Purchase order model
│   │   ├── EWayBill.model.ts      # Waybill model
│   │   ├── Service.model.ts       # Service model
│   │   ├── Stock.model.ts         # Stock/inventory model
│   │   ├── StockMovement.model.ts # Stock movement tracking
│   │   ├── Report.model.ts        # Cached reports model
│   │   ├── Payment.model.ts       # Payment model
│   │   ├── Voucher.model.ts       # Voucher model
│   │   ├── Communication.model.ts # WhatsApp/comms log model
│   │   └── Settings.model.ts      # Settings model
│   │
│   ├── routes/                    # Express route handlers
│   │   ├── auth.route.ts          # Authentication routes
│   │   ├── customer.route.ts      # Customer operations
│   │   ├── supplier.route.ts      # Supplier operations
│   │   ├── invoice.route.ts       # Invoice CRUD + stock deduction
│   │   ├── quotation.route.ts     # Quotation operations
│   │   ├── purchase.route.ts      # Purchase operations
│   │   ├── purchaseOrder.route.ts # Purchase order routes
│   │   ├── eWayBill.route.ts      # Waybill routes
│   │   ├── service.route.ts       # Service routes + stock deduction
│   │   ├── stock.route.ts         # Stock management + movement logging
│   │   ├── payment.route.ts       # Payment operations & resolution
│   │   ├── voucher.route.ts       # Accounting voucher routes
│   │   ├── reports.route.ts       # Reports API
│   │   ├── employee.route.ts      # Employee routes
│   │   ├── analytics.route.ts     # Analytics endpoints
│   │   ├── search.route.ts        # Global search route
│   │   ├── comms.route.ts         # Communication routes
│   │   ├── settings.route.ts      # Settings routes
│   │   └── views.route.ts         # View rendering routes
│   │
│   ├── middleware/                # Express middleware
│   │   ├── errorHandler.ts        # Centralized error handling
│   │   ├── rateLimiter.ts         # Rate limiting (3 limiters)
│   │   └── validators.ts          # Input validation rules (12+)
│   │
│   └── utils/                     # Utility functions
│       ├── logger.ts              # Winston logger with rotation
│       ├── backup.ts              # MongoDB backup utility
│       ├── backupScheduler.ts     # Automated backup scheduler
       ├── idGenerator.ts         # Sequential ID generator
│       ├── initDatabase.ts        # Database initialization
│       ├── hashPasswords.ts       # Password hashing utility
│       ├── alertHandler.ts        # Electron alert dialogs
│       ├── printHandler.ts        # Legacy print handler
│       └── quotationPrintHandler.ts # Native Electron print/PDF
│
├── public/                        # Frontend assets
│   ├── customer/                  # Customer module
│   ├── supplier/                  # Supplier module
│   ├── invoice/                   # Invoice module
│   ├── purchaseOrder/             # Purchase order module
│   ├── ewaybill/                  # Waybill module
│   ├── service/                   # Service module
│   ├── stock/                     # Stock module
│   ├── payment/                   # Payment module
│   │   ├── payment.html           # Main view template
│   │   └── src/                   # Main module sources
│   │       ├── main.ts            # Entry and table render logic
│   │       └── components/
│   │           └── details.ts     # Expanded reference info view
│   │
│   ├── reports/                   # Reports module
│   ├── dashboard/                 # Main dashboard
│   ├── comms/                     # Communication module
│   ├── calculations/              # Calculation tools
│   ├── settings/                  # Settings module
│   ├── alert/                     # Alert modals
│   ├── assets/                    # Images & icons
│   └── index.html                 # Login page
│
├── src/main.ts                    # Electron main process
├── src/server.ts                  # Express server entry point
├── src/preload.ts                 # Electron preload (IPC bridge)
├── .env                           # Environment variables
├── package.json                   # Dependencies & scripts
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # Compiler configuration for server
├── tsconfig.public.json           # Compiler configuration for frontend
├── vitest.config.ts               # Testing environment config
│
├── backups/                       # Database backups
├── logs/                          # Application logs
├── resources/bin/                 # External binaries (mongodump)
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

# Build for distribution
npm run build

# Build and publish release
npm run release
```

### Note for Packaged Builds

When the app is packaged into an Electron build, the application resources are bundled into an `app.asar` archive, which is read-only at runtime. The server and utilities write generated documents (PDFs) and backups to the application's user data folder (Electron's `userData`) by default.

If you need to write generated PDFs or uploads to a custom path, set the `UPLOADS_DIR` environment variable to a writable path outside the `app.asar` archive before starting the app. Example (Windows PowerShell):

```powershell
# Windows - set environment variable then start the app
$env:UPLOADS_DIR = 'C:\Users\<your_user>\AppData\Local\MyApp\uploads\documents'
npm start
```

The startup logic prefers `UPLOADS_DIR` if present, then the `userData` folder, and finally falls back to a local `uploads` path for development runs.

### WhatsApp (API) configuration

When using WhatsApp integration, you may configure credentials via one of the following methods depending on your deployment model:

- Development or server builds: Add credentials to your `.env` file (or system env), for example:

```powershell
# Windows PowerShell (dev):
$env:WHATSAPP_TOKEN = '<your_access_token>'
$env:PHONE_NUMBER_ID = '<your_phone_number_id>'
# Optional: base url used for PDFs shared via WhatsApp
$env:WHATSAPP_PDF_BASE_URL = 'https://yourdomain.com'
npm run server
```

- Packaged desktop application (recommended):
   - Open the application and go to **Settings → Communications**.
   - Enter the **Phone Number ID** and **PDF Base URL** into the non-secret fields.
   - Use the **Set WhatsApp Token** secure input to store the access token. The token will be stored in the OS keychain using `keytar`, so you don't need to manage environment variables on the user's machine.

- Cloud / Automated deployments: Use your cloud provider's secrets manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault) and inject the runtime environment variable `WHATSAPP_TOKEN` in the host/VM/container environment.

Important:
- The app prefers these credentials in this order: env vars → OS keychain → application settings. If no credentials are configured, WhatsApp features will be disabled and a helpful message will be shown.
- Do not commit tokens to source control. Use a secret manager or the secure in-app store.

Uploads lifetime & cleanup
-------------------------
The application automatically cleans up PDF files generated in the `uploads/documents` directory.
- On startup and once per day, the application removes PDF files older than `uploadsRetentionDays` (default 7 days). You can change this by setting `UPLOADS_RETENTION_DAYS` environment variable or change `uploadsRetentionDays` in `src/config/config.js`.
- When PDF files are uploaded to cloud storage (Cloudinary), the local copy is removed immediately after successful upload.
 - Administrators can also trigger immediate cleanup using the Settings UI (or API endpoint `POST /settings/cleanup/uploads`) to remove old files immediately.
This helps keep disk usage under control and ensures temporary files don't accumulate.


---

## Architecture

### Technology Stack

- **Frontend:** HTML5, CSS3 (Tailwind CSS v4), Vanilla JavaScript
- **Backend:** Node.js, Express v5
- **Database:** MongoDB with Mongoose v9 ODM
- **Desktop:** Electron v39
- **Logging:** Winston v3
- **Validation:** express-validator v7
- **Security:** Helmet v8, bcryptjs, express-rate-limit
- **PDF Generation:** Native Electron BrowserWindow (printToPDF)
- **Auto Updates:** electron-updater v6

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
- Services now automatically deduct stock for parts used

### Reports (NEW)

Navigate to **Reports** from the sidebar to access:

1. **Stock Report:**
   - Filter by date range, movement type, or item name
   - View all stock in/out movements with references
   - Print or save as PDF

2. **Monthly GST Report:**
   - Select month and year
   - View HSN/SAC-wise tax breakdown
   - See invoice-level details
   - Export for GST filing

3. **Data Worksheet:**
   - Enter solar installation parameters
   - Get energy production estimates
   - Calculate monthly savings
   - Compare PM SGY subsidy options
   - Generate professional worksheet PDF

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

# Build Windows installer
npm run build

# Build and publish to GitHub
npm run release

# Run database migrations
npm run migrate
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
   Run the backend unit test suite using Vitest:
   ```bash
   npm test
   ```
   Or launch the application in development mode:
   ```bash
   npm run dev
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
- 📧 **Email:** shreshtsystems@gmail.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/MayuraPatkar/Shresht-Systems_Management-System/issues)
- 📦 **Repository:** [GitHub](https://github.com/MayuraPatkar/Shresht-Systems_Management-System)

---