import express from 'express';
import { verifyEvidence, streamEvidence } from '../controllers/evidenceController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const STAFF_ROLES = ['ADMIN', 'INVESTIGATOR', 'ANALYST'];

router.post('/:id/verify', verifyToken, requireRole(STAFF_ROLES), verifyEvidence);
router.get('/:id/download', verifyToken, requireRole(STAFF_ROLES), streamEvidence);

export default router;
