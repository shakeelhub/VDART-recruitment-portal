import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, CheckCircle, XCircle, AlertCircle, Clock, 
  TrendingUp, Target, Package, Award, UserCheck, Calendar
} from 'lucide-react';
import LDCandidatesTable from './LDCandidatesTable';

const LDDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const [showCandidatesTable, setShowCandidatesTable] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    deployed: 0,
    rejected: 0,
    dropped: 0,
    sentToDelivery: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    checkServerConnection();
    fetchStats();
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
      console.error('Server connection failed:', error);
      setServerStatus('disconnected');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/ld/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching L&D stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    window.location.href = '/login';
  };

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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header - Enhanced */}
        <div className="mb-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Learning & Development Portal
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

        {/* Updated Statistics Cards with HR Ops Styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          
          {/* Total Resources */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Resources</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.total}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>From HR Tag</span>
                <span className="text-gray-600 font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending: {loading ? '...' : stats.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${stats.total > 0 ? Math.min((stats.pending / stats.total) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Selected */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Selected</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.deployed}
                </p>
                <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Approved</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1">
                <span className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ready for Deployment</span>
                <span className="text-gray-900 font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.deployed}
                </span>
              </div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Rejected</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.rejected}
                </p>
                <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Not Suitable</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1">
                <span className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Decision</span>
                <span className="text-gray-900 font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.rejected}
                </span>
              </div>
            </div>
          </div>

          {/* Dropped */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Dropped</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.dropped}
                </p>
                <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Withdrawn</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1">
                <span className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Decision</span>
                <span className="text-gray-900 font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {loading ? '...' : stats.dropped}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Dashboard Cards */}
        <div className="max-h-[250px] mb-12">
          <div className="grid grid-cols-1 gap-6 h-full">
            {/* Candidate Management - Full Width */}
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl hover:bg-blue-50 transition-all duration-200 hover:border-blue-300 relative overflow-hidden flex flex-col"
              onClick={() => setShowCandidatesTable(true)}
            >
              {/* Top Blue Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              
              <div className="p-8 flex-1 flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200 flex-shrink-0">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Resources Training & Development Management
                      </h5>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Review, update resource status, and manage the training and deployment process
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {stats.total} Total Resources
                        </span>
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {stats.pending} Pending Review
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {stats.sentToDelivery} Sent to Delivery
                        </span>
                      </div>
                      <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                        <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Manage L&D Process</span>
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats Panel */}
                  <div className="text-right bg-gray-50 rounded-xl p-6 ml-8">
                    <div className="text-gray-600 text-sm mb-3 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>L&D Processing Stats</div>
                    <div className="grid grid-cols-2 gap-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deployed}</div>
                        <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Selected</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.rejected + stats.dropped}</div>
                        <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Rejected/Dropped</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.pending}</div>
                        <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.sentToDelivery}</div>
                        <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>To Delivery</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* L&D Candidates Table */}
        <LDCandidatesTable 
          isOpen={showCandidatesTable}
          onClose={() => {
            setShowCandidatesTable(false);
            fetchStats(); // Refresh stats when closing
          }}
        />
      </div>
    </div>
  );
};

export default LDDashboard;