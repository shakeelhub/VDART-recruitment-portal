import jwt from 'jsonwebtoken';
import Employee from '../schema/Employee.js';

// Your existing auth middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'vdart-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
};

// New: Check email permission for delivery managers
export const checkEmailPermission = async (req, res, next) => {
  try {
    if (!req.user || !req.user.empId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const employee = await Employee.findOne({ 
      empId: req.user.empId,
      isActive: true 
    }).select('canSendEmail team isDeliveryManager');

    if (!employee) {
      return res.status(401).json({
        success: false,
        error: 'Employee not found or inactive'
      });
    }

    if (!employee.canSendEmail) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to send emails'
      });
    }

    if (employee.team !== 'Delivery') {
      return res.status(403).json({
        success: false,
        error: 'Email sending is only available for Delivery team'
      });
    }

    req.employee = employee;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Permission check failed'
    });
  }
};