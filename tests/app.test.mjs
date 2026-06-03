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

function loadScript(path, root = null) {
  const code = fs.readFileSync(path, 'utf8');
  const elements = new Map();
  if (root) {
    elements.set('root', root);
  }
  const sandbox = {
    URL,
    console: { log() {} },
    window: { location: { href: 'https://example.com/post' } },
    location: { href: 'https://example.com/post' },
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
    },
  };
  vm.runInNewContext(code, sandbox, { filename: path });
  return sandbox;
}

for (const scriptPath of ['chrome/app.js', 'firefox/app.js']) {
  test(`${scriptPath} displayMenuOptions tolerates pages without #root`, () => {
    const sandbox = loadScript(scriptPath);

    assert.doesNotThrow(() => {
      sandbox.displayMenuOptions('https://example.com/post');
    });
  });

  test(`${scriptPath} displayMenuOptions still appends menu into #root`, () => {
    const root = createElement('div');
    const sandbox = loadScript(scriptPath, root);

    sandbox.displayMenuOptions('https://example.com/post');

    assert.equal(root.style.position, 'relative');
    assert.equal(root.children.length, 1);
    assert.equal(root.children[0].id, 'medium-parser');
  });
}
