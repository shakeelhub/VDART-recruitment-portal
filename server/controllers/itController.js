// controllers/itController.js - COMPLETE IT Controller with ALL Original Functions

import Candidate from '../schema/Candidate.js';
import Employee from '../schema/Employee.js';

// @desc    Get all candidates for IT management
// @route   GET /api/it/candidates
// @access  Protected (IT team only)
export const getAllCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    
    console.log(`📄 Fetching candidates for IT Team by ${req.user.name} (${req.user.empId})`);
    console.log(`🔍 Query params:`, { search, fromDate, toDate, page, limit });

    // UPDATED QUERY: Include rejected/dropped candidates
    const query = {
      $or: [
        { status: 'sent' }, // Normal sent candidates
        { ldStatus: 'Rejected' }, // Rejected by L&D
        { ldStatus: 'Dropped' } // Dropped by L&D
      ]
    };
    
    // Add search functionality
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { personalEmail: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { fatherName: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } },
            { native: { $regex: search, $options: 'i' } },
            { source: { $regex: search, $options: 'i' } },
            { officeEmail: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // Add date filtering
    if (fromDate || toDate) {
      if (!query.$and) query.$and = [];
      const dateQuery = {};
      
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        dateQuery.$gte = startDate;
        console.log(`📅 From date: ${startDate}`);
      }
      
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDate;
        console.log(`📅 To date: ${endDate}`);
      }
      
      query.$and.push({ createdAt: dateQuery });
    }

    console.log(`🔍 Final query:`, JSON.stringify(query, null, 2));

    // Get candidates with pagination
    const candidates = await Candidate.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v'); // Include all fields

    const total = await Candidate.countDocuments(query);

    // Count candidates with office email ASSIGNED BY IT TEAM
    const withOfficeEmail = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: true, $ne: null }
    });
    const withoutOfficeEmail = total - withOfficeEmail;

    // Success response
    res.json({
      success: true,
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total,
        withOfficeEmail,
        withoutOfficeEmail
      },
      filters: {
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      message: `Retrieved ${candidates.length} candidates for IT Team management`
    });

    console.log(`✅ Retrieved ${candidates.length}/${total} candidates for IT Team`);
    console.log(`📊 Stats: ${withOfficeEmail} assigned by IT, ${withoutOfficeEmail} pending`);

  } catch (error) {
    console.error('❌ Error fetching candidates for IT Team:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get deployed candidates (from L&D) - NEW for 3-card layout
// @route   GET /api/it/deployed-candidates
// @access  Protected (IT team only)
export const getDeployedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    
    console.log(`🚀 [IT] Fetching deployed candidates by ${req.user.name}`);

    // Only deployed candidates from L&D
    const query = {
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    };
    
    // Add search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { personalEmail: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { officeEmail: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date filtering
    if (fromDate || toDate) {
      query.sentToHRTagAt = {};
      
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.sentToHRTagAt.$gte = startDate;
      }
      
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.sentToHRTagAt.$lte = endDate;
      }
    }

    const candidates = await Candidate.find(query)
      .sort({ sentToHRTagAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Candidate.countDocuments(query);

    res.json({
      success: true,
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      message: `Retrieved ${candidates.length} deployed candidates for IT Team`
    });

    console.log(`✅ [IT] Retrieved ${candidates.length}/${total} deployed candidates`);

  } catch (error) {
    console.error('❌ [IT] Error fetching deployed candidates:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get rejected/dropped candidates - NEW for 3-card layout
// @route   GET /api/it/rejected-candidates
// @access  Protected (IT team only)
export const getRejectedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    
    console.log(`❌ [IT] Fetching rejected/dropped candidates by ${req.user.name}`);

    // Only rejected/dropped candidates from L&D
    const query = {
      $or: [
        { ldStatus: 'Selected' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      sentToLD: true
    };
    
    // Add search functionality
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { personalEmail: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { officeEmail: { $regex: search, $options: 'i' } },
            { ldReason: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // Add date filtering
    if (fromDate || toDate) {
      if (!query.$and) query.$and = [];
      const dateQuery = {};
      
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        dateQuery.$gte = startDate;
      }
      
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDate;
      }
      
      query.$and.push({ ldStatusUpdatedAt: dateQuery });
    }

    const candidates = await Candidate.find(query)
      .sort({ ldStatusUpdatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Candidate.countDocuments(query);

    res.json({
      success: true,
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      message: `Retrieved ${candidates.length} rejected/dropped candidates for IT Team`
    });

    console.log(`✅ [IT] Retrieved ${candidates.length}/${total} rejected/dropped candidates`);

  } catch (error) {
    console.error('❌ [IT] Error fetching rejected/dropped candidates:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Assign office email to candidate
// @route   PUT /api/it/assign-office-email/:candidateId
// @access  Protected (IT team only)
export const assignOfficeEmail = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { officeEmail } = req.body;
    const assignedBy = req.user.empId;
    const assignedByName = req.user.name;

    console.log(`📧 Assigning office email to candidate ${candidateId} by ${assignedByName} (IT Team)`);
    console.log(`📧 Email to assign: ${officeEmail}`);

    // Validation
    if (!officeEmail || !officeEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Office email is required'
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(officeEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if office email already exists
    const existingCandidate = await Candidate.findOne({ 
      officeEmail: officeEmail.toLowerCase(),
      _id: { $ne: candidateId } 
    });

    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: `Office email ${officeEmail} is already assigned to ${existingCandidate.fullName}`
      });
    }

    // Find candidate - UPDATED to include rejected/dropped candidates
    const candidate = await Candidate.findOne({ 
      _id: candidateId,
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    console.log(`📧 Found candidate: ${candidate.fullName}`);

    // Use findByIdAndUpdate for atomic operation
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        officeEmail: officeEmail.toLowerCase().trim(),
        officeEmailAssignedBy: assignedBy,
        officeEmailAssignedAt: new Date()
      },
      { 
        new: true,           // Return updated document
        runValidators: true  // Run schema validators
      }
    );

    if (!updatedCandidate) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update candidate'
      });
    }

    console.log(`✅ Office email successfully assigned: ${updatedCandidate.officeEmail}`);
    console.log(`✅ Assigned by: ${updatedCandidate.officeEmailAssignedBy}`);
    console.log(`✅ Assigned at: ${updatedCandidate.officeEmailAssignedAt}`);

    // Verify the update was successful
    const verifyCandidate = await Candidate.findById(candidateId);
    console.log(`🔍 Verification - Office email in DB: ${verifyCandidate.officeEmail}`);

    // Success response
    res.json({
      success: true,
      message: `Office email ${officeEmail} assigned successfully to ${updatedCandidate.fullName} by IT Team`,
      candidate: {
        id: updatedCandidate._id,
        fullName: updatedCandidate.fullName,
        personalEmail: updatedCandidate.personalEmail,
        officeEmail: updatedCandidate.officeEmail,
        officeEmailAssignedBy: updatedCandidate.officeEmailAssignedBy,
        officeEmailAssignedAt: updatedCandidate.officeEmailAssignedAt
      }
    });

    console.log(`✅ Office email ${officeEmail} assigned to ${updatedCandidate.fullName} by ${assignedByName} (IT Team)`);

  } catch (error) {
    console.error('❌ Error assigning office email:', error.message);
    console.error('❌ Full error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get IT Team dashboard statistics
// @route   GET /api/it/stats
// @access  Protected (IT team only)
export const getITStats = async (req, res) => {
  try {
    console.log(`📊 Fetching IT Team stats for ${req.user.name}`);

    // Get counts for candidates including rejected/dropped
    const totalCandidates = await Candidate.countDocuments({
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    });
    
    // Candidates with office email ASSIGNED BY IT TEAM
    const withOfficeEmail = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: true, $ne: null }
    });
    
    // Candidates without IT team assignment
    const withoutOfficeEmail = totalCandidates - withOfficeEmail;

    // This month candidates
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthCandidates = await Candidate.countDocuments({
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      createdAt: { $gte: thisMonthStart }
    });

    // Today's candidates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCandidates = await Candidate.countDocuments({
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      createdAt: { $gte: todayStart }
    });

    // Deployed candidates count
    const deployedCandidates = await Candidate.countDocuments({
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    });

    // Rejected/Dropped candidates count
    const rejectedCandidates = await Candidate.countDocuments({
      ldStatus: 'Rejected',
      sentToLD: true
    });

    const droppedCandidates = await Candidate.countDocuments({
      ldStatus: 'Dropped',
      sentToLD: true
    });

    // Recent candidates without IT assignment (last 5)
    const recentWithoutOfficeEmail = await Candidate.find({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: false }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName personalEmail mobileNumber createdAt');

    // Recent candidates with IT assignment (last 5)
    const recentWithOfficeEmail = await Candidate.find({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: true, $ne: null }
    })
      .sort({ officeEmailAssignedAt: -1 })
      .limit(5)
      .select('fullName personalEmail officeEmail officeEmailAssignedAt');

    // Format stats
    const stats = {
      overview: {
        total: totalCandidates,
        withOfficeEmail,
        withoutOfficeEmail,
        thisMonth: thisMonthCandidates,
        today: todayCandidates,
        deployed: deployedCandidates,
        rejected: rejectedCandidates,
        dropped: droppedCandidates
      },
      recent: {
        withoutOfficeEmail: recentWithoutOfficeEmail,
        withOfficeEmail: recentWithOfficeEmail
      }
    };

    res.json({
      success: true,
      stats
    });

    console.log(`✅ IT Team stats retrieved: ${totalCandidates} total candidates, ${withOfficeEmail} assigned by IT, ${withoutOfficeEmail} pending IT assignment`);

  } catch (error) {
    console.error('❌ Error fetching IT Team stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};