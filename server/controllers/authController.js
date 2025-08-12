import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Employee from '../schema/Employee.js';

// Login API
export const login = async (req, res) => {
  try {
    const { empId, password } = req.body;

    // Validation
    if (!empId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Password are required'
      });
    }

    // Find employee
    const employee = await Employee.findOne({ empId: empId.trim() });
    
    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Employee ID or Password'
      });
    }

    // CHECK IF EMPLOYEE IS ACTIVE (ADD THIS)
    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, employee.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Employee ID or Password'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        empId: employee.empId,
        team: employee.team,
        name: employee.name 
      },
      process.env.JWT_SECRET || 'vdart-secret-key',
      { expiresIn: '24h' }
    );

    // Success response
    res.json({
      success: true,
      message: `Welcome ${employee.team}!`,
      token,
      employee: {
        empId: employee.empId,
        name: employee.name,
        team: employee.team,
        email: employee.email
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};