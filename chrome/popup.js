// Toolbar popup: open the current page in one of the enabled services
// (issue #50). This is also the main UI on Firefox for Android, which has no
// right-click menu (issue #29).

function showMessage(text) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.hidden = false;
}

async function renderPopup() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab && tab.url;
  const settings = await loadSettings();
  const services = enabledServices(settings);
  const container = document.getElementById('services');

  if (!pageUrl || !/^https?:/.test(pageUrl)) {
    showMessage('Open a Medium article, then try again.');
    return;
  }
  if (services.length === 0) {
    showMessage('All services are turned off. Turn some on in Settings.');
    return;
  }

  for (const service of services) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'service';
    button.textContent = service.text;
    button.addEventListener('click', async function () {
      const url = buildServiceUrl(service.key, pageUrl);
      if (settings.openInNewTab) {
        await api.tabs.create({ url, index: tab.index + 1 });
      } else {
        await api.tabs.update(tab.id, { url });
      }
      window.close();
    });
    container.appendChild(button);
  }
}

document.getElementById('settings').addEventListener('click', function () {
  api.runtime.openOptionsPage();
  window.close();
});

renderPopup().catch(function (e) {
  console.error(e);
  showMessage('Something went wrong. Please reload the page and try again.');
});
