
import React from 'react';
import { EventType } from './types';
import { ShieldCheck, Receipt, UserPlus, Home } from 'lucide-react';

export const TEAMS_PURPLE = '#464775';
export const TEAMS_LIGHT_PURPLE = '#6264A7';
export const TEAMS_BG = '#F5F5F5';
export const TEAMS_TEXT = '#242424';
export const TEAMS_BORDER = '#EDEBE9';

export const AVATAR_COLORS = [
  '#6264A7', // Teams Purple
  '#0078D4', // Microsoft Blue
  '#107C10', // Office Green
  '#D83B01', // Office Orange
  '#A4262C', // Dark Red
  '#008272', // Teal
  '#8764B8', // Lavender
];

export const EVENT_COLORS: Record<EventType, string> = {
  [EventType.CHORE]: '#E2E1F1', // Light Purple
  [EventType.BILL]: '#FDE7E9',  // Light Red
  [EventType.VISITOR]: '#DFF6DD', // Light Green
  [EventType.AVAILABILITY]: '#FFF4CE' // Light Yellow
};

export const EVENT_INDICATOR_COLORS: Record<EventType, string> = {
  [EventType.CHORE]: '#6264A7',
  [EventType.BILL]: '#A4262C',
  [EventType.VISITOR]: '#107C10',
  [EventType.AVAILABILITY]: '#986F0B'
};

export const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  [EventType.CHORE]: <ShieldCheck size={16} className="text-[#6264A7]" />,
  [EventType.BILL]: <Receipt size={16} className="text-[#A4262C]" />,
  [EventType.VISITOR]: <UserPlus size={16} className="text-[#107C10]" />,
  [EventType.AVAILABILITY]: <Home size={16} className="text-[#986F0B]" />
};
