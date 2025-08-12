import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building, Search,
  X, ChevronLeft, ChevronRight, Calendar, Users, Download,
  CalendarDays, Filter, Award, UserCheck, CreditCard, ChevronDown, Target,
  Edit3, ArrowRightLeft, UserX
} from 'lucide-react';

const DeploymentRecordsTable = ({ isOpen, onClose }) => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [exporting, setExporting] = useState(false);

  // Internal Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferEmailModal, setShowTransferEmailModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({});
  const [transferEmailSubject, setTransferEmailSubject] = useState('');
  const [transferEmailContent, setTransferEmailContent] = useState('');
  const [transferRecipientEmails, setTransferRecipientEmails] = useState(['']);
  const [transferCcEmails, setTransferCcEmails] = useState(['']);
  const [transferEmailSending, setTransferEmailSending] = useState(false);

  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: '',
    filterBy: 'createdAt' // default to email sent date
  });
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'internal-transfer'
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      fetchDeployments();
    }
  }, [isOpen, currentPage, dateFilter, activeTab]);

  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        fetchDeployments();
      }, 500);
      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm]);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        ...(dateFilter.filterBy && { filterBy: dateFilter.filterBy }),
        tab: activeTab // Add tab filter
      });

      const response = await fetch(`http://192.168.6.185:3000/api/delivery/deployment-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDeployments(data.data.deployments);
        setPagination(data.data.pagination);
        console.log('✅ [DEPLOYMENT] Loaded', data.data.deployments.length, 'deployment records');
      } else {
        console.error('Failed to fetch deployment records:', data.message);
      }
    } catch (error) {
      console.error('Error fetching deployment records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Fetch ALL data for export (not paginated)
      const params = new URLSearchParams({
        page: 1,
        limit: 10000, // Large limit to get all records
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        ...(dateFilter.filterBy && { filterBy: dateFilter.filterBy }),
        tab: activeTab
      });

      const response = await fetch(`http://192.168.6.185:3000/api/delivery/deployment-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        const allDeployments = data.data?.deployments || [];

        if (allDeployments.length === 0) {
          alert('No data to export');
          return;
        }

        // Prepare data for Excel export - ONLY table UI columns
        const excelData = allDeployments.map((deployment, index) => {
          const baseData = {
            'S.No': index + 1,
            'Emp ID': deployment.candidateEmpId || '',
            'BU': deployment.bu || '',
            'Client': deployment.client || '',
            'Track': deployment.track || '',
            'HR Name': deployment.hrName || '',
            'Email ID': deployment.candidateOfficeEmail || deployment.email || '',
            'Role': deployment.role || '',
            'CAL/ADD': deployment.calAdd || '',
            'DM/DAL': deployment.dmDal || '',
            'TL/Lead Rec': deployment.tlLeadRec || '',
            'Reporting To': deployment.reportingTo || '',
            'Team Name': deployment.candidateAssignedTeam || '',
            'Zoom No': deployment.zoomNo || '',
            'Mode Of Hire': deployment.candidateExperienceLevel || '',
            'Work Location': deployment.workLocation || deployment.office || '',
            'Mobile No': deployment.candidateMobile || '',
            'DOJ': deployment.doj ? formatDate(deployment.doj) : '',
            'Date of Deployment': deployment.createdAt ? formatDate(deployment.createdAt) : '',
            'Extension': deployment.extension || '',
            'Status': deployment.status || (activeTab === 'inactive' ? 'Inactive' : 'Active'),
            'Exit Date': deployment.exitDate ? formatDate(deployment.exitDate) : '',
            'Internal Transfer Date': deployment.internalTransferDate ? formatDate(deployment.internalTransferDate) : '',
            'Internal Transfer': 'Available via Button',
            'Tenure': deployment.tenure || '',
            'Lead OR Non-Lead': deployment.leadOrNonLead || '',
            'Batch': deployment.candidateBatch || ''
          };

          // ✅ Add Exit Reason only for inactive records
          if (activeTab === 'inactive') {
            baseData['Exit Reason'] = deployment.exitReason || 'No reason provided';
          }

          return baseData;
        });

        // Convert to CSV format
        const headers = Object.keys(excelData[0]);
        const csvContent = [
          headers.join(','),
          ...excelData.map(row => 
            headers.map(header => {
              const value = row[header] || '';
              // Escape commas and quotes in CSV
              return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with current date and tab
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `deployment_records_${activeTab}_${currentDate}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`✅ Exported ${allDeployments.length} records to ${filename}`);

      } else {
        alert('Failed to fetch data for export');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const openEditModal = (deployment) => {
    setSelectedDeployment(deployment);
    setEditFormData({
      track: deployment.track || '',
      hrName: deployment.hrName || '',
      calAdd: deployment.calAdd || '',
      dmDal: deployment.dmDal || '',
      tlLeadRec: deployment.tlLeadRec || '',
      zoomNo: deployment.zoomNo || '',
      workLocation: deployment.workLocation || '',
      doj: deployment.doj ? deployment.doj.split('T')[0] : '',
      extension: deployment.extension || '',
      status: deployment.status || 'Active',
      exitDate: deployment.exitDate ? deployment.exitDate.split('T')[0] : '',
      internalTransferDate: deployment.internalTransferDate ? deployment.internalTransferDate.split('T')[0] : '',
      leadOrNonLead: deployment.leadOrNonLead || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDeployment(null);
    setEditFormData({});
  };

  const updateEditForm = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const openTransferModal = (deployment) => {
    setSelectedDeployment(deployment);
    setTransferFormData({
      name: deployment.candidateName || '',
      empId: deployment.candidateEmpId || '',
      role: deployment.role || '',
      emailId: deployment.candidateOfficeEmail || deployment.email || '',
      office: deployment.workLocation || deployment.office || '',
      modeOfHire: deployment.modeOfHire || '',
      fromTeam: deployment.fromTeam || '',
      toTeam: deployment.toTeam || '',
      reportingTo: deployment.reportingTo || '',
      accountManager: deployment.accountManager || '',
      deploymentDate: deployment.deploymentDate ? deployment.deploymentDate.split('T')[0] : ''
    });
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setSelectedDeployment(null);
    setTransferFormData({});
  };

  const updateTransferForm = (field, value) => {
    setTransferFormData(prev => ({ ...prev, [field]: value }));
  };

  const clearTransferField = (field) => {
    setTransferFormData(prev => ({ ...prev, [field]: '' }));
  };

  const handleSendTransferEmail = async () => {
    try {
      setTransferEmailSending(true);

      if (!transferEmailSubject.trim()) {
        alert('Please enter an email subject');
        return;
      }

      const validToEmails = transferRecipientEmails.filter(email => email.trim());
      if (validToEmails.length === 0) {
        alert('Please enter at least one recipient email');
        return;
      }

      const validCcEmails = transferCcEmails.filter(email => email.trim());

      console.log('🚀 Sending to:', 'http://192.168.6.185:3000/api/delivery/email/send-internal-transfer');

      const response = await fetch('http://192.168.6.185:3000/api/delivery/email/send-internal-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          deploymentId: selectedDeployment._id,
          formData: transferFormData,
          recipientEmails: validToEmails,
          ccEmails: validCcEmails,
          subject: transferEmailSubject.trim(),
          content: transferEmailContent.trim()
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          alert('❌ API Endpoint Not Found (404)\n\nThe backend route /api/delivery/email/send-internal-transfer does not exist.\n\nPlease check:\n1. Is your backend server running?\n2. Does this route exist in your backend code?\n3. Is the route path correct?');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ Non-JSON response:', responseText);
        alert('❌ Server returned HTML instead of JSON. The API endpoint might not exist.');
        return;
      }

      const result = await response.json();

      if (result.success) {
        alert(`✅ Internal transfer email sent to ${validToEmails.length} recipients${validCcEmails.length > 0 ? ` (CC: ${validCcEmails.length})` : ''}!`);
        setShowTransferEmailModal(false);
        setTransferRecipientEmails(['']);
        setTransferCcEmails(['']);
        setTransferEmailSubject('');
        setTransferEmailContent('');
        setTransferFormData({});
      } else {
        alert(`❌ Failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Transfer email error:', error);

      if (error.message.includes('404')) {
        alert('❌ Backend API route not found!\n\nCreate this route in your backend:\nPOST /api/delivery/email/send-internal-transfer');
      } else if (error.name === 'SyntaxError') {
        alert('❌ Server returned HTML instead of JSON.\nThe API endpoint does not exist.');
      } else {
        alert(`❌ Error: ${error.message}`);
      }
    } finally {
      setTransferEmailSending(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`http://192.168.6.185:3000/api/delivery/update-deployment/${selectedDeployment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Deployment record updated successfully!');
        fetchDeployments(); // Refresh data
        closeEditModal();
      } else {
        alert(`❌ Update failed: ${result.message}`);
      }
    } catch (error) {
      alert('❌ Error updating deployment record');
      console.error('Update error:', error);
    }
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
      toDate: '',
      filterBy: 'createdAt'
    });
    setCurrentPage(1);
  };

  const getDateFilterLabel = (filterBy) => {
    const labels = {
      createdAt: 'Email Sent Date',
      doj: 'Date of Joining (DOJ)',
      exitDate: 'Exit Date',
      internalTransferDate: 'Internal Transfer Date'
    };
    return labels[filterBy] || 'Email Sent Date';
  };

  const hasActiveFilters = () => {
    return searchTerm || dateFilter.fromDate || dateFilter.toDate;
  };

  const getFilterButtonText = () => {
    const filterLabel = getDateFilterLabel(dateFilter.filterBy);

    if (dateFilter.fromDate && dateFilter.toDate) {
      return `${filterLabel}: ${formatDate(dateFilter.fromDate)} - ${formatDate(dateFilter.toDate)}`;
    } else if (dateFilter.fromDate) {
      return `${filterLabel}: From ${formatDate(dateFilter.fromDate)}`;
    } else if (dateFilter.toDate) {
      return `${filterLabel}: Until ${formatDate(dateFilter.toDate)}`;
    }
    return `Date Filter (${filterLabel})`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden relative">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-4">
            <Target className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Resource Availability & Internal Transfers
            </h2>
            <p className="text-purple-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active-inactive view with transfer control</p>
            {!loading && (
              <span className="bg-white/30 text-white px-3 py-1 rounded-full text-sm font-medium select-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {pagination.totalRecords || 0} deployed
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

        {/* Search Bar and Date Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deployment records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              <div className="flex gap-3 items-center">
                {/* Date Filter Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{getFilterButtonText()}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {showDateDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Professional Date Range Filter
                          </label>

                          <div className="mb-4">
                            <label className="block text-xs text-gray-600 mb-2 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Filter By Date Field</label>
                            <select
                              value={dateFilter.filterBy}
                              onChange={(e) => handleDateFilterChange('filterBy', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                              <option value="createdAt">📧 Email Sent Date</option>
                              <option value="doj">📅 Date of Joining (DOJ)</option>
                              <option value="exitDate">🚪 Exit Date</option>
                              <option value="internalTransferDate">🔄 Internal Transfer Date</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>From Date</label>
                              <input
                                type="date"
                                value={dateFilter.fromDate}
                                onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Date</label>
                              <input
                                type="date"
                                value={dateFilter.toDate}
                                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                          </div>

                          {(dateFilter.fromDate || dateFilter.toDate) && (
                            <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                              <p className="text-xs text-purple-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                📊 Filtering by: {getDateFilterLabel(dateFilter.filterBy)}
                                {dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block mt-1">
                                    📅 Range: {formatDate(dateFilter.fromDate)} to {formatDate(dateFilter.toDate)}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-2 border-t">
                          <button
                            onClick={clearDateFilter}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setShowDateDropdown(false)}
                            className="px-4 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Excel Button */}
                <button
                  onClick={handleExportExcel}
                  disabled={exporting || loading || deployments.length === 0}
                  className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 border text-sm font-medium ${
                    exporting || loading || deployments.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>

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

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-center">
            <div className="flex bg-gray-50 rounded-full p-1.5 shadow-inner border border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('active');
                  setCurrentPage(1);
                }}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${activeTab === 'active'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'active' ? 'bg-green-200' : 'bg-green-400'}`}></div>
                  Active ({pagination.activeCount || 0})
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('internal-transfer');
                  setCurrentPage(1);
                }}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${activeTab === 'internal-transfer'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'internal-transfer' ? 'bg-blue-200' : 'bg-blue-400'}`}></div>
                  Internal Transfer ({pagination.transferCount || 0})
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('inactive');
                  setCurrentPage(1);
                }}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${activeTab === 'inactive'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'inactive' ? 'bg-red-200' : 'bg-red-400'}`}></div>
                  Inactive ({pagination.inactiveCount || 0})
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="overflow-x-auto overflow-y-auto h-[calc(90vh-220px)]"
          style={{
            scrollbarWidth: 'auto',
            scrollbarColor: '#9ca3af #e5e7eb'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading deployment records...</span>
              </div>
            </div>
          ) : deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Target className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>No deployment records found</p>
              <p className="text-sm text-center max-w-md" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Deployment records will appear here after deployment emails are sent successfully
              </p>
            </div>
          ) : (
            <table className={`w-full table-fixed ${activeTab === 'inactive' ? 'min-w-[3200px]' : 'min-w-[2900px]'}`}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Emp ID</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>BU</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Client</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Track</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>HR Name</th>
                  <th className="w-48 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email ID</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>CAL/ADD</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>DM/DAL</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>TL/Lead Rec</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reporting To</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Team Name</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Zoom No</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mode Of Hire</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Work Location</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile No</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>DOJ</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Date of Deployment</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Extension</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Exit Date</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Internal Transfer Date</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Internal Transfer</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Tenure</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Lead OR Non-Lead</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>Batch</th>
                  {/* ✅ Exit Reason Column - Only show for Inactive tab */}
                  {activeTab === 'inactive' && (
                    <th className="w-48 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Exit Reason
                    </th>
                  )}
                  <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deployments.map((deployment) => (
                  <tr key={deployment._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <span className="font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {deployment.candidateEmpId}
                      </span>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.bu || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.client || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.track || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.hrName || '-'}</div>
                    </td>
                    <td className="w-48 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateOfficeEmail || deployment.email || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.role || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.calAdd || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.dmDal || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.tlLeadRec || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.reportingTo || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateAssignedTeam || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.zoomNo || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateExperienceLevel || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.workLocation || deployment.office || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateMobile || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.doj ? formatDate(deployment.doj) : '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.createdAt ? formatDate(deployment.createdAt) : '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.extension || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeTab === 'inactive' || deployment.status?.toLowerCase() === 'inactive' || deployment.exitDate
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {deployment.status || (activeTab === 'inactive' ? 'Inactive' : 'Active')}
                      </span>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.exitDate ? formatDate(deployment.exitDate) : '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.internalTransferDate ? formatDate(deployment.internalTransferDate) : '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center justify-center h-full">
                        <button
                          onClick={() => openTransferModal(deployment)}
                          className="inline-flex items-center justify-center w-10 h-8 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-blue-300 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-110 hover:-translate-y-0.5 relative group"
                          title="Internal Transfer"
                        >
                          <User className="w-3 h-3 absolute left-1.5 group-hover:scale-110 transition-transform duration-200" />
                          <ArrowRightLeft className="w-3 h-3 absolute right-1.5 group-hover:scale-110 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      </div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.tenure || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.leadOrNonLead || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateBatch || '-'}</div>
                    </td>
                    {/* ✅ Exit Reason Cell - Only show for Inactive tab */}
                    {activeTab === 'inactive' && (
                      <td className="w-48 px-3 py-2 border-r border-gray-200">
                        <div className="text-sm text-gray-900" title={deployment.exitReason || 'No reason provided'}>
                          {deployment.exitReason ? (
                            <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              {deployment.exitReason.length > 50 
                                ? `${deployment.exitReason.substring(0, 50)}...` 
                                : deployment.exitReason}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>No reason</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="w-24 px-3 py-2">
                      <button
                        onClick={() => openEditModal(deployment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 group"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Fixed at bottom - Only show with data */}
        {!loading && deployments.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 absolute bottom-0 left-0 right-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalRecords)} of {pagination.totalRecords} results
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
              <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* All the modals remain exactly the same */}
        {/* Internal Transfer Modal */}
        {showTransferModal && selectedDeployment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
              <button
                onClick={closeTransferModal}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-semibold mb-4 text-blue-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Internal Transfer - {selectedDeployment.candidateName}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.name}
                      onChange={(e) => updateTransferForm('name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.name && (
                      <button
                        onClick={() => clearTransferField('name')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Emp ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Emp ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.empId}
                      onChange={(e) => updateTransferForm('empId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.empId && (
                      <button
                        onClick={() => clearTransferField('empId')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Role</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.role}
                      onChange={(e) => updateTransferForm('role', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.role && (
                      <button
                        onClick={() => clearTransferField('role')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Email ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email ID</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={transferFormData.emailId}
                      onChange={(e) => updateTransferForm('emailId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.emailId && (
                      <button
                        onClick={() => clearTransferField('emailId')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Office */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.office}
                      onChange={(e) => updateTransferForm('office', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.office && (
                      <button
                        onClick={() => clearTransferField('office')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode of Hire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mode of Hire</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.modeOfHire}
                      onChange={(e) => updateTransferForm('modeOfHire', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.modeOfHire && (
                      <button
                        onClick={() => clearTransferField('modeOfHire')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* From Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>From Team</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.fromTeam}
                      onChange={(e) => updateTransferForm('fromTeam', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.fromTeam && (
                      <button
                        onClick={() => clearTransferField('fromTeam')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* To Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Team</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.toTeam}
                      onChange={(e) => updateTransferForm('toTeam', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.toTeam && (
                      <button
                        onClick={() => clearTransferField('toTeam')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reporting To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reporting To</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.reportingTo}
                      onChange={(e) => updateTransferForm('reportingTo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.reportingTo && (
                      <button
                        onClick={() => clearTransferField('reportingTo')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Manager */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Account Manager</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferFormData.accountManager}
                      onChange={(e) => updateTransferForm('accountManager', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.accountManager && (
                      <button
                        onClick={() => clearTransferField('accountManager')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Deployment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Deployment Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={transferFormData.deploymentDate}
                      onChange={(e) => updateTransferForm('deploymentDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    {transferFormData.deploymentDate && (
                      <button
                        onClick={() => clearTransferField('deploymentDate')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeTransferModal}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setShowTransferEmailModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Send Transfer Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Email Configuration Modal */}
        {showTransferEmailModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-blue-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Internal Transfer Email Configuration
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Subject</label>
                  <input
                    type="text"
                    value={transferEmailSubject}
                    onChange={(e) => setTransferEmailSubject(e.target.value)}
                    placeholder="Enter transfer email subject"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Content</label>
                  <textarea
                    value={transferEmailContent}
                    onChange={(e) => setTransferEmailContent(e.target.value)}
                    placeholder="Enter transfer email content or message"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Recipients</label>
                  <div className="space-y-2">
                    {transferRecipientEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...transferRecipientEmails];
                            newEmails[index] = e.target.value;
                            setTransferRecipientEmails(newEmails);
                          }}
                          placeholder={`Recipient ${index + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        <button
                          onClick={() => setTransferRecipientEmails(transferRecipientEmails.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setTransferRecipientEmails([...transferRecipientEmails, ''])}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      + Add To Email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>CC Recipients (Optional)</label>
                  <div className="space-y-2">
                    {transferCcEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...transferCcEmails];
                            newEmails[index] = e.target.value;
                            setTransferCcEmails(newEmails);
                          }}
                          placeholder={`CC Recipient ${index + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        <button
                          onClick={() => setTransferCcEmails(transferCcEmails.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setTransferCcEmails([...transferCcEmails, ''])}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
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
                    setShowTransferEmailModal(false);
                    setTransferRecipientEmails(['']);
                    setTransferCcEmails(['']);
                    setTransferEmailSubject('');
                    setTransferEmailContent('');
                    setTransferFormData({});
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTransferEmail}
                  disabled={!transferEmailSubject.trim() || transferRecipientEmails.every(email => !email.trim()) || transferEmailSending}
                  className={`px-4 py-2 rounded-lg transition-colors ${transferEmailSubject.trim() && transferRecipientEmails.some(email => email.trim()) && !transferEmailSending
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {transferEmailSending ? 'Sending...' : 'Send Transfer Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedDeployment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-semibold mb-4 text-purple-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Edit Deployment Details - {selectedDeployment.candidateName}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Track</label>
                  <input
                    type="text"
                    value={editFormData.track}
                    onChange={(e) => updateEditForm('track', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>HR Name</label>
                  <input
                    type="text"
                    value={editFormData.hrName}
                    onChange={(e) => updateEditForm('hrName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>CAL/ADD</label>
                  <input
                    type="text"
                    value={editFormData.calAdd}
                    onChange={(e) => updateEditForm('calAdd', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>DM/DAL</label>
                  <input
                    type="text"
                    value={editFormData.dmDal}
                    onChange={(e) => updateEditForm('dmDal', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>TL/Lead Rec</label>
                  <input
                    type="text"
                    value={editFormData.tlLeadRec}
                    onChange={(e) => updateEditForm('tlLeadRec', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Zoom No</label>
                  <input
                    type="text"
                    value={editFormData.zoomNo}
                    onChange={(e) => updateEditForm('zoomNo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Work Location</label>
                  <input
                    type="text"
                    value={editFormData.workLocation}
                    onChange={(e) => updateEditForm('workLocation', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>DOJ</label>
                  <input
                    type="date"
                    value={editFormData.doj}
                    onChange={(e) => updateEditForm('doj', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Extension</label>
                  <input
                    type="text"
                    value={editFormData.extension}
                    onChange={(e) => updateEditForm('extension', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => updateEditForm('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Exit Date</label>
                  <input
                    type="date"
                    value={editFormData.exitDate}
                    onChange={(e) => updateEditForm('exitDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Internal Transfer Date</label>
                  <input
                    type="date"
                    value={editFormData.internalTransferDate}
                    onChange={(e) => updateEditForm('internalTransferDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Lead OR Non-Lead</label>
                  <select
                    value={editFormData.leadOrNonLead}
                    onChange={(e) => updateEditForm('leadOrNonLead', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <option value="">Select...</option>
                    <option value="Lead">Lead</option>
                    <option value="Non-Lead">Non-Lead</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Tenure</label>
                  <input
                    type="text"
                    value={selectedDeployment?.tenure || 'Calculating...'}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentRecordsTable;