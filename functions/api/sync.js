const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function familyKey(request) {
  const key = request.headers.get('x-watchtrack-family') || '';
  return /^[A-Za-z0-9_-]{24,128}$/.test(key) ? key : '';
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const row = await env.DB.prepare('SELECT payload, updated_at FROM shared_lists WHERE family_key = ?').bind(key).first();
  if (!row) return json({ state: { library: {}, deleted: {} }, updatedAt: 0 });
  try {
    const parsed = JSON.parse(row.payload || '{}');
    const state = parsed && parsed.library ? parsed : { library: parsed || {}, deleted: {} };
    return json({ state, updatedAt: Number(row.updated_at || 0) });
  } catch {
    return json({ state: { library: {}, deleted: {} }, updatedAt: Number(row.updated_at || 0) });
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const body = await request.json().catch(() => null);
  const state = body?.state;
  if (!state || typeof state.library !== 'object' || Array.isArray(state.library) || typeof state.deleted !== 'object' || Array.isArray(state.deleted)) {
    return json({ error: 'Ungültige Daten' }, 400);
  }
  const payload = JSON.stringify(state);
  if (payload.length > 900000) return json({ error: 'Liste ist zu groß' }, 413);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO shared_lists (family_key, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(family_key) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`)
    .bind(key, payload, now).run();
  return json({ ok: true, updatedAt: now });
}
