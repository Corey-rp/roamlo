// Light / dark mode toggle for all RoamLo pages

// 1. Pick the starting theme: the saved choice, or the device setting
var savedTheme = localStorage.getItem("roamlo-theme");
var deviceIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
var startTheme = savedTheme || (deviceIsDark ? "dark" : "light");

// 2. Apply it right away so the page doesn't flash white first
document.documentElement.setAttribute("data-theme", startTheme);

// 3. When the page has loaded, make the button work
document.addEventListener("DOMContentLoaded", function () {
  var button = document.querySelector(".theme-toggle");

  // Button text always says what clicking will do
  function updateButton(theme) {
    button.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  updateButton(startTheme);

  button.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("roamlo-theme", next);   // remember for next visit
    updateButton(next);
  });
});