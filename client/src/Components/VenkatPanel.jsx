import React, { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, ToggleLeft, ToggleRight, LogOut, AlertCircle,
  Eye, EyeOff, Shield, Users, Activity, Filter, Download, Search, Mail, Phone
} from 'lucide-react';

const VenkatPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Login credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New employee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    empId: '',
    password: '',
    name: '',
    team: 'L&D',
    email: '',
    mobileNumber: '', // ✅ NEW
    designation: '', // ✅ NEW
    isDeliveryManager: false,
    managerEmail: '',
    managerAppPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showManagerAppPassword, setShowManagerAppPassword] = useState(false);

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byTeam: {}
  });

  const API_URL = 'http://192.168.6.185:3000/api/venkat';
  const teams = ['L&D', 'Delivery', 'HR Tag', 'Admin', 'HR Ops', 'IT'];

  // ✅ NEW: Common designations for dropdown
  const commonDesignations = [
    'Delivery Manager',
    'Senior Delivery Manager',
    'Associate Delivery Manager',
    'Delivery Lead',
    'Project Manager',
    'Senior Project Manager',
    'Team Lead',
    'Manager',
    'Senior Manager'
  ];

  // Show message temporarily
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Clear form
  const clearForm = () => {
    setNewEmployee({
      empId: '',
      password: '',
      name: '',
      team: 'L&D',
      email: '',
      mobileNumber: '', // ✅ NEW
      designation: '', // ✅ NEW
      isDeliveryManager: false,
      managerEmail: '',
      managerAppPassword: ''
    });
    setShowNewPassword(false);
    setShowManagerAppPassword(false);
  };

  // Calculate stats
  useEffect(() => {
    const total = employees.length;
    const active = employees.filter(emp => emp.isActive).length;
    const inactive = total - active;

    const byTeam = {};
    teams.forEach(team => {
      byTeam[team] = employees.filter(emp => emp.team === team).length;
    });

    setStats({ total, active, inactive, byTeam });
  }, [employees]);

  // Check if delivery manager already exists
  const hasDeliveryManager = employees.some(emp => emp.team === 'Delivery' && emp.isDeliveryManager && emp.isActive);

  // ✅ NEW: Format mobile number
  const formatMobileNumber = (mobile) => {
    if (!mobile) return '-';
    // Format as XXX-XXX-XXXX
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return mobile;
  };

  // ✅ NEW: Validate mobile number
  const validateMobileNumber = (mobile) => {
    if (!mobile) return true; // Optional field
    const cleaned = mobile.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  // Venkat login
  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('venkatToken', data.token);
        setIsLoggedIn(true);
        setUsername('');
        setPassword('');
        setShowPassword(false);
        showMessage('success', 'Login successful');
        fetchEmployees();
      } else {
        showMessage('error', data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('venkatToken');
    setIsLoggedIn(false);
    setEmployees([]);
    showMessage('success', 'Logged out successfully');
  };

  // Fetch all employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venkatToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(data.employees);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        showMessage('error', data.error || 'Failed to fetch employees');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showMessage('error', 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Add new employee
  const handleAddEmployee = async () => {
    // Basic validation
    if (!newEmployee.empId || !newEmployee.password || !newEmployee.name || !newEmployee.email) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    // ✅ NEW: Mobile number validation
    if (newEmployee.mobileNumber && !validateMobileNumber(newEmployee.mobileNumber)) {
      showMessage('error', 'Mobile number must be 10 digits');
      return;
    }

    // ✅ NEW: Delivery manager validation - including new required fields
    if (newEmployee.team === 'Delivery' && newEmployee.isDeliveryManager) {
      if (!newEmployee.managerEmail || !newEmployee.managerAppPassword) {
        showMessage('error', 'Manager email and app password are required for delivery managers');
        return;
      }
      
      if (!newEmployee.designation) {
        showMessage('error', 'Designation is required for delivery managers');
        return;
      }
      
      if (!newEmployee.mobileNumber) {
        showMessage('error', 'Mobile number is required for delivery managers');
        return;
      }
      
      if (hasDeliveryManager) {
        showMessage('error', 'A delivery manager already exists. Please deactivate the current manager first.');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venkatToken')}`
        },
        body: JSON.stringify({
          ...newEmployee,
          // Clean mobile number (remove any formatting)
          mobileNumber: newEmployee.mobileNumber ? newEmployee.mobileNumber.replace(/\D/g, '') : ''
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('success', 'Employee added successfully!');
        clearForm();
        setShowAddForm(false);
        fetchEmployees();
      } else {
        showMessage('error', data.error || 'Failed to add employee');
      }
    } catch (err) {
      console.error('Add employee error:', err);
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle employee status
  const handleToggleStatus = async (empId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/employees/${empId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venkatToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('success', data.message);
        fetchEmployees();
      } else {
        showMessage('error', data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showMessage('error', 'Network error. Please try again.');
    }
  };

  // Delete employee
  const handleDelete = async (empId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/employees/${empId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venkatToken')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage('success', 'Employee deleted successfully');
        fetchEmployees();
      } else {
        showMessage('error', data.error || 'Failed to delete employee');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showMessage('error', 'Network error. Please try again.');
    }
  };

  // Export data to CSV
  const handleExport = () => {
    const csvContent = [
      ['Employee ID', 'Name', 'Email', 'Mobile', 'Designation', 'Team', 'Status', 'Can Send Email', 'Is Manager'], // ✅ Updated headers
      ...filteredEmployees.map(emp => [
        emp.empId,
        emp.name,
        emp.email,
        emp.mobileNumber || '',
        emp.designation || '',
        emp.team,
        emp.isActive ? 'Active' : 'Inactive',
        emp.canSendEmail ? 'Yes' : 'No',
        emp.isDeliveryManager ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showMessage('success', 'Employee data exported successfully');
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTeam = filterTeam === 'all' || emp.team === filterTeam;

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && emp.isActive) ||
      (filterStatus === 'inactive' && !emp.isActive);

    return matchesSearch && matchesTeam && matchesStatus;
  });

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Admin Panel</h2>
          <p className="text-gray-600 text-center mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>Secure access for administrators</p>

          {message.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <AlertCircle size={18} />
              <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="new-password"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {loading ? 'Authenticating...' : 'Login to Admin Panel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Admin Panel</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Employees</p>
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active</p>
                <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Inactive</p>
                <p className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.inactive}</p>
              </div>
              <Activity className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Delivery Manager</p>
                <p className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>{hasDeliveryManager ? '1' : '0'}</p>
              </div>
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <AlertCircle size={18} />
            <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{message.text}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <UserPlus size={18} />
              Add New Employee
            </button>

            <button
              onClick={handleExport}
              disabled={filteredEmployees.length === 0}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
            </div>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Add New Employee</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Employee ID *</label>
                <input
                  type="text"
                  placeholder="Enter employee ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newEmployee.empId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, empId: e.target.value })}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email *</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
              </div>

              {/* ✅ NEW: Mobile Number Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Mobile Number {newEmployee.isDeliveryManager && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newEmployee.mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 10) {
                        setNewEmployee({ ...newEmployee, mobileNumber: value });
                      }
                    }}
                    maxLength="10"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                {newEmployee.mobileNumber && !validateMobileNumber(newEmployee.mobileNumber) && (
                  <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile number must be 10 digits</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Team *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newEmployee.team}
                  onChange={(e) => setNewEmployee({ 
                    ...newEmployee, 
                    team: e.target.value, 
                    isDeliveryManager: false, 
                    managerEmail: '', 
                    managerAppPassword: '',
                    designation: '' // ✅ Clear designation when team changes
                  })}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Team Manager Options */}
              {newEmployee.team === 'Delivery' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Delivery Team Role</label>
                  <div className="flex gap-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryRole"
                        checked={!newEmployee.isDeliveryManager}
                        onChange={() => setNewEmployee({ 
                          ...newEmployee, 
                          isDeliveryManager: false, 
                          managerEmail: '', 
                          managerAppPassword: '',
                          designation: '' // ✅ Clear designation when not a manager
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Team Member</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryRole"
                        checked={newEmployee.isDeliveryManager}
                        onChange={() => setNewEmployee({ ...newEmployee, isDeliveryManager: true })}
                        className="mr-2"
                        disabled={hasDeliveryManager}
                      />
                      <span className={`text-sm ${hasDeliveryManager ? 'text-gray-400' : 'text-gray-700'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Manager {hasDeliveryManager ? '(Manager exists)' : ''}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ✅ FIXED: Designation Field - Only show for Delivery Managers */}
              {newEmployee.team === 'Delivery' && newEmployee.isDeliveryManager && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter designation (e.g., Delivery Manager, Senior Manager, etc.)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                  <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Enter the manager's official designation</p>
                </div>
              )}

              {/* Manager Email Configuration */}
              {newEmployee.team === 'Delivery' && newEmployee.isDeliveryManager && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Manager Email *</label>
                    <input
                      type="email"
                      placeholder="Enter manager's email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newEmployee.managerEmail}
                      onChange={(e) => setNewEmployee({ ...newEmployee, managerEmail: e.target.value })}
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>App Password *</label>
                    <div className="relative">
                      <input
                        type={showManagerAppPassword ? "text" : "password"}
                        placeholder="Enter app password"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newEmployee.managerAppPassword}
                        onChange={(e) => setNewEmployee({ ...newEmployee, managerAppPassword: e.target.value })}
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowManagerAppPassword(!showManagerAppPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showManagerAppPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Generate app password from Gmail settings</p>
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex gap-2 items-end">
                <button
                  onClick={handleAddEmployee}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {loading ? 'Adding...' : 'Add Employee'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    clearForm();
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Employee Directory ({filteredEmployees.length} results)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Mobile</th> {/* ✅ NEW */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Designation</th> {/* ✅ NEW */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email Permission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading employees...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {employees.length === 0 ? 'No employees found. Add one to get started!' : 'No employees match your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {emp.empId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{emp.name}</span>
                        {emp.isDeliveryManager && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Manager
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {emp.email}
                      </td>
                      {/* ✅ NEW: Mobile Number Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {formatMobileNumber(emp.mobileNumber)}
                      </td>
                      {/* ✅ NEW: Designation Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {emp.designation || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {emp.team}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          emp.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          emp.canSendEmail 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {emp.canSendEmail ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleStatus(emp.empId, emp.isActive)}
                            className={`${
                              emp.isActive 
                                ? 'text-orange-600 hover:text-orange-800' 
                                : 'text-green-600 hover:text-green-800'
                            } transition-colors`}
                            title={emp.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {emp.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button
                            onClick={() => handleDelete(emp.empId, emp.name)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenkatPanel;