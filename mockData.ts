
import { Flatmate, FlatEvent, EventType, TaskStatus } from './types';
import { addDays, formatISO } from 'date-fns';

// Using native Date for startOfToday and setHours as they are missing in the current environment's date-fns
const today = new Date();
today.setHours(0, 0, 0, 0);

const setHoursHelper = (date: Date, hours: number) => {
  const d = new Date(date);
  d.setHours(hours, 0, 0, 0);
  return d;
};

export const MOCK_FLATMATES: Flatmate[] = [
  { id: '1', name: 'Alex', avatar: 'https://picsum.photos/seed/alex/100', score: 88 },
  { id: '2', name: 'Jordan', avatar: 'https://picsum.photos/seed/jordan/100', score: 92 },
  { id: '3', name: 'Sam', avatar: 'https://picsum.photos/seed/sam/100', score: 75 },
  { id: '4', name: 'Taylor', avatar: 'https://picsum.photos/seed/taylor/100', score: 95 }
];

export const MOCK_EVENTS: FlatEvent[] = [
  {
    id: 'e1',
    title: 'Kitchen Deep Clean',
    type: EventType.CHORE,
    ownerId: '1',
    startTime: formatISO(setHoursHelper(today, 10)),
    endTime: formatISO(setHoursHelper(today, 11)),
    status: TaskStatus.DUE,
    description: 'Scrub all surfaces, empty toaster crumbs, clean microwave.',
    recurrence: 'Weekly'
  },
  {
    id: 'e2',
    title: 'Electricity Bill',
    type: EventType.BILL,
    ownerId: '2',
    startTime: formatISO(setHoursHelper(today, 14)),
    endTime: formatISO(setHoursHelper(today, 15)),
    status: TaskStatus.SCHEDULED,
    description: 'Due for payment. Split 4 ways.'
  },
  {
    id: 'e3',
    title: 'Sam Away (Weekend)',
    type: EventType.AVAILABILITY,
    ownerId: '3',
    startTime: formatISO(addDays(today, 1)),
    endTime: formatISO(addDays(today, 3)),
    status: TaskStatus.SCHEDULED
  },
  {
    id: 'e4',
    title: 'Take out Bins',
    type: EventType.CHORE,
    ownerId: '4',
    startTime: formatISO(setHoursHelper(addDays(today, -1), 20)),
    endTime: formatISO(setHoursHelper(addDays(today, -1), 21)),
    status: TaskStatus.VERIFIED,
    verifiedById: '1'
  },
  {
    id: 'e5',
    title: 'Bathroom Scrub',
    type: EventType.CHORE,
    ownerId: '3',
    startTime: formatISO(setHoursHelper(addDays(today, -2), 9)),
    endTime: formatISO(setHoursHelper(addDays(today, -2), 10)),
    status: TaskStatus.OVERDUE,
    description: 'Clean shower glass and bleach floors.'
  }
];
