import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Search, X, ChevronLeft, ChevronRight, Calendar,
  Target, UserX, ChevronDown, LogOut, Download
} from 'lucide-react';

const ResourceCard = ({ isOpen, onClose }) => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: '',
    filterBy: 'createdAt'
  });
  const [activeTab, setActiveTab] = useState('active');
  const itemsPerPage = 10;

  // Exit Modal States
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedExitDeployment, setSelectedExitDeployment] = useState(null);
  const [exitReason, setExitReason] = useState('');
  const [exitLoading, setExitLoading] = useState(false);

  // ✅ FIX: Memoized fetch function to prevent unnecessary re-renders
  const fetchDeployments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        ...(dateFilter.filterBy && { filterBy: dateFilter.filterBy }),
        tab: activeTab
      });

      // Updated API endpoint to use hr-ops route
      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/deployment-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      // Debug: Log the full response
      console.log('🔍 [DEBUG] Full API Response:', data);

      if (data.success) {
        setDeployments(data.data?.deployments || []);
        setPagination(data.data?.pagination || {});
        console.log('✅ [RESOURCE] Loaded', (data.data?.deployments || []).length, 'deployment records');
      } else {
        console.error('❌ Failed to fetch deployment records:', data.message);
        setDeployments([]);
        setPagination({});
      }
    } catch (error) {
      console.error('❌ Error fetching deployment records:', error);
      console.log('🔍 [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        endpoint: `http://192.168.6.185:3000/api/hr-ops/deployment-records?${params}`
      });
      setDeployments([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, dateFilter, activeTab]); // ✅ FIX: Proper dependencies

  // ✅ FIX: Separate effect for modal opening - only run once when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset to active tab when opening
      setActiveTab('active');
      setCurrentPage(1);
    }
  }, [isOpen]); // ✅ FIX: Only depend on isOpen

  // ✅ FIX: Main data fetching effect - depends on fetchDeployments
  useEffect(() => {
    if (isOpen) {
      fetchDeployments();
    }
  }, [isOpen, fetchDeployments]); // ✅ FIX: Proper dependencies

  // ✅ FIX: Separate search effect with better debouncing
  useEffect(() => {
    if (!isOpen) return; // Don't run if modal is closed

    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        if (currentPage !== 1) {
          setCurrentPage(1); // This will trigger fetchDeployments via the main useEffect
        } else {
          fetchDeployments(); // Fetch directly if already on page 1
        }
      }, 500);
      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm, isOpen, fetchDeployments, currentPage]);

  // ✅ FIX: Improved tab change handler
  const handleTabChange = useCallback((newTab) => {
    if (newTab === activeTab) return; // Prevent unnecessary updates
    
    console.log(`🔄 [TAB] Switching from ${activeTab} to ${newTab}`);
    
    // Update states in the correct order
    setActiveTab(newTab);
    setCurrentPage(1);
    
    // Close any open dropdowns
    setShowDateDropdown(false);
    
    // The fetchDeployments will be called automatically via useEffect
  }, [activeTab]);

  // Excel Export Function (unchanged)
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

      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/deployment-records?${params}`, {
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
            'Employee ID': deployment.candidateEmpId || '',
            'Name': deployment.candidateName || '',
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
            'Team Name': deployment.candidateAssignedTeam || deployment.toTeam || '',
            'Zoom No': deployment.zoomNo || '',
            'Mode Of Hire': deployment.modeOfHire || deployment.candidateExperienceLevel || '',
            'Work Location': deployment.workLocation || deployment.office || '',
            'Mobile No': deployment.candidateMobile || '',
            'DOJ': deployment.doj ? formatDate(deployment.doj) : '',
            'Date of Deployment': deployment.createdAt || deployment.deploymentDate ? formatDate(deployment.createdAt || deployment.deploymentDate) : '',
            'Extension': deployment.extension || '',
            'Status': deployment.status || 'Active',
            'Exit Date': deployment.exitDate ? formatDate(deployment.exitDate) : '',
            'Internal Transfer Date': deployment.internalTransferDate ? formatDate(deployment.internalTransferDate) : '',
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
        const filename = `resource_availability_${activeTab}_${currentDate}.csv`;
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
    setSearchTerm('');
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
    if (dateFilter.fromDate && dateFilter.toDate) {
      return `${formatDate(dateFilter.fromDate)} - ${formatDate(dateFilter.toDate)}`;
    } else if (dateFilter.fromDate) {
      return `From ${formatDate(dateFilter.fromDate)}`;
    } else if (dateFilter.toDate) {
      return `Until ${formatDate(dateFilter.toDate)}`;
    }
    return 'Date Filter';
  };

  // Exit Modal Functions (unchanged)
  const openExitModal = (deployment) => {
    setSelectedExitDeployment(deployment);
    setExitReason('');
    setShowExitModal(true);
  };

  const closeExitModal = () => {
    setShowExitModal(false);
    setSelectedExitDeployment(null);
    setExitReason('');
    setExitLoading(false);
  };

  const handleExitCandidate = async () => {
    if (!exitReason.trim()) {
      alert('Please enter an exit reason');
      return;
    }

    if (exitReason.trim().length < 5) {
      alert('Exit reason must be at least 5 characters long');
      return;
    }

    // Confirmation dialog
    const confirmExit = window.confirm(
      `Are you sure you want to mark ${selectedExitDeployment.candidateName} as inactive?\n\nThis action cannot be undone.`
    );

    if (!confirmExit) {
      return;
    }

    try {
      setExitLoading(true);
      
      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/exit-candidate/${selectedExitDeployment._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exitReason: exitReason.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${selectedExitDeployment.candidateName} has been successfully marked as inactive`);
        closeExitModal();
        // Refresh the table
        fetchDeployments();
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Exit candidate error:', error);
      alert('❌ Error processing exit. Please try again.');
    } finally {
      setExitLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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

              <div className="flex gap-3 items-center relative">
                {/* Professional Date Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>{getFilterButtonText()}</span>
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
                                {dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Range: {formatDate(dateFilter.fromDate)} to {formatDate(dateFilter.toDate)}
                                  </span>
                                )}
                                {dateFilter.fromDate && !dateFilter.toDate && (
                                  <span className="block">
                                    📅 From: {formatDate(dateFilter.fromDate)}
                                  </span>
                                )}
                                {!dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Until: {formatDate(dateFilter.toDate)}
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
                  className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 border text-sm ${
                    exporting || loading || deployments.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
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

        {/* ✅ FIX: Improved Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-center">
            <div className="flex bg-gray-50 rounded-full p-1.5 shadow-inner border border-gray-200">
              <button
                onClick={() => handleTabChange('active')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${
                  activeTab === 'active'
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
                onClick={() => handleTabChange('internal-transfer')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${
                  activeTab === 'internal-transfer'
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
                onClick={() => handleTabChange('inactive')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 mx-0.5 ${
                  activeTab === 'inactive'
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

        {/* Content Area - Rest of the component remains the same */}
        <div className="overflow-x-auto overflow-y-auto h-[calc(90vh-220px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading deployment records...</span>
              </div>
            </div>
          ) : deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                {activeTab === 'inactive' ? (
                  <UserX className="w-12 h-12 text-red-500" />
                ) : (
                  <Target className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h3 className="text-2xl font-semibold text-gray-600 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'inactive' ? 'No Inactive Resources Found' : 
                 activeTab === 'internal-transfer' ? 'No Internal Transfer Records Found' :
                 'No Active Resources Found'}
              </h3>
              <p className="text-gray-500 text-center max-w-md" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'inactive' ? 'Inactive resources will appear here when available.' :
                 activeTab === 'internal-transfer' ? 'Internal transfer records will appear here when available.' :
                 'Active deployment records will appear here after deployment emails are sent successfully.'}
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed min-w-[2600px]">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Employee ID
                  </th>
                  <th className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Name
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    BU
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Client
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Track
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    HR Name
                  </th>
                  <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Email ID
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Role
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    CAL/ADD
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    DM/DAL
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    TL/Lead Rec
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Reporting To
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Team Name
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Zoom No
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Mode Of Hire
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Work Location
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Mobile No
                  </th>
                  <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    DOJ
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Date of Deployment
                  </th>
                  <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Extension
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Status
                  </th>
                  <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Exit Date
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Internal Transfer Date
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Tenure
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Lead OR Non-Lead
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Batch
                  </th>
                  {/* Exit Reason Column - Only show for Inactive tab */}
                  {activeTab === 'inactive' && (
                    <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Exit Reason
                    </th>
                  )}
                  {/* Exit Button Column - Only show for Active and Internal Transfer tabs */}
                  {(activeTab === 'active' || activeTab === 'internal-transfer') && (
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Exit
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deployments.map((deployment, index) => (
                  <tr key={deployment._id || index} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <span className="font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, monospace' }}>
                        {deployment.candidateEmpId || '-'}
                      </span>
                    </td>
                    <td className="w-40 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {deployment.candidateName || '-'}
                      </div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.bu || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.client || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.track || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.hrName || '-'}</div>
                    </td>
                    <td className="w-48 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900 truncate" title={deployment.candidateOfficeEmail || deployment.email || '-'} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {deployment.candidateOfficeEmail || deployment.email || '-'}
                      </div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.role || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.calAdd || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.dmDal || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.tlLeadRec || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.reportingTo || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateAssignedTeam || deployment.toTeam || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.zoomNo || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.modeOfHire || deployment.candidateExperienceLevel || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.workLocation || deployment.office || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateMobile || '-'}</div>
                    </td>
                    <td className="w-28 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(deployment.doj)}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(deployment.createdAt || deployment.deploymentDate)}</div>
                    </td>
                    <td className="w-28 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.extension || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (deployment.status || 'Active').toLowerCase() === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : (deployment.status || '').toLowerCase() === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {deployment.status || 'Active'}
                      </span>
                    </td>
                    <td className="w-28 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(deployment.exitDate)}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(deployment.internalTransferDate)}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.tenure || '-'}</div>
                    </td>
                    <td className="w-32 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.leadOrNonLead || '-'}</div>
                    </td>
                    <td className="w-24 px-3 py-3 border-r border-gray-200">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{deployment.candidateBatch || '-'}</div>
                    </td>
                    {/* Exit Reason Column - Only show for Inactive tab */}
                    {activeTab === 'inactive' && (
                      <td className="w-48 px-3 py-3 border-r border-gray-200">
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
                    {/* Exit Button - Only show for Active and Internal Transfer tabs */}
                    {(activeTab === 'active' || activeTab === 'internal-transfer') && (
                      <td className="w-20 px-3 py-3">
                        <button
                          onClick={() => openExitModal(deployment)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:text-red-700 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                          title={`Exit ${deployment.candidateName}`}
                        >
                          <LogOut className="w-3 h-3" />
                          Exit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination and Exit Modal remain the same */}
        {!loading && deployments.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 absolute bottom-0 left-0 right-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalRecords || 0)} of {pagination.totalRecords || 0} results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentPage} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages || 1, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Exit Modal remains exactly the same */}
        {showExitModal && selectedExitDeployment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Exit Candidate</h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mark {selectedExitDeployment.candidateName} as inactive</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Exit Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    placeholder="Enter the reason for exit (minimum 5 characters)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                    disabled={exitLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {exitReason.length}/5 characters minimum
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    <strong>Warning:</strong> This will move the candidate from {activeTab === 'active' ? 'Active' : 'Internal Transfer'} to Inactive status. This action cannot be undone.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeExitModal}
                    disabled={exitLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExitCandidate}
                    disabled={exitLoading || !exitReason.trim() || exitReason.trim().length < 5}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      exitLoading
                        ? 'bg-red-400'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {exitLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      'Confirm Exit'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResourceCard;