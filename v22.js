state.calendarSource = state.calendarSource || 'mine';
state.calendarProvider = state.calendarProvider || 'all';
state.providerMap = state.providerMap || {};

function wtStatusText(status){return status==='completed'?'Gesehen':status==='watching'?'Schaue ich':'Will ich sehen'}
function wtRenderLibraryRow(x){
  const p=progressFor(x); const eps=x.type==='tv'?`${watchedCount(x)}/${totalEpisodeCount(x)||'?'} Folgen`:'';
  const next=x.type==='tv'&&x.nextDate?` · Nächste Folge ${dateDE(x.nextDate)}`:'';
  return `<div class="library-row" data-open="${x.type}:${x.id}">${x.poster_path?`<img src="${IMG+x.poster_path}" alt="">`:'<div class="mini-poster"></div>'}<div class="library-copy"><h3>${esc(x.title)}</h3><p>${esc(x.year)} · ${wtStatusText(x.status)}${next}</p>${eps?`<small>${esc(eps)}</small>`:''}<div class="progress"><span style="width:${p}%"></span></div></div><div class="row-actions"><button class="tiny" data-quick="${x.type}:${x.id}:completed" aria-label="Gesehen">✓</button><button class="tiny" data-quick="${x.type}:${x.id}:remove" aria-label="Entfernen">×</button></div></div>`
}
renderLibrary=function(){
  const items=Object.values(state.library).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  $('#statWatching').textContent=items.filter(x=>x.status==='watching').length;
  $('#statCompleted').textContent=items.filter(x=>x.status==='completed').length;
  $('#statWatchlist').textContent=items.filter(x=>x.status==='watchlist').length;
  const filtered=state.libFilter==='all'?items:items.filter(x=>x.status===state.libFilter), movies=filtered.filter(x=>x.type==='movie'), shows=filtered.filter(x=>x.type==='tv'), box=$('#libraryContent');
  if(!filtered.length){box.innerHTML=empty('Noch nichts hier','Öffne einen Film oder eine Serie und füge den Titel deiner Liste hinzu.');return}
  box.innerHTML=`${movies.length?`<section class="library-group"><div class="library-group-title"><span>🎬 Filme</span><small>${movies.length}</small></div>${movies.map(wtRenderLibraryRow).join('')}</section>`:''}${shows.length?`<section class="library-group"><div class="library-group-title"><span>📺 Serien</span><small>${shows.length}</small></div>${shows.map(wtRenderLibraryRow).join('')}</section>`:''}`
};

const WT_SERVICES=[['netflix','Netflix',/netflix/i],['disney','Disney+',/disney\s*plus/i],['prime','Prime Video',/amazon prime video/i],['wow','WOW',/\bWOW\b/i],['apple','Apple TV+',/apple tv plus/i],['paramount','Paramount+',/paramount plus/i]];
async function wtEnsureProviderMap(){
  if(Object.keys(state.providerMap).length)return state.providerMap;
  const [m,t]=await Promise.all([api('/watch/providers/movie',{language:'de-DE',watch_region:state.region}),api('/watch/providers/tv',{language:'de-DE',watch_region:state.region})]);
  for(const [key,label,re] of WT_SERVICES){const mp=(m.results||[]).find(x=>re.test(x.provider_name)),tp=(t.results||[]).find(x=>re.test(x.provider_name));state.providerMap[key]={key,label,movie:mp?.provider_id||null,tv:tp?.provider_id||null,logo:mp?.logo_path||tp?.logo_path||null}}
  return state.providerMap
}
function wtRenderProviderFilters(){const row=$('#providerFilterRow');if(!row)return;row.innerHTML=`<button class="chip ${state.calendarProvider==='all'?'active':''}" data-calendar-provider="all">Alle</button>`+WT_SERVICES.map(([key,label])=>`<button class="chip ${state.calendarProvider===key?'active':''}" data-calendar-provider="${key}">${label}</button>`).join('')}
function wtCalendarItem(x){const providerText=(x.providers||[]).slice(0,3).map(p=>p.provider_name).join(' · ');return `<div class="calendar-item" data-open="${x.type}:${x.id}">${x.poster_path?`<img src="${IMG+x.poster_path}" alt="">`:'<div class="calendar-poster"></div>'}<div class="calendar-copy"><strong>${esc(x.title)}</strong><span>${x.type==='movie'?'Film':'Serie'}${x.label?` · ${esc(x.label)}`:''}</span>${providerText?`<small>${esc(providerText)}</small>`:''}</div><time>${shortDate(x.date)}</time></div>`}
function wtRenderCalendarGroups(items){const box=$('#calendarContent');if(!items.length){box.innerHTML=empty('Keine kommenden Termine gefunden','Bei manchen Titeln oder Streamingdiensten sind zukünftige Termine noch nicht in TMDB hinterlegt.');return}const groups={};items.sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(x=>(groups[x.date]||=[]).push(x));box.innerHTML=Object.entries(groups).map(([date,xs])=>`<section class="calendar-day"><div class="calendar-day-title"><strong>${dateDE(date)}</strong><small>${xs.length} Titel</small></div>${xs.map(wtCalendarItem).join('')}</section>`).join('')}
async function wtLoadMyCalendar(){
  const libs=Object.values(state.library).filter(x=>x.status!=='completed'); if(!libs.length)return wtRenderCalendarGroups([]);
  $('#calendarContent').innerHTML=loading('Termine deiner vorgemerkten Titel werden aktualisiert …');
  const results=await Promise.allSettled(libs.map(async lib=>{const d=await api(`/${lib.type}/${lib.id}`,{language:'de-DE'});d.media_type=lib.type;const p=await api(`/${lib.type}/${lib.id}/watch/providers`).catch(()=>null),providers=p?.results?.[state.region]?.flatrate||[];if(lib.type==='tv'&&d.next_episode_to_air){lib.nextDate=d.next_episode_to_air.air_date||'';lib.nextLabel=`S${d.next_episode_to_air.season_number} E${d.next_episode_to_air.episode_number} · ${d.next_episode_to_air.name||'Neue Folge'}`}saveLibrary();const date=lib.type==='tv'?(d.next_episode_to_air?.air_date||(d.first_air_date>todayISO()?d.first_air_date:'')):(d.release_date>todayISO()?d.release_date:'');if(!date||date<todayISO())return null;return{id:lib.id,type:lib.type,title:titleOf(d),poster_path:d.poster_path,date,label:lib.type==='tv'&&d.next_episode_to_air?`S${d.next_episode_to_air.season_number} E${d.next_episode_to_air.episode_number}`:'Start',providers}}));
  wtRenderCalendarGroups(results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value));renderLibrary()
}
async function wtLoadStreamingCalendar(){
  $('#calendarContent').innerHTML=loading('Baldige Titel bei Streamingdiensten werden gesucht …');wtRenderProviderFilters();
  const map=await wtEnsureProviderMap(),selected=state.calendarProvider==='all'?Object.values(map):[map[state.calendarProvider]].filter(Boolean),movieIds=selected.map(x=>x.movie).filter(Boolean).join('|'),tvIds=selected.map(x=>x.tv).filter(Boolean).join('|'),to=plusDaysISO(180);
  const [movies,shows]=await Promise.all([movieIds?api('/discover/movie',{language:'de-DE',region:state.region,watch_region:state.region,with_watch_providers:movieIds,with_watch_monetization_types:'flatrate',with_release_type:'4|6','release_date.gte':todayISO(),'release_date.lte':to,sort_by:'release_date.asc',include_adult:false,page:1}).catch(()=>({results:[]})):{results:[]},tvIds?api('/discover/tv',{language:'de-DE',watch_region:state.region,with_watch_providers:tvIds,with_watch_monetization_types:'flatrate','first_air_date.gte':todayISO(),'first_air_date.lte':to,sort_by:'first_air_date.asc',include_adult:false,include_null_first_air_dates:false,page:1}).catch(()=>({results:[]})):{results:[]}]);
  const raw=[...(movies.results||[]).map(x=>({...x,type:'movie',title:titleOf(x),date:x.release_date})),...(shows.results||[]).map(x=>({...x,type:'tv',title:titleOf(x),date:x.first_air_date}))].filter(x=>x.poster_path&&x.date);
  const detailed=await Promise.all(raw.slice(0,36).map(async x=>{const p=await api(`/${x.type}/${x.id}/watch/providers`).catch(()=>null),providers=p?.results?.[state.region]?.flatrate||[];return{...x,providers,label:'geplanter Start'}}));wtRenderCalendarGroups(detailed)
}
async function wtLoadCalendar(){
  const row=$('#providerFilterRow'),note=$('#calendarNote');if(!state.token){row.hidden=true;note.textContent='';$('#calendarContent').innerHTML=empty('TMDB noch nicht verbunden','Bitte zuerst unter Setup verbinden.');return}
  $$('[data-calendar-source]').forEach(b=>b.classList.toggle('active',b.dataset.calendarSource===state.calendarSource));row.hidden=state.calendarSource!=='streaming';
  if(state.calendarSource==='streaming'){note.innerHTML='Streaming-Termine sind eine <strong>Best-Effort-Ansicht</strong>: TMDB/JustWatch kennt Anbieter sehr gut, zukünftige Startdaten aber nicht für jeden Dienst vollständig.';try{await wtLoadStreamingCalendar()}catch(e){$('#calendarContent').innerHTML=empty('Streaming-Kalender konnte nicht geladen werden',e.message)}}else{note.textContent='Hier stehen kommende Filmstarts und die nächste Folge deiner Serien aus „Meine Liste“.';try{await wtLoadMyCalendar()}catch(e){$('#calendarContent').innerHTML=empty('Kalender konnte nicht geladen werden',e.message)}}
}

const wtOldSwitchView=switchView;switchView=function(view){wtOldSwitchView(view);if(view==='calendar')wtLoadCalendar()};
document.addEventListener('click',e=>{const cs=e.target.closest('[data-calendar-source]');if(cs){state.calendarSource=cs.dataset.calendarSource;wtLoadCalendar();return}const cp=e.target.closest('[data-calendar-provider]');if(cp){state.calendarProvider=cp.dataset.calendarProvider;wtRenderProviderFilters();wtLoadStreamingCalendar();return}},true);
const wtOldRenderDetail=renderDetail;renderDetail=function(data){wtOldRenderDetail(data);const map={'＋ Später':'＋ Will ich sehen','▶ Schauen':'▶ Schaue ich','✓ Fertig':'✓ Gesehen'};$$('#detailContent button').forEach(b=>{if(map[b.textContent.trim()])b.textContent=map[b.textContent.trim()]})};
const wtOldRefresh=$('#refreshBtn').onclick;$('#refreshBtn').addEventListener('click',()=>{if($('.view.active')?.id==='view-calendar')wtLoadCalendar()});
renderLibrary();
