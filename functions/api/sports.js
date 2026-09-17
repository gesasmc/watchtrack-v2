const BASE='https://www.thesportsdb.com/api/v1/json/123';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900'}});
async function get(path){const r=await fetch(`${BASE}/${path}`,{cf:{cacheTtl:3600,cacheEverything:true}});if(!r.ok)throw new Error(`Sport-API ${r.status}`);return r.json();}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const COUNTRY_MAP={germany:'Germany',deutschland:'Germany',bundesliga:'Germany',england:'England',spain:'Spain',spanien:'Spain',italy:'Italy',italien:'Italy',france:'France',frankreich:'France',austria:'Austria',osterreich:'Austria',switzerland:'Switzerland',schweiz:'Switzerland',netherlands:'Netherlands',niederlande:'Netherlands',portugal:'Portugal'};
export async function onRequestGet({request}){
 const u=new URL(request.url),action=u.searchParams.get('action')||'',id=(u.searchParams.get('id')||'').replace(/[^0-9]/g,''),q=(u.searchParams.get('q')||'').trim();
 try{
  if(action==='search'){
   if(q.length<2)return json({results:[]});
   const needle=norm(q),results=[];
   // Keep free-tier searches deliberately small: TheSportsDB allows only 30 requests/minute.
   // Germany first because WatchTrack currently targets DE; only fall back to one extra country when the query names it.
   let country='Germany';for(const [k,v] of Object.entries(COUNTRY_MAP)){if(needle.includes(norm(k))){country=v;break}}
   const teams=await get(`search_all_teams.php?s=Soccer&c=${encodeURIComponent(country)}`);
   for(const t of teams.teams||[]){if(norm(t.strTeam).includes(needle)||norm(t.strTeamAlternate).includes(needle)){results.push({id:t.idTeam,type:'team',name:t.strTeam,sport:t.strSport||'Soccer',country:t.strCountry||country,league:t.strLeague||'',badge:t.strBadge||''});if(results.length>=10)break}}
   if(results.length<10){const leagues=await get('all_leagues.php');for(const x of leagues.leagues||[]){if(norm(x.strLeague).includes(needle)||norm(x.strLeagueAlternate).includes(needle)){results.push({id:x.idLeague,type:'league',name:x.strLeague,sport:x.strSport||'',country:x.strCountry||'',badge:x.strBadge||''});if(results.length>=10)break}}}
   return json({results});
  }
  if(!id)return json({error:'ID fehlt'},400);
  let path='';if(action==='team-next')path=`eventsnext.php?id=${id}`;else if(action==='league-next')path=`eventsnextleague.php?id=${id}`;else if(action==='team')path=`lookupteam.php?id=${id}`;else if(action==='league')path=`lookupleague.php?id=${id}`;else return json({error:'Unbekannte Aktion'},400);
  return json(await get(path));
 }catch(e){if(String(e.message).includes('429'))return json({error:'Die kostenlose Sport-API ist gerade ausgelastet. Bitte in etwa einer Minute erneut suchen.'},429);return json({error:e.message||'Sport-API nicht erreichbar'},502)}
}