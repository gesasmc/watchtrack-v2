const BASE='https://www.thesportsdb.com/api/v1/json/123';
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}});
export async function onRequestGet({request}){
 const u=new URL(request.url),action=u.searchParams.get('action')||'',id=(u.searchParams.get('id')||'').replace(/[^0-9]/g,'');
 if(!id)return json({error:'ID fehlt'},400);
 let path=''; if(action==='team-next')path=`eventsnext.php?id=${id}`; else if(action==='league-next')path=`eventsnextleague.php?id=${id}`; else if(action==='team')path=`lookupteam.php?id=${id}`; else if(action==='league')path=`lookupleague.php?id=${id}`; else return json({error:'Unbekannte Aktion'},400);
 try{const r=await fetch(`${BASE}/${path}`,{cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)return json({error:`Sport-API ${r.status}`},502);return json(await r.json());}catch{return json({error:'Sport-API nicht erreichbar'},502)}
}