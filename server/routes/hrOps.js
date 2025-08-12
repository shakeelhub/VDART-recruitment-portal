// routes/hrOpsRoutes.js - Complete HR Ops Routes with Email and Employee ID Assignment
import express from 'express';
import {
  getAllCandidates,
  assignOfficeEmail,
  assignEmployeeId,
  getHROpsStats,
  getPermanentIdStats,
  assignPermanentId,
  getRejectedCandidates,
  sendCandidatesToDelivery,
  sendCandidatesToDeliveryPermanent,
  getPermanentIdCandidates,
  getLDStatusStats,
  getDeploymentRecords,
  exitCandidate
} from '../controllers/hrOpsController.js';

const router = express.Router();

// Apply authentication middleware to all routes
// router.use(protect);
// router.use(hrOpsOnly);

// ===== MAIN CANDIDATES MANAGEMENT =====
// @route   GET /api/hr-ops/candidates
// @desc    Get all candidates for HR Ops management (Email and Employee ID assignment)
router.get('/candidates', getAllCandidates);

// ===== EMAIL ASSIGNMENT =====
// @route   PUT /api/hr-ops/assign-office-email/:candidateId
// @desc    Assign office email to candidate
router.put('/assign-office-email/:candidateId', assignOfficeEmail);

// ===== EMPLOYEE ID ASSIGNMENT =====
// @route   PUT /api/hr-ops/assign-employee-id/:candidateId
// @desc    Assign trainee employee ID to candidate
router.put('/assign-employee-id/:candidateId', assignEmployeeId);

// ===== PERMANENT ID MANAGEMENT =====
// @route   GET /api/hr-ops/permanent-id-candidates
// @desc    Get candidates for permanent ID assignment (sent from HR Tag)
router.get('/permanent-id-candidates', getPermanentIdCandidates);

// @route   PUT /api/hr-ops/assign-permanent-id/:candidateId
// @desc    Assign permanent employee ID to candidate
router.put('/assign-permanent-id/:candidateId', assignPermanentId);

// ===== REJECTED/DROPPED CANDIDATES =====
// @route   GET /api/hr-ops/rejected-candidates
// @desc    Get rejected/dropped candidates from L&D
router.get('/rejected-candidates', getRejectedCandidates);

// ===== DASHBOARD STATISTICS =====
// @route   GET /api/hr-ops/stats
// @desc    Get HR Ops dashboard statistics
router.get('/stats', getHROpsStats);

// @route   GET /api/hr-ops/permanent-id-stats
// @desc    Get permanent ID assignment statistics
router.get('/permanent-id-stats', getPermanentIdStats);

// @route   GET /api/hr-ops/ld-status-stats
// @desc    Get L&D processing status statistics
router.get('/ld-status-stats', getLDStatusStats);

// ===== DELIVERY TEAM INTEGRATION =====
// @route   POST /api/hr-ops/send-to-delivery
// @desc    Send candidates with trainee ID to delivery team
router.post('/send-to-delivery', sendCandidatesToDelivery);

// @route   POST /api/hr-ops/send-to-delivery-permanent
// @desc    Send candidates with permanent ID to delivery team
router.post('/send-to-delivery-permanent', sendCandidatesToDeliveryPermanent);

// ===== DEPLOYMENT RECORDS =====
// @route   GET /api/hr-ops/deployment-records
// @desc    Get deployment records with filters (for ResourceCard)
router.get('/deployment-records', getDeploymentRecords);

// ===== EXIT MANAGEMENT =====
// @route   PUT /api/hr-ops/exit-candidate/:deploymentId
// @desc    Exit a candidate (Mark as Inactive with reason)
router.put('/exit-candidate/:deploymentId', exitCandidate);

export default router;