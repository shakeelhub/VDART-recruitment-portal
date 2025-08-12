import express from 'express';
import {
  addCandidate,
  getCandidates,
  sendCandidatesToTeams,
  getDashboardStats,
  downloadResume,
  uploadMiddleware,
  sendCandidatesToAdmin,
  sendCandidatesToAdminAndLD,
  getAdminCandidates,
  getDeployedCandidates,
  getRejectedCandidates,
  getDeployedStats,
  sendToHROpsForPermanentID,
  updateCandidate
} from '../controllers/hrTagController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route for resume viewing
router.get('/download-resume/:candidateId', downloadResume);

// Protected routes
router.use(authenticateToken);

// Core HR Tag functions
router.post('/add-candidate', uploadMiddleware, addCandidate);
router.get('/candidates', getCandidates);
router.post('/send-candidates', sendCandidatesToTeams);
router.get('/dashboard-stats', getDashboardStats);

// Admin and L&D routing
router.post('/send-to-admin', sendCandidatesToAdmin);
router.post('/send-to-admin-and-ld', sendCandidatesToAdminAndLD);
router.get('/admin-candidates', getAdminCandidates);

// 3-Card Layout Routes
router.get('/deployed-candidates', getDeployedCandidates);
router.get('/rejected-candidates', getRejectedCandidates);
router.get('/deployed-stats', getDeployedStats);

// Permanent ID routing
router.post('/send-to-hr-ops-permanent', sendToHROpsForPermanentID);

// Add this route to your hrTag routes file
router.put('/update-candidate/:candidateId', updateCandidate);

export default router;
