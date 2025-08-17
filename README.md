# Shresht Systems Management System

A comprehensive management system for Shresht Systems, built with Electron, Express, and MongoDB. This application streamlines business processes such as quotations, invoices, purchase orders, waybills, employee management, analytics, and communications.

Shresht Systems - https://shreshtsystems.com

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Documentation](#documentation)
- [Collaboration](#collaboration)
- [License](#license)

---

## Features

- **Quotation Management:** Create, edit, view, and export quotations.
- **Invoice Management:** Generate, update, and track invoices with payment status.
- **Purchase Orders:** Manage supplier orders and inventory.
- **Waybills:** Create and manage waybills for shipments.
- **Employee Management:** Add, view, and manage employee profiles.
- **Analytics Dashboard:** Visualize business metrics and project statuses.
- **Communication:** Send payment reminders and documents via WhatsApp.
- **Settings:** Admin info, credential management, and data export.

---

## Project Structure

```
.
├── main.js                # Electron main process
├── server.js              # Express backend server
├── preload.js             # Electron preload script
├── alertHandler.js        # Custom alert dialogs
├── printHandler.js        # Print/PDF handling
├── config.js              # Configuration
├── routes/                # Express route handlers
├── public/                # Frontend HTML, CSS, JS
│   ├── global/            # Shared styles/scripts
│   ├── invoice/           # Invoice UI & logic
│   ├── quotation/         # Quotation UI & logic
│   ├── purchaseOrder/     # Purchase order UI & logic
│   ├── waybill/           # Waybill UI & logic
│   ├── employees/         # Employee UI & logic
│   ├── analytics/         # Analytics dashboard
│   ├── comms/             # Communication module
│   ├── service/           # Service management
│   └── assets/            # Images and icons
├── json/                  # Static data (e.g., company info)
├── package.json           # Project metadata and scripts
└── ...
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (local or cloud)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/mayura01/shresht-systems-management-system.git
   cd shresht-systems-management-system
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment:**
   - Edit `config.js` or use `.env` for MongoDB URI and other settings as needed.

4. **Start the application:**
   ```sh
   npm start
   ```
   This will launch the Electron app and start the backend server.

---

## Usage

- **Login:** Use the default admin credentials (see [`json/info.json`](json/info.json)) or set your own in the settings.
- **Navigate:** Use the sidebar to access Quotations, Invoices, Purchase Orders, Waybills, Employees, Analytics, and Settings.
- **Create/Edit:** Use the forms to create or update records. Preview and export documents as PDF or print directly.
- **Communicate:** Send reminders and documents via the Comms module.

---

## Documentation

### Main Modules

- **Backend API:**  
  - All Express routes are in [`routes/`](routes/) (e.g., [`routes/invoice.js`](routes/invoice.js), [`routes/quotation.js`](routes/quotation.js)).
  - MongoDB schemas are defined in [`routes/database.js`](routes/database.js).

- **Frontend:**  
  - Each business module has its own folder in [`public/`](public/), e.g., [`public/invoice/`](public/invoice/), [`public/quotation/`](public/quotation/).
  - Shared styles/scripts are in [`public/global/`](public/global/).

- **Printing & Alerts:**  
  - Print and PDF export logic: [`printHandler.js`](printHandler.js)
  - Custom alert dialogs: [`alertHandler.js`](alertHandler.js)

### Key Files

- [`main.js`](main.js): Electron main process, window creation, logging, and integration.
- [`server.js`](server.js): Express server entry point.
- [`preload.js`](preload.js): Secure IPC bridge for Electron renderer.
- [`package.json`](package.json): Scripts and dependencies.

### Data Model

- **Quotations:**  
  See schema in [`routes/database.js`](routes/database.js) and API in [`routes/quotation.js`](routes/quotation.js).
- **Invoices:**  
  See schema in [`routes/database.js`](routes/database.js) and API in [`routes/invoice.js`](routes/invoice.js).
- **Waybills, Purchase Orders, Employees:**  
  Similar structure in their respective files.

### Customization

- **Company Info:**  
  Update [`json/info.json`](json/info.json) for company details, GSTIN, bank info, etc.
- **Branding:**  
  Replace images in [`public/assets/`](public/assets/).

---

## Collaboration

We welcome contributions! Please follow these steps:

1. **Fork the repository** on GitHub.
2. **Clone your fork:**
   ```sh
   git clone https://github.com/YOUR-USERNAME/shresht-systems-management-system.git
   ```
3. **Create a new branch:**
   ```sh
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit:
   ```sh
   git add .
   git commit -m "Describe your changes"
   ```
5. **Push to your fork:**
   ```sh
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** on GitHub, describing your changes and referencing any related issues.

### Contribution Guidelines

- Write clear, concise commit messages.
- Follow the existing code style and structure.
- Add comments and documentation for new features.
- Test your changes before submitting a PR.
- For major changes, open an issue first to discuss your proposal.

---

## License

This project is licensed under the ISC License. See [`LICENSE`](LICENSE) for details.

---

**For any questions or support, please open an issue
