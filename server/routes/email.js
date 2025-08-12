import express from 'express';
import emailController from '../controllers/emailController.js';
import { authenticateToken, checkEmailPermission } from '../middleware/auth.js';

const router = express.Router();

// Test email config - requires authentication and email permission
router.get('/test-config', authenticateToken, checkEmailPermission, emailController.testEmailConfig);

// Send deployment email - requires authentication and email permission
router.post('/send-deployment', authenticateToken, checkEmailPermission, (req, res, next) => {
  // Add sender empId from authenticated user to request body
  req.body.senderEmpId = req.user.empId;
  next();
}, emailController.sendDeploymentEmail);

// NEW ROUTE: Send internal transfer email - requires authentication and email permission
router.post('/send-internal-transfer', authenticateToken, checkEmailPermission, (req, res, next) => {
  // Add sender empId from authenticated user to request body
  req.body.senderEmpId = req.user.empId;
  next();
}, emailController.sendInternalTransferEmail);

export default router;