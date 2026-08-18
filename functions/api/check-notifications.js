import { sendWebPush } from '../_lib/webpush.js';

const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - DAY).toISOString().slice(0, 10);
const freshDate = d => !!d && d >= yesterday() && d <= today();

async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    family_key TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS family_notification_settings (
    family_key TEXT PRIMARY KEY,
    tmdb_token TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS episode_notifications (
    family_key TEXT NOT NULL,
    series_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    air_date TEXT,
    notified_at INTEGER NOT NULL,
    PRIMARY KEY(family_key, series_id, season_number, episode_number)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS season_notifications (
    family_key TEXT NOT NULL,
    series_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    air_date TEXT,
    notified_at INTEGER NOT NULL,
    PRIMARY KEY(family_key, series_id, season_number)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS movie_notifications (
    family_key TEXT NOT NULL,
    movie_id TEXT NOT NULL,
    release_date TEXT,
    notified_at INTEGER NOT NULL,
    PRIMARY KEY(family_key, movie_id)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS notification_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`).run();
}

async function tmdb(path, token) {
  const r = await fetch(`https://api.themoviedb.org/3${path}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

function parseShared(payload) {
  try {
    const parsed = JSON.parse(payload || '{}');
    return parsed?.library || parsed || {};
  } catch { return {}; }
}

async function sendFamily(env, familyKey, payload) {
  const rows = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE family_key = ?').bind(familyKey).all();
  let sent = 0;
  for (const row of rows.results || []) {
    try {
      const r = await sendWebPush({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, env.VAPID_PRIVATE_KEY);
      if (r.ok) sent += 1;
      else if ([404, 410].includes(r.status)) await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
    } catch (e) { console.log('push error', e?.message || e); }
  }
  return sent;
}

async function markEpisodes(env, familyKey, seriesId, episodes) {
  for (const ep of episodes) {
    await env.DB.prepare(`INSERT OR IGNORE INTO episode_notifications(family_key, series_id, season_number, episode_number, air_date, notified_at)
      VALUES(?,?,?,?,?,?)`).bind(familyKey, String(seriesId), ep.season_number, ep.episode_number, ep.air_date || null, Date.now()).run();
  }
}

export async function onRequestGet({ env }) {
  if (!env.DB) return reply({ error: 'D1 binding DB fehlt' }, 503);
  if (!env.VAPID_PRIVATE_KEY) return reply({ error: 'VAPID_PRIVATE_KEY fehlt' }, 503);
  await ensureTables(env.DB);

  const last = await env.DB.prepare("SELECT value FROM notification_meta WHERE key='last_check'").first();
  const lastMs = Number(last?.value || 0);
  if (Date.now() - lastMs < 10 * 60 * 1000) return reply({ ok: true, skipped: 'recently checked' });
  await env.DB.prepare("INSERT INTO notification_meta(key,value) VALUES('last_check',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(Date.now())).run();

  const families = await env.DB.prepare(`SELECT s.family_key, s.payload, f.tmdb_token
    FROM shared_lists s
    JOIN family_notification_settings f ON f.family_key=s.family_key
    WHERE f.enabled=1
      AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.family_key=s.family_key)`).all();

  let checkedSeries = 0;
  let checkedMovies = 0;
  let notifications = 0;

  for (const fam of families.results || []) {
    const library = parseShared(fam.payload);
    const items = Object.values(library || {});
    const series = items.filter(x => x?.type === 'tv' && /^\d+$/.test(String(x?.id || '')));
    const movies = items.filter(x => x?.type === 'movie' && x?.status !== 'completed' && /^\d+$/.test(String(x?.id || '')));

    for (const item of series) {
      checkedSeries += 1;
      try {
        const detail = await tmdb(`/tv/${item.id}?language=de-DE`, fam.tmdb_token);
        const lastEp = detail.last_episode_to_air;
        if (!lastEp?.season_number || !lastEp?.air_date || !freshDate(lastEp.air_date)) continue;

        const season = await tmdb(`/tv/${item.id}/season/${lastEp.season_number}?language=de-DE`, fam.tmdb_token);
        const fresh = (season.episodes || []).filter(ep => freshDate(ep.air_date));
        if (!fresh.length) continue;

        const firstOfSeason = fresh.find(ep => Number(ep.episode_number) === 1);
        if (firstOfSeason) {
          const alreadySeason = await env.DB.prepare(`SELECT 1 AS yes FROM season_notifications
            WHERE family_key=? AND series_id=? AND season_number=?`)
            .bind(fam.family_key, String(item.id), firstOfSeason.season_number).first();
          if (!alreadySeason) {
            const title = item.title || detail.name || 'Serie';
            const sent = await sendFamily(env, fam.family_key, {
              title: `Neue Staffel: ${title}`,
              body: `Staffel ${firstOfSeason.season_number} ist gestartet${firstOfSeason.name ? ` · ${firstOfSeason.name}` : ''}`,
              url: '/',
              tag: `season-${item.id}-${firstOfSeason.season_number}`
            });
            if (sent) {
              notifications += 1;
              await env.DB.prepare(`INSERT OR IGNORE INTO season_notifications(family_key, series_id, season_number, air_date, notified_at)
                VALUES(?,?,?,?,?)`).bind(fam.family_key, String(item.id), firstOfSeason.season_number, firstOfSeason.air_date || null, Date.now()).run();
              await markEpisodes(env, fam.family_key, item.id, fresh);
              continue;
            }
          }
        }

        const unseen = [];
        for (const ep of fresh) {
          if (item.seasons?.[ep.season_number]?.[ep.episode_number]) continue;
          const exists = await env.DB.prepare(`SELECT 1 AS yes FROM episode_notifications
            WHERE family_key=? AND series_id=? AND season_number=? AND episode_number=?`)
            .bind(fam.family_key, String(item.id), ep.season_number, ep.episode_number).first();
          if (!exists) unseen.push(ep);
        }
        if (!unseen.length) continue;

        const title = item.title || detail.name || 'Serie';
        const payload = unseen.length === 1 ? {
          title: `Neue Folge: ${title}`,
          body: `S${unseen[0].season_number} E${unseen[0].episode_number}${unseen[0].name ? ` · ${unseen[0].name}` : ''}`,
          url: '/',
          tag: `series-${item.id}-${unseen[0].season_number}-${unseen[0].episode_number}`
        } : {
          title: `Neue Folgen: ${title}`,
          body: `${unseen.length} neue Folgen in Staffel ${unseen[0].season_number} sind verfügbar.`,
          url: '/',
          tag: `series-${item.id}-${unseen[0].season_number}-${today()}`
        };

        const sent = await sendFamily(env, fam.family_key, payload);
        if (!sent) continue;
        notifications += 1;
        await markEpisodes(env, fam.family_key, item.id, unseen);
      } catch (e) { console.log('series check failed', item?.id, e?.message || e); }
    }

    for (const item of movies) {
      checkedMovies += 1;
      try {
        const detail = await tmdb(`/movie/${item.id}?language=de-DE`, fam.tmdb_token);
        const releaseDate = detail.release_date || item.releaseDate || '';
        if (!freshDate(releaseDate)) continue;

        const exists = await env.DB.prepare(`SELECT 1 AS yes FROM movie_notifications WHERE family_key=? AND movie_id=?`)
          .bind(fam.family_key, String(item.id)).first();
        if (exists) continue;

        const title = item.title || detail.title || 'Film';
        const sent = await sendFamily(env, fam.family_key, {
          title: `Film jetzt verfügbar: ${title}`,
          body: `Der Film auf eurer Liste hat heute seinen Veröffentlichungstermin erreicht.`,
          url: '/',
          tag: `movie-${item.id}-release`
        });
        if (!sent) continue;
        notifications += 1;
        await env.DB.prepare(`INSERT OR IGNORE INTO movie_notifications(family_key, movie_id, release_date, notified_at)
          VALUES(?,?,?,?)`).bind(fam.family_key, String(item.id), releaseDate || null, Date.now()).run();
      } catch (e) { console.log('movie check failed', item?.id, e?.message || e); }
    }
  }

  return reply({ ok: true, families: (families.results || []).length, checkedSeries, checkedMovies, notifications });
}
