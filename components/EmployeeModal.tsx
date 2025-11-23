import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Briefcase, Network } from 'lucide-react';
import { User, UserRole } from '../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  editingUser: User | null;
  existingUsers: User[]; // To select manager
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingUser, 
  existingUsers 
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [managerId, setManagerId] = useState<string>('');

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setRole(editingUser.role);
      setManagerId(editingUser.managerId || '');
    } else {
      setName('');
      setRole(UserRole.EMPLOYEE);
      setManagerId('');
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newUser: User = {
      id: editingUser?.id || Math.random().toString(36).substr(2, 9),
      name,
      role,
      managerId: managerId || undefined,
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    onSave(newUser);
    onClose();
  };

  // Filter potential managers: 
  // 1. Can't report to yourself
  // 2. Can't report to someone who reports to you (simple circular check skipped for brevity, but self-check is essential)
  // 3. Usually Employees report to Managers/HR
  const potentialManagers = existingUsers.filter(u => 
    u.id !== editingUser?.id && (u.role === UserRole.MANAGER || u.role === UserRole.HR)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">
            {editingUser ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. John Doe"
                required
              />
            </div>
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="w-4 h-4 text-gray-400" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
              >
                {Object.values(UserRole).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reporting Manager Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reports To (Optional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Network className="w-4 h-4 text-gray-400" />
              </div>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
              >
                <option value="">No Direct Manager</option>
                {potentialManagers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {editingUser ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;