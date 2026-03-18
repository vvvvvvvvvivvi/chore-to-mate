import { createClient } from 'npm:@supabase/supabase-js@2';
import webPush from 'npm:web-push';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webPush.setVapidDetails(
  `mailto:${Deno.env.get('VAPID_EMAIL')}`,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

// ─── Send a push to all subscriptions for a set of user IDs ──

async function notifyUsers(
  recipientIds: string[],
  payload: string,
  now: Date,
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipientIds);

  if (!subs?.length) return 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (e: any) {
        if (e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }),
  );

  return subs.length;
}

function recipients(event: any): string[] {
  const ids = new Set<string>([event.owner_id]);
  if (Array.isArray(event.attendees)) {
    for (const a of event.attendees) if (a.mateId) ids.add(a.mateId);
  }
  return [...ids];
}

// ─── Main handler ─────────────────────────────────────────

Deno.serve(async () => {
  const now = new Date();
  const results: string[] = [];

  // ── 1. Visitor events: notify 1 day ahead ───────────────
  // Window: events starting between 23h45m and 24h15m from now
  const dayLo = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000);
  const dayHi = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000);

  const { data: visitorEvents } = await supabase
    .from('events')
    .select('id, title, owner_id, attendees, start_time')
    .eq('type', 'Visitor')
    .eq('status', 'Scheduled')
    .is('push_notified_day_at', null)
    .gte('start_time', dayLo.toISOString())
    .lte('start_time', dayHi.toISOString());

  for (const event of visitorEvents ?? []) {
    const payload = JSON.stringify({
      title: `Visitor tomorrow: ${event.title}`,
      body: 'You have a visitor arriving tomorrow.',
      eventId: event.id,
    });
    const sent = await notifyUsers(recipients(event), payload, now);
    await supabase.from('events')
      .update({ push_notified_day_at: now.toISOString() })
      .eq('id', event.id);
    results.push(`[Day] ${event.title} → ${sent} device(s)`);
  }

  // ── 2. All events: notify 1 hour ahead ──────────────────
  // Window: events starting between 45m and 75m from now
  const hourLo = new Date(now.getTime() + 45 * 60 * 1000);
  const hourHi = new Date(now.getTime() + 75 * 60 * 1000);

  const { data: hourEvents } = await supabase
    .from('events')
    .select('id, title, type, owner_id, attendees, start_time')
    .eq('status', 'Scheduled')
    .is('push_notified_at', null)
    .gte('start_time', hourLo.toISOString())
    .lte('start_time', hourHi.toISOString());

  for (const event of hourEvents ?? []) {
    const isVisitor = event.type === 'Visitor';
    const payload = JSON.stringify({
      title: isVisitor ? `Visitor in 1 hour: ${event.title}` : event.title,
      body: isVisitor ? 'Your visitor arrives in about an hour.' : 'Due in about 1 hour.',
      eventId: event.id,
    });
    const sent = await notifyUsers(recipients(event), payload, now);
    await supabase.from('events')
      .update({ push_notified_at: now.toISOString() })
      .eq('id', event.id);
    results.push(`[Hour] ${event.title} → ${sent} device(s)`);
  }

  return new Response(results.join('\n') || 'No events to notify', { status: 200 });
});
