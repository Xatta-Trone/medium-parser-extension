#!/usr/bin/env node
// Publish to the Chrome Web Store with the v2 API and a service account.
//
//   node scripts/chrome-webstore.mjs status
//   node scripts/chrome-webstore.mjs publish dist/medium-parser-chrome-1.6.6.zip
//
// Environment:
//   CWS_SERVICE_ACCOUNT_KEY  JSON key of the service account (the whole file)
//   CWS_PUBLISHER_ID         Developer Dashboard > Publisher > Settings
//   CWS_EXTENSION_ID         the item's 32-character ID
//
// API reference: https://developer.chrome.com/docs/webstore/api/reference/rest

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API = 'https://chromewebstore.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

// Signed JWT for Google's service-account token exchange.
export function createAssertion(key, now = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT', kid: key.private_key_id };
  const claims = {
    iss: key.client_email,
    scope: SCOPE,
    aud: key.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(key.private_key, 'base64url');
  return `${unsigned}.${signature}`;
}

export function parseKey(raw) {
  let key;
  try {
    key = JSON.parse(raw);
  } catch {
    throw new Error('CWS_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the whole key file.');
  }
  if (!key.client_email || !key.private_key) {
    throw new Error('CWS_SERVICE_ACCOUNT_KEY is missing client_email or private_key.');
  }
  return key;
}

// Turn a Google API error response into a readable message.
async function failure(what, response) {
  let detail = response.statusText;
  try {
    const body = await response.json();
    detail = body.error_description || body.error?.message || JSON.stringify(body);
  } catch {
    // keep statusText
  }
  return new Error(`${what} failed (HTTP ${response.status}): ${detail}`);
}

export async function getAccessToken(key, fetchImpl = fetch) {
  const response = await fetchImpl(key.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createAssertion(key),
    }),
  });
  if (!response.ok) throw await failure('Getting an access token', response);
  return (await response.json()).access_token;
}

export function createClient({ token, publisherId, extensionId, fetchImpl = fetch, sleep }) {
  const item = `publishers/${publisherId}/items/${extensionId}`;
  const auth = { Authorization: `Bearer ${token}` };
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));

  async function call(what, url, init = {}) {
    const response = await fetchImpl(url, { ...init, headers: { ...auth, ...init.headers } });
    if (!response.ok) throw await failure(what, response);
    return response.json();
  }

  const client = {
    fetchStatus() {
      return call('Fetching item status', `${API}/v2/${item}:fetchStatus`);
    },

    async upload(zip) {
      let result = await call('Uploading the package', `${API}/upload/v2/${item}:upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: zip,
      });
      // Large uploads are processed asynchronously; poll until done.
      let state = result.uploadState;
      for (let i = 0; state === 'IN_PROGRESS' || state === 'UPLOAD_IN_PROGRESS'; i++) {
        if (i >= 30) throw new Error('Upload is still processing after 5 minutes.');
        await wait(10000);
        state = (await client.fetchStatus()).lastAsyncUploadState;
      }
      if (state !== 'SUCCEEDED') {
        throw new Error(`Upload finished with state ${state}. Check the Developer Dashboard.`);
      }
      return result;
    },

    publish() {
      // DEFAULT_PUBLISH: goes live automatically once Google approves it.
      return call('Submitting for review', `${API}/v2/${item}:publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
      });
    },
  };
  return client;
}

function describe(status) {
  const line = (label, revision) => {
    if (!revision) return `${label}: none`;
    const versions = (revision.distributionChannels || [])
      .map((c) => `${c.crxVersion} (${c.deployPercentage ?? '?'}%)`)
      .join(', ');
    return `${label}: ${revision.state}${versions ? ` - ${versions}` : ''}`;
  };
  return [
    line('Published', status.publishedItemRevisionStatus),
    line('Submitted', status.submittedItemRevisionStatus),
    status.takenDown ? 'WARNING: the item is taken down for a policy violation.' : null,
    status.warned ? 'WARNING: the item has a policy warning.' : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function main(argv = process.argv.slice(2), env = process.env, fetchImpl = fetch) {
  const [command, zipPath] = argv;
  if (!['status', 'publish'].includes(command) || (command === 'publish' && !zipPath)) {
    throw new Error('Usage: chrome-webstore.mjs status | publish <zip>');
  }
  for (const name of ['CWS_SERVICE_ACCOUNT_KEY', 'CWS_PUBLISHER_ID', 'CWS_EXTENSION_ID']) {
    if (!env[name]) throw new Error(`${name} is not set.`);
  }

  const key = parseKey(env.CWS_SERVICE_ACCOUNT_KEY);
  const token = await getAccessToken(key, fetchImpl);
  const client = createClient({
    token,
    publisherId: env.CWS_PUBLISHER_ID,
    extensionId: env.CWS_EXTENSION_ID,
    fetchImpl,
  });

  const before = await client.fetchStatus();
  console.log(`Authenticated as ${key.client_email}.\n${describe(before)}`);
  if (before.takenDown) throw new Error('Item is taken down; not publishing.');
  if (command === 'status') return;

  const uploaded = await client.upload(await fs.readFile(zipPath));
  console.log(`Uploaded version ${uploaded.crxVersion ?? '(processing)'}.`);

  const published = await client.publish();
  console.log(`Submitted. State: ${published.state}.`);
  for (const w of published.warningInfo?.warnings || []) {
    console.log(`Warning (${w.reason}): ${w.description}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
