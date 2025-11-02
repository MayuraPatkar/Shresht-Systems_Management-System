/**
 * @file Data Backup and Restore Management
 * @summary Handles data export, collection restore, database restore, and backup tools status
 */

// --- BACKUP TOOLS STATUS ---

/**
 * Check if backup tools are available on the system.
 * This helps inform users if MongoDB tools need to be installed.
 */
function checkBackupToolsStatus() {
    fetch('/settings/backup/status')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tools = data.tools;
                const allToolsAvailable = Object.values(tools).every(available => available);
                
                if (!allToolsAvailable) {
                    console.warn('Some MongoDB tools are not available:', tools);
                    const statusElement = document.getElementById("backup-status");
                    if (statusElement) {
                        statusElement.className = "text-orange-700 font-medium";
                        statusElement.innerText = "Warning: Some MongoDB backup tools are not installed. Native backup will be used.";
                    }
                }
            }
        })
        .catch(err => {
            console.error('Failed to check backup tools status:', err);
        });
}

// --- DATA EXPORT ---

/**
 * Handles the "Export Data" button click.
 * It identifies which data set (e.g., 'customers', 'inventory') is selected
 * and sends a GET request to the server to trigger the export process.
 */
function handleExportData() {
    const selectedElement = document.querySelector('input[name="export-data"]:checked');
    const statusElement = document.getElementById("backup-status");
    const exportButton = document.getElementById("export-data-button");
    
    if (!selectedElement) {
        window.electronAPI.showAlert1("Please select a data type to export.");
        return;
    }
    
    const selected = selectedElement.value;
    const originalContent = exportButton.innerHTML;
    exportButton.disabled = true;
    exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    
    statusElement.innerText = `Exporting ${selected} data...`;
    statusElement.className = "text-blue-700 font-medium";

    fetch(`/settings/backup/export/${selected}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium";
                statusElement.innerText = data.message;
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB)`;
                }
            } else {
                statusElement.className = "text-red-700 font-medium";
                statusElement.innerText = `Export failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-red-700 font-medium";
            statusElement.innerText = `Export failed: ${err.message}`;
            console.error('Export error:', err);
        })
        .finally(() => {
            exportButton.disabled = false;
            exportButton.innerHTML = originalContent;
        });
}

// --- COLLECTION RESTORE ---

/**
 * Handles the "Restore Collection" button click.
 * It takes the selected backup file and collection name, packages them into
 * a FormData object, and sends a POST request to restore the specific collection.
 */
function handleRestoreCollection() {
    const fileInput = document.getElementById("restore-collection-file");
    const statusElement = document.getElementById("backup-status");

    if (fileInput.files.length === 0) {
        window.electronAPI.showAlert1("Please select a backup file.");
        return;
    }

    // Validate file type
    const file = fileInput.files[0];
    const allowedExtensions = ['.json', '.bson', '.gz', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
        window.electronAPI.showAlert1(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
        window.electronAPI.showAlert1("File size exceeds 100MB limit.");
        return;
    }

    // Validate collection selection
    const collectionSelect = document.getElementById("collection-select");
    if (!collectionSelect || !collectionSelect.value || collectionSelect.value === "Choose collection") {
        window.electronAPI.showAlert1("Please select a collection to restore.");
        return;
    }

    // Use FormData to handle file uploads
    const formData = new FormData();
    formData.append("backupFile", fileInput.files[0]);
    formData.append("collection", collectionSelect.value);

    const restoreButton = document.getElementById("restore-collection-button");
    const originalContent = restoreButton.innerHTML;
    restoreButton.disabled = true;
    restoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

    statusElement.innerText = "Restoring collection...";
    statusElement.className = "text-blue-700 font-medium";

    fetch("/settings/backup/restore-collection", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium";
                statusElement.innerText = data.message;
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
                fileInput.value = "";
            } else {
                statusElement.className = "text-red-700 font-medium";
                statusElement.innerText = `Restore failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-red-700 font-medium";
            statusElement.innerText = `Restore failed: ${err.message}`;
            console.error('Restore error:', err);
        })
        .finally(() => {
            restoreButton.disabled = false;
            restoreButton.innerHTML = originalContent;
        });
}

// --- DATABASE RESTORE ---

/**
 * Handles the "Restore Database" button click.
 * It takes the selected backup file and sends it as FormData in a POST request
 * to restore the entire database.
 */
function handleRestoreDatabase() {
    const fileInput = document.getElementById("restore-database-file");
    const statusElement = document.getElementById("backup-status");

    if (fileInput.files.length === 0) {
        window.electronAPI.showAlert1("Please select a backup file.");
        return;
    }

    // Validate file type (only BSON formats for database restore)
    const file = fileInput.files[0];
    const allowedExtensions = ['.bson', '.gz', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
        window.electronAPI.showAlert1(`Invalid file type for database restore. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
        window.electronAPI.showAlert1("File size exceeds 100MB limit.");
        return;
    }

    // Confirm action with user
    window.electronAPI.showAlert2(
        "Are you sure you want to restore the entire database? This will replace ALL existing data!",
        (response) => {
            if (response === 'Yes' || response === true) {
                performDatabaseRestore(file, statusElement);
            }
        }
    );
}

/**
 * Performs the actual database restore operation
 */
function performDatabaseRestore(file, statusElement) {
    const formData = new FormData();
    formData.append("backupFile", file);

    statusElement.innerText = "Restoring database...";
    statusElement.className = "text-blue-700 font-medium";

    fetch("/settings/backup/restore-database", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                statusElement.className = "text-green-700 font-medium";
                statusElement.innerText = data.message;
                if (data.warning) {
                    statusElement.innerText += ` Warning: ${data.warning}`;
                }
                if (data.fileSize) {
                    statusElement.innerText += ` (${(data.fileSize / 1024).toFixed(2)} KB processed)`;
                }
                document.getElementById("restore-database-file").value = "";
            } else {
                statusElement.className = "text-red-700 font-medium";
                statusElement.innerText = `Database restore failed: ${data.message}`;
            }
        })
        .catch(err => {
            statusElement.className = "text-orange-700 font-medium";
            statusElement.innerText = `Database restore failed: ${err.message}`;
            console.error('Database restore error:', err);
        });
}

// --- GOOGLE DRIVE BACKUP ---

/**
 * Handles the "Google Drive Backup" button click.
 * Shows a notification that cloud backup is not yet implemented.
 */
function handleGoogleDriveBackup() {
    window.electronAPI.showAlert1("Cloud backup feature is coming soon! Currently, you can use local export/restore.");
}

// --- EVENT LISTENERS ---

/**
 * Initialize backup module event listeners
 */
function initBackupModule() {
    document.getElementById("export-data-button")?.addEventListener("click", handleExportData);
    document.getElementById("restore-collection-button")?.addEventListener("click", handleRestoreCollection);
    document.getElementById("restore-database-button")?.addEventListener("click", handleRestoreDatabase);
    document.getElementById("google-drive-backup")?.addEventListener("click", handleGoogleDriveBackup);
}
