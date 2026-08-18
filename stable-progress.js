/* WatchTrack v2.5.3 – stabile Folgen-/Staffelsteuerung ohne Auf-/Zuklappen */
(() => {
  function seasonContainer(num) {
    const box = document.querySelector(`#season-${num}`);
    return box?.closest('.season') || null;
  }

  function updateSeasonSummary(num) {
    const data = state.currentDetail;
    if (!data) return;
    const lib = state.library[keyFor('tv', data.id)];
    const seasonInfo = (data.seasons || []).find(s => Number(s.season_number) === Number(num));
    const total = Number(seasonInfo?.episode_count || lib?.seasonMeta?.[num]?.episodeCount || 0);
    const done = Object.values(lib?.seasons?.[num] || {}).filter(Boolean).length;
    const season = seasonContainer(num);
    const small = season?.querySelector('.season-head small');
    if (small) small.textContent = `${done}/${total || 0} gesehen`;
  }

  function updateVisibleEpisodeButton(season, episode, done) {
    const btn = document.querySelector(`[data-episode="${season}:${episode}"]`);
    if (!btn) return;
    btn.classList.toggle('done', !!done);
    btn.setAttribute('aria-label', done ? 'Als ungesehen markieren' : 'Als gesehen markieren');
  }

  toggleEpisode = async function(season, episode) {
    const data = state.currentDetail;
    if (!data) return;
    const lib = ensureLib(data);
    lib.seasons[season] = lib.seasons[season] || {};
    const done = !lib.seasons[season][episode];
    lib.seasons[season][episode] = done;
    if (lib.status !== 'completed') lib.status = 'watching';
    lib.updatedAt = Date.now();
    saveLibrary();

    updateVisibleEpisodeButton(season, episode, done);
    updateSeasonSummary(season);
    renderLibrary();
  };

  markSeasonComplete = async function(num) {
    const data = state.currentDetail;
    if (!data) return;
    const lib = ensureLib(data);
    let episodes = [];

    const visibleButtons = [...document.querySelectorAll(`#season-${num} [data-episode]`)];
    if (visibleButtons.length) {
      episodes = visibleButtons.map(btn => ({ episode_number: Number(btn.dataset.episode.split(':')[1]) })).filter(x => x.episode_number > 0);
    } else {
      try {
        const season = await api(`/tv/${data.id}/season/${num}`, { language: 'de-DE' });
        episodes = season.episodes || [];
        lib.seasonMeta = lib.seasonMeta || {};
        lib.seasonMeta[num] = { name: season.name || `Staffel ${num}`, episodeCount: episodes.length };
      } catch (e) {
        toast(e.message);
        return;
      }
    }

    lib.seasons[num] = lib.seasons[num] || {};
    episodes.forEach(ep => { lib.seasons[num][ep.episode_number] = true; });
    lib.status = 'watching';
    lib.updatedAt = Date.now();
    saveLibrary();

    visibleButtons.forEach(btn => {
      btn.classList.add('done');
      btn.setAttribute('aria-label', 'Als ungesehen markieren');
    });
    updateSeasonSummary(num);
    renderLibrary();
    toast(`Staffel ${num} als gesehen markiert`);
  };
})();
