import { sendWebPush } from '../_lib/webpush.js';
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:'D1 binding DB fehlt'},503);
 if(!env.VAPID_PRIVATE_KEY)return json({error:'VAPID_PRIVATE_KEY fehlt'},503);
 const p=request.headers.get('x-watchtrack-sport-person')||'';
 if(!/^[A-Za-z0-9_-]{16,128}$/.test(p))return json({error:'Ungültiges Sport-Profil'},401);
 const rows=await env.DB.prepare('SELECT endpoint,p256dh,auth FROM sport_push_subscriptions WHERE person_id=?').bind(p).all();
 let sent=0;
 for(const r of rows.results||[]){try{const x=await sendWebPush({endpoint:r.endpoint,keys:{p256dh:r.p256dh,auth:r.auth}},{title:'WatchTrack Sport',body:'Deine persönlichen Sport-Mitteilungen funktionieren 🎉',url:'/',tag:'watchtrack-sport-test'},env.VAPID_PRIVATE_KEY);if(x.ok)sent++;}catch(e){console.log('sport test push failed',e?.message||e)}}
 return sent?json({ok:true,sent}):json({error:'Keine persönliche Sport-Testmitteilung zugestellt'},502);
}