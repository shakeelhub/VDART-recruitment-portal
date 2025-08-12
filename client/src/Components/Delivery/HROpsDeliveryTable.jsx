import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building, Search,
  X, ChevronLeft, ChevronRight, Calendar, Users, Download,
  CalendarDays, Filter, Award, UserCheck, CreditCard, ChevronDown, Lock
} from 'lucide-react';

// #done

const HROpsDeliveryTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [pagination, setPagination] = useState({});
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showSelectRecipientModal, setShowSelectRecipientModal] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState(['']);

  const [exporting, setExporting] = useState(false);

  const [emailSending, setEmailSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [ccEmails, setCcEmails] = useState(['']);
  const [emailContent, setEmailContent] = useState('');

  // Updated tab state with 3 tabs
  const [activeTab, setActiveTab] = useState('all');
  const [emailSentCandidates, setEmailSentCandidates] = useState(new Set());

  // ✅ REMOVED: Email permission state - always allow for testing
  // const [canSendEmail, setCanSendEmail] = useState(false);
  // const [checkingPermissions, setCheckingPermissions] = useState(true);
  const canSendEmail = true; // ✅ Always true for testing

  useEffect(() => {
    if (isOpen) {
      setActiveTab('all'); // ✅ Reset to 'all' when modal opens
      loadAllData();
    }
  }, [isOpen, currentPage]);

  // ✅ REMOVED: Email permission check - not needed for testing
  // useEffect(() => {
  //   const checkEmailPermissions = async () => {
  //     // ... permission checking code removed
  //   };
  //   if (isOpen) {
  //     checkEmailPermissions();
  //   }
  // }, [isOpen]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      if (filteredCandidatesForTab.length === 0) {
        alert('No data to export');
        return;
      }

      // Prepare data matching table columns exactly
      const excelData = filteredCandidatesForTab.map((candidate, index) => ({
        'S.No': index + 1,
        'Full Name': candidate.fullName || '',
        'Temp/Employee ID': candidate.employeeId || '',
        'Permanent ID': candidate.permanentEmployeeId || (candidate.experienceLevel === 'Lateral' ? 'Temp ID as Permanent' : 'Processing...'),
        'Mobile Number': candidate.mobileNumber || '',
        'Office Email': candidate.officeEmail || '',
        'Experience': candidate.experienceLevel || '',
        'College': candidate.college || 'Not specified',
        'Sent Date': candidate.sentToDeliveryAt ? formatDate(candidate.sentToDeliveryAt) : '',
        'Status': emailSentCandidates.has(candidate._id) ? 'Deployed' : 'Ready',
        'Deployment Email': emailSentCandidates.has(candidate._id) ? 'Email Sent' : 'Pending'
      }));

      // Convert to CSV
      const headers = Object.keys(excelData[0]);
      const csvContent = [
        headers.join(','),
        ...excelData.map(row =>
          headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const currentDate = new Date().toISOString().split('T')[0];
      const tabSuffix = activeTab === 'all' ? 'all' : activeTab === 'deployed' ? 'deployed' : 'non_deployed';
      const filename = `delivery_ready_to_deploy_${tabSuffix}_${currentDate}.csv`;
      link.setAttribute('download', filename);

      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Exported ${excelData.length} records to ${filename}`);

    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // ✅ UPDATED: Enhanced handleSendDeploymentEmail with automatic tab switching
  const handleSendDeploymentEmail = async () => {
    try {
      setEmailSending(true);

      if (!emailSubject.trim()) {
        alert('Please enter an email subject');
        return;
      }

      const validToEmails = recipientEmails.filter(email => email.trim());
      if (validToEmails.length === 0) {
        alert('Please enter at least one recipient email');
        return;
      }

      const validCcEmails = ccEmails.filter(email => email.trim());

      // ✅ ADD: Get user's empId for the request
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');

      const response = await fetch('http://192.168.6.185:3000/api/delivery/email/send-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateId: selectedCandidate._id,
          formData: emailFormData,
          recipientEmails: validToEmails,
          ccEmails: validCcEmails,
          subject: emailSubject.trim(),
          content: emailContent.trim(),
          senderEmpId: userData.empId // ✅ ADD: Required field
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Email sent to ${validToEmails.length} recipients${validCcEmails.length > 0 ? ` (CC: ${validCcEmails.length})` : ''}!`);

        // ✅ CRITICAL UPDATE: Immediately update local state using backend response
        if (result.data && result.data.candidateId) {
          setEmailSentCandidates(prev => new Set([...prev, result.data.candidateId]));
          console.log(`✅ [FRONTEND] Added candidate ${result.data.candidateId} to emailSentCandidates`);
        }

        // ✅ AUTO SWITCH: Switch to deployed tab if backend signals to do so
        if (result.data && result.data.switchToDeployedTab) {
          setActiveTab('deployed');
          console.log('✅ [FRONTEND] Automatically switched to deployed tab');
        }

        // Reset form
        setShowSelectRecipientModal(false);
        setRecipientEmails(['']);
        setCcEmails(['']);
        setEmailSubject('');
        setEmailContent('');
        setEmailFormData({
          name: '', empId: '', role: '', email: '', office: '', modeOfHire: '',
          fromTeam: '', toTeam: '', reportingTo: '', accountManager: '', deploymentDate: '',
          client: '', bu: ''
        });

        // ✅ REFRESH: Load fresh data from backend
        await loadAllData();

      } else {
        alert(`❌ Failed: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Email sending error:', error);
      alert('❌ Error sending email');
    } finally {
      setEmailSending(false);
    }
  };

  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  const itemsPerPage = 10;

  const [emailFormData, setEmailFormData] = useState({
    name: '',
    empId: '',
    role: '',
    email: '',
    office: '',
    modeOfHire: '',
    fromTeam: '',
    toTeam: '',
    reportingTo: '',
    accountManager: '',
    deploymentDate: '',
    client: '',
    bu: ''
  });

  // Updated filter function for 3 tabs
  const filteredCandidatesForTab = candidates.filter(candidate => {
    if (activeTab === 'deployed') return emailSentCandidates.has(candidate._id);
    if (activeTab === 'non-deployed') return !emailSentCandidates.has(candidate._id);
    return true; // 'all'
  });

  // ✅ FIXED: Separate data loading function to prevent race conditions
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Load email sent status first
      await fetchEmailSentCandidates();

      // Then load candidates
      await fetchCandidates();

    } catch (error) {
      console.error('❌ [FRONTEND] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Remove activeTab from dependencies to prevent infinite loop
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, currentPage, dateFilter]); // ✅ REMOVED activeTab

  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        loadAllData(); // ✅ Use loadAllData instead of fetchCandidates
      }, 500);
      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm]);

  // ✅ ENHANCED: Better error handling and debugging
  const fetchEmailSentCandidates = async () => {
    try {
      console.log('🔄 [FRONTEND] Fetching email sent candidates...');
      const response = await fetch('http://192.168.6.185:3000/api/delivery/email-sent-candidates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ [FRONTEND] Email sent candidates loaded:', data.candidateIds.length, 'candidates');
          console.log('🔍 [FRONTEND] Deployed candidate IDs:', data.candidateIds);
          setEmailSentCandidates(new Set(data.candidateIds));

          // ✅ DEBUG: Log the Set contents
          console.log('🔍 [FRONTEND] Updated emailSentCandidates Set size:', data.candidateIds.length);

          return data.candidateIds;
        } else {
          console.error('❌ [FRONTEND] API returned error:', data.message);
          throw new Error(data.message);
        }
      } else {
        console.error('❌ [FRONTEND] Failed to fetch email sent candidates:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching email sent candidates:', error);
      // Don't throw here, just log - let the app continue
    }
  };

  // ✅ ENHANCED: Better error handling
  const fetchCandidates = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      console.log(`🔄 [FRONTEND] Fetching candidates with params:`, Object.fromEntries(params));

      const response = await fetch(`http://192.168.6.185:3000/api/delivery/ready-to-deploy?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setCandidates(data.candidates);
        setPagination(data.pagination);
        console.log('✅ [FRONTEND] Loaded', data.candidates.length, 'ready-to-deploy candidates');
        return data.candidates;
      } else {
        console.error('❌ [FRONTEND] Failed to fetch candidates:', data.message);
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching candidates:', error);
      throw error;
    }
  };

  const openEmailModal = (candidate) => {
    // ✅ REMOVED: All checks for testing - always allow email modal
    // if (!canSendEmail) {
    //   alert('❌ You do not have permission to send emails. Only delivery managers can send deployment emails.');
    //   return;
    // }

    // ✅ REMOVED: Email sent check for testing - allow re-sending
    // if (emailSentCandidates.has(candidate._id)) {
    //   alert('❌ Deployment email has already been sent for this candidate.');
    //   return;
    // }

    setSelectedCandidate(candidate);
    setEmailFormData({
      name: candidate.fullName || '',
      empId: candidate.permanentEmployeeId || candidate.employeeId || '',
      role: '',
      email: candidate.officeEmail || '',
      office: '',
      modeOfHire: '',
      fromTeam: '',
      toTeam: '',
      reportingTo: '',
      accountManager: '',
      deploymentDate: '',
      client: '',
      bu: ''
    });
    setShowEmailModal(true);
  };

  const updateEmailForm = (field, value) => {
    setEmailFormData((prev) => ({ ...prev, [field]: value }));
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSelectedCandidate(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return searchTerm || dateFilter.fromDate || dateFilter.toDate;
  };

  const getFilterButtonText = () => {
    if (dateFilter.fromDate && dateFilter.toDate) {
      return `${formatDate(dateFilter.fromDate)} - ${formatDate(dateFilter.toDate)}`;
    } else if (dateFilter.fromDate) {
      return `From ${formatDate(dateFilter.fromDate)}`;
    } else if (dateFilter.toDate) {
      return `Until ${formatDate(dateFilter.toDate)}`;
    }
    return 'Date Filter';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden">

        {/* Header - Updated for Ready-to-Deploy */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-4">
            <UserCheck className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Ready-to-Deploy Resources
            </h2>
            <p className="text-green-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Freshers with permanent ID + All Laterals</p>
            {!loading && (
              <span className="bg-white/30 text-white px-3 py-1 rounded-full text-sm font-medium select-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {pagination.total || 0} resources
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-transform duration-300 hover:rotate-180"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ✅ REMOVED: Permission Warning Banner - not needed for testing */}

        {/* Search Bar and Date Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ready-to-deploy resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              <div className="flex gap-3 items-center">
                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <button
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{getFilterButtonText()}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* Date Filter Dropdown */}
                    {showDateDropdown && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              Date Range Filter
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>From Date</label>
                                <input
                                  type="date"
                                  value={dateFilter.fromDate}
                                  onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Date</label>
                                <input
                                  type="date"
                                  value={dateFilter.toDate}
                                  onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Filter Actions */}
                          <div className="flex justify-between pt-2 border-t">
                            <button
                              onClick={() => {
                                setDateFilter({
                                  fromDate: '',
                                  toDate: ''
                                });
                              }}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setShowDateDropdown(false)}
                              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExportExcel}
                    disabled={exporting || loading || filteredCandidatesForTab.length === 0}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${exporting || loading || filteredCandidatesForTab.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                </div>

                {hasActiveFilters() && (
                  <button
                    onClick={clearDateFilter}
                    className="px-3 py-2.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-1"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Enhanced Tabs with real-time counts */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All Resources' },
              { key: 'deployed', label: 'Deployed Resources' },
              { key: 'non-deployed', label: 'Non-Deployed Resources' }
            ].map(tab => {
              // ✅ CALCULATE: Real-time counts based on current data
              let count = 0;
              if (tab.key === 'all') {
                count = candidates.length;
              } else if (tab.key === 'deployed') {
                count = candidates.filter(c => emailSentCandidates.has(c._id)).length;
              } else if (tab.key === 'non-deployed') {
                count = candidates.filter(c => !emailSentCandidates.has(c._id)).length;
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto overflow-y-auto h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading ready-to-deploy resources...</span>
              </div>
            </div>
          ) : filteredCandidatesForTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <UserCheck className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'all' ? 'No resources ready for deployment' :
                  activeTab === 'deployed' ? 'No deployed resources yet' :
                    'No non-deployed resources'}
              </p>
              <p className="text-sm text-center max-w-md" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'all'
                  ? 'Resources will appear here when they are ready for final deployment (Freshers with permanent IDs + All Laterals)'
                  : activeTab === 'deployed'
                    ? 'Deployed resources will appear here after deployment emails are sent'
                    : 'Non-deployed resources will appear here for candidates pending deployment email'
                }
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Full Name
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Temp/Employee ID
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Permanent ID
                  </th>
                  <th className="w-36 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Mobile Number
                  </th>
                  <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Office Email
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Experience
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    College
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Sent Date
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Status
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Deployment Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidatesForTab.map((candidate) => {
                  const emailSent = emailSentCandidates.has(candidate._id);

                  return (
                    <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="w-40 px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                            <div className="text-xs text-gray-500 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="w-32 px-7 py-4">
                        <span className="font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {candidate.employeeId}
                        </span>
                      </td>
                      <td className="w-40 px-6 py-4">
                        {candidate.permanentEmployeeId ? (
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              {candidate.permanentEmployeeId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-orange-600 text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.experienceLevel === 'Lateral' ? 'Temp ID as Permanent' : 'Processing...'}
                          </span>
                        )}
                      </td>
                      <td className="w-36 px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</span>
                        </div>
                      </td>
                      <td className="w-64 px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail}</span>
                        </div>
                      </td>
                      <td className="w-32 px-6 py-4">
                        <span className={`text-sm px-2 py-1 rounded font-medium ${candidate.experienceLevel === 'Fresher'
                          ? 'text-blue-700 bg-blue-100'
                          : 'text-orange-700 bg-orange-100'
                          }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {candidate.experienceLevel}
                        </span>
                      </td>
                      <td className="w-48 px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="w-40 px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {formatDate(candidate.sentToDeliveryForPermanentAt || candidate.sentToDeliveryAt)}
                          </span>
                        </div>
                      </td>
                      <td className="w-32 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${emailSent ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className={`text-sm font-medium ${emailSent ? 'text-green-700' : 'text-yellow-700'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {emailSent ? 'Deployed' : 'Ready'}
                          </span>
                        </div>
                      </td>
                      <td className="w-40 px-6 py-4">
                        {/* ✅ TESTING: Always show clickable send email button */}
                        <button
                          className="px-4 py-2 transition duration-200 text-white rounded-lg bg-blue-500 hover:bg-blue-600"
                          onClick={() => openEmailModal(candidate)}
                          title="Send deployment email (Testing Mode)"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          {emailSent ? 'Send Email' : 'Send Email'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Email Modal - Same as before */}
        {showEmailModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
              <button
                onClick={closeEmailModal}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-semibold mb-4 text-green-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Send Deployment Email
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Existing Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Name</label>
                  <input
                    type="text"
                    value={emailFormData.name}
                    onChange={(e) => updateEmailForm('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Emp ID</label>
                  <input
                    type="text"
                    value={emailFormData.empId}
                    onChange={(e) => updateEmailForm('empId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</label>
                  <input
                    type="text"
                    value={emailFormData.role}
                    onChange={(e) => updateEmailForm('role', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email ID</label>
                  <input
                    type="email"
                    value={emailFormData.email}
                    onChange={(e) => updateEmailForm('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office</label>
                  <input
                    type="text"
                    value={emailFormData.office}
                    onChange={(e) => updateEmailForm('office', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mode of Hire</label>
                  <input
                    type="text"
                    value={emailFormData.modeOfHire}
                    onChange={(e) => updateEmailForm('modeOfHire', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>From Team</label>
                  <input
                    type="text"
                    value={emailFormData.fromTeam}
                    onChange={(e) => updateEmailForm('fromTeam', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Team</label>
                  <input
                    type="text"
                    value={emailFormData.toTeam}
                    onChange={(e) => updateEmailForm('toTeam', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Client</label>
                  <input
                    type="text"
                    value={emailFormData.client}
                    onChange={(e) => updateEmailForm('client', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter client name"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>BU (Business Unit)</label>
                  <input
                    type="text"
                    value={emailFormData.bu}
                    onChange={(e) => updateEmailForm('bu', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter business unit"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reporting To</label>
                  <input
                    type="text"
                    value={emailFormData.reportingTo}
                    onChange={(e) => updateEmailForm('reportingTo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Manager</label>
                  <input
                    type="text"
                    value={emailFormData.accountManager}
                    onChange={(e) => updateEmailForm('accountManager', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Deployment Date</label>
                  <input
                    type="date"
                    value={emailFormData.deploymentDate}
                    onChange={(e) => updateEmailForm('deploymentDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeEmailModal}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setShowSelectRecipientModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Modal - Same as before */}
        {showSelectRecipientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-blue-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Email Configuration
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Content</label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Enter additional email content or message"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Recipients</label>
                  <div className="space-y-2">
                    {recipientEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...recipientEmails];
                            newEmails[index] = e.target.value;
                            setRecipientEmails(newEmails);
                          }}
                          placeholder={`Recipient ${index + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        <button
                          onClick={() => setRecipientEmails(recipientEmails.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setRecipientEmails([...recipientEmails, ''])}
                      className="text-sm text-blue-600 hover:text-green-800"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      + Add To Email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>CC Recipients (Optional)</label>
                  <div className="space-y-2">
                    {ccEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...ccEmails];
                            newEmails[index] = e.target.value;
                            setCcEmails(newEmails);
                          }}
                          placeholder={`CC Recipient ${index + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        <button
                          onClick={() => setCcEmails(ccEmails.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setCcEmails([...ccEmails, ''])}
                      className="text-sm text-blue-600 hover:text-green-800"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      + Add CC Email
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowSelectRecipientModal(false);
                    setRecipientEmails(['']);
                    setCcEmails(['']);
                    setEmailSubject('');
                    setEmailContent('');

                    setEmailFormData({
                      name: '', empId: '', role: '', email: '', office: '', modeOfHire: '',
                      fromTeam: '', toTeam: '', reportingTo: '', accountManager: '', deploymentDate: '',
                      client: '', bu: ''
                    });
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  disabled={!emailSubject.trim() || recipientEmails.every(email => !email.trim()) || emailSending}
                  onClick={handleSendDeploymentEmail}
                  className={`px-4 py-2 rounded-lg ${emailSubject.trim() && recipientEmails.some(email => email.trim()) && !emailSending
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {emailSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && candidates.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentPage} of {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HROpsDeliveryTable;