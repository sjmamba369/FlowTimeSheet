import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar, Save, Send, RefreshCw } from 'lucide-react';
import { Timesheet, TimesheetEntry, EntryType, TimesheetStatus } from '../types';

interface TimesheetEditorProps {
  initialTimesheet?: Timesheet;
  employeeId: string;
  employeeName: string;
  onSave: (timesheet: Timesheet) => void;
  onCancel: () => void;
}

// Helper to get the Monday of the current week (Local time safe)
const getMonday = (d: Date) => {
  d = new Date(d);
  const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
}

const TimesheetEditor: React.FC<TimesheetEditorProps> = ({ 
  initialTimesheet, 
  employeeId, 
  employeeName, 
  onSave, 
  onCancel 
}) => {
  // Default to current week (Mon-Sun) if new
  const getDefaultStart = () => {
    if (initialTimesheet) return initialTimesheet.periodStart;
    return getMonday(new Date()).toISOString().split('T')[0];
  };

  const getDefaultEnd = () => {
    if (initialTimesheet) return initialTimesheet.periodEnd;
    const mon = getMonday(new Date());
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return sun.toISOString().split('T')[0];
  };

  const [periodStart, setPeriodStart] = useState(getDefaultStart());
  const [periodEnd, setPeriodEnd] = useState(getDefaultEnd());
  const [entries, setEntries] = useState<TimesheetEntry[]>(initialTimesheet?.entries || []);

  // Core logic to regenerate entries based on range while preserving existing data
  const updateEntriesForRange = useCallback((startStr: string, endStr: string, currentEntries: TimesheetEntry[]) => {
    if (!startStr || !endStr) return;

    const s = new Date(startStr);
    const e = new Date(endStr);
    
    // Normalize to UTC midnight to avoid timezone shifts during loop
    const startUTC = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate()));
    const endUTC = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()));

    // Map existing entries by date for preservation
    const existingMap = new Map<string, TimesheetEntry[]>();
    currentEntries.forEach(entry => {
        if (!existingMap.has(entry.date)) {
            existingMap.set(entry.date, []);
        }
        existingMap.get(entry.date)!.push(entry);
    });

    const newEntries: TimesheetEntry[] = [];
    const loopDate = new Date(startUTC);

    while (loopDate <= endUTC) {
        const dateStr = loopDate.toISOString().split('T')[0];
        
        if (existingMap.has(dateStr)) {
            // Keep existing entries for this date
            newEntries.push(...existingMap.get(dateStr)!);
        } else {
            // Create new default entry
            const dayOfWeek = loopDate.getUTCDay(); // 0 = Sun, 6 = Sat
            let type = EntryType.REGULAR;
            let hours = 8;

            if (dayOfWeek === 0) {
                type = EntryType.SUNDAY;
                hours = 0;
            } else if (dayOfWeek === 6) {
                type = EntryType.SATURDAY;
                hours = 0;
            }

            newEntries.push({
                id: Math.random().toString(36).substr(2, 9),
                date: dateStr,
                type: type,
                hours: hours
            });
        }
        // Increment day
        loopDate.setUTCDate(loopDate.getUTCDate() + 1);
    }

    setEntries(newEntries);
  }, []);

  // Initialize entries for new timesheets on mount
  useEffect(() => {
    if (!initialTimesheet && entries.length === 0) {
        updateEntriesForRange(periodStart, periodEnd, []);
    }
  }, []); 

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStart = e.target.value;
      setPeriodStart(newStart);
      updateEntriesForRange(newStart, periodEnd, entries);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value;
      setPeriodEnd(newEnd);
      updateEntriesForRange(periodStart, newEnd, entries);
  };

  const handleManualRegenerate = () => {
      // Force regenerate, possibly resetting default hours if we passed empty list? 
      // Current requirement implies we just ensure range is covered. 
      // We pass 'entries' to preserve user edits.
      updateEntriesForRange(periodStart, periodEnd, entries);
  };

  const handleAddEntry = () => {
    const newEntry: TimesheetEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: periodStart,
      type: EntryType.REGULAR,
      hours: 8
    };
    setEntries([...entries, newEntry]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimesheetEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const calculateTotal = () => entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);

  const handleSave = (status: TimesheetStatus) => {
    const timesheet: Timesheet = {
      id: initialTimesheet?.id || Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName,
      periodStart,
      periodEnd,
      status,
      entries,
      rejectionReason: status === TimesheetStatus.DRAFT ? initialTimesheet?.rejectionReason : undefined
    };
    onSave(timesheet);
  };

  // Helper for row colors
  const getRowColor = (type: EntryType) => {
    switch (type) {
      case EntryType.SATURDAY:
      case EntryType.SUNDAY:
        return 'bg-indigo-50 border-indigo-200';
      case EntryType.PUBLIC_HOLIDAY:
        return 'bg-purple-50 border-purple-200';
      case EntryType.LEAVE:
        return 'bg-amber-50 border-amber-200';
      case EntryType.SHIFT_ALLOWANCE:
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
        <div>
            <h2 className="text-xl font-bold text-gray-800">
            {initialTimesheet ? 'Edit Timesheet' : 'New Timesheet'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Log your hours correctly to ensure timely approval.</p>
        </div>
        <div className="flex gap-4 items-end">
            <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase">Start Date</label>
                <input 
                    type="date" 
                    value={periodStart}
                    onChange={handleStartDateChange}
                    className="border rounded p-1 text-sm"
                />
            </div>
            <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase">End Date</label>
                <input 
                    type="date" 
                    value={periodEnd}
                    onChange={handleEndDateChange}
                    className="border rounded p-1 text-sm"
                />
            </div>
            <button 
                onClick={handleManualRegenerate}
                className="mb-0.5 p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                title="Regenerate entries for this date range"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {entries.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No entries yet. Entries are generated based on the date range.</p>
            </div>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className={`p-3 rounded-lg border flex flex-col md:flex-row gap-4 items-center transition-colors ${getRowColor(entry.type)}`}>
              
                {/* Date Picker - kept editable but usually follows range */}
                <div className="w-full md:w-48">
                    <label className="block md:hidden text-xs font-bold text-gray-500 mb-1">Date</label>
                    <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                        className="w-full p-2 text-sm border rounded bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>

                {/* Type Selection */}
                <div className="w-full md:flex-1">
                    <label className="block md:hidden text-xs font-bold text-gray-500 mb-1">Type</label>
                    <div className="relative">
                        <select
                            value={entry.type}
                            onChange={(e) => updateEntry(entry.id, 'type', e.target.value as EntryType)}
                            className="w-full p-2 text-sm border rounded bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700"
                        >
                            {Object.values(EntryType).map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Hours */}
                <div className="w-full md:w-32 flex items-center gap-2">
                    <label className="block md:hidden text-xs font-bold text-gray-500 mb-1">Hours</label>
                    <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hours}
                        onChange={(e) => updateEntry(entry.id, 'hours', e.target.value)}
                        className="w-full p-2 text-sm border rounded bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-right"
                        placeholder="0.0"
                    />
                    <span className="text-sm text-gray-500 hidden md:inline">hrs</span>
                </div>

              <button 
                onClick={() => handleRemoveEntry(entry.id)}
                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Remove Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
             <button
                onClick={handleAddEntry}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
             >
                <Plus className="w-4 h-4" />
                Add Extra Row
             </button>
             <div className="text-gray-600 font-medium bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                Total: <span className="text-xl font-bold text-gray-900 ml-2">{calculateTotal()}</span> hrs
            </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-end items-center gap-3">
            <button
                onClick={onCancel}
                className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={() => handleSave(TimesheetStatus.DRAFT)}
                className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
            >
                <Save className="w-4 h-4" />
                Save Draft
            </button>
            <button
                onClick={() => handleSave(TimesheetStatus.SUBMITTED)}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-200"
            >
                <Send className="w-4 h-4" />
                Submit
            </button>
      </div>
    </div>
  );
};

export default TimesheetEditor;