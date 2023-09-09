/** @format */
alert("asdf");

console.log("Medium parser loaded");

// handle URL change
let previousUrl = "";
let observer = new MutationObserver(function (mutations) {
  if (location.href !== previousUrl) {
    previousUrl = location.href;
    console.log(`URL data changed to ${location.href}`);
    runScript(location.href);
    // your code here
  }
});

const config = { attributes: true, childList: true, subtree: true };
observer.observe(document, config);

// run the main script
function runScript(url) {
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
