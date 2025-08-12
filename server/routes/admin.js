import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllCandidates,
  getDeployedCandidates,
  getRejectedCandidates,
  getAdminStats,
  updateCandidateNotes,
  getCandidateDetails
} from '../controllers/adminController.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Core Admin functions
router.get('/candidates', getAllCandidates);
router.get('/stats', getAdminStats);

// 3-Card Layout Routes
router.get('/deployed-candidates', getDeployedCandidates);
router.get('/rejected-candidates', getRejectedCandidates);

// Admin specific functions
router.put('/update-notes/:candidateId', updateCandidateNotes);
router.get('/candidate-details/:candidateId', getCandidateDetails);

export default router;