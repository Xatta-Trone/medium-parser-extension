import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildFirefox } from '../scripts/build-firefox.mjs';

const files = (dir) =>
  fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();

test('Firefox build is chrome/ with the Firefox manifest', () => {
  const out = buildFirefox(fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')));

  assert.deepEqual(files(out), files('chrome'));
  for (const f of files('chrome')) {
    const expected = f === 'manifest.json' ? path.join('firefox', f) : path.join('chrome', f);
    assert.ok(fs.readFileSync(path.join(out, f)).equals(fs.readFileSync(expected)), `${f} differs`);
  }
});

test('manifests agree on everything that should match', () => {
  const chrome = JSON.parse(fs.readFileSync('chrome/manifest.json', 'utf8'));
  const firefox = JSON.parse(fs.readFileSync('firefox/manifest.json', 'utf8'));

  assert.equal(firefox.version, chrome.version);
  assert.deepEqual(firefox.content_scripts, chrome.content_scripts);
  assert.deepEqual(firefox.permissions, chrome.permissions);
  assert.ok(firefox.background.scripts.includes('background.js'));
  // every file a manifest names must exist in the shared source
  for (const m of [chrome, firefox]) {
    const named = [
      ...m.content_scripts.flatMap((c) => c.js),
      ...(m.background.scripts || [m.background.service_worker]),
      ...Object.values(m.icons),
      m.action.default_popup,
      m.options_ui?.page ?? m.options_page,
    ].filter(Boolean);
    for (const f of named) assert.ok(fs.existsSync(path.join('chrome', f)), `${f} missing from chrome/`);
  }
});
