
export enum EventType {
  CHORE = 'Chore',
  BILL = 'Bill',
  VISITOR = 'Visitor',
  AVAILABILITY = 'Away / Availability'
}

export enum TaskStatus {
  SCHEDULED = 'Scheduled',
  DUE = 'Due',
  CLAIMED_DONE = 'Claimed Done',
  VERIFIED = 'Verified',
  OVERDUE = 'Overdue',
  EXTENSION_PENDING = 'Extension Pending'
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Attendee {
  mateId: string;
  status: InvitationStatus;
}

export interface Flatmate {
  id: string;
  name: string;
  avatar: string;
  color?: string; // Hex color for the icon-based avatar
  score: number;
  role?: 'flatmaster' | 'resident';
}

export interface UserProfile {
  name: string;
  color: string;
}

export interface FlatSettings {
  flatName: string;
  flatmateCount: number;
  sprintCycleDays: number;
  tenancyStart: string;
  tenancyEnd: string;
}

export interface FlatEvent {
  id: string;
  title: string;
  type: EventType;
  ownerId: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: TaskStatus;
  description?: string;
  recurrence?: string;
  verifiedById?: string;
  requestedExtensionDate?: string; 
  attendees?: Attendee[]; // New: for invitations
}

export type ViewType = 'calendar' | 'activity' | 'stats' | 'setup' | 'profile';
export type CalendarViewMode = 'week' | 'month';
