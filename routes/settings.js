const express = require("express");
const { exec } = require("child_process");
const { dialog } = require("electron"); // Electron’s dialog
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const router = express.Router();

// Export selected collection to JSON
router.get("/settings/backup/export/:collection", async (req, res) => {
    const collection = req.params.collection;

    try {
        // Ask user where to save JSON file
        const result = await dialog.showSaveDialog({
            title: `Export ${collection} data`,
            defaultPath: `${collection}-${new Date().toISOString().split("T")[0]}.json`,
            filters: [{ name: "JSON Files", extensions: ["gz"] }]
        });

        if (result.canceled) {
            return res.json({ message: "Export cancelled by user" });
        }

        const filePath = result.filePath;

        // Use mongoexport to export as JSON
        const cmd = `mongoexport --db shreshtSystems --collection ${collection} --out "${filePath}" --jsonArray`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error("Export failed:", err);
                return res.status(500).json({ message: "Export failed" });
            }
            console.log("Export successful:", filePath);
            return res.json({ message: `Export successful! Saved to: ${filePath}` });
        });

    } catch (err) {
        console.error("Dialog error:", err);
        return res.status(500).json({ message: "Error showing save dialog" });
    }
});

// Multer config → store uploaded file temporarily
const upload = multer({ dest: path.join(__dirname, "../uploads/") });

// Restore from backup
router.post("/backup/restore", upload.single("backupFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No backup file uploaded" });
    }

    const filePath = req.file.path; // Temp path where multer saved it
    const originalName = req.file.originalname;

    let cmd;

    if (originalName.endsWith(".json")) {
        // JSON backup → use mongoimport
        cmd = `mongoimport --db shreshtSystems --file "${filePath}" --jsonArray --drop`;
    } else if (originalName.endsWith(".bson") || originalName.endsWith(".gz") || originalName.endsWith(".zip")) {
        // BSON/mongodump backup → use mongorestore
        // (supports gzipped BSON dumps as well)
        cmd = `mongorestore --db shreshtSystems --drop --archive="${filePath}" --gzip`;
    } else {
        return res.status(400).json({ message: "Unsupported file format" });
    }

    exec(cmd, (err, stdout, stderr) => {
        fs.unlinkSync(filePath); // cleanup temp upload

        if (err) {
            console.error("Restore failed:", err);
            return res.status(500).json({ message: "Restore failed" });
        }

        console.log("Restore successful:", originalName);
        return res.json({ message: `Restore successful from ${originalName}` });
    });
});


module.exports = router;
