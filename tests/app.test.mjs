import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function createElement(tagName) {
  return {
    tagName,
    children: [],
    style: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
}

// Fake storage area. `fail` makes every call reject, like a sync area that
// is disabled by policy.
function createStorageArea({ fail = false, data = {} } = {}) {
  const check = () => {
    if (fail) throw new Error('storage disabled');
  };
  return {
    data,
    async get(key) {
      check();
      return key in data ? { [key]: data[key] } : {};
    },
    async set(items) {
      check();
      Object.assign(data, items);
    },
    async remove(key) {
      check();
      delete data[key];
    },
  };
}

function loadScripts(dir, { root = null, body = null, storage = {} } = {}) {
  const elements = new Map();
  if (root) {
    elements.set('root', root);
  }
  const location = {
    href: 'https://example.com/post',
    hostname: 'example.com',
    pathname: '/post',
  };
  const sandbox = {
    URL,
    console: { log() {}, error() {} },
    window: { location },
    location,
    chrome: {
      storage: {
        sync: storage.sync ?? createStorageArea(),
        local: storage.local ?? createStorageArea(),
        onChanged: { addListener() {} },
      },
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
    },
    MutationObserver: class {
      observe() {}
    },
    document: {
      URL: 'https://example.com/post',
      querySelectorAll() { return []; },
      querySelector() { return null; },
      getElementById(id) { return elements.get(id) || null; },
      createElement,
      body,
    },
  };
  vm.createContext(sandbox);
  // same order as the manifest's content_scripts
  for (const file of ['common.js', 'app.js']) {
    const path = `${dir}/${file}`;
    vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox, { filename: path });
  }
  // top-level const/let aren't properties of the global object
  sandbox.lexical = (expr) => vm.runInContext(expr, sandbox);
  return sandbox;
}

for (const dir of ['chrome', 'firefox']) {
  test(`${dir} displayMenuOptions tolerates pages without #root or body`, () => {
    const sandbox = loadScripts(dir);

    assert.doesNotThrow(() => {
      sandbox.displayMenuOptions('https://example.com/post');
    });
  });

  test(`${dir} displayMenuOptions appends a fixed menu into #root`, () => {
    const root = createElement('div');
    const sandbox = loadScripts(dir, { root });

    sandbox.displayMenuOptions('https://example.com/post');

    assert.equal(root.children.length, 1);
    const menu = root.children[0];
    assert.equal(menu.id, 'medium-parser');
    assert.match(menu.style, /position:fixed/);
  });

  test(`${dir} displayMenuOptions falls back to document.body`, () => {
    const body = createElement('body');
    const sandbox = loadScripts(dir, { body });

    sandbox.displayMenuOptions('https://example.com/post');

    assert.equal(body.children.length, 1);
    assert.equal(body.children[0].id, 'medium-parser');
  });

  test(`${dir} menu follows the saved order and skips disabled services`, () => {
    const root = createElement('div');
    const sandbox = loadScripts(dir, { root });
    const settings = sandbox.normalizeSettings({
      services: [
        { key: 'archive_is', enabled: true },
        { key: 'readmedium', enabled: false },
        { key: 'freedium', enabled: true },
      ],
    });

    sandbox.displayMenuOptions(
      'https://example.com/post',
      sandbox.enabledServices(settings)
    );

    const labels = root.children[0].children.map((el) => el.textContent);
    // services missing from the saved list are appended, enabled
    assert.deepEqual(labels, [
      'Open in Archive.is',
      'Open in Freedium',
      'Open in Archive.today',
    ]);
  });

  test(`${dir} no menu when every service is disabled`, () => {
    const root = createElement('div');
    const sandbox = loadScripts(dir, { root });

    sandbox.displayMenuOptions('https://example.com/post', []);

    assert.equal(root.children.length, 0);
  });

  test(`${dir} normalizeSettings drops removed services and redirect`, () => {
    const sandbox = loadScripts(dir);
    // google and proxy were removed; users may still have them saved
    const settings = sandbox.normalizeSettings({
      redirectOption: 'google',
      services: [
        { key: 'google', enabled: true },
        { key: 'freedium', enabled: false },
        { key: 'proxy', enabled: true },
      ],
    });

    assert.equal(settings.redirectOption, 'archive_today');
    assert.equal(settings.services[0].key, 'freedium');
    assert.equal(settings.services[0].enabled, false);
    assert.deepEqual(
      Array.from(settings.services, (s) => s.key),
      ['freedium', 'readmedium', 'archive_today', 'archive_is']
    );
  });

  test(`${dir} settings fall back to storage.local when sync fails`, async () => {
    const local = createStorageArea();
    const sandbox = loadScripts(dir, {
      storage: { sync: createStorageArea({ fail: true }), local },
    });

    const where = await sandbox.saveSettings({ showOption: 'redirect' });
    const loaded = await sandbox.loadSettings();

    assert.equal(where, 'local');
    assert.equal(local.data.mediumParserSettings.showOption, 'redirect');
    assert.equal(loaded.showOption, 'redirect');
  });

  test(`${dir} settings prefer storage.sync and clear the local copy`, async () => {
    const sync = createStorageArea();
    const local = createStorageArea({
      data: { mediumParserSettings: { showOption: 'context' } },
    });
    const sandbox = loadScripts(dir, { storage: { sync, local } });

    const where = await sandbox.saveSettings({ showOption: 'redirect' });

    assert.equal(where, 'sync');
    assert.equal(sync.data.mediumParserSettings.showOption, 'redirect');
    assert.ok(!('mediumParserSettings' in local.data));
    assert.equal((await sandbox.loadSettings()).showOption, 'redirect');
  });
}
