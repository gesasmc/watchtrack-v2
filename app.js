const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';
const LOGO = 'https://image.tmdb.org/t/p/w92';
const BACK = 'https://image.tmdb.org/t/p/w780';
const DAY = 86400000;

const CATEGORIES = {
  movie: [
    { id: 'upcoming', label: 'Bald', title: 'Bald im Kino', hint: 'Kommende Filmstarts' },
    { id: 'now', label: 'Jetzt', title: 'Jetzt im Kino', hint: 'Aktuelle Kinofilme' },
    { id: 'popular', label: 'Beliebt', title: 'Beliebte Filme', hint: 'Aktuell besonders gefragt' },
    { id: 'top', label: 'Top', title: 'Top bewertete Filme', hint: 'Von der Community hoch bewertet' },
    { id: 'catalog', label: 'Katalog', title: 'Filme entdecken', hint: 'Vorhandene Filme nach Popularität' }
  ],
  tv: [
    { id: 'upcoming', label: 'Bald', title: 'Kommende Serien', hint: 'Neue Serien mit angekündigtem Start' },
    { id: 'onair', label: 'Läuft', title: 'Serien, die gerade laufen', hint: 'Aktuell ausgestrahlte Serien' },
    { id: 'popular', label: 'Beliebt', title: 'Beliebte Serien', hint: 'Aktuell besonders gefragt' },
    { id: 'top', label: 'Top', title: 'Top bewertete Serien', hint: 'Von der Community hoch bewertet' },
    { id: 'catalog', label: 'Katalog', title: 'Serien entdecken', hint: 'Vorhandene Serien nach Popularität' }
  ]
};

const state = {
  token: localStorage.getItem('wt_tmdb_token') || '',
  region: localStorage.getItem('wt_region') || 'DE',
  library: readJSON('wt_library', {}),
  discoverType: 'movie',
  discoverCategory: 'upcoming',
  discoverPage: 1,
  discoverTotalPages: 1,
  discoverItems: [],
  searchPage: 1,
  searchTotalPages: 1,
  searchQuery: '',
  searchItems: [],
  libFilter: 'all',
  currentDetail: null,
  providers: null,
  openSeason: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
  catch { return fallback; }
}
function saveLibrary() { localStorage.setItem('wt_library', JSON.stringify(state.library)); }
function saveRegion() { localStorage.setItem('wt_region', state.region); }
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2000);
}
function esc(s = '') {
  return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(days) { return new Date(Date.now() + days * DAY).toISOString().slice(0, 10); }
function dateDE(s) {
  if (!s) return 'ohne Datum';
  const d = new Date(s + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return 'ohne Datum';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
function shortDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
}
function yearOf(x) { return (x.release_date || x.first_air_date || '').slice(0, 4) || '—'; }
function titleOf(x) { return x.title || x.name || x.original_title || x.original_name || 'Unbekannt'; }
function keyFor(type, id) { return `${type}:${id}`; }
function regionName() { return ({ DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' })[state.region] || state.region; }
function runtimeText(data) {
  if (data.media_type === 'movie' && data.runtime) return `${data.runtime} Min.`;
  const mins = data.episode_run_time?.filter(Boolean)?.[0];
  return mins ? `ca. ${mins} Min./Folge` : '';
}
function ratingText(v) { return Number(v) > 0 ? `★ ${Number(v).toFixed(1)}` : 'noch keine Wertung'; }
function statusLabel(s) {
  const map = { Returning_Series: 'Fortgesetzt', Ended: 'Beendet', Released: 'Veröffentlicht', Post_Production: 'Postproduktion', Planned: 'Geplant', In_Production: 'In Produktion', Canceled: 'Abgesetzt' };
  return map[String(s || '').replace(/ /g, '_')] || s || '';
}

async function api(path, params = {}) {
  if (!state.token) throw new Error('Kein TMDB Read Access Token gespeichert');
  const u = new URL(TMDB + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  });
  const r = await fetch(u, { headers: { Authorization: `Bearer ${state.token}`, accept: 'application/json' } });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.status_message || `TMDB Fehler ${r.status}`);
  }
  return r.json();
}

function empty(title, text = '') { return `<div class="empty"><strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ''}</div>`; }
function loading(text = 'Daten werden von TMDB geladen …') { return `<div class="empty loading"><span class="spinner"></span><strong>Lade …</strong><span>${esc(text)}</span></div>`; }

function card(x, type) {
  const lib = state.library[keyFor(type, x.id)];
  const date = type === 'movie' ? x.release_date : x.first_air_date;
  const isFuture = date && date > todayISO();
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
    </div>
  </article>`;
}

function renderCategoryChips() {
  $('#categoryChips').innerHTML = CATEGORIES[state.discoverType].map(c =>
    `<button class="chip ${c.id === state.discoverCategory ? 'active' : ''}" data-category="${c.id}">${esc(c.label)}</button>`
  ).join('');
  const c = CATEGORIES[state.discoverType].find(x => x.id === state.discoverCategory) || CATEGORIES[state.discoverType][0];
  $('#discoverTitle').textContent = c.title;
  $('#discoverHint').textContent = `${c.hint} · Region ${regionName()}`;
}

async function fetchDiscover(type, category, page) {
  const common = { language: 'de-DE', page };
  if (type === 'movie') {
    if (category === 'upcoming') return api('/movie/upcoming', { ...common, region: state.region });
    if (category === 'now') return api('/movie/now_playing', { ...common, region: state.region });
    if (category === 'popular') return api('/movie/popular', { ...common, region: state.region });
    if (category === 'top') return api('/movie/top_rated', { ...common, region: state.region });
    return api('/discover/movie', { ...common, region: state.region, sort_by: 'popularity.desc', include_adult: false, 'primary_release_date.lte': todayISO() });
  }
  if (category === 'upcoming') {
    return api('/discover/tv', {
      ...common,
      sort_by: 'first_air_date.asc',
      include_adult: false,
      include_null_first_air_dates: false,
      'first_air_date.gte': todayISO(),
      'first_air_date.lte': plusDaysISO(365),
      'vote_count.gte': 0
    });
  }
  if (category === 'onair') return api('/tv/on_the_air', common);
  if (category === 'popular') return api('/tv/popular', common);
  if (category === 'top') return api('/tv/top_rated', common);
  return api('/discover/tv', { ...common, sort_by: 'popularity.desc', include_adult: false, 'first_air_date.lte': todayISO() });
}

async function loadDiscover({ append = false } = {}) {
  const box = $('#discoverContent');
  renderCategoryChips();
  if (!state.token) {
    state.discoverItems = [];
    box.innerHTML = empty('TMDB noch nicht verbunden', 'Öffne Setup und füge deinen kostenlosen Read Access Token ein.');
    $('#loadMoreBtn').hidden = true;
    updateConnectionUI();
    return;
  }
  if (!append) {
    state.discoverPage = 1;
    state.discoverItems = [];
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
    box.innerHTML = state.discoverItems.length ? state.discoverItems.map(x => card(x, state.discoverType)).join('') : empty('Keine Treffer', 'Für diese Auswahl wurden keine Titel gefunden.');
    $('#loadMoreBtn').hidden = state.discoverPage >= state.discoverTotalPages;
    updateConnectionUI(true);
  } catch (e) {
    if (!append) box.innerHTML = empty('Abruf fehlgeschlagen', e.message);
    toast(e.message);
    $('#loadMoreBtn').hidden = true;
    updateConnectionUI(false);
  }
}

async function search({ append = false } = {}) {
  const inputQ = $('#searchInput').value.trim();
  const q = append ? state.searchQuery : inputQ;
  const box = $('#searchResults');
  if (!q) return;
  if (!state.token) {
    box.innerHTML = empty('TMDB noch nicht verbunden', 'Bitte zuerst unter Setup verbinden.');
    return;
  }
  if (!append) {
    state.searchQuery = q;
    state.searchPage = 1;
    state.searchItems = [];
    box.innerHTML = loading(`Suche nach „${q}“ …`);
  }
  try {
    const page = append ? state.searchPage + 1 : 1;
    const data = await api('/search/multi', { query: q, language: 'de-DE', include_adult: false, page });
    const items = (data.results || []).filter(x => ['movie', 'tv'].includes(x.media_type) && x.poster_path);
    const existing = new Set(state.searchItems.map(x => `${x.media_type}:${x.id}`));
    state.searchItems.push(...items.filter(x => !existing.has(`${x.media_type}:${x.id}`)));
    state.searchPage = page;
    state.searchTotalPages = Math.min(Number(data.total_pages || 1), 500);
    box.innerHTML = state.searchItems.length ? state.searchItems.map(x => card(x, x.media_type)).join('') : empty('Keine Treffer', 'Versuche einen anderen Titel.');
    $('#searchMoreBtn').hidden = state.searchPage >= state.searchTotalPages;
  } catch (e) {
    if (!append) box.innerHTML = empty('Suche fehlgeschlagen', e.message);
    toast(e.message);
  }
}

async function openDetail(type, id) {
  const dlg = $('#detailDialog');
  const box = $('#detailContent');
  state.openSeason = null;
  if (!dlg.open) dlg.showModal();
  box.innerHTML = loading('Titel- und Anbieterinformationen werden geladen …');
  try {
    const [data, providerData] = await Promise.all([
      api(`/${type}/${id}`, { language: 'de-DE', append_to_response: 'videos' }),
      api(`/${type}/${id}/watch/providers`).catch(() => null)
    ]);
    data.media_type = type;
    state.currentDetail = data;
    state.providers = providerData?.results?.[state.region] || null;
    syncLibraryMeta(data);
    renderDetail(data);
  } catch (e) {
    box.innerHTML = empty('Details konnten nicht geladen werden', e.message);
  }
}

function libItemFrom(data) {
  return {
    id: data.id,
    type: data.media_type,
    title: titleOf(data),
    poster_path: data.poster_path || null,
    year: yearOf(data),
    status: 'watchlist',
    seasons: {},
    seasonMeta: {},
    updatedAt: Date.now()
  };
}
function ensureLib(data) {
  const k = keyFor(data.media_type, data.id);
  if (!state.library[k]) state.library[k] = libItemFrom(data);
  return state.library[k];
}
function syncLibraryMeta(data) {
  const lib = state.library[keyFor(data.media_type, data.id)];
  if (!lib) return;
  lib.title = titleOf(data);
  lib.poster_path = data.poster_path || lib.poster_path || null;
  lib.year = yearOf(data);
  if (data.media_type === 'tv') {
    lib.seasonMeta = lib.seasonMeta || {};
    (data.seasons || []).filter(s => s.season_number > 0).forEach(s => {
      lib.seasonMeta[s.season_number] = { name: s.name || `Staffel ${s.season_number}`, episodeCount: s.episode_count || 0 };
    });
  }
  saveLibrary();
}

function providerSection() {
  const p = state.providers;
  if (!p) return `<div class="info-block"><h3>Streaming</h3><p class="muted">Für ${esc(regionName())} sind keine Anbieterangaben hinterlegt.</p></div>`;
  const groups = [
    ['flatrate', 'Stream'], ['free', 'Kostenlos'], ['ads', 'Mit Werbung'], ['rent', 'Leihen'], ['buy', 'Kaufen']
  ].filter(([key]) => Array.isArray(p[key]) && p[key].length);
  if (!groups.length) return `<div class="info-block"><h3>Streaming</h3><p class="muted">Für ${esc(regionName())} sind aktuell keine Anbieterangaben hinterlegt.</p></div>`;
  return `<div class="info-block"><h3>Wo verfügbar?</h3>${groups.map(([key, label]) => `
    <div class="provider-group"><span>${label}</span><div class="provider-logos">${p[key].slice(0, 8).map(x => `<span class="provider" title="${esc(x.provider_name)}">${x.logo_path ? `<img src="${LOGO + x.logo_path}" alt="${esc(x.provider_name)}">` : ''}<small>${esc(x.provider_name)}</small></span>`).join('')}</div></div>
  `).join('')}${p.link ? `<a class="text-link provider-link" href="${esc(p.link)}" target="_blank" rel="noreferrer">Verfügbarkeit bei TMDB ansehen ↗</a>` : ''}<p class="provider-attribution">Anbieterdaten bereitgestellt von <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer">JustWatch</a>.</p></div>`;
}

function getTrailer(data) {
  const vids = data.videos?.results || [];
  return vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) || vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') || null;
}

function renderDetail(data) {
  const type = data.media_type;
  const k = keyFor(type, data.id);
  const lib = state.library[k];
  const poster = data.poster_path ? `<img class="mini-poster detail-poster" src="${IMG + data.poster_path}" alt="Poster von ${esc(titleOf(data))}">` : '';
  const back = data.backdrop_path ? `<img class="hero-backdrop" src="${BACK + data.backdrop_path}" alt="">` : '';
  const genres = (data.genres || []).map(g => g.name).join(' · ');
  const trailer = getTrailer(data);
  let seasons = '';
  if (type === 'tv') {
    const ss = (data.seasons || []).filter(s => s.season_number > 0);
    seasons = `<div class="info-block seasons-block"><div class="block-title-row"><h3>Staffeln & Folgen</h3><span>${ss.length} Staffeln</span></div>${ss.map(s => {
      const watched = lib?.seasons?.[s.season_number] || {};
      const done = Object.values(watched).filter(Boolean).length;
      return `<div class="season">
        <div class="season-head">
          <div><h3>${esc(s.name || `Staffel ${s.season_number}`)}</h3><small>${done}/${s.episode_count || 0} gesehen</small></div>
          <div class="season-buttons"><button class="season-all" data-season-all="${s.season_number}" aria-label="Staffel komplett gesehen">✓ Staffel</button><button class="season-toggle" data-season="${s.season_number}">Folgen</button></div>
        </div>
        <div class="episodes" id="season-${s.season_number}" hidden></div>
      </div>`;
    }).join('')}</div>`;
  }
  const status = lib?.status || '';
  const releaseDate = type === 'movie' ? data.release_date : data.first_air_date;
  const next = type === 'tv' && data.next_episode_to_air ? `<div class="next-episode"><span>Nächste Folge</span><strong>S${data.next_episode_to_air.season_number} E${data.next_episode_to_air.episode_number} · ${esc(data.next_episode_to_air.name || 'Neue Folge')}</strong><small>${dateDE(data.next_episode_to_air.air_date)}</small></div>` : '';

  $('#detailContent').innerHTML = `<div class="hero">${back}<div class="hero-gradient"></div><div class="hero-content">${poster}<div class="hero-copy"><div class="type-kicker">${type === 'movie' ? 'FILM' : 'SERIE'}</div><h2>${esc(titleOf(data))}</h2><p>${[yearOf(data), runtimeText(data), ratingText(data.vote_average)].filter(Boolean).map(esc).join(' · ')}</p></div></div></div>
  <div class="detail-body">
    <div class="detail-actions">
      <button class="${status === 'watchlist' ? 'primary' : 'secondary'}" data-status="watchlist">＋ Später</button>
      <button class="${status === 'watching' ? 'primary' : 'secondary'}" data-status="watching">▶ Schauen</button>
      <button class="${status === 'completed' ? 'primary' : 'secondary'}" data-status="completed">✓ Fertig</button>
      ${lib ? '<button class="danger" data-remove>Entfernen</button>' : ''}
    </div>
    ${next}
    <div class="facts">${releaseDate ? `<span>${dateDE(releaseDate)}</span>` : ''}${genres ? `<span>${esc(genres)}</span>` : ''}${data.status ? `<span>${esc(statusLabel(data.status))}</span>` : ''}</div>
    ${data.tagline ? `<p class="tagline">${esc(data.tagline)}</p>` : ''}
    <p class="overview">${esc(data.overview || 'Keine deutsche Beschreibung verfügbar.')}</p>
    ${trailer ? `<a class="trailer-btn" href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}" target="_blank" rel="noreferrer">▶ Trailer ansehen</a>` : ''}
    ${providerSection()}
    ${seasons}
  </div>`;
}

async function loadSeason(num, forceOpen = false) {
  const data = state.currentDetail;
  if (!data) return null;
  const box = $(`#season-${num}`);
  if (!box) return null;
  if (!forceOpen && !box.hidden) { box.hidden = true; state.openSeason = null; return null; }
  box.hidden = false;
  state.openSeason = num;
  box.innerHTML = '<div class="episode-loading">Lade Folgen …</div>';
  try {
    const season = await api(`/tv/${data.id}/season/${num}`, { language: 'de-DE' });
    const lib = ensureLib(data);
    lib.seasons[num] = lib.seasons[num] || {};
    lib.seasonMeta = lib.seasonMeta || {};
    lib.seasonMeta[num] = { name: season.name || `Staffel ${num}`, episodeCount: (season.episodes || []).length };
    saveLibrary();
    box.innerHTML = (season.episodes || []).map(ep => {
      const done = !!lib.seasons?.[num]?.[ep.episode_number];
      return `<div class="episode">
        <div class="episode-num">E${ep.episode_number}</div>
        <div class="episode-copy"><strong>${esc(ep.name || `Folge ${ep.episode_number}`)}</strong><small>${ep.air_date ? dateDE(ep.air_date) : 'ohne Datum'}</small></div>
        <button class="check-btn ${done ? 'done' : ''}" data-episode="${num}:${ep.episode_number}" aria-label="${done ? 'Als ungesehen markieren' : 'Als gesehen markieren'}">✓</button>
      </div>`;
    }).join('') || '<div class="episode-loading">Keine Episoden gefunden.</div>';
    renderLibrary();
    return season;
  } catch (e) {
    box.innerHTML = `<div class="episode-loading">${esc(e.message)}</div>`;
    return null;
  }
}

async function markSeasonComplete(num) {
  const data = state.currentDetail;
  if (!data) return;
  const season = await loadSeason(num, true);
  if (!season) return;
  const lib = ensureLib(data);
  lib.seasons[num] = lib.seasons[num] || {};
  (season.episodes || []).forEach(ep => { lib.seasons[num][ep.episode_number] = true; });
  lib.status = 'watching';
  lib.updatedAt = Date.now();
  saveLibrary();
  renderDetail(data);
  await loadSeason(num, true);
  renderLibrary();
  toast(`Staffel ${num} als gesehen markiert`);
}

async function toggleEpisode(season, episode) {
  const data = state.currentDetail;
  const lib = ensureLib(data);
  lib.seasons[season] = lib.seasons[season] || {};
  lib.seasons[season][episode] = !lib.seasons[season][episode];
  if (lib.status !== 'completed') lib.status = 'watching';
  lib.updatedAt = Date.now();
  saveLibrary();
  const currentSeason = state.openSeason;
  renderDetail(data);
  if (currentSeason !== null) await loadSeason(currentSeason, true);
  renderLibrary();
}

function setStatus(status) {
  const d = state.currentDetail;
  if (!d) return;
  const lib = ensureLib(d);
  lib.status = status;
  lib.updatedAt = Date.now();
  syncLibraryMeta(d);
  saveLibrary();
  renderDetail(d);
  renderLibrary();
  toast(status === 'completed' ? 'Als fertig markiert' : status === 'watching' ? 'Als „am Schauen“ markiert' : 'Zur Watchlist hinzugefügt');
}
function removeCurrent() {
  const d = state.currentDetail;
  if (!d) return;
  delete state.library[keyFor(d.media_type, d.id)];
  saveLibrary();
  renderDetail(d);
  renderLibrary();
  toast('Aus deiner Liste entfernt');
}
function progressFor(lib) {
  if (lib.type === 'movie') return lib.status === 'completed' ? 100 : lib.status === 'watching' ? 50 : 0;
  if (lib.status === 'completed') return 100;
  const total = Object.values(lib.seasonMeta || {}).reduce((sum, s) => sum + Number(s.episodeCount || 0), 0);
  let done = 0;
  Object.values(lib.seasons || {}).forEach(s => { done += Object.values(s || {}).filter(Boolean).length; });
  return total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
}
function watchedCount(lib) {
  let done = 0;
  Object.values(lib.seasons || {}).forEach(s => { done += Object.values(s || {}).filter(Boolean).length; });
  return done;
}
function totalEpisodeCount(lib) {
  return Object.values(lib.seasonMeta || {}).reduce((sum, s) => sum + Number(s.episodeCount || 0), 0);
}
function renderLibrary() {
  const items = Object.values(state.library).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  $('#statWatching').textContent = items.filter(x => x.status === 'watching').length;
  $('#statCompleted').textContent = items.filter(x => x.status === 'completed').length;
  $('#statWatchlist').textContent = items.filter(x => x.status === 'watchlist').length;
  const filtered = state.libFilter === 'all' ? items : items.filter(x => x.status === state.libFilter);
  const box = $('#libraryContent');
  box.innerHTML = filtered.length ? filtered.map(x => {
    const p = progressFor(x);
    const eps = x.type === 'tv' ? `${watchedCount(x)}/${totalEpisodeCount(x) || '?'} Folgen` : '';
    return `<div class="library-row" data-open="${x.type}:${x.id}">
      ${x.poster_path ? `<img src="${IMG + x.poster_path}" alt="">` : '<div class="mini-poster"></div>'}
      <div class="library-copy"><h3>${esc(x.title)}</h3><p>${x.type === 'movie' ? 'Film' : 'Serie'} · ${esc(x.year)} · ${x.status === 'completed' ? 'Fertig' : x.status === 'watching' ? 'Am Schauen' : 'Watchlist'}</p>${eps ? `<small>${esc(eps)}</small>` : ''}<div class="progress"><span style="width:${p}%"></span></div></div>
      <div class="row-actions"><button class="tiny" data-quick="${x.type}:${x.id}:completed" aria-label="Fertig">✓</button><button class="tiny" data-quick="${x.type}:${x.id}:remove" aria-label="Entfernen">×</button></div>
    </div>`;
  }).join('') : empty('Noch nichts hier', 'Öffne einen Film oder eine Serie und füge den Titel deiner Liste hinzu.');
}

function updateConnectionUI(ok = null) {
  const dot = $('#connectionDot');
  if (!state.token) {
    dot.className = 'connection-dot';
    dot.title = 'Nicht verbunden';
    return;
  }
  dot.className = `connection-dot ${ok === false ? 'bad' : 'ok'}`;
  dot.title = ok === false ? 'Verbindung fehlgeschlagen' : 'TMDB verbunden';
}
async function testToken() {
  const status = $('#tokenStatus');
  state.token = $('#tokenInput').value.trim();
  if (!state.token) {
    status.textContent = 'Bitte einen Token einfügen.';
    status.className = 'status bad';
    updateConnectionUI(false);
    return;
  }
  status.textContent = 'Teste Verbindung …';
  status.className = 'status';
  try {
    await api('/configuration');
    localStorage.setItem('wt_tmdb_token', state.token);
    status.textContent = '✓ Verbindung erfolgreich – Katalog ist aktiv.';
    status.className = 'status ok';
    updateConnectionUI(true);
    toast('TMDB verbunden');
    loadDiscover();
  } catch (e) {
    status.textContent = '✕ ' + e.message;
    status.className = 'status bad';
    updateConnectionUI(false);
  }
}
function clearToken() {
  state.token = '';
  localStorage.removeItem('wt_tmdb_token');
  $('#tokenInput').value = '';
  $('#tokenStatus').textContent = 'Token entfernt.';
  $('#tokenStatus').className = 'status';
  updateConnectionUI();
  loadDiscover();
}
function exportData() {
  const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), region: state.region, library: state.library }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `watchtrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      state.library = j.library || j;
      if (j.region && ['DE', 'AT', 'CH'].includes(j.region)) {
        state.region = j.region;
        saveRegion();
        $('#regionSelect').value = state.region;
      }
      saveLibrary();
      renderLibrary();
      toast('Backup importiert');
    } catch { toast('Ungültige Backup-Datei'); }
  };
  r.readAsText(file);
}
function resetAll() {
  if (confirm('Wirklich alle gespeicherten Watch-Daten löschen? Der TMDB-Token bleibt erhalten.')) {
    state.library = {};
    saveLibrary();
    renderLibrary();
    toast('Watch-Daten gelöscht');
  }
}
function switchView(view) {
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'library') renderLibrary();
  if (view === 'discover') loadDiscover();
}

function selectDiscoverType(type) {
  state.discoverType = type;
  state.discoverCategory = 'upcoming';
  $$('[data-discover-type]').forEach(b => b.classList.toggle('active', b.dataset.discoverType === type));
  loadDiscover();
}

function selectCategory(category) {
  state.discoverCategory = category;
  loadDiscover();
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]');
  if (nav) return switchView(nav.dataset.view);
  const type = e.target.closest('[data-discover-type]');
  if (type) return selectDiscoverType(type.dataset.discoverType);
  const cat = e.target.closest('[data-category]');
  if (cat) return selectCategory(cat.dataset.category);
  const lf = e.target.closest('[data-libfilter]');
  if (lf) {
    state.libFilter = lf.dataset.libfilter;
    $$('[data-libfilter]').forEach(b => b.classList.toggle('active', b === lf));
    return renderLibrary();
  }
  const open = e.target.closest('[data-open]');
  if (open && !e.target.closest('[data-quick]')) {
    const [t, id] = open.dataset.open.split(':');
    return openDetail(t, id);
  }
  const s = e.target.closest('[data-status]');
  if (s) return setStatus(s.dataset.status);
  if (e.target.closest('[data-remove]')) return removeCurrent();
  const season = e.target.closest('[data-season]');
  if (season) return loadSeason(Number(season.dataset.season));
  const seasonAll = e.target.closest('[data-season-all]');
  if (seasonAll) return markSeasonComplete(Number(seasonAll.dataset.seasonAll));
  const ep = e.target.closest('[data-episode]');
  if (ep) {
    const [snum, n] = ep.dataset.episode.split(':').map(Number);
    return toggleEpisode(snum, n);
  }
  const quick = e.target.closest('[data-quick]');
  if (quick) {
    e.stopPropagation();
    const [t, id, action] = quick.dataset.quick.split(':');
    const k = keyFor(t, id);
    if (action === 'remove') delete state.library[k];
    else if (state.library[k]) { state.library[k].status = 'completed'; state.library[k].updatedAt = Date.now(); }
    saveLibrary();
    renderLibrary();
  }
});

$('#searchBtn').addEventListener('click', () => search());
$('#searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
$('#loadMoreBtn').addEventListener('click', () => loadDiscover({ append: true }));
$('#searchMoreBtn').addEventListener('click', () => search({ append: true }));
$('#refreshBtn').addEventListener('click', () => {
  const active = $('.view.active')?.id;
  if (active === 'view-discover') loadDiscover();
  if (active === 'view-library') renderLibrary();
  if (active === 'view-search' && state.searchQuery) search();
  toast('Aktualisiert');
});
$('#closeDialogBtn').addEventListener('click', () => $('#detailDialog').close());
$('#detailDialog').addEventListener('click', e => { if (e.target === $('#detailDialog')) $('#detailDialog').close(); });
$('#saveTokenBtn').addEventListener('click', testToken);
$('#clearTokenBtn').addEventListener('click', clearToken);
$('#exportBtn').addEventListener('click', exportData);
$('#importInput').addEventListener('change', e => e.target.files[0] && importData(e.target.files[0]));
$('#resetBtn').addEventListener('click', resetAll);
$('#regionSelect').addEventListener('change', e => {
  state.region = e.target.value;
  saveRegion();
  renderCategoryChips();
  loadDiscover();
  toast(`Region: ${regionName()}`);
});

$('#tokenInput').value = state.token;
$('#regionSelect').value = state.region;
renderLibrary();
renderCategoryChips();
updateConnectionUI(state.token ? true : null);
loadDiscover();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
