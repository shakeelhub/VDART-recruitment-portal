import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, Search, X, Calendar, Users,
  Hash, CreditCard, AlertCircle, BookOpen, CheckCircle, XCircle, Clock,
  Save, RotateCcw, Edit3, Eye, TrendingUp, Award, CalendarDays, ChevronDown, Download
} from 'lucide-react';

const HROpsRejectedCandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  // Tab configuration - excluding Selected
  const tabs = [
    { id: 'All', label: 'All', count: candidates.length },
    { id: 'Rejected', label: 'Rejected', count: candidates.filter(c => c.ldStatus === 'Rejected').length },
    { id: 'Dropped', label: 'Dropped', count: candidates.filter(c => c.ldStatus === 'Dropped').length }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchRejectedCandidates();
    }
  }, [isOpen]);

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
        candidate.mobileNumber.includes(searchTerm) ||
        (candidate.ldReason && candidate.ldReason.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by date range
    if (dateFilter.fromDate || dateFilter.toDate) {
      filtered = filtered.filter(candidate => {
        if (!candidate.ldStatusUpdatedAt) return false;
        
        const candidateDate = new Date(candidate.ldStatusUpdatedAt);
        const fromDate = dateFilter.fromDate ? new Date(dateFilter.fromDate) : null;
        const toDate = dateFilter.toDate ? new Date(dateFilter.toDate + 'T23:59:59') : null;
        
        if (fromDate && candidateDate < fromDate) return false;
        if (toDate && candidateDate > toDate) return false;
        
        return true;
      });
    }

    setFilteredCandidates(filtered);
  }, [searchTerm, candidates, activeTab, dateFilter]);

  const fetchRejectedCandidates = async () => {
    try {
      setLoading(true);
      console.log('🔍 [HR OPS] Fetching rejected/dropped candidates...');
      
      const response = await fetch('http://192.168.6.185:3000/api/hr-ops/rejected-candidates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [HR OPS] Authentication failed');
          alert('Session expired. Please login again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 [HR OPS] Received:', data);
      
      if (data.success) {
        setCandidates(data.candidates);
        setFilteredCandidates(data.candidates);
        console.log('✅ [HR OPS] Loaded', data.candidates.length, 'rejected/dropped candidates');
      }
    } catch (error) {
      console.error('❌ [HR OPS] Error:', error);
      alert('Failed to fetch rejected/dropped Resources. Please try again.');
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
        // Format L&D Status
        let ldStatusText = candidate.ldStatus || '';
        if (candidate.ldReason) {
          ldStatusText += ` - ${candidate.ldReason}`;
        }

        // Format Assignment Status
        const emailStatus = candidate.officeEmail ? 'Email Assigned' : 'Email Pending';
        const idStatus = candidate.employeeId ? 'ID Assigned' : 'ID Pending';
        const assignmentStatus = `${emailStatus}, ${idStatus}`;

        // Format Status Date
        const statusDate = candidate.ldStatusUpdatedAt 
          ? new Date(candidate.ldStatusUpdatedAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-';

        // Format L&D Decision By
        const decisionBy = candidate.ldStatusUpdatedBy || 'L&D Team';
        const decisionDate = candidate.ldStatusUpdatedAt 
          ? new Date(candidate.ldStatusUpdatedAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-';

        return {
          'S.No': index + 1,
          'Candidate Details': `${candidate.fullName} (${candidate.gender})`,
          'Contact Info': `${candidate.personalEmail} | ${candidate.mobileNumber}`,
          'Experience': candidate.experienceLevel === 'Fresher' && candidate.batchLabel 
            ? `${candidate.experienceLevel || 'Not specified'} - Batch ${candidate.batchLabel}`
            : candidate.experienceLevel || 'Not specified',
          'College': candidate.college || 'Not specified',
          'L&D Status': ldStatusText,
          'Assignment Status': assignmentStatus,
          'Status Date': statusDate,
          'L&D Decision By': `${decisionBy} (${decisionDate})`
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
      const filename = `hrops_rejected_candidates_${activeTab.toLowerCase()}_${currentDate}.csv`;
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  };

  const getStatusBadge = (status, reason) => {
    if (status === 'Selected') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <CheckCircle className="w-3 h-3" />
            Selected
          </span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ready for Deployment
          </span>
        </div>
      );
    }
    
    if (status === 'Rejected') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
          {reason && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {reason}
            </span>
          )}
        </div>
      );
    }
    
    if (status === 'Dropped') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <AlertCircle className="w-3 h-3" />
            Dropped
          </span>
          {reason && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {reason}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden">
        
        {/* Header - Modified gradient */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status</h2>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {filteredCandidates.length} candidates
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
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
                  placeholder="Search Resources by name, email, mobile, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              
              <div className="flex gap-3 items-center relative">
                {/* Professional Date Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">
                        {(dateFilter.fromDate && dateFilter.toDate) 
                          ? `${formatDate(dateFilter.fromDate).split(',')[0]} - ${formatDate(dateFilter.toDate).split(',')[0]}`
                          : dateFilter.fromDate 
                          ? `From ${formatDate(dateFilter.fromDate).split(',')[0]}`
                          : dateFilter.toDate
                          ? `Until ${formatDate(dateFilter.toDate).split(',')[0]}`
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Date</label>
                              <input
                                type="date"
                                value={dateFilter.toDate}
                                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                          </div>
                          
                          {(dateFilter.fromDate || dateFilter.toDate) && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs text-blue-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                {dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Range: {formatDate(dateFilter.fromDate).split(',')[0]} to {formatDate(dateFilter.toDate).split(',')[0]}
                                  </span>
                                )}
                                {dateFilter.fromDate && !dateFilter.toDate && (
                                  <span className="block">
                                    📅 From: {formatDate(dateFilter.fromDate).split(',')[0]}
                                  </span>
                                )}
                                {!dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Until: {formatDate(dateFilter.toDate).split(',')[0]}
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
                            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
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
                  className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 border text-sm ${
                    exporting || loading || filteredCandidates.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export To Excel'}
                </button>

              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200">
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
                }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Table Container */}
        <div className="overflow-auto h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading Resources...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <XCircle className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'All' 
                  ? 'No L&D processed Resources found' 
                  : `No ${activeTab.toLowerCase()} Resources found`}
              </p>
              <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {searchTerm.length >= 3 || dateFilter.fromDate || dateFilter.toDate
                  ? 'Try adjusting your search terms or date filters.' 
                  : 'All Resources are either pending L&D review or in process.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Candidate Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Contact Info</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assignment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Decision By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50">
                    {/* Candidate Details */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.gender}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                      <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</div>
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.experienceLevel || 'Not specified'}</div>
                      {candidate.experienceLevel === 'Fresher' && candidate.batchLabel && (
                        <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>Batch {candidate.batchLabel}</div>
                      )}
                    </td>

                    {/* College */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</div>
                    </td>

                    {/* L&D Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(candidate.ldStatus, candidate.ldReason)}
                    </td>

                    {/* Assignment Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs ${candidate.officeEmail ? 'text-green-600' : 'text-gray-400'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.officeEmail ? 'Email Assigned' : 'Email Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs ${candidate.employeeId ? 'text-green-600' : 'text-gray-400'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.employeeId ? 'ID Assigned' : 'ID Pending'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Date */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {formatDate(candidate.ldStatusUpdatedAt)}
                      </div>
                    </td>

                    {/* L&D Decision By */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {candidate.ldStatusUpdatedBy || 'L&D Team'}
                          </div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {formatDate(candidate.ldStatusUpdatedAt)}
                          </div>
                        </div>
                      </div>
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

export default HROpsRejectedCandidatesTable;