import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building, Plus, CheckCircle, AlertCircle,
  Users, UserCheck, CreditCard, Award, TrendingUp, XCircle,
  MapPin, Link, Clock, Package, Target, Hash, Edit3, Save, RotateCcw, X, Search, Eye, Calendar
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CandidatesTable from './CandidatesTable';
import DeployedCandidatesTable from './DeloyedCandTable';
import RejectedCandidatesTable from './RejectedCandidatesTable';

const HRTagDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const [showForm, setShowForm] = useState(false);
  const [showCandidatesTable, setShowCandidatesTable] = useState(false);
  const [showDeployedCandidatesTable, setShowDeployedCandidatesTable] = useState(false);
  const [showRejectedCandidatesTable, setShowRejectedCandidatesTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    sent: 0,
    emailAssigned: 0,
    emailUnassigned: 0,
    empIdAssigned: 0,
    empIdUnassigned: 0,
    completed: 0,
    deployed: 0,
    rejected: 0,
    dropped: 0
  });

  // Form data state
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    fatherName: '',
    firstGraduate: '',
    experienceLevel: '',
    batchLabel: '',
    year: '',
    source: '',
    referenceName: '',
    native: '',
    mobileNumber: '',
    personalEmail: '',
    linkedinUrl: '',
    college: '',
    resume: null
  });

  const [errors, setErrors] = useState({});

  // Check server connection on component mount
  useEffect(() => {
    checkServerConnection();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServerStatus('connected');
      } else {
        setServerStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ Server connection failed:', error);
      setServerStatus('disconnected');
      toast.error('Unable to connect to server. Please ensure the backend is running on port 3000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    window.location.href = '/login';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.fatherName.trim()) {
      newErrors.fatherName = 'Father Name is required';
    }

    if (!formData.firstGraduate) {
      newErrors.firstGraduate = 'First Graduate is required';
    }

    if (!formData.experienceLevel) {
      newErrors.experienceLevel = 'Experience Level is required';
    }

    // Reference name validation
    if (formData.source === 'Reference' && !formData.referenceName.trim()) {
      newErrors.referenceName = 'Reference name is required when source is Reference';
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile Number must be 10 digits';
    }

    if (!formData.personalEmail.trim()) {
      newErrors.personalEmail = 'Personal Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.personalEmail)) {
      newErrors.personalEmail = 'Email is invalid';
    }

    if (!formData.college.trim()) {
      newErrors.college = 'College is required';
    }

    // LinkedIn URL validation (optional but if provided, should be valid)
    if (formData.linkedinUrl && !formData.linkedinUrl.includes('linkedin.com')) {
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL';
    }

    // Batch and Year validation for freshers
    if (formData.experienceLevel === 'Fresher') {
      if (!formData.batchLabel) {
        newErrors.batchLabel = 'Batch Label is required for freshers';
      }
      if (!formData.year) {
        newErrors.year = 'Year is required for freshers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear referenceName when source changes from Reference
    if (name === 'source' && value !== 'Reference') {
      setFormData(prev => ({
        ...prev,
        referenceName: ''
      }));
      setErrors(prev => ({
        ...prev,
        referenceName: ''
      }));
    }

    // Clear batch and year when experience level changes from Fresher
    if (name === 'experienceLevel' && value !== 'Fresher') {
      setFormData(prev => ({
        ...prev,
        batchLabel: '',
        year: ''
      }));
      setErrors(prev => ({
        ...prev,
        batchLabel: '',
        year: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF, DOC, or DOCX file');
        e.target.value = '';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        e.target.value = '';
        return;
      }

      setFormData(prev => ({
        ...prev,
        resume: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (serverStatus === 'disconnected') {
      toast.error('Server is not connected. Please check if the backend is running.');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly!');
      return;
    }

    setIsLoading(true);

    try {
      const loadingToast = toast.loading('Saving candidate data...');

      // Create FormData for file upload
      const submitData = new FormData();

      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key !== 'resume') {
          submitData.append(key, formData[key]);
        }
      });

      // Add file if exists
      if (formData.resume) {
        submitData.append('resume', formData.resume);
      }

      // Add additional fields
      submitData.append('submittedBy', userData.empId);
      submitData.append('submittedByName', userData.name);
      submitData.append('submissionDate', new Date().toISOString());

      const response = await fetch('http://192.168.6.185:3000/api/hr-tag/add-candidate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: submitData,
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (response.ok && data.success) {
        toast.success('Candidate data saved successfully! 🎉');

        resetForm();
        setShowForm(false);
        fetchStats();

      } else {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          handleLogout();
        } else if (response.status === 403) {
          toast.error('Access denied. Only HR Tag team members can add candidates.');
        } else if (response.status === 400 && data.message.includes('already exists')) {
          toast.error('Candidate with this email or mobile number already exists!');
        } else {
          toast.error(data.message || 'Failed to save candidate data');
        }
        console.error('❌ Server error:', data);
      }

    } catch (error) {
      console.error('❌ Network error:', error);
      toast.error('Network error. Please check if the server is running on http://192.168.6.185:3000');

      checkServerConnection();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      gender: '',
      fatherName: '',
      firstGraduate: '',
      experienceLevel: '',
      batchLabel: '',
      year: '',
      source: '',
      referenceName: '',
      native: '',
      mobileNumber: '',
      personalEmail: '',
      linkedinUrl: '',
      college: '',
      resume: null
    });
    setErrors({});
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  // Server status indicator
  const ServerStatusIndicator = () => (
    <div className="flex items-center gap-2 text-xs">
      {serverStatus === 'checking' && (
        <>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Checking server...</span>
        </>
      )}
      {serverStatus === 'connected' && (
        <>
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-green-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Server Connected</span>
        </>
      )}
      {serverStatus === 'disconnected' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Server Disconnected</span>
          <button
            onClick={checkServerConnection}
            className="text-red-600 hover:text-red-700 underline ml-1"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Retry
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header - Bigger */}
        <div className="mb-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  HR Tag Portal
                </h1>
                <p className="text-gray-600 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Welcome back, {userData.name}!</p>
                <ServerStatusIndicator />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">

                <button
                  onClick={() => setShowForm(true)}
                  disabled={serverStatus === 'disconnected'}
                  className={`px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm ${serverStatus === 'disconnected'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Resources
                </button>
                
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Reduced Size */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
  {/* Total Resources */}
  <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Resources</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.total}</p>
      </div>
      <div className="bg-blue-100 p-2 rounded-lg">
        <User className="w-5 h-5 text-blue-600" />
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Submitted</span>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.submitted}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sent</span>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.sent}</span>
      </div>
      
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.walkinCount || 0}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>Walk-in</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.referenceCount || 0}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reference</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.campusCount || 0}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>Campus</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Deployed Resources */}
<div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <div>
      <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resources from L&D</p>
      <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{(stats.rejected || 0) + (stats.dropped || 0)}</p>
    </div>
    <div className="bg-green-100 p-2 rounded-lg">
      <Award className="w-5 h-5 text-green-600" />
    </div>
  </div>
  
  <div className="border-t border-gray-200 pt-2">
    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status Details</p>
    <div className="grid grid-cols-2 gap-2">
      <div className="text-center bg-white rounded-lg p-2">
        <p className="text-sm font-semibold text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.rejected || 0}</p>
        <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Rejected</p>
      </div>
      <div className="text-center bg-white rounded-lg p-2">
        <p className="text-sm font-semibold text-orange-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.dropped || 0}</p>
        <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Dropped</p>
      </div>
    </div>
  </div>
</div>

  {/* Email Assignment Status */}
  <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Assignment</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.sent}</p>
      </div>
      <div className="bg-blue-100 p-2 rounded-lg">
        <Mail className="w-5 h-5 text-blue-600" />
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
          <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assigned</span>
        </div>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.emailAssigned}</span>
      </div>
      
      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
          <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</span>
        </div>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.emailUnassigned}</span>
      </div>
    </div>
  </div>

  {/* Employee ID Assignment Status */}
  <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Employee ID Assignment</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.sent}</p>
      </div>
      <div className="bg-purple-100 p-2 rounded-lg">
        <CreditCard className="w-5 h-5 text-purple-600" />
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
          <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assigned</span>
        </div>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.empIdAssigned}</span>
      </div>
      
      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
          <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</span>
        </div>
        <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.empIdUnassigned}</span>
      </div>
    </div>
  </div>
</div>

        {/* Dashboard Cards - Bigger with Strong Shadows and Hover Effects */}
        <div className="flex-1 max-h-[350px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Candidate Management */}
            <div
              className="group bg-white rounded-xl shadow-2xl border border-gray-200 cursor-pointer hover:shadow-2xl hover:bg-blue-50 transition-all duration-300 hover:border-blue-400 relative overflow-hidden flex flex-col transform hover:scale-105"
              onClick={() => setShowCandidatesTable(true)}
            >
              {/* Top Blue Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>

              <div className="p-8 flex-1 flex items-center">
                <div className="flex items-center space-x-6 w-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-2xl group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 flex-shrink-0">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Intake Resource Pipeline
                    </h5>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      View and Manage Intake Resources Pending Email and ID Assignment
                    </p>
                    <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View All Resources</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Started Candidates */}
            <div
              className="group bg-white rounded-xl shadow-2xl border border-gray-200 cursor-pointer hover:shadow-2xl hover:bg-green-50 transition-all duration-300 hover:border-green-400 relative overflow-hidden flex flex-col transform hover:scale-105"
              onClick={() => setShowDeployedCandidatesTable(true)}
            >
              {/* Top Green Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>

              <div className="p-8 flex-1 flex items-center">
                <div className="flex items-center space-x-6 w-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-2xl group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300 flex-shrink-0">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-green-700 transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Delivery-to-HR Ops Transition
                    </h5>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      View resources with discontinued training status and termination records
                    </p>
                    <div className="flex items-center text-green-600 text-sm font-medium group-hover:text-green-700">
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View Resources</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected/Rejected/Dropped Candidates */}
            <div
              className="group bg-white rounded-xl shadow-2xl border border-gray-200 cursor-pointer hover:shadow-2xl hover:bg-red-50 transition-all duration-300 hover:border-red-400 relative overflow-hidden flex flex-col transform hover:scale-105"
              onClick={() => setShowRejectedCandidatesTable(true)}
            >
              {/* Top Red Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>

              <div className="p-8 flex-1 flex items-center">
                <div className="flex items-center space-x-6 w-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-2xl group-hover:from-red-600 group-hover:to-red-700 transition-all duration-300 flex-shrink-0">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-red-700 transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Training Discontinued Profiles
                    </h5>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      View resources processed by L&D team with detailed status
                    </p>
                    <div className="flex items-center text-red-600 text-sm font-medium group-hover:text-red-700">
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View Processed Resources</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates Table Modal */}
        <CandidatesTable
          isOpen={showCandidatesTable}
          onClose={() => {
            setShowCandidatesTable(false);
            fetchStats();
          }}
        />

        {/* Deployed Candidates Table Modal */}
        <DeployedCandidatesTable
          isOpen={showDeployedCandidatesTable}
          onClose={() => setShowDeployedCandidatesTable(false)}
        />

        {/* Rejected/Dropped Candidates Table Modal */}
        <RejectedCandidatesTable
          isOpen={showRejectedCandidatesTable}
          onClose={() => setShowRejectedCandidatesTable(false)}
        />

        {/* Add Candidate Form Modal */}
        {showForm && (
          <AddCandidateForm
            showForm={showForm}
            setShowForm={setShowForm}
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            handleInputChange={handleInputChange}
            handleFileChange={handleFileChange}
            handleSubmit={handleSubmit}
            resetForm={resetForm}
            isLoading={isLoading}
            serverStatus={serverStatus}
          />
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          fontFamily: 'Montserrat, sans-serif'
        }}
      />
    </div>
  );
};

// Add Candidate Form Component
const AddCandidateForm = ({ showForm, setShowForm, formData, setFormData, errors, handleInputChange, handleFileChange, handleSubmit, resetForm, isLoading, serverStatus }) => {
  if (!showForm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h5 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <User className="w-6 h-6" />
            Add New Resources
          </h5>
          <button
            onClick={() => setShowForm(false)}
            className="text-white hover:text-gray-200 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  placeholder="Enter full name"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.fullName}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.gender ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.gender}</p>
              )}
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Father Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.fatherName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  placeholder="Enter father's name"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              {errors.fatherName && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.fatherName}</p>
              )}
            </div>

            {/* First Graduate */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                First Graduate <span className="text-red-500">*</span>
              </label>
              <select
                name="firstGraduate"
                value={formData.firstGraduate}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.firstGraduate ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <option value="">Select option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {errors.firstGraduate && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.firstGraduate}</p>
              )}
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Experience Level <span className="text-red-500">*</span>
              </label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.experienceLevel ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <option value="">Select experience level</option>
                <option value="Fresher">Fresher</option>
                <option value="Lateral">Lateral</option>
              </select>
              {errors.experienceLevel && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.experienceLevel}</p>
              )}
            </div>

            {/* Batch Label - Only show for Freshers */}
            {formData.experienceLevel === 'Fresher' && (
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Batch Label <span className="text-red-500">*</span>
                </label>
                <select
                  name="batchLabel"
                  value={formData.batchLabel}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.batchLabel ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <option value="">Select Batch</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(batch => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
                {errors.batchLabel && (
                  <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.batchLabel}</p>
                )}
              </div>
            )}

            {/* Year - Only show for Freshers */}
            {formData.experienceLevel === 'Fresher' && (
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Year <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    min="2020"
                    max="2030"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.year ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                    placeholder="Enter year (e.g., 2024)"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                {errors.year && (
                  <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.year}</p>
                )}
              </div>
            )}

            {/* Source */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Source</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <option value="">Select Source</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Reference">Reference</option>
                <option value="Campus">Campus</option>
              </select>
            </div>

            {/* Reference Name - Show only when source is Reference */}
            {formData.source === 'Reference' && (
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Reference Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="referenceName"
                    value={formData.referenceName}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.referenceName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                      }`}
                    placeholder="Enter reference person's name"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                {errors.referenceName && (
                  <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.referenceName}</p>
                )}
              </div>
            )}

            {/* Native */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Native</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="native"
                  value={formData.native}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
                  placeholder="Enter native place"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.mobileNumber ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              {errors.mobileNumber && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.mobileNumber}</p>
              )}
            </div>

            {/* Personal Email */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Personal Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.personalEmail ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  placeholder="Enter email address"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              {errors.personalEmail && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.personalEmail}</p>
              )}
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>LinkedIn URL</label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.linkedinUrl ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                placeholder="https://linkedin.com/in/username"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
              {errors.linkedinUrl && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.linkedinUrl}</p>
              )}
            </div>

            {/* College */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                College <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${errors.college ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  placeholder="Enter college name"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>
              {errors.college && (
                <p className="mt-1 text-red-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.college}</p>
              )}
            </div>

            {/* Resume Upload */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Resume Upload
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="resume-upload"
                />
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${formData.resume ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'}`}>
                  <div className="flex flex-col items-center space-y-3">
                    {formData.resume ? (
                      <>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-green-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{formData.resume.name}</p>
                          <p className="text-green-600 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, resume: null }));
                            document.getElementById('resume-upload').value = '';
                          }}
                          className="text-red-500 hover:text-red-700 text-sm underline"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          Remove file
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-700 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Click to upload or drag and drop
                          </p>
                          <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            PDF, DOC, DOCX up to 5MB
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Choose File
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || serverStatus === 'disconnected'}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Resources
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HRTagDashboard;