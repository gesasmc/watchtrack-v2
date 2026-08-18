state.calendarProviderMap = state.calendarProviderMap || {};
wtEnsureProviderMap = async function(){
  if(Object.keys(state.calendarProviderMap).length) return state.calendarProviderMap;
  const [m,t]=await Promise.all([
    api('/watch/providers/movie',{language:'de-DE',watch_region:state.region}),
    api('/watch/providers/tv',{language:'de-DE',watch_region:state.region})
  ]);
  for(const [key,label,re] of WT_SERVICES){
    const mp=(m.results||[]).find(x=>re.test(x.provider_name));
    const tp=(t.results||[]).find(x=>re.test(x.provider_name));
    state.calendarProviderMap[key]={key,label,movie:mp?.provider_id||null,tv:tp?.provider_id||null,logo:mp?.logo_path||tp?.logo_path||null};
  }
  return state.calendarProviderMap;
};