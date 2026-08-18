/* WatchTrack v2.8 – „Für euch“ aus der gemeinsamen Watch-Liste */
(() => {
  const forYou = { id: 'foryou', label: 'Für euch', title: 'Für euch ausgewählt', hint: 'Empfehlungen aus euren gespeicherten Titeln' };
  ['tv','movie'].forEach(type => {
    if (!CATEGORIES[type].some(c => c.id === 'foryou')) {
      const list = CATEGORIES[type];
      const pos = Math.min(1, list.length);
      list.splice(pos, 0, { ...forYou, title: type === 'tv' ? 'Serien für euch' : 'Filme für euch' });
    }
  });

  function validSeed(x, type) {
    return x && x.type === type && !x.manual && Number.isFinite(Number(x.id));
  }

  function seedWeight(x) {
    if (x.status === 'completed') return 4;
    if (x.status === 'watching') return 4;
    if (x.status === 'watchlist') return 1;
    return 1;
  }

  function pickSeeds(type) {
    return Object.values(state.library || {})
      .filter(x => validSeed(x, type))
      .sort((a,b) => (seedWeight(b) - seedWeight(a)) || ((b.updatedAt||0) - (a.updatedAt||0)))
      .slice(0, 8);
  }

  async function wtForYou(type) {
    const seeds = pickSeeds(type);
    if (!seeds.length) return { results: [], page: 1, total_pages: 1, total_results: 0 };
    const own = new Set(Object.values(state.library || {}).filter(x => x.type === type).map(x => String(x.id)));
    const scored = new Map();

    await Promise.all(seeds.map(async (seed, seedIndex) => {
      let data = null;
      try { data = await api(`/${type}/${seed.id}/recommendations`, { language: 'de-DE', page: 1 }); }
      catch {}
      if (!data?.results?.length) {
        try { data = await api(`/${type}/${seed.id}/similar`, { language: 'de-DE', page: 1 }); }
        catch { data = { results: [] }; }
      }
      const weight = seedWeight(seed);
      (data.results || []).slice(0, 20).forEach((x, rank) => {
        if (!x?.id || own.has(String(x.id)) || !x.poster_path) return;
        const k = String(x.id);
        const current = scored.get(k) || { item: x, score: 0, hits: 0 };
        current.score += weight * (24 - rank) + Math.min(Number(x.vote_average || 0), 10) * 1.5 + Math.log10(Math.max(1, Number(x.popularity || 1)));
        current.hits += 1;
        if (!current.item?.overview && x.overview) current.item = x;
        scored.set(k, current);
      });
    }));

    const results = [...scored.values()]
      .sort((a,b) => (b.hits - a.hits) * 30 + (b.score - a.score))
      .slice(0, 40)
      .map(x => x.item);
    return { results, page: 1, total_pages: 1, total_results: results.length };
  }

  const baseFetchDiscover = fetchDiscover;
  fetchDiscover = async function(type, category, page) {
    if (category === 'foryou') return wtForYou(type);
    return baseFetchDiscover(type, category, page);
  };

  const baseRenderCategoryChips = renderCategoryChips;
  renderCategoryChips = function() {
    baseRenderCategoryChips();
    if (state.discoverCategory === 'foryou') {
      const count = pickSeeds(state.discoverType).length;
      const hint = count
        ? `Basierend auf ${count} ${state.discoverType === 'tv' ? 'gespeicherten Serien' : 'gespeicherten Filmen'} · ohne Bewertungen`
        : `Fügt erst ${state.discoverType === 'tv' ? 'Serien' : 'Filme'} zu eurer Liste hinzu`;
      const el = document.querySelector('#discoverHint');
      if (el) el.textContent = hint;
    }
  };
})();