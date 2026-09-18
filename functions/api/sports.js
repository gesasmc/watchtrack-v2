const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900'}});
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TEAMS=[
{id:'deutschland',dfbSlug:'deutschland',name:'Deutschland',aliases:['Deutschland','Nationalmannschaft','DFB Team','DFB-Team'],national:true},
{id:'mainz-05',dfbSlug:'1-fsv-mainz-05',name:'1. FSV Mainz 05',aliases:['Mainz','Mainz 05','M05']},{id:'bayern',name:'FC Bayern München',aliases:['Bayern','Bayern München','FCB']},{id:'dortmund',name:'Borussia Dortmund',aliases:['Dortmund','BVB']},{id:'frankfurt',name:'Eintracht Frankfurt',aliases:['Frankfurt','Eintracht','SGE']},{id:'gladbach',name:'Borussia Mönchengladbach',aliases:['Gladbach','Mönchengladbach','BMG']},{id:'leverkusen',name:'Bayer 04 Leverkusen',aliases:['Leverkusen','Bayer 04','B04']},{id:'schalke',name:'FC Schalke 04',aliases:['Schalke','Schalke 04','S04']},{id:'bremen',name:'SV Werder Bremen',aliases:['Bremen','Werder','Werder Bremen','SVW']},{id:'hamburg',name:'Hamburger SV',aliases:['Hamburg','HSV']},{id:'stuttgart',name:'VfB Stuttgart',aliases:['Stuttgart','VFB']},{id:'leipzig',name:'RB Leipzig',aliases:['Leipzig','RBL']},{id:'augsburg',name:'FC Augsburg',aliases:['Augsburg','FCA']},{id:'freiburg',name:'SC Freiburg',aliases:['Freiburg','SCF']},{id:'koeln',name:'1. FC Köln',aliases:['Köln','Koeln','FC Köln']},{id:'union',name:'1. FC Union Berlin',aliases:['Union','Union Berlin']},{id:'hoffenheim',name:'TSG Hoffenheim',aliases:['Hoffenheim','TSG']},{id:'elversberg',name:'SV Elversberg',aliases:['Elversberg']},{id:'paderborn',name:'SC Paderborn 07',aliases:['Paderborn','SCP']}];
const OKTAGON=[
{idEvent:'oktagon-94',strEvent:'OKTAGON 94: ECKERLIN VS. KOZMA',strLeague:'OKTAGON MMA',strTimestamp:'2026-09-26T16:00:00+02:00',location:'Deutsche Bank Park, Frankfurt am Main',sourceUrl:'https://oktagonmma.com/en/events/oktagon-94-frankfurt/',fightcard:['Christian Eckerlin vs. David Kozma','Karlos Vémola vs. Frederic Vosgröne','Max Coga vs. Christian Jungwirth','Jaime Cordero vs. Robo Pukač','Fedor Duric vs. Marc Diakiese','Hugo Vach vs. Deniz Ilbay']},
{idEvent:'oktagon-95',strEvent:'OKTAGON 95: KINCL VS. HUMBURGER',strLeague:'OKTAGON MMA',strTimestamp:'2026-10-17T16:00:00+02:00',location:'Mattoni Arena, Karlovy Vary',sourceUrl:'https://oktagonmma.com/en/events/oktagon-95-karlovy-vary/',fightcard:['Patrik Kincl vs. Dominik Humburger','Miloš Petrášek Škvor vs. Tomasz Narkun','Václav Bartl vs. Denis Manning','Hutyra vs. Fodor']},{idEvent:'oktagon-96',strEvent:'OKTAGON 96: GOGOLADZE VS. KLINKHAMMER',strLeague:'OKTAGON MMA',strTimestamp:'2026-10-31T17:00:00+01:00',location:'SAP Garden, München',sourceUrl:'https://oktagonmma.com/de/events/oktagon-96-munich/',fightcard:['Amiran Gogoladze vs. Felix Klinkhammer']},{idEvent:'oktagon-97',strEvent:'OKTAGON 97: SEVERINO VS. HOLZER',strLeague:'OKTAGON MMA',strTimestamp:'2026-11-07T17:00:00+01:00',location:'ZAG Arena, Hannover',sourceUrl:'https://oktagonmma.com/de/events/146/',fightcard:['Igor Severino vs. Max Holzer']},{idEvent:'oktagon-98',strEvent:'OKTAGON 98: LEGIERSKI VS. BUCHINGER',strLeague:'OKTAGON MMA',strTimestamp:'2026-11-21T17:00:00+01:00',location:'WERK ARENA, Třinec',sourceUrl:'https://oktagonmma.com/de/events/148/',fightcard:['Mateusz Legierski vs. Ivan Buchinger']},{idEvent:'oktagon-99',strEvent:'OKTAGON 99: Dortmund',strLeague:'OKTAGON MMA',strTimestamp:'2026-12-05T17:00:00+01:00',location:'Westfalenhalle, Dortmund',sourceUrl:'https://oktagonmma.com/de/events/oktagon-99-dortmund/',fightcard:[]},{idEvent:'oktagon-100',strEvent:'OKTAGON 100: Prag',strLeague:'OKTAGON MMA',strTimestamp:'2026-12-29T17:00:00+01:00',location:'O2 arena, Prag',sourceUrl:'https://oktagonmma.com/en/events/oktagon-100-prague/',fightcard:[]}];
async function text(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 WatchTrack/1.0','accept-language':'de-DE,de;q=0.9'},cf:{cacheTtl:900,cacheEverything:true}});if(!r.ok)throw Object.assign(new Error(`Quelle ${r.status}`),{status:r.status});return r.text()}
function strip(h){return h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/\s+/g,' ').trim()}
function score(t,n){return [t.name,...t.aliases].map(norm).reduce((s,v)=>Math.max(s,v===n?100:v.includes(n)||n.includes(v)?70:0),0)}
function search(q){const n=norm(q);if(['verein','vereine','bundesliga','fussball','team','teams'].includes(n))return TEAMS.filter(t=>!t.national).map(t=>result(t));const out=TEAMS.map(t=>({t,s:score(t,n)})).filter(x=>x.s).sort((a,b)=>b.s-a.s).map(x=>result(x.t));if(n.includes('oktagon')||'oktagonmma'.includes(n))out.push({id:'oktagon',type:'league',provider:'public-oktagon',name:'OKTAGON MMA',sport:'MMA',country:'Europa'});return out.slice(0,20)}
const VISUALS={
'mainz-05':{badge:'M05',theme:'red'},
'deutschland':{badge:'DFB',theme:'black'},
'bayern':{badge:'FCB',theme:'red'},
'dortmund':{badge:'BVB',theme:'yellow'},
'frankfurt':{badge:'SGE',theme:'red'},
'gladbach':{badge:'BMG',theme:'green'},
'leverkusen':{badge:'B04',theme:'red'},
'stuttgart':{badge:'VfB',theme:'red'},
'leipzig':{badge:'RBL',theme:'red'},
'freiburg':{badge:'SCF',theme:'red'},
'koeln':{badge:'FC',theme:'red'},
'union':{badge:'FCU',theme:'red'},
'bremen':{badge:'SVW',theme:'green'},
'hamburg':{badge:'HSV',theme:'blue'}
};
function result(t){const v=VISUALS[t.id]||{badge:(t.aliases[0]||t.name).slice(0,3).toUpperCase(),theme:'neutral'};return{id:t.id,type:'team',provider:'public-bundesliga',name:t.name,shortName:t.aliases[0],sport:'Fußball',country:'Deutschland',league:t.national?'Nationalmannschaft':'Bundesliga',badge:v.badge,theme:v.theme,logo:crest(t.name)}}
const MONTH={januar:0,februar:1,maerz:2,märz:2,april:3,mai:4,juni:5,juli:6,august:7,september:8,oktober:9,november:10,dezember:11};
const CRESTS=[
[['mainz'],'https://crests.football-data.org/15.svg'],
[['bayern'],'https://crests.football-data.org/5.svg'],
[['dortmund','bvb'],'https://crests.football-data.org/4.svg'],
[['frankfurt','eintracht'],'https://crests.football-data.org/19.svg'],
[['monchengladbach','gladbach'],'https://crests.football-data.org/18.svg'],
[['leverkusen'],'https://crests.football-data.org/3.svg'],
[['schalke'],'https://crests.football-data.org/6.svg'],
[['werder','bremen'],'https://crests.football-data.org/12.svg'],
[['hamburger','hsv'],'https://crests.football-data.org/7.svg'],
[['stuttgart'],'https://crests.football-data.org/10.svg'],
[['leipzig'],'https://crests.football-data.org/721.svg'],
[['augsburg'],'https://crests.football-data.org/16.svg'],
[['freiburg'],'https://crests.football-data.org/17.svg'],
[['koln'],'https://crests.football-data.org/1.svg'],
[['union'],'https://crests.football-data.org/28.svg'],
[['hoffenheim'],'https://crests.football-data.org/2.svg'],
[['deutschland','germany'],'https://crests.football-data.org/759.svg']
];
function crest(name){const n=norm(name);const hit=CRESTS.find(([keys])=>keys.some(k=>n.includes(norm(k))));return hit?hit[1]:''}
const FLAGS=[['niederlande','🇳🇱'],['deutschland','🇩🇪'],['griechenland','🇬🇷'],['serbien','🇷🇸'],['frankreich','🇫🇷'],['spanien','🇪🇸'],['italien','🇮🇹'],['portugal','🇵🇹'],['belgien','🇧🇪'],['schweiz','🇨🇭'],['osterreich','🇦🇹'],['danemark','🇩🇰'],['schweden','🇸🇪'],['norwegen','🇳🇴'],['polen','🇵🇱'],['tschechien','🇨🇿'],['turkei','🇹🇷'],['england','🏴']];
function flag(name){const n=norm(name),hit=FLAGS.find(([k])=>n.includes(norm(k)));return hit?hit[1]:''}
async function ogImage(url){try{const h=await text(url);const m=h.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)||h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);return m?.[1]||''}catch{return''}}
const STADIUMS=[
 [['mainz'],'MEWA ARENA'],[['monchengladbach','gladbach'],'BORUSSIA-PARK'],[['schalke'],'VELTINS-Arena'],
 [['bochum'],'Vonovia Ruhrstadion'],[['elversberg'],'URSAPHARM-Arena an der Kaiserlinde'],
 [['augsburg'],'WWK ARENA'],[['bayern'],'Allianz Arena'],[['dortmund'],'SIGNAL IDUNA PARK'],
 [['frankfurt','eintracht'],'Deutsche Bank Park'],[['leverkusen'],'BayArena'],[['bremen','werder'],'Weserstadion'],
 [['stuttgart'],'MHP Arena'],[['leipzig'],'Red Bull Arena'],[['freiburg'],'Europa-Park Stadion'],
 [['koln'],'RheinEnergieSTADION'],[['union'],'Stadion An der Alten Försterei'],[['hoffenheim'],'PreZero Arena'],
 [['hamburg','hsv'],'Volksparkstadion']
];
function stadiumFor(home){const n=norm(home),hit=STADIUMS.find(([keys])=>keys.some(k=>n.includes(norm(k))));return hit?hit[1]:'Spielort noch nicht hinterlegt'}
function bundesligaBroadcast(d){
 const dow=d.getDay(),hh=d.getHours(),mm=d.getMinutes();
 if(dow===5&&hh>=20)return 'Sky Sport Bundesliga · WOW';
 if(dow===6&&hh===15&&mm===30)return 'Sky Sport Bundesliga · WOW (Einzelspiel) · DAZN (Konferenz)';
 if(dow===6)return 'Sky Sport Bundesliga · WOW';
 if(dow===0)return 'DAZN';
 return 'Übertragung noch nicht bestätigt';
}
const NATIONAL_META={
'2026-09-24':{location:'Johan Cruijff Arena, Amsterdam',broadcast:'RTL'},
'2026-09-27':{location:'WWK Arena, Augsburg',broadcast:'ARD'},
'2026-10-01':{location:'Allianz Arena, München',broadcast:'ZDF'},
'2026-10-04':{location:'Toumba Stadium, Thessaloniki',broadcast:'RTL'},
'2026-11-13':{location:'Stadion Rajko Mitic, Belgrad',broadcast:'RTL'},
'2026-11-16':{location:'Olympiastadion, Berlin',broadcast:'ARD'}
};
async function bundesligaEvents(team){const url=`https://datencenter.dfb.de/teams/${team.dfbSlug||team.id}?datacenter_name=datencenter`,s=strip(await text(url)),out=[],seen=new Set();const re=/(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),?\s+(\d{1,2})\.(\d{2})\.(\d{4})\s+(\d{1,2}:\d{2})\s+Uhr\s+(.+?)\s+(?:-\s*:\s*-|\d+\s*:\s*\d+)\s+(.+?)(?=\s+(?:Schema|Vergleich|Liveticker|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|$))/gi;let m;while((m=re.exec(s))){const d=new Date(`${m[4]}-${m[3]}-${String(m[2]).padStart(2,'0')}T${m[5]}:00+02:00`),home=m[6].replace(/Image: Vereinslogo/gi,'').trim(),away=m[7].replace(/Image: Vereinslogo/gi,'').trim();if(d<Date.now()-86400000)continue;const key=`${d.toISOString()}-${norm(home)}-${norm(away)}`;if(seen.has(key))continue;seen.add(key);const day=d.toISOString().slice(0,10),dow=d.getDay(),hh=d.getHours(),mm=d.getMinutes();let meta=team.national?NATIONAL_META[day]||{}:{location:stadiumFor(home),broadcast:bundesligaBroadcast(d)};out.push({idEvent:`football-${team.id}-${key}`,strEvent:`${home} – ${away}`,strLeague:team.national?'Deutschland · Nationalmannschaft':'Bundesliga',strTimestamp:d.toISOString(),sourceUrl:url,location:meta.location||'',broadcast:meta.broadcast||'',homeTeam:home,awayTeam:away,homeLogo:team.national?'':crest(home),awayLogo:team.national?'':crest(away),homeFlag:flag(home),awayFlag:flag(away),visual:VISUALS[team.id]||{badge:(team.aliases[0]||team.name).slice(0,3).toUpperCase(),theme:'neutral'}})}return out.slice(0,30)}
export async function onRequestGet({request}){const u=new URL(request.url),action=u.searchParams.get('action')||'',id=u.searchParams.get('id')||'',q=(u.searchParams.get('q')||'').trim(),provider=u.searchParams.get('provider')||'';try{if(action==='status')return json({football:true,combat:true,provider:'public-web'});if(action==='search')return json({results:q.length<2?[]:search(q)});if(action==='league-next'&&(provider==='public-oktagon'||id==='oktagon')){const events=OKTAGON.filter(e=>new Date(e.strTimestamp)>Date.now()-86400000);for(const e of events){e.poster=await ogImage(e.sourceUrl)}return json({events});}if(action==='team-next'&&provider==='public-bundesliga'){const team=TEAMS.find(t=>t.id===id);if(!team)return json({error:'Verein nicht gefunden'},404);return json({events:await bundesligaEvents(team)})}return json({error:'Quelle wird noch nicht unterstützt'},400)}catch(e){return json({error:e.message||'Öffentliche Sportquelle nicht erreichbar'},e.status&&e.status<600?e.status:502)}}