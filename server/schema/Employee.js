import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  empId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  team: {
    type: String,
    required: true,
    enum: ['L&D', 'HR', 'Hareesh', 'HR Tag', 'Admin', 'HR Ops', 'IT', 'Delivery']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  email: {
    type: String,
    trim: true
  },
  
  // ✅ NEW: Mobile number field (especially important for managers)
  mobileNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Optional field, but if provided, should be valid format
        return !v || /^[0-9]{10}$/.test(v.replace(/[-\s]/g, ''));
      },
      message: 'Mobile number must be 10 digits'
    }
  },
  
  // ✅ NEW: Designation field (required for managers, optional for others)
  designation: {
    type: String,
    trim: true,
    required: function() {
      return this.isDeliveryManager; // Required for delivery managers
    }
  },
  
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  // Email permission fields
  canSendEmail: {
    type: Boolean,
    default: false
  },
  
  // Only for Delivery team managers
  isDeliveryManager: {
    type: Boolean,
    default: false
  },
  
  // Manager's email credentials (only for Delivery managers)
  managerEmailConfig: {
    email: {
      type: String,
      trim: true,
      required: function() {
        return this.parent().isDeliveryManager;
      },
      validate: {
        validator: function(v) {
          if (!this.parent().isDeliveryManager) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Manager email must be valid'
      }
    },
    appPassword: {
      type: String,
      required: function() {
        return this.parent().isDeliveryManager;
      }
    }
  }
}, {
  timestamps: true
});

// ✅ NEW: Pre-save middleware to ensure manager fields are properly set
employeeSchema.pre('save', function(next) {
  // If this is a delivery manager, ensure required fields are present
  if (this.isDeliveryManager) {
    if (!this.designation) {
      return next(new Error('Designation is required for delivery managers'));
    }
    if (!this.mobileNumber) {
      return next(new Error('Mobile number is required for delivery managers'));
    }
    if (!this.managerEmailConfig.email) {
      return next(new Error('Manager email is required for delivery managers'));
    }
    if (!this.managerEmailConfig.appPassword) {
      return next(new Error('Manager app password is required for delivery managers'));
    }
    
    // Auto-enable email sending for delivery managers
    this.canSendEmail = true;
  }
  
  next();
});

// ✅ NEW: Virtual field to get manager's full contact info
employeeSchema.virtual('managerContactInfo').get(function() {
  if (!this.isDeliveryManager) return null;
  
  return {
    name: this.name,
    designation: this.designation,
    email: this.managerEmailConfig.email,
    mobile: this.mobileNumber,
    empId: this.empId
  };
});

// ✅ NEW: Static method to find delivery manager
employeeSchema.statics.findDeliveryManager = function() {
  return this.findOne({ 
    isDeliveryManager: true, 
    isActive: true,
    team: 'Delivery'
  });
};

// ✅ NEW: Instance method to validate manager setup
employeeSchema.methods.validateManagerSetup = function() {
  if (!this.isDeliveryManager) return { valid: true };
  
  const errors = [];
  
  if (!this.designation) errors.push('Designation is required');
  if (!this.mobileNumber) errors.push('Mobile number is required');
  if (!this.managerEmailConfig.email) errors.push('Manager email is required');
  if (!this.managerEmailConfig.appPassword) errors.push('App password is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Ensure virtual fields are included in JSON output
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;