/* WatchTrack v2.2.1: saubere Bald-Liste + eigene Titel */

const wtCustomBaseFetchDiscover = fetchDiscover;
fetchDiscover = async function(type, category, page) {
  if (type === 'movie' && category === 'upcoming' && !state.providerFilter) {
    return api('/discover/movie', {
      language: 'de-DE',
      page,
      region: state.region,
      sort_by: 'primary_release_date.asc',
      include_adult: false,
      'primary_release_date.gte': todayISO(),
      'primary_release_date.lte': plusDaysISO(365)
    });
  }
  return wtCustomBaseFetchDiscover(type, category, page);
};

function wtManualUi() {
  const library = $('#view-library');
  if (!library || $('#manualAddBtn')) return;
  const filters = library.querySelector('.segmented');
  filters?.insertAdjacentHTML('afterend', '<div class="manual-add-wrap"><button id="manualAddBtn" class="secondary">+ Eigenen Titel hinzufügen</button></div>');

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="manualTitleDialog" class="manual-dialog">
      <form id="manualTitleForm" method="dialog">
        <div class="manual-dialog-head">
          <div><h2>Eigenen Titel hinzufügen</h2><p>Für Filme oder Serien, die im Katalog fehlen.</p></div>
          <button type="button" id="manualCloseBtn" class="dialog-close" aria-label="Schließen">×</button>
        </div>
        <label for="manualType">Typ</label>
        <select id="manualType" required>
          <option value="movie">Film</option>
          <option value="tv">Serie</option>
        </select>
        <label for="manualTitle">Titel</label>
        <input id="manualTitle" type="text" maxlength="160" placeholder="Titel eingeben" required />
        <label for="manualYear">Jahr <span class="muted">(optional)</span></label>
        <input id="manualYear" type="number" min="1880" max="2100" inputmode="numeric" placeholder="z. B. 2026" />
        <label for="manualDate">Startdatum <span class="muted">(optional)</span></label>
        <input id="manualDate" type="date" />
        <label for="manualStatus">Liste</label>
        <select id="manualStatus">
          <option value="watchlist">Will ich sehen</option>
          <option value="watching">Schaue ich</option>
          <option value="completed">Gesehen</option>
        </select>
        <div class="manual-actions">
          <button type="button" id="manualCancelBtn" class="secondary">Abbrechen</button>
          <button type="submit" class="primary">Hinzufügen</button>
        </div>
      </form>
    </dialog>`);

  const dlg = $('#manualTitleDialog');
  $('#manualAddBtn').addEventListener('click', () => {
    $('#manualTitleForm').reset();
    dlg.showModal();
    setTimeout(() => $('#manualTitle').focus(), 50);
  });
  $('#manualCloseBtn').addEventListener('click', () => dlg.close());
  $('#manualCancelBtn').addEventListener('click', () => dlg.close());
  $('#manualTitleForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#manualTitle').value.trim();
    if (!title) return;
    const type = $('#manualType').value;
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const releaseDate = $('#manualDate').value || '';
    const year = String($('#manualYear').value || (releaseDate ? releaseDate.slice(0,4) : '—'));
    state.library[keyFor(type, id)] = {
      id,
      type,
      title,
      poster_path: null,
      year,
      status: $('#manualStatus').value,
      releaseDate,
      manual: true,
      seasons: {},
      seasonMeta: {},
      updatedAt: Date.now()
    };
    saveLibrary();
    renderLibrary();
    dlg.close();
    toast('Eigener Titel hinzugefügt');
  });
}

const wtManualBaseLibraryRow = wtLibraryRow;
wtLibraryRow = function(x) {
  if (!x.manual) return wtManualBaseLibraryRow(x);
  const next = x.releaseDate && x.releaseDate > todayISO() ? `Start: ${dateDE(x.releaseDate)}` : '';
  return `<div class="library-row manual-library-row">
    <div class="mini-poster manual-poster">${x.type === 'movie' ? '🎬' : '📺'}</div>
    <div class="library-copy">
      <h3>${esc(x.title)} <span class="manual-badge">Eigener Titel</span></h3>
      <p>${x.type === 'movie' ? 'Film' : 'Serie'} · ${esc(x.year || '—')}</p>
      ${next ? `<small class="upcoming-note">${esc(next)}</small>` : ''}
      <select class="manual-status-select" data-manual-status="${x.type}:${x.id}">
        <option value="watchlist" ${x.status === 'watchlist' ? 'selected' : ''}>Will ich sehen</option>
        <option value="watching" ${x.status === 'watching' ? 'selected' : ''}>Schaue ich</option>
        <option value="completed" ${x.status === 'completed' ? 'selected' : ''}>Gesehen</option>
      </select>
    </div>
    <div class="row-actions"><button class="tiny" data-manual-remove="${x.type}:${x.id}" aria-label="Entfernen">×</button></div>
  </div>`;
};

document.addEventListener('change', e => {
  const select = e.target.closest('[data-manual-status]');
  if (!select) return;
  const [type, id] = select.dataset.manualStatus.split(':');
  const item = state.library[keyFor(type, id)];
  if (!item) return;
  item.status = select.value;
  item.updatedAt = Date.now();
  saveLibrary();
  renderLibrary();
});

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-manual-remove]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const [type, id] = btn.dataset.manualRemove.split(':');
  delete state.library[keyFor(type, id)];
  saveLibrary();
  renderLibrary();
  toast('Titel entfernt');
});

wtManualUi();
