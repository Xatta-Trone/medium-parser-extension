/** @format */
// Shared by the content script, background script, options page and popup.
// Keep this file identical in chrome/ and firefox/.

const api = globalThis.browser ?? globalThis.chrome;

const SETTINGS_KEY = 'mediumParserSettings';

// Order here is the default order shown to users.
const urlOptions = {
  readmedium: {
    text: 'Open in Read-Medium',
    label: 'Read-Medium (https://readmedium.com)',
    uri: `https://readmedium.com/en/#{url}#`,
  },
  freedium: {
    text: 'Open in Freedium',
    label: 'Freedium (https://freedium-mirror.cfd)',
    uri: `https://freedium-mirror.cfd/#{url}#`,
  },
  archive_today: {
    text: 'Open in Archive.today',
    label: 'Archive.today (https://archive.today)',
    uri: `https://archive.today?url=#{url}#&run=1&referer=medium-parser`,
  },
  archive_is: {
    text: 'Open in Archive.is',
    label: 'Archive.is (https://archive.is)',
    uri: `https://archive.is?url=#{url}#&run=1&referer=medium-parser`,
  },
};

const defaultSettings = {
  openInNewTab: true,
  redirectOption: 'archive_today',
  showOption: 'page',
  // Display order and on/off state of each service (issue #42).
  services: Object.keys(urlOptions).map((key) => ({ key, enabled: true })),
};

function buildServiceUrl(key, pageUrl) {
  return urlOptions[key].uri.replace('#{url}#', pageUrl);
}

// Merge stored settings with the defaults. Unknown services are dropped and
// services added in a later version are appended, enabled.
function normalizeSettings(stored) {
  const settings = { ...defaultSettings, ...(stored || {}) };
  if (!(settings.redirectOption in urlOptions)) {
    settings.redirectOption = defaultSettings.redirectOption;
  }

  const seen = new Set();
  const services = [];
  for (const item of Array.isArray(settings.services) ? settings.services : []) {
    if (item && item.key in urlOptions && !seen.has(item.key)) {
      seen.add(item.key);
      services.push({ key: item.key, enabled: item.enabled !== false });
    }
  }
  for (const key of Object.keys(urlOptions)) {
    if (!seen.has(key)) {
      services.push({ key, enabled: true });
    }
  }
  settings.services = services;
  return settings;
}

// Services the user has enabled, in their chosen order.
function enabledServices(settings) {
  return settings.services
    .filter((s) => s.enabled)
    .map((s) => ({ key: s.key, ...urlOptions[s.key] }));
}

// storage.sync can be missing or disabled by policy on managed profiles,
// so fall back to storage.local (issue #49).
async function loadSettings() {
  let stored;
  try {
    stored = (await api.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY];
  } catch (e) {
    // sync unavailable
  }
  if (!stored) {
    try {
      stored = (await api.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
    } catch (e) {
      // local unavailable too; use defaults
    }
  }
  return normalizeSettings(stored);
}

async function saveSettings(settings) {
  const data = { [SETTINGS_KEY]: settings };
  try {
    await api.storage.sync.set(data);
  } catch (e) {
    await api.storage.local.set(data);
    return 'local';
  }
  // A stale local copy would otherwise win if sync later fails to read.
  try {
    await api.storage.local.remove(SETTINGS_KEY);
  } catch (e) {
    // ignore
  }
  return 'sync';
}

function onSettingsChanged(callback) {
  api.storage.onChanged.addListener((changes) => {
    if (SETTINGS_KEY in changes) {
      callback();
    }
  });
}
