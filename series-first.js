/* WatchTrack v2.5.2 – Serien zuerst */
(() => {
  function moveFirst(container, selector) {
    const el = container?.querySelector(selector);
    if (el && container.firstElementChild !== el) container.insertBefore(el, container.firstElementChild);
  }

  function applySeriesFirst() {
    const discoverSwitch = document.querySelector('.media-switch');
    moveFirst(discoverSwitch, '[data-discover-type="tv"]');

    const librarySwitch = document.querySelector('#libraryTypeSwitch');
    moveFirst(librarySwitch, '[data-library-type="tv"]');

    state.discoverType = 'tv';
    state.discoverCategory = 'upcoming';
    state.libraryType = 'tv';

    document.querySelectorAll('[data-discover-type]').forEach(b => b.classList.toggle('active', b.dataset.discoverType === 'tv'));
    document.querySelectorAll('[data-library-type]').forEach(b => b.classList.toggle('active', b.dataset.libraryType === 'tv'));

    if (typeof loadDiscover === 'function') loadDiscover();
    if (typeof renderLibrary === 'function') renderLibrary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applySeriesFirst, { once: true });
  else applySeriesFirst();
})();
