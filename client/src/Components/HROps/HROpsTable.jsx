import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Mail, Phone, MapPin, Building, Search, 
  X, ChevronLeft, ChevronRight, Calendar, Users, 
  CalendarDays, Filter, Plus, Check, AlertCircle, CreditCard, Monitor, Download, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const HROpsCandidatesTable = ({ isOpen, onClose, onEmailAssigned, onEmployeeIdAssigned }) => {
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
  
  // Email assignment states
  const [editingEmail, setEditingEmail] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [assigningEmail, setAssigningEmail] = useState(null);
  
  // Employee ID assignment states
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [assigningEmployeeId, setAssigningEmployeeId] = useState(null);
  
  const itemsPerPage = 10;

  const resetEditingStates = useCallback(() => {
    setEditingEmail(null);
    setEmailInput('');
    setAssigningEmail(null);
    setEditingEmployeeId(null);
    setEmployeeIdInput('');
    setAssigningEmployeeId(null);
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.candidates);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch candidates:', data.message);
        toast.error(data.message || 'Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Network error while fetching candidates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, dateFilter.fromDate, dateFilter.toDate]);

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
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        const allCandidates = data.candidates;

        if (allCandidates.length === 0) {
          toast.warning('No data to export');
          return;
        }

        // Prepare data for Excel export - ONLY table UI columns
        const excelData = allCandidates.map((candidate, index) => {
          return {
            'S.No': index + 1,
            'Full Name': candidate.fullName || '',
            'Gender': candidate.gender || '',
            'Mobile Number': candidate.mobileNumber || '',
            'Personal Email': candidate.personalEmail || '',
            'Office Email': candidate.officeEmail || '',
            'Employee ID': candidate.employeeId || '',
            'College': candidate.college || 'Not specified',
            'Submitted By': candidate.submittedByName || '',
            'Submitted Date': candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : ''
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
        
        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `hrops_candidates_${currentDate}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`✅ Exported ${allCandidates.length} records to ${filename}`, {
          position: "top-right",
          autoClose: 4000
        });

      } else {
        toast.error('Failed to fetch data for export');
      }
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
      setCurrentPage(1);
      resetEditingStates();
    }
  }, [isOpen, fetchCandidates, resetEditingStates]);

  // Auto-search when typing 3+ characters
  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        fetchCandidates();
      }, 500);

      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm, fetchCandidates]);

  // ===== EMAIL ASSIGNMENT FUNCTIONS =====
  const handleEmailEdit = (candidateId) => {
    resetEditingStates();
    setEditingEmail(candidateId);
    setEmailInput('');
  };

  const handleEmailCancel = () => {
    setEditingEmail(null);
    setEmailInput('');
  };

  const handleEmailAssign = async (candidateId) => {
    if (!emailInput.trim()) {
      toast.error('Please enter an office email');
      return;
    }

    // Basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(emailInput)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setAssigningEmail(candidateId);
      
      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/assign-office-email/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          officeEmail: emailInput.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the candidate in the local state
        setCandidates(prev => 
          prev.map(candidate => 
            candidate._id === candidateId 
              ? { ...candidate, officeEmail: emailInput.trim().toLowerCase() }
              : candidate
          )
        );
        
        // Reset editing state
        setEditingEmail(null);
        setEmailInput('');
        
        // Notify parent component to refresh stats
        if (onEmailAssigned) {
          onEmailAssigned();
        }
        
        toast.success(`Office email assigned successfully to ${data.candidate.fullName} by HR Ops`);
      } else {
        toast.error(data.message || 'Failed to assign office email');
      }
    } catch (error) {
      console.error('Error assigning office email:', error);
      toast.error('Network error. Please check if server is running.');
    } finally {
      setAssigningEmail(null);
    }
  };

  // ===== EMPLOYEE ID ASSIGNMENT FUNCTIONS =====
  const handleEmployeeIdEdit = (candidateId) => {
    resetEditingStates();
    setEditingEmployeeId(candidateId);
    setEmployeeIdInput('');
  };

  const handleEmployeeIdCancel = () => {
    setEditingEmployeeId(null);
    setEmployeeIdInput('');
  };

  const handleEmployeeIdAssign = async (candidateId) => {
    if (!employeeIdInput.trim()) {
      toast.warning('Please enter an employee ID');
      return;
    }

    // Validate employee ID format (3-10 characters, letters and numbers)
    const empIdRegex = /^[A-Z0-9]{3,10}$/;
    if (!empIdRegex.test(employeeIdInput.toUpperCase())) {
      toast.error('Employee ID must be 3-10 characters (letters and numbers only)');
      return;
    }

    try {
      setAssigningEmployeeId(candidateId);
      
      const response = await fetch(`http://192.168.6.185:3000/api/hr-ops/assign-employee-id/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          employeeId: employeeIdInput.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the candidate in the local state
        setCandidates(prev => 
          prev.map(candidate => 
            candidate._id === candidateId 
              ? { ...candidate, employeeId: employeeIdInput.trim().toUpperCase() }
              : candidate
          )
        );
        
        // Reset editing state
        setEditingEmployeeId(null);
        setEmployeeIdInput('');
        
        // Notify parent component to refresh stats
        if (onEmployeeIdAssigned) {
          onEmployeeIdAssigned();
        }
        
        toast.success(`Employee ID assigned successfully to ${data.candidate.fullName} by HR Ops`);
      } else {
        toast.error(data.message || 'Failed to assign employee ID');
      }
    } catch (error) {
      console.error('Error assigning employee ID:', error);
      toast.error('Network error. Please check if server is running.');
    } finally {
      setAssigningEmployeeId(null);
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
    toast.info('Date filter cleared');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-white" />
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>HR Ops - Email & Employee ID Management</h2>
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
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Type 3+ characters to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
            </div>
            
                          <div className="flex gap-3 items-center relative">
              {/* Professional Date Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
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
                disabled={exporting || loading || candidates.length === 0}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
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

        {/* Table Container */}
        <div className="overflow-x-auto overflow-y-auto h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading candidates...</span>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>No candidates found</p>
              <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Candidates will appear here after HR Tag sends them</p>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Full Name
                  </th>
                  <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Gender
                  </th>
                  <th className="w-36 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Mobile Number
                  </th>
                  <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Personal Email
                  </th>
                  <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Office Email
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Employee ID
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    College
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Submitted By
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Submitted Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="w-40 px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="w-20 px-6 py-4">
                      <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.gender}</div>
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
                        <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</span>
                      </div>
                    </td>
                    <td className="w-64 px-6 py-4">
                      {candidate.officeEmail ? (
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <Mail className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="truncate text-green-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail}</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ) : editingEmail === candidate._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Enter office email"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEmailAssign(candidate._id)}
                            disabled={assigningEmail === candidate._id}
                            className="w-9 h-9 p-2 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-lg relative z-50 border-0"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              cursor: 'pointer',
                              WebkitTouchCallout: 'none',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {assigningEmail === candidate._id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={handleEmailCancel}
                            className="w-9 h-9 p-2 flex items-center justify-center bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-lg relative z-50 border-0"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              cursor: 'pointer',
                              WebkitTouchCallout: 'none',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEmailEdit(candidate._id)}
                          className="flex items-center gap-2 px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors duration-200"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assign Email</span>
                        </button>
                      )}
                    </td>
                    <td className="w-48 px-6 py-4">
                      {candidate.employeeId ? (
                        <div className="text-sm flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, monospace' }}>
                            {candidate.employeeId}
                          </span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ) : editingEmployeeId === candidate._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={employeeIdInput}
                            onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                            placeholder="Enter Employee ID"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                            style={{ fontFamily: 'Montserrat, monospace' }}
                            autoFocus
                            maxLength="10"
                          />
                          <button
                            onClick={() => handleEmployeeIdAssign(candidate._id)}
                            disabled={assigningEmployeeId === candidate._id}
                            className="w-9 h-9 p-2 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-lg relative z-50 border-0"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              cursor: 'pointer',
                              WebkitTouchCallout: 'none',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {assigningEmployeeId === candidate._id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={handleEmployeeIdCancel}
                            className="w-9 h-9 p-2 flex items-center justify-center bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-lg relative z-50 border-0"
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              cursor: 'pointer',
                              WebkitTouchCallout: 'none',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEmployeeIdEdit(candidate._id)}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assign ID</span>
                        </button>
                      )}
                    </td>
                    <td className="w-48 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</span>
                      </div>
                    </td>
                    <td className="w-32 px-6 py-4">
                      <div className="text-sm text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.submittedByName}</div>
                    </td>
                    <td className="w-40 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(candidate.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
              <span className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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

export default HROpsCandidatesTable;