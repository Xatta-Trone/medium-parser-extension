const menuOptions = {
  page: 'Show options in page (default)',
  redirect: 'Auto redirect on page load',
  context: 'Show options in context menu',
};

// current order/on-off state being edited
let services = [];

function buildOptions() {
  const showOption = document.getElementById('showOption');
  showOption.innerHTML = '';
  for (const [key, value] of Object.entries(menuOptions)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value;
    showOption.appendChild(option);
  }

  const redirectOptionsEl = document.getElementById('redirectOptions');
  redirectOptionsEl.innerHTML = '';
  for (const [key, value] of Object.entries(urlOptions)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value.label;
    redirectOptionsEl.appendChild(option);
  }

  loadSettings().then(function (settings) {
    showOption.value = settings.showOption;
    redirectOptionsEl.value = settings.redirectOption;
    document.getElementById('openInNewTab').checked = settings.openInNewTab;
    services = settings.services;
    renderServiceList();

    // trigger change event to draw the preview
    showOption.dispatchEvent(new Event('change'));
  });
}

// Service list with on/off checkboxes and up/down buttons (issue #42)
function renderServiceList() {
  const list = document.getElementById('serviceList');
  list.innerHTML = '';
  services.forEach(function (service, index) {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex align-items-center service-row';
    item.dataset.key = service.key;

    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder';
    handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('pointerdown', startDrag);

    const check = document.createElement('div');
    check.className = 'form-check flex-grow-1';
    const input = document.createElement('input');
    input.className = 'form-check-input';
    input.type = 'checkbox';
    input.id = `service-${service.key}`;
    input.checked = service.enabled;
    input.addEventListener('change', function () {
      service.enabled = input.checked;
      renderPreview();
    });
    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = input.id;
    label.textContent = urlOptions[service.key].label;
    check.append(input, label);

    const buttons = document.createElement('div');
    buttons.className = 'btn-group btn-group-sm flex-shrink-0 ms-2';
    buttons.append(
      moveButton('↑', `Move ${label.textContent} up`, index, -1),
      moveButton('↓', `Move ${label.textContent} down`, index, 1)
    );

    item.append(handle, check, buttons);
    list.appendChild(item);
  });
}

// Drag a row by its handle. Pointer events cover mouse, pen and touch
// (HTML5 drag-and-drop doesn't work on touch screens).
function startDrag(event) {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  const handle = event.currentTarget;
  const row = handle.closest('li');
  const list = row.parentElement;
  const pointerId = event.pointerId;
  row.classList.add('dragging');

  // Listen on window, not the handle: moving the row in the DOM would drop
  // the handle's pointer capture and lose the rest of the drag.
  function onMove(e) {
    if (e.pointerId !== pointerId) return;
    // move the row before the first other row whose middle is below the pointer
    const others = [...list.children].filter((li) => li !== row);
    const before = others.find((li) => {
      const box = li.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (before) {
      if (row.nextElementSibling !== before) list.insertBefore(row, before);
    } else if (list.lastElementChild !== row) {
      list.appendChild(row);
    }
  }

  function onEnd(e) {
    if (e.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    row.classList.remove('dragging');

    const order = [...list.children].map((li) => li.dataset.key);
    const changed = order.some((key, i) => key !== services[i].key);
    if (changed) {
      services.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
      renderServiceList();
      renderPreview();
    }
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);
}

function moveButton(text, title, index, delta) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline-secondary';
  button.textContent = text;
  button.title = title;
  button.setAttribute('aria-label', title);
  const target = index + delta;
  button.disabled = target < 0 || target >= services.length;
  button.addEventListener('click', function () {
    [services[index], services[target]] = [services[target], services[index]];
    renderServiceList();
    renderPreview();
    // keep keyboard focus on the moved row's button
    const buttons = document.querySelectorAll('#serviceList .btn-group');
    const moved = buttons[target].children[delta < 0 ? 0 : 1];
    (moved.disabled ? buttons[target].querySelector('button:not(:disabled)') : moved).focus();
  });
  return button;
}

buildOptions();

document.getElementById('showOption').addEventListener('change', function () {
  toggleRedirectOptionsEl(this.value == 'redirect');
  renderPreview();
});
document
  .getElementById('redirectOptions')
  .addEventListener('change', renderPreview);
document
  .getElementById('openInNewTab')
  .addEventListener('change', renderPreview);

// Draw what the chosen menu option will look like with the current,
// unsaved service list.
function renderPreview() {
  const mode = document.getElementById('showOption').value;
  const caption = document.getElementById('previewCaption');
  const preview = document.getElementById('preview');
  const enabled = services.filter((s) => s.enabled);
  preview.innerHTML = '';

  if (mode == 'redirect') {
    const service = urlOptions[document.getElementById('redirectOptions').value];
    const newTab = document.getElementById('openInNewTab').checked;
    caption.textContent = '';
    const text = document.createElement('p');
    text.textContent = `Medium articles open in ${service.label.split(' (')[0]} automatically${newTab ? ', in a new tab' : ''}.`;
    preview.appendChild(text);
    return;
  }

  if (enabled.length == 0) {
    caption.textContent = '';
    const empty = document.createElement('p');
    empty.className = 'preview-empty';
    empty.textContent = 'All services are turned off, so nothing will show.';
    preview.appendChild(empty);
    return;
  }

  if (mode == 'page') {
    caption.textContent = 'Buttons shown on the right side of Medium articles.';
    const panel = document.createElement('div');
    panel.className = 'preview-buttons';
    for (const s of enabled) {
      const button = document.createElement('div');
      button.className = 'preview-button';
      button.textContent = urlOptions[s.key].text;
      panel.appendChild(button);
    }
    preview.appendChild(panel);
    return;
  }

  // context menu
  caption.textContent = 'Right-click anywhere on a Medium article.';
  const menu = document.createElement('div');
  menu.className = 'preview-menu';
  const main = document.createElement('ul');
  for (const text of ['Back', 'Reload', 'Medium Parser  ▸']) {
    const li = document.createElement('li');
    li.textContent = text;
    if (text.startsWith('Medium')) li.className = 'parent';
    main.appendChild(li);
  }
  const sub = document.createElement('ul');
  sub.className = 'submenu';
  for (const s of enabled) {
    const li = document.createElement('li');
    li.textContent = urlOptions[s.key].text;
    sub.appendChild(li);
  }
  menu.append(main, sub);
  preview.appendChild(menu);
}

document.getElementById('saveButton').addEventListener('click', function () {
  const settings = {
    showOption: document.getElementById('showOption').value,
    redirectOption: document.getElementById('redirectOptions').value,
    openInNewTab: document.getElementById('openInNewTab').checked,
    services: services.map((s) => ({ key: s.key, enabled: s.enabled })),
  };

  saveSettings(settings)
    .then(function () {
      showAlert('alert-success', 'alert-danger');
    })
    .catch(function (error) {
      console.error(error);
      showAlert('alert-danger', 'alert-success');
    });
});

function showAlert(showId, hideId) {
  const alertDiv = document.getElementById(showId);
  alertDiv.style.display = 'block';
  document.getElementById(hideId).style.display = 'none';
  setTimeout(function () {
    alertDiv.style.display = 'none'; // Hide the alert after 3 seconds
  }, 3000);
}

function toggleRedirectOptionsEl(show = false) {
  document.getElementById('redirectOptions').disabled = !show;
  document.getElementById('redirectOptionsEl').style.display = show
    ? 'block'
    : 'none';
}
