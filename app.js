/** @format */
// console.log("Medium parser loaded");

const ignoreURLs = [
  "/me/lists",
  "/me/lists/saved",
  "/me/list/highlights",
  "/me/lists/reading-history",
  "/me/stories/public",
  "/me/stories/responses",
  "/me/stories/drafts",
  "/me/stats",
  "/me/settings",
  "/me/following",
  "/me/settings",
  "/me/settings/publishing",
  "/me/settings/notifications",
  "/me/settings/membership",
  "/me/settings/security",
  "/me/notifications",
  "/plans",
  "/mastodon",
  "/verified-authors",
  "/partner-program",
  "/gift-plans",
  "/new-story",
  "/m/signin",
];

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

  if (
    url.hostname == "webcache.googleusercontent.com" &&
    url.searchParams.has("referer", "medium-parser") &&
    url.searchParams.has("vwsrc", "1")
  ) {
    // console.log("Hooray !!! It is referred by medium-parser extension");
    return true;
  }
  // console.log("Nah !!! It is not referred by medium-parser extension");
  return false;
}

// if it is a medium blog then run the script
function checkIfItIsMediumBlog() {
  const e = /https?:\/\/cdn-(?:static|client)(?:-\d)?\.medium\.com\//;

  if (
    [...document.querySelectorAll("script")].filter((r) => e.test(r.src))
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
  let previousUrl = "";
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
  // check the url
  const u = new URL(url);

  // check if it is a page
  const root = document.getElementById("root");
  root.style.position = "relative";

  if (
    ignoreURLs.indexOf(u.pathname) == -1 &&
    u.pathname.split("/").filter((e) => e).length >= 1
  ) {
    var leftDiv = document.createElement("div");
    leftDiv.id = "medium-parser";
    leftDiv.setAttribute(
      "style",
      "position:absolute;z-index:1;top:150px;right:150px;"
    );

    let buttons = [
      createButton(
        "Open in Google Cache",
        `http://webcache.googleusercontent.com/search?q=cache:${url}&strip=0&vwsrc=1&referer=medium-parser`
      ),
      createButton("Open in Read-Medium", `https://readmedium.com/en/${url}`),
      createButton("Open in Freedium", `https://freedium.cfd/${url}`),
      createButton(
        "Open in Archive",
        `https://archive.today?url=${url}&run=1&referer=medium-parser`
      ),
      createButton(
        "Open in Proxy API",
        `https://medium-parser.vercel.app/?url=${url}`
      ),
      createMessageElement(),
      createSupportElement(),
    ];

    messageEl = createMessageElement();

    buttons.forEach((button) => {
      leftDiv.appendChild(button);
    });

    root.appendChild(leftDiv); // A
  } else {
    // remove the element
    const el = document.getElementById("medium-parser");

    if (el != undefined || el != null) {
      el.remove();
    }
  }
}

// format google web-cache
function formatGoogleWebCache() {
  const contents = htmlDecode(
    document.querySelector("body > div > pre").innerHTML
  );
  const title = getTitle(contents);

  document.body.innerHTML = contents;
  document.title = "Medium parser - " + title;
}

function htmlDecode(rawContent) {
  var entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  for (var prop in entities) {
    if (entities.hasOwnProperty(prop)) {
      rawContent = rawContent.replace(new RegExp(prop, "g"), entities[prop]);
    }
  }
  return rawContent;
}

function getTitle(rawContent) {
  start = '<title data-rh="true">';
  end = "</title>";
  var startPos = rawContent.indexOf(start) + start.length;
  var endPos = rawContent.indexOf(end);
  return rawContent.substring(startPos, endPos).trim();
}

function createMessageElement() {
  // old API
  messageEl = document.createElement("div");
  messageEl.innerHTML =
    "Iframe/gist/embeds are not loaded in the Google Cache proxy. For those, please use the Read-Medium/Archive proxy instead.";
  messageEl.setAttribute(
    "style",
    "padding:2px 4px; color:#242424; display:block; text-align:left;max-width: 212px;font-size: 0.83em;border: 1px solid black; margin-top:10px; position:relative;"
  );
  return messageEl;
}

function createSupportElement() {
  btnEl = document.createElement("div");
  btnEl.innerHTML =
    "Having an issue ? <a href='https://github.com/Xatta-Trone/medium-parser-extension/issues/new' target='_blank' style='color: #ff4757;text-decoration: underline;'>Open a ticket</a>";
  btnEl.setAttribute(
    "style",
    "padding:2px 4px; color:#242424; display:block; text-align:left;max-width: 212px;font-size: 0.83em; margin-top:10px; position:relative;"
  );
  return btnEl;
}

function removeMessageEl(e) {
  e.target.parentNode.remove();
}

// create the button UI
function createButton(text, url) {
  btnEl = document.createElement("a");
  btnEl.href = url;
  btnEl.innerHTML = text;
  btnEl.setAttribute(
    "style",
    "padding:14px 25px; color:white; background: #242424; display:block; margin-top:10px;text-align:center;"
  );
  btnEl.setAttribute("target", "_blank");
  return btnEl;
}
