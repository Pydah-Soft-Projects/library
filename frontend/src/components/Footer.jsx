import React from 'react';
import { BookOpen, Clock, Mail, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer({ onSwitchTab }) {
  return (
    <footer className="border-t border-zinc-200/90 bg-white text-zinc-500 text-xs mt-16 pt-10 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-zinc-100">
          {/* Brand */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-xs">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-zinc-900">
                Campus Library
              </span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Central university library automation: 30-day fixed loans, dynamic daily fine accrual, real-time physical inventory, and digital patron cards.
            </p>
          </div>

          {/* Library Timings */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Operating Hours</span>
            </h4>
            <div className="space-y-1 text-zinc-600">
              <div>Mon – Fri: <strong className="text-zinc-800">8:00 AM – 9:00 PM</strong></div>
              <div>Saturday: <strong className="text-zinc-800">9:00 AM – 5:00 PM</strong></div>
              <div>Sunday & Holidays: <span className="text-zinc-400">Reading Room Only</span></div>
            </div>
          </div>

          {/* Borrowing Policies */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Circulation Policy</span>
            </h4>
            <ul className="space-y-1 text-zinc-500 text-[11px]">
              <li>• Standard Term: <strong>30 Calendar Days</strong></li>
              <li>• Daily Penalty: <strong>₹5.00 / day</strong></li>
              <li>• Max Quota: <strong>4 Books per Patron</strong></li>
            </ul>
          </div>

          {/* Quick Desk Links */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reference Desk</span>
            </h4>
            <div className="space-y-1 text-zinc-500 text-[11px]">
              <div>Central Academic Block, Level 2</div>
              <div>Email: <span className="text-zinc-700">library@college.edu.in</span></div>
              <div>Intercom: Ext. 4201 / 4202</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-400 text-[11px]">
          <div>
            © 2026 Campus Academic Library. Institutional Library Management System.
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>React + Node.js Express</span>
            <span>•</span>
            <span>MongoDB Atlas</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">● System Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
