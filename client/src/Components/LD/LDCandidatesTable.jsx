import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, Search, X, Calendar, Users,
  Hash, CreditCard, AlertCircle, BookOpen, CheckCircle, XCircle, Clock,
  Save, RotateCcw, Edit3, Eye, CalendarDays, Download, ChevronDown
} from 'lucide-react';

const LDCandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [statusUpdate, setStatusUpdate] = useState({
    ldStatus: '',
    ldReason: ''
  });
  const [updating, setUpdating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  // Updated status options - removed Pending from dropdown
  const statusOptions = [
    { value: 'Selected', label: 'Selected', color: 'green', icon: CheckCircle },
    { value: 'Rejected', label: 'Rejected', color: 'red', icon: XCircle },
    { value: 'Dropped', label: 'Dropped', color: 'yellow', icon: AlertCircle }
  ];

  // Updated rejection reasons
  const rejectionReasons = [
    'Not Selected',
    'Uninformed Leave',
    'Underperformance',
    'Behavioural Issues',
    'Disciplinary Issues',
    'Low Score'
  ];

  // New dropped reasons
  const droppedReasons = [
    'Better Offer',
    'Health Issues',
    'Personal Reasons',
    'Abscond'
  ];

  // Updated tab configuration
  const tabs = [
    { id: 'All', label: 'All', count: candidates.length },
    { id: 'Selected', label: 'Selected', count: candidates.filter(c => c.ldStatus === 'Selected').length },
    { id: 'Rejected', label: 'Rejected', count: candidates.filter(c => c.ldStatus === 'Rejected').length },
    { id: 'Dropped', label: 'Dropped', count: candidates.filter(c => c.ldStatus === 'Dropped').length }
  ];

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      fetchCandidates();
    } else {
      setIsAnimating(false);
      // Reset when modal is closed
      setSearchTerm('');
      setShowDateFilter(false);
      setDateFilter({ fromDate: '', toDate: '' });
      setActiveTab('All');
    }
  }, [isOpen]);

  // Handle smooth close animation
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Filter candidates based on search term and active tab
  useEffect(() => {
    let filtered = candidates;

    // Filter by tab
    if (activeTab !== 'All') {
      filtered = filtered.filter(candidate => candidate.ldStatus === activeTab);
    }

    // Filter by search term
    if (searchTerm.length >= 3) {
      filtered = filtered.filter(candidate => 
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.personalEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.mobileNumber.includes(searchTerm)
      );
    }

    setFilteredCandidates(filtered);
    // Clear selected candidates when tab changes
    setSelectedCandidates([]);
  }, [searchTerm, candidates, activeTab]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      console.log('🔍 [L&D] Fetching candidates...');
      
      const response = await fetch('http://192.168.6.185:3000/api/ld/candidates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [L&D] Authentication failed');
          alert('Session expired. Please login again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 [L&D] Received:', data);
      
      if (data.success) {
        setCandidates(data.candidates);
        setFilteredCandidates(data.candidates);
        console.log('✅ [L&D] Loaded', data.candidates.length, 'candidates');
      }
    } catch (error) {
      console.error('❌ [L&D] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      if (filteredCandidates.length === 0) {
        alert('No data to export');
        return;
      }

      // Prepare data for Excel export - ONLY table UI columns
      const excelData = filteredCandidates.map((candidate, index) => {
        return {
          'S.No': index + 1,
          'Full Name': candidate.fullName || '',
          'Employee ID': candidate.employeeId || '',
          'Office Email': candidate.officeEmail || '',
          'Mobile': candidate.mobileNumber || '',
          'Experience': candidate.experienceLevel || '',
          'College': candidate.college || 'Not specified',
          'L&D Status': candidate.ldStatus || 'Pending',
          'Reason': candidate.ldReason || '-',
          'Status Updated By': candidate.ldStatusUpdatedByName || 'L&D Team',
          'Delivery Status': candidate.sentToDelivery ? 'Sent to Delivery' : 'Not sent'
        };
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
      
      // Generate filename with current date and active tab
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `ld_candidates_${activeTab.toLowerCase()}_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Exported ${filteredCandidates.length} records to ${filename}`);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearDateFilter = () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    alert('Date filter cleared');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditStatus = (candidate) => {
    setEditingCandidate(candidate._id);
    setStatusUpdate({
      ldStatus: '',
      ldReason: candidate.ldReason || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setStatusUpdate({
      ldStatus: '',
      ldReason: ''
    });
  };

  const handleUpdateStatus = async (candidateId) => {
    if (!statusUpdate.ldStatus) {
      alert('Please select a status');
      return;
    }

    if ((statusUpdate.ldStatus === 'Rejected' || statusUpdate.ldStatus === 'Dropped') && !statusUpdate.ldReason) {
      alert(`Please select a reason for ${statusUpdate.ldStatus.toLowerCase()}`);
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch(`http://192.168.6.185:3000/api/ld/update-status/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ldStatus: statusUpdate.ldStatus,
          ldReason: statusUpdate.ldReason
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show different messages based on status
        if (statusUpdate.ldStatus === 'Selected') {
          alert(`✅ Status updated successfully - Candidate is now available for delivery allocation`);
        } else {
          alert(`✅ ${data.message}`);
        }
        
        // Update local state
        setCandidates(prev => 
          prev.map(candidate => 
            candidate._id === candidateId 
              ? { 
                  ...candidate, 
                  ldStatus: statusUpdate.ldStatus,
                  ldReason: statusUpdate.ldReason,
                  ldStatusUpdatedAt: new Date().toISOString(),
                  ldStatusUpdatedByName: JSON.parse(localStorage.getItem('userData') || '{}').name || 'L&D Team'
                }
              : candidate
          )
        );

        handleCancelEdit();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // FIXED: Allow all selected candidates to be checked
  const handleCheckboxChange = (candidateId, isChecked) => {
    setSelectedCandidates(prev => {
      if (isChecked) {
        return [...prev, candidateId];
      } else {
        return prev.filter(id => id !== candidateId);
      }
    });
  };

  // FIXED: Select all selected candidates that haven't been sent to delivery
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const availableSelectedIds = filteredCandidates
        .filter(candidate => candidate.ldStatus === 'Selected' && !candidate.sentToDelivery)
        .map(candidate => candidate._id);
      setSelectedCandidates(availableSelectedIds);
    } else {
      setSelectedCandidates([]);
    }
  };

  // FIXED: Check all selected candidates that haven't been sent
  const areAllSelectedSelected = () => {
    const availableSelected = filteredCandidates.filter(candidate => 
      candidate.ldStatus === 'Selected' && !candidate.sentToDelivery
    );
    return availableSelected.length > 0 && availableSelected.every(candidate => selectedCandidates.includes(candidate._id));
  };

  // Get count of available candidates for delivery
  const getAvailableForDeliveryCount = () => {
    return filteredCandidates.filter(candidate => 
      candidate.ldStatus === 'Selected' && !candidate.sentToDelivery
    ).length;
  };

  // Handle bulk action - Send to Delivery Team
  const handleBulkAction = async () => {
    const selectedCount = selectedCandidates.length;
    
    if (selectedCount === 0) {
      alert('Please select candidates to send to Delivery team');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send ${selectedCount} selected candidate(s) to Delivery team for allocation?`
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch('http://192.168.6.185:3000/api/ld/send-to-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidates
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        setSelectedCandidates([]);
        fetchCandidates(); // Refresh the candidates list
      } else {
        alert(data.message || 'Failed to send candidates to Delivery team');
      }

    } catch (error) {
      console.error('❌ Error sending candidates to Delivery team:', error);
      alert('Network error. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    // Handle Pending status display
    if (status === 'Pending' || !status) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }

    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-800`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 ease-out ${
      isAnimating ? 'opacity-100' : 'opacity-0'
    }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden transition-all duration-300 ease-out transform ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`}>
        
        {/* Header - Blue theme matching other dashboards */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D - Resource Management</h2>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {filteredCandidates.length} Resource(s)
            </span>
          </div>
          <button onClick={handleClose} className="text-white hover:text-gray-200 transition-colors duration-200 hover:rotate-180 transform">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar, Date Filter, Export and Dynamic Send Button */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search, Date Filter, Export Row */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              {/* Professional Date Filter - Same as HR Ops Component */}
              <div className="relative">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {(dateFilter.fromDate && dateFilter.toDate) 
                        ? `${formatDate(dateFilter.fromDate)} - ${formatDate(dateFilter.toDate)}`
                        : dateFilter.fromDate 
                        ? `From ${formatDate(dateFilter.fromDate)}`
                        : dateFilter.toDate
                        ? `Until ${formatDate(dateFilter.toDate)}`
                        : 'Date Filter'
                      }
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showDateFilter && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          Professional Date Range Filter
                        </label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>From Date</label>
                            <input
                              type="date"
                              value={dateFilter.fromDate}
                              onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Date</label>
                            <input
                              type="date"
                              value={dateFilter.toDate}
                              onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                            />
                          </div>
                        </div>
                        
                        {(dateFilter.fromDate || dateFilter.toDate) && (
                          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <p className="text-xs text-emerald-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
                          onClick={() => setShowDateFilter(false)}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
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
                disabled={exporting || loading || filteredCandidates.length === 0}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                  exporting || loading || filteredCandidates.length === 0
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export Excel'}
              </button>

              {/* Dynamic Send Button - Only shows when candidates are selected on Selected tab */}
              {selectedCandidates.length > 0 && activeTab === 'Selected' && (
                <button
                  onClick={handleBulkAction}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Users className="w-4 h-4" />
                  Send to Delivery Team ({selectedCandidates.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
            
            {/* Info badge showing available candidates */}
            {activeTab === 'Selected' && (
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {getAvailableForDeliveryCount()} Resources available for delivery
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-auto h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading resources...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <BookOpen className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'All' 
                  ? 'No candidates for L&D review' 
                  : `No ${activeTab.toLowerCase()} candidates`}
              </p>
              <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'All' 
                  ? 'No candidates have been sent from HR Tag yet.' 
                  : `No candidates with ${activeTab.toLowerCase()} status found.`}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1400px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Checkbox column header - only show in Selected tab */}
                  {activeTab === 'Selected' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={areAllSelectedSelected()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status Updated By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Delivery Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50">
                    {/* FIXED: Checkbox column - disabled if sent to delivery */}
                    {activeTab === 'Selected' && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate._id)}
                          disabled={candidate.sentToDelivery}
                          onChange={(e) => handleCheckboxChange(candidate._id, e.target.checked)}
                          className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                            candidate.sentToDelivery ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                    )}
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      {candidate.employeeId ? (
                        <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {candidate.employeeId}
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not assigned</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail || 'Not assigned'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.experienceLevel || 'Not specified'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</td>
                    
                    {/* Status Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {editingCandidate === candidate._id ? (
                        <select
                          value={statusUpdate.ldStatus}
                          onChange={(e) => setStatusUpdate(prev => ({ 
                            ...prev, 
                            ldStatus: e.target.value, 
                            ldReason: e.target.value === 'Selected' ? '' : prev.ldReason 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          <option value="">Select status...</option>
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        getStatusBadge(candidate.ldStatus || 'Pending')
                      )}
                    </td>
                    
                    {/* Reason Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {editingCandidate === candidate._id ? (
                        statusUpdate.ldStatus === 'Rejected' ? (
                          <select
                            value={statusUpdate.ldReason}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, ldReason: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            <option value="">Select reason...</option>
                            {rejectionReasons.map(reason => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        ) : statusUpdate.ldStatus === 'Dropped' ? (
                          <select
                            value={statusUpdate.ldReason}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, ldReason: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            <option value="">Select reason...</option>
                            {droppedReasons.map(reason => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>N/A</span>
                        )
                      ) : (
                        candidate.ldReason ? (
                          <span className={`text-sm px-2 py-1 rounded ${
                            candidate.ldStatus === 'Rejected' 
                              ? 'text-red-600 bg-red-100' 
                              : 'text-yellow-600 bg-yellow-100'
                          }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.ldReason}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>-</span>
                        )
                      )}
                    </td>
                    
                    {/* NEW: Status Updated By Column - Shows Employee Name */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.ldStatusUpdatedByName || 'L&D Team'}
                          </div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.ldStatusUpdatedAt ? new Date(candidate.ldStatusUpdatedAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Delivery Status Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {candidate.sentToDelivery ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          <CheckCircle className="w-3 h-3" />
                          Sent to Delivery
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not sent</span>
                      )}
                    </td>
                    
                    {/* Actions Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {editingCandidate === candidate._id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(candidate._id)}
                            disabled={updating}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center gap-1 disabled:opacity-50"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            {updating ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center gap-1"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            <RotateCcw className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditStatus(candidate)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center gap-1"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          <Edit3 className="w-3 h-3" />
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LDCandidatesTable;