Shresht Systems Management System is a professional windows desktop application for business operations management. Here's the breakdown:

Languages & Frameworks
Frontend: HTML5, CSS3 (Tailwind CSS v4), Vanilla JavaScript
Backend: Node.js + Express v5 (TypeScript)
Database: MongoDB with Mongoose v9
Desktop: Electron v39 (packaged Electron app with auto-updates)
Build: TypeScript, Tailwind CSS CLI, Webpack-via-Electron-Builder
How It Works
Three-layer architecture:

Electron Desktop App (main.js) – Window management, file system access, auto-updates
Express Backend (server.js) – REST API, MongoDB operations, business logic, security
Frontend UI (public/) – Module-based views (Quotation, Invoice, Purchase Orders, Services, Stock, Reports, Analytics)
Key workflows:

Create business documents (quotations, invoices, purchase orders, waybills, services) with automatic stock tracking
Generate PDFs natively using Electron's printToPDF
Track stock movements with automatic deduction when documents are created/modified
Generate reports (stock reports, GST summaries, solar calculation worksheets)
Communicate via WhatsApp integration
Automated MongoDB backups and daily log rotation
Rate limiting, input validation, and security headers (Helmet)
Database models: Admin/User, Invoice, Quotation, Purchase, WayBill, Service, Stock, StockMovement (audit trail), Report (cached), Employee, Attendance, Settings

Development experience: TypeScript compilation in watch mode, concurrent Tailwind CSS build, hot reload via Electron/npm tasks, comprehensive logging with Winston, and a build npm script for packaged distribution.

The app uses multi-stage Docker builds to compile everything, then runs the Express server in production on port 3000. It's production-ready with security best practices, error handling, and database migrations included.