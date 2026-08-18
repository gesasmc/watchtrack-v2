/* WatchTrack v2.4: split library tabs + manual series episodes */
state.libraryType = state.libraryType || 'movie';

function wt24EnsureLibraryUi() {
  const view = $('#view-library');
  if (!view || $('#libraryTypeSwitch')) return;

  const stats = view.querySelector('.library-stats');
  stats?.insertAdjacentHTML('beforebegin', `
    <div id="libraryTypeSwitch" class="segmented library-type-switch" role="tablist" aria-label="Listentyp">
      <button class="seg active" data-library-type="movie">Filme</button>
      <button class="seg" data-library-type="tv">Serien</button>
    </div>
    <div class="library-add-row">
      <button id="libraryAddCurrentBtn" class="primary small">+ Film hinzufügen</button>
    </div>`);

  const oldBtn = $('#manualAddBtn');
  if (oldBtn?.parentElement) oldBtn.parentElement.style.display = 'none';
  const oldDlg = $('#manualTitleDialog');
  if (oldDlg) oldDlg.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="wt24AddDialog" class="manual-dialog wt24-dialog">
      <form id="wt24AddForm">
        <div class="manual-dialog-head">
          <div>
            <h2 id="wt24AddTitle">Film hinzufügen</h2>
            <p id="wt24AddHint">Für Titel, die im Katalog fehlen.</p>
          </div>
          <button type="button" id="wt24AddClose" class="dialog-close" aria-label="Schließen">×</button>
        </div>
        <label for="wt24Title">Titel</label>
        <input id="wt24Title" type="text" maxlength="160" required placeholder="Titel eingeben" />
        <label for="wt24Year">Jahr <span class="muted">(optional)</span></label>
        <input id="wt24Year" type="number" min="1880" max="2100" inputmode="numeric" placeholder="z. B. 2026" />
        <label for="wt24Date">Startdatum <span class="muted">(optional)</span></label>
        <input id="wt24Date" type="date" />
        <label for="wt24Status">Liste</label>
        <select id="wt24Status">
          <option value="watchlist">Will ich sehen</option>
          <option value="watching">Schaue ich</option>
          <option value="completed">Gesehen</option>
        </select>
        <div id="wt24SeriesHint" class="series-option-hint" hidden>
          <strong>Folgen sind optional.</strong>
          <span>Nach dem Hinzufügen kannst du Staffeln und einzelne Folgen anlegen und abhaken.</span>
        </div>
        <div class="manual-actions">
          <button type="button" id="wt24AddCancel" class="secondary">Abbrechen</button>
          <button type="submit" class="primary">Hinzufügen</button>
        </div>
      </form>
    </dialog>`);

  const dlg = $('#wt24AddDialog');
  const close = () => dlg.close();
  $('#wt24AddClose').addEventListener('click', close);
  $('#wt24AddCancel').addEventListener('click', close);
  $('#libraryAddCurrentBtn').addEventListener('click', () => {
    $('#wt24AddForm').reset();
    const isSeries = state.libraryType === 'tv';
    $('#wt24AddTitle').textContent = isSeries ? 'Serie hinzufügen' : 'Film hinzufügen';
    $('#wt24SeriesHint').hidden = !isSeries;
    dlg.showModal();
    setTimeout(() => $('#wt24Title').focus(), 30);
  });

  $('#wt24AddForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#wt24Title').value.trim();
    if (!title) return;
    const type = state.libraryType;
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const releaseDate = $('#wt24Date').value || '';
    state.library[keyFor(type, id)] = {
      id,
      type,
      title,
      poster_path: null,
      year: String($('#wt24Year').value || (releaseDate ? releaseDate.slice(0, 4) : '—')),
      status: $('#wt24Status').value,
      releaseDate,
      manual: true,
      manualSeasons: [],
      seasons: {},
      seasonMeta: {},
      updatedAt: Date.now()
    };
    saveLibrary();
    renderLibrary();
    dlg.close();
    toast(type === 'tv' ? 'Serie hinzugefügt' : 'Film hinzugefügt');
  });
}

function wt24ManualEpisodeStats(x) {
  const seasons = x.manualSeasons || [];
  let total = 0;
  let seen = 0;
  seasons.forEach(s => (s.episodes || []).forEach(ep => {
    total += 1;
    if (ep.watched) seen += 1;
  }));
  return { total, seen };
}

function wt24ManualSeriesRow(x) {
  const { total, seen } = wt24ManualEpisodeStats(x);
  const next = x.releaseDate && x.releaseDate > todayISO() ? `Start: ${dateDE(x.releaseDate)}` : '';
  const seasons = x.manualSeasons || [];
  return `<div class="library-row manual-library-row manual-series-row">
    <div class="mini-poster manual-poster">📺</div>
    <div class="library-copy">
      <h3>${esc(x.title)} <span class="manual-badge">Eigene Serie</span></h3>
      <p>${x.status === 'completed' ? 'Gesehen' : x.status === 'watching' ? 'Schaue ich' : 'Will ich sehen'} · ${esc(x.year || '—')}</p>
      ${next ? `<small class="upcoming-note">${esc(next)}</small>` : ''}
      ${total ? `<small>${seen}/${total} Folgen gesehen</small><div class="progress"><span style="width:${Math.round((seen / total) * 100)}%"></span></div>` : '<small class="muted">Noch keine Folgen angelegt</small>'}
      <select class="manual-status-select" data-manual-status="${x.type}:${x.id}">
        <option value="watchlist" ${x.status === 'watchlist' ? 'selected' : ''}>Will ich sehen</option>
        <option value="watching" ${x.status === 'watching' ? 'selected' : ''}>Schaue ich</option>
        <option value="completed" ${x.status === 'completed' ? 'selected' : ''}>Gesehen</option>
      </select>
      <details class="manual-episodes">
        <summary>Staffeln & Folgen verwalten</summary>
        <div class="manual-episode-tools"><button class="secondary tiny-action" type="button" data-add-season="${x.id}">+ Staffel hinzufügen</button></div>
        ${seasons.map((season, si) => `<section class="manual-season">
          <div class="manual-season-head"><strong>${esc(season.name || `Staffel ${si + 1}`)}</strong><button type="button" class="secondary tiny-action" data-add-episode="${x.id}:${si}">+ Folge</button></div>
          <div class="manual-episode-list">
            ${(season.episodes || []).map((ep, ei) => `<label class="manual-episode ${ep.watched ? 'watched' : ''}">
              <input type="checkbox" data-episode-toggle="${x.id}:${si}:${ei}" ${ep.watched ? 'checked' : ''} />
              <span>${esc(ep.name || `Folge ${ei + 1}`)}</span>
              <button type="button" class="tiny" data-remove-episode="${x.id}:${si}:${ei}" aria-label="Folge entfernen">×</button>
            </label>`).join('') || '<div class="library-empty compact">Noch keine Folgen.</div>'}
          </div>
        </section>`).join('') || '<div class="library-empty compact">Optional: Lege eine Staffel an und füge einzelne Folgen hinzu.</div>'}
      </details>
    </div>
    <div class="row-actions"><button class="tiny" data-manual-remove="${x.type}:${x.id}" aria-label="Entfernen">×</button></div>
  </div>`;
}

function wt24ManualMovieRow(x) {
  const next = x.releaseDate && x.releaseDate > todayISO() ? `Start: ${dateDE(x.releaseDate)}` : '';
  return `<div class="library-row manual-library-row">
    <div class="mini-poster manual-poster">🎬</div>
    <div class="library-copy">
      <h3>${esc(x.title)} <span class="manual-badge">Eigener Film</span></h3>
      <p>${x.status === 'completed' ? 'Gesehen' : x.status === 'watching' ? 'Schaue ich' : 'Will ich sehen'} · ${esc(x.year || '—')}</p>
      ${next ? `<small class="upcoming-note">${esc(next)}</small>` : ''}
      <select class="manual-status-select" data-manual-status="${x.type}:${x.id}">
        <option value="watchlist" ${x.status === 'watchlist' ? 'selected' : ''}>Will ich sehen</option>
        <option value="watching" ${x.status === 'watching' ? 'selected' : ''}>Schaue ich</option>
        <option value="completed" ${x.status === 'completed' ? 'selected' : ''}>Gesehen</option>
      </select>
    </div>
    <div class="row-actions"><button class="tiny" data-manual-remove="${x.type}:${x.id}" aria-label="Entfernen">×</button></div>
  </div>`;
}

function wt24Row(x) {
  if (!x.manual) return wtLibraryRow(x);
  return x.type === 'tv' ? wt24ManualSeriesRow(x) : wt24ManualMovieRow(x);
}

renderLibrary = function() {
  wt24EnsureLibraryUi();
  const all = Object.values(state.library).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const typeItems = all.filter(x => x.type === state.libraryType);
  $('#statWatching').textContent = typeItems.filter(x => x.status === 'watching').length;
  $('#statCompleted').textContent = typeItems.filter(x => x.status === 'completed').length;
  $('#statWatchlist').textContent = typeItems.filter(x => x.status === 'watchlist').length;

  $$('[data-library-type]').forEach(b => b.classList.toggle('active', b.dataset.libraryType === state.libraryType));
  const addBtn = $('#libraryAddCurrentBtn');
  if (addBtn) addBtn.textContent = state.libraryType === 'movie' ? '+ Film hinzufügen' : '+ Serie hinzufügen';

  const filtered = state.libFilter === 'all' ? typeItems : typeItems.filter(x => x.status === state.libFilter);
  const box = $('#libraryContent');
  box.className = 'library-list library-single-type';
  if (!filtered.length) {
    box.innerHTML = empty(
      state.libraryType === 'movie' ? 'Keine Filme in dieser Auswahl' : 'Keine Serien in dieser Auswahl',
      state.libraryType === 'movie' ? 'Füge einen Film aus dem Katalog oder manuell hinzu.' : 'Füge eine Serie aus dem Katalog oder manuell hinzu.'
    );
    return;
  }
  box.innerHTML = filtered.map(wt24Row).join('');
};

document.addEventListener('click', e => {
  const typeBtn = e.target.closest('[data-library-type]');
  if (typeBtn) {
    state.libraryType = typeBtn.dataset.libraryType;
    renderLibrary();
    return;
  }

  const addSeason = e.target.closest('[data-add-season]');
  if (addSeason) {
    e.preventDefault();
    const item = state.library[keyFor('tv', addSeason.dataset.addSeason)];
    if (!item) return;
    item.manualSeasons = item.manualSeasons || [];
    item.manualSeasons.push({ name: `Staffel ${item.manualSeasons.length + 1}`, episodes: [] });
    item.updatedAt = Date.now();
    saveLibrary();
    renderLibrary();
    return;
  }

  const addEp = e.target.closest('[data-add-episode]');
  if (addEp) {
    e.preventDefault();
    const [id, siRaw] = addEp.dataset.addEpisode.split(':');
    const si = Number(siRaw);
    const item = state.library[keyFor('tv', id)];
    const season = item?.manualSeasons?.[si];
    if (!season) return;
    season.episodes = season.episodes || [];
    season.episodes.push({ name: `Folge ${season.episodes.length + 1}`, watched: false });
    item.updatedAt = Date.now();
    saveLibrary();
    renderLibrary();
    return;
  }

  const removeEp = e.target.closest('[data-remove-episode]');
  if (removeEp) {
    e.preventDefault();
    const [id, siRaw, eiRaw] = removeEp.dataset.removeEpisode.split(':');
    const item = state.library[keyFor('tv', id)];
    const episodes = item?.manualSeasons?.[Number(siRaw)]?.episodes;
    if (!episodes) return;
    episodes.splice(Number(eiRaw), 1);
    item.updatedAt = Date.now();
    saveLibrary();
    renderLibrary();
  }
});

document.addEventListener('change', e => {
  const cb = e.target.closest('[data-episode-toggle]');
  if (!cb) return;
  const [id, siRaw, eiRaw] = cb.dataset.episodeToggle.split(':');
  const item = state.library[keyFor('tv', id)];
  const ep = item?.manualSeasons?.[Number(siRaw)]?.episodes?.[Number(eiRaw)];
  if (!ep) return;
  ep.watched = cb.checked;
  const stats = wt24ManualEpisodeStats(item);
  if (stats.total && stats.seen === stats.total) item.status = 'completed';
  else if (stats.seen > 0 && item.status === 'watchlist') item.status = 'watching';
  item.updatedAt = Date.now();
  saveLibrary();
  renderLibrary();
});

wt24EnsureLibraryUi();
renderLibrary();
