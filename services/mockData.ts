import { Timesheet, TimesheetStatus, User, UserRole, EntryType } from '../types';

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Alice Employee', 
    role: UserRole.EMPLOYEE, 
    avatar: 'https://picsum.photos/id/64/100/100',
    managerId: 'u2' // Reports to Bob
  },
  { 
    id: 'u2', 
    name: 'Bob Manager', 
    role: UserRole.MANAGER, 
    avatar: 'https://picsum.photos/id/91/100/100',
    managerId: 'u3' // Reports to Carol
  },
  { 
    id: 'u3', 
    name: 'Carol HR', 
    role: UserRole.HR, 
    avatar: 'https://picsum.photos/id/177/100/100' 
  },
];

const today = new Date();
const lastWeek = new Date(today);
lastWeek.setDate(today.getDate() - 7);

export const INITIAL_TIMESHEETS: Timesheet[] = [
  {
    id: 't1',
    employeeId: 'u1',
    employeeName: 'Alice Employee',
    periodStart: lastWeek.toISOString().split('T')[0],
    periodEnd: today.toISOString().split('T')[0],
    status: TimesheetStatus.SUBMITTED,
    entries: [
      { id: 'e1', date: lastWeek.toISOString().split('T')[0], type: EntryType.REGULAR, hours: 8 },
      { id: 'e2', date: new Date(lastWeek.getTime() + 86400000).toISOString().split('T')[0], type: EntryType.REGULAR, hours: 8 },
      { id: 'e3', date: new Date(lastWeek.getTime() + 86400000 * 2).toISOString().split('T')[0], type: EntryType.LEAVE, hours: 8 },
    ],
  },
  {
    id: 't2',
    employeeId: 'u1',
    employeeName: 'Alice Employee',
    periodStart: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
    periodEnd: new Date(today.getTime() + 86400000 * 7).toISOString().split('T')[0],
    status: TimesheetStatus.DRAFT,
    entries: [],
  },
  {
    id: 't3',
    employeeId: 'u2',
    employeeName: 'Bob Manager',
    periodStart: lastWeek.toISOString().split('T')[0],
    periodEnd: today.toISOString().split('T')[0],
    status: TimesheetStatus.DRAFT,
    entries: [
        { id: 'e4', date: lastWeek.toISOString().split('T')[0], type: EntryType.REGULAR, hours: 8 },
    ],
  }
];