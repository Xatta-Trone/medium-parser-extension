# Medium Parser

Manifest V3 browser extension (Chrome and Firefox) that opens Medium articles in third-party
readers (Freedium, Read-Medium, Archive.today, Archive.is). No build step and no dependencies for
the extension itself; plain JavaScript.

## Layout

- `chrome/`: the only source folder. Edit code here.
  - `common.js`: shared by every script: `api` (browser/chrome), the service list
    (`urlOptions`), default settings, `normalizeSettings`, `loadSettings`/`saveSettings`
    (storage.sync, falling back to storage.local).
  - `app.js`: content script. Detects Medium pages (host, `com.medium.reader` meta tag, or Medium
    CDN scripts) and shows the menu or redirects.
  - `background.js`: context menus. Loads `common.js` with `importScripts` on Chrome; Firefox
    lists both files in `background.scripts`.
  - `popup.*`: toolbar popup. `options.*`: settings page (drag reorder, live preview).
- `firefox/`: only `manifest.json`. `node scripts/build-firefox.mjs` builds `build/firefox/` from
  `chrome/` plus this manifest. Never add other files to `firefox/`; the build refuses.
- `scripts/chrome-webstore.mjs`: Chrome Web Store API v2 client used by the publish workflow.
- `tests/`: `node --test`. Tests load `chrome/common.js` and `chrome/app.js` in a `vm` sandbox.
  Arrays from the sandbox are another realm; wrap them in `Array.from` before `deepEqual`.

## Commands

```bash
node --test tests/
node scripts/build-firefox.mjs
npx --yes web-ext@10.8.0 lint --source-dir build/firefox
```

Use the Node version in `.nvmrc` (26). Check `node --version` first; an older Node on the PATH
may fail on newer APIs.

## Rules

- A manifest change usually goes in both `chrome/manifest.json` and `firefox/manifest.json`. Tests
  check that version, permissions and content scripts match.
- A new permission needs a justification in the Chrome Web Store dashboard before the store
  accepts the version. Also update `PRIVACY.md` when permissions or data handling change.
- Don't add Firefox `data_collection_permissions` until AMO requires it.
- Releasing: see `RELEASING.md` (bump both manifests, add a `changelog.md` entry, publish a GitHub
  release; workflows submit to both stores).
- CI (`.github/workflows/test.yml`) runs tests, builds Firefox and runs `web-ext lint` on every PR.
