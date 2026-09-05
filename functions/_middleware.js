export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const target = new URL('/app-v33.html', url);
    const response = await context.env.ASSETS.fetch(target);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    headers.set('X-WatchTrack-Version', '3.3');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return context.next();
}
