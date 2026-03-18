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

Deno.serve(async () => {
  const now  = new Date();
  const soon = new Date(now.getTime() + 10 * 60 * 1000); // 10 min window

  // Find SCHEDULED events starting within the next 10 minutes that haven't been notified yet
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, owner_id, attendees, start_time')
    .eq('status', 'SCHEDULED')
    .is('push_notified_at', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', soon.toISOString());

  if (error) return new Response(error.message, { status: 500 });
  if (!events?.length) return new Response('No due events', { status: 200 });

  // Collect all user IDs to notify (owner + accepted/pending attendees)
  const results: string[] = [];

  for (const event of events) {
    const minutesUntil = Math.round(
      (new Date(event.start_time).getTime() - now.getTime()) / 60_000,
    );
    const body = minutesUntil <= 1 ? 'Due now!' : `Due in ${minutesUntil} min`;

    // Build recipient set: owner + attendees
    const recipientIds = new Set<string>([event.owner_id]);
    if (Array.isArray(event.attendees)) {
      for (const a of event.attendees) {
        if (a.mateId) recipientIds.add(a.mateId);
      }
    }

    // Fetch subscriptions for all recipients
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', [...recipientIds]);

    if (!subs?.length) {
      // Mark notified even if no subs so we don't retry endlessly
      await supabase.from('events')
        .update({ push_notified_at: now.toISOString() })
        .eq('id', event.id);
      continue;
    }

    const payload = JSON.stringify({ title: event.title, body, eventId: event.id });

    const sends = subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (e: any) {
        // 410 Gone = subscription expired, remove it
        if (e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.allSettled(sends);

    // Mark event as notified so the cron doesn't fire again
    await supabase.from('events')
      .update({ push_notified_at: now.toISOString() })
      .eq('id', event.id);

    results.push(`Notified: ${event.title} → ${subs.length} device(s)`);
  }

  return new Response(results.join('\n') || 'Done', { status: 200 });
});
