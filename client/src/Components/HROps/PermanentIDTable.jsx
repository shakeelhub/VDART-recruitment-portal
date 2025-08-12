import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, Search, 
  X, ChevronLeft, ChevronRight, Calendar, Users, 
  CalendarDays, Filter, Plus, Check, AlertCircle, CreditCard, Award, Send, ChevronDown, Download
} from 'lucide-react';

const PermanentIDTable = ({ isOpen, onClose, onPermanentIdAssigned }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  const [editingPermanentId, setEditingPermanentId] = useState(null);
  const [permanentIdInput, setPermanentIdInput] = useState('');
  const [assigningPermanentId, setAssigningPermanentId] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [sendingToDelivery, setSendingToDelivery] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [tabCounts, setTabCounts] = useState({ all: 0, sentToDelivery: 0, notSentToDelivery: 0 });
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    }
  }, [isOpen, currentPage, dateFilter, activeTab]);

  // Auto-search when typing 3+ characters
  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        fetchCandidates();
      }, 500);

      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm]);

  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        tab: activeTab, // Send tab to backend
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/permanent-id-candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.candidates);
        setPagination(data.pagination);
        
        // Set tab counts from backend response
        setTabCounts({
          all: data.tabCounts?.all || 0,
          sentToDelivery: data.tabCounts?.sentToDelivery || 0,
          notSentToDelivery: data.tabCounts?.notSentToDelivery || 0
        });
        
        console.log('✅ [HR OPS] Loaded', data.candidates.length, 'Resources for permanent ID assignment');
      } else {
        console.error('Failed to fetch Resources:', data.message);
      }
    } catch (error) {
      console.error('Error fetching Resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset to default state when table opens
      setActiveTab('all');
      setSelectedCandidates([]);
      setCurrentPage(1);
      setSearchTerm('');
      setDateFilter({
        fromDate: '',
        toDate: ''
      });
      setShowDateFilter(false);
      setEditingPermanentId(null);
      setPermanentIdInput('');
      setToast({ show: false, message: '', type: '' });
    }
  }, [isOpen]);

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Fetch ALL data for export (not paginated)
      const params = new URLSearchParams({
        page: 1,
        limit: 10000, // Large limit to get all records
        tab: activeTab, // Include current tab filter
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/permanent-id-candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        const allCandidates = data.candidates;

        if (allCandidates.length === 0) {
          showToast('No data to export', 'error');
          return;
        }

        // Prepare data for Excel export - ONLY table UI columns
        const excelData = allCandidates.map((candidate, index) => {
          // Format status based on current logic
          let status = '';
          if (candidate.sentToDeliveryForPermanent) {
            status = 'Sent to Delivery';
          } else if (candidate.permanentEmployeeId) {
            status = 'Ready for Delivery';
          } else {
            status = 'Pending ID';
          }

          return {
            'S.No': index + 1,
            'Full Name': candidate.fullName || '',
            'Current ID': candidate.employeeId || '',
            'Permanent Employee ID': candidate.permanentEmployeeId || '',
            'Mobile Number': candidate.mobileNumber || '',
            'Office Email': candidate.officeEmail || '',
            'Experience': candidate.experienceLevel || '',
            'College': candidate.college || 'Not specified',
            'Status': status
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
        
        // Generate filename with current date and tab
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `permanent_id_candidates_${activeTab}_${currentDate}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`✅ Exported ${allCandidates.length} records to ${filename}`, 'success');

      } else {
        showToast('Failed to fetch data for export', 'error');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('Failed to export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePermanentIdEdit = (candidateId) => {
    setEditingPermanentId(candidateId);
    setPermanentIdInput('');
  };

  const handlePermanentIdCancel = () => {
    setEditingPermanentId(null);
    setPermanentIdInput('');
  };

  const handlePermanentIdAssign = async (candidateId) => {
    if (!permanentIdInput.trim()) {
      showToast('Please enter a permanent employee ID', 'error');
      return;
    }

    // Validate permanent employee ID format (4-12 characters, letters and numbers)
    const permIdRegex = /^[A-Z0-9]{4,12}$/;
    if (!permIdRegex.test(permanentIdInput.toUpperCase())) {
      showToast('Permanent Employee ID must be 4-12 characters (letters and numbers only)', 'error');
      return;
    }

    try {
      setAssigningPermanentId(candidateId);
      
      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/assign-permanent-id/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          permanentEmployeeId: permanentIdInput.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the candidate in the local state
        setCandidates(prev => 
          prev.map(candidate => 
            candidate._id === candidateId 
              ? { ...candidate, permanentEmployeeId: permanentIdInput.trim().toUpperCase() }
              : candidate
          )
        );
        
        // Reset editing state
        setEditingPermanentId(null);
        setPermanentIdInput('');
        
        // Notify parent component to refresh stats
        if (onPermanentIdAssigned) {
          onPermanentIdAssigned();
        }
        
        showToast(`✅ Permanent Employee ID assigned successfully to ${data.candidate.fullName}`, 'success');
      } else {
        showToast(data.message || 'Failed to assign permanent employee ID', 'error');
      }
    } catch (error) {
      console.error('Error assigning permanent employee ID:', error);
      showToast('Network error. Please check if server is running.', 'error');
    } finally {
      setAssigningPermanentId(null);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    const candidate = candidates.find(c => c._id === candidateId);
    
    // UPDATED LOGIC: Allow selection if candidate has permanent ID and was sent for permanent ID assignment
    if (!candidate.permanentEmployeeId) {
      showToast('Please assign the permanent employee ID first', 'warning');
      return;
    }
    
    // Check if already sent through permanent ID delivery flow
    if (candidate.sentToDeliveryForPermanent) {
      showToast('Candidate already sent to delivery through permanent ID flow', 'info');
      return;
    }

    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  const handleSelectAll = () => {
    // Only select candidates that have permanent ID and are not sent through permanent ID delivery
    const selectableCandidates = candidates.filter(candidate => 
      candidate.permanentEmployeeId && !candidate.sentToDeliveryForPermanent
    );
    
    if (selectedCandidates.length === selectableCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(selectableCandidates.map(candidate => candidate._id));
    }
  };

  const handleSendToDelivery = async () => {
    if (selectedCandidates.length === 0) {
      showToast('Please select Resources to send to Delivery', 'warning');
      return;
    }

    try {
      setSendingToDelivery(true);
      
      const response = await fetch('http://192.168.6.185:3000/api/hr-ops/send-to-delivery-permanent', {
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
        // Update candidates in local state
        setCandidates(prev => 
          prev.map(candidate => 
            selectedCandidates.includes(candidate._id)
              ? { ...candidate, sentToDeliveryForPermanent: true, sentToDeliveryForPermanentAt: new Date() }
              : candidate
          )
        );
        
        // Clear selection
        setSelectedCandidates([]);
        
        // Refresh data
        fetchCandidates();
        
        // Notify parent to refresh stats
        if (onPermanentIdAssigned) {
          onPermanentIdAssigned();
        }
        
        showToast(`✅ Successfully sent ${data.sentCount} candidate(s) to Delivery Team`, 'success');
      } else {
        showToast(data.message || 'Failed to send Resources to Delivery', 'error');
      }
    } catch (error) {
      console.error('Error sending to Delivery:', error);
      showToast('Network error. Please check if server is running.', 'error');
    } finally {
      setSendingToDelivery(false);
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
      toDate: ''
    });
    setCurrentPage(1);
  };

  // Get selectable candidates count for "Select All" checkbox
  const selectableCandidates = candidates.filter(candidate => 
    candidate.permanentEmployeeId && !candidate.sentToDeliveryForPermanent
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden">
        
        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-4 right-4 z-[60] transform transition-all duration-300 animate-in slide-in-from-top-2">
            <div className={`rounded-lg shadow-lg p-4 max-w-md ${
              toast.type === 'success' ? 'bg-green-50 border border-green-200' :
              toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              toast.type === 'info' ? 'bg-blue-50 border border-blue-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 ${
                  toast.type === 'success' ? 'text-green-400' :
                  toast.type === 'warning' ? 'text-yellow-400' :
                  toast.type === 'info' ? 'text-blue-400' :
                  'text-red-400'
                }`}>
                  {toast.type === 'success' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div className={`text-sm font-medium ${
                  toast.type === 'success' ? 'text-green-800' :
                  toast.type === 'warning' ? 'text-yellow-800' :
                  toast.type === 'info' ? 'text-blue-800' :
                  'text-red-800'
                }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {toast.message}
                </div>
                <button
                  onClick={() => setToast({ show: false, message: '', type: '' })}
                  className={`flex-shrink-0 ${
                    toast.type === 'success' ? 'text-green-400 hover:text-green-600' :
                    toast.type === 'warning' ? 'text-yellow-400 hover:text-yellow-600' :
                    toast.type === 'info' ? 'text-blue-400 hover:text-blue-600' :
                    'text-red-400 hover:text-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assign Permanent Employee ID</h2>
            {!loading && (
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {pagination.total || 0} candidates
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-all duration-300 hover:rotate-180 transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar and Date Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search and Filter Buttons Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Resources for permanent ID assignment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              
              <div className="flex gap-3 items-center relative">
                {/* Professional Date Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Date</label>
                              <input
                                type="date"
                                value={dateFilter.toDate}
                                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                              />
                            </div>
                          </div>
                          
                          {(dateFilter.fromDate || dateFilter.toDate) && (
                            <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                              <p className="text-xs text-indigo-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700"
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
                  disabled={exporting || loading || candidates.length === 0}
                  className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 border text-sm ${
                    exporting || loading || candidates.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>

         {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              All ({tabCounts.all})
            </button>
            <button
              onClick={() => setActiveTab('sent_to_delivery')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'sent_to_delivery'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Sent to Delivery ({tabCounts.sentToDelivery})
            </button>
            <button
              onClick={() => setActiveTab('not_sent_to_delivery')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'not_sent_to_delivery'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Not Sent to Delivery ({tabCounts.notSentToDelivery})
            </button>
          </nav>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto overflow-y-auto h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading Resources...</span>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Award className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>No Resources for permanent ID assignment</p>
              <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resources will appear here after HR Tag sends them for permanent ID assignment</p>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Hide checkbox column for "sent_to_delivery" tab */}
                  {activeTab !== 'sent_to_delivery' && (
                    <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectableCandidates.length > 0 && selectedCandidates.length === selectableCandidates.length}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                  )}
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Full Name
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Current ID
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Permanent Employee ID
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                    {/* Hide checkbox column for "sent_to_delivery" tab */}
                    {activeTab !== 'sent_to_delivery' && (
                      <td className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate._id)}
                          onChange={() => handleSelectCandidate(candidate._id)}
                          disabled={!candidate.permanentEmployeeId || candidate.sentToDeliveryForPermanent}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    )}
                    <td className="w-40 px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                          <div className="text-sm text-gray-500 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="w-32 px-6 py-4">
                      <span className="font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, monospace' }}>
                        {candidate.employeeId}
                      </span>
                    </td>
                    <td className="w-48 px-6 py-4">
                      {candidate.permanentEmployeeId ? (
                        <div className="text-sm flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, monospace' }}>
                            {candidate.permanentEmployeeId}
                          </span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ) : editingPermanentId === candidate._id ? (
                        <div className="flex items-center gap-2 relative z-10">
                          <input
                            type="text"
                            value={permanentIdInput}
                            onChange={(e) => setPermanentIdInput(e.target.value.toUpperCase())}
                            placeholder="Enter Permanent ID"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white"
                            style={{ fontFamily: 'Montserrat, monospace' }}
                            autoFocus
                            maxLength="12"
                          />
                          <div className="flex items-center gap-1 relative z-20">
                            <button
                              onClick={() => handlePermanentIdAssign(candidate._id)}
                              disabled={assigningPermanentId === candidate._id}
                              className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200 relative z-30"
                              style={{ pointerEvents: 'auto' }}
                            >
                              {assigningPermanentId === candidate._id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Check className="w-4 h-4 stroke-2" />
                              )}
                            </button>
                            <button
                              onClick={handlePermanentIdCancel}
                              className="w-8 h-8 flex items-center justify-center bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 relative z-30"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <X className="w-4 h-4 stroke-2" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePermanentIdEdit(candidate._id)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors duration-200 text-sm font-medium"
                        >
                          <Plus className="w-4 h-4 flex-shrink-0" />
                          <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Assign ID</span>
                        </button>
                      )}
                    </td>
                    <td className="w-36 px-6 py-4" style={{ pointerEvents: 'auto' }}>
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
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.experienceLevel}</div>
                    </td>
                    <td className="w-48 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</span>
                      </div>
                    </td>
                    <td className="w-40 px-6 py-4">
                      {candidate.sentToDeliveryForPermanent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full watery-dot"></div>
                          <span className="text-sm text-green-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sent to Delivery</span>
                        </div>
                      ) : candidate.permanentEmployeeId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full watery-dot"></div>
                          <span className="text-sm text-blue-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ready for Delivery</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full watery-dot-orange"></div>
                          <span className="text-sm text-orange-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending ID</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Send to Delivery Button - Floating */}
        {selectedCandidates.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 transform transition-all duration-300 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {selectedCandidates.length} selected
                </div>
                <button
                  onClick={handleSendToDelivery}
                  disabled={sendingToDelivery}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {sendingToDelivery ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span className="font-medium">Send to Delivery</span>
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
              <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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

export default PermanentIDTable;