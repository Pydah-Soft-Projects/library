import React, { useState } from 'react';
import { 
  BookOpen, Lock, Mail, Key, Shield, ArrowRight, 
  CheckCircle2, AlertCircle, Sparkles, User, RefreshCw, Eye, EyeOff,
  UserPlus, LogIn, Phone, GraduationCap, Building2, IdCard, Hash, Check,
  Printer, Download, QrCode, ArrowLeft
} from 'lucide-react';

const DEMO_PERSONAS = [
  {
    roleId: 'student_good',
    title: 'Student (Priya)',
    badge: 'Good Standing',
    email: 'priya.cs23@college.edu.in',
    password: 'student123',
    roll: 'STU-2023-CS042',
    desc: '3rd Year B.Tech CSE',
    color: 'emerald'
  },
  {
    roleId: 'student_overdue',
    title: 'Student (Rahul)',
    badge: '⚠️ 5d Overdue',
    email: 'rahul.me24@college.edu.in',
    password: 'student123',
    roll: 'STU-2024-ME019',
    desc: '2nd Year B.Tech Mech',
    color: 'rose'
  },
  {
    roleId: 'staff',
    title: 'Front-Desk Staff',
    badge: 'Circulation Desk',
    email: 'desk.staff@collegelibrary.in',
    password: 'staff123',
    roll: 'STAFF-DESK-03',
    desc: 'Ramesh Kumar (Desk)',
    color: 'blue'
  },
  {
    roleId: 'librarian',
    title: 'Chief Librarian',
    badge: 'Catalog & NAAC',
    email: 'librarian@collegelibrary.in',
    password: 'lib123',
    roll: 'LIB-HEAD-01',
    desc: 'Dr. K. Radhakrishnan',
    color: 'purple'
  },
  {
    roleId: 'admin',
    title: 'Superadmin',
    badge: 'Sovereign Console',
    email: 'admin@collegelibrary.in',
    password: 'admin123',
    roll: 'ADMIN-SYS-01',
    desc: 'Dr. A.K. Sharma',
    color: 'amber'
  }
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Mechanical Engineering',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Civil Engineering',
  'Information Technology',
  'Master of Business Admin (MBA)',
  'Applied Sciences & Humanities'
];

export default function LoginView({ onLoginSuccess, onToast }) {
  // Auth mode: 'login' | 'register' | 'reset'
  const [authMode, setAuthMode] = useState('login');

  // Sign In States
  const [identifier, setIdentifier] = useState('priya.cs23@college.edu.in');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(DEMO_PERSONAS[0]);

  // New Member Registration States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regDepartment, setRegDepartment] = useState(DEPARTMENTS[0]);
  const [regRole, setRegRole] = useState('Student');
  const [regPhone, setRegPhone] = useState('');
  const [regPatronId, setRegPatronId] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Password Reset States
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Welcome Pass Modal State
  const [welcomeModalData, setWelcomeModalData] = useState(null);

  // Common Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Quick-Fill Persona
  const handlePersonaSelect = (persona) => {
    setSelectedPersona(persona);
    setIdentifier(persona.email);
    setPassword(persona.password);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Helper to generate unique patron roll ID
  const handleGenerateId = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = regRole === 'Faculty' ? 'FAC' : 'STU';
    const year = new Date().getFullYear();
    const newId = `${prefix}-${year}-${randomCode}`;
    setRegPatronId(newId);
    if (onToast) onToast(`Generated Institutional Patron ID: ${newId}`, 'info');
  };

  // 1. Submit Sign In
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        if (onToast) onToast(data.error || 'Authentication failed', 'danger');
        return;
      }

      // Success: Save token & pass to app
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setErrorMessage(`Cannot connect to library auth server (${err.message}). Ensure port 5000 is running.`);
      if (onToast) onToast('Failed to reach backend API', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit New Member Registration
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regFullName.trim()) {
      setErrorMessage('Please enter your full official name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Please enter a valid university email address.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must acknowledge institutional library terms.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          department: regDepartment,
          role: regRole,
          phone: regPhone.trim() || '+91 98450 00000',
          patron_id: regPatronId.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Registration failed. Please check form details.');
        if (onToast) onToast(data.error || 'Registration failed', 'danger');
        return;
      }

      if (onToast) onToast(`Registration complete! Welcome, ${data.user.full_name}`, 'success');

      // Open Instant Welcome Pass Modal with verified server token and user
      setWelcomeModalData({
        token: data.token,
        user: data.user
      });

    } catch (err) {
      setErrorMessage(`Network error during registration: ${err.message}.`);
      if (onToast) onToast('Cannot connect to registration API', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit Password Reset
  const handleResetSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetIdentifier.trim()) {
      setErrorMessage('Please enter your Institutional Email or Roll Number.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed. Account not found.');
      }

      setSuccessMessage(data.message || 'Password updated successfully! You can now log in.');
      if (onToast) onToast('Password reset successful! Please sign in.', 'success');

      // Pre-fill login identifier and switch to login
      setIdentifier(resetIdentifier.trim());
      setPassword(newPassword);
      setTimeout(() => {
        setAuthMode('login');
      }, 1200);

    } catch (err) {
      setErrorMessage(err.message);
      if (onToast) onToast(err.message, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl w-full z-10 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Institutional Banner */}
        <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Institutional SSO • JWT Verified</span>
          </div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-4 mx-auto lg:mx-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-white leading-tight">
              Central Campus <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                Library Portal
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed">
              Official university portal for students, scholars, faculty, and desk operations. Complete access to online book catalog, loan countdowns, and automated returns.
            </p>
          </div>

          {/* Real Benefits Bullet List */}
          <div className="space-y-2.5 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Digital Patron Pass with Unique Barcode</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Standard 30-Day Loan Period & +15 Day Renewals</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Self-Service Online Book Reservations & Hold Queues</span>
            </div>
          </div>

          {/* Server Connection Badge */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Backend Server: Node.js Express API (Port 5000)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Auth Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 border border-slate-200">
          {/* Auth Mode Switcher Tabs */}
          {authMode !== 'reset' ? (
            <div className="flex rounded-2xl bg-slate-100 p-1.5 mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  authMode === 'login'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                  if (!regPatronId) handleGenerateId();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  authMode === 'register'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>New Member Registration</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </button>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Recovery</span>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: SIGN IN MODE */}
          {/* ============================================================ */}
          {authMode === 'login' && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-heading font-extrabold text-xl text-slate-900">
                    Sign In to Portal
                  </h2>
                  <span className="text-xs text-slate-500">
                    Enter institutional email or student roll number
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  JWT v2.4
                </span>
              </div>

              {/* Quick-Fill Role Personas */}
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Demo Persona (1-Click Auto-Fill):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_PERSONAS.map(p => {
                    const isSelected = selectedPersona.roleId === p.roleId;
                    return (
                      <button
                        key={p.roleId}
                        type="button"
                        onClick={() => handlePersonaSelect(p)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-400'
                            : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {p.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Institutional Email or Student Roll ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. priya.cs23@college.edu.in or STU-2023-CS042"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setResetIdentifier(identifier);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter security password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember 24h JWT Session</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      if (!regPatronId) handleGenerateId();
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Register as New Member →
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Sign In with JWT Session</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: NEW MEMBER REGISTRATION MODE */}
          {/* ============================================================ */}
          {authMode === 'register' && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-heading font-extrabold text-xl text-slate-900">
                    New Member Registration
                  </h2>
                  <span className="text-xs text-slate-500">
                    Create your university library account & digital pass
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Instant Activation
                </span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3">
                {/* Full Name & Institutional Email */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Official Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      College / University Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. vikram.cs25@college.edu.in"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Academic Role */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Security Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Academic Membership Role
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      >
                        <option value="Student">Student (4 Books, 30-Day Loan)</option>
                        <option value="Faculty">Faculty / Scholar (10 Books, 60-Day Loan)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Roll Number / Patron ID with Auto-Generate Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Student Roll Number / Patron ID
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateId}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>Auto-Generate Unique ID</span>
                    </button>
                  </div>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={regPatronId}
                      onChange={(e) => setRegPatronId(e.target.value)}
                      placeholder="e.g. STU-2024-4102 or enter your University Roll No"
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter your university roll number or use the auto-generated unique institutional patron barcode.
                  </p>
                </div>

                {/* Department & Contact Phone */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Academic Department
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98450 12345"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I agree to the Institutional Library Circulation Policy (30-day return window, standard ₹5/day overdue penalty, and cardholder responsibility).
                    </span>
                  </label>
                </div>

                {/* Submit Registration Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account & Issuing Pass...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration & Issue Digital Pass</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Back to Login prompt */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage('');
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Already have an institutional account? Sign In here →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: SELF-SERVICE PASSWORD RESET MODE */}
          {/* ============================================================ */}
          {authMode === 'reset' && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-heading font-extrabold text-xl text-slate-900">
                    Reset Security Password
                  </h2>
                  <span className="text-xs text-slate-500">
                    Verify account and choose a new security password
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Instant Recovery
                </span>
              </div>

              <form onSubmit={handleResetSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Institutional Email or Student Roll ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="e.g. priya.cs23@college.edu.in or STU-2023-CS042"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Reset Password & Return to Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* INSTANT WELCOME & DOWNLOADABLE DIGITAL PASS MODAL */}
      {/* ============================================================ */}
      {welcomeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-in zoom-in-95 duration-200 text-slate-900">
            {/* Modal Header */}
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-extrabold text-slate-900">
                Welcome to Central Campus Library!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your university library account is active. Here is your official Digital Patron Pass.
              </p>
            </div>

            {/* Visual Digital Library Pass Card */}
            <div className="mt-5 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-blue-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span className="font-heading font-extrabold text-sm tracking-wide">CAMPUS LIBRARY PASS</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ACTIVE PATRON
                </span>
              </div>

              <div className="py-4 grid grid-cols-3 gap-3 items-center">
                <div className="w-16 h-16 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-extrabold text-2xl">
                  {welcomeModalData.user.full_name.charAt(0)}
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="font-heading font-extrabold text-base text-white">
                    {welcomeModalData.user.full_name}
                  </div>
                  <div className="text-xs font-mono text-cyan-300 font-bold">
                    ID: {welcomeModalData.user.patron_id}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Dept: {welcomeModalData.user.department}
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    Borrowing Quota: 4 Books • 30-Day Loan Period
                  </div>
                </div>
              </div>

              {/* Barcode Simulation */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="font-mono text-[9px] tracking-widest text-slate-400">
                  ||| | |||| | || ||||| ||| ||||
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ISSUE: {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print / Save Pass</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const { token, user } = welcomeModalData;
                  setWelcomeModalData(null);
                  onLoginSuccess(token, user);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
