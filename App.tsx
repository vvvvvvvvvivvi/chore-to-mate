
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import CalendarRibbon from './components/CalendarRibbon';
import MonthlyView from './components/MonthlyView';
import EventList from './components/EventList';
import TimeBlockedView from './components/TimeBlockedView';
import EventDetailModal from './components/EventDetailModal';
import AddTaskModal from './components/AddTaskModal';
import AnalyticsView from './components/AnalyticsView';
import SetupView from './components/SetupView';
import UserSettingsView from './components/UserSettingsView';
import BottomNav from './components/BottomNav';
import OnboardingWizard from './components/OnboardingWizard';
import LoginView from './components/LoginView';
import { ViewType, FlatEvent, TaskStatus, CalendarViewMode, FlatSettings, UserProfile, Flatmate } from './types';
import { differenceInWeeks, format } from 'date-fns';
import { Plus, Filter } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  loadMyFlat, loadFlatmates, loadEvents,
  createEvent, updateEvent,
  updateFlat, upsertProfile,
  getInviteCode, subscribeToEvents,
  signOut,
} from './lib/db';
import { registerServiceWorker, subscribeToPush, isPushSupported, currentPermission } from './lib/pushNotifications';

const DEFAULT_SETTINGS: FlatSettings = {
  flatName: '',
  flatmateCount: 0,
  sprintCycleDays: 7,
  tenancyStart: new Date().toISOString().split('T')[0],
  tenancyEnd: '',
};

const App: React.FC = () => {
  // ── Auth & loading ───────────────────────────────────────
  const [session, setSession]         = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // ── Flat & user identity ─────────────────────────────────
  const [flatId, setFlatId]               = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [flatmates, setFlatmates]         = useState<Flatmate[]>([]);
  const [userProfile, setUserProfile]     = useState<UserProfile>({ name: '', color: '#6466C8' });
  const [flatSettings, setFlatSettings]   = useState<FlatSettings>(DEFAULT_SETTINGS);
  const [inviteCode, setInviteCode]       = useState<string | null>(null);

  // ── App state ────────────────────────────────────────────
  const [currentView, setCurrentView]     = useState<ViewType>('calendar');
  const [calendarMode, setCalendarMode]   = useState<CalendarViewMode>('week');
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [events, setEvents]               = useState<FlatEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FlatEvent | null>(null);
  const [isAddingTask, setIsAddingTask]   = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [activityFilter, setActivityFilter] = useState<'sprint' | 'all'>('sprint');

  const channelRef = useRef<any>(null);

  // ── Push notifications ───────────────────────────────────
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // ── Load all flat data after auth ────────────────────────
  const loadUserData = async (userId: string) => {
    const membership = await loadMyFlat(userId);
    if (!membership) {
      setNeedsOnboarding(true);
      setAuthLoading(false);
      return;
    }

    const flat = membership.flats as any;
    setFlatId(flat.id);
    setFlatSettings({
      flatName:         flat.name,
      flatmateCount:    0,
      sprintCycleDays:  flat.sprint_cycle_days,
      tenancyStart:     flat.tenancy_start,
      tenancyEnd:       '',
    });

    const [mates, evts, code] = await Promise.all([
      loadFlatmates(flat.id),
      loadEvents(flat.id),
      getInviteCode(flat.id),
    ]);

    setFlatmates(mates);
    setEvents(evts);
    setInviteCode(code);

    const me = mates.find(m => m.id === userId);
    if (me) setUserProfile({ name: me.name, color: me.color || '#6466C8' });

    // Realtime: refresh events on any change
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = subscribeToEvents(flat.id, async () => {
      const updated = await loadEvents(flat.id);
      setEvents(updated);
    });

    setNeedsOnboarding(false);
    setAuthLoading(false);
  };

  // ── Register SW + show push prompt once flat is loaded ───
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!flatId || !currentUserId) return;
    if (!isPushSupported()) return;
    const perm = currentPermission();
    if (perm === 'default') setShowPushPrompt(true); // not yet asked
  }, [flatId, currentUserId]);

  const handleEnablePush = async () => {
    setShowPushPrompt(false);
    await subscribeToPush(currentUserId);
  };

  // ── Auth listener ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setCurrentUserId(session.user.id);
        loadUserData(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentUserId(session.user.id);
        loadUserData(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ── Sprint helpers ───────────────────────────────────────
  const getSprintNumber = (dateString: string) => {
    try {
      const date  = new Date(dateString);
      const start = new Date(flatSettings.tenancyStart);
      if (isNaN(date.getTime()) || isNaN(start.getTime())) return 1;
      return differenceInWeeks(date, start) + 1;
    } catch { return 1; }
  };
  const currentSprint = getSprintNumber(new Date().toISOString());

  // ── Derived event lists ──────────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e => {
      const owner = flatmates.find(m => m.id === e.ownerId)?.name.toLowerCase() || '';
      return e.title.toLowerCase().includes(q) || owner.includes(q);
    });
  }, [events, searchQuery, flatmates]);

  const dailyEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      try {
        const eventStart = new Date(event.startTime);
        const eventEnd   = new Date(event.endTime);
        const dayStart   = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd     = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);
        return eventStart <= dayEnd && eventEnd >= dayStart;
      } catch { return false; }
    });
  }, [filteredEvents, selectedDate]);

  const activityFeed = useMemo(() => {
    let feed = filteredEvents;
    if (activityFilter === 'sprint') feed = feed.filter(e => getSprintNumber(e.startTime) === currentSprint);
    return [...feed].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [filteredEvents, activityFilter, currentSprint]);

  const notificationCount = useMemo(() => {
    return events.filter(e => {
      const isPendingInvite        = e.attendees?.some(a => a.mateId === currentUserId && a.status === 'pending');
      const needsVerification      = e.status === TaskStatus.CLAIMED_DONE && e.ownerId !== currentUserId;
      const needsExtensionApproval = e.status === TaskStatus.EXTENSION_PENDING && e.ownerId !== currentUserId;
      return isPendingInvite || needsVerification || needsExtensionApproval;
    }).length;
  }, [events, currentUserId]);

  // ── Event handlers ───────────────────────────────────────
  const handleStatusChange = async (eventId: string, status: TaskStatus, updates: Partial<FlatEvent> = {}) => {
    const merged = { ...updates, status };
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...merged } : e));
    setSelectedEvent(prev => prev?.id === eventId ? { ...prev, ...merged } : prev);
    await updateEvent(eventId, merged);
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<FlatEvent>) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));
    setSelectedEvent(prev => prev?.id === eventId ? { ...prev!, ...updates } : prev);
    await updateEvent(eventId, updates);
  };

  const handleAddTask = async (newEvent: FlatEvent) => {
    if (!flatId) return;
    const { id, ...rest } = newEvent;
    const saved = await createEvent(flatId, rest);
    setEvents(prev => [...prev, saved]);
  };

  const handleSaveSettings = async (settings: FlatSettings) => {
    setFlatSettings(settings);
    if (flatId) await updateFlat(flatId, settings);
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    setFlatmates(prev => prev.map(m => m.id === currentUserId ? { ...m, ...profile } : m));
    await upsertProfile(currentUserId, profile);
  };

  const toggleCalendarMode = () => setCalendarMode(prev => prev === 'week' ? 'month' : 'week');

  // ── Loading screen ───────────────────────────────────────
  if (authLoading) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#4F52A0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Auth gate ────────────────────────────────────────────
  if (!session) return <LoginView onAuth={() => {}} />;

  // ── Onboarding gate ──────────────────────────────────────
  if (needsOnboarding) return (
    <OnboardingWizard
      userId={session.user.id}
      onComplete={() => {
        setAuthLoading(true);
        loadUserData(session.user.id);
      }}
    />
  );

  // ── Main app ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">

      <Header
        viewMode={calendarMode}
        onToggleViewMode={toggleCalendarMode}
        showToggle={currentView === 'calendar'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSetup={currentView === 'setup'}
        flatName={flatSettings.flatName}
        onMenuClick={() => setCurrentView(currentView === 'setup' ? 'calendar' : 'setup')}
      />

      {/* Avatar shortcut */}
      {currentView !== 'profile' && (
        <button
          onClick={() => setCurrentView('profile')}
          className="fixed top-3.5 left-14 z-[60] transition-all active:scale-90"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: userProfile.color, boxShadow: `0 2px 8px ${userProfile.color}60` }}
          >
            {userProfile.name.charAt(0)}
          </div>
        </button>
      )}

      <main className="flex-1 mt-14 relative overflow-x-hidden pb-28">

        {/* Push notification prompt */}
        {showPushPrompt && (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 card-shadow animate-in slide-in-from-top-2 duration-300">
            <span className="text-xl shrink-0">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1C1A3A]">Enable notifications</p>
              <p className="text-[10px] text-[#9896C0]">Get reminded when tasks are due</p>
            </div>
            <button
              onClick={handleEnablePush}
              className="btn-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 active:scale-95 transition-all"
            >
              Enable
            </button>
            <button
              onClick={() => setShowPushPrompt(false)}
              className="text-[#C4C2DC] hover:text-[#6B6991] transition-colors shrink-0 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Calendar */}
        {currentView === 'calendar' && (
          <>
            {calendarMode === 'week' ? (
              <>
                <CalendarRibbon selectedDate={selectedDate} onDateChange={setSelectedDate} events={filteredEvents} />
                <div className="mt-36">
                  <TimeBlockedView events={dailyEvents} flatmates={flatmates} onEventClick={setSelectedEvent} />
                </div>
              </>
            ) : (
              <div className="md:flex md:flex-row md:h-[calc(100vh-56px)]">
                <div className="md:aspect-square md:h-full md:shrink-0 md:overflow-hidden">
                  <MonthlyView selectedDate={selectedDate} onDateChange={setSelectedDate} events={filteredEvents} />
                </div>
                <div className="flex-1 md:overflow-y-auto md:bg-[#F5F5F7]">
                  <div className="hidden md:flex items-baseline justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0">
                    <div>
                      <p className="text-base font-bold text-gray-800">{format(selectedDate, 'EEEE, MMMM d')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dailyEvents.length === 0 ? 'Nothing scheduled' : `${dailyEvents.length} event${dailyEvents.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddingTask(true)}
                      className="btn-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Task
                    </button>
                  </div>
                  <div className="md:p-4">
                    <EventList events={dailyEvents} flatmates={flatmates} onEventClick={setSelectedEvent} />
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsAddingTask(true)}
              className="btn-primary fixed bottom-24 right-4 text-white rounded-2xl flex items-center justify-center z-40 active:scale-95 transition-all"
              style={{ width: 52, height: 52 }}
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Stats */}
        {currentView === 'stats' && (
          <div className="animate-in fade-in duration-300">
            <div className="header-gradient text-white px-4 pt-6 pb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Overview</p>
              <h1 className="text-2xl font-extrabold">Flat Insights</h1>
            </div>
            <AnalyticsView flatmates={flatmates} events={events} />
          </div>
        )}

        {/* Setup */}
        {currentView === 'setup' && (
          <SetupView
            settings={flatSettings}
            onSave={handleSaveSettings}
            profile={userProfile}
            inviteCode={inviteCode}
            onNavigateToProfile={() => setCurrentView('profile')}
            onBack={() => setCurrentView('calendar')}
            onSignOut={async () => { await signOut(); setSession(null); }}
          />
        )}

        {/* Profile */}
        {currentView === 'profile' && (
          <UserSettingsView
            profile={userProfile}
            onSave={handleSaveProfile}
            onBack={() => setCurrentView('calendar')}
            onNavigateToSetup={() => setCurrentView('setup')}
          />
        )}

        {/* Activity */}
        {currentView === 'activity' && (
          <div className="flex flex-col animate-in fade-in duration-300">
            <div className="header-gradient text-white px-4 pt-6 pb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Operational Feed</p>
              <div className="flex items-end justify-between">
                <h1 className="text-2xl font-extrabold">Activity</h1>
                <div className="flex bg-white/10 rounded-xl p-0.5 text-[10px] font-bold uppercase mb-0.5">
                  <button onClick={() => setActivityFilter('sprint')} className={`px-3 py-1.5 rounded-lg transition-all ${activityFilter === 'sprint' ? 'bg-white text-[#4F52A0]' : 'text-white/70'}`}>Sprint</button>
                  <button onClick={() => setActivityFilter('all')}    className={`px-3 py-1.5 rounded-lg transition-all ${activityFilter === 'all'    ? 'bg-white text-[#4F52A0]' : 'text-white/70'}`}>All</button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-3 card-shadow">
                    <Filter size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">No activity yet</p>
                  <p className="text-xs text-gray-300 mt-0.5">Add tasks to see them here</p>
                </div>
              ) : (
                activityFeed.map(event => {
                  const isPendingInvite        = event.attendees?.some(a => a.mateId === currentUserId && a.status === 'pending');
                  const needsVerification      = event.status === TaskStatus.CLAIMED_DONE && event.ownerId !== currentUserId;
                  const needsExtensionApproval = event.status === TaskStatus.EXTENSION_PENDING && event.ownerId !== currentUserId;
                  const isActionable           = isPendingInvite || needsVerification || needsExtensionApproval || event.ownerId === currentUserId;

                  const sprint     = getSprintNumber(event.startTime);
                  const ownerName  = flatmates.find(m => m.id === event.ownerId)?.name || 'Unknown';
                  const ownerColor = flatmates.find(m => m.id === event.ownerId)?.color || '#6466C8';

                  const tag = isPendingInvite ? 'Invitation'
                    : needsVerification      ? 'Needs Verify'
                    : needsExtensionApproval ? 'Extension'
                    : event.status === TaskStatus.VERIFIED ? 'Verified'
                    : 'Logged';

                  const tagColor = isPendingInvite        ? 'bg-indigo-50 text-indigo-600'
                    : needsVerification      ? 'bg-amber-50 text-amber-600'
                    : needsExtensionApproval ? 'bg-orange-50 text-orange-600'
                    : event.status === TaskStatus.VERIFIED ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-500';

                  return (
                    <div key={event.id} className={`bg-white rounded-2xl p-4 card-shadow flex items-center gap-3 ${!isActionable ? 'opacity-40' : ''}`}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: ownerColor }}>
                        {ownerName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
                          <span className="text-[9px] text-gray-300 font-medium">Sprint {sprint}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 truncate">{event.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">by {ownerName}</p>
                      </div>
                      {isActionable && (isPendingInvite || needsVerification || needsExtensionApproval) && (
                        <button onClick={() => setSelectedEvent(event)} className="btn-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all shrink-0">
                          Review
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStatusChange={handleStatusChange}
          onUpdate={handleUpdateEvent}
          currentUserId={currentUserId}
          flatmates={flatmates}
        />
      )}

      {isAddingTask && (
        <AddTaskModal
          onClose={() => setIsAddingTask(false)}
          onAdd={handleAddTask}
          flatmates={flatmates}
          selectedDate={selectedDate}
          currentUserId={currentUserId}
        />
      )}

      <BottomNav currentView={currentView} onViewChange={setCurrentView} notificationCount={notificationCount} />
    </div>
  );
};

export default App;
