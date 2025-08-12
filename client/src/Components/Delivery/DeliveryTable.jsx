import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building, Search, X, Calendar, Users,
  Hash, CreditCard, AlertCircle, Package, CheckCircle, XCircle, Clock,
  Save, RotateCcw, Edit3, Target, AlertTriangle, Filter, ChevronDown, Download, CalendarDays
} from 'lucide-react';

const DeliveryTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Simple Date Range Filter
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  
  const [allocationUpdate, setAllocationUpdate] = useState({
    allocationStatus: '',
    allocationNotes: '',
    assignedProject: '',
    assignedTeam: ''
  });
  const [updating, setUpdating] = useState(false);

  const allocationStatusOptions = [
    { value: 'Pending Allocation', label: 'Pending Allocation', color: 'orange', icon: Clock },
    { value: 'Allocated', label: 'Allocated', color: 'green', icon: CheckCircle },
    { value: 'On Hold', label: 'On Hold', color: 'yellow', icon: AlertTriangle },
    { value: 'Completed', label: 'Completed', color: 'purple', icon: Target }
  ];

  const tabs = [
    { id: 'All', label: 'All Resources', count: candidates.length },
    { id: 'SentToHRTag', label: 'Sent to HR Tag', count: candidates.filter(c => c.sentToHRTag).length },
    { id: 'NotSentToHRTag', label: 'Pending HR Tag', count: candidates.filter(c => !c.sentToHRTag).length }
  ];

  useEffect(() => {
    if (isOpen) {
      setActiveTab('All');
      setSearchTerm('');
      setShowDateFilter(false);
      setDateFilter({
        fromDate: '',
        toDate: ''
      });
      fetchCandidates();
    }
  }, [isOpen]);

  // Simple date filtering logic
  const isDateInRange = (dateString, fromDate, toDate) => {
    if (!dateString) return false;
    if (!fromDate && !toDate) return true;
    
    const date = new Date(dateString);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    
    if (from && to) {
      return date >= from && date <= to;
    } else if (from) {
      return date >= from;
    } else if (to) {
      return date <= to;
    }
    
    return true;
  };

  const matchesDateFilter = (candidate) => {
    if (!dateFilter.fromDate && !dateFilter.toDate) {
      return true;
    }
    
    return isDateInRange(candidate.createdAt, dateFilter.fromDate, dateFilter.toDate);
  };

  useEffect(() => {
    let filtered = candidates;
    
    if (activeTab !== 'All') {
      filtered = filtered.filter(candidate => 
        candidate.sentToHRTag === (activeTab === 'SentToHRTag')
      );
    }
    
    if (searchTerm.length >= 3) {
      filtered = filtered.filter(candidate =>
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.personalEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.mobileNumber.includes(searchTerm) ||
        candidate.employeeId.includes(searchTerm)
      );
    }
    
    // Apply enhanced date filtering
    filtered = filtered.filter(matchesDateFilter);
    
    setFilteredCandidates(filtered);
    setSelectedCandidates([]);
  }, [searchTerm, candidates, activeTab, dateFilter]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      // UPDATED: Call the new training-cleared endpoint
      const response = await fetch('http://192.168.6.185:3000/api/delivery/training-cleared', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [DELIVERY] Authentication failed');
          alert('Session expired. Please login again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.candidates);
        setFilteredCandidates(data.candidates);
      }
    } catch (error) {
      console.error('❌ [DELIVERY] Error:', error);
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
          'Resource Details': `${candidate.fullName} (${candidate.personalEmail})`,
          'Temp Employee ID': candidate.employeeId || '',
          'Office Email': candidate.officeEmail || '',
          'Mobile Number': candidate.mobileNumber || '',
          'Experience': candidate.experienceLevel || '',
          'College': candidate.college || 'Not specified',
          'Status': candidate.sentToHRTag ? 'Sent to HR Tag' : 'Pending HR Tag'
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
      const filename = `training_cleared_${activeTab.toLowerCase()}_${currentDate}.csv`;
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

  const handleEditAllocation = (candidate) => {
    setEditingCandidate(candidate._id);
    setAllocationUpdate({
      allocationStatus: candidate.allocationStatus || 'Pending Allocation',
      allocationNotes: candidate.allocationNotes || '',
      assignedProject: candidate.assignedProject || '',
      assignedTeam: candidate.assignedTeam || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setAllocationUpdate({
      allocationStatus: '',
      allocationNotes: '',
      assignedProject: '',
      assignedTeam: ''
    });
  };

  const handleUpdateAllocation = async (candidateId) => {
    if (!allocationUpdate.allocationStatus) {
      alert('Please select an allocation status');
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch(`http://192.168.6.185:3000/api/delivery/update-allocation/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(allocationUpdate)
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setCandidates(prev =>
          prev.map(candidate =>
            candidate._id === candidateId
              ? {
                  ...candidate,
                  allocationStatus: allocationUpdate.allocationStatus,
                  allocationNotes: allocationUpdate.allocationNotes,
                  assignedProject: allocationUpdate.assignedProject,
                  assignedTeam: allocationUpdate.assignedTeam,
                  allocationUpdatedAt: new Date().toISOString()
                }
              : candidate
          )
        );
        handleCancelEdit();
      } else {
        alert(data.message || 'Failed to update allocation');
      }
    } catch (error) {
      console.error('❌ Error updating allocation:', error);
      alert('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // ✅ UPDATED: Exclude candidates already sent to HR Tag from selection
  const handleCheckboxChange = (candidateId, isChecked) => {
    setSelectedCandidates(prev => {
      if (isChecked) {
        return [...prev, candidateId];
      } else {
        return prev.filter(id => id !== candidateId);
      }
    });
  };

  // ✅ UPDATED: Only select candidates NOT sent to HR Tag
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const selectableCandidates = filteredCandidates
        .filter(candidate => !candidate.sentToHRTag)
        .map(candidate => candidate._id);
      setSelectedCandidates(selectableCandidates);
    } else {
      setSelectedCandidates([]);
    }
  };

  // ✅ UPDATED: Check if all selectable candidates are selected
  const areAllSelected = () => {
    const selectableCandidates = filteredCandidates.filter(candidate => !candidate.sentToHRTag);
    return selectableCandidates.length > 0 && selectableCandidates.every(candidate => selectedCandidates.includes(candidate._id));
  };

  const handleSendToHRTag = async () => {
    const selectedCount = selectedCandidates.length;
    if (selectedCount === 0) {
      alert('Please select Resources to send to HR Tag');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to send ${selectedCount} fresher candidate(s) to HR Tag for permanent ID assignment?`
    );
    if (!confirmed) return;
    try {
      const response = await fetch('http://192.168.6.185:3000/api/delivery/send-to-hr-tag', {
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
        fetchCandidates();
      } else {
        alert(data.message || 'Failed to send candidates to HR Tag');
      }
    } catch (error) {
      console.error('❌ Error sending candidates to HR Tag:', error);
      alert('Network error. Please try again.');
    }
  };

  const getAllocationBadge = (status) => {
    const statusConfig = allocationStatusOptions.find(s => s.value === status);
    if (!statusConfig) return null;
    const Icon = statusConfig.icon;
    
    const colorClasses = {
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      purple: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[statusConfig.color]}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </span>
    );
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
  };

  const clearDateFilter = () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    alert('Date filter cleared');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
  };

  const hasActiveFilters = () => {
    return searchTerm || dateFilter.fromDate || dateFilter.toDate;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden border border-gray-200">
        {/* Header - Updated for Training-Cleared */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Training-Cleared Resources</h2>
              <p className="text-slate-300 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Freshers awaiting permanent ID assignment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, mobile, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white text-sm"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
            </div>

            <div className="flex items-center gap-2">
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

              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-1"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {/* Action Buttons */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-3">
                
                <button
                  onClick={handleSendToHRTag}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Users className="w-4 h-4" />
                  Send to HR Tag
                </button>
              </div>
            )}
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
                    ? 'border-slate-500 text-slate-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-slate-700'
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
                <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading freshers...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeTab === 'All'
                  ? 'No freshers available'
                  : `No ${activeTab.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} found`
                }
              </p>
              <p className="text-sm text-gray-500 text-center max-w-md" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {searchTerm || hasActiveFilters()
                  ? 'Try adjusting your search criteria or date filter.'
                  : activeTab === 'All'
                  ? 'Freshers will appear here once they are sent from L&D.'
                  : `No freshers match the selected filter criteria.`
                }
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={areAllSelected()}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resource Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Temp Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Experience</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>College</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate._id)}
                        onChange={(e) => handleCheckboxChange(candidate._id, e.target.checked)}
                        disabled={candidate.sentToHRTag} // ✅ Disable if already sent
                        className={`w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500 ${
                          candidate.sentToHRTag ? 'opacity-50 cursor-not-allowed' : ''
                        }`} // ✅ Visual styling for disabled state
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-orange-700 bg-orange-50 px-3 py-1 rounded-full text-xs font-semibold border border-orange-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {candidate.employeeId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {candidate.experienceLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.sentToHRTag ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sent to HR Tag
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          <Clock className="w-3 h-3 mr-1" />
                          Pending HR Tag
                        </span>
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

export default DeliveryTable;