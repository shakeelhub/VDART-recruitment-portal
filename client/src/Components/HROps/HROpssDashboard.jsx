import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Link, Building, Plus, CheckCircle, AlertCircle,
  Users, UserCheck, CreditCard, Award, XCircle, Calendar, TrendingUp, Clock,
  Target, Hash, Search, Eye, Monitor
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HROpsCandidatesTable from '../HROps/HROpsTable';
import PermanentIDTable from '../HROps/PermanentIDTable';
import HROpsRejectedCandidatesTable from '../HROps/HROpsRejectedCandidatesTable';
import ResourceCard from '../HROps/resourcecard';


const HROpsDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  const [showCandidatesTable, setShowCandidatesTable] = useState(false);
  const [showPermanentIdTable, setShowPermanentIdTable] = useState(false);
  const [showResourceCard, setShowResourceCard] = useState(false);
  const [showRejectedCandidatesTable, setShowRejectedCandidatesTable] = useState(false);
  const [stats, setStats] = useState({
    overview: {
      totalResources: 0,
      thisMonth: 0,
      today: 0,
      thisMonthEmailAssignments: 0,
      thisMonthEmployeeIdAssignments: 0,
      todayEmailAssignments: 0,
      todayEmployeeIdAssignments: 0
    },
    emailStats: {
      assigned: 0,
      pending: 0,
      total: 0
    },
    employeeIdStats: {
      assigned: 0,
      pending: 0,
      total: 0
    }
  });
  const [permanentIdStats, setPermanentIdStats] = useState({
    overview: {
      totalResources: 0,
      totalTraineeAssignments: 0,
      totalPermanentAssignments: 0,
      readyForPermanentId: 0,
      thisMonthPermanent: 0,
      thisMonthTrainee: 0,
      todayPermanent: 0,
      todayTrainee: 0
    },
    breakdown: {
      permanent: {
        total: 0,
        assigned: 0,
        pending: 0
      },
      trainee: {
        total: 0,
        convertedToPermanent: 0,
        stillTrainee: 0
      }
    }
  });
  const [ldStatusStats, setLdStatusStats] = useState({
    overview: {
      totalSentToLD: 0,
      totalRejectedDropped: 0,
      rejectedCandidates: 0,
      droppedCandidates: 0,
      thisMonthRejectedDropped: 0,
      todayRejectedDropped: 0
    },
    breakdown: {
      rejected: 0,
      dropped: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    checkServerConnection();
    fetchStats();
    fetchPermanentIdStats();
    fetchLDStatusStats();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
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

  const fetchStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-ops/stats', {
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
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermanentIdStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-ops/permanent-id-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setPermanentIdStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching permanent ID stats:', error);
      toast.error('Failed to fetch permanent ID statistics');
    }
  };

  const fetchLDStatusStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/hr-ops/ld-status-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setLdStatusStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching L&D status stats:', error);
      toast.error('Failed to fetch L&D statistics');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    window.location.href = '/login';
  };

  const ServerStatusIndicator = () => (
    <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header - Enhanced */}
        <div className="mb-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  HR Operations Portal
                </h1>
                <p className="text-gray-600 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Welcome back, {userData.name}!</p>
                <ServerStatusIndicator />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Enhanced Statistics Cards - Updated with Email & Employee ID Stats */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* HR Ops Processing Pipeline */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>HR Ops Processing Pipeline</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.overview.totalResources}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Candidates in Pipeline</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : stats.overview.totalResources}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : stats.overview.thisMonth}</p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>This Month</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : stats.overview.today}</p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>Today</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
              
              </div>
            </div>
          </div>

          {/* Permanent Employee ID Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Permanent Employee ID Status</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : permanentIdStats.overview.totalResources}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Resources</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : permanentIdStats.overview.totalResources}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assigned</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : permanentIdStats.overview.totalPermanentAssignments}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : permanentIdStats.overview.readyForPermanentId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Temporary Employee ID Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Temporary Employee ID Status</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.employeeIdStats.total}
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Resources</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : stats.employeeIdStats.total}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assigned</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : stats.employeeIdStats.assigned}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : stats.employeeIdStats.pending}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Office Email Status - 4th Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Office Email Status</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.emailStats.total}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Resources</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{loading ? '...' : stats.emailStats.total}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Assigned</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : stats.emailStats.assigned}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {loading ? '...' : stats.emailStats.pending}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Dashboard Cards - Fixed Alignment */}
        <div className="flex-1 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-64">

            {/* Temporary Employee ID Management */}
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowCandidatesTable(true)}
            >
              {/* Top Blue Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Temporary Employee ID and Email Allocation
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Assign temporary employee IDs to onboarded Resources
                </p>

                <div className="flex items-center justify-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View All Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Permanent Employee ID Management */}
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowPermanentIdTable(true)}
            >
              {/* Top Green Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Permanent Employee ID Allocation
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Assign permanent employee IDs to successful resources
                </p>

                <div className="flex items-center justify-center text-green-600 text-sm font-medium group-hover:text-green-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View All Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Resource Availability & Internal Transfers */}
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowResourceCard(true)}
            >
              {/* Top Purple Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Resource Availability & Internal Transfers
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Active-inactive view with transfer control
                </p>

                <div className="flex items-center justify-center text-purple-600 text-sm font-medium group-hover:text-purple-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* L&D Processing Status */}
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowRejectedCandidatesTable(true)}
            >
              {/* Top Red Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  L&D Processing Status
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Resources marked unqualified by L&D training team
                </p>

                <div className="flex items-center justify-center text-red-600 text-sm font-medium group-hover:text-red-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View Processed Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Modal Components */}
        <HROpsCandidatesTable
          isOpen={showCandidatesTable}
          onClose={() => {
            setShowCandidatesTable(false);
            fetchStats();
          }}
          onEmailAssigned={fetchStats}
          onEmployeeIdAssigned={fetchStats}
        />

        <PermanentIDTable
          isOpen={showPermanentIdTable}
          onClose={() => {
            setShowPermanentIdTable(false);
            fetchPermanentIdStats();
          }}
          onPermanentIdAssigned={() => {
            fetchPermanentIdStats();
            fetchStats();
          }}
        />

        <HROpsRejectedCandidatesTable
          isOpen={showRejectedCandidatesTable}
          onClose={() => setShowRejectedCandidatesTable(false)}
        />

        <ResourceCard
          isOpen={showResourceCard}
          onClose={() => setShowResourceCard(false)}
        />
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
      />
    </div >
  );
};

export default HROpsDashboard;