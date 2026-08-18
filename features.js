/* WatchTrack v2.1 feature pack: provider filters, release calendar, split library */
state.providerFilter = state.providerFilter || '';
state.providerCatalog = state.providerCatalog || { movie: [], tv: [] };
state.providerMap = state.providerMap || {};
state.releaseDates = null;

function wtEnsureUI() {
  const category = $('#categoryChips');
  if (category && !$('#providerChips')) {
    category.insertAdjacentHTML('afterend', '<div class="filter-label">Streaming-Anbieter</div><div id="providerChips" class="chip-row provider-filter-row" aria-label="Streaming-Anbieter"></div>');
  }
  const labels = { all: 'Alle', watchlist: 'Will ich sehen', watching: 'Schaue ich', completed: 'Gesehen' };
  $$('[data-libfilter]').forEach(b => { if (labels[b.dataset.libfilter]) b.textContent = labels[b.dataset.libfilter]; });
}
wtEnsureUI();

const WT_PREFERRED_PROVIDERS = ['Netflix', 'Disney Plus', 'Amazon Prime Video', 'WOW', 'Apple TV Plus', 'Paramount Plus'];

function wtProviderNames(type, id) {
  return state.providerMap[keyFor(type, id)] || [];
}

const wtBaseCard = card;
card = function(x, type) {
  const lib = state.library[keyFor(type, x.id)];
  const date = type === 'movie' ? x.release_date : x.first_air_date;
  const isFuture = date && date > todayISO();
  const names = wtProviderNames(type, x.id);
  return `<article class="media-card" data-open="${type}:${x.id}">
    <div class="poster-wrap">
      ${x.poster_path ? `<img class="poster" loading="lazy" src="${IMG + x.poster_path}" alt="Poster von ${esc(titleOf(x))}">` : `<div class="poster-fallback">${type === 'movie' ? '🎬' : '📺'}</div>`}
      ${isFuture ? `<span class="badge release-badge">${shortDate(date)}</span>` : ''}
      ${lib ? `<span class="badge library-badge">${lib.status === 'completed' ? '✓' : lib.status === 'watching' ? '▶' : '+'}</span>` : ''}
      ${Number(x.vote_average) > 0 ? `<span class="rating-badge">★ ${Number(x.vote_average).toFixed(1)}</span>` : ''}
    </div>
    <div class="media-info">
      <div class="media-title">${esc(titleOf(x))}</div>
      <div class="media-meta"><span>${type === 'movie' ? 'Film' : 'Serie'}</span><span>${esc(yearOf(x))}</span></div>
      ${names.length ? `<div class="card-providers">${names.slice(0, 3).map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
    </div>
  </article>`;
};

function wtRenderDiscoverContent() {
  const box = $('#discoverContent');
  const items = state.discoverItems || [];
  if (!items.length) {
    box.className = 'card-grid';
    box.innerHTML = empty('Keine Treffer', 'Für diese Auswahl wurden keine Titel gefunden.');
    return;
  }
  if (state.discoverCategory === 'upcoming') {
    const dateKey = state.discoverType === 'movie' ? 'release_date' : 'first_air_date';
    const groups = new Map();
    items.forEach(x => {
      const d = x[dateKey] || '9999-12-31';
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(x);
    });
    box.className = 'calendar-list';
    box.innerHTML = [...groups.entries()].map(([date, group]) => `<section class="calendar-day">
      <div class="calendar-date"><strong>${date === '9999-12-31' ? 'Datum noch offen' : dateDE(date)}</strong><span>${group.length} Titel</span></div>
      <div class="card-grid">${group.map(x => card(x, state.discoverType)).join('')}</div>
    </section>`).join('');
  } else {
    box.className = 'card-grid';
    box.innerHTML = items.map(x => card(x, state.discoverType)).join('');
  }
}

async function wtProviderSummary(type, id) {
  const k = keyFor(type, id);
  if (Object.prototype.hasOwnProperty.call(state.providerMap, k)) return state.providerMap[k];
  try {
    const data = await api(`/${type}/${id}/watch/providers`);
    const p = data?.results?.[state.region];
    const all = [...(p?.flatrate || []), ...(p?.free || []), ...(p?.ads || [])];
    const names = [...new Set(all.map(x => x.provider_name).filter(Boolean))];
    state.providerMap[k] = names;
  } catch {
    state.providerMap[k] = [];
  }
  return state.providerMap[k];
}

async function wtHydrateProviders(items, type) {
  await Promise.all((items || []).slice(0, 20).map(x => wtProviderSummary(type, x.id)));
  wtRenderDiscoverContent();
}

async function wtEnsureProviderCatalog(type) {
  if (state.providerCatalog[type]?.length) return state.providerCatalog[type];
  try {
    const data = await api(`/watch/providers/${type === 'movie' ? 'movie' : 'tv'}`, { language: 'de-DE', watch_region: state.region });
    state.providerCatalog[type] = data.results || [];
  } catch {
    state.providerCatalog[type] = [];
  }
  return state.providerCatalog[type];
}

function wtRenderProviderChips() {
  const box = $('#providerChips');
  if (!box) return;
  const list = state.providerCatalog[state.discoverType] || [];
  const byName = new Map(list.map(x => [x.provider_name, x]));
  const picked = WT_PREFERRED_PROVIDERS.map(n => byName.get(n)).filter(Boolean);
  box.innerHTML = `<button class="chip ${!state.providerFilter ? 'active' : ''}" data-provider="">Alle Anbieter</button>` + picked.map(p =>
    `<button class="chip provider-chip ${String(p.provider_id) === String(state.providerFilter) ? 'active' : ''}" data-provider="${p.provider_id}">${p.logo_path ? `<img src="${LOGO + p.logo_path}" alt="">` : ''}${esc(p.provider_name.replace(' Plus', '+'))}</button>`
  ).join('');
}

const wtBaseFetchDiscover = fetchDiscover;
fetchDiscover = async function(type, category, page) {
  if (!state.providerFilter) return wtBaseFetchDiscover(type, category, page);
  const common = { language: 'de-DE', page, watch_region: state.region, with_watch_providers: state.providerFilter, include_adult: false };
  if (type === 'movie') {
    if (category === 'upcoming') return api('/discover/movie', { ...common, sort_by: 'primary_release_date.asc', 'primary_release_date.gte': todayISO(), 'primary_release_date.lte': plusDaysISO(365) });
    if (category === 'now') return api('/discover/movie', { ...common, sort_by: 'popularity.desc', 'primary_release_date.gte': plusDaysISO(-60), 'primary_release_date.lte': todayISO() });
    if (category === 'top') return api('/discover/movie', { ...common, sort_by: 'vote_average.desc', 'vote_count.gte': 200 });
    return api('/discover/movie', { ...common, sort_by: 'popularity.desc', 'primary_release_date.lte': todayISO() });
  }
  if (category === 'upcoming') return api('/discover/tv', { ...common, sort_by: 'first_air_date.asc', include_null_first_air_dates: false, 'first_air_date.gte': todayISO(), 'first_air_date.lte': plusDaysISO(365) });
  if (category === 'onair') return api('/discover/tv', { ...common, sort_by: 'popularity.desc', 'air_date.gte': plusDaysISO(-30), 'air_date.lte': plusDaysISO(30) });
  if (category === 'top') return api('/discover/tv', { ...common, sort_by: 'vote_average.desc', 'vote_count.gte': 200 });
  return api('/discover/tv', { ...common, sort_by: 'popularity.desc', 'first_air_date.lte': todayISO() });
};

loadDiscover = async function({ append = false } = {}) {
  const box = $('#discoverContent');
  renderCategoryChips();
  wtRenderProviderChips();
  if (!state.token) {
    state.discoverItems = [];
    box.className = 'card-grid';
    box.innerHTML = empty('TMDB noch nicht verbunden', 'Öffne Setup und füge deinen kostenlosen Read Access Token ein.');
    $('#loadMoreBtn').hidden = true;
    updateConnectionUI();
    return;
  }
  await wtEnsureProviderCatalog(state.discoverType);
  wtRenderProviderChips();
  if (!append) {
    state.discoverPage = 1;
    state.discoverItems = [];
    box.className = 'card-grid';
    box.innerHTML = loading();
  }
  try {
    const page = append ? state.discoverPage + 1 : 1;
    const data = await fetchDiscover(state.discoverType, state.discoverCategory, page);
    let items = (data.results || []).filter(x => x.poster_path);
    if (state.discoverCategory === 'upcoming') {
      const dateKey = state.discoverType === 'movie' ? 'release_date' : 'first_air_date';
      items.sort((a, b) => String(a[dateKey] || '9999').localeCompare(String(b[dateKey] || '9999')));
    }
    state.discoverPage = page;
    state.discoverTotalPages = Math.min(Number(data.total_pages || 1), 500);
    const existing = new Set(state.discoverItems.map(x => x.id));
    state.discoverItems.push(...items.filter(x => !existing.has(x.id)));
    wtRenderDiscoverContent();
    wtHydrateProviders(state.discoverItems, state.discoverType);
    $('#loadMoreBtn').hidden = state.discoverPage >= state.discoverTotalPages;
    updateConnectionUI(true);
  } catch (e) {
    if (!append) box.innerHTML = empty('Abruf fehlgeschlagen', e.message);
    toast(e.message);
    $('#loadMoreBtn').hidden = true;
    updateConnectionUI(false);
  }
};

const wtBaseSyncLibraryMeta = syncLibraryMeta;
syncLibraryMeta = function(data) {
  wtBaseSyncLibraryMeta(data);
  const lib = state.library[keyFor(data.media_type, data.id)];
  if (!lib) return;
  lib.releaseDate = data.media_type === 'movie' ? (data.release_date || lib.releaseDate || '') : (data.first_air_date || lib.releaseDate || '');
  if (data.media_type === 'tv' && data.next_episode_to_air) {
    lib.nextEpisode = {
      season: data.next_episode_to_air.season_number,
      episode: data.next_episode_to_air.episode_number,
      airDate: data.next_episode_to_air.air_date || '',
      name: data.next_episode_to_air.name || ''
    };
  }
  saveLibrary();
};

function wtReleaseTimelineHtml(type) {
  if (type !== 'movie') return '';
  const rel = state.releaseDates?.results?.find(x => x.iso_3166_1 === state.region)?.release_dates || [];
  if (!rel.length) return '';
  const labels = { 1: 'Premiere', 2: 'Kino (limitiert)', 3: 'Kino', 4: 'Digital', 5: 'Blu-ray / DVD', 6: 'TV' };
  const earliest = new Map();
  rel.forEach(x => {
    const date = String(x.release_date || '').slice(0, 10);
    if (!date || !labels[x.type]) return;
    if (!earliest.has(x.type) || date < earliest.get(x.type)) earliest.set(x.type, date);
  });
  const rows = [...earliest.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  if (!rows.length) return '';
  return `<div class="info-block release-timeline"><h3>Veröffentlichungen · ${esc(regionName())}</h3><div class="release-list">${rows.map(([t, d]) => `<div><span>${esc(labels[t])}</span><strong>${dateDE(d)}</strong></div>`).join('')}</div></div>`;
}

const wtBaseRenderDetail = renderDetail;
renderDetail = function(data) {
  wtBaseRenderDetail(data);
  const timeline = wtReleaseTimelineHtml(data.media_type);
  if (!timeline) return;
  const body = $('#detailContent .detail-body');
  const provider = body?.querySelector('.info-block');
  if (body) {
    const holder = document.createElement('div');
    holder.innerHTML = timeline;
    const node = holder.firstElementChild;
    if (provider) body.insertBefore(node, provider);
    else body.appendChild(node);
  }
};

openDetail = async function(type, id) {
  const dlg = $('#detailDialog');
  const box = $('#detailContent');
  state.openSeason = null;
  if (!dlg.open) dlg.showModal();
  box.innerHTML = loading('Titel-, Termin- und Anbieterinformationen werden geladen …');
  try {
    const [data, providerData, releaseData] = await Promise.all([
      api(`/${type}/${id}`, { language: 'de-DE', append_to_response: 'videos' }),
      api(`/${type}/${id}/watch/providers`).catch(() => null),
      type === 'movie' ? api(`/movie/${id}/release_dates`).catch(() => null) : Promise.resolve(null)
    ]);
    data.media_type = type;
    state.currentDetail = data;
    state.providers = providerData?.results?.[state.region] || null;
    state.releaseDates = releaseData;
    syncLibraryMeta(data);
    renderDetail(data);
  } catch (e) {
    box.innerHTML = empty('Details konnten nicht geladen werden', e.message);
  }
};

function wtLibraryRow(x) {
  const p = progressFor(x);
  const eps = x.type === 'tv' ? `${watchedCount(x)}/${totalEpisodeCount(x) || '?'} Folgen` : '';
  const next = x.type === 'tv' && x.nextEpisode?.airDate
    ? `Nächste Folge: S${x.nextEpisode.season} E${x.nextEpisode.episode} · ${dateDE(x.nextEpisode.airDate)}`
    : (x.releaseDate && x.releaseDate > todayISO() ? `Start: ${dateDE(x.releaseDate)}` : '');
  return `<div class="library-row" data-open="${x.type}:${x.id}">
    ${x.poster_path ? `<img src="${IMG + x.poster_path}" alt="">` : '<div class="mini-poster"></div>'}
    <div class="library-copy"><h3>${esc(x.title)}</h3><p>${x.status === 'completed' ? 'Gesehen' : x.status === 'watching' ? 'Schaue ich' : 'Will ich sehen'} · ${esc(x.year)}</p>${next ? `<small class="upcoming-note">${esc(next)}</small>` : ''}${eps ? `<small>${esc(eps)}</small>` : ''}<div class="progress"><span style="width:${p}%"></span></div></div>
    <div class="row-actions"><button class="tiny" data-quick="${x.type}:${x.id}:completed" aria-label="Gesehen">✓</button><button class="tiny" data-quick="${x.type}:${x.id}:remove" aria-label="Entfernen">×</button></div>
  </div>`;
}

renderLibrary = function() {
  const items = Object.values(state.library).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  $('#statWatching').textContent = items.filter(x => x.status === 'watching').length;
  $('#statCompleted').textContent = items.filter(x => x.status === 'completed').length;
  $('#statWatchlist').textContent = items.filter(x => x.status === 'watchlist').length;
  const filtered = state.libFilter === 'all' ? items : items.filter(x => x.status === state.libFilter);
  const movies = filtered.filter(x => x.type === 'movie');
  const series = filtered.filter(x => x.type === 'tv');
  const group = (title, icon, arr) => `<section class="library-group"><div class="library-group-head"><h2>${icon} ${title}</h2><span>${arr.length}</span></div>${arr.length ? `<div class="library-list">${arr.map(wtLibraryRow).join('')}</div>` : `<div class="library-empty">Keine ${title.toLowerCase()} in dieser Auswahl.</div>`}</section>`;
  const box = $('#libraryContent');
  box.className = 'library-groups';
  box.innerHTML = items.length ? group('Filme', '🎬', movies) + group('Serien', '📺', series) : empty('Noch nichts hier', 'Öffne einen Film oder eine Serie und füge den Titel deiner Liste hinzu.');
};

document.addEventListener('click', e => {
  const p = e.target.closest('[data-provider]');
  if (!p) return;
  state.providerFilter = p.dataset.provider || '';
  wtRenderProviderChips();
  loadDiscover();
});

const wtRegion = $('#regionSelect');
wtRegion?.addEventListener('change', () => {
  state.providerCatalog = { movie: [], tv: [] };
  state.providerMap = {};
  state.providerFilter = '';
});

// Re-render once the feature pack is loaded.
renderLibrary();
if (state.token) loadDiscover();
