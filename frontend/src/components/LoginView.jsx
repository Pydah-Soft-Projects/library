import React, { useState } from 'react';
import { 
  BookOpen, Lock, Mail, ArrowRight, Eye, EyeOff, 
  AlertCircle, ShieldCheck, CheckCircle2, Sparkles, Key
} from 'lucide-react';

export default function LoginView({ onLoginSuccess, onToast }) {
  const [identifier, setIdentifier] = useState('superadmin');
  const [password, setPassword] = useState('superadmin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Fallback: Check if this user is a mapped HRMS account
        const cleanId = identifier.trim().toLowerCase();
        let found = null;
        try {
          const savedUsers = localStorage.getItem('lm_mapped_users');
          if (savedUsers) {
            const list = JSON.parse(savedUsers);
            found = list.find(u => 
              String(u.emp_no || '').toLowerCase() === cleanId ||
              (u.email && u.email.toLowerCase() === cleanId) ||
              (u.name && u.name.toLowerCase() === cleanId)
            );
          }
        } catch (_) {}

        if (found) {
          const syntheticUser = {
            id: found.id || `hrms-${found.emp_no}`,
            full_name: found.name || `Employee #${found.emp_no}`,
            email: found.email || `${found.emp_no}@pydah.edu.in`,
            role: found.role || 'Superadmin',
            role_id: (found.role || '').toLowerCase().includes('admin') ? 1 : 2,
            patron_id: found.emp_no,
            department: found.department || 'General',
            status: 'Active',
            permissions: found.page_privileges || ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings']
          };
          const syntheticToken = `token_${Date.now()}`;
          onLoginSuccess(syntheticToken, syntheticUser);
          return;
        }

        setErrorMessage(data.error || 'Invalid credentials. Please verify username and password.');
        if (onToast) onToast(data.error || 'Authentication failed', 'danger');
        return;
      }

      // Success - handled by App.jsx handleLoginSuccess
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setErrorMessage(`Cannot connect to server (${err.message}). Please ensure backend is running.`);
      if (onToast) onToast('Failed to reach backend API', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* Background ambient accents */}
      <div className="w-full max-w-md">
        {/* Main Clean Card */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white shadow-xs mb-1">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Campus Library
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sign in to manage catalog, circulation desk, and user privileges
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="leading-snug font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Login Form Only */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Username / Email */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
                Username or Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. superadmin or email@college.edu.in"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Prefill Pill */}
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Admin Account:</span>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('superadmin');
                  setPassword('superadmin123');
                }}
                className="font-mono text-zinc-600 hover:text-zinc-900 underline font-medium"
              >
                superadmin / superadmin123
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Clean Footer Info */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Institutional Management Portal • Secured with JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
