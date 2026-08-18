const VAPID_PUBLIC_KEY = 'BHjRoFjjU8esZFeq_e4xgw2tjki12EXf8-S8l2FtlzhyXJSE2YU7oDUXRqWm_vSf5RcFY4KRmJDt2Zy9adI_Rbc';
const VAPID_X = 'eNGgWONTx6xkV6r97jGDDa2OSLXYRd_z5LyXYW2XOHI';
const VAPID_Y = 'XJSE2YU7oDUXRqWm_vSf5RcFY4KRmJDt2Zy9adI_Rbc';
const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(value) {
  const s = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(...parts) {
  const arrs = parts.map(p => p instanceof Uint8Array ? p : new Uint8Array(p));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

async function hkdfExtract(salt, ikm) { return hmac(salt, ikm); }
async function hkdfExpand(prk, info, len) {
  const block = await hmac(prk, concat(info, new Uint8Array([1])));
  return block.slice(0, len);
}

async function vapidJwt(endpoint, privateD) {
  if (!privateD) throw new Error('VAPID_PRIVATE_KEY fehlt');
  const origin = new URL(endpoint).origin;
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(enc.encode(JSON.stringify({
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: 'https://watchtrack-v2-git.pages.dev'
  })));
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', x: VAPID_X, y: VAPID_Y, d: privateD, ext: true
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(input)));
  return `${input}.${b64url(sig)}`;
}

async function encryptPayload(subscription, payload) {
  const uaPublic = fromB64url(subscription.keys?.p256dh);
  const auth = fromB64url(subscription.keys?.auth);
  if (uaPublic.length !== 65 || auth.length < 16) throw new Error('Ungültige Push-Subscription');

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const serverPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverPair.privateKey, 256));
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverPair.publicKey));

  const prkKey = await hkdfExtract(auth, shared);
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, serverPublic);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\0'), 12);

  const plaintext = concat(enc.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([serverPublic.length]), serverPublic, ciphertext);
}

export async function sendWebPush(subscription, payload, privateKey) {
  const body = await encryptPayload(subscription, payload);
  const jwt = await vapidJwt(subscription.endpoint, privateKey);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Urgency': 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
    },
    body
  });
}

export { VAPID_PUBLIC_KEY };
