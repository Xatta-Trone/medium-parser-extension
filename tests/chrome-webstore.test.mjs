import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createAssertion,
  createClient,
  main,
  parseKey,
} from '../scripts/chrome-webstore.mjs';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const key = {
  client_email: 'publisher@example-project.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  private_key_id: 'abc123',
  token_uri: 'https://oauth2.googleapis.com/token',
};
const env = {
  CWS_SERVICE_ACCOUNT_KEY: JSON.stringify(key),
  CWS_PUBLISHER_ID: 'pub-1',
  CWS_EXTENSION_ID: 'elgmajanahbjpbcljflifdnnmpodfiij',
};

// Fake fetch: answers each request with the next queued response and
// records what was asked.
function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request to ${url}`);
    return {
      ok: next.status === undefined || next.status < 400,
      status: next.status ?? 200,
      statusText: next.statusText ?? 'OK',
      json: async () => next.body,
    };
  };
  return { impl, calls };
}

const quietly = async (fn) => {
  const log = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
  }
};

test('assertion is a valid RS256 JWT for the Chrome Web Store scope', () => {
  const jwt = createAssertion(key, 1000);
  const [h, c, sig] = jwt.split('.');
  const header = JSON.parse(Buffer.from(h, 'base64url'));
  const claims = JSON.parse(Buffer.from(c, 'base64url'));

  assert.equal(header.alg, 'RS256');
  assert.equal(header.kid, 'abc123');
  assert.equal(claims.iss, key.client_email);
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/chromewebstore');
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(claims.exp - claims.iat, 3600);
  assert.ok(
    crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, sig, 'base64url')
  );
});

test('parseKey explains a bad secret', () => {
  assert.throws(() => parseKey('not json'), /not valid JSON/);
  assert.throws(() => parseKey('{"client_email":"x"}'), /private_key/);
});

test('status authenticates and only reads', async () => {
  const { impl, calls } = fakeFetch([
    { body: { access_token: 'tok' } },
    { body: { publishedItemRevisionStatus: { state: 'PUBLISHED' } } },
  ]);

  await quietly(() => main(['status'], env, impl));

  assert.equal(calls.length, 2);
  const tokenBody = new URLSearchParams(String(calls[0].init.body));
  assert.equal(tokenBody.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  assert.equal(
    calls[1].url,
    'https://chromewebstore.googleapis.com/v2/publishers/pub-1/items/elgmajanahbjpbcljflifdnnmpodfiij:fetchStatus'
  );
  assert.equal(calls[1].init.headers.Authorization, 'Bearer tok');
});

test('publish uploads the zip, then submits for review', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cws-'));
  const zip = path.join(dir, 'ext.zip');
  fs.writeFileSync(zip, 'zip-bytes');
  const { impl, calls } = fakeFetch([
    { body: { access_token: 'tok' } },
    { body: {} },
    { body: { uploadState: 'SUCCEEDED', crxVersion: '1.6.6' } },
    { body: { state: 'PENDING_REVIEW' } },
  ]);

  await quietly(() => main(['publish', zip], env, impl));

  const [, , upload, publish] = calls;
  assert.equal(upload.method, 'POST');
  assert.match(upload.url, /\/upload\/v2\/publishers\/pub-1\/items\/.+:upload$/);
  assert.equal(String(upload.init.body), 'zip-bytes');
  assert.equal(publish.method, 'POST');
  assert.match(publish.url, /\/v2\/publishers\/pub-1\/items\/.+:publish$/);
  assert.deepEqual(JSON.parse(publish.init.body), { publishType: 'DEFAULT_PUBLISH' });
});

test('upload waits while the store is still processing', async () => {
  const { impl, calls } = fakeFetch([
    { body: { uploadState: 'IN_PROGRESS' } },
    { body: { lastAsyncUploadState: 'IN_PROGRESS' } },
    { body: { lastAsyncUploadState: 'SUCCEEDED' } },
  ]);
  const client = createClient({
    token: 'tok',
    publisherId: 'p',
    extensionId: 'e',
    fetchImpl: impl,
    sleep: async () => {},
  });

  await client.upload(Buffer.from('z'));

  assert.equal(calls.length, 3);
  assert.match(calls[2].url, /:fetchStatus$/);
});

test('a failed upload stops before publishing', async () => {
  const { impl, calls } = fakeFetch([{ body: { uploadState: 'FAILED' } }]);
  const client = createClient({ token: 't', publisherId: 'p', extensionId: 'e', fetchImpl: impl });

  await assert.rejects(client.upload(Buffer.from('z')), /state FAILED/);
  assert.equal(calls.length, 1);
});

test('API errors include Google\'s message', async () => {
  const { impl } = fakeFetch([
    { status: 400, statusText: 'Bad Request', body: { error: { message: 'Version must be higher' } } },
  ]);
  const client = createClient({ token: 't', publisherId: 'p', extensionId: 'e', fetchImpl: impl });

  await assert.rejects(client.upload(Buffer.from('z')), /HTTP 400\): Version must be higher/);
});

test('missing settings are named', async () => {
  await assert.rejects(main(['status'], { ...env, CWS_PUBLISHER_ID: '' }), /CWS_PUBLISHER_ID is not set/);
});
