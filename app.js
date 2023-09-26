/** @format */
console.log("Medium parser loaded");

function init() {
  if (checkIfGoogleWebCache()) {
    formatGoogleWebCache();
  }

  checkIfItIsMediumBlog();
}

init();

// checks if the page is google web cache and referred by this extension
function checkIfGoogleWebCache() {
  console.log(
    "Checking if this site is google webcache and referred by medium-parser extension"
  );
  const url = new URL(document.URL);

  if (
    url.hostname == "webcache.googleusercontent.com" &&
    url.searchParams.has("referer", "medium-parser") &&
    url.searchParams.has("vwsrc", "1")
  ) {
    console.log("Hooray !!! It is referred by medium-parser extension");
    return true;
  }
  console.log("Nah !!! It is not referred by medium-parser extension");
  return false;
}

// if it is a medium blog then run the script
function checkIfItIsMediumBlog() {
  const e = /https?:\/\/cdn-(?:static|client)(?:-\d)?\.medium\.com\//;
  [...document.querySelectorAll("script")].filter((r) => e.test(r.src)).length >
    0 || e.test(window.location.hostname)
    ? console.log("Is a medium blog !", handleURLChange())
    : console.log("Not a medium blog :( ");
}

// handle URL change
function handleURLChange() {
  let previousUrl = "";
  let observer = new MutationObserver(function (mutations) {
    if (window.location.href !== previousUrl) {
      previousUrl = window.location.href;
      console.log(`URL data changed to ${window.location.href}`);
      runMedium(location.href);
    }
  });

  const config = { attributes: true, childList: true, subtree: true };
  observer.observe(document, config);
}

function runMedium(url) {
  //   check the url
  const u = new URL(url);

  // check if it is a page
  const root = document.getElementById("root");
  root.style.position = "relative";

  if (u.pathname.split("/").filter((e) => e).length >= 1) {
    // get the title

    var leftDiv = document.createElement("div"); //Create left div
    leftDiv.id = "medium-parser"; //Assign div id
    leftDiv.setAttribute(
      "style",
      "position:absolute;z-index:9999999;top:150px;right:150px;"
    ); //Set div attributes
    a = document.createElement("a");
    a.href = `http://webcache.googleusercontent.com/search?q=cache:${url}&strip=0&vwsrc=1&referer=medium-parser`; // Instead of calling setAttribute
    a.innerHTML = "Read full article"; // <a>INNER_TEXT</a>
    a.setAttribute(
      "style",
      "padding:10px 25px; color:white; background: #2c3e50; display:block;"
    ); //Set div attributes
    a.setAttribute("target", "_blank"); //Set div attributes

    leftDiv.appendChild(a); // Append the link to the div
    root.appendChild(leftDiv); // A
  } else {
    // remove the element
    const el = document.getElementById("medium-parser");

    if (el != undefined || el != null) {
      el.remove();
    }
  }
}

// run the main script
function runMediumScript(url) {
  //   check the url
  const u = new URL(url);
  // console.log(u);
  // check if it is a page
  const root = document.getElementById("root");
  root.style.position = "relative";

  if (u.pathname.split("/").filter((e) => e).length >= 1) {
    var leftDiv = document.createElement("div"); //Create left div
    leftDiv.id = "medium-parser"; //Assign div id
    leftDiv.setAttribute(
      "style",
      "position:absolute;z-index:9999999;top:150px;right:150px;"
    ); //Set div attributes
    a = document.createElement("a");
    a.href = `https://medium-parser.vercel.app/?url=${url}`; // Instead of calling setAttribute
    a.innerHTML = "Read full article"; // <a>INNER_TEXT</a>
    a.setAttribute(
      "style",
      "padding:10px 25px; color:white; background: #2c3e50; display:inline-block;"
    ); //Set div attributes
    a.setAttribute("target", "_blank"); //Set div attributes
    leftDiv.appendChild(a); // Append the link to the div
    root.appendChild(leftDiv); // A
  } else {
    // remove the element
    const el = document.getElementById("medium-parser");

    if (el != undefined || el != null) {
      el.remove();
    }
  }
}

// format google webcache
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
