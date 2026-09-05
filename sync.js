/* WatchTrack v3.3 – gemeinsame Liste mit Familien-Key + Empfehlungsfeedback */
(() => {
  const SYNC_URL = './api/sync';
  const KEY_STORE = 'wt_family_key';
  const DEL_STORE = 'wt_deleted';
  const FEEDBACK_STORE = 'wt_rec_feedback';
  const KEY_RE = /^[A-Za-z0-9_-]{24,128}$/;
  let familyKey = '';
  let syncing = false;
  let syncTimer = 0;
  let previous = JSON.parse(JSON.stringify(state.library || {}));

  function normalizeKey(value = '') { return String(value).trim().replace(/^#?family=/i, ''); }
  function readFamilyKey() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fromHash = normalizeKey(hash.get('family') || '');
    if (KEY_RE.test(fromHash)) { localStorage.setItem(KEY_STORE, fromHash); return fromHash; }
    const stored = normalizeKey(localStorage.getItem(KEY_STORE) || '');
    return KEY_RE.test(stored) ? stored : '';
  }
  function randomKey() {
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function deletedMap() { try { return JSON.parse(localStorage.getItem(DEL_STORE) || '{}') || {}; } catch { return {}; } }
  function saveDeleted(x) { localStorage.setItem(DEL_STORE, JSON.stringify(x)); }
  function feedbackMap(){ return state.recommendationFeedback || readJSON(FEEDBACK_STORE,{}); }
  function saveFeedback(x){ state.recommendationFeedback=x||{}; localStorage.setItem(FEEDBACK_STORE,JSON.stringify(state.recommendationFeedback)); }

  function markLocalChanges() {
    const now = Date.now(), deleted = deletedMap(), current = state.library || {};
    Object.keys(previous).forEach(k => { if (!current[k]) deleted[k] = Math.max(Number(deleted[k] || 0), now); });
    Object.entries(current).forEach(([k, item]) => {
      const before = previous[k]; const clean = v => JSON.stringify({ ...(v || {}), updatedAt: undefined });
      if (!before || clean(before) !== clean(item)) item.updatedAt = now;
      if (deleted[k] && Number(item.updatedAt || 0) > Number(deleted[k])) delete deleted[k];
    });
    saveDeleted(deleted); previous = JSON.parse(JSON.stringify(current));
  }
  function mergeStates(localLib, localDeleted, remoteLib, remoteDeleted) {
    const out = {}, del = { ...localDeleted };
    const keys = new Set([...Object.keys(localLib || {}), ...Object.keys(remoteLib || {}), ...Object.keys(localDeleted || {}), ...Object.keys(remoteDeleted || {})]);
    keys.forEach(k => {
      const l = localLib?.[k], r = remoteLib?.[k], ld = Number(localDeleted?.[k] || 0), rd = Number(remoteDeleted?.[k] || 0), deadAt = Math.max(ld, rd), li = Number(l?.updatedAt || 0), ri = Number(r?.updatedAt || 0);
      if (deadAt >= Math.max(li, ri) && deadAt > 0) { del[k] = deadAt; return; }
      const winner = ri > li ? r : l || r; if (winner) out[k] = winner; delete del[k];
    });
    return { library: out, deleted: del };
  }
  function mergeFeedback(local,remote){
    const out={}; const keys=new Set([...Object.keys(local||{}),...Object.keys(remote||{})]);
    keys.forEach(k=>{const l=local?.[k],r=remote?.[k];out[k]=Number(r?.updatedAt||0)>Number(l?.updatedAt||0)?r:(l||r);});
    return out;
  }
  async function request(method, body) {
    if (!familyKey) throw new Error('Kein Familien-Key aktiv');
    const r = await fetch(SYNC_URL, { method, headers: { 'content-type': 'application/json', 'x-watchtrack-family': familyKey }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Sync-Fehler ${r.status}`); return j;
  }
  function setSyncStatus(text, kind = '') { const el = document.querySelector('#familySyncStatus'); if (!el) return; el.textContent = text; el.dataset.kind = kind; }
  async function syncNow({ silent = false } = {}) {
    if (!familyKey || syncing) return; syncing = true; if (!silent) setSyncStatus('Synchronisiere …', 'busy');
    try {
      const remote = await request('GET');
      const merged = mergeStates(state.library || {}, deletedMap(), remote.state?.library || {}, remote.state?.deleted || {});
      const mergedFeedback = mergeFeedback(feedbackMap(), remote.state?.recommendationFeedback || {});
      state.library = merged.library; saveDeleted(merged.deleted); saveFeedback(mergedFeedback);
      localStorage.setItem('wt_library', JSON.stringify(state.library)); previous = JSON.parse(JSON.stringify(state.library));
      if (typeof renderLibrary === 'function') renderLibrary();
      await request('PUT', { state: { ...merged, recommendationFeedback: mergedFeedback } });
      setSyncStatus('Gemeinsame Liste ist synchron', 'ok');
    } catch (e) { setSyncStatus(e.message, 'error'); } finally { syncing = false; }
  }
  function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow({ silent: true }), 500); }
  const baseSaveLibrary = saveLibrary;
  saveLibrary = function() { markLocalChanges(); baseSaveLibrary(); scheduleSync(); };
  function sharedLink() { const u = new URL(location.origin + location.pathname); u.hash = `family=${familyKey}`; return u.toString(); }
  function connectKey(key) {
    const clean = normalizeKey(key); if (!KEY_RE.test(clean)) { setSyncStatus('Der Familien-Key ist ungültig.', 'error'); return false; }
    familyKey = clean; localStorage.setItem(KEY_STORE, familyKey); const input = document.querySelector('#familyKeyInput'); if (input) input.value = familyKey; refreshUi(); syncNow(); return true;
  }
  function refreshUi() {
    const create = document.querySelector('#familyCreateBtn'), sync = document.querySelector('#familySyncBtn'), leave = document.querySelector('#familyLeaveBtn'), input = document.querySelector('#familyKeyInput'), connect = document.querySelector('#familyConnectBtn'), copy = document.querySelector('#familyCopyKeyBtn');
    if (!create) return; create.textContent = familyKey ? 'Gemeinsamen Link teilen' : 'Neue gemeinsame Liste starten'; if (sync) sync.hidden = !familyKey; if (leave) leave.hidden = !familyKey; if (copy) copy.hidden = !familyKey; if (connect) connect.textContent = familyKey ? 'Anderen Key verbinden' : 'Mit Key verbinden'; if (input && familyKey) input.value = familyKey; setSyncStatus(familyKey ? 'Gemeinsame Liste verbunden' : 'Noch nicht verbunden', familyKey ? 'ok' : '');
  }
  function mountUI() {
    const settings = document.querySelector('#view-settings'); if (!settings || document.querySelector('#familySyncCard')) return;
    const first = settings.querySelector('.settings-card'), card = document.createElement('div'); card.id = 'familySyncCard'; card.className = 'settings-card family-sync-card';
    card.innerHTML = `<h2>Gemeinsame Liste</h2><p>Ein Familien-Key verbindet eure Geräte. So funktioniert die Synchronisation auch in der Home-Screen-Web-App.</p><div id="familySyncStatus" class="status"></div><label for="familyKeyInput" class="family-key-label">Familien-Key</label><div class="family-key-row"><input id="familyKeyInput" class="family-key-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Familien-Key hier einfügen" value="${familyKey}"><button id="familyConnectBtn" class="secondary" type="button">${familyKey ? 'Anderen Key verbinden' : 'Mit Key verbinden'}</button></div><div class="row gap wrap family-sync-actions"><button id="familyCreateBtn" class="primary">${familyKey ? 'Gemeinsamen Link teilen' : 'Neue gemeinsame Liste starten'}</button><button id="familyCopyKeyBtn" class="secondary" ${familyKey ? '' : 'hidden'}>Key kopieren</button><button id="familySyncBtn" class="secondary" ${familyKey ? '' : 'hidden'}>Jetzt synchronisieren</button><button id="familyLeaveBtn" class="secondary" ${familyKey ? '' : 'hidden'}>Verbindung lösen</button></div><p class="help-text">Auf dem zweiten Handy einfach denselben Key einmal unter Setup einfügen. Danach wird er auf diesem Gerät gespeichert.</p>`;
    if (first) settings.insertBefore(card, first); else settings.prepend(card);
    document.querySelector('#familyConnectBtn').addEventListener('click', () => connectKey(document.querySelector('#familyKeyInput').value));
    document.querySelector('#familyKeyInput').addEventListener('keydown', e => { if (e.key === 'Enter') connectKey(e.currentTarget.value); });
    document.querySelector('#familyCreateBtn').addEventListener('click', async () => { if (!familyKey) { familyKey = randomKey(); localStorage.setItem(KEY_STORE, familyKey); document.querySelector('#familyKeyInput').value = familyKey; refreshUi(); await syncNow(); } const link = sharedLink(); try { if (navigator.share) await navigator.share({ title: 'WatchTrack – gemeinsame Liste', text: `Unsere gemeinsame WatchTrack-Liste\nFamilien-Key: ${familyKey}`, url: link }); else { await navigator.clipboard.writeText(link); toast('Gemeinsamer Link kopiert'); } } catch (e) { if (e?.name !== 'AbortError') prompt('Diesen Link teilen:', link); } });
    document.querySelector('#familyCopyKeyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(familyKey); toast('Familien-Key kopiert'); } catch { prompt('Familien-Key kopieren:', familyKey); } });
    document.querySelector('#familySyncBtn').addEventListener('click', () => syncNow());
    document.querySelector('#familyLeaveBtn').addEventListener('click', () => { localStorage.removeItem(KEY_STORE); familyKey = ''; const input = document.querySelector('#familyKeyInput'); if (input) input.value = ''; if (location.hash.includes('family=')) history.replaceState(null, '', location.pathname + location.search); refreshUi(); });
    refreshUi();
  }
  familyKey = readFamilyKey(); mountUI(); if (familyKey) syncNow({ silent: true });
  setInterval(() => { if (familyKey && !document.hidden) syncNow({ silent: true }); }, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && familyKey) syncNow({ silent: true }); });
  window.addEventListener('focus', () => { if (familyKey) syncNow({ silent: true }); });
})();