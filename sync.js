/* WatchTrack v2.5 – gemeinsame Liste ohne Konten */
(() => {
  const SYNC_URL = './api/sync';
  const KEY_STORE = 'wt_family_key';
  const DEL_STORE = 'wt_deleted';
  let familyKey = '';
  let syncing = false;
  let syncTimer = 0;
  let previous = JSON.parse(JSON.stringify(state.library || {}));

  function readFamilyFromHash() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const key = hash.get('family') || '';
    if (/^[A-Za-z0-9_-]{24,128}$/.test(key)) {
      localStorage.setItem(KEY_STORE, key);
      return key;
    }
    const stored = localStorage.getItem(KEY_STORE) || '';
    return /^[A-Za-z0-9_-]{24,128}$/.test(stored) ? stored : '';
  }

  function randomKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function deletedMap() {
    try { return JSON.parse(localStorage.getItem(DEL_STORE) || '{}') || {}; }
    catch { return {}; }
  }
  function saveDeleted(x) { localStorage.setItem(DEL_STORE, JSON.stringify(x)); }

  function markLocalChanges() {
    const now = Date.now();
    const deleted = deletedMap();
    const current = state.library || {};
    Object.keys(previous).forEach(k => {
      if (!current[k]) deleted[k] = Math.max(Number(deleted[k] || 0), now);
    });
    Object.entries(current).forEach(([k, item]) => {
      const before = previous[k];
      const clean = v => JSON.stringify({ ...(v || {}), updatedAt: undefined });
      if (!before || clean(before) !== clean(item)) item.updatedAt = now;
      if (deleted[k] && Number(item.updatedAt || 0) > Number(deleted[k])) delete deleted[k];
    });
    saveDeleted(deleted);
    previous = JSON.parse(JSON.stringify(current));
  }

  function mergeStates(localLib, localDeleted, remoteLib, remoteDeleted) {
    const out = {};
    const del = { ...localDeleted };
    const keys = new Set([...Object.keys(localLib || {}), ...Object.keys(remoteLib || {}), ...Object.keys(localDeleted || {}), ...Object.keys(remoteDeleted || {})]);
    keys.forEach(k => {
      const l = localLib?.[k];
      const r = remoteLib?.[k];
      const ld = Number(localDeleted?.[k] || 0);
      const rd = Number(remoteDeleted?.[k] || 0);
      const deadAt = Math.max(ld, rd);
      const li = Number(l?.updatedAt || 0);
      const ri = Number(r?.updatedAt || 0);
      if (deadAt >= Math.max(li, ri) && deadAt > 0) {
        del[k] = deadAt;
        return;
      }
      const winner = ri > li ? r : l || r;
      if (winner) out[k] = winner;
      delete del[k];
    });
    return { library: out, deleted: del };
  }

  async function request(method, body) {
    if (!familyKey) throw new Error('Kein gemeinsamer Link aktiv');
    const r = await fetch(SYNC_URL, {
      method,
      headers: { 'content-type': 'application/json', 'x-watchtrack-family': familyKey },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Sync-Fehler ${r.status}`);
    return j;
  }

  function setSyncStatus(text, kind = '') {
    const el = document.querySelector('#familySyncStatus');
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
  }

  async function syncNow({ silent = false } = {}) {
    if (!familyKey || syncing) return;
    syncing = true;
    if (!silent) setSyncStatus('Synchronisiere …', 'busy');
    try {
      const remote = await request('GET');
      const merged = mergeStates(state.library || {}, deletedMap(), remote.state?.library || {}, remote.state?.deleted || {});
      state.library = merged.library;
      saveDeleted(merged.deleted);
      localStorage.setItem('wt_library', JSON.stringify(state.library));
      previous = JSON.parse(JSON.stringify(state.library));
      if (typeof renderLibrary === 'function') renderLibrary();
      await request('PUT', { state: merged });
      setSyncStatus('Gemeinsame Liste ist synchron', 'ok');
    } catch (e) {
      setSyncStatus(e.message, 'error');
    } finally {
      syncing = false;
    }
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({ silent: true }), 500);
  }

  const baseSaveLibrary = saveLibrary;
  saveLibrary = function() {
    markLocalChanges();
    baseSaveLibrary();
    scheduleSync();
  };

  function sharedLink() {
    const u = new URL(location.href);
    u.hash = `family=${familyKey}`;
    return u.toString();
  }

  function mountUI() {
    const settings = document.querySelector('#view-settings');
    if (!settings || document.querySelector('#familySyncCard')) return;
    const first = settings.querySelector('.settings-card');
    const card = document.createElement('div');
    card.id = 'familySyncCard';
    card.className = 'settings-card family-sync-card';
    card.innerHTML = `
      <h2>Gemeinsame Liste</h2>
      <p>Ein gemeinsamer Link für euch beide. Kein Konto nötig. Änderungen an Filmen, Serien und Folgen werden automatisch abgeglichen.</p>
      <div id="familySyncStatus" class="status"></div>
      <div class="row gap wrap">
        <button id="familyCreateBtn" class="primary">${familyKey ? 'Gemeinsamen Link teilen' : 'Gemeinsame Liste starten'}</button>
        <button id="familySyncBtn" class="secondary" ${familyKey ? '' : 'hidden'}>Jetzt synchronisieren</button>
        <button id="familyLeaveBtn" class="secondary" ${familyKey ? '' : 'hidden'}>Verbindung lösen</button>
      </div>
      <p class="help-text">Wer den vollständigen Familien-Link besitzt, kann dieselbe Liste bearbeiten.</p>`;
    if (first) settings.insertBefore(card, first); else settings.prepend(card);

    const refreshUi = () => {
      document.querySelector('#familyCreateBtn').textContent = familyKey ? 'Gemeinsamen Link teilen' : 'Gemeinsame Liste starten';
      document.querySelector('#familySyncBtn').hidden = !familyKey;
      document.querySelector('#familyLeaveBtn').hidden = !familyKey;
      setSyncStatus(familyKey ? 'Gemeinsame Liste verbunden' : 'Noch nicht verbunden', familyKey ? 'ok' : '');
    };

    document.querySelector('#familyCreateBtn').addEventListener('click', async () => {
      if (!familyKey) {
        familyKey = randomKey();
        localStorage.setItem(KEY_STORE, familyKey);
        location.hash = `family=${familyKey}`;
        refreshUi();
        await syncNow();
      }
      const link = sharedLink();
      try {
        if (navigator.share) await navigator.share({ title: 'WatchTrack – gemeinsame Liste', text: 'Unsere gemeinsame WatchTrack-Liste', url: link });
        else {
          await navigator.clipboard.writeText(link);
          toast('Gemeinsamer Link kopiert');
        }
      } catch (e) {
        if (e?.name !== 'AbortError') prompt('Diesen Link teilen:', link);
      }
    });
    document.querySelector('#familySyncBtn').addEventListener('click', () => syncNow());
    document.querySelector('#familyLeaveBtn').addEventListener('click', () => {
      localStorage.removeItem(KEY_STORE);
      familyKey = '';
      if (location.hash.includes('family=')) history.replaceState(null, '', location.pathname + location.search);
      refreshUi();
    });
    refreshUi();
  }

  familyKey = readFamilyFromHash();
  mountUI();
  if (familyKey) syncNow({ silent: true });
  setInterval(() => { if (familyKey && !document.hidden) syncNow({ silent: true }); }, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && familyKey) syncNow({ silent: true }); });
  window.addEventListener('focus', () => { if (familyKey) syncNow({ silent: true }); });
})();
