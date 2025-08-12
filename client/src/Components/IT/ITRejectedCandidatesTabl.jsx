import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, Search, X, Calendar, Users,
  Hash, CreditCard, AlertCircle, BookOpen, CheckCircle, XCircle, Clock,
  Save, RotateCcw, Edit3, Eye, TrendingUp, Award
} from 'lucide-react';

const ITRejectedCandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState('All');

  // Tab configuration - including Selected, Rejected, Dropped
  const tabs = [
    { id: 'All', label: 'All', count: candidates.length },
    { id: 'Selected', label: 'Selected', count: candidates.filter(c => c.ldStatus === 'Selected').length },
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

    setFilteredCandidates(filtered);
  }, [searchTerm, candidates, activeTab]);

  const fetchRejectedCandidates = async () => {
    try {
      setLoading(true);
      console.log('🔍 [IT] Fetching rejected/dropped candidates...');
      
      const response = await fetch('http://localhost:3000/api/it/rejected-candidates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [IT] Authentication failed');
          alert('Session expired. Please login again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 [IT] Received:', data);
      
      if (data.success) {
        setCandidates(data.candidates);
        setFilteredCandidates(data.candidates);
        console.log('✅ [IT] Loaded', data.candidates.length, 'rejected/dropped candidates');
      }
    } catch (error) {
      console.error('❌ [IT] Error:', error);
      alert('Failed to fetch rejected/dropped candidates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, reason) => {
    if (status === 'Selected') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Selected
          </span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Ready for Deployment
          </span>
        </div>
      );
    }
    
    if (status === 'Rejected') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
          {reason && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {reason}
            </span>
          )}
        </div>
      );
    }
    
    if (status === 'Dropped') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3" />
            Dropped
          </span>
          {reason && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              {reason}
            </span>
          )}
        </div>
      );
    }

    return null;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden">
        
        {/* Header - Blue theme matching other dashboards */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Selected/Rejected/Dropped Candidates</h2>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              {filteredCandidates.length} candidates
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates by name, email, mobile, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
              Candidates from L&D
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
              >
                {tab.label}
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Table Container */}
        <div className="overflow-auto h-[calc(90vh-220px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading candidates...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <XCircle className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">
                {activeTab === 'All' 
                  ? 'No L&D processed candidates found' 
                  : `No ${activeTab.toLowerCase()} candidates found`}
              </p>
              <p className="text-sm">
                {searchTerm.length >= 3 
                  ? 'Try adjusting your search terms.' 
                  : 'All candidates are either pending L&D review or in process.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L&D Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L&D Decision By</th>
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
                          <div className="text-sm font-medium text-gray-900">{candidate.fullName}</div>
                          <div className="text-sm text-gray-500">{candidate.gender}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.personalEmail}</div>
                      <div className="text-sm text-gray-500">{candidate.mobileNumber}</div>
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.experienceLevel || 'Not specified'}</div>
                      {candidate.experienceLevel === 'Fresher' && candidate.batchLabel && (
                        <div className="text-sm text-gray-500">Batch {candidate.batchLabel}</div>
                      )}
                    </td>

                    {/* College */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.college || 'Not specified'}</div>
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
                          <span className={`text-xs ${candidate.officeEmail ? 'text-green-600' : 'text-gray-400'}`}>
                            {candidate.officeEmail ? 'Email Assigned' : 'Email Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs ${candidate.employeeId ? 'text-green-600' : 'text-gray-400'}`}>
                            {candidate.employeeId ? 'ID Assigned' : 'ID Pending'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Date */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
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
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.ldStatusUpdatedByName || 'L&D Team'}
                          </div>
                          <div className="text-sm text-gray-500">
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

export default ITRejectedCandidatesTable;