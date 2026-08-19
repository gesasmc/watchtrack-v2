/* WatchTrack v3.2 – Darstellung: System | Hell | Dunkel */
(()=>{
 const KEY='wt_theme_mode';
 const mq=window.matchMedia('(prefers-color-scheme: dark)');
 const meta=document.querySelector('meta[name="theme-color"]');
 function stored(){const v=localStorage.getItem(KEY);return ['system','light','dark'].includes(v)?v:'system';}
 function resolved(mode=stored()){return mode==='system'?(mq.matches?'dark':'light'):mode;}
 function apply(mode=stored()){
   const r=resolved(mode); document.documentElement.dataset.theme=r; document.documentElement.dataset.themeMode=mode;
   if(meta) meta.setAttribute('content',r==='light'?'#f7f7f4':'#090909');
   document.querySelectorAll('[data-theme-mode]').forEach(b=>b.classList.toggle('active',b.dataset.themeMode===mode));
 }
 function set(mode){localStorage.setItem(KEY,mode);apply(mode);toast?.(`Darstellung: ${mode==='system'?'System':mode==='light'?'Hell':'Dunkel'}`);}
 function mount(){const settings=document.querySelector('#view-settings');if(!settings||document.querySelector('#themeModeCard'))return;const first=settings.querySelector('.settings-card');const card=document.createElement('div');card.id='themeModeCard';card.className='settings-card theme-card';card.innerHTML=`<h2>Darstellung</h2><p>Gold bleibt der Akzent. „System“ folgt automatisch der Darstellung deines Geräts.</p><div class="theme-options"><button class="theme-option" data-theme-mode="system">◐<small>System</small></button><button class="theme-option" data-theme-mode="light">☀️<small>Hell</small></button><button class="theme-option" data-theme-mode="dark">🌙<small>Dunkel</small></button></div>`;if(first)settings.insertBefore(card,first);else settings.prepend(card);card.querySelectorAll('[data-theme-mode]').forEach(b=>b.addEventListener('click',()=>set(b.dataset.themeMode)));apply();}
 mq.addEventListener?.('change',()=>{if(stored()==='system')apply('system');});
 apply(); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();