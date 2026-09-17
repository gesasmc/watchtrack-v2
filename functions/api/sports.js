const BASE='https://www.thesportsdb.com/api/v1/json/123';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}});
async function get(path){const r=await fetch(`${BASE}/${path}`,{cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)throw new Error(`Sport-API ${r.status}`);return r.json();}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export async function onRequestGet({request}){
 const u=new URL(request.url),action=u.searchParams.get('action')||'',id=(u.searchParams.get('id')||'').replace(/[^0-9]/g,''),q=(u.searchParams.get('q')||'').trim();
 try{
  if(action==='search'){
   if(q.length<2)return json({results:[]});
   const needle=norm(q),results=[];
   // Free string team search is intentionally sample-limited by TheSportsDB, so discover from free list endpoints instead.
   const [leagues,countries]=await Promise.all([get('all_leagues.php'),get('all_countries.php')]);
   const leagueList=(leagues.leagues||[]).filter(x=>norm(x.strLeague).includes(needle)||norm(x.strSport).includes(needle)||norm(x.strLeagueAlternate).includes(needle)).slice(0,8);
   leagueList.forEach(x=>results.push({id:x.idLeague,type:'league',name:x.strLeague,sport:x.strSport||'',country:x.strCountry||'',badge:x.strBadge||''}));
   const countryNames=(countries.countries||[]).map(x=>x.name_en).filter(Boolean);
   const preferred=['Germany','England','Spain','Italy','France','Netherlands','Portugal','Austria','Switzerland'];
   const scan=[...new Set([...preferred,...countryNames])].slice(0,18);
   for(const country of scan){
    if(results.length>=12)break;
    const d=await get(`search_all_teams.php?s=Soccer&c=${encodeURIComponent(country)}`);
    for(const t of d.teams||[]){if(norm(t.strTeam).includes(needle)||norm(t.strTeamAlternate).includes(needle)){results.push({id:t.idTeam,type:'team',name:t.strTeam,sport:t.strSport||'Soccer',country:t.strCountry||country,league:t.strLeague||'',badge:t.strBadge||''});if(results.length>=12)break;}}
   }
   return json({results});
  }
  if(!id)return json({error:'ID fehlt'},400);
  let path='';if(action==='team-next')path=`eventsnext.php?id=${id}`;else if(action==='league-next')path=`eventsnextleague.php?id=${id}`;else if(action==='team')path=`lookupteam.php?id=${id}`;else if(action==='league')path=`lookupleague.php?id=${id}`;else return json({error:'Unbekannte Aktion'},400);
  return json(await get(path));
 }catch(e){return json({error:e.message||'Sport-API nicht erreichbar'},502)}
}