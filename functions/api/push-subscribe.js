import { VAPID_PUBLIC_KEY } from '../_lib/webpush.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function familyKey(request) {
  const key = request.headers.get('x-watchtrack-family') || '';
  return /^[A-Za-z0-9_-]{24,128}$/.test(key) ? key : '';
}

async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    family_key TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_family ON push_subscriptions(family_key)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS family_notification_settings (
    family_key TEXT PRIMARY KEY,
    tmdb_token TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`).run();
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  await ensureTables(env.DB);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE family_key = ?').bind(key).first();
  return json({ vapidPublicKey: VAPID_PUBLIC_KEY, subscriptions: Number(count?.n || 0) });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const body = await request.json().catch(() => null);
  const s = body?.subscription;
  const tmdbToken = String(body?.tmdbToken || '').trim();
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return json({ error: 'Ungültige Push-Subscription' }, 400);
  if (!tmdbToken) return json({ error: 'TMDB Token fehlt' }, 400);
  await ensureTables(env.DB);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO push_subscriptions(endpoint, family_key, p256dh, auth, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET family_key=excluded.family_key, p256dh=excluded.p256dh, auth=excluded.auth, updated_at=excluded.updated_at`)
    .bind(String(s.endpoint), key, String(s.keys.p256dh), String(s.keys.auth), now, now).run();
  await env.DB.prepare(`INSERT INTO family_notification_settings(family_key, tmdb_token, enabled, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(family_key) DO UPDATE SET tmdb_token=excluded.tmdb_token, enabled=1, updated_at=excluded.updated_at`)
    .bind(key, tmdbToken, now).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint || '');
  if (!endpoint) return json({ error: 'Endpoint fehlt' }, 400);
  await ensureTables(env.DB);
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE family_key = ? AND endpoint = ?').bind(key, endpoint).run();
  return json({ ok: true });
}
