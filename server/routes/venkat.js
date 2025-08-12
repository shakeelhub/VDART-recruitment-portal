import express from 'express';
import jwt from 'jsonwebtoken';
import {
  venkatLogin,
  getAllEmployees,
  addEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  getDeliveryManagerCredentials
} from '../controllers/venkatController.js';

const router = express.Router();

// Middleware to verify Venkat token
const verifyVenkatToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-2024');
    
    if (!decoded.isVenkat) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Public routes
router.post('/login', venkatLogin);

// Protected admin routes
router.use(verifyVenkatToken);

router.get('/employees', getAllEmployees);
router.post('/employees', addEmployee);
router.patch('/employees/:empId/toggle-status', toggleEmployeeStatus);
router.delete('/employees/:empId', deleteEmployee);
router.get('/delivery-manager-credentials', getDeliveryManagerCredentials);

export default router;