import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Mail, Phone, Building, Search, X, Calendar, Award, Users, UserCheck, CalendarDays, Download, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const DeployedCandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [sentToHROpsCandidate, setSentToHROpsCandidate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [filteredSentToHROps, setFilteredSentToHROps] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState('deployed'); // 'deployed' or 'sent-to-hrops'
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-tag/deployed-candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [HR TAG] Authentication failed');
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Separate candidates based on whether they're sent to HR Ops or not
        const deployedCandidates = data.candidates.filter(c => !c.sentToHROpsFromHRTag);
        const sentToHROpsCandidate = data.candidates.filter(c => c.sentToHROpsFromHRTag);
        
        setCandidates(deployedCandidates);
        setSentToHROpsCandidate(sentToHROpsCandidate);
        setFilteredCandidates(deployedCandidates);
        setFilteredSentToHROps(sentToHROpsCandidate);

      } else {
        toast.error(data.message || 'Failed to fetch candidates');
      }
    } catch (error) {
      console.error('❌ [HR TAG] Error:', error);
      toast.error('Network error while fetching candidates');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFilter.fromDate, dateFilter.toDate]);

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Get current tab data for export
      const currentData = activeTab === 'deployed' ? filteredCandidates : filteredSentToHROps;

      if (currentData.length === 0) {
        toast.warning('No data to export');
        return;
      }

      // Prepare data for Excel export - ONLY table UI columns
      const excelData = currentData.map((candidate, index) => {
        const baseData = {
          'S.No': index + 1,
          'Full Name': candidate.fullName || '',
          'Employee ID': candidate.employeeId || '',
          'Office Email': candidate.officeEmail || '',
          'Mobile': candidate.mobileNumber || '',
          'Experience': candidate.experienceLevel || '',
          'College': candidate.college || 'Not specified'
        };

        // Add the last column based on active tab
        if (activeTab === 'deployed') {
          baseData['Sent Date'] = candidate.sentToHRTagAt ? new Date(candidate.sentToHRTagAt).toLocaleDateString('en-IN') : '';
        } else {
          baseData['Sent to HR Ops'] = candidate.sentToHROpsFromHRTagAt ? new Date(candidate.sentToHROpsFromHRTagAt).toLocaleDateString('en-IN') : '';
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
      const filename = `deployed_candidates_${activeTab}_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ Exported ${currentData.length} records to ${filename}`, {
        position: "top-right",
        autoClose: 4000
      });

    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    } else {
      // Reset when modal is closed
      setSearchTerm('');
      setShowDateFilter(false);
      setDateFilter({ fromDate: '', toDate: '' });
      setActiveTab('deployed');
      setSelectedCandidates([]);
    }
  }, [isOpen, fetchCandidates]);

  // Auto-search when typing 3+ characters
  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        fetchCandidates();
      }, 500);
      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm, fetchCandidates]);

  // Filter candidates based on search term
  useEffect(() => {
    let filteredDep = candidates;
    let filteredSent = sentToHROpsCandidate;

    setFilteredCandidates(filteredDep);
    setFilteredSentToHROps(filteredSent);
    // Clear selected candidates when search changes
    setSelectedCandidates([]);
  }, [candidates, sentToHROpsCandidate]);

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
    toast.info('Date filter cleared');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle checkbox selection
  const handleCheckboxChange = (candidateId, isChecked) => {
    setSelectedCandidates(prev => {
      if (isChecked) {
        return [...prev, candidateId];
      } else {
        return prev.filter(id => id !== candidateId);
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allCandidateIds = filteredCandidates.map(candidate => candidate._id);
      setSelectedCandidates(allCandidateIds);
    } else {
      setSelectedCandidates([]);
    }
  };

  // Check if all candidates are selected
  const areAllSelected = () => {
    return filteredCandidates.length > 0 && filteredCandidates.every(candidate => selectedCandidates.includes(candidate._id));
  };

  // Handle send to HR Ops for permanent ID
  const handleSendToHROps = async () => {
    const selectedCount = selectedCandidates.length;
    
    if (selectedCount === 0) {
      toast.warning('Please select candidates to send to HR Ops for permanent Employee ID assignment');
      return;
    }

    const confirmToast = toast(
      <div className="flex flex-col gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <p className="font-medium">Send to HR Ops</p>
        <p>Are you sure you want to send {selectedCount} candidate(s) to HR Ops for permanent Employee ID assignment?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToHROps();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Yes, Send
          </button>
          <button
            onClick={() => toast.dismiss(confirmToast)}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false
      }
    );
  };

  const executeSendToHROps = async () => {
    const loadingToast = toast.loading('Sending candidates to HR Ops...');
    
    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/send-to-hr-ops-permanent', {
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

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates([]);
        fetchCandidates(); // Refresh data
      } else {
        toast.error(data.message || 'Failed to send candidates to HR Ops');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error:', error);
      toast.error('Network error. Please check if server is running.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resources for Permanent ID Assignment</h2>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {activeTab === 'deployed' ? filteredCandidates.length : filteredSentToHROps.length} candidates
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-all duration-300 hover:rotate-180 transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar & Date Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search Bar and Date Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type 3+ characters to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              
              <div className="flex gap-3 items-center relative">
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
                  disabled={exporting || loading || (activeTab === 'deployed' ? filteredCandidates.length === 0 : filteredSentToHROps.length === 0)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                    exporting || loading || (activeTab === 'deployed' ? filteredCandidates.length === 0 : filteredSentToHROps.length === 0)
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>

                {/* Show button only in deployed tab when candidates are selected */}
                {activeTab === 'deployed' && selectedCandidates.length > 0 && (
                  <div className="transition-all duration-300 ease-in-out">
                    <button
                      onClick={handleSendToHROps}
                      className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <UserCheck className="w-4 h-4" />
                      Send to HR Ops ({selectedCandidates.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center">
              <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => setActiveTab('deployed')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === 'deployed'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Resources from Delivery ({filteredCandidates.length})
                </button>
                <button
                  onClick={() => setActiveTab('sent-to-hrops')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === 'sent-to-hrops'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Sent to HR Ops ({filteredSentToHROps.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-auto h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading Resources...</span>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[1400px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Checkbox column header - only show in deployed tab */}
                  {activeTab === 'deployed' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={areAllSelected()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {activeTab === 'deployed' ? 'Sent Date' : 'Sent to HR Ops'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'deployed' ? filteredCandidates : filteredSentToHROps).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Award className="w-12 h-12 text-gray-400" />
                        <p className="text-lg font-medium text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {activeTab === 'deployed' ? 'No Resources yet' : 'No candidates sent to HR Ops yet'}
                        </p>
                        <p className="text-sm text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {activeTab === 'deployed' 
                            ? 'No candidates have been sent from Delivery team yet.' 
                            : 'No candidates have been sent to HR Ops for permanent ID yet.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'deployed' ? filteredCandidates : filteredSentToHROps).map((candidate) => (
                    <tr key={candidate._id} className="hover:bg-gray-50">
                      
                      {/* Checkbox column - only show in deployed tab */}
                      {activeTab === 'deployed' && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate._id)}
                            onChange={(e) => handleCheckboxChange(candidate._id, e.target.checked)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                        </td>
                      )}
                      
                      {/* Candidate Info */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                            <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Employee ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {candidate.employeeId}
                        </span>
                      </td>
                      
                      {/* Office Email */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail}</td>
                      
                      {/* Mobile */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</td>
                      
                      {/* Experience */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.experienceLevel}</td>
                      
                      {/* College */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</td>
                      
                      {/* Sent Date */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {formatDate(activeTab === 'deployed' ? candidate.sentToHRTagAt : candidate.sentToHROpsFromHRTagAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeployedCandidatesTable;