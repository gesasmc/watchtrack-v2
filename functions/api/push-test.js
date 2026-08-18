import { sendWebPush } from '../_lib/webpush.js';

const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const family = request.headers.get('x-watchtrack-family') || '';
  if (!env.DB) return reply({ error: 'D1 binding DB fehlt' }, 503);
  if (!env.VAPID_PRIVATE_KEY) return reply({ error: 'VAPID_PRIVATE_KEY fehlt' }, 503);
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(family)) return reply({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const data = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE family_key = ?').bind(family).all();
  let sent = 0;
  for (const row of data.results || []) {
    const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
    try {
      const response = await sendWebPush(subscription, { title: 'WatchTrack', body: 'Mitteilungen funktionieren 🎉', url: '/', tag: 'watchtrack-test' }, env.VAPID_PRIVATE_KEY);
      if (response.ok) sent++;
    } catch (error) {
      console.log('Push test failed', error?.message || error);
    }
  }
  return sent ? reply({ ok: true, sent }) : reply({ error: 'Keine Test-Mitteilung zugestellt' }, 502);
}
