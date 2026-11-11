import React from 'react';
import { 
  BookOpen, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  BookCheck, 
  LogIn 
} from 'lucide-react';

export default function LandingView({ onNavigateToLogin }) {
  return (
    <div 
      className="min-h-screen w-full flex flex-col font-sans antialiased select-none transition-colors duration-200"
      style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
    >
      {/* Full-Width Top Navigation */}
      <header 
        className="w-full border-b sticky top-0 z-20 px-4 sm:px-8 lg:px-12 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors duration-200"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo & Portal Identity */}
        <div className="flex items-center gap-3">
          <img
            src="/campo-logos/favicon.ico"
            alt="Campo"
            className="w-10 h-10 rounded-xl shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="font-bold text-base sm:text-lg tracking-tight leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                Campus Library
              </span>
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  borderColor: 'var(--border)' 
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
                Live System
              </span>
            </div>
            <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--text-muted)' }}>
              Central Academic Library Management Portal
            </p>
          </div>
        </div>

        {/* Direct Sign In CTA Button */}
        <div>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Full-Width Hero Content Presentation */}
      <main className="w-full flex-1 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 py-12 text-center space-y-8">
        {/* Institutional Pill */}
        <div 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-2xs text-[11px] sm:text-xs font-medium transition-colors duration-200"
          style={{ 
            backgroundColor: 'var(--surface)', 
            borderColor: 'var(--border)', 
            color: 'var(--text-secondary)' 
          }}
        >
          <BookCheck className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
          <span>Official Academic Library Management System</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-3.5 w-full max-w-4xl mx-auto">
          <h1 
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]"
            style={{ color: 'var(--text-primary)' }}
          >
            Central Academic Library Portal
          </h1>
          <p 
            className="text-sm sm:text-base lg:text-lg max-w-3xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Welcome to the central library portal. Explore the physical collection catalog, access circulation desk services, track borrowings, and manage institutional records.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="w-full sm:w-auto px-8 py-3.5 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm hover:shadow-md hover:opacity-90 flex items-center justify-center gap-2.5 cursor-pointer group active:scale-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <span>Access Library Portal</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Full-Width Overview Highlights Cards */}
        <div className="w-full max-w-6xl mx-auto pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div 
              className="border rounded-2xl p-6 shadow-xs transition-colors duration-200"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-colors duration-200"
                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Dual-Counter Catalog
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Real-time on-shelf physical book availability and active loans tracking.
              </p>
            </div>

            <div 
              className="border rounded-2xl p-6 shadow-xs transition-colors duration-200"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-colors duration-200"
                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Circulation Desk
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Standard 30-day loan windows with automated fine calculations and receipts.
              </p>
            </div>

            <div 
              className="border rounded-2xl p-6 shadow-xs transition-colors duration-200"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-colors duration-200"
                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Institutional HRMS
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Integrated role-based credentials for students, faculty, and administrators.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Full-Width Footer */}
      <footer 
        className="w-full py-6 border-t text-center text-xs px-4 sm:px-8 lg:px-12 transition-colors duration-200"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <span>Institutional Management Portal • Secured with Live HRMS & Centralized Theme</span>
        </div>
      </footer>
    </div>
  );
}
