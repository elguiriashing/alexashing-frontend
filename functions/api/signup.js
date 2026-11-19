const consentText = 'Email me launch updates from Alex Ashing.';
const mailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const maxBodyBytes = 2048;

async function readEmail(request) {
  if (!request.body || Number(request.headers.get('Content-Length')) > maxBodyBytes) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBodyBytes) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  const fields = new URLSearchParams(body + decoder.decode());
  if (fields.getAll('email').length !== 1) return null;
  const email = fields.get('email').trim().toLowerCase();
  return email.length <= 254 && email.indexOf('@') <= 64 && mailPattern.test(email) ? email : null;
}

export async function onRequest({ request, env }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
  }
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') && request.headers.get('Origin') !== origin) {
    return new Response(null, { status: 403, headers });
  }
  function respond(state, status) {
    if (request.headers.get('Accept')?.includes('application/json')) {
      return Response.json({ state }, { status, headers });
    }
    return new Response(null, { status: 303, headers: { ...headers, Location: '/#' + state } });
  }
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/x-www-form-urlencoded') return respond('check-email', 415);
  try {
    const email = await readEmail(request);
    if (!email) return respond('check-email', 422);
    await env.LAUNCH_DB.prepare(
      'INSERT INTO launch_signups (email, consent_text) VALUES (?, ?) ON CONFLICT(email) DO NOTHING'
    ).bind(email, consentText).run();
    return respond('joined', 200);
  } catch {
    return respond('try-again', 503);
  }
}
