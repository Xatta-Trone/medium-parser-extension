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

checkIfItIsMediumBlog();

// if it is a medium blog then run the script
function checkIfItIsMediumBlog() {
  const e = /https?:\/\/cdn-(?:static|client)(?:-\d)?\.medium\.com\//;

  const host = window.location.hostname;
  const isMediumHost = host === 'medium.com' || host.endsWith('.medium.com');
  // Medium adds this tag to every page, including custom-domain publications
  const hasMediumMeta = !!document.querySelector(
    'meta[property="al:android:package"][content="com.medium.reader"]'
  );
  const hasMediumScript = [...document.querySelectorAll('script')].some((r) =>
    e.test(r.src)
  );

  if (isMediumHost || hasMediumMeta || hasMediumScript) {
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

  // redraw the on-page panel when the service list changes in the options
  onSettingsChanged(function () {
    loadSettings().then(function (settings) {
      displayMenuOptions(
        location.href,
        settings.showOption == 'page' ? enabledServices(settings) : []
      );
    });
  });
}

function runMedium(url) {
  loadSettings().then(function (settings) {
    if (settings.showOption == 'page') {
      displayMenuOptions(url, enabledServices(settings));
    }

    if (settings.showOption == 'redirect') {
      handleRedirect(settings.redirectOption, url, settings.openInNewTab);
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
    let newUrl = buildServiceUrl(redirectOption, url);
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
function displayMenuOptions(
  url,
  services = enabledServices(normalizeSettings())
) {
  // check if it is a page
  const root = document.getElementById('root') || document.body;
  if (!root) {
    return;
  }

  // remove any panel from a previous page or settings change
  const existing = document.getElementById('medium-parser');
  if (existing) {
    existing.remove();
  }

  if (checkValidURLAndShouldProceed(url) && services.length > 0) {
    var leftDiv = document.createElement('div');
    leftDiv.id = 'medium-parser';
    leftDiv.setAttribute(
      'style',
      'position:fixed;z-index:2147483647;top:120px;right:24px;'
    );

    let buttons = [];
    for (const service of services) {
      buttons.push(createButton(service.text, buildServiceUrl(service.key, url)));
    }

    buttons.forEach((button) => {
      leftDiv.appendChild(button);
    });

    root.appendChild(leftDiv);
  }
}

// create the button UI
function createButton(text, url) {
  const btnEl = document.createElement('a');
  btnEl.href = url;
  btnEl.textContent = text;
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
    splittedCurrentPath.length == 1 &&
    splittedCurrentPath[0].startsWith('@')
  ) {
    return true;
  }
  return false;
}
