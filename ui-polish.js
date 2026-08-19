/* WatchTrack v3.2.2 – UI polish for Setup */
(()=>{
  function polishSync(){
    const card=document.querySelector('#familySyncCard');
    const actions=document.querySelector('.family-sync-actions');
    const create=document.querySelector('#familyCreateBtn');
    const connect=document.querySelector('#familyConnectBtn');
    const leave=document.querySelector('#familyLeaveBtn');
    if(!card||!actions||!create||!connect)return;
    if(connect.parentElement!==actions){actions.insertBefore(connect,create.nextSibling);}
    if(leave)leave.textContent='Verbindung löschen';
  }
  function run(){polishSync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,150);
})();