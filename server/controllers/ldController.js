import Candidate from '../schema/Candidate.js';

// Helper function to safely get user info
const getUserInfo = (req) => {
  if (!req.user) {
    return { name: 'Unknown User', empId: 'UNKNOWN' };
  }
  return {
    name: req.user.name || 'Unknown User',
    empId: req.user.empId || req.user.employeeId || 'UNKNOWN'
  };
};

// @desc    Get candidates sent to L&D
// @route   GET /api/ld/candidates
// @access  Protected (L&D team only)
export const getLDCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    const userInfo = getUserInfo(req);
    
    let query = {
      sentToLD: true
    };

    // Add search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { personalEmail: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { native: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { officeEmail: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { ldReason: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date filtering
    if (fromDate || toDate) {
      query.sentToLDAt = {};
      
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.sentToLDAt.$gte = startDate;
      }
      
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.sentToLDAt.$lte = endDate;
      }
    }

    const candidates = await Candidate.find(query)
      .sort({ sentToLDAt: -1 })
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
      filters: {
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      count: candidates.length,
      message: `Retrieved ${candidates.length} candidates for L&D review`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching candidates'
    });
  }
};

// @desc    Update L&D status of candidate
// @route   PUT /api/ld/update-status/:candidateId
// @access  Protected (L&D team only)
export const updateLDStatus = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { ldStatus, ldReason } = req.body;
    const userInfo = getUserInfo(req);

    // Validation
    if (!ldStatus) {
      return res.status(400).json({
        success: false,
        message: 'L&D Status is required'
      });
    }

    // Validate status values
    const allowedStatuses = ['Selected', 'Rejected', 'Dropped'];
    if (!allowedStatuses.includes(ldStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid L&D status'
      });
    }

    // Validate reason for rejected/dropped
    if ((ldStatus === 'Rejected' || ldStatus === 'Dropped') && !ldReason) {
      return res.status(400).json({
        success: false,
        message: `Reason is required for ${ldStatus.toLowerCase()} status`
      });
    }

    // Find the candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if candidate was sent to L&D
    if (!candidate.sentToLD) {
      return res.status(400).json({
        success: false,
        message: 'Candidate has not been sent to L&D'
      });
    }

    // Prepare update object with EMPLOYEE NAME
    const updateData = {
      ldStatus,
      ldReason: ldReason || '',
      ldStatusUpdatedBy: userInfo.empId,
      ldStatusUpdatedByName: userInfo.name,
      ldStatusUpdatedAt: new Date()
    };

    // **CRITICAL ROUTING LOGIC**: If status is Rejected or Dropped, 
    // send candidate back to all relevant dashboards
    if (ldStatus === 'Rejected' || ldStatus === 'Dropped') {
      updateData.sentToHRTag = true;
      updateData.sentToHRTagAt = new Date();
      updateData.sentToHRTagBy = userInfo.empId;
      updateData.sentToHRTagByName = userInfo.name;
      
      updateData.sentToAdmin = true;
      updateData.sentToAdminAt = new Date();
      updateData.sentToAdminBy = userInfo.empId;
      updateData.sentToAdminByName = userInfo.name;
    }

    // // If status is Selected, send to HR Tag for deployment
    // if (ldStatus === 'Selected') {
    //   updateData.sentToHRTag = true;
    //   updateData.sentToHRTagAt = new Date();
    //   updateData.sentToHRTagBy = userInfo.empId;
    //   updateData.sentToHRTagByName = userInfo.name;
    // }

    // Update the candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      updateData,
      { new: true, runValidators: true }
    );

    // Prepare response message
    let responseMessage = `L&D status updated to ${ldStatus}`;
    if (ldStatus === 'Rejected' || ldStatus === 'Dropped') {
      responseMessage += ` and candidate sent back to HR Tag, HR Ops, IT, and Admin dashboards`;
    } else if (ldStatus === 'Selected') {
      responseMessage += ` and candidate sent to HR Tag for deployment`;
    }

    res.json({
      success: true,
      message: responseMessage,
      candidate: {
        _id: updatedCandidate._id,
        fullName: updatedCandidate.fullName,
        ldStatus: updatedCandidate.ldStatus,
        ldReason: updatedCandidate.ldReason,
        ldStatusUpdatedAt: updatedCandidate.ldStatusUpdatedAt,
        ldStatusUpdatedBy: updatedCandidate.ldStatusUpdatedBy,
        ldStatusUpdatedByName: updatedCandidate.ldStatusUpdatedByName
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating L&D status'
    });
  }
};

// @desc    Send selected candidates to delivery team
// @route   POST /api/ld/send-to-delivery
// @access  Protected (L&D team only)
export const sendToDelivery = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const userInfo = getUserInfo(req);

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to delivery team'
      });
    }

    // Find candidates that are selected and not already sent to delivery
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
      ldStatus: 'Selected',
      sentToDelivery: false
    });

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible candidates found for delivery team'
      });
    }

    // Separate candidates by experience level
    const freshers = candidates.filter(c => c.experienceLevel === 'Fresher');
    const laterals = candidates.filter(c => c.experienceLevel === 'Lateral');

    let fresherUpdateResult = { modifiedCount: 0 };
    let lateralUpdateResult = { modifiedCount: 0 };

    // Update FRESHERS - Standard flow (goes to Training-Cleared)
    if (freshers.length > 0) {
      const fresherIds = freshers.map(c => c._id);
      
      fresherUpdateResult = await Candidate.updateMany(
        { 
          _id: { $in: fresherIds },
          ldStatus: 'Selected',
          sentToDelivery: false
        },
        {
          $set: {
            sentToDelivery: true,
            sentToDeliveryAt: new Date(),
            sentToDeliveryBy: userInfo.empId,
            sentToDeliveryByName: userInfo.name
          }
        }
      );
    }

    // Update LATERALS - Direct to Ready-to-Deploy (mark as allocated)
    if (laterals.length > 0) {
      const lateralIds = laterals.map(c => c._id);
      
      lateralUpdateResult = await Candidate.updateMany(
        { 
          _id: { $in: lateralIds },
          ldStatus: 'Selected',
          sentToDelivery: false
        },
        {
          $set: {
            sentToDelivery: true,
            sentToDeliveryAt: new Date(),
            sentToDeliveryBy: userInfo.empId,
            sentToDeliveryByName: userInfo.name,
            // Mark laterals as ready for deployment (skip permanent ID process)
            allocationStatus: 'Pending Allocation'
          }
        }
      );
    }

    const totalSent = fresherUpdateResult.modifiedCount + lateralUpdateResult.modifiedCount;

    // Build response message
    let message = `Successfully sent ${totalSent} selected candidate(s) to delivery team`;
    if (freshers.length > 0 && laterals.length > 0) {
      message += ` (${fresherUpdateResult.modifiedCount} freshers to Training-Cleared, ${lateralUpdateResult.modifiedCount} laterals directly to Ready-to-Deploy)`;
    } else if (freshers.length > 0) {
      message += ` (${fresherUpdateResult.modifiedCount} freshers to Training-Cleared)`;
    } else if (laterals.length > 0) {
      message += ` (${lateralUpdateResult.modifiedCount} laterals directly to Ready-to-Deploy)`;
    }

    res.json({
      success: true,
      message,
      sentCount: totalSent,
      breakdown: {
        freshers: fresherUpdateResult.modifiedCount,
        laterals: lateralUpdateResult.modifiedCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while sending candidates to delivery team'
    });
  }
};
// @desc    Get L&D statistics - FIXED STRUCTURE TO MATCH DASHBOARD
// @route   GET /api/ld/stats
// @access  Protected (L&D team only)
export const getLDStats = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // Total candidates sent to L&D
    const total = await Candidate.countDocuments({
      sentToLD: true
    });

    // L&D Status breakdown
    const deployed = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Selected'
    });

    const rejected = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Rejected'
    });

    const dropped = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Dropped'
    });

    // Sent to delivery count
    const sentToDelivery = await Candidate.countDocuments({
      sentToLD: true,
      sentToDelivery: true
    });

    // Pending L&D review (sent but no status yet or status is 'Pending')
    const pending = await Candidate.countDocuments({
      sentToLD: true,
      $or: [
        { ldStatus: { $exists: false } },
        { ldStatus: null },
        { ldStatus: '' },
        { ldStatus: 'Pending' }
      ]
    });

    // This month L&D activity
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const thisMonthSentToLD = await Candidate.countDocuments({
      sentToLD: true,
      sentToLDAt: { $gte: thisMonthStart }
    });

    const thisMonthRejected = await Candidate.countDocuments({
      ldStatus: 'Rejected',
      ldStatusUpdatedAt: { $gte: thisMonthStart }
    });

    const thisMonthDropped = await Candidate.countDocuments({
      ldStatus: 'Dropped',
      ldStatusUpdatedAt: { $gte: thisMonthStart }
    });

    // Today's L&D activity
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRejected = await Candidate.countDocuments({
      ldStatus: 'Rejected',
      ldStatusUpdatedAt: { $gte: todayStart }
    });

    const todayDropped = await Candidate.countDocuments({
      ldStatus: 'Dropped',
      ldStatusUpdatedAt: { $gte: todayStart }
    });

    // Recent rejected candidates (last 5)
    const recentRejected = await Candidate.find({
      ldStatus: 'Rejected',
      sentToLD: true
    })
      .sort({ ldStatusUpdatedAt: -1 })
      .limit(5)
      .select('fullName personalEmail ldReason ldStatusUpdatedAt');

    // Recent dropped candidates (last 5)
    const recentDropped = await Candidate.find({
      ldStatus: 'Dropped',
      sentToLD: true
    })
      .sort({ ldStatusUpdatedAt: -1 })
      .limit(5)
      .select('fullName personalEmail ldReason ldStatusUpdatedAt');

    // 🔥 FIXED: Format stats to match dashboard expectations
    const stats = {
      total,
      deployed,
      rejected,
      dropped,
      sentToDelivery,
      pending,
      overview: {
        totalSentToLD: total,
        selectedByLD: deployed,
        rejectedByLD: rejected,
        droppedByLD: dropped,
        pendingLDReview: pending,
        thisMonthSentToLD,
        thisMonthRejected,
        thisMonthDropped,
        todayRejected,
        todayDropped
      },
      breakdown: {
        processed: deployed + rejected + dropped,
        unprocessed: pending,
        rejectedAndDropped: rejected + dropped
      },
      recent: {
        rejected: recentRejected,
        dropped: recentDropped
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

// @desc    Get L&D processing status statistics for HR Ops
// @route   GET /api/hr-ops/ld-status-stats
// @access  Protected (HR Ops team only)
export const getLDStatusStats = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // Total candidates sent to L&D
    const totalSentToLD = await Candidate.countDocuments({
      sentToLD: true
    });

    // L&D Status breakdown
    const selectedCount = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Selected'
    });

    const rejectedCount = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Rejected'
    });

    const droppedCount = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Dropped'
    });

    // Pending L&D review (sent but no decision yet)
    const pendingLDReview = await Candidate.countDocuments({
      sentToLD: true,
      $or: [
        { ldStatus: { $exists: false } },
        { ldStatus: null },
        { ldStatus: '' },
        { ldStatus: 'Pending' }
      ]
    });

    // This month L&D processing
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthLDProcessed = await Candidate.countDocuments({
      sentToLD: true,
      ldStatusUpdatedAt: { $gte: thisMonthStart }
    });

    // Today's L&D decisions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLDDecisions = await Candidate.countDocuments({
      sentToLD: true,
      ldStatusUpdatedAt: { $gte: todayStart }
    });

    // Recent L&D decisions (last 5)
    const recentLDDecisions = await Candidate.find({
      sentToLD: true,
      ldStatus: { $in: ['Selected', 'Rejected', 'Dropped'] }
    })
      .sort({ ldStatusUpdatedAt: -1 })
      .limit(5)
      .select('fullName personalEmail ldStatus ldReason ldStatusUpdatedAt ldStatusUpdatedBy');

    // Recent pending L&D review (last 5)
    const recentPendingLD = await Candidate.find({
      sentToLD: true,
      $or: [
        { ldStatus: { $exists: false } },
        { ldStatus: null },
        { ldStatus: '' },
        { ldStatus: 'Pending' }
      ]
    })
      .sort({ sentToLDAt: -1 })
      .limit(5)
      .select('fullName personalEmail sentToLDAt');

    // Format comprehensive L&D stats
    const stats = {
      overview: {
        totalSentToLD,
        selectedCount,
        rejectedCount,
        droppedCount,
        pendingLDReview,
        thisMonthProcessed: thisMonthLDProcessed,
        todayDecisions: todayLDDecisions
      },
      breakdown: {
        processed: selectedCount + rejectedCount + droppedCount,
        pending: pendingLDReview,
        successRate: totalSentToLD > 0 ? ((selectedCount / totalSentToLD) * 100).toFixed(1) : 0
      },
      recent: {
        decisions: recentLDDecisions,
        pending: recentPendingLD
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