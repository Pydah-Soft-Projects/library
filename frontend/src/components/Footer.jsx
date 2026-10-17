import React from 'react';
import { BookOpen, Clock, Mail, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer({ onSwitchTab }) {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-heading font-extrabold text-base text-white">
                Campus <span className="text-blue-400">Library</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Automating institutional academic library workflows with 30-day fixed loans, dynamic daily fine accrual, real-time dual-counter inventory, and digital patron cards.
            </p>
          </div>

          {/* Library Timings */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Library Operating Hours</span>
            </h4>
            <div className="space-y-1 text-slate-300">
              <div>Monday – Friday: <span className="text-white font-semibold">8:00 AM – 9:00 PM</span></div>
              <div>Saturday: <span className="text-white font-semibold">9:00 AM – 5:00 PM</span></div>
              <div>Sundays & Holidays: <span className="text-slate-400">Reading Room Only</span></div>
            </div>
          </div>

          {/* Borrowing Policies */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Borrowing Guidelines</span>
            </h4>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li>• Standard Borrowing Term: <strong>30 Calendar Days</strong></li>
              <li>• Daily Penalty for Overdue: <strong>₹5.00 / day</strong></li>
              <li>• Max Borrowing Quota: <strong>3 Books per Patron</strong></li>
              <li>• Overdue items trigger automated borrowing freeze</li>
            </ul>
          </div>

          {/* Quick Navigation & Helpdesk */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Campus Reference Desk</span>
            </h4>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <div>Central Academic Block, Level 2</div>
              <div>Email: <a href="mailto:library@college.edu.in" className="text-blue-400 hover:underline">library@college.edu.in</a></div>
              <div>Intercom: Ext. 4201 / 4202</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            © 2026 Campus Academic Library. Institutional Library Management System.
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>React 18 + Node.js Express</span>
            <span>•</span>
            <span>MySQL 8.0 ACID</span>
            <span>•</span>
            <span className="text-emerald-400">● System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
