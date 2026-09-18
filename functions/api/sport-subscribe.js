import { VAPID_PUBLIC_KEY } from '../_lib/webpush.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function person(request){const p=request.headers.get('x-watchtrack-sport-person')||'';return /^[A-Za-z0-9_-]{16,128}$/.test(p)?p:''}
async function ensure(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS sport_push_subscriptions (
  endpoint TEXT PRIMARY KEY, person_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  event_day INTEGER NOT NULL DEFAULT 1, one_hour INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
 )`).run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_sport_push_person ON sport_push_subscriptions(person_id)').run();
}
export async function onRequestGet({request,env}){if(!env.DB)return json({error:'D1 binding DB fehlt'},503);const p=person(request);if(!p)return json({error:'Ungültiges Sport-Profil'},401);await ensure(env.DB);const n=await env.DB.prepare('SELECT COUNT(*) AS n FROM sport_push_subscriptions WHERE person_id=?').bind(p).first();return json({vapidPublicKey:VAPID_PUBLIC_KEY,subscriptions:Number(n?.n||0)})}
export async function onRequestPost({request,env}){if(!env.DB)return json({error:'D1 binding DB fehlt'},503);const p=person(request);if(!p)return json({error:'Ungültiges Sport-Profil'},401);const b=await request.json().catch(()=>null),s=b?.subscription;if(!s?.endpoint||!s?.keys?.p256dh||!s?.keys?.auth)return json({error:'Ungültige Push-Subscription'},400);await ensure(env.DB);const now=Date.now();await env.DB.prepare(`INSERT INTO sport_push_subscriptions(endpoint,person_id,p256dh,auth,event_day,one_hour,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET person_id=excluded.person_id,p256dh=excluded.p256dh,auth=excluded.auth,event_day=excluded.event_day,one_hour=excluded.one_hour,updated_at=excluded.updated_at`)
 .bind(String(s.endpoint),p,String(s.keys.p256dh),String(s.keys.auth),b?.settings?.eventDay===false?0:1,b?.settings?.oneHour===false?0:1,now,now).run();return json({ok:true})}
export async function onRequestDelete({request,env}){if(!env.DB)return json({error:'D1 binding DB fehlt'},503);const p=person(request);if(!p)return json({error:'Ungültiges Sport-Profil'},401);const b=await request.json().catch(()=>null),endpoint=String(b?.endpoint||'');await ensure(env.DB);if(endpoint)await env.DB.prepare('DELETE FROM sport_push_subscriptions WHERE person_id=? AND endpoint=?').bind(p,endpoint).run();return json({ok:true})}
