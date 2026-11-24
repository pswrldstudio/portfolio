// Home page: builds the shelf of closed albums from albums.js
(function () {
  var data = (window.PSWRLD && window.PSWRLD.albums) || [];
  var shelf = document.getElementById("shelf");
  document.getElementById("yr").textContent = new Date().getFullYear();

  // site text from content.js (edited with tools/edit_site.py)
  var T = window.PSWRLD_TEXT || {};
  document.querySelectorAll("[data-edit]").forEach(function (el) {
    var v = T[el.dataset.edit];
    if (v) { el.textContent = v; el.classList.remove("todo"); }
    if (el.hasAttribute("data-mailto") && v) el.href = "mailto:" + v.trim();
  });
  document.querySelectorAll("[data-link]").forEach(function (el) {
    var v = T[el.dataset.link];
    if (v) { el.href = v; el.target = "_blank"; el.rel = "noopener"; }
  });
  document.querySelectorAll("[data-edit-list]").forEach(function (ul) {
    var v = T[ul.dataset.editList];
    if (v) ul.innerHTML = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean)
      .map(function (x) { return "<li>" + x.replace(/</g, "&lt;") + "</li>"; }).join("");
  });

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }


  // text size / alignment / position chosen in the editor ("style_<key>" in content.js)
  function applyTextStyles(T) {
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      var raw = T["style_" + el.dataset.edit];
      if (!raw) return;
      try { var st = JSON.parse(raw); } catch (e) { return; }
      el.dataset.st = raw;
      if (st.z && st.z !== 1) el.style.zoom = st.z;
      if (st.a) { el.style.textAlign = st.a; if (getComputedStyle(el).display === "inline") el.style.display = "inline-block"; }
      if (st.x || st.y) { el.style.position = el.style.position || "relative"; el.style.translate = (st.x || 0) + "px " + (st.y || 0) + "px"; }
    });
  }
  applyTextStyles(T);
  // the bookshelf itself is built by js/shelf.js

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.transitionDelay = (el.classList.contains("bk") ? (i % 4) * 80 : 0) + "ms";
    io.observe(el);
  });
})();
