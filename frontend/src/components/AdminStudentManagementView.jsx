import React, { useState } from 'react';
import { Users, Search, Lock, Unlock, ShieldAlert, CheckCircle, BookOpen, AlertTriangle, Plus, X, Calendar, History, Mail, Phone } from 'lucide-react';

export default function AdminStudentManagementView({ 
  students = [], 
  onToggleFreeze, 
  onAddStudent, 
  loans = [], 
  fines = [], 
  onToast 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    department: 'Computer Science & Engineering',
    year: '1st Year B.Tech',
    email: '',
    phone: ''
  });

  const filteredStudents = students.filter(s => {
    const q = searchTerm.toLowerCase();
    return !searchTerm ||
      s.name.toLowerCase().includes(q) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      s.department.toLowerCase().includes(q);
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.rollNo || !newStudent.email) {
      if (onToast) onToast('Please fill all required student details.', 'danger');
      return;
    }

    const created = {
      id: newStudent.rollNo,
      rollNo: newStudent.rollNo,
      name: newStudent.name,
      department: newStudent.department,
      year: newStudent.year,
      email: newStudent.email,
      phone: newStudent.phone || '+91 98450 00000',
      status: 'Active',
      borrowedCount: 0,
      fineBalance: 0
    };

    if (onAddStudent) onAddStudent(created);
    setIsAddModalOpen(false);
    setNewStudent({
      name: '',
      rollNo: '',
      department: 'Computer Science & Engineering',
      year: '1st Year B.Tech',
      email: '',
      phone: ''
    });
  };

  const studentLoans = historyStudent
    ? loans.filter(l => l.patronId === historyStudent.id || l.patronId === historyStudent.rollNo)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patron Management</span>
          <h2 className="text-xl font-heading font-extrabold text-slate-900">
            Registered Student Patrons & Account Holds
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor patron borrowing activity, freeze accounts, and register institutional members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Roll No, Name or Dept..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Name & Roll No</th>
                <th className="py-3.5 px-4">Department & Year</th>
                <th className="py-3.5 px-4">Active Borrowings</th>
                <th className="py-3.5 px-4">Fine Dues</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const isFrozen = student.status === 'Frozen';
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{student.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{student.rollNo || student.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-semibold">{student.department}</div>
                      <div className="text-[11px] text-slate-400">{student.year}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {student.borrowedCount || 0} / 3 Books
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold ${student.fineBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        ₹{Number(student.fineBalance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isFrozen 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isFrozen ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        <span>{isFrozen ? 'FROZEN (Locked)' : 'ACTIVE'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setHistoryStudent(student)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                          title="View loan and checkout history"
                        >
                          <History className="w-3.5 h-3.5 text-blue-500" />
                          <span>History</span>
                        </button>

                        <button
                          onClick={() => onToggleFreeze && onToggleFreeze(student)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            isFrozen
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700'
                          }`}
                        >
                          {isFrozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Register Student Patron */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Register New Student Patron
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Ananya Deshmukh"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-600 uppercase">Student Roll No / ID</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomCode = Math.floor(1000 + Math.random() * 9000);
                      const genId = `STU-${new Date().getFullYear()}-${randomCode}`;
                      setNewStudent({ ...newStudent, rollNo: genId });
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Auto-Generate ID ✨
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newStudent.rollNo}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                  placeholder="e.g. STU-2024-EC099"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Department</label>
                  <select
                    value={newStudent.department}
                    onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Computer Science & Engineering</option>
                    <option>Mechanical Engineering</option>
                    <option>Electronics & Communication</option>
                    <option>Civil Engineering</option>
                    <option>Medical Sciences</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Academic Year</label>
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option>1st Year B.Tech</option>
                    <option>2nd Year B.Tech</option>
                    <option>3rd Year B.Tech</option>
                    <option>4th Year B.Tech</option>
                    <option>Postgraduate M.Tech</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="e.g. ananya.ec24@college.edu.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Mobile Contact</label>
                <input
                  type="tel"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-md"
                >
                  Register Patron
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Borrowing History Modal */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md max-w-xl w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Borrowing History: {historyStudent.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">{historyStudent.rollNo || historyStudent.id} • {historyStudent.department}</span>
              </div>
              <button
                onClick={() => setHistoryStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2.5 text-xs">
              {studentLoans.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No active or past borrowing history found for this patron.
                </div>
              ) : (
                studentLoans.map(l => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{l.bookTitle}</div>
                      <div className="text-[11px] text-slate-500">ID: {l.accession} • Due: {l.dueDateFormatted}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.status === 'Overdue'
                        ? 'bg-rose-100 text-rose-700'
                        : l.status === 'Returned'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
