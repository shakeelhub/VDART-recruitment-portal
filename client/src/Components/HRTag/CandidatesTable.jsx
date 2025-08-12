import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Building, Search,
  X, ChevronLeft, ChevronRight,
  Calendar, Users, Send, CalendarDays, Filter, CheckCircle, AlertCircle, CreditCard, Clock, ArrowRight,
  ExternalLink, FileText, Download, Hash, UserCheck, ChevronDown, Edit3, Save, RotateCcw, Upload
} from 'lucide-react';
import { toast } from 'react-toastify';

const CandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [allSelectedCandidatesData, setAllSelectedCandidatesData] = useState(new Map());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [viewMode, setViewMode] = useState('submitted');
  const [partialFilter, setPartialFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  const [exporting, setExporting] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const itemsPerPage = 10;

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);

      let statusParam = 'all';
      if (viewMode === 'submitted') {
        statusParam = 'submitted';
      } else if (viewMode === 'sent' || viewMode === 'partially' || viewMode === 'fully') {
        statusParam = 'sent';
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        status: statusParam,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-tag/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        let filteredCandidates = data.candidates;

        if (viewMode === 'partially') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            const isPartial = (hasOfficeEmail && !hasEmployeeId) || (!hasOfficeEmail && hasEmployeeId);

            if (!isPartial) return false;

            if (partialFilter === 'email-only') {
              return hasOfficeEmail && !hasEmployeeId;
            } else if (partialFilter === 'empid-only') {
              return !hasOfficeEmail && hasEmployeeId;
            }
            return true;
          });
        } else if (viewMode === 'fully') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            return hasOfficeEmail && hasEmployeeId;
          });
        }

        setCandidates(filteredCandidates);

        setPagination({
          ...data.pagination,
          total: filteredCandidates.length,
          pages: Math.ceil(filteredCandidates.length / itemsPerPage)
        });
      } else {
        console.error(data.message || 'Failed to fetch candidates');
        toast.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Network error while fetching candidates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, dateFilter.fromDate, dateFilter.toDate, viewMode, partialFilter]);

  // Edit Functions
  const handleEditStart = (candidate) => {
    setEditingCandidate(candidate._id);
    setEditFormData({
      fullName: candidate.fullName || '',
      gender: candidate.gender || '',
      fatherName: candidate.fatherName || '',
      firstGraduate: candidate.firstGraduate || '',
      experienceLevel: candidate.experienceLevel || '',
      batchLabel: candidate.batchLabel || '',
      year: candidate.year || '',
      source: candidate.source || '',
      referenceName: candidate.referenceName || '',
      native: candidate.native || '',
      mobileNumber: candidate.mobileNumber || '',
      personalEmail: candidate.personalEmail || '',
      linkedinUrl: candidate.linkedinUrl || '',
      college: candidate.college || ''
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    setEditingCandidate(null);
    setEditFormData({});
    setEditErrors({});
    setShowEditModal(false);
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (editErrors[field]) {
      setEditErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Clear referenceName when source changes from Reference
    if (field === 'source' && value !== 'Reference') {
      setEditFormData(prev => ({
        ...prev,
        referenceName: ''
      }));
    }

    // Clear batch and year when experience level changes from Fresher
    if (field === 'experienceLevel' && value !== 'Fresher') {
      setEditFormData(prev => ({
        ...prev,
        batchLabel: '',
        year: ''
      }));
    }
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.fullName?.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!editFormData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!editFormData.fatherName?.trim()) {
      newErrors.fatherName = 'Father Name is required';
    }

    if (!editFormData.firstGraduate) {
      newErrors.firstGraduate = 'First Graduate is required';
    }

    if (!editFormData.experienceLevel) {
      newErrors.experienceLevel = 'Experience Level is required';
    }

    if (editFormData.source === 'Reference' && !editFormData.referenceName?.trim()) {
      newErrors.referenceName = 'Reference name is required when source is Reference';
    }

    if (!editFormData.mobileNumber?.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (!/^[0-9]{10}$/.test(editFormData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile Number must be 10 digits';
    }

    if (!editFormData.personalEmail?.trim()) {
      newErrors.personalEmail = 'Personal Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editFormData.personalEmail)) {
      newErrors.personalEmail = 'Email is invalid';
    }

    if (!editFormData.college?.trim()) {
      newErrors.college = 'College is required';
    }

    if (editFormData.linkedinUrl && !editFormData.linkedinUrl.includes('linkedin.com')) {
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL';
    }

    if (editFormData.experienceLevel === 'Fresher') {
      if (!editFormData.batchLabel) {
        newErrors.batchLabel = 'Batch Label is required for freshers';
      }
      if (!editFormData.year) {
        newErrors.year = 'Year is required for freshers';
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSave = async () => {
    if (!validateEditForm()) {
      toast.error('Please fix all errors before saving');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`http://192.168.6.185:3000/api/hr-tag/update-candidate/${editingCandidate}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Candidate updated successfully!');
        handleEditCancel();
        fetchCandidates(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to update candidate');
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Network error while updating candidate');
    } finally {
      setSaving(false);
    }
  };

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      let statusParam = 'all';
      if (viewMode === 'submitted') {
        statusParam = 'submitted';
      } else if (viewMode === 'sent' || viewMode === 'partially' || viewMode === 'fully') {
        statusParam = 'sent';
      }

      const params = new URLSearchParams({
        page: 1,
        limit: 10000,
        status: statusParam,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`http://192.168.6.185:3000/api/hr-tag/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        let filteredCandidates = data.candidates;

        if (viewMode === 'partially') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            const isPartial = (hasOfficeEmail && !hasEmployeeId) || (!hasOfficeEmail && hasEmployeeId);

            if (!isPartial) return false;

            if (partialFilter === 'email-only') {
              return hasOfficeEmail && !hasEmployeeId;
            } else if (partialFilter === 'empid-only') {
              return !hasOfficeEmail && hasEmployeeId;
            }
            return true;
          });
        } else if (viewMode === 'fully') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            return hasOfficeEmail && hasEmployeeId;
          });
        }

        if (filteredCandidates.length === 0) {
          toast.warning('No data to export');
          return;
        }

        const excelData = filteredCandidates.map((candidate, index) => {
          const baseData = {
            'S.No': index + 1,
            'Full Name': candidate.fullName || '',
            'Gender': candidate.gender || '',
            'Mobile Number': candidate.mobileNumber || '',
            'Personal Email': candidate.personalEmail || '',
            'LinkedIn URL': candidate.linkedinUrl || '',
            'Experience Level': candidate.experienceLevel || '',
            'Batch': candidate.batchLabel || '',
            'Year': candidate.year || '',
            'Resume Available': candidate.resumeFileName ? 'Yes' : 'No'
          };

          if (viewMode !== 'submitted') {
            baseData['Employee ID'] = candidate.employeeId || '';
            baseData['Office Email'] = candidate.officeEmail || '';
          }

          baseData['College'] = candidate.college || '';
          baseData['Source'] = candidate.source || '';
          baseData['Reference Name'] = candidate.referenceName || '';
          baseData['Submitted By'] = candidate.submittedByName || '';
          baseData['Submitted Date'] = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-IN') : '';

          return baseData;
        });

        const headers = Object.keys(excelData[0]);
        const csvContent = [
          headers.join(','),
          ...excelData.map(row => 
            headers.map(header => {
              const value = row[header] || '';
              return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `candidates_${viewMode}_${currentDate}.csv`;
        link.setAttribute('download', filename);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`✅ Exported ${filteredCandidates.length} records to ${filename}`, {
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

  const getStatusText = (candidate) => {
    if (candidate.status === 'submitted') {
      return 'Submitted';
    }

    if (candidate.status === 'sent') {
      const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
      const hasEmployeeId = candidate.employeeIdAssignedBy != null;

      if (hasOfficeEmail && hasEmployeeId) {
        return 'Fully Updated';
      } else if (hasOfficeEmail || hasEmployeeId) {
        return 'Partially Updated';
      } else {
        return 'Sent to HR Ops';
      }
    }

    return 'Unknown';
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    } else {
      setViewMode('submitted');
      setCurrentPage(1);
      setSelectedCandidates(new Set());
      setAllSelectedCandidatesData(new Map());
      setSearchTerm('');
      setShowDateFilter(false);
      setPartialFilter('all');
      setDateFilter({
        fromDate: '',
        toDate: ''
      });
      // Reset edit state
      setEditingCandidate(null);
      setEditFormData({});
      setEditErrors({});
      setShowEditModal(false);
    }
  }, [isOpen, fetchCandidates]);

  useEffect(() => {
    setSelectedCandidates(new Set());
    setAllSelectedCandidatesData(new Map());
  }, [viewMode]);

  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      }, 500);

      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm, fetchCandidates]);

  const handleSelectCandidate = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    const newSelectedData = new Map(allSelectedCandidatesData);

    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
      newSelectedData.delete(candidateId);
    } else {
      const candidateData = candidates.find(c => c._id === candidateId);
      if (candidateData) {
        newSelected.add(candidateId);
        newSelectedData.set(candidateId, candidateData);
      }
    }

    setSelectedCandidates(newSelected);
    setAllSelectedCandidatesData(newSelectedData);
  };

  const handleSelectAll = () => {
    const currentPageIds = candidates.map(candidate => candidate._id);
    const newSelected = new Set(selectedCandidates);
    const newSelectedData = new Map(allSelectedCandidatesData);

    const allCurrentSelected = currentPageIds.every(id => selectedCandidates.has(id));

    if (allCurrentSelected) {
      currentPageIds.forEach(id => {
        newSelected.delete(id);
        newSelectedData.delete(id);
      });
    } else {
      candidates.forEach(candidate => {
        newSelected.add(candidate._id);
        newSelectedData.set(candidate._id, candidate);
      });
    }

    setSelectedCandidates(newSelected);
    setAllSelectedCandidatesData(newSelectedData);
  };

  const areAllCurrentPageSelected = () => {
    return candidates.length > 0 && candidates.every(candidate => selectedCandidates.has(candidate._id));
  };

  const handleSendToTeams = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to HR Ops team');
      return;
    }

    const confirmToast = toast(
      <div className="flex flex-col gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <p className="font-medium">Confirm Action</p>
        <p>Are you sure you want to send {selectedCandidatesList.length} candidate(s) to HR Ops team ?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToTeams(selectedCandidatesList);
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

  const executeSendToTeams = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to teams...');

    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/send-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to teams');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error sending candidates:', error);
      toast.error('Network error. Please check if server is running.');
    }
  };

  const handleSendToAdmin = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to Admin');
      return;
    }

    const confirmToast = toast(
      <div className="flex flex-col gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <p className="font-medium">Send to Admin</p>
        <p>Send {selectedCandidatesList.length} candidate(s) to Admin?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToAdmin(selectedCandidatesList);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
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

  const executeSendToAdmin = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to Admin...');

    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/send-to-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to Admin');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error:', error);
      toast.error('Network error.');
    }
  };

  const handleSendToAdminAndLD = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to Admin and L&D');
      return;
    }

    const confirmToast = toast(
      <div className="flex flex-col gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <p className="font-medium">Send to Admin & L&D</p>
        <p>Send {selectedCandidatesList.length} candidate(s) to BOTH Admin and L&D?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToAdminAndLD(selectedCandidatesList);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
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

  const executeSendToAdminAndLD = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to Admin & L&D...');

    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/send-to-admin-and-ld', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to Admin and L&D');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error:', error);
      toast.error('Network error.');
    }
  };

  const handleResumeClick = (candidateId) => {
    const url = `http://192.168.6.185:3000/api/hr-tag/download-resume/${candidateId}`;
    window.open(url, '_blank');
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

  const getStatusBadge = (candidate) => {
    if (candidate.status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Clock className="w-3 h-3" />
          Submitted
        </span>
      );
    }

    if (candidate.status === 'sent') {
      const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
      const hasEmployeeId = candidate.employeeIdAssignedBy != null;

      if (hasOfficeEmail && hasEmployeeId) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <CheckCircle className="w-3 h-3" />
            Fully Updated
          </span>
        );
      } else if (hasOfficeEmail || hasEmployeeId) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <AlertCircle className="w-3 h-3" />
            Partially Updated
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <ArrowRight className="w-3 h-3" />
            Sent to HR Ops
          </span>
        );
      }
    }
  };

  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
    setCurrentPage(1);
    // Cancel any ongoing edit when switching tabs
    handleEditCancel();
  };

  // Get current candidate being edited for modal
  const getCurrentCandidate = () => {
    return candidates.find(c => c._id === editingCandidate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resource Management</h2>
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
                  placeholder="Type 3+ characters to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              <div className="flex gap-3 items-center relative">
                {/* Date Filter */}
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
                  disabled={exporting || loading || candidates.length === 0}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                    exporting || loading || candidates.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export To Excel'}
                </button>

                {/* Send Button - For submitted candidates */}
                {selectedCandidates.size > 0 && viewMode === 'submitted' && (
                  <button
                    onClick={handleSendToTeams}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <Send className="w-4 h-4" />
                    Send to HR Ops ({selectedCandidates.size})
                  </button>
                )}

                {/* Partial Filter Dropdown - For partially updated candidates */}
                {viewMode === 'partially' && (
                  <div className="relative">
                    <select
                      value={partialFilter}
                      onChange={(e) => setPartialFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700 text-sm font-medium min-w-[180px] appearance-none cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="all">All Partial Updates</option>
                      <option value="email-only">Email Assigned Only</option>
                      <option value="empid-only">Employee ID Assigned Only</option>
                    </select>
                  </div>
                )}

                {/* Send to Admin Button - For fully updated candidates */}
                {selectedCandidates.size > 0 && viewMode === 'fully' && (
                  <button
                    onClick={handleSendToAdminAndLD}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <UserCheck className="w-4 h-4" />
                    Send to L&D And Admin ({selectedCandidates.size})
                  </button>
                )}
              </div>
            </div>

            {/* 4 Tab Toggle */}
            <div className="flex justify-center">
              <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => handleViewModeChange('submitted')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'submitted'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Submitted
                </button>
                <button
                  onClick={() => handleViewModeChange('sent')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'sent'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Sent to HR Ops 
                </button>
                <button
                  onClick={() => handleViewModeChange('partially')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'partially'
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Partially Updated
                </button>
                <button
                  onClick={() => handleViewModeChange('fully')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'fully'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Fully Updated
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Container - Enhanced Scrolling */}
        <div className="overflow-auto h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading candidates...</span>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>No candidates found</p>
              <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {viewMode === 'submitted' && "No submitted candidates yet."}
                {viewMode === 'sent' && "No candidates have been sent to teams yet."}
                {viewMode === 'partially' && "No partially updated candidates yet."}
                {viewMode === 'fully' && "No fully updated candidates yet."}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1800px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {(viewMode === 'submitted' || viewMode === 'fully') && (
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={areAllCurrentPageSelected()}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                    </th>
                  )}
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Full Name
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Gender
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Mobile Number
                  </th>
                  <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Personal Email
                  </th>
                  <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    LinkedIn URL
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Experience Level
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Batch & Year
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Resume
                  </th>
                  {viewMode !== 'submitted' && (
                    <>
                      <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Employee ID
                      </th>
                      <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Office Email
                      </th>
                    </>
                  )}
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    College
                  </th>
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Source
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Submitted By
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Submitted Date
                  </th>
                  {/* Actions Column - Moved to last position, only for submitted candidates */}
                  {viewMode === 'submitted' && (
                    <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => {
                  const isSelected = selectedCandidates.has(candidate._id);
                  
                  return (
                    <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                      {(viewMode === 'submitted' || viewMode === 'fully') && (
                        <td className="w-12 px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={viewMode === 'fully' && (candidate.sentToAdmin || candidate.sentToLD)}
                            onChange={() => handleSelectCandidate(candidate._id)}
                            className={`w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 ${viewMode === 'fully' && (candidate.sentToAdmin || candidate.sentToLD)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                              }`}
                          />
                        </td>
                      )}
                      <td className="w-40 px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="w-20 px-4 py-4">
                        <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.gender}</div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.mobileNumber}</span>
                        </div>
                      </td>
                      <td className="w-56 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.personalEmail}</span>
                        </div>
                      </td>
                      <td className="w-36 px-4 py-4">
                        <div className="text-sm">
                          {candidate.linkedinUrl ? (
                            <a
                              href={candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>View Profile</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not provided</span>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {candidate.experienceLevel || 'Not specified'}
                        </div>
                      </td>
                      <td className="w-28 px-4 py-4">
                        <div className="text-sm">
                          {candidate.experienceLevel === 'Fresher' && (candidate.batchLabel || candidate.year) ? (
                            <div className="flex flex-col gap-1">
                              {candidate.batchLabel && (
                                <div className="flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                  <span className="text-blue-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Batch {candidate.batchLabel}</span>
                                </div>
                              )}
                              {candidate.year && (
                                <div className="text-gray-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.year}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm">
                          {candidate.resumeFileName ? (
                            <button
                              onClick={() => handleResumeClick(candidate._id)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors duration-200 cursor-pointer"
                            >
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>View Resume</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>No resume</span>
                          )}
                        </div>
                      </td>
                      {viewMode !== 'submitted' && (
                        <>
                          <td className="w-40 px-4 py-4">
                            <div className="text-sm flex items-center gap-2">
                              {candidate.employeeIdAssignedBy ? (
                                <>
                                  <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {candidate.employeeId}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-orange-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not assigned</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="w-56 px-4 py-4">
                            <div className="text-sm flex items-center gap-2">
                              {candidate.officeEmailAssignedBy ? (
                                <>
                                  <Mail className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span className="text-green-700 truncate text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.officeEmail}</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-orange-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not assigned</span>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="w-48 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.college || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.source || 'Not specified'}</div>
                          {candidate.source === 'Reference' && candidate.referenceName && (
                            <div className="text-gray-500 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              {candidate.referenceName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{candidate.submittedByName}</div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formatDate(candidate.createdAt)}</span>
                        </div>
                      </td>
                      {/* Actions Column - Moved to last position, only for submitted candidates */}
                      {viewMode === 'submitted' && (
                        <td className="w-20 px-4 py-4">
                          <button
                            onClick={() => handleEditStart(candidate)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit candidate"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Simple Pagination */}
        {!loading && candidates.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Showing {candidates.length} results
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-3 py-1 text-sm bg-indigo-600 text-white rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {currentPage}
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
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <Edit3 className="w-6 h-6" />
                  Edit Candidate: {getCurrentCandidate()?.fullName}
                </h3>
                <button
                  onClick={handleEditCancel}
                  disabled={saving}
                  className="text-white hover:text-gray-200 transition-colors duration-200 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.fullName || ''}
                        onChange={(e) => handleEditInputChange('fullName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter full name"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.fullName && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.fullName}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.gender || ''}
                      onChange={(e) => handleEditInputChange('gender', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                        editErrors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {editErrors.gender && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.gender}</p>
                    )}
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Father Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.fatherName || ''}
                        onChange={(e) => handleEditInputChange('fatherName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.fatherName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter father's name"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.fatherName && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.fatherName}</p>
                    )}
                  </div>

                  {/* First Graduate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      First Graduate <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.firstGraduate || ''}
                      onChange={(e) => handleEditInputChange('firstGraduate', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                        editErrors.firstGraduate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <option value="">Select option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {editErrors.firstGraduate && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.firstGraduate}</p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.experienceLevel || ''}
                      onChange={(e) => handleEditInputChange('experienceLevel', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                        editErrors.experienceLevel ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <option value="">Select experience level</option>
                      <option value="Fresher">Fresher</option>
                      <option value="Lateral">Lateral</option>
                    </select>
                    {editErrors.experienceLevel && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.experienceLevel}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={editFormData.mobileNumber || ''}
                        onChange={(e) => handleEditInputChange('mobileNumber', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.mobileNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter 10-digit mobile number"
                        maxLength="10"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.mobileNumber && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.mobileNumber}</p>
                    )}
                  </div>

                  {/* Personal Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Personal Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={editFormData.personalEmail || ''}
                        onChange={(e) => handleEditInputChange('personalEmail', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.personalEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter email address"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.personalEmail && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.personalEmail}</p>
                    )}
                  </div>

                  {/* LinkedIn URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      LinkedIn URL
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={editFormData.linkedinUrl || ''}
                        onChange={(e) => handleEditInputChange('linkedinUrl', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.linkedinUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="https://linkedin.com/in/username"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.linkedinUrl && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.linkedinUrl}</p>
                    )}
                  </div>

                  {/* College */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      College <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Building className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.college || ''}
                        onChange={(e) => handleEditInputChange('college', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.college ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter college name"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                    {editErrors.college && (
                      <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.college}</p>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Source
                    </label>
                    <select
                      value={editFormData.source || ''}
                      onChange={(e) => handleEditInputChange('source', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <option value="">Select Source</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Reference">Reference</option>
                      <option value="Campus">Campus</option>
                    </select>
                  </div>

                  {/* Reference Name - Show only when source is Reference */}
                  {editFormData.source === 'Reference' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Reference Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={editFormData.referenceName || ''}
                          onChange={(e) => handleEditInputChange('referenceName', e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                            editErrors.referenceName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Enter reference person's name"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                      </div>
                      {editErrors.referenceName && (
                        <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.referenceName}</p>
                      )}
                    </div>
                  )}

                  {/* Native */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Native
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.native || ''}
                        onChange={(e) => handleEditInputChange('native', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        placeholder="Enter native place"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                    </div>
                  </div>

                  {/* Batch Label - Only show for Freshers */}
                  {editFormData.experienceLevel === 'Fresher' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Batch Label <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editFormData.batchLabel || ''}
                        onChange={(e) => handleEditInputChange('batchLabel', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                          editErrors.batchLabel ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        <option value="">Select Batch</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(batch => (
                          <option key={batch} value={batch}>{batch}</option>
                        ))}
                      </select>
                      {editErrors.batchLabel && (
                        <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.batchLabel}</p>
                      )}
                    </div>
                  )}

                  {/* Year - Only show for Freshers */}
                  {editFormData.experienceLevel === 'Fresher' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Year <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={editFormData.year || ''}
                          onChange={(e) => handleEditInputChange('year', e.target.value)}
                          min="2020"
                          max="2030"
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                            editErrors.year ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Enter year (e.g., 2024)"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                      </div>
                      {editErrors.year && (
                        <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editErrors.year}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    // Reset form to original values
                    const currentCandidate = getCurrentCandidate();
                    if (currentCandidate) {
                      setEditFormData({
                        fullName: currentCandidate.fullName || '',
                        gender: currentCandidate.gender || '',
                        fatherName: currentCandidate.fatherName || '',
                        firstGraduate: currentCandidate.firstGraduate || '',
                        experienceLevel: currentCandidate.experienceLevel || '',
                        batchLabel: currentCandidate.batchLabel || '',
                        year: currentCandidate.year || '',
                        source: currentCandidate.source || '',
                        referenceName: currentCandidate.referenceName || '',
                        native: currentCandidate.native || '',
                        mobileNumber: currentCandidate.mobileNumber || '',
                        personalEmail: currentCandidate.personalEmail || '',
                        linkedinUrl: currentCandidate.linkedinUrl || '',
                        college: currentCandidate.college || ''
                      });
                    }
                    setEditErrors({});
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleEditCancel}
                  disabled={saving}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl text-sm font-medium"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesTable;