import express from 'express';
import { getAllSettings, updateSettings, uploadManifestoPDF } from '../controllers/settingsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Publicly readable
router.get('/', getAllSettings);

// Admin only update
router.patch('/', verifyToken, requireRole(['admin', 'superadmin']), updateSettings);

// Admin only PDF upload
router.post('/manifesto-pdf', verifyToken, requireRole(['admin', 'superadmin']), uploadManifestoPDF);

export default router;
