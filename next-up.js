/* WatchTrack v2.7 – Als Nächstes aus gespeichertem Serienfortschritt */
(() => {
  function watched(item, s, e) {
    const v = item?.seasons?.[s];
    if (Array.isArray(v)) return v.includes(e) || v.includes(String(e));
    if (v && typeof v === 'object') return !!(v[e] || v[String(e)]);
    return false;
  }
  function nextKnownEpisode(item) {
    const meta = item?.seasonMeta || {};
    const seasons = Object.keys(meta).map(Number).filter(n => n > 0).sort((a,b)=>a-b);
    for (const s of seasons) {
      const m = meta[s] || meta[String(s)] || {};
      const count = Number(m.episode_count || m.episodeCount || m.count || 0);
      for (let e=1; e<=count; e++) if (!watched(item,s,e)) return {season:s,episode:e};
    }
    return null;
  }
  function candidate(item) {
    if (!item || item.type !== 'tv' || item.status === 'completed') return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const announced = item.nextEpisode;
    if (announced?.airDate) {
      const d = new Date(announced.airDate + 'T00:00:00');
      if (!watched(item, announced.season, announced.episode)) {
        if (d <= now) return {item, season:announced.season, episode:announced.episode, rank:0, label:'🆕 Neue Folge verfügbar'};
      }
    }
    const n = nextKnownEpisode(item);
    if (n) return {item,...n,rank:item.status==='watching'?1:2,label:item.status==='watching'?'▶ Weitergucken':'Als Nächstes'};
    if (announced?.airDate && !watched(item, announced.season, announced.episode)) return {item,season:announced.season,episode:announced.episode,rank:3,label:`📅 ${dateDE(announced.airDate)}`};
    return null;
  }
  function html() {
    const rows = Object.values(state.library || {}).map(candidate).filter(Boolean).sort((a,b)=>a.rank-b.rank || (b.item.updatedAt||0)-(a.item.updatedAt||0)).slice(0,6);
    if (!rows.length) return '';
    return `<section class="next-up"><div class="next-up-head"><div><h2>Als Nächstes</h2><p>Basierend auf eurem gespeicherten Folgenfortschritt</p></div></div><div class="next-up-list">${rows.map(x=>`<div class="next-up-row" data-open="tv:${x.item.id}">${x.item.poster_path?`<img src="${IMG+x.item.poster_path}" alt="">`:'<div class="next-up-poster">📺</div>'}<div class="next-up-copy"><strong>${esc(x.item.title)}</strong><span>Staffel ${x.season} · Folge ${x.episode}</span><small>${esc(x.label)}</small></div><button class="primary small" data-next-done="${x.item.id}:${x.season}:${x.episode}">✓ Gesehen</button></div>`).join('')}</div></section>`;
  }
  function mount() {
    const box = document.querySelector('#libraryContent');
    if (!box || document.querySelector('#nextUpHost')) return;
    const host=document.createElement('div'); host.id='nextUpHost'; box.parentNode.insertBefore(host,box);
  }
  function render(){ mount(); const h=document.querySelector('#nextUpHost'); if(h) h.innerHTML=(window.wtLibraryMediaType==='movie'?'':html()); }
  const base=window.renderLibrary;
  window.renderLibrary=function(){ const r=base.apply(this,arguments); setTimeout(render,0); return r; };
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-next-done]'); if(!b)return;
    e.preventDefault();e.stopPropagation();
    const [id,s,eNo]=b.dataset.nextDone.split(':').map(Number); const item=state.library[keyFor('tv',id)]; if(!item)return;
    item.seasons=item.seasons||{}; const cur=item.seasons[s]||item.seasons[String(s)];
    if(Array.isArray(cur)){ if(!cur.includes(eNo))cur.push(eNo); }
    else { item.seasons[s]=(cur&&typeof cur==='object')?cur:{}; item.seasons[s][eNo]=true; }
    item.status='watching'; item.updatedAt=Date.now(); saveLibrary(); renderLibrary(); toast(`S${s} E${eNo} als gesehen markiert`);
  });
  setTimeout(render,0);
})();