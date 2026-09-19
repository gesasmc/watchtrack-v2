/* WatchTrack v3.4 – visual navigation layer, no existing feature logic replaced */
(()=>{
  function mount(){
    const discover=document.querySelector('#view-discover');
    const oldSwitch=discover?.querySelector('.media-switch');
    if(!discover||!oldSwitch||document.querySelector('#wtSectionSwitch'))return;
    const switcher=document.createElement('div');switcher.id='wtSectionSwitch';switcher.className='wt-section-switch';
    switcher.innerHTML='<button class="wt-section-btn active" data-wt-section="tv">▣ Serien</button><button class="wt-section-btn" data-wt-section="movie">▤ Filme</button><button class="wt-section-btn" data-wt-section="sport">● Sport</button>';
    discover.insertBefore(switcher,discover.firstChild);
    const sport=document.createElement('div');sport.id='wtSportPlaceholder';sport.className='wt-sport-placeholder';sport.innerHTML='<h2>Sport</h2><p>Hier entsteht dein persönlicher Sportbereich. Teams, Vereine, Kämpfer und ganze Ligen/Organisationen können später separat pro Person abonniert werden.</p><div class="wt-sport-preview"><div class="wt-sport-row"><span>⚽</span><div><b>Meine Vereine & Teams</b><small>Spiele und Termine auf einen Blick</small></div></div><div class="wt-sport-row"><span>🥊</span><div><b>Ligen & Kampftage</b><small>Events statt nur einzelne Sportler</small></div></div><div class="wt-sport-row"><span>🔔</span><div><b>Meine Benachrichtigungen</b><small>Persönlich – nicht automatisch für die gemeinsame Liste</small></div></div></div>';switcher.after(sport);
    function select(section){
      switcher.querySelectorAll('[data-wt-section]').forEach(b=>b.classList.toggle('active',b.dataset.wtSection===section));
      const isSport=section==='sport';sport.classList.toggle('active',isSport);
      [...discover.children].forEach(el=>{if([switcher,sport].includes(el))return;el.style.display=isSport?'none':'';});
      if(!isSport){const target=oldSwitch.querySelector(`[data-discover-type="${section}"]`);if(target&&!target.classList.contains('active'))target.click();}
    }
    switcher.addEventListener('click',e=>{const b=e.target.closest('[data-wt-section]');if(b)select(b.dataset.wtSection);});
    const active=oldSwitch.querySelector('.active')?.dataset.discoverType||'tv';select(active);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
