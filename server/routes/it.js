import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllCandidates,
  assignOfficeEmail,
  getITStats,
  getDeployedCandidates,
  getRejectedCandidates
} from '../controllers/itController.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Core IT functions
router.get('/candidates', getAllCandidates);
router.put('/assign-office-email/:candidateId', assignOfficeEmail);
router.get('/stats', getITStats);

// 3-Card Layout Routes
router.get('/deployed-candidates', getDeployedCandidates);
router.get('/rejected-candidates', getRejectedCandidates);

export default router;