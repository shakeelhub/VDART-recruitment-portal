// controllers/hrTagController.js - COMPLETE HR Tag Controller with Email Notifications

import Candidate from '../schema/Candidate.js';
import upload from '../config/multer.js';
import path from 'path';
import emailService from '../services/emailService.js';

// ✅ EXISTING: Add new candidate (stays as 'submitted' status) - with file upload - NO CHANGES
// @desc    Add new candidate (stays as 'submitted' status) - with file upload
// @route   POST /api/hr-tag/add-candidate
// @access  Protected (HR Tag team only)
export const addCandidate = async (req, res) => {
  try {
    const {
      fullName,
      gender,
      fatherName,
      firstGraduate,
      experienceLevel,
      batchLabel,
      year,
       source,
  referenceName,
      native,
      mobileNumber,
      personalEmail,
      linkedinUrl,
      college,
      submittedBy,
      submittedByName
    } = req.body;

    // Check if candidate already exists
    const existingCandidate = await Candidate.findOne({
      $or: [
        { personalEmail: personalEmail.toLowerCase() },
        { mobileNumber: mobileNumber }
      ]
    });

    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: 'Candidate with this email or mobile number already exists'
      });
    }

    // Prepare candidate data
    const candidateData = {
      fullName,
      gender,
      fatherName,
      firstGraduate,
      experienceLevel,
      source,
      native,
      mobileNumber,
      personalEmail: personalEmail.toLowerCase(),
      college,
      submittedBy,
      submittedByName
    };

    // Add optional fields
    if (linkedinUrl) candidateData.linkedinUrl = linkedinUrl;
    if (batchLabel) candidateData.batchLabel = batchLabel;
    if (year) candidateData.year = parseInt(year);

    // Add resume file info if uploaded
    if (req.file) {
      candidateData.resumeFileName = req.file.filename;
      candidateData.resumePath = req.file.path;
    }

    // Create new candidate with 'submitted' status
    const newCandidate = new Candidate(candidateData);
    const savedCandidate = await newCandidate.save();

    res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      candidate: savedCandidate
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add candidate',
      error: error.message
    });
  }
};

// ✅ EXISTING: Get candidates for HR Tag - NO CHANGES
// @desc    Get candidates for HR Tag (only 'submitted' and 'sent' status)
// @route   GET /api/hr-tag/candidates
// @access  Protected (HR Tag team only)
export const getCandidates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      fromDate = '',
      toDate = '',
      status = 'all',
      experienceLevel = 'all',
      batchLabel = 'all'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    // Filter by status
    if (status === 'submitted' || status === 'sent') {
      query.status = status;
    }

    // Filter by experience level
    if (experienceLevel !== 'all') {
      query.experienceLevel = experienceLevel;
    }

    // Filter by batch label (for freshers)
    if (batchLabel !== 'all') {
      query.batchLabel = batchLabel;
    }

    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { personalEmail: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { linkedinUrl: { $regex: search, $options: 'i' } }
      ];
    }

    // Date filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      }
    }

    const candidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Candidate.countDocuments(query);

    res.json({
      success: true,
      candidates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
};

// ✅ UPDATED: Send candidates to HR Ops teams - ADDED EMAIL NOTIFICATION
// @desc    Send candidates to IT and HR Ops teams
// @route   POST /api/hr-tag/send-candidates
// @access  Protected (HR Tag team only)
export const sendCandidatesToTeams = async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send'
      });
    }

    // ✅ EXISTING: Update candidates status from 'submitted' to 'sent' - NO CHANGES
    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        status: 'submitted'
      },
      {
        $set: { status: 'sent' }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent. They may have already been sent.'
      });
    }

    // ✅ NEW: Send email notification to HR OPS
    try {
      await emailService.sendCandidateTransferNotification(
        'HR TAG',
        'HR OPS', 
        updateResult.modifiedCount,
        'Employee ID and Office Email Assignment',
        req.user.empId
      );
      console.log('✅ Email notification sent to HR OPS successfully');
    } catch (emailError) {
      // ✅ Don't fail the main operation if email fails
      console.error('⚠️ Email notification failed:', emailError.message);
    }

    // ✅ EXISTING: Return success response - NO CHANGES
    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) to HR Ops team`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to teams',
      error: error.message
    });
  }
};

// ✅ EXISTING: Get dashboard statistics for HR Tag - NO CHANGES
// @desc    Get dashboard statistics for HR Tag
// @route   GET /api/hr-tag/dashboard-stats
// @access  Protected (HR Tag team only)
export const getDashboardStats = async (req, res) => {
  try {
    // Get total and submitted candidates
    const total = await Candidate.countDocuments({});
    const submitted = await Candidate.countDocuments({ status: 'submitted' });
    const sent = await Candidate.countDocuments({ status: 'sent' });
    const walkinCount = await Candidate.countDocuments({ source: 'Walk-in' });
const referenceCount = await Candidate.countDocuments({ source: 'Reference' });
const campusCount = await Candidate.countDocuments({ source: 'Campus' });


    // Email assignment stats (for sent candidates)
    const emailAssigned = await Candidate.countDocuments({
      status: 'sent',
      officeEmailAssignedBy: { $exists: true, $ne: null }
    });
    const emailUnassigned = sent - emailAssigned;

    // Employee ID assignment stats (for sent candidates)
    const empIdAssigned = await Candidate.countDocuments({
      status: 'sent',
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });
    const empIdUnassigned = sent - empIdAssigned;

    // Completed (both email and employee ID assigned)
    const completed = await Candidate.countDocuments({
      status: 'sent',
      officeEmailAssignedBy: { $exists: true, $ne: null },
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });

    // Deployed candidates statistics
    const deployed = await Candidate.countDocuments({
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    });

const rejected = await Candidate.countDocuments({
  ldStatus: 'Rejected',
  sentToLD: true
});

const dropped = await Candidate.countDocuments({
  ldStatus: 'Dropped',
  sentToLD: true
});

    // Deployed candidates sent to HR Ops for permanent ID
    const deployedSentToHROps = await Candidate.countDocuments({
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected',
      sentToHROpsFromHRTag: true
    });

    // Additional stats for new fields
    const freshersCount = await Candidate.countDocuments({ experienceLevel: 'Fresher' });
    const lateralCount = await Candidate.countDocuments({ experienceLevel: 'Lateral' });
    const withResumeCount = await Candidate.countDocuments({ resumeFileName: { $exists: true, $ne: null } });
    const withLinkedInCount = await Candidate.countDocuments({ linkedinUrl: { $exists: true, $ne: null } });

    const stats = {
      total,
      submitted,
      sent,
      emailAssigned,
      emailUnassigned,
      empIdAssigned,
      empIdUnassigned,
      completed,
      deployed,
      rejected,
      dropped,
      deployedSentToHROps,
      freshersCount,
      lateralCount,
      withResumeCount,
      withLinkedInCount,
      walkinCount,
  referenceCount,
  campusCount
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// ✅ EXISTING: Download resume file - NO CHANGES
// @desc    Download resume file
// @route   GET /api/hr-tag/download-resume/:candidateId
// @access  Public (for viewing)
export const downloadResume = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    if (!candidate.resumeFileName || !candidate.resumePath) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found for this candidate'
      });
    }

    // Get file extension for proper content type
    const fileExt = path.extname(candidate.resumeFileName).toLowerCase();
    let contentType = 'application/pdf'; // Default to PDF

    if (fileExt === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExt === '.doc') {
      contentType = 'application/msword';
    } else if (fileExt === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Set headers for VIEWING (not downloading)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline'); // This makes it VIEW instead of download

    // Send the file for viewing
    const filePath = path.resolve(candidate.resumePath);
    res.sendFile(filePath);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to view resume',
      error: error.message
    });
  }
};

// ✅ UPDATED: Send candidates to admin - ADDED EMAIL NOTIFICATION
// @desc    Send candidates to admin
// @route   POST /api/hr-tag/send-to-admin
// @access  Protected (HR Tag team only)
export const sendCandidatesToAdmin = async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to Admin'
      });
    }

    // ✅ EXISTING: Update candidates to add admin flag - NO CHANGES
    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        status: 'sent'
      },
      {
        $set: {
          sentToAdmin: true,
          sentToAdminAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent to Admin.'
      });
    }

    // ✅ NEW: Send email notification to ADMIN
    try {
      await emailService.sendCandidateTransferNotification(
        'HR TAG',
        'ADMIN', 
        updateResult.modifiedCount,
        'Admin Review and Processing',
        req.user.empId
      );
      console.log('✅ Email notification sent to ADMIN successfully');
    } catch (emailError) {
      // ✅ Don't fail the main operation if email fails
      console.error('⚠️ Email notification failed:', emailError.message);
    }

    // ✅ EXISTING: Return success response - NO CHANGES
    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) to Admin`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to Admin'
    });
  }
};

// ✅ UPDATED: Send candidates to both Admin and L&D - ADDED EMAIL NOTIFICATION
// @desc    Send candidates to both Admin and L&D
// @route   POST /api/hr-tag/send-to-admin-and-ld
// @access  Protected (HR Tag team only)
export const sendCandidatesToAdminAndLD = async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to Admin and L&D'
      });
    }

    // ✅ EXISTING: Update candidates to send to BOTH Admin and L&D simultaneously - NO CHANGES
    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        status: 'sent'
      },
      {
        $set: {
          // Send to Admin
          sentToAdmin: true,
          sentToAdminAt: new Date(),
          // Send to L&D
          sentToLD: true,
          sentToLDAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent to Admin and L&D.'
      });
    }

    // ✅ NEW: Send email notification to BOTH ADMIN and L&D
    try {
      await emailService.sendCandidateTransferNotification(
        'HR TAG',
        ['ADMIN', 'L&D'], // Array for multiple portals
        updateResult.modifiedCount,
        'Admin Review and L&D Evaluation',
        req.user.empId
      );
      console.log('✅ Email notification sent to ADMIN and L&D successfully');
    } catch (emailError) {
      // ✅ Don't fail the main operation if email fails
      console.error('⚠️ Email notification failed:', emailError.message);
    }

    // ✅ EXISTING: Return success response - NO CHANGES
    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) to BOTH Admin and L&D`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to Admin and L&D'
    });
  }
};

// ✅ EXISTING: Update candidate - NO CHANGES
// @desc    Update candidate (only for 'submitted' status candidates)
// @route   PUT /api/hr-tag/update-candidate/:candidateId
// @access  Protected (HR Tag team only)
export const updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const {
      fullName,
      gender,
      fatherName,
      firstGraduate,
      experienceLevel,
      batchLabel,
      year,
      source,
      referenceName,
      native,
      mobileNumber,
      personalEmail,
      linkedinUrl,
      college
    } = req.body;

    // Find the candidate first
    const existingCandidate = await Candidate.findById(candidateId);

    if (!existingCandidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Only allow editing if candidate status is 'submitted'
    if (existingCandidate.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only candidates with submitted status can be edited'
      });
    }

    // Check if email or mobile number already exists (excluding current candidate)
    const duplicateCandidate = await Candidate.findOne({
      _id: { $ne: candidateId }, // Exclude current candidate
      $or: [
        { personalEmail: personalEmail.toLowerCase() },
        { mobileNumber: mobileNumber }
      ]
    });

    if (duplicateCandidate) {
      return res.status(400).json({
        success: false,
        message: 'Another candidate with this email or mobile number already exists'
      });
    }

    // Prepare update data
    const updateData = {
      fullName,
      gender,
      fatherName,
      firstGraduate,
      experienceLevel,
      source,
      native,
      mobileNumber,
      personalEmail: personalEmail.toLowerCase(),
      college,
      updatedAt: new Date()
    };

    // Add optional fields
    if (linkedinUrl) {
      updateData.linkedinUrl = linkedinUrl;
    } else {
      updateData.$unset = { linkedinUrl: 1 }; // Remove field if empty
    }

    if (referenceName) {
      updateData.referenceName = referenceName;
    } else if (source !== 'Reference') {
      // Remove referenceName if source is not Reference
      updateData.$unset = { ...updateData.$unset, referenceName: 1 };
    }

    // Handle fresher-specific fields
    if (experienceLevel === 'Fresher') {
      if (batchLabel) updateData.batchLabel = batchLabel;
      if (year) updateData.year = parseInt(year);
    } else {
      // Remove fresher fields if not a fresher
      updateData.$unset = { 
        ...updateData.$unset, 
        batchLabel: 1, 
        year: 1 
      };
    }

    // Update the candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      updateData,
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validations
      }
    );

    res.json({
      success: true,
      message: 'Candidate updated successfully',
      candidate: updatedCandidate
    });

  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update candidate',
      error: error.message
    });
  }
};

// ✅ EXISTING: Get admin candidates - NO CHANGES
// @desc    Get admin candidates
// @route   GET /api/hr-tag/admin-candidates
// @access  Protected (HR Tag team only)
export const getAdminCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({
      status: 'sent',
      sentToAdmin: true
    })
      .sort({ sentToAdminAt: -1 });

    res.json({
      success: true,
      candidates,
      total: candidates.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin candidates'
    });
  }
};

// ✅ EXISTING: Get deployed candidates - NO CHANGES
// @desc    Get deployed candidates (from L&D)
// @route   GET /api/hr-tag/deployed-candidates
// @access  Protected (HR Tag team only)
export const getDeployedCandidates = async (req, res) => {
  try {
    // Get candidates that have been sent to HR Tag from Delivery team
    const candidates = await Candidate.find({
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    })
      .sort({ sentToHRTagAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      candidates,
      total: candidates.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployed candidates'
    });
  }
};

// ✅ EXISTING: Get rejected/dropped candidates - NO CHANGES
// @desc    Get rejected/dropped candidates (FIXED with date filtering)
// @route   GET /api/hr-tag/rejected-candidates
// @access  Protected (HR Tag team only)
export const getRejectedCandidates = async (req, res) => {
  try {
    // Extract query parameters
    const {
      search = '',
      fromDate = '',
      toDate = ''
    } = req.query;

    // Build base query
    let query = {
      sentToLD: true,
      ldStatus: { $in: ['Rejected', 'Dropped'] }
    };

    // Add search functionality (if search term provided)
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { personalEmail: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date filter based on L&D decision date (ldStatusUpdatedAt)
    if (fromDate || toDate) {
      query.ldStatusUpdatedAt = {};
      
      if (fromDate) {
        // Start of the fromDate
        query.ldStatusUpdatedAt.$gte = new Date(fromDate);
      }
      
      if (toDate) {
        // End of the toDate (23:59:59.999)
        query.ldStatusUpdatedAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      }
    }

    // Get candidates that have been processed by L&D (Rejected, Dropped)
    const candidates = await Candidate.find(query)
      .sort({ ldStatusUpdatedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      candidates,
      total: candidates.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rejected/dropped candidates',
      error: error.message
    });
  }
};

// ✅ EXISTING: Get deployed candidates statistics - NO CHANGES
// @desc    Get deployed candidates statistics
// @route   GET /api/hr-tag/deployed-stats
// @access  Protected (HR Tag team only)
export const getDeployedStats = async (req, res) => {
  try {
    const stats = {
      total: await Candidate.countDocuments({ 
        status: 'sent', 
        sentToHRTag: true, 
        ldStatus: 'Selected' 
      }),
      pendingAllocation: await Candidate.countDocuments({ 
        status: 'sent', 
        sentToHRTag: true, 
        ldStatus: 'Selected',
        allocationStatus: 'Pending Allocation'
      }),
      allocated: await Candidate.countDocuments({ 
        status: 'sent', 
        sentToHRTag: true, 
        ldStatus: 'Selected',
        allocationStatus: 'Allocated'
      }),
      onHold: await Candidate.countDocuments({ 
        status: 'sent', 
        sentToHRTag: true, 
        ldStatus: 'Selected',
        allocationStatus: 'On Hold'
      }),
      completed: await Candidate.countDocuments({ 
        status: 'sent', 
        sentToHRTag: true, 
        ldStatus: 'Selected',
        allocationStatus: 'Completed'
      })
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployed candidates statistics'
    });
  }
};

// ✅ EXISTING: Send deployed candidates to HR Ops for permanent ID - NO CHANGES
// @desc    Send deployed candidates to HR Ops for permanent ID
// @route   POST /api/hr-tag/send-to-hr-ops-permanent
// @access  Protected (HR Tag team only)
export const sendToHROpsForPermanentID = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const sentBy = req.user.empId;
    const sentByName = req.user.name;

    // Validation
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to HR Ops'
      });
    }

    // Verify candidates are deployed and sent to HR Tag
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    });

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid deployed candidates found'
      });
    }

    if (candidates.length !== candidateIds.length) {
      return res.status(400).json({
        success: false,
        message: `Only ${candidates.length} out of ${candidateIds.length} candidates are valid for permanent ID assignment`
      });
    }

    // Update candidates to mark as sent to HR Ops for permanent ID
    const updateResult = await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      {
        $set: {
          sentToHROpsFromHRTag: true,
          sentToHROpsFromHRTagAt: new Date(),
          sentToHROpsFromHRTagBy: sentBy,
          sentToHROpsFromHRTagByName: sentByName
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} deployed candidate(s) to HR Ops for permanent Employee ID assignment`,
      sentCount: updateResult.modifiedCount,
      candidates: candidates.map(c => ({
        id: c._id,
        fullName: c.fullName,
        personalEmail: c.personalEmail,
        currentEmployeeId: c.employeeId
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to HR Ops for permanent ID assignment'
    });
  }
};

// ✅ EXISTING: Middleware wrapper for file upload - NO CHANGES
export const uploadMiddleware = upload.single('resume');