import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Link, Building, Plus, CheckCircle, AlertCircle, Users, Monitor, CreditCard, XCircle } from 'lucide-react';
import ITCandidatesTable from './ITCandidatesTable';
import ITRejectedCandidatesTable from './ITRejectedCandidatesTabl';

const ITDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [showCandidatesTable, setShowCandidatesTable] = useState(false);
  const [showRejectedCandidatesTable, setShowRejectedCandidatesTable] = useState(false); // NEW STATE
  const [stats, setStats] = useState({
    overview: {
      total: 0,
      withOfficeEmail: 0,
      withoutOfficeEmail: 0,
      thisMonth: 0,
      today: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    checkServerConnection();
    fetchStats();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/', {
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
      const response = await fetch('http://localhost:3000/api/it/stats', {
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
    <div className="flex items-center gap-2 text-sm">
      {serverStatus === 'checking' && (
        <>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-gray-600">Checking server...</span>
        </>
      )}
      {serverStatus === 'connected' && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Server Connected</span>
        </>
      )}
      {serverStatus === 'disconnected' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Server Disconnected</span>
          <button 
            onClick={checkServerConnection}
            className="text-red-600 hover:text-red-700 underline ml-1"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                  <Monitor className="w-8 h-8" />
                  IT Team Dashboard
                </h1>
                <p className="text-gray-600">Welcome back, {userData.name}!</p>
                <ServerStatusIndicator />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleLogout}
                  className="bg-red-700 hover:bg-gray-50 hover:text-black text-white border font-semibold border-gray-300 px-6 py-3 rounded-lg transition-all duration-200 shadow-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards - IT Specific (3 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Total Candidates */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Candidates</p>
                <p className="text-3xl font-bold">{loading ? '...' : stats.overview.total}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-blue-100">From HR Tag</span>
              <span className="text-blue-100">This Month: {stats.overview.thisMonth}</span>
            </div>
          </div>

          {/* Email Assignment Status - Combined Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm font-medium">Email Assignment</p>
                <p className="text-2xl font-bold">{loading ? '...' : stats.overview.total}</p>
                <p className="text-blue-100 text-xs">Total Candidates</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                <span className="text-green-100 text-sm">Assigned</span>
                <span className="text-white font-semibold">{stats.overview.withOfficeEmail}</span>
              </div>
              <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                <span className="text-yellow-100 text-sm">Pending</span>
                <span className="text-white font-semibold">{stats.overview.withoutOfficeEmail}</span>
              </div>
            </div>
          </div>

          {/* L&D Processed Status */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm font-medium">L&D Processed</p>
                <p className="text-3xl font-bold">{loading ? '...' : Math.floor(stats.overview.total * 0.8)}</p>
                <p className="text-blue-100 text-xs">Ready for Review</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-100">Selected: {Math.floor(stats.overview.total * 0.6)}</span>
                <span className="text-blue-100">Rejected: {Math.floor(stats.overview.total * 0.2)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `75%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Cards - Only 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Management */}
          <div 
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setShowCandidatesTable(true)}
          >
            <div className="text-center">
              <Mail className="w-12 h-12 text-white mb-4 mx-auto" />
              <h5 className="text-xl font-semibold text-white mb-3">Candidate Email Management</h5>
              <p className="text-blue-100 mb-4">Assign office email accounts to candidates</p>
              <div className="flex justify-center gap-2">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {stats.overview.withOfficeEmail} Assigned
                </span>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {stats.overview.withoutOfficeEmail} Pending
                </span>
              </div>
            </div>
          </div>

          {/* Selected/Rejected/Dropped Candidates */}
          <div 
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setShowRejectedCandidatesTable(true)}
          >
            <div className="text-center">
              <XCircle className="w-12 h-12 text-white mb-4 mx-auto" />
              <h5 className="text-xl font-semibold text-white mb-3">Selected/Rejected/Dropped Candidates</h5>
              <p className="text-blue-100 mb-4">View candidates processed by L&D team</p>
              <div className="mt-4">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Click to view L&D decisions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Management Table Modal */}
        <ITCandidatesTable 
          isOpen={showCandidatesTable} 
          onClose={() => {
            setShowCandidatesTable(false);
            fetchStats();
          }}
          onEmailAssigned={fetchStats}
        />

        {/* NEW: Selected/Rejected/Dropped Candidates Table Modal */}
        <ITRejectedCandidatesTable 
          isOpen={showRejectedCandidatesTable}
          onClose={() => setShowRejectedCandidatesTable(false)}
        />
      </div>
    </div>
  );
};

export default ITDashboard;