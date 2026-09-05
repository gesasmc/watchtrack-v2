export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Force the public app entry points to the current WatchTrack v3.3 shell.
  // This bypasses any stale Pages index asset while keeping all /api/* Functions intact.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const target = new URL('/app-v33.html', url);
    const request = new Request(target.toString(), context.request);
    const response = await context.next(request);
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
