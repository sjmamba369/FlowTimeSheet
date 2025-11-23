import React, { useState, useMemo } from 'react';
import { 
  Clock, Users, ShieldCheck, LogOut, ChevronRight, FileText, 
  CheckCircle, XCircle, AlertCircle, Bot, Layout, 
  FileSpreadsheet, ArrowLeft, Download, Plus, Pencil, Trash2, UserPlus
} from 'lucide-react';
import { User, UserRole, Timesheet, TimesheetStatus, EntryType } from './types';
import { MOCK_USERS, INITIAL_TIMESHEETS } from './services/mockData';
import TimesheetEditor from './components/TimesheetEditor';
import RejectionModal from './components/RejectionModal';
import EmployeeModal from './components/EmployeeModal';
import { auditTimesheet } from './services/geminiService';

const App: React.FC = () => {
  // --- Global State ---
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>(INITIAL_TIMESHEETS);
  
  // --- UI State ---
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'team' | 'hr_directory'>('personal');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);
  const [rejectingTimesheet, setRejectingTimesheet] = useState<Timesheet | null>(null);
  const [auditResult, setAuditResult] = useState<{id: string, text: string} | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Employee Management State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // --- Derived State ---
  const filteredTimesheets = useMemo(() => {
    // 1. Personal View: Show ALL timesheets belonging to the current user
    if (dashboardScope === 'personal') {
      return timesheets.filter(t => t.employeeId === currentUser.id);
    }
    
    // 2. Team View: Logic depends on role
    if (dashboardScope === 'team') {
      if (currentUser.role === UserRole.MANAGER) {
        return timesheets.filter(t => 
          t.employeeId !== currentUser.id &&
          (t.status === TimesheetStatus.SUBMITTED || 
           t.status === TimesheetStatus.MANAGER_APPROVED ||
           t.status === TimesheetStatus.REJECTED)
        );
      }
      if (currentUser.role === UserRole.HR) {
        return timesheets.filter(t => 
          t.employeeId !== currentUser.id &&
          (t.status === TimesheetStatus.MANAGER_APPROVED || 
           t.status === TimesheetStatus.HR_APPROVED)
        );
      }
    }

    // 3. HR Directory Detail View
    if (dashboardScope === 'hr_directory' && selectedEmployeeId) {
        return timesheets.filter(t => t.employeeId === selectedEmployeeId);
    }
    
    return [];
  }, [timesheets, currentUser, dashboardScope, selectedEmployeeId]);

  // --- Actions ---

  const handleNewTimesheet = () => {
    setEditingTimesheetId(null);
    setView('editor');
  };

  const handleEditTimesheet = (t: Timesheet) => {
    setEditingTimesheetId(t.id);
    setView('editor');
  };

  const handleSaveTimesheet = (updated: Timesheet) => {
    if (editingTimesheetId) {
      setTimesheets(prev => prev.map(t => t.id === editingTimesheetId ? updated : t));
    } else {
      setTimesheets(prev => [...prev, updated]);
    }
    setView('dashboard');
    setEditingTimesheetId(null);
  };

  const handleApprove = (t: Timesheet) => {
    const nextStatus = currentUser.role === UserRole.MANAGER 
      ? TimesheetStatus.MANAGER_APPROVED 
      : TimesheetStatus.HR_APPROVED;
    
    setTimesheets(prev => prev.map(item => item.id === t.id ? { ...item, status: nextStatus } : item));
  };

  const handleRejectClick = (t: Timesheet) => {
    setRejectingTimesheet(t);
  };

  const confirmRejection = (reason: string) => {
    if (rejectingTimesheet) {
      setTimesheets(prev => prev.map(item => 
        item.id === rejectingTimesheet.id 
          ? { ...item, status: TimesheetStatus.REJECTED, rejectionReason: reason } 
          : item
      ));
      setRejectingTimesheet(null);
    }
  };

  const handleAudit = async (t: Timesheet) => {
      setAuditResult(null);
      setIsAuditing(true);
      const result = await auditTimesheet(t);
      setAuditResult({ id: t.id, text: result });
      setIsAuditing(false);
  };

  // --- Employee Management Actions ---

  const handleAddEmployeeClick = () => {
    setEditingUser(null);
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployeeClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation(); // Prevent card click
    setEditingUser(user);
    setIsEmployeeModalOpen(true);
  };

  const handleDeleteEmployeeClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this employee? This will not delete their historical timesheets.')) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        // If current user was deleted (edge case), reset to first avail
        if (currentUser.id === userId) {
             setCurrentUser(users[0]);
             setView('dashboard');
        }
    }
  };

  const handleSaveEmployee = (user: User) => {
      if (editingUser) {
          // Update
          setUsers(prev => prev.map(u => u.id === user.id ? user : u));
          // If updating currently logged in user, sync state
          if (currentUser.id === user.id) setCurrentUser(user);
      } else {
          // Add
          setUsers(prev => [...prev, user]);
      }
  };


  const handleDownloadExcel = (employeeId: string) => {
    const employee = users.find(u => u.id === employeeId);
    if (!employee) return;

    const userTimesheets = timesheets.filter(t => t.employeeId === employeeId);
    
    // Flatten data for CSV
    // Columns: Employee, Period Start, Period End, Status, Date, Type, Hours, Rejection/Notes
    const rows = [
      ['Employee Name', 'Period Start', 'Period End', 'Status', 'Date', 'Type', 'Hours', 'Rejection/Notes']
    ];

    userTimesheets.forEach(t => {
      if (t.entries.length === 0) {
          rows.push([
              employee.name, t.periodStart, t.periodEnd, t.status, '', '', '0', t.rejectionReason || ''
          ]);
      } else {
          t.entries.forEach(e => {
              rows.push([
                  employee.name,
                  t.periodStart,
                  t.periodEnd,
                  t.status,
                  e.date,
                  e.type,
                  e.hours.toString(),
                  t.rejectionReason ? `"${t.rejectionReason.replace(/"/g, '""')}"` : ''
              ]);
          });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${employee.name.replace(/\s+/g, '_')}_Timesheet_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Helpers ---

  const getStatusColor = (status: TimesheetStatus) => {
    switch (status) {
      case TimesheetStatus.DRAFT: return 'bg-gray-100 text-gray-700 border-gray-200';
      case TimesheetStatus.SUBMITTED: return 'bg-blue-100 text-blue-700 border-blue-200';
      case TimesheetStatus.MANAGER_APPROVED: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case TimesheetStatus.HR_APPROVED: return 'bg-green-100 text-green-700 border-green-200';
      case TimesheetStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // --- Render Sections ---

  const renderHeader = () => {
     let title = 'My Timesheets';
     if (view === 'editor') {
         title = editingTimesheetId ? 'Edit Timesheet' : 'New Timesheet';
     } else if (dashboardScope === 'team') {
         title = 'Team Approvals';
     } else if (dashboardScope === 'hr_directory') {
         title = selectedEmployeeId 
            ? `Employee View: ${users.find(u => u.id === selectedEmployeeId)?.name}` 
            : 'Employee Directory';
     }

     return (
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-5 flex justify-between items-center z-10 sticky top-0">
            <div className="flex items-center gap-3">
                {view === 'editor' && (
                    <button onClick={() => setView('dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                )}
                {dashboardScope === 'hr_directory' && selectedEmployeeId && view === 'dashboard' && (
                    <button onClick={() => setSelectedEmployeeId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                )}
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {title}
                </h1>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
                {/* New Timesheet Button - Personal View Only */}
                {view === 'dashboard' && dashboardScope === 'personal' && (
                    <button 
                        onClick={handleNewTimesheet}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                    >
                        <Clock className="w-4 h-4" />
                        New Timesheet
                    </button>
                )}

                {/* Add Employee Button - HR Directory Only */}
                {view === 'dashboard' && dashboardScope === 'hr_directory' && !selectedEmployeeId && (
                     <button 
                        onClick={handleAddEmployeeClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Employee
                    </button>
                )}

                {/* Download Excel - HR Individual View Only */}
                {view === 'dashboard' && dashboardScope === 'hr_directory' && selectedEmployeeId && (
                    <button 
                        onClick={() => handleDownloadExcel(selectedEmployeeId)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-md shadow-green-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download Excel
                    </button>
                )}
            </div>
        </header>
     );
  };

  const renderTimesheetCard = (t: Timesheet) => (
    <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all group">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            
            <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 flex-shrink-0 text-gray-600`}>
                    <div className="text-center leading-none">
                        <span className="block text-sm font-bold uppercase text-gray-400 mb-1">
                            {new Date(t.periodStart).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="block text-xl font-bold text-gray-800">
                            {new Date(t.periodStart).getDate()}
                        </span>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                            {t.employeeName}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(t.status)}`}>
                            {t.status}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
                        <span>{t.periodStart} — {t.periodEnd}</span>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <span>
                            <span className="font-medium text-gray-900">{t.entries.reduce((acc, c) => acc + Number(c.hours), 0)}</span> Hours
                        </span>
                    </div>
                    {t.rejectionReason && (
                        <div className="mt-3 flex items-start gap-2 text-sm bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 max-w-xl">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                            <div>
                                <span className="font-bold text-red-900">Rejected:</span> {t.rejectionReason}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                
                {/* AI Audit - Team Scope OR HR Directory (useful for random checks) */}
                {(dashboardScope === 'team' || dashboardScope === 'hr_directory') && (
                    <button
                        onClick={() => handleAudit(t)}
                        className="px-3 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100 flex items-center gap-2 text-sm font-medium"
                        title="Analyze with AI"
                    >
                        <Bot className="w-4 h-4" />
                        {isAuditing && auditResult?.id === t.id ? 'Analyzing...' : 'AI Audit'}
                    </button>
                )}

                {/* View/Edit Actions */}
                {dashboardScope === 'personal' ? (
                    (t.status === TimesheetStatus.DRAFT || t.status === TimesheetStatus.REJECTED) ? (
                        <button 
                            onClick={() => handleEditTimesheet(t)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                        >
                            Edit & Resubmit
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleEditTimesheet(t)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            View Details
                        </button>
                    )
                ) : (
                    // Team & HR Directory just view details generally
                    <button 
                        onClick={() => handleEditTimesheet(t)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        View Details
                    </button>
                )}

                {/* Approval Actions - Only in Team View */}
                {dashboardScope === 'team' && (
                    <>
                        {currentUser.role === UserRole.MANAGER && t.status === TimesheetStatus.SUBMITTED && (
                            <>
                                <button 
                                    onClick={() => handleRejectClick(t)}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button 
                                    onClick={() => handleApprove(t)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-green-200"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                            </>
                        )}

                        {currentUser.role === UserRole.HR && t.status === TimesheetStatus.MANAGER_APPROVED && (
                            <>
                                <button 
                                    onClick={() => handleRejectClick(t)}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button 
                                    onClick={() => handleApprove(t)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-green-200"
                                >
                                    <ShieldCheck className="w-4 h-4" /> Final Approve
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
        
        {/* Inline Audit Result */}
        {auditResult && auditResult.id === t.id && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-100 animate-fade-in text-sm text-gray-800 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-purple-800">
                        <Bot className="w-4 h-4" /> AI Analysis
                    </div>
                    <button 
                        onClick={() => setAuditResult(null)}
                        className="text-xs text-purple-400 hover:text-purple-700 font-medium"
                    >
                        Close
                    </button>
                </div>
                <div className="whitespace-pre-line pl-6 border-l-2 border-purple-200">
                    {auditResult.text}
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-900">
      
      {/* Sidebar / Nav */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Clock className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">ChronoFlow</span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Current Role (Demo)</h3>
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => { 
                      setCurrentUser(u); 
                      setView('dashboard'); 
                      setDashboardScope('personal'); 
                      setSelectedEmployeeId(null);
                      setAuditResult(null); 
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${currentUser.id === u.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full border border-slate-600" />
                  <span className="text-sm font-medium">{u.role}</span>
                </button>
              ))}
            </div>
          </div>

          <nav className="space-y-1">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Menu</h3>
             
             {/* My Timesheets (Available to ALL) */}
             <button 
                onClick={() => { setView('dashboard'); setDashboardScope('personal'); setSelectedEmployeeId(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${view === 'dashboard' && dashboardScope === 'personal' ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
             >
                <FileText className="w-5 h-5" />
                <span>My Timesheets</span>
             </button>

             {/* Team Approvals (Available to MANAGER & HR) */}
             {currentUser.role !== UserRole.EMPLOYEE && (
                 <button 
                    onClick={() => { setView('dashboard'); setDashboardScope('team'); setSelectedEmployeeId(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${view === 'dashboard' && dashboardScope === 'team' ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                 >
                    <CheckCircle className="w-5 h-5" />
                    <span>Team Approvals</span>
                 </button>
             )}

             {/* HR Directory (Available to HR ONLY) */}
             {currentUser.role === UserRole.HR && (
                 <button 
                    onClick={() => { setView('dashboard'); setDashboardScope('hr_directory'); setSelectedEmployeeId(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${view === 'dashboard' && dashboardScope === 'hr_directory' ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                 >
                    <Users className="w-5 h-5" />
                    <span>Employee Directory</span>
                 </button>
             )}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900">
             <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600">
                    {currentUser.name.charAt(0)}
                 </div>
                 <div className="flex-1 overflow-hidden">
                     <p className="text-sm font-medium truncate text-slate-200">{currentUser.name}</p>
                     <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
                 </div>
                 <LogOut className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer" />
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 h-screen overflow-hidden flex flex-col">
        {renderHeader()}

        <div className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto">
                {view === 'editor' ? (
                    <TimesheetEditor 
                        initialTimesheet={timesheets.find(t => t.id === editingTimesheetId)}
                        employeeId={currentUser.id}
                        employeeName={currentUser.name}
                        onSave={handleSaveTimesheet}
                        onCancel={() => setView('dashboard')}
                    />
                ) : (
                    <div className="space-y-6">
                        
                        {/* HR Directory View: Grid of Employees */}
                        {dashboardScope === 'hr_directory' && !selectedEmployeeId && (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {users.map(user => {
                                   const reportsTo = users.find(u => u.id === user.managerId);
                                   return (
                                   <div key={user.id} onClick={() => setSelectedEmployeeId(user.id)} className="relative bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group flex items-start gap-4">
                                       <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-gray-100 group-hover:border-blue-100 flex-shrink-0" />
                                       <div className="flex-1 min-w-0">
                                           <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600">{user.name}</h3>
                                           <div className="flex flex-wrap gap-2 mt-1">
                                             <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">{user.role}</span>
                                           </div>
                                           {reportsTo && (
                                               <p className="text-xs text-gray-400 mt-2 truncate">
                                                   Reports to: <span className="text-gray-600 font-medium">{reportsTo.name}</span>
                                               </p>
                                           )}
                                       </div>
                                       
                                       <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleEditEmployeeClick(e, user)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Employee"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteEmployeeClick(e, user.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Remove Employee"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                       </div>
                                   </div>
                               )})}
                           </div>
                        )}

                        {/* Standard List / HR Detail List */}
                        {((dashboardScope !== 'hr_directory') || (dashboardScope === 'hr_directory' && selectedEmployeeId)) && (
                            filteredTimesheets.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        {dashboardScope === 'personal' ? <FileText className="w-10 h-10 text-gray-300" /> : <Users className="w-10 h-10 text-gray-300" />}
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">No timesheets found</h3>
                                    <p className="text-gray-500 mt-2">
                                        {dashboardScope === 'personal' 
                                            ? "You haven't created any timesheets yet." 
                                            : "No timesheets match the current view criteria."}
                                    </p>
                                    {dashboardScope === 'personal' && (
                                        <button onClick={handleNewTimesheet} className="mt-6 text-blue-600 hover:text-blue-800 font-medium">
                                            Create your first timesheet &rarr;
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-5">
                                    {filteredTimesheets.map(renderTimesheetCard)}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
      </main>
      
      {rejectingTimesheet && (
        <RejectionModal 
            isOpen={!!rejectingTimesheet}
            timesheet={rejectingTimesheet}
            onClose={() => setRejectingTimesheet(null)}
            onConfirm={confirmRejection}
        />
      )}

      {/* Employee Management Modal */}
      <EmployeeModal 
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          onSave={handleSaveEmployee}
          editingUser={editingUser}
          existingUsers={users}
      />
    </div>
  );
};

export default App;