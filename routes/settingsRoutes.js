import express from 'express';
import { getAllSettings, updateSettings } from '../controllers/settingsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Publicly readable
router.get('/', getAllSettings);

// Admin only update
router.patch('/', verifyToken, requireRole(['admin', 'superadmin']), updateSettings);

export default router;
