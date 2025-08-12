import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, FileText, Users, Search, Clock, CheckCircle, Star, Briefcase, Code, Palette, Target, TrendingUp, Filter, Bell, Award, Eye, EyeOff, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import VdartLogo from '../../public/vdart_logo.png'
import 'react-toastify/dist/ReactToastify.css';

export default function EnhancedLoginPage() {
  const [formData, setFormData] = useState({
    empId: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Dynamic data states for animated numbers
  const [stats, setStats] = useState({
    newApplications: 0,
    notifications: 0,
    hiringRate: 0,
    activeSearches: 0,
    weeklyHired: 0,
    weeklyInterviews: 0,
    pipelineScreening: 0,
    pipelineFinal: 0,
    candidateRating: 0
  });

  // Carousel state
  const [currentScene, setCurrentScene] = useState(0);
  const scenes = [
    { id: 0, name: "recruitment" },
    { id: 1, name: "performance" },
    { id: 2, name: "analytics" }
  ];

  // Animate numbers on component mount
  useEffect(() => {
    const targets = {
      newApplications: 24,
      notifications: 7,
      hiringRate: 73,
      activeSearches: 18,
      weeklyHired: 5,
      weeklyInterviews: 23,
      pipelineScreening: 12,
      pipelineFinal: 3,
      candidateRating: 5.0
    };

    const animateValue = (key, target, duration = 2000, delay = 0) => {
      setTimeout(() => {
        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentValue = key === 'candidateRating'
            ? Number((startValue + (target - startValue) * easeOut).toFixed(1))
            : Math.floor(startValue + (target - startValue) * easeOut);

          setStats(prev => ({ ...prev, [key]: currentValue }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      }, delay);
    };

    // Animate each stat with staggered delays
    Object.entries(targets).forEach(([key, value], index) => {
      animateValue(key, value, 1500, index * 200);
    });
  }, []);

  // Carousel auto-rotation
  useEffect(() => {
    if (showLoader || showSuccess) return; // Stop carousel when loading

    const interval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % scenes.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [scenes.length, showLoader, showSuccess]);

  // ADD: Global Enter key handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [formData, isLoading]); // Dependencies ensure latest form data is used

  const validateForm = () => {
    const newErrors = {};

    if (!formData.empId.trim()) {
      newErrors.empId = 'Employee ID is required';
    } else if (formData.empId.length < 3) {
      newErrors.empId = 'Employee ID must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly!', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);
    setShowLoader(true);

    try {
      const response = await fetch('http://192.168.6.185:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empId: formData.empId.trim(),
          password: formData.password
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.employee));

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        // Start progress animation
        setProgress(0);
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              // After progress completes, show success animation
              setTimeout(() => {
                setShowSuccess(true);

                // Wait for success animation to complete, then navigate
                setTimeout(() => {
                  navigate('/dashboard');
                }, 1000);
              }, 100);
              return 100;
            }
            return prev + 2; // Increment by 2% every 20ms = 100% in 1 second
          });
        }, 20);

      } else {
        toast.error(data.message || 'Login failed', {
          position: "top-right",
          autoClose: 4000,
        });
        setIsLoading(false);
        setShowLoader(false);
        setShowSuccess(false);
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please check if server is running.', {
        position: "top-right",
        autoClose: 4000,
      });
      setIsLoading(false);
      setShowLoader(false);
      setShowSuccess(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // ADD: Individual input Enter key handlers (alternative approach)
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check for saved login on component mount
  React.useEffect(() => {
    const isRemembered = localStorage.getItem('rememberMe');
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (isRemembered === 'true' && authToken && userData) {
      toast.info('Welcome back! Redirecting to dashboard...', {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
    }
  }, [navigate]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Loading Screen Overlay */}
      {showLoader && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative">
              {/* Animated progress circle */}
              <div className="w-32 h-32 mx-auto mb-8 relative">
                {!showSuccess && (
                  <>
                    {/* Background circle */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>

                    {/* Progress circle */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={377} // 2 * π * 60 ≈ 377
                        strokeDashoffset={377 - (377 * progress) / 100}
                        className="transition-all duration-75 ease-out"
                      />
                    </svg>

                    {/* Progress percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{Math.round(progress)}%</span>
                    </div>
                  </>
                )}

                {/* Success checkmark */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${showSuccess ? 'opacity-100' : 'opacity-0'
                  }`}>
                  <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center transform transition-transform duration-700 ease-out ${showSuccess ? 'rotateY-0' : 'rotateY-180'
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: showSuccess ? 'rotateY(0deg)' : 'rotateY(180deg)'
                    }}>
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* Loading text */}
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {showSuccess ? 'Login Successful!' : 'Signing you in...'}
                </h2>
                <p className="text-blue-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {showSuccess ? 'Redirecting to dashboard' : 'Please wait while we verify your credentials'}
                </p>
              </div>

              {/* Progress dots */}
              {!showSuccess && (
                <div className="flex justify-center space-x-2 mt-6">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Side - 55% width */}
      <div className="w-[55%] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden flex flex-col">

        {/* Top Section - 25% height - Header */}
        <div className="h-[25%] flex items-center justify-center px-8 relative z-10">
          <div className="text-center">
            <h1
              className="text-white text-4xl font-bold mb-3 tracking-wide"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              VDart Resource Management Tool
            </h1>
            <p
              className="text-blue-100 text-sm font-light leading-relaxed max-w-2xl"
               style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Intelligent Talent Acquisition Platform for VDart            </p>
          </div>
        </div>

        {/* Bottom Section - 75% height - Carousel of Scenes */}
        <div className="h-[75%] relative overflow-hidden flex flex-col -mt-4">

          {/* Carousel Container */}
          <div className="flex-1 relative">

            {/* Scene 1 - Recruitment Focus */}
            <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${currentScene === 0 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}>
              <div className="h-full flex items-center justify-center px-8">

                {/* Main recruitment card - center */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-56 h-44 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-2">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>Recruitment Consultant</h3>
                      <p className="text-blue-200 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Full-time Position</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active Hiring</span>
                    <span className="text-white text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.newApplications}</span>
                  </div>
                </div>

                {/* Secondary card - top left */}
                <div className="absolute top-12 left-16 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-36 h-25 shadow-lg transform -rotate-12 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-orange-500/40 rounded-lg p-1">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Applications</span>
                  </div>
                  <div className="text-white text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.newApplications}</div>
                  <div className="text-orange-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>This week</div>
                </div>

                {/* Tertiary card - bottom right */}
                <div className="absolute bottom-16 right-20 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-32 h-20 shadow-lg transform rotate-12 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-green-500/40 rounded-lg p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Success</span>
                  </div>
                  <div className="text-white text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.hiringRate}%</div>
                </div>

                {/* Small accent card - top right */}
                <div className="absolute top-20 right-12 bg-white/10 backdrop-blur-sm rounded-lg p-2 w-24 h-16 shadow-lg transform rotate-6 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-1 mb-1">
                    <Bell className="w-3 h-3 text-white" />
                    <span className="text-white text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Alerts</span>
                  </div>
                  <div className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.notifications}</div>
                </div>

                {/* NEW - Additional card - bottom left */}
                <div className="absolute bottom-8 left-8 bg-white/15 backdrop-blur-sm rounded-xl p-3 w-28 h-22 shadow-lg transform -rotate-8 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="bg-cyan-500/40 rounded p-1">
                      <Search className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active</span>
                  </div>
                  <div className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.activeSearches}</div>
                  <div className="text-cyan-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Positions</div>
                </div>

              </div>
            </div>

            {/* Scene 2 - Performance Focus */}
            <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${currentScene === 1 ? 'translate-x-0 opacity-100' : currentScene > 1 ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'
              }`}>
              <div className="h-full flex items-center justify-center px-8">

                {/* Main performance card - center */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-52 h-52 shadow-2xl transform -rotate-2 hover:rotate-0 transition-all duration-500 relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-2">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>Performance Analytics</h3>
                      <p className="text-emerald-200 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Real-time insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="text-white text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.hiringRate}%</div>
                      <div className="text-emerald-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Success Rate</div>
                    </div>
                    <div>
                      <div className="text-white text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.candidateRating}</div>
                      <div className="text-emerald-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Avg Rating</div>
                    </div>
                  </div>
                </div>

                {/* Weekly stats - top left */}
                <div className="absolute top-8 left-12 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-40 h-27 shadow-lg transform rotate-8 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/40 rounded-lg p-1">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>This Week</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif' }}>Hired</span>
                      <span className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.weeklyHired}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif' }}>Interviews</span>
                      <span className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.weeklyInterviews}</span>
                    </div>
                  </div>
                </div>

                {/* Pipeline card - bottom left */}
                <div className="absolute bottom-12 left-16 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-36 h-24 shadow-lg transform -rotate-8 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-indigo-500/40 rounded-lg p-1">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pipeline</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active: {stats.pipelineScreening}</span>
                  </div>
                </div>

                {/* Quality indicator - top right */}
                <div className="absolute top-16 right-16 bg-white/10 backdrop-blur-sm rounded-lg p-3 w-28 h-20 shadow-lg transform -rotate-6 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-white text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Quality</span>
                  </div>
                  <div className="text-white text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>94%</div>
                </div>

                {/* NEW - Additional card - bottom right */}
                <div className="absolute bottom-8 right-8 bg-white/15 backdrop-blur-sm rounded-xl p-3 w-32 h-20 shadow-lg transform rotate-10 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-rose-500/40 rounded p-1">
                      <Calendar className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Scheduled</span>
                  </div>
                  <div className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>8</div>
                  <div className="text-rose-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Interviews</div>
                </div>

              </div>
            </div>

            {/* Scene 3 - Analytics Focus */}
            <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${currentScene === 2 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}>
              <div className="h-full flex items-center justify-center px-8">

                {/* Main analytics card - center */}
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-60 h-52 shadow-2xl transform rotate-1 hover:rotate-0 transition-all duration-500 relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-2">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>Recruitment Insights</h3>
                      <p className="text-cyan-200 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Data-driven insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.activeSearches}</div>
                      <div className="text-cyan-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Active Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.notifications}</div>
                      <div className="text-cyan-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Notifications</div>
                    </div>
                  </div>
                </div>

                {/* Skills card - left */}
                <div className="absolute top-20 left-8 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-47 h-24 shadow-lg transform -rotate-6 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-yellow-500/40 rounded-lg p-1">
                      <Code className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Top Skills</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="bg-white/30 text-white text-xs px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>React</span>
                    <span className="bg-white/30 text-white text-xs px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>Python</span>
                    <span className="bg-white/30 text-white text-xs px-2 py-1 rounded" style={{ fontFamily: 'Montserrat, sans-serif' }}>AWS</span>
                  </div>
                </div>

                {/* Schedule card - bottom right */}
                <div className="absolute bottom-8 right-8 bg-white/15 backdrop-blur-sm rounded-xl p-4 w-40 h-28 shadow-lg transform rotate-8 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-rose-500/40 rounded-lg p-1">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Today</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>10:00 - Technical</div>
                    <div className="text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>14:00 - Manager</div>
                    <div className="text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>16:30 - Final</div>
                  </div>
                </div>

                {/* Time indicator - top right */}
                <div className="absolute top-12 right-20 bg-white/10 backdrop-blur-sm rounded-lg p-2 w-24 h-16 shadow-lg transform rotate-4 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-white" />
                    <span className="text-white text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>Avg Time</span>
                  </div>
                  <div className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>4.2d</div>
                </div>

                {/* NEW - Additional card - bottom left */}
                <div className="absolute bottom-16 left-16 bg-white/15 backdrop-blur-sm rounded-xl p-3 w-36 h-22 shadow-lg transform -rotate-10 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-emerald-500/40 rounded p-1">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Completed</span>
                  </div>
                  <div className="text-white text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{stats.weeklyHired}</div>
                  <div className="text-emerald-200 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>This week</div>
                </div>

              </div>
            </div>

          </div>

          {/* Scene Indicators and Title */}
          <div className="h-20 flex flex-col items-center justify-center gap-3">
            <div className="text-center">
              <h3 className="text-white text-xl font-semibold mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentScene === 0 && "Simplify Talent Acquisition"}
                {currentScene === 1 && "Measure Recruiter Effectiveness"}
                {currentScene === 2 && "Drive Smarter Hiring Decisions"}
              </h3>
              <p className="text-blue-200 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {currentScene === 0 && "Automate workflows and engage top talent faster"}
                {currentScene === 1 && "Analyze hiring cycles and recruiter productivity"}
                {currentScene === 2 && "Leverage insights to improve candidate quality"}
              </p>

            </div>

            {/* 3 Dots Indicator */}
            <div className="flex space-x-2">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => setCurrentScene(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${currentScene === index
                    ? 'bg-white scale-125'
                    : 'bg-white/40 hover:bg-white/60'
                    }`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Right Side - 45% width - Login Form */}
      <div className="w-[45%] bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="mb-4">
                <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto flex items-center justify-center">
                  <img src={VdartLogo} alt="" className='h-8 w-8' />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Hello Again !</h2>
              <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Welcome back to VDart recruitment portal
              </p>
            </div>

            <div className="space-y-4">
              <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Employee ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="empId"
                    value={formData.empId}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyPress}
                    className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 transition-all duration-200 ${errors.empId ? 'border-red-400 ring-2 ring-red-400/50' : 'border-gray-200'
                      }`}
                    placeholder="Enter your Employee ID"
                    autoComplete="username"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                </div>
                {errors.empId && (
                  <div className="mt-1 flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.empId}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyPress}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 transition-all duration-200 ${errors.password ? 'border-red-400 ring-2 ring-red-400/50' : 'border-gray-200'
                      }`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="mt-1 flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span style={{ fontFamily: 'Montserrat, sans-serif' }}>{errors.password}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200"
                  />
                  <span className="ml-2 text-sm text-gray-600 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Remember me</span>
                </label>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Forgot Password?
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="relative overflow-hidden group w-full bg-blue-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98] shimmer-hover"
              >
                <div className="relative z-10 flex items-center space-x-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Login</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: 'rgba(30, 58, 138, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          borderRadius: '12px',
          fontFamily: 'Montserrat, sans-serif'
        }}
      />
    </div>
  );
}