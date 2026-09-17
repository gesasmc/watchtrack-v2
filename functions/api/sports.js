const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=1800'}});
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TEAMS=[
 {id:'mainz-05',name:'1. FSV Mainz 05',short:'Mainz 05',slug:'1-fsv-mainz-05',code:'M05'},
 {id:'bayern',name:'FC Bayern München',short:'Bayern München',slug:'fc-bayern-muenchen',code:'FCB'},
 {id:'dortmund',name:'Borussia Dortmund',short:'Dortmund',slug:'borussia-dortmund',code:'BVB'},
 {id:'frankfurt',name:'Eintracht Frankfurt',short:'Frankfurt',slug:'eintracht-frankfurt',code:'SGE'},
 {id:'gladbach',name:'Borussia Mönchengladbach',short:'Gladbach',slug:'borussia-moenchengladbach',code:'BMG'},
 {id:'leverkusen',name:'Bayer 04 Leverkusen',short:'Leverkusen',slug:'bayer-04-leverkusen',code:'B04'},
 {id:'schalke',name:'FC Schalke 04',short:'Schalke 04',slug:'fc-schalke-04',code:'S04'},
 {id:'bremen',name:'SV Werder Bremen',short:'Werder Bremen',slug:'sv-werder-bremen',code:'SVW'},
 {id:'hamburg',name:'Hamburger SV',short:'HSV',slug:'hamburger-sv',code:'HSV'},
 {id:'stuttgart',name:'VfB Stuttgart',short:'Stuttgart',slug:'vfb-stuttgart',code:'VFB'},
 {id:'leipzig',name:'RB Leipzig',short:'Leipzig',slug:'rb-leipzig',code:'RBL'},
 {id:'augsburg',name:'FC Augsburg',short:'Augsburg',slug:'fc-augsburg',code:'FCA'},
 {id:'freiburg',name:'SC Freiburg',short:'Freiburg',slug:'sc-freiburg',code:'SCF'},
 {id:'koeln',name:'1. FC Köln',short:'Köln',slug:'1-fc-koeln',code:'KOE'},
 {id:'union',name:'1. FC Union Berlin',short:'Union Berlin',slug:'1-fc-union-berlin',code:'FCU'},
 {id:'hoffenheim',name:'TSG Hoffenheim',short:'Hoffenheim',slug:'tsg-hoffenheim',code:'TSG'},
 {id:'elversberg',name:'SV Elversberg',short:'Elversberg',slug:'sv-elversberg',code:'ELV'},
 {id:'paderborn',name:'SC Paderborn 07',short:'Paderborn',slug:'sc-paderborn-07',code:'SCP'}
];
async function text(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 WatchTrack/1.0','accept-language':'de-DE,de;q=0.9'},cf:{cacheTtl:1800,cacheEverything:true}});if(!r.ok)throw Object.assign(new Error(`Quelle ${r.status}`),{status:r.status});return r.text()}
function strip(h){return h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/\s+/g,' ').trim()}
function search(q){const n=norm(q),out=TEAMS.filter(t=>[t.name,t.short,t.code].some(v=>norm(v).includes(n)||n.includes(norm(v)))).map(t=>({id:t.id,type:'team',provider:'public-bundesliga',name:t.name,shortName:t.short,sport:'Fußball',country:'Deutschland',league:'Bundesliga',badge:''}));if(norm('Bundesliga').includes(n)||n.includes('bundesliga'))out.push({id:'bundesliga',type:'league',provider:'public-bundesliga',name:'Bundesliga',sport:'Fußball',country:'Deutschland',badge:''});if('oktagonmma'.includes(n)||n.includes('oktagon'))out.push({id:'oktagon',type:'league',provider:'public-oktagon',name:'OKTAGON MMA',sport:'MMA',country:'Europa',badge:''});return out.slice(0,12)}
const MONTH={januar:0,februar:1,maerz:2,märz:2,april:3,mai:4,juni:5,juli:6,august:7,september:8,oktober:9,november:10,dezember:11};
function oktagonEvents(src){const s=strip(src),re=/OKTAGON\s+(\d+)(?:\s*:\s*([^0-9]{2,80}?))?\s+(\d{2})\.(\d{2})\.(\d{4})(?:[^0-9]{0,80}?(\d{2}:\d{2}))?/gi,out=[],seen=new Set();let m;while((m=re.exec(s))){const id=`oktagon-${m[1]}`,when=`${m[4]}-${m[3]}-${m[2]}T${m[5]||'18:00'}:00+02:00`;if(seen.has(id))continue;seen.add(id);out.push({idEvent:id,strEvent:`OKTAGON ${m[1]}${m[2]?.trim()?`: ${m[2].trim().replace(/\s+/g,' ')}`:''}`,strLeague:'OKTAGON MMA',strTimestamp:when,sourceUrl:'https://oktagonmma.com/de/events/'})}return out.filter(e=>new Date(e.strTimestamp)>new Date(Date.now()-86400000)).slice(0,20)}
async function bundesligaEvents(team){const url=`https://www.bundesliga.com/de/bundesliga/spieltag/2026-2027/${team.slug}`,src=strip(await text(url));const code=team.code,out=[],seen=new Set();const months='Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';const re=new RegExp(`(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\\s+(\\d{1,2})\\.?\\s+(${months})(?:\\s+(\\d{1,2}:\\d{2}))?\\s+([A-Z0-9]{2,4})\\s+([A-Z0-9]{2,4})`,'gi');let m;while((m=re.exec(src))){if(m[4]!==code&&m[5]!==code)continue;const mon=MONTH[m[2].toLowerCase()],year=mon<7?2027:2026,tm=m[3]||'12:00',d=new Date(`${year}-${String(mon+1).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}T${tm}:00+02:00`);const id=`bundesliga-${team.id}-${d.toISOString().slice(0,10)}-${m[4]}-${m[5]}`;if(seen.has(id)||d<Date.now()-86400000)continue;seen.add(id);out.push({idEvent:id,strEvent:`${m[4]} – ${m[5]}`,strLeague:'Bundesliga',strTimestamp:d.toISOString(),sourceUrl:url})}return out.slice(0,20)}
export async function onRequestGet({request}){const u=new URL(request.url),action=u.searchParams.get('action')||'',id=u.searchParams.get('id')||'',q=(u.searchParams.get('q')||'').trim(),provider=u.searchParams.get('provider')||'';try{
 if(action==='status')return json({football:true,combat:true,provider:'public-web'});
 if(action==='search')return json({results:q.length<2?[]:search(q)});
 if(action==='league-next'&&(provider==='public-oktagon'||id==='oktagon'))return json({events:oktagonEvents(await text('https://oktagonmma.com/de/events/'))});
 if(action==='team-next'&&provider==='public-bundesliga'){const team=TEAMS.find(t=>t.id===id);if(!team)return json({error:'Verein nicht gefunden'},404);return json({events:await bundesligaEvents(team)});}
 return json({error:'Quelle wird noch nicht unterstützt'},400);
}catch(e){return json({error:e.message||'Öffentliche Sportquelle nicht erreichbar'},e.status&&e.status<600?e.status:502)}}