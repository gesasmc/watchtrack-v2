export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const target = new URL('/app-v33.html?wt=3310', url);
    const req = new Request(target.toString(), context.request);
    const response = await context.env.ASSETS.fetch(req);

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return context.next();
}
