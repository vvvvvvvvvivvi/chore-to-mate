import { supabase } from './supabase';
import { FlatEvent, FlatSettings, Flatmate, UserProfile } from '../types';

// ─── Auth ─────────────────────────────────────────────────

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

// ─── Profile ──────────────────────────────────────────────

export const upsertProfile = (userId: string, profile: UserProfile) =>
  supabase.from('profiles').upsert({ id: userId, name: profile.name, color: profile.color });

// ─── Push subscriptions ───────────────────────────────────

export const deletePushSubscription = (endpoint: string) =>
  supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

// ─── Onboarding: create a new flat (via secure RPC) ──────

export const createFlatAndProfile = async (
  _userId: string,
  profile: UserProfile,
  flatName: string,
  sprintCycleDays: number,
  tenancyStart: string,
) => {
  const { data, error } = await supabase.rpc('create_flat_and_join', {
    p_flat_name:         flatName,
    p_sprint_cycle_days: sprintCycleDays,
    p_tenancy_start:     tenancyStart,
    p_profile_name:      profile.name,
    p_profile_color:     profile.color,
  });

  if (error) throw error;
  return data as { id: string; name: string; sprint_cycle_days: number; tenancy_start: string };
};

// ─── Onboarding: join via invite code (via secure RPC) ───

export const joinWithCode = async (_userId: string, profile: UserProfile, code: string) => {
  const { data, error } = await supabase.rpc('join_flat_with_code', {
    p_code:          code,
    p_profile_name:  profile.name,
    p_profile_color: profile.color,
  });

  if (error) throw new Error(error.message);
  return data as { id: string; name: string; sprint_cycle_days: number; tenancy_start: string };
};

// ─── Load current user's flat ─────────────────────────────

export const loadMyFlat = async (userId: string) => {
  const { data } = await supabase
    .from('flat_memberships')
    .select('role, flat_id, flats(id, name, sprint_cycle_days, tenancy_start)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return data;
};

// ─── Load flatmates ───────────────────────────────────────

export const loadFlatmates = async (flatId: string): Promise<Flatmate[]> => {
  const { data: memberships } = await supabase
    .from('flat_memberships')
    .select('user_id, role, score')
    .eq('flat_id', flatId);

  if (!memberships?.length) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, color')
    .in('id', memberships.map(m => m.user_id));

  return memberships.map((m: any) => {
    const profile = profiles?.find((p: any) => p.id === m.user_id);
    return {
      id: m.user_id,
      name: profile?.name ?? 'Unknown',
      color: profile?.color ?? '#6466C8',
      role: m.role as 'flatmaster' | 'resident',
      score: m.score,
      avatar: '',
    };
  });
};

// ─── Load events ──────────────────────────────────────────

export const loadEvents = async (flatId: string): Promise<FlatEvent[]> => {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('flat_id', flatId)
    .order('start_time');

  return (data || []).map(dbToEvent);
};

// ─── Update flat settings ─────────────────────────────────

export const updateFlat = (flatId: string, settings: Partial<FlatSettings>) =>
  supabase.from('flats').update({
    name: settings.flatName,
    sprint_cycle_days: settings.sprintCycleDays,
    tenancy_start: settings.tenancyStart,
  }).eq('id', flatId);

// ─── Invite code ──────────────────────────────────────────

export const getInviteCode = async (flatId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('flat_id', flatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.code ?? null;
};

// ─── Create event ─────────────────────────────────────────

export const createEvent = async (flatId: string, event: Omit<FlatEvent, 'id'>): Promise<FlatEvent> => {
  const { data, error } = await supabase
    .from('events')
    .insert({
      flat_id:     flatId,
      title:       event.title,
      type:        event.type,
      owner_id:    event.ownerId,
      start_time:  event.startTime,
      end_time:    event.endTime,
      status:      event.status,
      description: event.description ?? null,
      recurrence:  event.recurrence  ?? null,
      attendees:   event.attendees   ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return dbToEvent(data);
};

// ─── Update event ─────────────────────────────────────────

export const updateEvent = async (eventId: string, updates: Partial<FlatEvent>): Promise<FlatEvent> => {
  const patch: Record<string, unknown> = {};
  if (updates.title                    !== undefined) patch.title                     = updates.title;
  if (updates.type                     !== undefined) patch.type                      = updates.type;
  if (updates.ownerId                  !== undefined) patch.owner_id                  = updates.ownerId;
  if (updates.startTime                !== undefined) patch.start_time                = updates.startTime;
  if (updates.endTime                  !== undefined) patch.end_time                  = updates.endTime;
  if (updates.status                   !== undefined) patch.status                    = updates.status;
  if (updates.description              !== undefined) patch.description               = updates.description;
  if (updates.recurrence               !== undefined) patch.recurrence                = updates.recurrence;
  if (updates.attendees                !== undefined) patch.attendees                 = updates.attendees;
  if (updates.verifiedById             !== undefined) patch.verified_by_id            = updates.verifiedById;
  if (updates.requestedExtensionDate   !== undefined) patch.requested_extension_date  = updates.requestedExtensionDate;

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return dbToEvent(data);
};

// ─── Realtime subscription ────────────────────────────────

export const subscribeToEvents = (flatId: string, onUpdate: () => void) =>
  supabase
    .channel(`flat-events-${flatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `flat_id=eq.${flatId}` }, onUpdate)
    .subscribe();

// ─── Helpers ──────────────────────────────────────────────

const dbToEvent = (row: any): FlatEvent => ({
  id:                     row.id,
  title:                  row.title,
  type:                   row.type,
  ownerId:                row.owner_id,
  startTime:              row.start_time,
  endTime:                row.end_time,
  status:                 row.status,
  description:            row.description          ?? undefined,
  recurrence:             row.recurrence           ?? undefined,
  verifiedById:           row.verified_by_id       ?? undefined,
  requestedExtensionDate: row.requested_extension_date ?? undefined,
  attendees:              row.attendees            ?? [],
});

