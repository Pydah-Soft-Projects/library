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
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col font-sans text-zinc-900 antialiased select-none">
      {/* Full-Width Top Navigation */}
      <header className="w-full border-b border-zinc-200/80 bg-white sticky top-0 z-20 px-4 sm:px-8 lg:px-12 py-3.5 flex items-center justify-between">
        {/* Logo & Portal Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-zinc-900 tracking-tight leading-none">
                Campus Library
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live System
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-none">
              Central Academic Library Management Portal
            </p>
          </div>
        </div>

        {/* Direct Sign In CTA Button */}
        <div>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Full-Width Hero Content Presentation */}
      <main className="w-full flex-1 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-16 py-12 text-center space-y-8">
        {/* Institutional Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200/90 shadow-2xs text-[11px] sm:text-xs text-zinc-600 font-medium">
          <BookCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Official Academic Library Management System</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-3.5 w-full max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.12]">
            Central Academic Library Portal
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-zinc-500 max-w-3xl mx-auto leading-relaxed">
            Welcome to the central library portal. Explore the physical collection catalog, access circulation desk services, track borrowings, and manage institutional records.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>Access Library Portal</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Full-Width Overview Highlights Cards */}
        <div className="w-full max-w-6xl mx-auto pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 mb-1.5">
                Dual-Counter Catalog
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Real-time on-shelf physical book availability and active loans tracking.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 mb-1.5">
                Circulation Desk
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Standard 30-day loan windows with automated fine calculations and receipts.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 mb-1.5">
                Institutional HRMS
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Integrated role-based credentials for students, faculty, and administrators.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Full-Width Footer */}
      <footer className="w-full py-6 border-t border-zinc-200/80 text-center text-xs text-zinc-400 px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Institutional Management Portal • Secured with Live HRMS & JWT</span>
        </div>
      </footer>
    </div>
  );
}
