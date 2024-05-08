/** @format */
// console.log("Medium parser loaded");

const ignoreURLs = [
  '/me/lists',
  '/me/lists/saved',
  '/me/list/highlights',
  '/me/lists/reading-history',
  '/me/stories/public',
  '/me/stories/responses',
  '/me/stories/drafts',
  '/me/stats',
  '/me/settings',
  '/me/following',
  '/me/settings',
  '/me/settings/publishing',
  '/me/settings/notifications',
  '/me/settings/membership',
  '/me/settings/security',
  '/me/notifications',
  '/plans',
  '/mastodon',
  '/verified-authors',
  '/partner-program',
  '/gift-plans',
  '/new-story',
  '/m/signin',
  '/explore-topics',
  '/tag/*',
];

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

function init() {
  if (checkIfGoogleWebCache()) {
    return formatGoogleWebCache();
  }
  checkIfItIsMediumBlog();
}

init();

// checks if the page is google web cache and referred by this extension
function checkIfGoogleWebCache() {
  const url = new URL(document.URL);
  return (
    url.hostname == 'webcache.googleusercontent.com' &&
    url.searchParams.has('referer', 'medium-parser') &&
    url.searchParams.has('vwsrc', '1')
  );
}

// if it is a medium blog then run the script
function checkIfItIsMediumBlog() {
  const e = /https?:\/\/cdn-(?:static|client)(?:-\d)?\.medium\.com\//;

  if (
    [...document.querySelectorAll('script')].filter((r) => e.test(r.src))
      .length > 0 ||
    e.test(window.location.hostname)
  ) {
    // console.log("Is a medium blog !", handleURLChange());
    handleURLChange();
  } else {
    // console.log("Not a medium blog :( ");
  }
}

// handle URL change
function handleURLChange() {
  let previousUrl = '';
  let observer = new MutationObserver(function (mutations) {
    if (window.location.href !== previousUrl) {
      previousUrl = window.location.href;
      // console.log(`URL data changed to ${window.location.href}`);
      runMedium(location.href);
    }
  });

  const config = { attributes: true, childList: true, subtree: true };
  observer.observe(document, config);
}

function runMedium(url) {
  // default settings
  let defaultSettings = {
    openInNewTab: true,
    redirectOption: 'google',
    showOption: 'page',
  };
  chrome.storage.sync.get('mediumParserSettings', function (result) {
    let userSetting = result.mediumParserSettings;
    if (userSetting) {
      // merge the user settings with the default settings
      defaultSettings = {
        ...defaultSettings,
        ...userSetting,
      };
    }
    console.log(result, defaultSettings);
    if (defaultSettings.showOption == 'page') {
      displayMenuOptions(url);
    }

    if (defaultSettings.showOption == 'redirect') {
      handleRedirect(
        defaultSettings.redirectOption,
        url,
        defaultSettings.openInNewTab
      );
    }
  });
}

// Redirect based on the user setting
function handleRedirect(redirectTo, url, openInNewTab) {
  // check the url
  if (checkValidURLAndShouldProceed(url)) {
    let redirectOption = 'archive_today';
    if (redirectTo in urlOptions) {
      redirectOption = redirectTo;
    }
    let newUrl = urlOptions[redirectOption].uri.replace('#{url}#', url);
    // console.log("Redirecting to ", url);
    // Redirect to the new URL
    if (openInNewTab) {
      window.open(newUrl, '_blank').focus();
    } else {
      const divId = 'medium-parser-redirect-message';
      // do the cleanup
      // remove the element
      const el = document.getElementById(divId);
      if (el != undefined || el != null) {
        el.remove();
      }
      // check if the url has already been visited.
      // if yes then do nothing
      // if no then proceed with the redirect
      let previousUrl = sessionStorage.getItem('redirectUrl');
      console.log(previousUrl, url);
      if (previousUrl != url) {
        sessionStorage.setItem('redirectUrl', url);
        let anchor = document.createElement('a');
        anchor.href = newUrl;
        anchor.click();
      } else {
        // console.log('Already visited');
        // Select the div right next to the h1
        let divNextToH1 = document.querySelector('h1 + div');
        if (divNextToH1 == null) {
          divNextToH1 = document.querySelector('h2 + div');
        }
        // console.log(divNextToH1);
        // Create a new div element
        const newDiv = document.createElement('a');
        newDiv.id = divId;
        newDiv.textContent =
          'You have already visited this page using Medium Parser. Click here to visit again.';
        newDiv.href = newUrl;
        newDiv.setAttribute(
          'style',
          'padding:14px 25px; color:white; background: #242424; display:block; margin-top:10px;text-align:center;'
        );
        if (divNextToH1) {
          // Insert the new div after the selected div
          divNextToH1.parentNode.insertBefore(newDiv, divNextToH1.nextSibling);
        }
      }
    }
  }
}

// Show the links on the page
function displayMenuOptions(url) {
  // check if it is a page
  const root = document.getElementById('root');
  root.style.position = 'relative';

  if (checkValidURLAndShouldProceed(url)) {
    var leftDiv = document.createElement('div');
    leftDiv.id = 'medium-parser';
    leftDiv.setAttribute(
      'style',
      'position:absolute;z-index:1;top:150px;right:150px;'
    );

    let buttons = [];
    for (const [key, value] of Object.entries(urlOptions)) {
      // console.log(key, value);
      buttons.push(createButton(value.text, value.uri.replace('#{url}#', url)));
    }

    buttons.push(createMessageElement());

    buttons.forEach((button) => {
      leftDiv.appendChild(button);
    });

    root.appendChild(leftDiv); // A
  } else {
    // remove the element
    const el = document.getElementById('medium-parser');
    if (el != undefined || el != null) {
      el.remove();
    }
  }
}

// format google web-cache
function formatGoogleWebCache() {
  const contents = htmlDecode(
    document.querySelector('body > div > pre').innerHTML
  );
  const title = getTitle(contents);

  document.body.innerHTML = contents;
  document.title = 'Medium parser - ' + title;
}
// Decode HTML to tags
function htmlDecode(rawContent) {
  var entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  for (var prop in entities) {
    if (entities.hasOwnProperty(prop)) {
      rawContent = rawContent.replace(new RegExp(prop, 'g'), entities[prop]);
    }
  }
  return rawContent;
}
// get the page title
function getTitle(rawContent) {
  start = '<title data-rh="true">';
  end = '</title>';
  var startPos = rawContent.indexOf(start) + start.length;
  var endPos = rawContent.indexOf(end);
  return rawContent.substring(startPos, endPos).trim();
}
// Create the message element
function createMessageElement() {
  // old API
  messageEl = document.createElement('div');
  messageEl.innerHTML =
    'Iframe/gist/embeds are not loaded in the Google Cache proxy. For those, please use the Read-Medium/Archive proxy instead.';
  messageEl.setAttribute(
    'style',
    'padding:2px 4px; color:#242424; display:block; text-align:left;max-width: 212px;font-size: 0.83em;border: 1px solid black; margin-top:10px; position:relative;'
  );
  return messageEl;
}

function removeMessageEl(e) {
  e.target.parentNode.remove();
}

// create the button UI
function createButton(text, url) {
  btnEl = document.createElement('a');
  btnEl.href = url;
  btnEl.innerHTML = text;
  btnEl.setAttribute(
    'style',
    'padding:14px 25px; color:white; background: #242424; display:block; margin-top:10px;text-align:center;'
  );
  btnEl.setAttribute('target', '_blank');
  return btnEl;
}

// This function checks if the url is valid and should proceed
function checkValidURLAndShouldProceed(url) {
  let u = new URL(url);
  return (
    ignoreURLs.indexOf(u.pathname) == -1 &&
    checkWildCardPaths(u.pathname) == false &&
    checkUserProfile(u.pathname) == false &&
    u.pathname.split('/').filter((e) => e).length >= 1
  );
}

function checkWildCardPaths(currentPath) {
  let splittedCurrentPath = currentPath.split('/').filter((e) => e);
  const match = (url) => {
    return url.split('/').filter((e) => e)[0] == splittedCurrentPath[0];
  };
  return ignoreURLs.some(match);
}

function checkUserProfile(currentPath) {
  let splittedCurrentPath = currentPath.split('/').filter((e) => e);
  if (
    splittedCurrentPath[0].startsWith('@') &&
    splittedCurrentPath.length == 1
  ) {
    return true;
  }
  return false;
}

