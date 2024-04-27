const urlOptions = {
  google: {
    text: 'Open in Google Cache',
    uri: `http://webcache.googleusercontent.com/search?q=cache:#{url}#&strip=0&vwsrc=1&referer=medium-parser`,
  },
  readmedium: {
    text: 'Open in Read-Medium',
    uri: `https://readmedium.com/en/#{url}#`,
  },
  freedium: {
    text: 'Open in Freedium',
    uri: `https://freedium.cfd/#{url}#`,
  },
  archive_today: {
    text: 'Open in Archive.today',
    uri: `https://archive.today?url=#{url}#&run=1&referer=medium-parser`,
  },
  archive_is: {
    text: 'Open in Archive.is',
    uri: `https://archive.is?url=#{url}#&run=1&referer=medium-parser`,
  },
  proxy: {
    text: 'Open in Proxy API',
    uri: `https://medium-parser.vercel.app/?url=#{url}#`,
  },
};
const parentMenuId = 'mediumParserContextMenu';

browser.action.onClicked.addListener(function (tab) {
  browser.tabs.create({ url: 'options.html' });
});

browser.runtime.onInstalled.addListener(function () {
  browser.tabs.create({ url: 'options.html' });
  browser.contextMenus.create({
    id: parentMenuId,
    title: 'Medium Parser',
    contexts: ['page'],
  });

  for (const [key, value] of Object.entries(urlOptions)) {
    browser.contextMenus.create({
      id: `mediumParser${key}`,
      title: value.text,
      contexts: ['page'],
      parentId: parentMenuId,
    });
  }
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  console.log(info, tab, info.parentMenuItemId);
  if (info.parentMenuItemId === parentMenuId) {
    const redirectURLKey = info.menuItemId.replace('mediumParser', '');
    const redirectURL = urlOptions[redirectURLKey].uri.replace(
      '#{url}#',
      tab.url
    );
    browser.tabs.create({ url: redirectURL });
  }
});
