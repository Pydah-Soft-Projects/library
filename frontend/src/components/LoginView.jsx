import React, { useState } from 'react';
import { 
  BookOpen, Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, 
  AlertCircle, ShieldCheck
} from 'lucide-react';

export default function LoginView({ onLoginSuccess, onToast, onBack }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your HRMS employee ID, username, or institutional email.');
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
        setErrorMessage(data.error || 'Invalid credentials. Please verify your employee ID/username and password.');
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
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
    >
      <div className="w-full max-w-md">
        <div 
          className="border rounded-2xl shadow-sm p-8 sm:p-10 space-y-6 transition-colors duration-200"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal Home</span>
            </button>
          )}

          {/* Header */}
          <div className="text-center space-y-2">
            <div 
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-xs mb-1 transition-colors duration-200"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Campus Library
            </h1>
            <p 
              className="text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in with your HRMS employee ID or administrative credentials
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="leading-snug font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Username / Employee ID / Email */}
            <div className="space-y-1.5">
              <label 
                className="block font-semibold uppercase tracking-wider text-[11px]"
                style={{ color: 'var(--text-primary)' }}
              >
                HRMS Employee ID / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 2145 or superadmin"
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-xs transition-colors focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--surface)', 
                    borderColor: 'var(--border-strong)', 
                    color: 'var(--text-primary)' 
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  className="block font-semibold uppercase tracking-wider text-[11px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-xs transition-colors focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--surface)', 
                    borderColor: 'var(--border-strong)', 
                    color: 'var(--text-primary)' 
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs mt-3 cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
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
          <div 
            className="pt-4 border-t flex items-center justify-center gap-1.5 text-[11px] text-center"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span>Institutional Management Portal • Secured with Live HRMS & JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
