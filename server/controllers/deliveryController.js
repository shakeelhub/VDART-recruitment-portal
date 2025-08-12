import Candidate from '../schema/Candidate.js';
import Deployment from '../schema/Deployment.js';
import Employee from '../schema/Employee.js';

// @desc    Get candidates sent from HR Ops (with permanent IDs) - FIXED
// @route   GET /api/delivery/hrops-candidates
// @access  Protected (Delivery team only) x
export const getHROpsDeliveryCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

    // ✅ FIXED: Build query for candidates sent through permanent ID flow
    const query = {
      status: 'sent',
      sentToDeliveryForPermanent: true,  // ✅ Use the correct field
      permanentEmployeeId: { $exists: true, $ne: null }
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
        { permanentEmployeeId: { $regex: search, $options: 'i' } }
      ];
      
      query.$and = [
        { status: 'sent' },
        { sentToDeliveryForPermanent: true },  // ✅ Use the correct field
        { permanentEmployeeId: { $exists: true, $ne: null } },
        { $or: query.$or }
      ];
      delete query.$or;
    }

    // ✅ FIXED: Add date filtering based on permanent ID delivery date
    if (fromDate || toDate) {
      query.sentToDeliveryForPermanentAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.sentToDeliveryForPermanentAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.sentToDeliveryForPermanentAt.$lte = endDate;  // ✅ FIXED: Added missing line
      }
    }

    // Get candidates with pagination
    const candidates = await Candidate.find(query)
      .sort({ sentToDeliveryForPermanentAt: -1 }) // ✅ FIXED: Sort by correct field
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
      message: `Retrieved ${candidates.length} candidates from HR Ops`
    });

  } catch (error) {
    console.error('Error in getHROpsDeliveryCandidates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};


// @desc    Get delivery dashboard statistics - FULLY FIXED VERSION
// @route   GET /api/delivery/stats  
// @access  Protected (Delivery team only)
export const getDeliveryStats = async (req, res) => {
  try {
    // ✅ FIXED: CARD 1: TRAINING PIPELINE - Only count freshers actually in trainingzzz
    const totalFreshers = await Candidate.countDocuments({
      status: 'sent',
      experienceLevel: 'Fresher',
      // ✅ FIXED: Don't require sentToDelivery - count all freshers in the system
      $or: [
        { sentToDelivery: true },
        { sentToDeliveryForPermanent: true }
      ]
    });

    const sentToHRTag = await Candidate.countDocuments({
      status: 'sent',
      experienceLevel: 'Fresher',
      sentToHRTag: true,
      $or: [
        { sentToDelivery: true },
        { sentToDeliveryForPermanent: true }
      ]
    });

    const pendingHRTag = totalFreshers - sentToHRTag;

    // ✅ CARD 2: READY TO DEPLOY - Match the table query exactly
    const readyToDeploy = await Candidate.countDocuments({
      status: 'sent',
      $or: [
        // Freshers with permanent IDs sent through permanent ID flow
        {
          experienceLevel: 'Fresher',
          permanentEmployeeId: { $exists: true, $ne: null },
          sentToDeliveryForPermanent: true
        },
        // Laterals sent through regular delivery flow
        {
          experienceLevel: 'Lateral',
          sentToDelivery: true
        }
      ]
    });

    // ✅ Deployed count - candidates with deployment email sent
    const deployed = await Candidate.countDocuments({
      status: 'sent',
      $or: [
        // Freshers with permanent IDs who have deployment email sent
        {
          experienceLevel: 'Fresher',
          permanentEmployeeId: { $exists: true, $ne: null },
          sentToDeliveryForPermanent: true,
          deploymentEmailSent: true
        },
        // Laterals who have deployment email sent
        {
          experienceLevel: 'Lateral',
          sentToDelivery: true,
          deploymentEmailSent: true
        }
      ]
    });

    const nonDeployed = readyToDeploy - deployed;

    // CARD 3: DEPLOYMENT STATUS (Keep existing logic)
    const totalDeployments = await Deployment.countDocuments({});

    const inactiveDeployments = await Deployment.countDocuments({
      $or: [
        { status: { $regex: /^inactive$/i } },
        { exitDate: { $exists: true, $ne: null, $ne: '' } }
      ]
    });

    const internalTransferDeployments = await Deployment.countDocuments({
      $and: [
        { internalTransferDate: { $exists: true, $ne: null, $ne: '' } },
        {
          $or: [
            { exitDate: { $exists: false } },
            { exitDate: null },
            { exitDate: '' }
          ]
        },
        {
          $or: [
            { status: { $exists: false } },
            { status: null },
            { status: '' },
            { status: { $not: { $regex: /^inactive$/i } } }
          ]
        }
      ]
    });

    const activeDeployments = totalDeployments - inactiveDeployments;

    // CARD 4: RESOURCES FROM L&D (Same logic as HR Ops)
    const rejected = await Candidate.countDocuments({
      ldStatus: 'Rejected',
      sentToLD: true
    });

    const dropped = await Candidate.countDocuments({
      ldStatus: 'Dropped',
      sentToLD: true
    });

    // RESPONSE with drill-down structure
    const stats = {
      // Card 1: Training Pipeline
      trainingPipeline: {
        total: totalFreshers,
        sentToHRTag: sentToHRTag,
        pendingHRTag: pendingHRTag
      },

      // Card 2: Ready to Deploy
      readyToDeploy: {
        total: readyToDeploy,
        deployed: deployed,
        nonDeployed: nonDeployed
      },

      // Card 3: Deployment Status
      deploymentStatus: {
        total: totalDeployments,
        active: activeDeployments,
        inactive: inactiveDeployments,
        transfers: internalTransferDeployments
      },

      // Card 4: Resources from L&D
      resourcesFromLD: {
        total: rejected + dropped,
        rejected: rejected,
        dropped: dropped
      },

      // Legacy fields (keep for compatibility if needed)
      trainingCleared: totalFreshers,
      deployed: totalDeployments
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error in getDeliveryStats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const getTrainingClearedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

    // DEBUG: Check what's actually in the database
    const allDelivery = await Candidate.find({
      sentToDelivery: true
    }).select('fullName status experienceLevel sentToDelivery sentToHRTag sentToDeliveryAt');

    // DEBUG: Check freshers specifically  
    const allFreshers = await Candidate.find({
      sentToDelivery: true,
      experienceLevel: 'Fresher'
    }).select('fullName status experienceLevel sentToDelivery sentToHRTag');

    // Your actual query
    const query = {
      status: 'sent',
      sentToDelivery: true,
      experienceLevel: 'Fresher'

    };

    const candidates = await Candidate.find(query).select('-__v');

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
      message: `Retrieved ${candidates.length} training-cleared freshers`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Get ready-to-deploy candidates (Freshers with permanent ID + All Laterals)
// @route   GET /api/delivery/ready-to-deploy
// @access  Protected (Delivery team only) x
export const getReadyToDeployCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

    // ✅ FIXED: Updated query to match the permanent ID delivery flow
    const query = {
      status: 'sent',
      $or: [
        // ✅ FIXED: Freshers with permanent IDs sent through permanent ID flow
        {
          experienceLevel: 'Fresher',
          permanentEmployeeId: { $exists: true, $ne: null },
          sentToDeliveryForPermanent: true  // ✅ Use the new field
        },
        // ✅ FIXED: Laterals sent through regular delivery flow (they use temp ID as permanent)
        {
          experienceLevel: 'Lateral',
          sentToDelivery: true
        }
      ]
    };

    // Add search functionality
    if (search) {
      const searchOr = [
        { fullName: { $regex: search, $options: 'i' } },
        { personalEmail: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { permanentEmployeeId: { $regex: search, $options: 'i' } }
      ];

      query.$and = [
        { $or: query.$or },
        { $or: searchOr }
      ];
      delete query.$or;
    }

    // Add date filtering - ✅ FIXED: Use appropriate date field based on experience level
    if (fromDate || toDate) {
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

      // ✅ FIXED: Use OR condition for date filtering since we have two different delivery paths
      if (!query.$and) query.$and = [];
      query.$and.push({
        $or: [
          { sentToDeliveryForPermanentAt: dateQuery }, // For freshers with permanent ID
          { sentToDeliveryAt: dateQuery }              // For laterals
        ]
      });
    }

    // ✅ FIXED: Proper sorting - use aggregation pipeline to handle conditional sorting
    const candidates = await Candidate.aggregate([
      { $match: query },
      {
        $addFields: {
          // Create a single sort field that takes the appropriate date based on experience level
          sortDate: {
            $cond: {
              if: { $eq: ["$experienceLevel", "Fresher"] },
              then: "$sentToDeliveryForPermanentAt",
              else: "$sentToDeliveryAt"
            }
          }
        }
      },
      { $sort: { sortDate: -1 } }, // Sort by the computed date field
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      { $project: { __v: 0, sortDate: 0 } } // Remove the temporary sortDate field
    ]);

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
      message: `Retrieved ${candidates.length} ready-to-deploy candidates`
    });

  } catch (error) {
    console.error('Error in getReadyToDeployCandidates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const getEmailSentCandidates = async (req, res) => {
  try {
    // Query Deployment collection to get all candidates with sent emails
    const deployments = await Deployment.find({})
      .select('candidateId')
      .lean();

    const candidateIds = deployments.map(d => d.candidateId.toString());

    res.json({
      success: true,
      candidateIds,
      count: candidateIds.length,
      message: `Retrieved ${candidateIds.length} candidates with deployment emails`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching email sent candidates'
    });
  }
};

// @desc    Get all candidates for delivery management
// @route   GET /api/delivery/candidates
// @access  Protected (Delivery team only)
export const getDeliveryCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;

    // Build query - ONLY get candidates sent to delivery
    const query = {
      status: 'sent',
      sentToDelivery: true
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
        { permanentEmployeeId: { $regex: search, $options: 'i' } }
      ];
      // Also ensure candidates are sent to delivery
      query.$and = [
        { status: 'sent' },
        { sentToDelivery: true },
        { $or: query.$or }
      ];
      delete query.$or;
    }

    // Add date filtering based on when they were sent to delivery
    if (fromDate || toDate) {
      query.sentToDeliveryAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.sentToDeliveryAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.sentToDeliveryAt.$lte = endDate;
      }
    }

    // Get candidates with pagination
    const candidates = await Candidate.find(query)
      .sort({ sentToDeliveryAt: -1 }) // Latest first
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v'); // Include all fields

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
      message: `Retrieved ${candidates.length} candidates for delivery management`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Update candidate allocation status
// @route   PUT /api/delivery/update-allocation/:candidateId
// @access  Protected (Delivery team only)
export const updateAllocationStatus = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { allocationStatus, assignedProject, assignedTeam, allocationNotes } = req.body;
    const updatedBy = req.user.empId;
    const updatedByName = req.user.name;

    // Validation
    if (!allocationStatus) {
      return res.status(400).json({
        success: false,
        message: 'Allocation status is required'
      });
    }

    // Find candidate
    const candidate = await Candidate.findOne({
      _id: candidateId,
      status: 'sent',
      sentToDelivery: true
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found or not sent to delivery'
      });
    }

    // Update candidate allocation
    candidate.allocationStatus = allocationStatus;
    candidate.assignedProject = assignedProject || candidate.assignedProject;
    candidate.assignedTeam = assignedTeam || candidate.assignedTeam;
    candidate.allocationNotes = allocationNotes || candidate.allocationNotes;
    candidate.allocationUpdatedBy = updatedBy;
    candidate.allocationUpdatedAt = new Date();

    await candidate.save();

    // Success response
    res.json({
      success: true,
      message: `Allocation updated successfully for ${candidate.fullName}`,
      candidate: {
        id: candidate._id,
        fullName: candidate.fullName,
        allocationStatus: candidate.allocationStatus,
        assignedProject: candidate.assignedProject,
        assignedTeam: candidate.assignedTeam
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// @desc    Send candidates to HR Tag as deployed
// @route   POST /api/delivery/send-to-hr-tag
// @access  Protected (Delivery team only)
export const sendCandidatesToHRTag = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const sentBy = req.user.empId;
    const sentByName = req.user.name;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to HR Tag'
      });
    }

    // Update candidates to mark as sent to HR Tag
    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        status: 'sent',
        sentToDelivery: true
      },
      {
        $set: {
          sentToHRTag: true,
          sentToHRTagAt: new Date(),
          sentToHRTagBy: sentBy,
          sentToHRTagByName: sentByName
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent to HR Tag. Make sure candidates are available for deployment.'
      });
    }

    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) to HR Tag as deployed candidates`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to HR Tag'
    });
  }
};

// @desc    Create deployment record after email sent - UPDATED to mark candidate as deployed
// @route   POST /api/delivery/create-deployment-record
// @access  Protected (Delivery team only)
export const createDeploymentRecord = async (req, res) => {
  try {
    const {
      candidateId,
      formData,
      emailSubject,
      emailContent,
      recipientEmails,
      ccEmails,
      emailResults
    } = req.body;

    const senderEmpId = req.user.empId;

    if (!candidateId || !formData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: candidateId or formData'
      });
    }

    // Get candidate info
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if deployment email already sent
    if (candidate.deploymentEmailSent) {
      return res.status(400).json({
        success: false,
        message: 'Deployment email already sent for this candidate'
      });
    }

    // Get sender info
    const sender = await Employee.findOne({ empId: senderEmpId }).select('name managerEmailConfig');
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender employee not found'
      });
    }

    // Create deployment record
    const deployment = new Deployment({
      candidateId: candidate._id,
      candidateName: candidate.fullName,
      candidateEmpId: candidate.permanentEmployeeId || candidate.employeeId,

      // Deployment details from form
      role: formData.role,
      email: formData.email,
      office: formData.office,
      modeOfHire: formData.modeOfHire,
      fromTeam: formData.fromTeam,
      toTeam: formData.toTeam,
      client: formData.client,
      bu: formData.bu,
      reportingTo: formData.reportingTo,
      accountManager: formData.accountManager,
      deploymentDate: new Date(formData.deploymentDate),

      // Email details
      emailSubject: emailSubject || 'Employee Deployment Notice',
      emailContent: emailContent || '',
      recipientEmails: recipientEmails || [],
      ccEmails: ccEmails || [],

      // Sender info
      sentBy: senderEmpId,
      sentByName: sender.name,
      sentFromEmail: sender.managerEmailConfig?.email || '',

      // Email results
      emailStatus: emailResults?.failed > 0 ? 'Partially Sent' : 'Sent',
      emailResults: {
        successful: emailResults?.successful || 0,
        failed: emailResults?.failed || 0,
        total: emailResults?.total || 0
      }
    });

    await deployment.save();

    // ✅ UPDATED: Mark candidate as deployed and add deployment timestamp
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        $set: {
          deploymentEmailSent: true,
          deploymentEmailSentAt: new Date(),
          deploymentEmailSentBy: senderEmpId,
          deploymentRecordId: deployment._id,
          // ✅ ADD: Additional fields for better tracking
          deploymentStatus: 'deployed',
          lastUpdated: new Date()
        }
      },
      { new: true } // Return updated document
    );

    // ✅ SUCCESS RESPONSE with updated candidate info
    res.status(201).json({
      success: true,
      message: 'Deployment record created successfully',
      data: {
        deploymentId: deployment._id,
        candidateId: updatedCandidate._id,
        candidateName: deployment.candidateName,
        client: deployment.client,
        bu: deployment.bu,
        deploymentDate: deployment.deploymentDate,
        // ✅ ADD: Return deployment status for frontend
        deploymentEmailSent: true,
        deploymentStatus: 'deployed'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create deployment record',
      error: error.message
    });
  }
};

// @desc    Get deployment records with filters - FIXED VERSION FOR DELIVERY
// @route   GET /api/delivery/deployment-records
// @access  Protected (Delivery team only)
export const getDeploymentRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      client,
      bu,
      fromDate,
      toDate,
      filterBy = 'createdAt', // Support different date fields
      tab = 'active'
    } = req.query;

    // Build base query based on tab - FIXED LOGIC
    let query = {};

    // Tab-based filtering
    if (tab === 'active') {
      // Active means no exit date and not inactive status
      query = {
        $and: [
          {
            $or: [
              { exitDate: { $exists: false } },
              { exitDate: null },
              { exitDate: '' }
            ]
          },
          {
            $or: [
              { status: { $exists: false } },
              { status: null },
              { status: '' },
              { status: { $not: { $regex: /^inactive$/i } } }
            ]
          }
        ]
      };
    } else if (tab === 'internal-transfer') {
      // FIXED: Internal transfer means has transfer date AND not exited
      query = {
        $and: [
          { internalTransferDate: { $exists: true, $ne: null, $ne: '' } },
          {
            $or: [
              { exitDate: { $exists: false } },
              { exitDate: null },
              { exitDate: '' }
            ]
          },
          {
            $or: [
              { status: { $exists: false } },
              { status: null },
              { status: '' },
              { status: { $not: { $regex: /^inactive$/i } } }
            ]
          }
        ]
      };
    } else if (tab === 'inactive') {
      // Inactive means has exit date OR inactive status
      query = {
        $or: [
          { status: { $regex: /^inactive$/i } },
          {
            exitDate: { $exists: true, $ne: null, $ne: '' }
          }
        ]
      };
    }

    // Search functionality
    if (search) {
      const searchConditions = [
        { candidateName: { $regex: search, $options: 'i' } },
        { candidateEmpId: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { bu: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { hrName: { $regex: search, $options: 'i' } },
        { track: { $regex: search, $options: 'i' } }
      ];

      if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else if (query.$or) {
        // If query already has $or, wrap everything in $and
        query = {
          $and: [
            query,
            { $or: searchConditions }
          ]
        };
      } else {
        query = {
          $and: [
            query,
            { $or: searchConditions }
          ]
        };
      }
    }

    // Additional filters
    if (client) {
      if (query.$and) {
        query.$and.push({ client: { $regex: client, $options: 'i' } });
      } else {
        query.client = { $regex: client, $options: 'i' };
      }
    }

    if (bu) {
      if (query.$and) {
        query.$and.push({ bu: { $regex: bu, $options: 'i' } });
      } else {
        query.bu = { $regex: bu, $options: 'i' };
      }
    }

    // Date filtering based on filterBy parameter
    if (fromDate || toDate) {
      const dateField = filterBy; // createdAt, doj, exitDate, internalTransferDate
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

      if (query.$and) {
        query.$and.push({ [dateField]: dateQuery });
      } else {
        query[dateField] = dateQuery;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const deployments = await Deployment.find(query)
      .populate('candidateId', 'fullName personalEmail mobileNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean for better performance

    const total = await Deployment.countDocuments(query);

    // FIXED: Get counts for all tabs (for tab counters)
    const [activeCount, transferCount, inactiveCount] = await Promise.all([
      // Active count
      Deployment.countDocuments({
        $and: [
          {
            $or: [
              { exitDate: { $exists: false } },
              { exitDate: null },
              { exitDate: '' }
            ]
          },
          {
            $or: [
              { status: { $exists: false } },
              { status: null },
              { status: '' },
              { status: { $not: { $regex: /^inactive$/i } } }
            ]
          }
        ]
      }),

      // FIXED: Transfer count - Only non-exited transfers
      Deployment.countDocuments({
        $and: [
          { internalTransferDate: { $exists: true, $ne: null, $ne: '' } },
          {
            $or: [
              { exitDate: { $exists: false } },
              { exitDate: null },
              { exitDate: '' }
            ]
          },
          {
            $or: [
              { status: { $exists: false } },
              { status: null },
              { status: '' },
              { status: { $not: { $regex: /^inactive$/i } } }
            ]
          }
        ]
      }),

      // Inactive count
      Deployment.countDocuments({
        $or: [
          { status: { $regex: /^inactive$/i } },
          { exitDate: { $exists: true, $ne: null, $ne: '' } }
        ]
      })
    ]);

    // Calculate tenure for each deployment
    const deploymentsWithTenure = deployments.map(deployment => {
      let tenure = 'Calculating...';

      if (deployment.doj) {
        const startDate = new Date(deployment.doj);
        const endDate = deployment.exitDate ? new Date(deployment.exitDate) : new Date();

        const diffTime = endDate - startDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          const years = Math.floor(diffDays / 365);
          const months = Math.floor((diffDays % 365) / 30);
          const days = diffDays % 30;

          let tenureParts = [];
          if (years > 0) tenureParts.push(`${years}Y`);
          if (months > 0) tenureParts.push(`${months}M`);
          if (days > 0) tenureParts.push(`${days}D`);

          tenure = tenureParts.join(' ') || '0D';
        }
      }

      return {
        ...deployment,
        tenure,
        // Ensure all expected fields are present
        candidateOfficeEmail: deployment.candidateOfficeEmail || deployment.email ||
          (deployment.candidateId ? deployment.candidateId.officeEmail : '') || '-',
        candidateMobile: deployment.candidateMobile ||
          (deployment.candidateId ? deployment.candidateId.mobileNumber : '') || '-',
        candidateAssignedTeam: deployment.candidateAssignedTeam || deployment.toTeam || '-'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        deployments: deploymentsWithTenure,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1,
          activeCount,
          transferCount,
          inactiveCount
        }
      },
      message: `Retrieved ${deploymentsWithTenure.length} deployment records for ${tab} tab`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve deployment records',
      error: error.message
    });
  }
};

// @desc    Update deployment record fields
// @route   PUT /api/delivery/update-deployment/:deploymentId
// @access  Protected (Delivery team only)
export const updateDeploymentRecord = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const updateData = req.body;

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: 'Deployment record not found'
      });
    }

    // Update allowed fields - SEPARATED track, hrName, extension, status (removed tenure as it's auto-calculated)
    const allowedFields = [
      'track', 'hrName', 'calAdd', 'dmDal', 'tlLeadRec', 'zoomNo',
      'workLocation', 'doj', 'extension', 'status', 'exitDate',
      'internalTransferDate', 'leadOrNonLead'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        deployment[field] = updateData[field];
      }
    });

    await deployment.save();

    res.status(200).json({
      success: true,
      message: 'Deployment record updated successfully',
      data: deployment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update deployment record',
      error: error.message
    });
  }
};

// @desc    Get rejected/dropped candidates for Delivery team (same as HR Tag sees)
// @route   GET /api/delivery/rejected-candidates
// @access  Protected (Delivery team)
export const getRejectedCandidates = async (req, res) => {
  try {
    const { search, fromDate, toDate } = req.query;

    // Build query - same logic as HR Tag
    let query = {
      sentToLD: true,
      ldStatus: { $in: ['Rejected', 'Dropped'] }
    };

    // Search functionality (same as HR Tag)
    if (search && search.length >= 3) {
      query.$and = [
        query,
        {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { personalEmail: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { ldReason: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // Date filtering (same as HR Tag)
    if (fromDate || toDate) {
      if (!query.$and) query.$and = [];

      const dateQuery = {};
      if (fromDate) {
        dateQuery.$gte = new Date(fromDate);
      }
      if (toDate) {
        dateQuery.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      }

      query.$and.push({
        ldStatusUpdatedAt: dateQuery
      });
    }

    // Fetch candidates - same data as HR Tag sees
    const candidates = await Candidate.find(query)
      .sort({ ldStatusUpdatedAt: -1 })
      .select('-__v -resumePath') // Exclude sensitive file paths
      .lean();

    res.json({
      success: true,
      candidates,
      total: candidates.length,
      message: `Retrieved ${candidates.length} rejected/dropped candidates`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch L&D processed candidates',
      error: error.message
    });
  }
};

