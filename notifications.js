/* WatchTrack v2.8.1 – Web Push für Folgen, neue Staffeln und Filmstarts */
(() => {
  const PUBLIC_KEY = 'BHjRoFjjU8esZFeq_e4xgw2tjki12EXf8-S8l2FtlzhyXJSE2YU7oDUXRqWm_vSf5RcFY4KRmJDt2Zy9adI_Rbc';
  const API = './api/push-subscribe';

  function familyKey() {
    const k = localStorage.getItem('wt_family_key') || '';
    return /^[A-Za-z0-9_-]{24,128}$/.test(k) ? k : '';
  }
  function supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function onIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent); }
  function standalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function b64ToBytes(value) {
    const s = value.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(s + '='.repeat((4 - s.length % 4) % 4));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  function subscriptionJson(s) {
    const j = s.toJSON();
    return { endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } };
  }
  async function api(method, body) {
    const key = familyKey();
    if (!key) throw new Error('Bitte zuerst die gemeinsame Liste verbinden.');
    const r = await fetch(API, {
      method,
      headers: { 'content-type': 'application/json', 'x-watchtrack-family': key },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Fehler ${r.status}`);
    return j;
  }
  function status(text, kind = '') {
    const el = document.querySelector('#pushStatus');
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
  }
  async function currentSubscription() {
    if (!supported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }
  async function refresh() {
    const enable = document.querySelector('#pushEnableBtn');
    const disable = document.querySelector('#pushDisableBtn');
    const test = document.querySelector('#pushTestBtn');
    if (!enable) return;
    if (!supported()) {
      enable.hidden = true; disable.hidden = true; test.hidden = true;
      status(onIOS() ? 'Auf dem iPhone funktionieren Mitteilungen nur in der installierten Home-Screen-App.' : 'Push-Mitteilungen werden auf diesem Gerät nicht unterstützt.', 'warn');
      return;
    }
    if (onIOS() && !standalone()) {
      enable.hidden = true; disable.hidden = true; test.hidden = true;
      status('Öffne WatchTrack über das Symbol auf dem Home-Bildschirm, um Mitteilungen einzuschalten.', 'warn');
      return;
    }
    const sub = await currentSubscription();
    enable.hidden = !!sub;
    disable.hidden = !sub;
    test.hidden = !sub;
    status(sub && Notification.permission === 'granted' ? 'Mitteilungen sind auf diesem Gerät aktiv.' : 'Mitteilungen sind noch nicht aktiv.', sub ? 'ok' : '');
  }
  async function enablePush() {
    try {
      if (!familyKey()) throw new Error('Bitte zuerst die gemeinsame Liste verbinden.');
      const token = localStorage.getItem('wt_tmdb_token') || '';
      if (!token) throw new Error('Bitte zuerst TMDB unter Setup verbinden.');
      if (!supported()) throw new Error('Push-Mitteilungen werden auf diesem Gerät nicht unterstützt.');
      status('Mitteilungen werden aktiviert …', 'busy');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt.');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUBLIC_KEY) });
      await api('POST', { subscription: subscriptionJson(sub), tmdbToken: token });
      status('Mitteilungen sind aktiv. Neue Folgen, Staffeln und Filmstarts können jetzt gemeldet werden.', 'ok');
      await refresh();
    } catch (e) { status(e.message, 'error'); }
  }
  async function disablePush() {
    try {
      const sub = await currentSubscription();
      if (sub) {
        await api('DELETE', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      status('Mitteilungen auf diesem Gerät ausgeschaltet.', '');
      await refresh();
    } catch (e) { status(e.message, 'error'); }
  }
  async function testPush() {
    try {
      status('Test-Mitteilung wird gesendet …', 'busy');
      const r = await fetch('./api/push-test', { method: 'POST', headers: { 'x-watchtrack-family': familyKey() }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Fehler ${r.status}`);
      status('Test gesendet – die Mitteilung sollte gleich erscheinen.', 'ok');
    } catch (e) { status(e.message, 'error'); }
  }
  function mount() {
    const settings = document.querySelector('#view-settings');
    if (!settings || document.querySelector('#pushCard')) return;
    const syncCard = document.querySelector('#familySyncCard');
    const card = document.createElement('div');
    card.id = 'pushCard';
    card.className = 'settings-card push-card';
    card.innerHTML = `
      <h2>Mitteilungen</h2>
      <p>WatchTrack kann euch benachrichtigen, wenn neue Folgen erscheinen, eine neue Staffel startet oder ein vorgemerkter Film seinen Veröffentlichungstermin erreicht.</p>
      <div id="pushStatus" class="status"></div>
      <div class="row gap wrap">
        <button id="pushEnableBtn" class="primary">Mitteilungen aktivieren</button>
        <button id="pushTestBtn" class="secondary" hidden>Test senden</button>
        <button id="pushDisableBtn" class="secondary" hidden>Ausschalten</button>
      </div>
      <p class="help-text">Auch fertig gesehene Serien bleiben für neue Staffeln im Blick. Bereits gemeldete Folgen, Staffeln und Filmstarts werden nicht doppelt gemeldet.</p>`;
    if (syncCard?.nextSibling) settings.insertBefore(card, syncCard.nextSibling); else settings.prepend(card);
    document.querySelector('#pushEnableBtn').addEventListener('click', enablePush);
    document.querySelector('#pushDisableBtn').addEventListener('click', disablePush);
    document.querySelector('#pushTestBtn').addEventListener('click', testPush);
    refresh().catch(() => {});
  }
  mount();
  window.addEventListener('focus', () => refresh().catch(() => {}));
})();
