import express from 'express';
import {
  getLDCandidates,
  updateLDStatus,        // ✅ FIXED: Match controller export
  sendToDelivery,        // ✅ FIXED: Match controller export  
  getLDStats
} from '../controllers/ldController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Core L&D functions
router.get('/candidates', getLDCandidates);
router.put('/update-status/:candidateId', updateLDStatus);  // ✅ FIXED
router.post('/send-to-delivery', sendToDelivery);          // ✅ FIXED
router.get('/stats', getLDStats);

export default router;