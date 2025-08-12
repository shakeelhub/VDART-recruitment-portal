import Candidate from '../schema/Candidate.js';
import Employee from '../schema/Employee.js';
import Deployment from '../schema/Deployment.js';

const getUserInfo = (req) => {
  if (!req.user) {
    return { name: 'Unknown User', empId: 'UNKNOWN' };
  }
  return {
    name: req.user.name || 'Unknown User',
    empId: req.user.empId || req.user.employeeId || 'UNKNOWN'
  };
};

export const getAllCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    const userInfo = getUserInfo(req);

    const query = {
      $or: [
        { status: 'sent' },
        { sentToHROpsFromHRTag: true },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    };
    
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { personalEmail: { $regex: search, $options: 'i' } },
            { officeEmail: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { fatherName: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } },
            { native: { $regex: search, $options: 'i' } },
            { source: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

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

    const candidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Candidate.countDocuments(query);

    const withOfficeEmail = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: true, $ne: null }
    });

    const withEmployeeId = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });

    const withoutOfficeEmail = total - withOfficeEmail;
    const withoutEmployeeId = total - withEmployeeId;

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
        withoutOfficeEmail,
        withEmployeeId,
        withoutEmployeeId
      },
      filters: {
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null
      },
      message: `Retrieved ${candidates.length} candidates for HR Ops management`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const assignOfficeEmail = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { officeEmail } = req.body;
    const userInfo = getUserInfo(req);

    if (!officeEmail || !officeEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Office email is required'
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(officeEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const existingCandidate = await Candidate.findOne({ 
      officeEmail: officeEmail.toLowerCase(),
      _id: { $ne: candidateId }
    });

    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: `Office email ${officeEmail.toLowerCase()} is already assigned to ${existingCandidate.fullName}`
      });
    }

    const existingEmployee = await Employee.findOne({ 
      email: officeEmail.toLowerCase()
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Office email ${officeEmail.toLowerCase()} already exists in employee records`
      });
    }

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

    candidate.officeEmail = officeEmail.toLowerCase().trim();
    candidate.officeEmailAssignedBy = userInfo.empId;
    candidate.officeEmailAssignedByName = userInfo.name;
    candidate.officeEmailAssignedAt = new Date();
    await candidate.save();

    res.json({
      success: true,
      message: `Office email ${officeEmail.toLowerCase()} assigned successfully to ${candidate.fullName} by HR Ops`,
      candidate: {
        id: candidate._id,
        fullName: candidate.fullName,
        personalEmail: candidate.personalEmail,
        officeEmail: candidate.officeEmail
      }
    });

  } catch (error) {
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Office email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const assignEmployeeId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { employeeId } = req.body;
    const userInfo = getUserInfo(req);

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const empIdRegex = /^[A-Z0-9]{3,10}$/;
    if (!empIdRegex.test(employeeId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID must be 3-10 characters (letters and numbers only)'
      });
    }

    const existingCandidate = await Candidate.findOne({ 
      employeeId: employeeId.toUpperCase(),
      _id: { $ne: candidateId }
    });

    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: `Employee ID ${employeeId.toUpperCase()} is already assigned to ${existingCandidate.fullName}`
      });
    }

    const existingEmployee = await Employee.findOne({ 
      empId: employeeId.toUpperCase()
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Employee ID ${employeeId.toUpperCase()} already exists in employee records`
      });
    }

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

    candidate.employeeId = employeeId.toUpperCase().trim();
    candidate.employeeIdAssignedBy = userInfo.empId;
    candidate.employeeIdAssignedByName = userInfo.name;
    candidate.employeeIdAssignedAt = new Date();
    await candidate.save();

    res.json({
      success: true,
      message: `Employee ID ${employeeId.toUpperCase()} assigned successfully to ${candidate.fullName} by HR Ops`,
      candidate: {
        id: candidate._id,
        fullName: candidate.fullName,
        personalEmail: candidate.personalEmail,
        employeeId: candidate.employeeId
      }
    });

  } catch (error) {
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const getHROpsStats = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const totalCandidates = await Candidate.countDocuments({
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    });
    
    const withOfficeEmail = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      officeEmailAssignedBy: { $exists: true, $ne: null }
    });
    
    const withEmployeeId = await Candidate.countDocuments({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });
    
    const withoutOfficeEmail = totalCandidates - withOfficeEmail;
    const withoutEmployeeId = totalCandidates - withEmployeeId;

    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthCandidates = await Candidate.countDocuments({
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      createdAt: { $gte: thisMonthStart }
    });

    const thisMonthEmailAssignments = await Candidate.countDocuments({
      officeEmailAssignedAt: { $gte: thisMonthStart }
    });

    const thisMonthEmployeeIdAssignments = await Candidate.countDocuments({
      employeeIdAssignedAt: { $gte: thisMonthStart }
    });

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

    const todayEmailAssignments = await Candidate.countDocuments({
      officeEmailAssignedAt: { $gte: todayStart }
    });

    const todayEmployeeIdAssignments = await Candidate.countDocuments({
      employeeIdAssignedAt: { $gte: todayStart }
    });

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

    const recentWithoutEmployeeId = await Candidate.find({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      employeeIdAssignedBy: { $exists: false }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName personalEmail mobileNumber createdAt');

    const recentOfficeEmailAssignments = await Candidate.find({ 
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

    const recentEmployeeIdAssignments = await Candidate.find({ 
      $or: [
        { status: 'sent' },
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      employeeIdAssignedBy: { $exists: true, $ne: null }
    })
      .sort({ employeeIdAssignedAt: -1 })
      .limit(5)
      .select('fullName personalEmail employeeId employeeIdAssignedAt');

    const stats = {
      overview: {
        totalResources: totalCandidates,
        thisMonth: thisMonthCandidates,
        today: todayCandidates,
        thisMonthEmailAssignments,
        thisMonthEmployeeIdAssignments,
        todayEmailAssignments,
        todayEmployeeIdAssignments
      },
      emailStats: {
        assigned: withOfficeEmail,
        pending: withoutOfficeEmail,
        total: totalCandidates
      },
      employeeIdStats: {
        assigned: withEmployeeId,
        pending: withoutEmployeeId,
        total: totalCandidates
      },
      recent: {
        withoutOfficeEmail: recentWithoutOfficeEmail,
        withoutEmployeeId: recentWithoutEmployeeId,
        officeEmailAssignments: recentOfficeEmailAssignments,
        employeeIdAssignments: recentEmployeeIdAssignments
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

export const getPermanentIdStats = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    const totalResources = await Candidate.countDocuments({
      $or: [
        { employeeIdAssignedBy: { $exists: true, $ne: null } },
        { permanentIdAssignedBy: { $exists: true, $ne: null } }
      ]
    });

    const totalTraineeAssignments = await Candidate.countDocuments({
      employeeIdAssignedBy: { $exists: true, $ne: null }
    });

    const totalPermanentIdCandidates = await Candidate.countDocuments({ 
      status: 'sent',
      sentToHROpsFromHRTag: true
    });
    
    const withPermanentId = await Candidate.countDocuments({ 
      status: 'sent',
      sentToHROpsFromHRTag: true,
      permanentIdAssignedBy: { $exists: true, $ne: null }
    });
    
    const withoutPermanentId = totalPermanentIdCandidates - withPermanentId;

    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthPermanentAssignments = await Candidate.countDocuments({
      status: 'sent',
      sentToHROpsFromHRTag: true,
      permanentIdAssignedAt: { $gte: thisMonthStart }
    });

    const thisMonthTraineeAssignments = await Candidate.countDocuments({
      employeeIdAssignedAt: { $gte: thisMonthStart }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayPermanentAssignments = await Candidate.countDocuments({
      permanentIdAssignedAt: { $gte: todayStart }
    });

    const todayTraineeAssignments = await Candidate.countDocuments({
      employeeIdAssignedAt: { $gte: todayStart }
    });

    const recentTraineesPendingPermanent = await Candidate.find({ 
      employeeIdAssignedBy: { $exists: true, $ne: null },
      sentToHROpsFromHRTag: false,
      $or: [
        { ldStatus: 'Selected' },
        { ldStatus: { $exists: false } }
      ]
    })
      .sort({ employeeIdAssignedAt: -1 })
      .limit(5)
      .select('fullName personalEmail employeeId employeeIdAssignedAt');

    const recentPermanentAssignments = await Candidate.find({ 
      permanentIdAssignedBy: { $exists: true, $ne: null }
    })
      .sort({ permanentIdAssignedAt: -1 })
      .limit(5)
      .select('fullName personalEmail employeeId permanentEmployeeId permanentIdAssignedAt');

    const readyForPermanentId = await Candidate.countDocuments({
      status: 'sent',
      sentToHROpsFromHRTag: true,
      permanentIdAssignedBy: { $exists: false }
    });

    const stats = {
      overview: {
        totalResources: totalPermanentIdCandidates,  // ✅ FIXED: Use the correct total
        totalTraineeAssignments,
        // ✅ FIXED: Use correct field names that frontend expects
        totalPermanentAssignments: withPermanentId,  // Frontend uses this
        readyForPermanentId: withoutPermanentId,     // ✅ FIXED: This should be pending count
        thisMonthPermanent: thisMonthPermanentAssignments,
        thisMonthTrainee: thisMonthTraineeAssignments,
        todayPermanent: todayPermanentAssignments,
        todayTrainee: todayTraineeAssignments
      },
      breakdown: {
        permanent: {
          total: totalPermanentIdCandidates,
          assigned: withPermanentId,     // ✅ "Assigned" - candidates with permanent ID
          pending: withoutPermanentId    // ✅ "Pending" - candidates without permanent ID
        },
        trainee: {
          total: totalTraineeAssignments,
          convertedToPermanent: withPermanentId,
          stillTrainee: totalTraineeAssignments - withPermanentId
        }
      },
      recent: {
        traineesPendingPermanent: recentTraineesPendingPermanent,
        permanentAssignments: recentPermanentAssignments
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

export const assignPermanentId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { permanentEmployeeId } = req.body;
    const userInfo = getUserInfo(req);

    if (!permanentEmployeeId || !permanentEmployeeId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Permanent Employee ID is required'
      });
    }

    const permIdRegex = /^[A-Z0-9]{4,12}$/;
    if (!permIdRegex.test(permanentEmployeeId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Permanent Employee ID must be 4-12 characters (letters and numbers only)'
      });
    }

    const existingCandidate = await Candidate.findOne({ 
      permanentEmployeeId: permanentEmployeeId.toUpperCase(),
      _id: { $ne: candidateId }
    });

    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: `Permanent Employee ID ${permanentEmployeeId.toUpperCase()} is already assigned to ${existingCandidate.fullName}`
      });
    }

    const existingEmployee = await Employee.findOne({ 
      empId: permanentEmployeeId.toUpperCase()
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Permanent Employee ID ${permanentEmployeeId.toUpperCase()} already exists in employee records`
      });
    }

    const candidate = await Candidate.findOne({ 
      _id: candidateId, 
      status: 'sent',
      sentToHROpsFromHRTag: true
    });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found or not sent from HR Tag for permanent ID assignment'
      });
    }

    candidate.permanentEmployeeId = permanentEmployeeId.toUpperCase().trim();
    candidate.permanentIdAssignedBy = userInfo.empId;
    candidate.permanentIdAssignedByName = userInfo.name;
    candidate.permanentIdAssignedAt = new Date();
    await candidate.save();

    res.json({
      success: true,
      message: `Permanent Employee ID ${permanentEmployeeId.toUpperCase()} assigned successfully to ${candidate.fullName} by HR Ops`,
      candidate: {
        id: candidate._id,
        fullName: candidate.fullName,
        personalEmail: candidate.personalEmail,
        traineeId: candidate.employeeId,
        permanentEmployeeId: candidate.permanentEmployeeId
      }
    });

  } catch (error) {
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Permanent Employee ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const getRejectedCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
    const userInfo = getUserInfo(req);

    const query = {
      $or: [
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      sentToLD: true
    };
    
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { personalEmail: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { ldReason: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (fromDate || toDate) {
      if (!query.$and) query.$and = [];
      const dateQuery = {};
      
      if (fromDate) {
        dateQuery.$gte = new Date(fromDate);
      }
      if (toDate) {
        dateQuery.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
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
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const sendCandidatesToDelivery = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const userInfo = getUserInfo(req);

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to Delivery'
      });
    }

    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        $or: [
          { status: 'sent' },
          { ldStatus: 'Rejected' },
          { ldStatus: 'Dropped' }
        ],
        officeEmailAssignedBy: { $exists: true, $ne: null },
        employeeIdAssignedBy: { $exists: true, $ne: null }
      },
      {
        $set: {
          sentToDelivery: true,
          sentToDeliveryAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent to Delivery. Make sure candidates have both Office Email and Employee ID assigned.'
      });
    }

    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) to Delivery Team`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to Delivery'
    });
  }
};

// ✅ FIXED: Updated permanent ID delivery endpoint
export const sendCandidatesToDeliveryPermanent = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const userInfo = getUserInfo(req);

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide candidate IDs to send to Delivery'
      });
    }

    // ✅ FIXED: Use new field for permanent ID delivery tracking
    const updateResult = await Candidate.updateMany(
      {
        _id: { $in: candidateIds },
        status: 'sent',
        sentToHROpsFromHRTag: true,
        permanentIdAssignedBy: { $exists: true, $ne: null }
      },
      {
        $set: {
          sentToDeliveryForPermanent: true,           // ✅ NEW FIELD for permanent ID delivery
          sentToDeliveryForPermanentAt: new Date(),
          sentToDeliveryForPermanentBy: userInfo.empId,
          sentToDeliveryForPermanentByName: userInfo.name,
          // Also set the main delivery flag for delivery portal
          sentToDelivery: true,
          sentToDeliveryAt: new Date(),
          sentToDeliveryBy: userInfo.empId,
          sentToDeliveryByName: userInfo.name
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates were sent to Delivery. Make sure candidates have Permanent Employee ID assigned.'
      });
    }

    res.json({
      success: true,
      message: `Successfully sent ${updateResult.modifiedCount} candidate(s) with permanent ID to Delivery Team`,
      sentCount: updateResult.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send candidates to Delivery'
    });
  }
};

// ✅ FIXED: Updated getPermanentIdCandidates with proper tab filtering
export const getPermanentIdCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, fromDate, toDate, tab = 'all' } = req.query;
    const userInfo = getUserInfo(req);

    // Base query for permanent ID candidates
    let baseQuery = { 
      status: 'sent',
      sentToHROpsFromHRTag: true
    };

    // Apply tab-based filtering at database level
    let query = { ...baseQuery };
    
    if (tab === 'sent_to_delivery') {
      query.sentToDeliveryForPermanent = true;  // ✅ Use specific field for permanent ID delivery
    } else if (tab === 'not_sent_to_delivery') {
      query.sentToDeliveryForPermanent = { $ne: true };
    }
    // For 'all' tab, no additional filtering needed
    
    // Search functionality
    if (search && search.length >= 3) {
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
      
      // Combine search with existing query
      query = {
        $and: [
          baseQuery,
          ...(tab === 'sent_to_delivery' ? [{ sentToDeliveryForPermanent: true }] : []),
          ...(tab === 'not_sent_to_delivery' ? [{ sentToDeliveryForPermanent: { $ne: true } }] : []),
          { $or: query.$or }
        ]
      };
      delete query.$or;
    }

    // Date filtering
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
      
      if (query.$and) {
        query.$and.push({ sentToHROpsFromHRTagAt: dateQuery });
      } else {
        query.sentToHROpsFromHRTagAt = dateQuery;
      }
    }

    // Execute main query with pagination
    const candidates = await Candidate.find(query)
      .sort({ sentToHROpsFromHRTagAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Candidate.countDocuments(query);

    // ✅ FIXED: Get accurate tab counts from database
    const [allCount, sentCount, notSentCount] = await Promise.all([
      // All candidates for permanent ID
      Candidate.countDocuments(baseQuery),
      
      // Sent to delivery (permanent ID flow)
      Candidate.countDocuments({
        ...baseQuery,
        sentToDeliveryForPermanent: true
      }),
      
      // Not sent to delivery (permanent ID flow)
      Candidate.countDocuments({
        ...baseQuery,
        sentToDeliveryForPermanent: { $ne: true }
      })
    ]);

    res.json({
      success: true,
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      tabCounts: {
        all: allCount,
        sentToDelivery: sentCount,
        notSentToDelivery: notSentCount
      },
      stats: {
        total: allCount,
        withPermanentId: await Candidate.countDocuments({ 
          ...baseQuery,
          permanentIdAssignedBy: { $exists: true, $ne: null }
        }),
        withoutPermanentId: await Candidate.countDocuments({ 
          ...baseQuery,
          permanentIdAssignedBy: { $exists: false }
        })
      },
      filters: {
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        tab: tab
      },
      message: `Retrieved ${candidates.length} candidates for permanent ID assignment (${tab} tab)`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

export const getLDStatusStats = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    const totalSentToLD = await Candidate.countDocuments({
      sentToLD: true
    });

    const rejectedCandidates = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Rejected'
    });

    const droppedCandidates = await Candidate.countDocuments({
      sentToLD: true,
      ldStatus: 'Dropped'
    });

    const totalRejectedDropped = rejectedCandidates + droppedCandidates;

    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthRejectedDropped = await Candidate.countDocuments({
      sentToLD: true,
      $or: [
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      ldStatusUpdatedAt: { $gte: thisMonthStart }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRejectedDropped = await Candidate.countDocuments({
      sentToLD: true,
      $or: [
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ],
      ldStatusUpdatedAt: { $gte: todayStart }
    });

    const recentRejectedDropped = await Candidate.find({
      sentToLD: true,
      $or: [
        { ldStatus: 'Rejected' },
        { ldStatus: 'Dropped' }
      ]
    })
      .sort({ ldStatusUpdatedAt: -1 })
      .limit(5)
      .select('fullName personalEmail ldStatus ldReason ldStatusUpdatedAt');

    const stats = {
      overview: {
        totalSentToLD,
        totalRejectedDropped,
        rejectedCandidates,
        droppedCandidates,
        thisMonthRejectedDropped,
        todayRejectedDropped
      },
      breakdown: {
        rejected: rejectedCandidates,
        dropped: droppedCandidates
      },
      recent: {
        rejectedDropped: recentRejectedDropped
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

// @desc    Get deployment records with filters - HR OPS VERSION
// @route   GET /api/hr-ops/deployment-records
// @access  Protected (HR Ops team only)
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

    const userInfo = getUserInfo(req);

    // Build base query based on tab
    let query = {};
    
    // Tab-based filtering - FIXED LOGIC
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

    // Search functionality - ENHANCED
    if (search) {
      const searchConditions = [
        { candidateName: { $regex: search, $options: 'i' } },
        { candidateEmpId: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { bu: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { hrName: { $regex: search, $options: 'i' } },
        { track: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { candidateOfficeEmail: { $regex: search, $options: 'i' } }
      ];

      // FIXED: Properly combine with existing query
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

    // FIXED: Date filtering based on filterBy parameter
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

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const deployments = await Deployment.find(query)
      .populate('candidateId', 'fullName personalEmail mobileNumber officeEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean for better performance

    const total = await Deployment.countDocuments(query);

    // FIXED: Get counts for all tabs (for tab counters) - UPDATED TRANSFER COUNT
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

    // FIXED: Calculate tenure for each deployment - WAS MISSING
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
        candidateOfficeEmail: deployment.candidateOfficeEmail || deployment.email || 
          (deployment.candidateId ? deployment.candidateId.officeEmail : '') || '-',
        candidateMobile: deployment.candidateMobile || 
          (deployment.candidateId ? deployment.candidateId.mobileNumber : '') || '-',
        candidateAssignedTeam: deployment.candidateAssignedTeam || deployment.toTeam || '-'
      };
    });

    // FIXED: Return response in expected format
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
          // Tab counters for ResourceCard - FIXED STRUCTURE
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

// @desc    Exit a candidate (Mark as Inactive with reason)
// @route   PUT /api/hr-ops/exit-candidate/:deploymentId
// @access  Protected (HR Ops team only)
export const exitCandidate = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { exitReason } = req.body;
    const userInfo = getUserInfo(req);

    // Validation: Exit reason is required
    if (!exitReason || !exitReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exit reason is required'
      });
    }

    // Validation: Exit reason should be meaningful (minimum length)
    if (exitReason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Exit reason must be at least 5 characters long'
      });
    }

    // Find the deployment record
    const deployment = await Deployment.findById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: 'Deployment record not found'
      });
    }

    // Check if candidate is already inactive
    if (deployment.status === 'Inactive' || deployment.exitDate) {
      return res.status(400).json({
        success: false,
        message: `${deployment.candidateName} is already marked as inactive`,
        data: {
          candidateName: deployment.candidateName,
          currentStatus: deployment.status,
          exitDate: deployment.exitDate,
          exitReason: deployment.exitReason
        }
      });
    }

    // Process the exit using the schema method
    const updatedDeployment = await deployment.processExit(
      exitReason.trim(),
      userInfo.empId,
      userInfo.name
    );

    // Success response
    res.json({
      success: true,
      message: `${deployment.candidateName} has been successfully marked as inactive`,
      data: {
        deploymentId: updatedDeployment._id,
        candidateName: updatedDeployment.candidateName,
        candidateEmpId: updatedDeployment.candidateEmpId,
        previousStatus: deployment.status, // Original status before exit
        currentStatus: updatedDeployment.status,
        exitDate: updatedDeployment.exitDate,
        exitReason: updatedDeployment.exitReason,
        processedBy: updatedDeployment.exitProcessedByName,
        processedAt: updatedDeployment.exitProcessedAt
      }
    });

  } catch (error) {
    
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
        message: 'Invalid deployment ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while processing exit. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};