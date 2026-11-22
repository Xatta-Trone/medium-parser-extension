#!/usr/bin/env node
// Build the Firefox add-on from the shared source.
//
//   node scripts/build-firefox.mjs [out-dir]     (default: build/firefox)
//
// chrome/ holds the extension's code. firefox/ holds only the Firefox
// manifest.json. The build copies everything in chrome/ except its
// manifest, then adds firefox/manifest.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildFirefox(outDir = path.join(root, 'build', 'firefox')) {
  const extra = fs.readdirSync(path.join(root, 'firefox')).filter((f) => f !== 'manifest.json');
  if (extra.length) {
    throw new Error(
      `firefox/ should only contain manifest.json, found: ${extra.join(', ')}. ` +
        'Put shared files in chrome/.'
    );
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'chrome'), outDir, {
    recursive: true,
    filter: (src) => path.relative(path.join(root, 'chrome'), src) !== 'manifest.json',
  });
  fs.copyFileSync(path.join(root, 'firefox', 'manifest.json'), path.join(outDir, 'manifest.json'));
  return outDir;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const out = buildFirefox(process.argv[2] && path.resolve(process.argv[2]));
    console.log(`Built the Firefox add-on in ${path.relative(process.cwd(), out) || '.'}`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
