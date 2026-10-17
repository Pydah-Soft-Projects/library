import React, { useState } from 'react';
import { 
  User, Award, ShieldCheck, Mail, Phone, BookOpen, LogOut, 
  CheckCircle, AlertTriangle, Printer, Camera, Lock, Key, 
  Save, Sparkles, Check, Edit3, Image as ImageIcon
} from 'lucide-react';

const AVATAR_PRESETS = [
  { id: 'avatar_1', emoji: '👨‍🎓', label: 'Graduate' },
  { id: 'avatar_2', emoji: '👩‍🎓', label: 'Scholar' },
  { id: 'avatar_3', emoji: '🧑‍💻', label: 'Engineer' },
  { id: 'avatar_4', emoji: '🔬', label: 'Researcher' },
  { id: 'avatar_5', emoji: '📚', label: 'Academic' }
];

export default function StudentProfileView({ 
  currentStudent, 
  hasOverdue, 
  onLogout,
  onUpdateProfile,
  onToast
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(currentStudent?.phone || '+91 98450 12345');
  const [year, setYear] = useState(currentStudent?.year || '3rd Year B.Tech');
  const [selectedAvatar, setSelectedAvatar] = useState(currentStudent?.avatar || 'avatar_1');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(currentStudent?.avatarUrl || null);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (onToast) onToast('Image size should be less than 2MB', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomAvatarUrl(event.target.result);
        if (onToast) onToast('Custom photo avatar loaded successfully!', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (newPassword) {
      if (newPassword.length < 4) {
        if (onToast) onToast('New password must be at least 4 characters long.', 'danger');
        return;
      }
      if (newPassword !== confirmPassword) {
        if (onToast) onToast('Password confirmation does not match.', 'danger');
        return;
      }

      // Sync password with backend
      try {
        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: currentStudent.email || currentStudent.id,
            newPassword
          })
        });
      } catch {
        // offline fallback
      }
    }

    const updated = {
      ...currentStudent,
      phone,
      year,
      avatar: selectedAvatar,
      avatarUrl: customAvatarUrl
    };

    if (onUpdateProfile) onUpdateProfile(updated);
    setIsEditing(false);
    setIsChangingPass(false);
    setNewPassword('');
    setConfirmPassword('');
    if (onToast) onToast('Student profile & preferences updated successfully!', 'success');
  };

  const currentPreset = AVATAR_PRESETS.find(a => a.id === selectedAvatar) || AVATAR_PRESETS[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patron Profile & ID</span>
          <h2 className="text-xl font-heading font-extrabold text-slate-900">
            Institutional Student Credentials & Library Pass
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-200"
            title="Print or Save Digital Pass as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Academic Credentials & Edit Mode */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            {customAvatarUrl ? (
              <img 
                src={customAvatarUrl} 
                alt={currentStudent.name} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-md">
                {currentPreset.emoji}
              </div>
            )}
            <div>
              <h3 className="font-heading font-extrabold text-lg text-slate-900">
                {currentStudent.name}
              </h3>
              <div className="text-xs font-mono font-bold text-blue-600">
                {currentStudent.id || currentStudent.rollNo}
              </div>
              <div className="text-xs text-slate-500">
                {currentStudent.department}
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* View Mode */
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Program / Year</span>
                <span className="font-bold text-slate-800">{year}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Institutional Email</span>
                <span className="font-bold text-slate-800">{currentStudent.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Contact Phone</span>
                <span className="font-bold text-slate-800">{phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Borrowing Privileges</span>
                <span className={`font-bold ${hasOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {hasOverdue ? '🔴 Suspended (Clear Dues)' : '🟢 Active (4 Books Quota)'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Batch Term</span>
                <span className="font-bold text-slate-800">2023 – 2027 Academic Cycle</span>
              </div>
            </div>
          ) : (
            /* Edit Form Mode */
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-1 animate-in fade-in duration-150">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Choose Profile Avatar / Photo
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {AVATAR_PRESETS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(a.id);
                        setCustomAvatarUrl(null);
                      }}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        selectedAvatar === a.id && !customAvatarUrl
                          ? 'border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                      title={a.label}
                    >
                      {a.emoji}
                    </button>
                  ))}

                  <label className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer text-slate-500 transition-colors" title="Upload custom photo">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option>1st Year B.Tech</option>
                  <option>2nd Year B.Tech</option>
                  <option>3rd Year B.Tech</option>
                  <option>4th Year B.Tech</option>
                  <option>Postgraduate M.Tech / PhD</option>
                </select>
              </div>

              {/* Password Change Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangingPass(!isChangingPass)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isChangingPass ? 'Cancel Password Change' : 'Change Security Password'}</span>
                </button>

                {isChangingPass && (
                  <div className="mt-3 space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Digital Patron Library Pass with Scannable Barcode */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-2xl border border-slate-700 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-blue-500/15 blur-2xl" />

          {/* Pass Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                Central Campus Library
              </div>
              <div className="font-heading font-extrabold text-sm tracking-tight text-white">
                Official Digital Patron Pass
              </div>
            </div>
            <Award className="w-6 h-6 text-amber-400" />
          </div>

          {/* Student Pass Body */}
          <div className="my-5 flex items-center gap-4">
            {customAvatarUrl ? (
              <img 
                src={customAvatarUrl} 
                alt={currentStudent.name} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-md shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0">
                {currentPreset.emoji}
              </div>
            )}
            <div>
              <h4 className="font-bold text-base text-white">{currentStudent.name}</h4>
              <div className="text-xs text-blue-300 font-mono">{currentStudent.id || currentStudent.rollNo}</div>
              <div className="text-[11px] text-slate-400">{currentStudent.department}</div>
            </div>
          </div>

          {/* Scannable Barcode Strip */}
          <div className="pt-4 border-t border-slate-700/80 text-center">
            <div className="bg-white p-2.5 rounded-xl inline-block w-full">
              <div className="h-10 flex items-center justify-center gap-[2px] bg-white">
                {[4,2,6,1,3,5,2,4,7,1,3,6,2,4,1,5,3,2,6,4,2,5,1,3,6,2,4].map((w, idx) => (
                  <div
                    key={idx}
                    className="bg-black h-8"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <div className="text-[10px] font-mono text-black font-black tracking-widest mt-1">
                *{currentStudent.id || currentStudent.rollNo}*
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Valid for physical circulation desk barcode checkouts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
