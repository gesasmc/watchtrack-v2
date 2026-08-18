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
  if (!row) return json({ library: {}, updatedAt: 0 });
  try {
    return json({ library: JSON.parse(row.payload || '{}'), updatedAt: Number(row.updated_at || 0) });
  } catch {
    return json({ library: {}, updatedAt: Number(row.updated_at || 0) });
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding DB fehlt' }, 503);
  const key = familyKey(request);
  if (!key) return json({ error: 'Ungültiger Familien-Schlüssel' }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.library !== 'object' || Array.isArray(body.library)) return json({ error: 'Ungültige Daten' }, 400);
  const payload = JSON.stringify(body.library);
  if (payload.length > 900000) return json({ error: 'Liste ist zu groß' }, 413);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO shared_lists (family_key, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(family_key) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`)
    .bind(key, payload, now).run();
  return json({ ok: true, updatedAt: now });
}
