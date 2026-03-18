
import React, { useState } from 'react';
import { FlatEvent, TaskStatus, EventType, InvitationStatus } from '../types';
import { format, formatISO } from 'date-fns';
import {
  X, Check, ShieldAlert, History, CalendarClock, UserPlus, Users,
  CircleCheck, CircleX, Clock, Pencil, RotateCcw, ArrowLeft,
} from 'lucide-react';

interface EventDetailModalProps {
  event: FlatEvent;
  onClose: () => void;
  onStatusChange: (eventId: string, status: TaskStatus, updates?: Partial<FlatEvent>) => void;
  onUpdate: (eventId: string, updates: Partial<FlatEvent>) => void;
  currentUserId: string;
  flatmates: any[];
}

const inputCls = 'w-full bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl p-3 text-sm font-medium text-[#1C1A3A] focus:border-[#6466C8] focus:bg-white outline-none transition-all placeholder:text-[#C4C2DC]';
const labelCls = 'text-[10px] font-bold text-[#9896C0] uppercase tracking-widest';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  [TaskStatus.SCHEDULED]:         { bg: 'bg-[#EEEDF8]',         text: 'text-[#4F52A0]',  dot: 'bg-[#6466C8]' },
  [TaskStatus.CLAIMED_DONE]:      { bg: 'bg-amber-50',           text: 'text-amber-700',  dot: 'bg-amber-400' },
  [TaskStatus.VERIFIED]:          { bg: 'bg-emerald-50',         text: 'text-emerald-700',dot: 'bg-emerald-500' },
  [TaskStatus.OVERDUE]:           { bg: 'bg-rose-50',            text: 'text-rose-700',   dot: 'bg-rose-500' },
  [TaskStatus.EXTENSION_PENDING]: { bg: 'bg-orange-50',          text: 'text-orange-700', dot: 'bg-orange-400' },
};

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event, onClose, onStatusChange, onUpdate, currentUserId, flatmates,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showExtensionPicker, setShowExtensionPicker] = useState(false);
  const [extensionDate, setExtensionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [editTitle, setEditTitle] = useState(event.title);
  const [editType, setEditType] = useState<EventType>(event.type);
  const [editOwnerId, setEditOwnerId] = useState(event.ownerId);
  const [editStartDate, setEditStartDate] = useState(format(new Date(event.startTime), 'yyyy-MM-dd'));
  const [editStartTime, setEditStartTime] = useState(format(new Date(event.startTime), 'HH:mm'));
  const [editEndDate, setEditEndDate] = useState(format(new Date(event.endTime), 'yyyy-MM-dd'));
  const [editEndTime, setEditEndTime] = useState(format(new Date(event.endTime), 'HH:mm'));
  const [editRecurrence, setEditRecurrence] = useState(event.recurrence || 'Does not repeat');
  const [editDescription, setEditDescription] = useState(event.description || '');
  const [editError, setEditError] = useState('');

  const enterEdit = () => {
    setEditTitle(event.title);
    setEditType(event.type);
    setEditOwnerId(event.ownerId);
    setEditStartDate(format(new Date(event.startTime), 'yyyy-MM-dd'));
    setEditStartTime(format(new Date(event.startTime), 'HH:mm'));
    setEditEndDate(format(new Date(event.endTime), 'yyyy-MM-dd'));
    setEditEndTime(format(new Date(event.endTime), 'HH:mm'));
    setEditRecurrence(event.recurrence || 'Does not repeat');
    setEditDescription(event.description || '');
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setEditError('');
    const newStart = new Date(`${editStartDate}T${editStartTime}:00`);
    const newEnd = new Date(`${editEndDate}T${editEndTime}:00`);
    if (newEnd <= newStart) { setEditError('End must be after start.'); return; }
    onUpdate(event.id, {
      title: editTitle.trim() || event.title,
      type: editType,
      ownerId: editOwnerId,
      startTime: formatISO(newStart),
      endTime: formatISO(newEnd),
      recurrence: editRecurrence === 'Does not repeat' ? undefined : editRecurrence,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleStartDateChange = (val: string) => {
    setEditStartDate(val);
    if (val > editEndDate) setEditEndDate(val);
  };

  const handleStartTimeChange = (val: string) => {
    setEditStartTime(val);
    if (editStartDate === editEndDate) {
      const [h, m] = val.split(':').map(Number);
      setEditEndTime(`${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const isOwner = event.ownerId === currentUserId;
  const canVerify = event.status === TaskStatus.CLAIMED_DONE && !isOwner;
  const canRequestExtension = isOwner && event.status !== TaskStatus.VERIFIED && event.status !== TaskStatus.CLAIMED_DONE;
  const canApproveExtension = !isOwner && event.status === TaskStatus.EXTENSION_PENDING;
  const myInvitation = event.attendees?.find(a => a.mateId === currentUserId);
  const isInvited = !!myInvitation;
  const isMultiDay = format(new Date(event.startTime), 'yyyy-MM-dd') !== format(new Date(event.endTime), 'yyyy-MM-dd');

  const handleRSVP = (status: InvitationStatus) => {
    const updatedAttendees = event.attendees?.map(a =>
      a.mateId === currentUserId ? { ...a, status } : a
    );
    onStatusChange(event.id, event.status, { attendees: updatedAttendees });
  };

  const handleRequestExtension = () => {
    const newDate = new Date(extensionDate);
    newDate.setHours(new Date(event.startTime).getHours());
    onStatusChange(event.id, TaskStatus.EXTENSION_PENDING, { requestedExtensionDate: formatISO(newDate) });
    setShowExtensionPicker(false);
  };

  const handleApproveExtension = () => {
    if (event.requestedExtensionDate) {
      onStatusChange(event.id, TaskStatus.SCHEDULED, {
        startTime: event.requestedExtensionDate,
        endTime: formatISO(new Date(new Date(event.requestedExtensionDate).getTime() + 3_600_000)),
        requestedExtensionDate: undefined,
      });
    }
  };

  const sc = statusConfig[event.status] || statusConfig[TaskStatus.SCHEDULED];
  const owner = flatmates.find(m => m.id === event.ownerId);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] card-shadow-lg">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[#E8E6F4] rounded-full" />
        </div>

        {/* Header */}
        <div className="header-gradient text-white px-5 pt-4 pb-5 shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
                <ArrowLeft size={18} />
              </button>
              <span className="flex-1 text-sm font-bold">Edit Task</span>
              <button
                onClick={handleSaveEdit}
                className="bg-white text-[#4F52A0] px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 hover:bg-white/90"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {event.status}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={enterEdit} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <h2 className="text-lg font-extrabold leading-tight">{event.title}</h2>
              <p className="text-white/60 text-xs mt-1">
                {format(new Date(event.startTime), 'EEE, MMM d · HH:mm')}
                {isMultiDay
                  ? ` → ${format(new Date(event.endTime), 'EEE, MMM d · HH:mm')}`
                  : ` – ${format(new Date(event.endTime), 'HH:mm')}`
                }
              </p>
            </>
          )}
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className={labelCls}>Title</label>
              <input autoFocus className={inputCls} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={editType} onChange={e => setEditType(e.target.value as EventType)}>
                  {Object.values(EventType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Owner</label>
                <select className={inputCls} value={editOwnerId} onChange={e => setEditOwnerId(e.target.value)}>
                  {flatmates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Start</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className={inputCls} value={editStartDate} onChange={e => handleStartDateChange(e.target.value)} />
                <input type="time" className={inputCls} value={editStartTime} onChange={e => handleStartTimeChange(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>End</label>
                {editStartDate !== editEndDate && (
                  <span className="text-[10px] font-bold text-[#6466C8] bg-[#EEEDF8] px-2 py-0.5 rounded-full">Multi-day</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" min={editStartDate} className={inputCls} value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                <input type="time" className={inputCls} value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
              </div>
              {editError && <p className="text-[11px] text-rose-500 font-medium">{editError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Repeat</label>
              <div className="relative">
                <RotateCcw className="absolute left-3 top-3.5 text-[#C4C2DC]" size={13} />
                <select className={`${inputCls} pl-8`} value={editRecurrence} onChange={e => setEditRecurrence(e.target.value)}>
                  <option>Does not repeat</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} h-20 resize-none`}
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Any additional details…"
              />
            </div>

            <button
              onClick={handleSaveEdit}
              className="btn-primary w-full text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={2.5} /> Save Changes
            </button>
          </div>
        ) : (
          /* Detail View */
          <div className="p-5 overflow-y-auto space-y-4">

            {/* Extension pending notice */}
            {event.status === TaskStatus.EXTENSION_PENDING && event.requestedExtensionDate && (
              <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl">
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1">Extension Requested</p>
                <p className="text-xs text-orange-800">
                  Proposed deadline: <span className="font-bold">{format(new Date(event.requestedExtensionDate), 'MMM d, yyyy')}</span>
                </p>
              </div>
            )}

            {/* Invitation RSVP */}
            {isInvited && myInvitation?.status === 'pending' && (
              <div className="bg-[#EEEDF8] p-4 rounded-2xl border border-[#6466C8]/20 space-y-3">
                <div className="flex items-center gap-2 text-[#4F52A0]">
                  <UserPlus size={15} />
                  <span className="text-xs font-bold uppercase tracking-widest">You're invited</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRSVP('accepted')}
                    className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <CircleCheck size={13} /> Accept
                  </button>
                  <button
                    onClick={() => handleRSVP('declined')}
                    className="flex-1 bg-white border border-[#E8E6F4] text-[#6B6991] py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <CircleX size={13} /> Decline
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            {event.description && (
              <div className="space-y-1.5">
                <p className={labelCls}>Notes</p>
                <p className="text-sm text-[#3A3860] leading-relaxed bg-[#F8F7FF] rounded-xl p-3">{event.description}</p>
              </div>
            )}

            {/* Owner + Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-[#F8F7FF] rounded-xl border border-[#E8E6F4]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: owner?.color || '#6466C8', boxShadow: `0 2px 8px ${owner?.color || '#6466C8'}50` }}
                >
                  {owner?.name.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className={`${labelCls} mb-0.5`}>Owner</p>
                  <p className="text-xs font-semibold truncate text-[#1C1A3A]">{owner?.name || 'Unknown'}</p>
                </div>
              </div>

              {event.recurrence ? (
                <div className="flex items-center gap-3 p-3 bg-[#F8F7FF] rounded-xl border border-[#E8E6F4]">
                  <div className="w-9 h-9 rounded-full bg-[#EEEDF8] flex items-center justify-center text-[#6466C8] shrink-0">
                    <History size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className={`${labelCls} mb-0.5`}>Repeats</p>
                    <p className="text-xs font-semibold truncate text-[#1C1A3A]">{event.recurrence}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-[#F8F7FF] rounded-xl border border-[#E8E6F4]">
                  <div className="w-9 h-9 rounded-full bg-[#EEEDF8] flex items-center justify-center text-[#6466C8] shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className={`${labelCls} mb-0.5`}>Type</p>
                    <p className="text-xs font-semibold truncate text-[#1C1A3A]">{event.type}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="space-y-2">
                <p className={`${labelCls} flex items-center gap-1`}>
                  <Users size={10} /> Attendees ({event.attendees.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map(attendee => {
                    const mate = flatmates.find(m => m.id === attendee.mateId);
                    return (
                      <div
                        key={attendee.mateId}
                        className="flex items-center gap-1.5 bg-[#F8F7FF] px-2.5 py-1.5 rounded-full border border-[#E8E6F4] text-[11px] font-semibold text-[#1C1A3A]"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ backgroundColor: mate?.color || '#6466C8' }}
                        >
                          {mate?.name.charAt(0)}
                        </div>
                        <span>{mate?.name}</span>
                        {attendee.status === 'accepted' ? <CircleCheck size={11} className="text-emerald-500" /> :
                         attendee.status === 'declined' ? <CircleX size={11} className="text-rose-500" /> :
                         <Clock size={11} className="text-[#C4C2DC]" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1 pb-1">
              {isOwner && event.status !== TaskStatus.VERIFIED && event.status !== TaskStatus.CLAIMED_DONE && (
                <button
                  onClick={() => onStatusChange(event.id, TaskStatus.CLAIMED_DONE)}
                  className="btn-primary w-full text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Check size={16} strokeWidth={2.5} /> Mark as Done
                </button>
              )}

              {canRequestExtension && (
                <>
                  <button
                    onClick={() => setShowExtensionPicker(!showExtensionPicker)}
                    className="w-full border border-[#E8E6F4] text-[#6B6991] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F8F7FF] transition-all active:scale-95"
                  >
                    <CalendarClock size={16} />
                    {showExtensionPicker ? 'Cancel Request' : 'Request Extension'}
                  </button>
                  {showExtensionPicker && (
                    <div className="p-4 bg-[#F8F7FF] rounded-2xl border border-[#E8E6F4] space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <label className={labelCls}>New Deadline</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={extensionDate}
                        onChange={e => setExtensionDate(e.target.value)}
                      />
                      <button
                        onClick={handleRequestExtension}
                        className="btn-primary w-full text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        Send Request
                      </button>
                    </div>
                  )}
                </>
              )}

              {canApproveExtension && (
                <button
                  onClick={handleApproveExtension}
                  className="w-full bg-amber-500 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-all active:scale-95"
                  style={{ boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}
                >
                  <Check size={16} strokeWidth={2.5} /> Approve Extension
                </button>
              )}

              {canVerify && (
                <button
                  onClick={() => onStatusChange(event.id, TaskStatus.VERIFIED)}
                  className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
                >
                  <ShieldAlert size={16} /> Verify Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailModal;
