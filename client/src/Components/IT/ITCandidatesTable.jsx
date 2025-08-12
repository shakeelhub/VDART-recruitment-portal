import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Building, Search, 
  X, ChevronLeft, ChevronRight, Calendar, Users, 
  CalendarDays, Filter, Plus, Check, AlertCircle, Monitor, CreditCard
} from 'lucide-react';
import { toast } from 'react-toastify';

const ITCandidatesTable = ({ isOpen, onClose, onEmailAssigned }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  const [editingEmail, setEditingEmail] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [assigningEmail, setAssigningEmail] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    }
  }, [isOpen, currentPage, dateFilter]);

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

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://localhost:3000/api/it/candidates?${params}`, {
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
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailEdit = (candidateId) => {
    setEditingEmail(candidateId);
    setEmailInput('');
  };

  const handleEmailCancel = () => {
    setEditingEmail(null);
    setEmailInput('');
  };

  const handleEmailAssign = async (candidateId) => {
    if (!emailInput.trim()) {
      toast.error('Please enter an email address');
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
      
      const response = await fetch(`http://localhost:3000/api/it/assign-office-email/${candidateId}`, {
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
              ? { ...candidate, officeEmail: emailInput.trim() }
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
        
        toast.success(`Office email assigned successfully to ${data.candidate.fullName} by IT Team`);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">IT Team - Email Management</h2>
            {!loading && (
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
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
                  placeholder="Type 3+ characters to search by name, email, mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              
              <div className="flex gap-3 items-center">
                {/* Date Filter Toggle Button */}
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                    showDateFilter || dateFilter.fromDate || dateFilter.toDate
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Date Filter
                  {(dateFilter.fromDate || dateFilter.toDate) && (
                    <span className="bg-slate-600 text-white text-xs px-1.5 py-0.5 rounded-full">●</span>
                  )}
                </button>
              </div>
            </div>

            {/* Date Filter Panel */}
            {showDateFilter && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={dateFilter.fromDate}
                      onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={dateFilter.toDate}
                      onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={clearDateFilter}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                
                {/* Active Filter Display */}
                {(dateFilter.fromDate || dateFilter.toDate) && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <Filter className="w-4 h-4" />
                    <span>
                      Filtering: {dateFilter.fromDate && `From ${formatDate(dateFilter.fromDate)}`}
                      {dateFilter.fromDate && dateFilter.toDate && ' '}
                      {dateFilter.toDate && `To ${formatDate(dateFilter.toDate)}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto overflow-y-auto h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading candidates...</span>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No candidates found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="w-36 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile Number
                  </th>
                  <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personal Email
                  </th>
                  <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Office Email
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="w-40 px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 truncate">{candidate.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="w-20 px-6 py-4">
                      <div className="text-sm text-gray-900">{candidate.gender}</div>
                    </td>
                    <td className="w-36 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>{candidate.mobileNumber}</span>
                      </div>
                    </td>
                    <td className="w-64 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{candidate.personalEmail}</span>
                      </div>
                    </td>
                    <td className="w-64 px-6 py-4">
                      {candidate.officeEmail ? (
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <Mail className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="truncate text-green-700">{candidate.officeEmail}</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ) : editingEmail === candidate._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Enter office email"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEmailAssign(candidate._id)}
                            disabled={assigningEmail === candidate._id}
                            className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700 disabled:opacity-50"
                          >
                            {assigningEmail === candidate._id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={handleEmailCancel}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
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
                          <span className="text-sm">Assign Email</span>
                        </button>
                      )}
                    </td>
                    <td className="w-48 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        {candidate.employeeId && candidate.employeeId.trim() !== '' ? (
                          <>
                            <CreditCard className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
                              {candidate.employeeId}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            <span className="text-orange-600">Not assigned</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="w-48 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{candidate.college || 'Not specified'}</span>
                      </div>
                    </td>
                    <td className="w-32 px-6 py-4">
                      <div className="text-sm text-gray-900 truncate">{candidate.submittedByName}</div>
                    </td>
                    <td className="w-40 px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{formatDate(candidate.createdAt)}</span>
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
              <span className="text-sm text-gray-700">
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
              <span className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded">
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

export default ITCandidatesTable;