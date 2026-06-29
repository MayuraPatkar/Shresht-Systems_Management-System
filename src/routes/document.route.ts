import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { CustomDocument } from '../models';
import logger from '../utils/logger';
import { previewNextId, generateNextId, syncCounterIfNeeded } from '../utils/idGenerator';

const router: Router = Router();

// GET /document/generate-id
router.get("/generate-id", async (_req: Request, res: Response) => {
    try {
        const documentNumber = await previewNextId('document');
        return res.status(200).json({ documentNumber });
    } catch (err: unknown) {
        logger.error('Error generating document id preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate document id' });
    }
});

// GET /document/all
router.get("/all", async (req: Request, res: Response) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        const query: any = includeDeleted ? {} : { is_deleted: { $ne: true } };
        const documents = await CustomDocument.find(query).sort({ createdAt: -1 }).lean();
        return res.status(200).json(documents);
    } catch (error: unknown) {
        logger.error("Error fetching custom documents:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /document/search/:query
router.get("/search/:query", async (req: Request, res: Response) => {
    try {
        const searchQuery = String(req.params.query || '').trim();
        if (!searchQuery) {
            return res.status(400).json({ error: "Search query is required" });
        }
        
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const query = {
            is_deleted: { $ne: true },
            $or: [
                { documentNumber: { $regex: regex } },
                { title: { $regex: regex } },
                { recipientName: { $regex: regex } }
            ]
        };
        const documents = await CustomDocument.find(query).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ documents });
    } catch (error: unknown) {
        logger.error("Error searching custom documents:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/details', (_req: Request, _res: Response, next: any) => next('router'));
router.get('/form', (_req: Request, _res: Response, next: any) => next('router'));

// GET /document/:id
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        let query: any = { documentNumber: id };
        if (Types.ObjectId.isValid(id)) {
            query = { $or: [{ _id: id }, { documentNumber: id }] };
        }
        
        const doc = await CustomDocument.findOne(query).lean();
        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }
        return res.status(200).json(doc);
    } catch (error: unknown) {
        logger.error("Error fetching custom document details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /document/save-document
router.post("/save-document", async (req: Request, res: Response) => {
    try {
        const {
            id, // MongoDB ObjectId if updating
            documentNumber,
            date,
            title,
            recipientName,
            recipientAddress,
            recipientPhone,
            body,
            isUpdate
        } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({ message: 'Document Title is required.' });
        }

        const isUpdateBool = isUpdate === true || isUpdate === 'true';
        let doc: any = null;

        if (isUpdateBool && id) {
            if (Types.ObjectId.isValid(id)) {
                doc = await CustomDocument.findById(id);
            }
            if (!doc && documentNumber) {
                doc = await CustomDocument.findOne({ documentNumber });
            }
        }

        const payload = {
            date: date ? new Date(date) : new Date(),
            title: String(title).trim(),
            recipientName: recipientName ? String(recipientName).trim() : '',
            recipientAddress: recipientAddress ? String(recipientAddress).trim() : '',
            recipientPhone: recipientPhone ? String(recipientPhone).trim() : '',
            body: body || '',
        };

        if (!doc) {
            // New Document: generate unique ID
            const newId = await generateNextId('document');
            doc = new CustomDocument({
                ...payload,
                documentNumber: newId,
                is_deleted: false,
                is_archived: false
            });
        } else {
            // Update Document: retain existing documentNumber
            Object.assign(doc, payload);
        }

        const savedDoc = await doc.save();
        return res.status(201).json({
            message: 'Document saved successfully',
            document: savedDoc
        });
    } catch (error: unknown) {
        logger.error("Error saving custom document:", error);
        return res.status(550).json({ message: (error as Error).message || "Internal Server Error" });
    }
});

// DELETE /document/:id
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        let query: any = { documentNumber: id };
        if (Types.ObjectId.isValid(id)) {
            query = { $or: [{ _id: id }, { documentNumber: id }] };
        }

        const doc = await CustomDocument.findOneAndUpdate(query, { is_deleted: true }, { new: true });
        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }
        return res.status(200).json({ message: "Document deleted successfully", document: doc });
    } catch (error: unknown) {
        logger.error("Error deleting custom document:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /document/:id/restore
router.post("/:id/restore", async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        let query: any = { documentNumber: id };
        if (Types.ObjectId.isValid(id)) {
            query = { $or: [{ _id: id }, { documentNumber: id }] };
        }

        const doc = await CustomDocument.findOneAndUpdate(query, { is_deleted: false }, { new: true });
        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }
        return res.status(200).json({ message: "Document restored successfully", document: doc });
    } catch (error: unknown) {
        logger.error("Error restoring custom document:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
