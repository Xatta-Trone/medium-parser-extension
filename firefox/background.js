// Chrome runs this as a service worker; Firefox loads common.js first via the
// manifest's background.scripts.
if (typeof importScripts === 'function') {
  importScripts('common.js');
}

const parentMenuId = 'mediumParserContextMenu';

api.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    api.tabs.create({ url: 'options.html' });
  }
  buildContextMenus();
});

// Firefox for Android has no context menu API (issue #29).
if (api.contextMenus) {
  api.runtime.onStartup.addListener(buildContextMenus);
  onSettingsChanged(buildContextMenus);

  api.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.parentMenuItemId === parentMenuId) {
      const key = String(info.menuItemId).replace('mediumParser', '');
      if (key in urlOptions) {
        api.tabs.create({ url: buildServiceUrl(key, tab.url) });
      }
    }
  });
}

// Rebuild the right-click menu in the user's order, skipping disabled services.
let menuBuild = Promise.resolve();
function buildContextMenus() {
  if (!api.contextMenus) {
    return;
  }
  // serialize rebuilds so rapid saves can't create duplicate ids
  menuBuild = menuBuild.then(async function () {
    const settings = await loadSettings();
    await api.contextMenus.removeAll();
    const services = enabledServices(settings);
    if (services.length === 0) {
      return;
    }
    api.contextMenus.create({
      id: parentMenuId,
      title: 'Medium Parser',
      contexts: ['page'],
    });
    for (const service of services) {
      api.contextMenus.create({
        id: `mediumParser${service.key}`,
        title: service.text,
        contexts: ['page'],
        parentId: parentMenuId,
      });
    }
  }).catch(function (e) {
    console.error('Medium Parser: could not build context menu', e);
  });
  return menuBuild;
}
