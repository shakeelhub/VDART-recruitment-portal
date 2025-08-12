// DeliveryDashboard UI Updated with HR Ops Styling and Drill-down Stats
import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, CreditCard, Award,
  Package, Target, XCircle
} from 'lucide-react';
import DeliveryTable from './DeliveryTable';
import HROpsDeliveryTable from './HROpsDeliveryTable';
import DeploymentRecordsTable from './DeploymentRecordsTable';
import DeliveryRejectedCandidatesTable from './DeliveryRejectedCandidatesTable';

const DeliveryDashboard = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const [showDeliveryTable, setShowDeliveryTable] = useState(false);
  const [showHROpsDeliveryTable, setShowHROpsDeliveryTable] = useState(false);
  const [showDeploymentTable, setShowDeploymentTable] = useState(false);
  const [showRejectedCandidatesTable, setShowRejectedCandidatesTable] = useState(false);
  const [stats, setStats] = useState({
    trainingPipeline: {
      total: 0,
      sentToHRTag: 0,
      pendingHRTag: 0
    },
    readyToDeploy: {
      total: 0,
      deployed: 0,
      nonDeployed: 0
    },
    deploymentStatus: {
      total: 0,
      active: 0,
      inactive: 0,
      transfers: 0
    },
    resourcesFromLD: {
      total: 0,
      rejected: 0,
      dropped: 0
    }
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://192.168.6.185:3000/api/delivery/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setStats({
          trainingPipeline: data.stats.trainingPipeline || { total: 0, sentToHRTag: 0, pendingHRTag: 0 },
          readyToDeploy: data.stats.readyToDeploy || { total: 0, deployed: 0, nonDeployed: 0 },
          deploymentStatus: data.stats.deploymentStatus || { total: 0, active: 0, inactive: 0, transfers: 0 },
          resourcesFromLD: data.stats.resourcesFromLD || { total: 0, rejected: 0, dropped: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching Delivery stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="max-w-7xl mx-auto h-full flex flex-col">

        {/* Header */}
        <div className="mb-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Delivery Team Portal
                </h1>
                <p className="text-gray-600 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Candidate Allocation & Deployment Management.</p>
                <p className="text-gray-500 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Welcome back, {userData.name}!</p>
              </div>
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

        {/* Updated Stats Cards with HR Ops Styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          
          {/* Card 1: Training Pipeline */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Training Pipeline</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.trainingPipeline.total}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Freshers awaiting permanent ID</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.trainingPipeline.total}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sent to HR Tag</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.trainingPipeline.sentToHRTag}</span>
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pending HR Tag</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.trainingPipeline.pendingHRTag}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Ready to Deploy */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ready to Deploy</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.readyToDeploy.total}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Final deployment ready</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.readyToDeploy.total}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 watery-dot"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Deployed</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.readyToDeploy.deployed}</span>
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 watery-dot-orange"></div>
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Non-Deployed</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.readyToDeploy.nonDeployed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Deployment Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Deployment Status</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deploymentStatus.total}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Deployments</span>
                <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deploymentStatus.total}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-2 mt-1">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deploymentStatus.active}</p>
                    <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deploymentStatus.transfers}</p>
                    <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Transfer</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.deploymentStatus.inactive}</p>
                    <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Inactive</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Resources from L&D */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resources from L&D</p>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.resourcesFromLD.total}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status Details</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center bg-white rounded-lg p-2">
                  <p className="text-sm font-semibold text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.resourcesFromLD.rejected}</p>
                  <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Rejected</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2">
                  <p className="text-sm font-semibold text-orange-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.resourcesFromLD.dropped}</p>
                  <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Dropped</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Perfect 4-Column Aligned Layout - Main Cards */}
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-400px)]">
          
          {/* Column 1: Training Pipeline */}
          <div className="flex flex-col">
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowDeliveryTable(true)}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <Package className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Training-Cleared Resources
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Trained resources cleared for delivery onboarding
                </p>
                
                <div className="flex items-center justify-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View All Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Ready to Deploy */}
          <div className="flex flex-col">
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowHROpsDeliveryTable(true)}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Ready-to-Deploy Resources
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Trigger deployment emails for final resource allocation
                </p>
                
                <div className="flex items-center justify-center text-green-600 text-sm font-medium group-hover:text-green-700">
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>View All Resources</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Deployment Status */}
          <div className="flex flex-col">
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowDeploymentTable(true)}
            >
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
          </div>

          {/* Column 4: Resources from L&D */}
          <div className="flex flex-col">
            <div
              className="group bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
              onClick={() => setShowRejectedCandidatesTable(true)}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 mb-4">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                
                <h5 className="text-lg font-semibold text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Training Discontinued Profiles
                </h5>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  View resources processed by L&D team with detailed status
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
        <DeliveryTable 
          isOpen={showDeliveryTable} 
          onClose={() => {
            setShowDeliveryTable(false);
            fetchStats();
          }}
        />

        <HROpsDeliveryTable 
          isOpen={showHROpsDeliveryTable} 
          onClose={() => {
            setShowHROpsDeliveryTable(false);
            fetchStats();
          }}
        />

        <DeploymentRecordsTable 
          isOpen={showDeploymentTable} 
          onClose={() => {
            setShowDeploymentTable(false);
            fetchStats();
          }}
        />

        <DeliveryRejectedCandidatesTable 
          isOpen={showRejectedCandidatesTable} 
          onClose={() => {
            setShowRejectedCandidatesTable(false);
            fetchStats();
          }}
        />
      </div>
    </div>
  );
};

export default DeliveryDashboard;