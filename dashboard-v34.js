/* WatchTrack v3.4 – visual navigation layer, no existing feature logic replaced */
(()=>{
  function mount(){
    const discover=document.querySelector('#view-discover');
    const oldSwitch=discover?.querySelector('.media-switch');
    if(!discover||!oldSwitch||document.querySelector('#wtSectionSwitch'))return;
    const switcher=document.createElement('div');switcher.id='wtSectionSwitch';switcher.className='wt-section-switch';
    switcher.innerHTML='<button class="wt-section-btn active" data-wt-section="tv">▣ Serien</button><button class="wt-section-btn" data-wt-section="movie">▤ Filme</button>';
    discover.insertBefore(switcher,discover.firstChild);
    function select(section){
      switcher.querySelectorAll('[data-wt-section]').forEach(b=>b.classList.toggle('active',b.dataset.wtSection===section));
      const target=oldSwitch.querySelector(`[data-discover-type="${section}"]`);if(target&&!target.classList.contains('active'))target.click();
    }
    switcher.addEventListener('click',e=>{const b=e.target.closest('[data-wt-section]');if(b)select(b.dataset.wtSection);});
    const active=oldSwitch.querySelector('.active')?.dataset.discoverType||'tv';select(active);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
