console.log('options.js loaded');

const menuOptions = {
  page: 'Show options in page (default)',
  redirect: 'Auto redirect on page load',
  context: 'Show options in context menu',
};

const redirectOptions = {
  google: 'Google Web Cache',
  readmedium: 'Read-Medium (https://readmedium.com)',
  freedium: 'Freedium (https://freedium.cfd)',
  archive_today: 'Archive.today (https://archive.today)',
  archive_is: 'Archive.is (https://archive.is)',
  proxy: 'Proxy API (https://medium-parser.vercel.app/)',
};

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
  for (const [key, value] of Object.entries(redirectOptions)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value;
    redirectOptionsEl.appendChild(option);
  }

  // get the settings data and set
  chrome.storage.sync.get('mediumParserSettings', function (result) {
    console.log(result.mediumParserSettings);
    let settings = result.mediumParserSettings;
    if (settings) {
      document.getElementById('showOption').value = settings.showOption;
      document.getElementById('redirectOptions').value =
        settings.redirectOption;
    } else {
      document.getElementById('showOption').value = 'page';
      document.getElementById('redirectOptions').value = 'archive_today';
    }

    if (settings && settings.showOption == 'redirect') {
      toggleRedirectOptionsEl(true);
    } else {
      toggleRedirectOptionsEl(false);
    }
  });
}

buildOptions();

document.getElementById('showOption').addEventListener('change', function () {
  var selectedValue = this.value;
  console.log(selectedValue);
  if (selectedValue == 'redirect') {
    toggleRedirectOptionsEl(true);
  } else {
    toggleRedirectOptionsEl(false);
  }
});

document.getElementById('saveButton').addEventListener('click', function () {
  var showOptionValue = document.getElementById('showOption').value;
  var redirectOptionValue = document.getElementById('redirectOptions').value;

  let settings = {
    showOption: showOptionValue,
    redirectOption: redirectOptionValue,
  };

  try {
    chrome.storage.sync.set({ mediumParserSettings: settings }, function () {
      console.log('Data is set.');
      var alertDiv = document.getElementById('alert-success');
      alertDiv.style.display = 'block';
      document.getElementById('alert-danger').style.display = 'none'; // Hide the alert
      setTimeout(function () {
        alertDiv.style.display = 'none'; // Hide the alert after 3 seconds
      }, 3000);
    });
  } catch (error) {
    console.error(error);
    var alertDiv = document.getElementById('alert-danger');
    alertDiv.style.display = 'block';
    document.getElementById('alert-success').style.display = 'none'; // Hide the alert
    setTimeout(function () {
      alertDiv.style.display = 'none'; // Hide the alert after 3 seconds
    }, 3000);
  }

  console.log(showOptionValue, redirectOptionValue);
});

function toggleRedirectOptionsEl(show = false) {
  if (show) {
    document.getElementById('redirectOptions').disabled = false;
    document.getElementById('redirectOptionsEl').style.display = 'block';
  } else {
    document.getElementById('redirectOptions').disabled = true;
    document.getElementById('redirectOptionsEl').style.display = 'none';
  }
}
