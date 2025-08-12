import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  // ===== BASIC CANDIDATE INFORMATION =====
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  fatherName: {
    type: String,
    required: true,
    trim: true
  },
  sentToHRTagFromHROps: {
  type: Boolean,
  default: false,
  index: true
},
  firstGraduate: {
    type: String,
    enum: ['Yes', 'No', ''],
    default: ''
  },
  experienceLevel: {
    type: String,
    enum: ['Fresher', 'Lateral', ''],
    default: '',
    index: true
  },
  source: {
    type: String,
    enum: ['', 'Walk-in', 'Reference', 'Campus'],
    default: '',
    trim: true
  },
  referenceName: {
    type: String,
    trim: true,
    default: '',
    required: function() {
      return this.source === 'Reference';
    }
  },
  native: {
    type: String,
    trim: true,
    default: ''
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  personalEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  college: {
    type: String,
    trim: true,
    default: ''
  },

  // ===== FRESHER-SPECIFIC FIELDS =====
  batchLabel: {
    type: String,
    required: false,
    index: true
  },
  year: {
    type: Number,
    required: false,
    index: true
  },

  // ===== ADDITIONAL FIELDS =====
  linkedinUrl: {
    type: String,
    required: false,
    trim: true
  },
  resumeFileName: {
    type: String,
    required: false
  },
  resumePath: {
    type: String,
    required: false
  },

  // ===== HR TAG SUBMISSION INFO =====
  submittedBy: {
    type: String,
    required: true,
    index: true
  },
  submittedByName: {
    type: String,
    required: true
  },
  
  // ===== CANDIDATE STATUS TRACKING =====
  status: {
    type: String,
    enum: ['submitted', 'sent'],
    default: 'submitted',
    index: true
  },
  
  // ===== HR OPS FIELDS - OFFICE EMAIL ASSIGNMENT (MOVED FROM IT) =====
  officeEmail: {
    type: String,
    default: null,
    lowercase: true,
    sparse: true,
    index: true
  },
  officeEmailAssignedBy: {
    type: String,
    default: null,
    index: true
  },
  officeEmailAssignedByName: {
    type: String,
    default: null
  },
  officeEmailAssignedAt: {
    type: Date,
    default: null
  },
  
  // ===== HR OPS FIELDS - TRAINEE/TEMPORARY EMPLOYEE ID =====
  employeeId: {
    type: String,
    default: null,
    uppercase: true,
    sparse: true,
    index: true
  },
  employeeIdAssignedBy: {
    type: String,
    default: null,
    index: true
  },
  employeeIdAssignedByName: {
    type: String,
    default: null
  },
  employeeIdAssignedAt: {
    type: Date,
    default: null
  },

  // ===== HR OPS FIELDS - PERMANENT EMPLOYEE ID =====
  permanentEmployeeId: {
    type: String,
    default: null,
    uppercase: true,
    sparse: true,
    index: true
  },
  permanentIdAssignedBy: {
    type: String,
    default: null,
    index: true
  },
  permanentIdAssignedByName: {
    type: String,
    default: null
  },
  permanentIdAssignedAt: {
    type: Date,
    default: null
  },

  // ===== HR OPS ROUTING - FROM HR TAG FOR PERMANENT ID =====
  sentToHROpsFromHRTag: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToHROpsFromHRTagAt: {
    type: Date,
    required: false
  },
  sentToHROpsFromHRTagBy: {
    type: String,
    required: false
  },
  sentToHROpsFromHRTagByName: {
    type: String,
    required: false
  },

  // ===== ADMIN FIELDS =====
  sentToAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToAdminAt: {
    type: Date,
    required: false
  },
  sentToAdminBy: {
    type: String,
    required: false
  },
  sentToAdminByName: {
    type: String,
    required: false
  },

  // ===== L&D TEAM FIELDS =====
  sentToLD: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToLDAt: {
    type: Date,
    required: false
  },
  sentToLDBy: {
    type: String,
    required: false
  },
  sentToLDByName: {
    type: String,
    required: false
  },
  ldStatus: {
    type: String,
    enum: ['Pending', 'Selected', 'Rejected', 'Dropped'],
    default: 'Pending',
    index: true
  },
  ldReason: {
    type: String,
    enum: [
      '', 
      // Rejection reasons
      'Not Selected', 
      'Uninformed Leave', 
      'Underperformance', 
      'Behavioural Issues', 
      'Disciplinary Issues',
      'Low Score',
      // Dropped reasons
      'Better Offer', 
      'Health Issues', 
      'Personal Reasons',
      'Abscond'
    ],
    default: ''
  },
  ldStatusUpdatedBy: {
    type: String,
    default: null,
    index: true
  },
  ldStatusUpdatedByName: String, 
  ldStatusUpdatedAt: {
    type: Date,
    default: null
  },

  // ===== DELIVERY TEAM FIELDS =====
  sentToDelivery: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToDeliveryAt: {
    type: Date,
    required: false
  },
  sentToDeliveryBy: {
    type: String,
    required: false
  },
  sentToDeliveryByName: {
    type: String,
    required: false
  },
  allocationStatus: {
    type: String,
    enum: ['Pending Allocation', 'Allocated', 'On Hold', 'Completed'],
    default: 'Pending Allocation',
    index: true
  },
  allocationNotes: {
    type: String,
    trim: true,
    default: ''
  },
  assignedProject: {
    type: String,
    trim: true,
    default: ''
  },
  assignedTeam: {
    type: String,
    trim: true,
    default: ''
  },
  allocationUpdatedBy: {
    type: String,
    default: null
  },
  allocationUpdatedAt: {
    type: Date,
    default: null
  },

  // ===== HR TAG DEPLOYMENT FIELDS =====
  sentToHRTag: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToHRTagAt: {
    type: Date,
    required: false
  },
  sentToHRTagBy: {
    type: String,
    required: false
  },
  sentToHRTagByName: {
    type: String,
    required: false
  },
   sentToDeliveryForPermanent: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToDeliveryForPermanentAt: {
    type: Date,
    required: false
  },
  sentToDeliveryForPermanentBy: {
    type: String,
    required: false
  },
  sentToDeliveryForPermanentByName: {
    type: String,
    required: false
  },

  // ===== CROSS-DASHBOARD ROUTING FLAGS =====
  // These flags ensure rejected/dropped candidates appear in all dashboards
  routedToHRTag: {
    type: Boolean,
    default: false,
    index: true
  },
  routedToHROps: {
    type: Boolean,
    default: false,
    index: true
  },
  routedToIT: {
    type: Boolean,
    default: false,
    index: true
  },
  routedToAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  routingTimestamp: {
    type: Date,
    default: null
  },
  routingReason: {
    type: String,
    enum: ['', 'L&D Rejected', 'L&D Dropped', 'Initial Send'],
    default: ''
  }
}, {
  timestamps: true,
  collection: 'candidates'
});

// ===== COMPOUND INDEXES FOR PERFORMANCE =====
candidateSchema.index({ status: 1, createdAt: -1 });
candidateSchema.index({ ldStatus: 1, sentToLD: 1 });
candidateSchema.index({ sentToDelivery: 1, allocationStatus: 1 });
candidateSchema.index({ sentToHRTag: 1, ldStatus: 1 });
candidateSchema.index({ sentToHROpsFromHRTag: 1, permanentEmployeeId: 1 });
candidateSchema.index({ sentToAdmin: 1, ldStatus: 1 });
candidateSchema.index({ personalEmail: 1, mobileNumber: 1 });
candidateSchema.index({ employeeId: 1, permanentEmployeeId: 1 });
candidateSchema.index({ officeEmail: 1, employeeIdAssignedBy: 1 });
candidateSchema.index({ officeEmailAssignedBy: 1, officeEmailAssignedAt: -1 });

// ===== VIRTUAL FIELDS =====
candidateSchema.virtual('isFullyProcessed').get(function() {
  return this.officeEmail && this.employeeId && this.ldStatus === 'Selected';
});

candidateSchema.virtual('currentStage').get(function() {
  if (this.ldStatus === 'Rejected' || this.ldStatus === 'Dropped') {
    return `L&D ${this.ldStatus}`;
  }
  if (this.sentToDelivery) {
    return 'Delivery Team';
  }
  if (this.sentToLD) {
    return 'L&D Review';
  }
  if (this.sentToAdmin) {
    return 'Admin Review';
  }
  if (this.status === 'sent') {
    return 'HR Ops Processing';
  }
  return 'HR Tag Submitted';
});

// ===== STATIC METHODS =====
candidateSchema.statics.findByLDStatus = function(ldStatus) {
  return this.find({ ldStatus, sentToLD: true });
};

candidateSchema.statics.findRejectedOrDropped = function() {
  return this.find({ 
    ldStatus: { $in: ['Rejected', 'Dropped'] },
    sentToLD: true 
  });
};

candidateSchema.statics.findForDashboard = function(dashboard) {
  const queries = {
    hrTag: {
      $or: [
        { status: 'submitted' },
        { status: 'sent' },
        { sentToHRTag: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    },
    hrOps: {
      $or: [
        { status: 'sent' },
        { sentToHROpsFromHRTag: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    },
    admin: {
      $or: [
        { sentToAdmin: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    },
    ld: {
      sentToLD: true
    }
  };
  
  return this.find(queries[dashboard] || {});
};

// ===== INSTANCE METHODS =====
candidateSchema.methods.updateLDStatus = function(status, reason, updatedBy) {
  this.ldStatus = status;
  this.ldReason = reason || '';
  this.ldStatusUpdatedBy = updatedBy;
  this.ldStatusUpdatedAt = new Date();
  
  // If rejected or dropped, route to all dashboards
  if (status === 'Rejected' || status === 'Dropped') {
    this.routedToHRTag = true;
    this.routedToHROps = true;
    this.routedToAdmin = true;
    this.routingTimestamp = new Date();
    this.routingReason = `L&D ${status}`;
    
    // Set dashboard flags
    this.sentToHRTag = true;
    this.sentToHRTagAt = new Date();
    this.sentToAdmin = true;
    this.sentToAdminAt = new Date();
  }
  
  return this.save();
};

// ===== PRE-SAVE MIDDLEWARE =====
candidateSchema.pre('save', function(next) {
  // Ensure email fields are lowercase
  if (this.personalEmail) {
    this.personalEmail = this.personalEmail.toLowerCase();
  }
  if (this.officeEmail) {
    this.officeEmail = this.officeEmail.toLowerCase();
  }
  
  // Ensure employee IDs are uppercase
  if (this.employeeId) {
    this.employeeId = this.employeeId.toUpperCase();
  }
  if (this.permanentEmployeeId) {
    this.permanentEmployeeId = this.permanentEmployeeId.toUpperCase();
  }
  
  next();
});

// ===== POST-SAVE MIDDLEWARE =====
candidateSchema.post('save', function(doc) {
  console.log(`📝 Candidate ${doc.fullName} saved with status: ${doc.status}, L&D Status: ${doc.ldStatus}`);
});

export default mongoose.model('Candidate', candidateSchema);