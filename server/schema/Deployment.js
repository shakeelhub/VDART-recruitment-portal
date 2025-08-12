// schema/Deployment.js - Deployment Email Records Schema

import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema({
  // ===== CANDIDATE REFERENCE =====
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  candidateName: {
    type: String,
    required: true,
    trim: true
  },
  candidateEmpId: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },

  // ===== DEPLOYMENT DETAILS =====
  role: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  office: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  modeOfHire: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  fromTeam: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  toTeam: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  client: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  bu: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  reportingTo: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  accountManager: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  deploymentDate: {
    type: Date,
    required: false,
    default: null
  },

  // ===== EMAIL DETAILS =====
  emailSubject: {
    type: String,
    required: true,
    trim: true
  },
  emailContent: {
    type: String,
    trim: true,
    default: ''
  },
  recipientEmails: [{
    type: String,
    required: true,
    lowercase: true
  }],
  ccEmails: [{
    type: String,
    lowercase: true
  }],

  // ===== SENDER INFORMATION =====
  sentBy: {
    type: String,
    required: true,
    index: true
  },
  sentByName: {
    type: String,
    required: true
  },
  sentFromEmail: {
    type: String,
    required: true,
    lowercase: true
  },

  // ===== STATUS TRACKING =====
  emailStatus: {
    type: String,
    enum: ['Sent', 'Failed', 'Partially Sent'],
    default: 'Sent',
    index: true
  },
  emailResults: {
    successful: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },

  // ===== ADDITIONAL DEPLOYMENT TRACKING FIELDS =====
  track: { 
    type: String, 
    default: '',
    trim: true
  },
  hrName: { 
    type: String, 
    default: '',
    trim: true
  },
  calAdd: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  dmDal: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  tlLeadRec: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  zoomNo: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  workLocation: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  doj: {
    type: Date,
    required: false,
    default: null
  },
  extension: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    required: false,
    trim: true,
    default: 'Active'
  },
  exitDate: {
    type: Date,
    required: false,
    default: null
  },
  // ===== NEW EXIT MANAGEMENT FIELDS =====
  exitReason: {
    type: String,
    required: false,
    trim: true,
    default: null
  },
  exitProcessedBy: {
    type: String, // Employee ID who processed the exit
    required: false,
    default: null
  },
  exitProcessedByName: {
    type: String, // Name of the person who processed exit
    required: false,
    trim: true,
    default: null
  },
  exitProcessedAt: {
    type: Date,
    required: false,
    default: null
  },
  // ===== END NEW FIELDS =====
  internalTransferDate: {
    type: Date,
    required: false,
    default: null
  },
  leadOrNonLead: {
    type: String,
    enum: ['Lead', 'Non-Lead', ''],
    default: ''
  },

  // ===== FIELDS FROM CANDIDATE SCHEMA =====
  candidateMobile: {
    type: String,
    required: false,
    default: ''
  },
  candidateOfficeEmail: {
    type: String,
    required: false,
    default: ''
  },
  candidateExperienceLevel: {
    type: String,
    required: false,
    default: ''
  },
  candidateAssignedTeam: {
    type: String,
    required: false,
    default: ''
  },
  candidateBatch: {
    type: String,
    required: false,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'deployments'
});

// ===== INDEXES FOR PERFORMANCE =====
deploymentSchema.index({ candidateId: 1, createdAt: -1 });
deploymentSchema.index({ deploymentDate: 1, emailStatus: 1 });
deploymentSchema.index({ sentBy: 1, createdAt: -1 });
deploymentSchema.index({ client: 1, bu: 1 });
deploymentSchema.index({ toTeam: 1, deploymentDate: -1 });

// ===== VIRTUAL FIELDS =====
deploymentSchema.virtual('isSuccessful').get(function() {
  return this.emailStatus === 'Sent' && this.emailResults.failed === 0;
});

deploymentSchema.virtual('deploymentAge').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// ===== TENURE CALCULATION VIRTUAL =====
deploymentSchema.virtual('tenure').get(function() {
  if (!this.doj) {
    return '';
  }
  
  const startDate = new Date(this.doj);
  const endDate = this.exitDate ? new Date(this.exitDate) : new Date();
  
  // Calculate difference in months
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months -= startDate.getMonth();
  months += endDate.getMonth();
  
  // Adjust for partial months
  if (endDate.getDate() < startDate.getDate()) {
    months--;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  // Format as X.Y (years.months)
  return `${years}.${remainingMonths}`;
});

// ===== STATIC METHODS =====
deploymentSchema.statics.findBySender = function(sentBy) {
  return this.find({ sentBy }).sort({ createdAt: -1 });
};

deploymentSchema.statics.findByDateRange = function(fromDate, toDate) {
  return this.find({
    deploymentDate: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    }
  }).sort({ deploymentDate: -1 });
};

deploymentSchema.statics.findByClient = function(client) {
  return this.find({ client }).sort({ createdAt: -1 });
};

// ===== INSTANCE METHODS =====
deploymentSchema.methods.updateStatus = function(status, notes = '') {
  this.status = status;
  if (notes) this.notes = notes;
  return this.save();
};

// ===== NEW INSTANCE METHOD FOR EXIT PROCESSING =====
deploymentSchema.methods.processExit = function(exitReason, processedBy, processedByName) {
  this.status = 'Inactive';
  this.exitDate = new Date();
  this.exitReason = exitReason;
  this.exitProcessedBy = processedBy;
  this.exitProcessedByName = processedByName;
  this.exitProcessedAt = new Date();
  return this.save();
};

deploymentSchema.methods.calculateTenure = function() {
  if (!this.doj) {
    return '';
  }
  
  const startDate = new Date(this.doj);
  const endDate = this.exitDate ? new Date(this.exitDate) : new Date();
  
  // Calculate difference in months
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months -= startDate.getMonth();
  months += endDate.getMonth();
  
  // Adjust for partial months
  if (endDate.getDate() < startDate.getDate()) {
    months--;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  // Format as X.Y (years.months)
  return `${years}.${remainingMonths}`;
};

// ===== PRE-SAVE MIDDLEWARE =====
deploymentSchema.pre('save', function(next) {
  // Ensure email fields are lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  if (this.sentFromEmail) {
    this.sentFromEmail = this.sentFromEmail.toLowerCase();
  }
  
  // Process recipient emails
  if (this.recipientEmails && this.recipientEmails.length > 0) {
    this.recipientEmails = this.recipientEmails.map(email => email.toLowerCase());
  }
  
  // Process CC emails
  if (this.ccEmails && this.ccEmails.length > 0) {
    this.ccEmails = this.ccEmails.map(email => email.toLowerCase());
  }
  
  // Set default status to Active if not provided
  if (!this.status) {
    this.status = 'Active';
  }
  
  next();
});

// ===== POST-SAVE MIDDLEWARE =====
deploymentSchema.post('save', function(doc) {
  console.log(`📧 Deployment record saved for ${doc.candidateName} (${doc.candidateEmpId}) to ${doc.client}`);
});

// Ensure virtual fields are included in JSON output
deploymentSchema.set('toJSON', { virtuals: true });
deploymentSchema.set('toObject', { virtuals: true });

export default mongoose.models.Deployment || mongoose.model('Deployment', deploymentSchema);