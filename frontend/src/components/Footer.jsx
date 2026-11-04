import React from 'react';
import { BookOpen, Clock, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer({ onSwitchTab }) {
  return (
    <footer 
      className="border-t text-xs mt-16 pt-10 pb-8 transition-colors duration-200"
      style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)', 
        color: 'var(--text-secondary)' 
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Brand */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span 
                className="font-bold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Campus Library
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Central university library automation: 30-day fixed loans, dynamic daily fine accrual, real-time physical inventory, and digital patron cards.
            </p>
          </div>

          {/* Library Timings */}
          <div className="space-y-2 text-xs">
            <h4 
              className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span>Operating Hours</span>
            </h4>
            <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div>Mon – Fri: <strong style={{ color: 'var(--text-primary)' }}>8:00 AM – 9:00 PM</strong></div>
              <div>Saturday: <strong style={{ color: 'var(--text-primary)' }}>9:00 AM – 5:00 PM</strong></div>
              <div>Sunday & Holidays: <span style={{ color: 'var(--text-muted)' }}>Reading Room Only</span></div>
            </div>
          </div>

          {/* Borrowing Policies */}
          <div className="space-y-2 text-xs">
            <h4 
              className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span>Circulation Policy</span>
            </h4>
            <ul className="space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <li>• Standard Term: <strong style={{ color: 'var(--text-primary)' }}>30 Calendar Days</strong></li>
              <li>• Daily Penalty: <strong style={{ color: 'var(--text-primary)' }}>₹5.00 / day</strong></li>
              <li>• Max Quota: <strong style={{ color: 'var(--text-primary)' }}>4 Books per Patron</strong></li>
            </ul>
          </div>

          {/* Quick Desk Links */}
          <div className="space-y-2 text-xs">
            <h4 
              className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span>Reference Desk</span>
            </h4>
            <div className="space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <div>Central Academic Block, Level 2</div>
              <div>Email: <span style={{ color: 'var(--text-primary)' }}>library@college.edu.in</span></div>
              <div>Intercom: Ext. 4201 / 4202</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div 
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <div>
            © 2026 Campus Academic Library. Institutional Library Management System.
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>Centralized Theme Online</span>
            <span>•</span>
            <span style={{ color: 'var(--success)' }}>● System Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
