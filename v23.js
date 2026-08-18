/* WatchTrack v2.3: clean upcoming movies + manual titles */

// TMDBs /movie/upcoming can occasionally contain titles whose displayed
// release_date is old. For the "Bald" movie view, use Discover with an
// explicit future date window so only genuinely upcoming dates are shown.
const wt23BaseFetchDiscover = fetchDiscover;
fetchDiscover = async function(type, category, page) {
  if (type === 'movie' && category === 'upcoming') {
    const params = {
      language: 'de-DE',
      page,
      region: state.region,
      sort_by: 'primary_release_date.asc',
      include_adult: false,
      'primary_release_date.gte': todayISO(),
      'primary_release_date.lte': plusDaysISO(365)
    };
    if (state.providerFilter) {
      params.watch_region = state.region;
      params.with_watch_providers = state.providerFilter;
    }
    return api('/discover/movie', params);
  }
  return wt23BaseFetchDiscover(type, category, page);
};

const WT_MANUAL_KEY = 'wt_manual_library';
state.manualLibrary = readJSON(WT_MANUAL_KEY, {});

function wt23SaveManual() {
  localStorage.setItem(WT_MANUAL_KEY, JSON.stringify(state.manualLibrary));
}

function wt23EnsureManualUI() {
  const box = $('#libraryContent');
  if (!box || $('#manualAddCard')) return;
  box.insertAdjacentHTML('beforebegin', `
    <details id="manualAddCard" class="manual-add-card">
      <summary>＋ Eigenen Film oder eigene Serie hinzufügen</summary>
      <form id="manualAddForm" class="manual-add-form">
        <div class="manual-form-grid">
          <label>Typ
            <select id="manualType">
              <option value="movie">Film</option>
              <option value="tv">Serie</option>
            </select>
          </label>
          <label>Titel
            <input id="manualTitle" required maxlength="120" placeholder="Titel eingeben">
          </label>
          <label>Jahr
            <input id="manualYear" inputmode="numeric" maxlength="4" placeholder="z. B. 2026">
          </label>
          <label>Start / Erscheinungsdatum
            <input id="manualDate" type="date">
          </label>
          <label>Status
            <select id="manualStatus">
              <option value="watchlist">Will ich sehen</option>
              <option value="watching">Schaue ich</option>
              <option value="completed">Gesehen</option>
            </select>
          </label>
        </div>
        <button class="primary" type="submit">Hinzufügen</button>
        <p class="help-text">Für Titel, die TMDB nicht findet. Diese Einträge werden wie deine übrigen Watch-Daten gespeichert.</p>
      </form>
    </details>
    <div id="manualLibrary"></div>
  `);

  $('#manualAddForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#manualTitle').value.trim();
    if (!title) return;
    const type = $('#manualType').value === 'tv' ? 'tv' : 'movie';
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    state.manualLibrary[id] = {
      id,
      manual: true,
      type,
      title,
      year: $('#manualYear').value.trim() || ($('#manualDate').value || '').slice(0, 4) || '—',
      releaseDate: $('#manualDate').value || '',
      status: $('#manualStatus').value || 'watchlist',
      updatedAt: Date.now()
    };
    wt23SaveManual();
    e.target.reset();
    $('#manualAddCard').open = false;
    renderLibrary();
    toast('Eigener Titel hinzugefügt');
  });
}

function wt23StatusLabel(status) {
  return status === 'completed' ? 'Gesehen' : status === 'watching' ? 'Schaue ich' : 'Will ich sehen';
}

function wt23ManualRow(x) {
  const date = x.releaseDate ? ` · ${dateDE(x.releaseDate)}` : '';
  return `<div class="library-row manual-library-row">
    <div class="mini-poster manual-poster">${x.type === 'movie' ? '🎬' : '📺'}</div>
    <div class="library-copy">
      <h3>${esc(x.title)}</h3>
      <p>Eigener Eintrag · ${esc(x.year || '—')}${date}</p>
      <select class="manual-status" data-manual-status="${esc(x.id)}" aria-label="Status">
        <option value="watchlist" ${x.status === 'watchlist' ? 'selected' : ''}>Will ich sehen</option>
        <option value="watching" ${x.status === 'watching' ? 'selected' : ''}>Schaue ich</option>
        <option value="completed" ${x.status === 'completed' ? 'selected' : ''}>Gesehen</option>
      </select>
    </div>
    <div class="row-actions"><button class="tiny" data-manual-remove="${esc(x.id)}" aria-label="Entfernen">×</button></div>
  </div>`;
}

function wt23RenderManual() {
  wt23EnsureManualUI();
  const host = $('#manualLibrary');
  if (!host) return;
  const all = Object.values(state.manualLibrary).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const filtered = state.libFilter === 'all' ? all : all.filter(x => x.status === state.libFilter);
  const movies = filtered.filter(x => x.type === 'movie');
  const series = filtered.filter(x => x.type === 'tv');
  if (!all.length) {
    host.innerHTML = '';
    return;
  }
  const group = (title, icon, arr) => arr.length ? `<section class="library-group manual-group"><div class="library-group-head"><h2>${icon} Eigene ${title}</h2><span>${arr.length}</span></div><div class="library-list">${arr.map(wt23ManualRow).join('')}</div></section>` : '';
  host.innerHTML = group('Filme', '🎬', movies) + group('Serien', '📺', series);
}

function wt23UpdateStats() {
  const normal = Object.values(state.library);
  const manual = Object.values(state.manualLibrary);
  const items = normal.concat(manual);
  $('#statWatching').textContent = items.filter(x => x.status === 'watching').length;
  $('#statCompleted').textContent = items.filter(x => x.status === 'completed').length;
  $('#statWatchlist').textContent = items.filter(x => x.status === 'watchlist').length;
}

const wt23BaseRenderLibrary = renderLibrary;
renderLibrary = function() {
  wt23BaseRenderLibrary();
  wt23RenderManual();
  wt23UpdateStats();
};

document.addEventListener('change', e => {
  const select = e.target.closest('[data-manual-status]');
  if (!select) return;
  const item = state.manualLibrary[select.dataset.manualStatus];
  if (!item) return;
  item.status = select.value;
  item.updatedAt = Date.now();
  wt23SaveManual();
  renderLibrary();
});

document.addEventListener('click', e => {
  const remove = e.target.closest('[data-manual-remove]');
  if (!remove) return;
  delete state.manualLibrary[remove.dataset.manualRemove];
  wt23SaveManual();
  renderLibrary();
  toast('Eigener Titel entfernt');
});

wt23EnsureManualUI();
renderLibrary();
if (state.token && state.discoverType === 'movie' && state.discoverCategory === 'upcoming') loadDiscover();
