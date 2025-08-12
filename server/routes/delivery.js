import express from 'express';
import { authenticateToken, checkEmailPermission } from '../middleware/auth.js';
import {
  getHROpsDeliveryCandidates,
  getDeliveryStats,
  getDeliveryCandidates,
  getTrainingClearedCandidates,
  getReadyToDeployCandidates,
  getEmailSentCandidates, // ✅ ADD: Import the missing function
  updateAllocationStatus,
  sendCandidatesToHRTag,
  createDeploymentRecord,
  getDeploymentRecords,
  updateDeploymentRecord,
  getRejectedCandidates
} from '../controllers/deliveryController.js';
import emailController from '../controllers/emailController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ===== CANDIDATE MANAGEMENT ROUTES (No email permission needed) =====
router.get('/hrops-candidates', getHROpsDeliveryCandidates);
router.get('/training-cleared', getTrainingClearedCandidates);
router.get('/ready-to-deploy', getReadyToDeployCandidates);
router.get('/email-sent-candidates', getEmailSentCandidates); // ✅ ADD: Missing route
router.get('/stats', getDeliveryStats);
router.get('/candidates', getDeliveryCandidates);
router.put('/update-allocation/:candidateId', updateAllocationStatus);
router.post('/send-to-hr-tag', sendCandidatesToHRTag);

// ===== EMAIL ROUTES (Only for delivery managers with canSendEmail: true) =====
router.get('/email/test-config', checkEmailPermission, emailController.testEmailConfig);
router.post('/email/send-deployment', checkEmailPermission, (req, res, next) => {
  req.body.senderEmpId = req.user.empId;
  next();
}, emailController.sendDeploymentEmail);

router.post('/email/send-internal-transfer', checkEmailPermission, (req, res, next) => {
  req.body.senderEmpId = req.user.empId;
  next();
}, emailController.sendInternalTransferEmail);

// ===== DEPLOYMENT RECORD ROUTES (No email permission needed) =====
router.post('/create-deployment-record', createDeploymentRecord);
router.get('/deployment-records', getDeploymentRecords);
router.put('/update-deployment/:deploymentId', updateDeploymentRecord);
router.get('/rejected-candidates', getRejectedCandidates);

export default router;