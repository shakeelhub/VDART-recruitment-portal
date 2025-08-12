import React, { useState, useEffect } from 'react';
import { Users, XCircle, CheckCircle, AlertCircle, User, Award, Mail, CreditCard } from 'lucide-react';
import AdminCandidatesTable from './AdminCandidatesTable';
import AdminRejectedCandidatesTable from './AdminRejectedCandidates';

const AdminDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const [showCandidatesTable, setShowCandidatesTable] = useState(false);
  const [showRejectedCandidatesTable, setShowRejectedCandidatesTable] = useState(false);
  const [stats, setStats] = useState({
    overview: {
      total: 0,
      deployed: 0,
      rejected: 0,
      dropped: 0,
      complete: 0,
      thisMonth: 0,
      today: 0,
      sentToDelivery: 0
    },
    allocation: {
      pendingAllocation: 0,
      allocated: 0,
      onHold: 0,
      completed: 0
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
      const response = await fetch('http://192.168.6.185:3000/api/admin/stats', {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">

        {/* Header */}
        <div className="mb-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 text-sm">L&D Candidate Processing & Management.</p>
                <p className="text-gray-500 text-xs mt-1">Welcome back, {userData.name}!</p>
                <div className="mt-2">
                  <ServerStatusIndicator />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards Row - 4 Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {/* Total L&D Processed */}
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-xl p-5 h-32 flex items-center justify-between text-white">
            <div>
              <p className="text-white text-sm font-bold mb-2">Total L&D Processed</p>
              <p className="text-2xl font-bold text-white mb-1">
                {loading ? '...' : (stats.overview.deployed + stats.overview.rejected + stats.overview.dropped)}
              </p>
              <p className="text-white text-xs font-semibold">From HR Tag</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Selected Candidates */}
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-xl p-5 h-32 flex items-center justify-between text-white">
            <div>
              <p className="text-white text-sm font-bold mb-2">Selected</p>
              <p className="text-2xl font-bold text-white mb-1">{loading ? '...' : stats.overview.deployed}</p>
              <p className="text-white text-xs font-semibold">Ready for Deployment</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Rejected Candidates */}
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-xl p-5 h-32 flex items-center justify-between text-white">
            <div>
              <p className="text-white text-sm font-bold mb-2">Rejected</p>
              <p className="text-2xl font-bold text-white mb-1">{loading ? '...' : stats.overview.rejected}</p>
              <p className="text-white text-xs font-semibold">Not Suitable</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Dropped Candidates */}
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-xl p-5 h-32 flex items-center justify-between text-white">
            <div>
              <p className="text-white text-sm font-bold mb-2">Dropped</p>
              <p className="text-2xl font-bold text-white mb-1">{loading ? '...' : stats.overview.dropped}</p>
              <p className="text-white text-xs font-semibold">Withdrawn</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Perfect 2-Column Layout - Main Cards */}
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-400px)]">
          
          {/* Column 1: Candidate Management */}
          <div
            className="group bg-white rounded-xl shadow-2xl border border-gray-200 cursor-pointer hover:shadow-2xl hover:bg-blue-50 transition-all duration-300 hover:border-blue-400 relative overflow-hidden flex flex-col transform hover:scale-103"
            onClick={() => setShowCandidatesTable(true)}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 to-blue-400"></div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center space-x-4 w-full">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-2xl transition-all duration-300 flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-2xl font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                    Candidate Management
                  </h5>
                  <p className="text-gray-600 text-base mb-3 leading-relaxed">
                    View and manage all candidate information sent for admin review
                  </p>
                  <div className="bg-blue-100 text-blue-700 px-3 py-2 inline-block rounded-full text-sm font-medium">
                    Click to view all candidates
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Training Discontinued Profiles - EXACT REPLICA */}
          <div
            className="group bg-white rounded-xl shadow-2xl border border-gray-200 cursor-pointer hover:shadow-2xl hover:bg-red-50 transition-all duration-300 hover:border-red-400 relative overflow-hidden flex flex-col transform hover:scale-103"
            onClick={() => setShowRejectedCandidatesTable(true)}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center space-x-4 w-full">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:shadow-2xl transition-all duration-300 flex-shrink-0">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-2xl font-semibold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">
                    Training Discontinued Profiles
                  </h5>
                  <p className="text-gray-600 text-base mb-3 leading-relaxed">
                    View resources processed by L&D team with detailed status
                  </p>
                  <div className="bg-red-100 text-red-700 px-3 py-2 inline-block rounded-full text-sm font-medium">
                    {(stats.overview.rejected || 0) + (stats.overview.dropped || 0)} processed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Components */}
        <AdminCandidatesTable 
          isOpen={showCandidatesTable}
          onClose={() => {
            setShowCandidatesTable(false);
            fetchStats();
          }}
        />

        <AdminRejectedCandidatesTable 
          isOpen={showRejectedCandidatesTable}
          onClose={() => setShowRejectedCandidatesTable(false)}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;