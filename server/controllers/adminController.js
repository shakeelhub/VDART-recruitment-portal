// controllers/adminController.js - COMPLETE Admin Controller with ALL Original Functions

import Candidate from '../schema/Candidate.js';

// @desc    Get all candidates for Admin review
// @route   GET /api/admin/candidates
// @access  Protected (Admin team only)
export const getAllCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

    // UPDATED QUERY: Include rejected/dropped candidates
    const query = {
      $or: [
        { sentToAdmin: true }, // Normal candidates sent to admin
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
            { officeEmail: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } }
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

      query.$and.push({ createdAt: dateQuery });
    }

    // Get candidates with pagination
    const candidates = await Candidate.find(query)
      .sort({ sentToAdminAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Candidate.countDocuments(query);

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
      filters: {
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      message: `Retrieved ${candidates.length} candidates for Admin review`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get deployed candidates (from L&D) - NEW for 3-card layout
// @route   GET /api/admin/deployed-candidates
// @access  Protected (Admin team only)
export const getDeployedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

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
        { employeeId: { $regex: search, $options: 'i' } },
        { allocationStatus: { $regex: search, $options: 'i' } }
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
      message: `Retrieved ${candidates.length} deployed candidates for Admin review`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get rejected/dropped candidates - NEW for 3-card layout
// @route   GET /api/admin/rejected-candidates
// @access  Protected (Admin team only)
export const getRejectedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

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
            { employeeId: { $regex: search, $options: 'i' } },
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
      message: `Retrieved ${candidates.length} rejected/dropped candidates for Admin review`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get Admin dashboard statistics - NEW
// @route   GET /api/admin/stats
// @access  Protected (Admin team only)
export const getAdminStats = async (req, res) => {
  try {

    // Total candidates for admin review
    const totalCandidates = await Candidate.countDocuments({
      $or: [
        { sentToAdmin: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    });

    // Deployed candidates
    const deployedCandidates = await Candidate.countDocuments({
      status: 'sent',
      sentToHRTag: true,
      ldStatus: 'Selected'
    });

    // Rejected candidates
    const rejectedCandidates = await Candidate.countDocuments({
      ldStatus: 'Rejected',
      sentToLD: true
    });

    // Dropped candidates
    const droppedCandidates = await Candidate.countDocuments({
      ldStatus: 'Dropped',
      sentToLD: true
    });

    // Candidates with complete processing (email + employee ID)
    const completeCandidates = await Candidate.countDocuments({
      status: 'sent',
      officeEmailAssignedBy: { $exists: true, $ne: null },
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });

    // This month candidates
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthCandidates = await Candidate.countDocuments({
      $or: [
        { sentToAdmin: true },
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
        { sentToAdmin: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      createdAt: { $gte: todayStart }
    });

    // Candidates sent to delivery
    const sentToDelivery = await Candidate.countDocuments({
      sentToDelivery: true
    });

    // Allocation status breakdown
    const allocationBreakdown = {
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

    // Recent activity (last 10 candidates with status changes)
    const recentActivity = await Candidate.find({
      $or: [
        { sentToAdmin: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' },
        { ldStatus: 'Selected' }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('fullName personalEmail ldStatus ldStatusUpdatedAt sentToAdminAt allocationStatus');

    // Format stats
    const stats = {
      overview: {
        total: totalCandidates,
        deployed: deployedCandidates,
        rejected: rejectedCandidates,
        dropped: droppedCandidates,
        complete: completeCandidates,
        thisMonth: thisMonthCandidates,
        today: todayCandidates,
        sentToDelivery: sentToDelivery
      },
      allocation: allocationBreakdown,
      recent: {
        activity: recentActivity
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Update candidate notes (Admin specific function)
// @route   PUT /api/admin/update-notes/:candidateId
// @access  Protected (Admin team only)
export const updateCandidateNotes = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { notes } = req.body;
    const updatedBy = req.user.empId;
    const updatedByName = req.user.name;

    // Find and update candidate
    const candidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        $or: [
          { sentToAdmin: true },
          { ldStatus: 'Rejected' },
          { ldStatus: 'Dropped' }
        ]
      },
      {
        adminNotes: notes || '',
        adminNotesUpdatedBy: updatedBy,
        adminNotesUpdatedAt: new Date()
      },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      message: `Notes updated successfully for ${candidate.fullName}`,
      candidate: {
        id: candidate._id,
        fullName: candidate.fullName,
        adminNotes: candidate.adminNotes,
        adminNotesUpdatedAt: candidate.adminNotesUpdatedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get candidate details with full history
// @route   GET /api/admin/candidate-details/:candidateId
// @access  Protected (Admin team only)
export const getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findOne({
      _id: candidateId,
      $or: [
        { sentToAdmin: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    }).select('-__v');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Build timeline of candidate journey
    const timeline = [];

    if (candidate.createdAt) {
      timeline.push({
        stage: 'Created',
        date: candidate.createdAt,
        by: candidate.submittedByName || 'HR Tag',
        status: 'Submitted'
      });
    }

    if (candidate.status === 'sent') {
      timeline.push({
        stage: 'Sent to Teams',
        date: candidate.updatedAt,
        by: 'HR Tag',
        status: 'Sent to IT & HR Ops'
      });
    }

    if (candidate.officeEmailAssignedAt) {
      timeline.push({
        stage: 'Office Email Assigned',
        date: candidate.officeEmailAssignedAt,
        by: 'IT Team',
        status: candidate.officeEmail
      });
    }

    if (candidate.employeeIdAssignedAt) {
      timeline.push({
        stage: 'Employee ID Assigned',
        date: candidate.employeeIdAssignedAt,
        by: 'HR Ops',
        status: candidate.employeeId
      });
    }

    if (candidate.sentToAdminAt) {
      timeline.push({
        stage: 'Sent to Admin',
        date: candidate.sentToAdminAt,
        by: 'HR Tag',
        status: 'Under Admin Review'
      });
    }

    if (candidate.sentToLDAt) {
      timeline.push({
        stage: 'Sent to L&D',
        date: candidate.sentToLDAt,
        by: 'HR Tag',
        status: 'Under L&D Review'
      });
    }

    if (candidate.ldStatusUpdatedAt) {
      timeline.push({
        stage: 'L&D Decision',
        date: candidate.ldStatusUpdatedAt,
        by: 'L&D Team',
        status: `${candidate.ldStatus}${candidate.ldReason ? ` - ${candidate.ldReason}` : ''}`
      });
    }

    if (candidate.sentToHRTagAt) {
      timeline.push({
        stage: 'Sent to HR Tag',
        date: candidate.sentToHRTagAt,
        by: candidate.sentToHRTagByName || 'L&D Team',
        status: 'Deployment Process'
      });
    }

    if (candidate.sentToDeliveryAt) {
      timeline.push({
        stage: 'Sent to Delivery',
        date: candidate.sentToDeliveryAt,
        by: candidate.sentToDeliveryByName || 'System',
        status: 'Allocation Process'
      });
    }

    // Sort timeline by date
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      candidate,
      timeline,
      message: `Retrieved details for ${candidate.fullName}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};