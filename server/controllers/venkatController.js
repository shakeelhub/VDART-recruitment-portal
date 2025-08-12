import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Employee from '../schema/Employee.js';

// Hardcoded venkat credentials
const VENKAT_CREDENTIALS = {
  username: 'venkat@vdart.com',
  password: 'venkat123'
};

// Venkat login
export const venkatLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username !== VENKAT_CREDENTIALS.username || password !== VENKAT_CREDENTIALS.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { username, isVenkat: true },
      process.env.JWT_SECRET || 'your-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: { username }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all employees with new fields
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select('-password -managerEmailConfig.appPassword') // Hide sensitive data
      .sort({ createdAt: -1 });

    // ✅ Transform response to include new fields properly
    const transformedEmployees = employees.map(emp => ({
      _id: emp._id,
      empId: emp.empId,
      name: emp.name,
      team: emp.team,
      email: emp.email,
      mobileNumber: emp.mobileNumber || '',     // ✅ NEW
      designation: emp.designation || '',       // ✅ NEW
      isActive: emp.isActive,
      isDeliveryManager: emp.isDeliveryManager,
      canSendEmail: emp.canSendEmail,
      managerEmail: emp.isDeliveryManager ? emp.managerEmailConfig?.email : null,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
    }));

    res.json({ 
      success: true, 
      employees: transformedEmployees,
      count: transformedEmployees.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add new employee with designation and mobile number
export const addEmployee = async (req, res) => {
  try {
    const { 
      empId, 
      password, 
      name, 
      team, 
      email,
      mobileNumber,        // ✅ NEW
      designation,         // ✅ NEW
      isDeliveryManager = false,
      managerEmail = '',
      managerAppPassword = ''
    } = req.body;
    
    // Validate required fields
    if (!empId || !password || !name || !team || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'All basic fields (empId, password, name, team, email) are required' 
      });
    }

    // ✅ NEW: Validate mobile number format if provided
    if (mobileNumber) {
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be exactly 10 digits'
        });
      }
    }

    // ✅ NEW: Enhanced validation for delivery managers
    if (team === 'Delivery' && isDeliveryManager) {
      // Check required fields for delivery managers
      if (!managerEmail || !managerAppPassword) {
        return res.status(400).json({
          success: false,
          error: 'Manager email and app password are required for delivery managers'
        });
      }

      if (!designation) {
        return res.status(400).json({
          success: false,
          error: 'Designation is required for delivery managers'
        });
      }

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required for delivery managers'
        });
      }

      // Check if delivery manager already exists
      const existingManager = await Employee.findOne({
        team: 'Delivery',
        isDeliveryManager: true,
        isActive: true
      });

      if (existingManager) {
        return res.status(400).json({
          success: false,
          error: 'A delivery manager already exists. Please deactivate current manager first.'
        });
      }
    }
    
    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ 
      $or: [{ empId }, { email }] 
    });
    
    if (existingEmployee) {
      return res.status(400).json({ 
        success: false,
        error: 'Employee with this ID or email already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare employee data with new fields
    const employeeData = {
      empId,
      password: hashedPassword,
      name,
      team,
      email,
      mobileNumber: mobileNumber ? mobileNumber.replace(/\D/g, '') : '', // ✅ Store clean digits only
      designation: designation || '',  // ✅ NEW: Store designation
      isActive: true,
      canSendEmail: team === 'Delivery' && isDeliveryManager, // Only delivery managers can send emails
      isDeliveryManager: team === 'Delivery' ? isDeliveryManager : false
    };

    // Add manager email config for delivery managers
    if (team === 'Delivery' && isDeliveryManager) {
      employeeData.managerEmailConfig = {
        email: managerEmail,
        appPassword: managerAppPassword
      };
    }
    
    // Create new employee
    const employee = new Employee(employeeData);
    
    // ✅ NEW: Validate manager setup before saving (if applicable)
    if (employee.isDeliveryManager && employee.validateManagerSetup) {
      const validation = employee.validateManagerSetup();
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Manager validation failed: ${validation.errors.join(', ')}`
        });
      }
    }

    await employee.save();
    
    // Return response with new fields (excluding sensitive data)
    const employeeResponse = {
      _id: employee._id,
      empId: employee.empId,
      name: employee.name,
      team: employee.team,
      email: employee.email,
      mobileNumber: employee.mobileNumber,    // ✅ NEW
      designation: employee.designation,      // ✅ NEW
      isActive: employee.isActive,
      isDeliveryManager: employee.isDeliveryManager,
      canSendEmail: employee.canSendEmail,
      createdAt: employee.createdAt
    };
    
    // Include manager email (not password) in response
    if (employee.managerEmailConfig && employee.managerEmailConfig.email) {
      employeeResponse.managerEmail = employee.managerEmailConfig.email;
    }
    
    res.status(201).json({ 
      success: true,
      message: `Employee ${name} added successfully${isDeliveryManager ? ' as Delivery Manager' : ''}`,
      employee: employeeResponse
    });
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle employee active status
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { empId } = req.params;
    
    const employee = await Employee.findOne({ empId });
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    employee.isActive = !employee.isActive;
    
    // If deactivating a delivery manager, also remove email permission
    if (!employee.isActive && employee.isDeliveryManager) {
      employee.canSendEmail = false;
    }
    
    // If activating a delivery manager, restore email permission
    if (employee.isActive && employee.isDeliveryManager) {
      employee.canSendEmail = true;
    }
    
    await employee.save();
    
    // ✅ Return response with all fields including new ones
    const employeeData = {
      _id: employee._id,
      empId: employee.empId,
      name: employee.name,
      team: employee.team,
      email: employee.email,
      mobileNumber: employee.mobileNumber || '',    // ✅ NEW
      designation: employee.designation || '',      // ✅ NEW
      isActive: employee.isActive,
      isDeliveryManager: employee.isDeliveryManager,
      canSendEmail: employee.canSendEmail,
      managerEmail: employee.isDeliveryManager ? employee.managerEmailConfig?.email : null
    };
    
    res.json({ 
      success: true,
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      employee: employeeData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { empId } = req.params;
    
    const employee = await Employee.findOneAndDelete({ empId });
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Employee deleted successfully',
      deletedEmployee: { 
        empId, 
        name: employee.name,
        designation: employee.designation || '',  // ✅ NEW
        isDeliveryManager: employee.isDeliveryManager
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ NEW: Get delivery manager with complete contact info
export const getDeliveryManager = async (req, res) => {
  try {
    const manager = await Employee.findOne({
      team: 'Delivery',
      isDeliveryManager: true,
      isActive: true,
      canSendEmail: true
    }).select('-password -managerEmailConfig.appPassword');

    if (!manager) {
      return res.status(404).json({
        success: false,
        error: 'No active delivery manager found'
      });
    }

    const managerInfo = {
      _id: manager._id,
      empId: manager.empId,
      name: manager.name,
      designation: manager.designation,           // ✅ NEW
      email: manager.email,
      mobileNumber: manager.mobileNumber,         // ✅ NEW
      managerEmail: manager.managerEmailConfig?.email,
      team: manager.team,
      isActive: manager.isActive,
      contactInfo: {                              // ✅ NEW: Complete contact info
        name: manager.name,
        designation: manager.designation,
        email: manager.managerEmailConfig?.email,
        mobile: manager.mobileNumber,
        empId: manager.empId
      }
    };

    res.json({
      success: true,
      deliveryManager: managerInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get delivery manager credentials (for email sending) - Enhanced
export const getDeliveryManagerCredentials = async (req, res) => {
  try {
    const manager = await Employee.findOne({
      team: 'Delivery',
      isDeliveryManager: true,
      isActive: true,
      canSendEmail: true
    }).select('managerEmailConfig name empId designation mobileNumber');

    if (!manager || !manager.managerEmailConfig) {
      return res.status(404).json({
        success: false,
        error: 'No active delivery manager found'
      });
    }

    res.json({
      success: true,
      credentials: {
        email: manager.managerEmailConfig.email,
        appPassword: manager.managerEmailConfig.appPassword,
        name: manager.name,
        empId: manager.empId,
        designation: manager.designation || '',     // ✅ NEW
        mobileNumber: manager.mobileNumber || ''    // ✅ NEW
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ NEW: Update employee (for future use)
export const updateEmployee = async (req, res) => {
  try {
    const { empId } = req.params;
    const updates = req.body;

    // Find employee
    const employee = await Employee.findOne({ empId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Validate mobile number if being updated
    if (updates.mobileNumber !== undefined && updates.mobileNumber) {
      const cleanMobile = updates.mobileNumber.replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be exactly 10 digits'
        });
      }
      updates.mobileNumber = cleanMobile;
    }

    // Handle delivery manager role changes
    if (updates.isDeliveryManager !== undefined && updates.isDeliveryManager && employee.team === 'Delivery') {
      // Validate required fields for delivery manager
      const designation = updates.designation || employee.designation;
      const mobileNumber = updates.mobileNumber || employee.mobileNumber;
      const managerEmail = updates.managerEmail || employee.managerEmailConfig?.email;

      if (!designation) {
        return res.status(400).json({
          success: false,
          error: 'Designation is required for delivery managers'
        });
      }

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number is required for delivery managers'
        });
      }

      if (!managerEmail) {
        return res.status(400).json({
          success: false,
          error: 'Manager email is required for delivery managers'
        });
      }

      // Check if another delivery manager exists
      const existingManager = await Employee.findOne({
        team: 'Delivery',
        isDeliveryManager: true,
        isActive: true,
        empId: { $ne: empId }
      });

      if (existingManager) {
        return res.status(400).json({
          success: false,
          error: 'Another delivery manager already exists'
        });
      }

      updates.canSendEmail = true;
    }

    // Update employee
    Object.assign(employee, updates);
    await employee.save();

    // Return updated employee data (excluding sensitive info)
    const updatedEmployee = {
      _id: employee._id,
      empId: employee.empId,
      name: employee.name,
      team: employee.team,
      email: employee.email,
      mobileNumber: employee.mobileNumber || '',
      designation: employee.designation || '',
      isActive: employee.isActive,
      isDeliveryManager: employee.isDeliveryManager,
      canSendEmail: employee.canSendEmail,
      managerEmail: employee.isDeliveryManager ? employee.managerEmailConfig?.email : null,
      updatedAt: employee.updatedAt
    };

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};