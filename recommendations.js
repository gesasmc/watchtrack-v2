/* WatchTrack v3.3 – „Für euch“ mit Vorlieben + Ausblenden/Lernen */
(() => {
  const FEEDBACK_STORE='wt_rec_feedback';
  state.recommendationFeedback=readJSON(FEEDBACK_STORE,{});

  const forYou={id:'foryou',label:'Für euch',title:'Für euch ausgewählt',hint:'Empfehlungen aus eurer Liste und euren Vorlieben'};
  ['tv','movie'].forEach(type=>{if(!CATEGORIES[type].some(c=>c.id==='foryou'))CATEGORIES[type].splice(Math.min(1,CATEGORIES[type].length),0,{...forYou,title:type==='tv'?'Serien für euch':'Filme für euch'});});
  const validSeed=(x,type)=>x&&x.type===type&&!x.manual&&Number.isFinite(Number(x.id));
  function seedWeight(x){
    if(x.preference==='love') return 10;
    if(x.preference==='like') return 6;
    if(x.preference==='dislike') return -8;
    if(x.status==='completed'||x.status==='watching') return 3;
    if(x.status==='watchlist') return 1;
    return 0;
  }
  function hiddenFor(type){return Object.values(state.recommendationFeedback||{}).filter(x=>x&&x.type===type&&x.hidden&&Number.isFinite(Number(x.id)));}
  function pickSeeds(type){
    const librarySeeds=Object.values(state.library||{}).filter(x=>validSeed(x,type)&&x.status!=='dropped').sort((a,b)=>Math.abs(seedWeight(b))-Math.abs(seedWeight(a))||((b.updatedAt||0)-(a.updatedAt||0))).slice(0,12);
    const negativeSeeds=hiddenFor(type).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8).map(x=>({...x,preference:'dislike'}));
    return [...librarySeeds,...negativeSeeds];
  }
  async function wtForYou(type){
    const seeds=pickSeeds(type);if(!seeds.length)return{results:[],page:1,total_pages:1,total_results:0};
    const own=new Set(Object.values(state.library||{}).filter(x=>x.type===type).map(x=>String(x.id)));
    const hidden=new Set(hiddenFor(type).map(x=>String(x.id)));
    const scored=new Map();
    await Promise.all(seeds.map(async seed=>{
      let data=null;try{data=await api(`/${type}/${seed.id}/recommendations`,{language:'de-DE',page:1});}catch{}
      if(!data?.results?.length){try{data=await api(`/${type}/${seed.id}/similar`,{language:'de-DE',page:1});}catch{data={results:[]};}}
      const weight=seedWeight(seed);
      (data.results||[]).slice(0,20).forEach((x,rank)=>{
        if(!x?.id||own.has(String(x.id))||hidden.has(String(x.id))||!x.poster_path)return;
        const k=String(x.id),cur=scored.get(k)||{item:x,score:0,positiveHits:0,negativeHits:0};
        const rankFactor=(24-rank);
        cur.score += weight*rankFactor;
        if(weight>0){cur.score+=Math.min(Number(x.vote_average||0),10)*1.2+Math.log10(Math.max(1,Number(x.popularity||1)));cur.positiveHits++;}
        if(weight<0)cur.negativeHits++;
        scored.set(k,cur);
      });
    }));
    const results=[...scored.values()].filter(x=>x.score>0&&x.positiveHits>0).sort((a,b)=>(b.score-a.score)||(b.positiveHits-a.positiveHits)||(a.negativeHits-b.negativeHits)).slice(0,40).map(x=>x.item);
    return{results,page:1,total_pages:1,total_results:results.length};
  }
  const baseFetchDiscover=fetchDiscover;fetchDiscover=async function(type,category,page){if(category==='foryou')return wtForYou(type);return baseFetchDiscover(type,category,page);};
  const baseRenderCategoryChips=renderCategoryChips;renderCategoryChips=function(){
    baseRenderCategoryChips();
    if(state.discoverCategory==='foryou'){
      const librarySeeds=Object.values(state.library||{}).filter(x=>validSeed(x,state.discoverType)&&x.status!=='dropped');
      const rated=librarySeeds.filter(x=>x.preference).length,hidden=hiddenFor(state.discoverType).length;
      const el=document.querySelector('#discoverHint');
      if(el)el.textContent=librarySeeds.length?`Basierend auf eurer Liste${rated?` · ${rated} Vorlieben`:''}${hidden?` · ${hidden} ausgeblendet`:''}`:`Fügt erst ${state.discoverType==='tv'?'Serien':'Filme'} zu eurer Liste hinzu`;
    }
  };

  const baseCard=card;
  card=function(x,type){
    const html=baseCard(x,type);
    if(state.discoverCategory!=='foryou')return html;
    return html.replace('</article>',`<button class="rec-hide-btn" type="button" data-rec-hide="${type}:${x.id}" data-rec-title="${esc(titleOf(x))}" aria-label="${esc(titleOf(x))} nicht mehr vorschlagen">✕ <span>Nicht zeigen</span></button></article>`);
  };

  function saveFeedback(){localStorage.setItem(FEEDBACK_STORE,JSON.stringify(state.recommendationFeedback||{}));if(typeof saveLibrary==='function')saveLibrary();}
  function hideRecommendation(type,id,title){
    const key=`${type}:${id}`;
    state.recommendationFeedback[key]={id:Number(id),type,title:title||'',hidden:true,updatedAt:Date.now()};
    saveFeedback();
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-rec-hide]');if(!btn)return;
    e.preventDefault();e.stopPropagation();
    const [type,id]=btn.dataset.recHide.split(':');
    hideRecommendation(type,id,btn.dataset.recTitle||'');
    btn.closest('.media-card')?.remove();
    renderCategoryChips();
    toast('Ausgeblendet – fließt künftig in „Für euch“ ein');
  },true);
})();