
import React from 'react';
import { FlatEvent, TaskStatus, Flatmate } from '../types';
import { format } from 'date-fns';
import { EVENT_COLORS, EVENT_ICONS } from '../constants';
import { CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface EventListProps {
  events: FlatEvent[];
  flatmates: Flatmate[];
  onEventClick: (event: FlatEvent) => void;
}

const EventList: React.FC<EventListProps> = ({ events, flatmates, onEventClick }) => {
  const getOwnerName = (id: string) => flatmates.find(f => f.id === id)?.name || 'Unknown';
  const getOwnerAvatar = (id: string) => flatmates.find(f => f.id === id)?.avatar;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-sm">No scheduled items for this day.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => onEventClick(event)}
          className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden flex cursor-pointer hover:border-[#6264A7] transition-all"
        >
          <div 
            className="w-1.5 shrink-0" 
            style={{ backgroundColor: EVENT_COLORS[event.type].replace('E2E1F1', '#6264A7') }} 
          />
          <div className="flex-1 p-3 flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {EVENT_ICONS[event.type]}
                <h3 className="text-sm font-bold text-[#242424]">{event.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#616161]">
                {/* Using new Date() instead of parseISO */}
                <span className="font-semibold">{format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <img src={getOwnerAvatar(event.ownerId)} className="w-4 h-4 rounded-full border border-gray-100" />
                  <span>{getOwnerName(event.ownerId)}</span>
                </div>
              </div>
              
              <div className="mt-2">
                {event.status === TaskStatus.VERIFIED ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#DFF6DD] text-[#107C10] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                ) : event.status === TaskStatus.OVERDUE ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#FDE7E9] text-[#A4262C] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    <AlertCircle size={10} /> Overdue
                  </span>
                ) : event.status === TaskStatus.CLAIMED_DONE ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#E1DFDD] text-[#323130] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    <Clock size={10} /> Verification Pending
                  </span>
                ) : null}
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
