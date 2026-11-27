// Home page: builds the shelf of closed albums from albums.js
(function () {
  var data = (window.PSWRLD && window.PSWRLD.albums) || [];
  var shelf = document.getElementById("shelf");
  document.getElementById("yr").textContent = new Date().getFullYear();

  // words like "DJs" or "Film" link straight to the matching book
  window.PSWRLD_LINK = function (word) {
    var w = String(word).toLowerCase().replace(/&amp;/g, "&").trim();
    var hit = data.filter(function (a) { return !a.featured && !a.roll; }).find(function (a) {
      var t = a.title.toLowerCase();
      return w.length > 2 && (w.indexOf(t) > -1 || t.indexOf(w) > -1);
    });
    if (hit) return "album.html?a=" + encodeURIComponent(hit.slug);
    if (/creative|film|video|direct/.test(w)) return "#films";
    return "#work";
  };

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
  // (the skills under About are plain text bubbles, not links)
  // "#films" opens the camcorder
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#films"]');
    if (!a) return;
    e.preventDefault();
    var cam = document.querySelector(".cam");
    if (cam) { cam.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { cam.click(); }, 700); }
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
  // the email shrinks to fit the screen width (never cut off on phones)
  function fitEmail() {
    var e = document.querySelector(".contact-big");
    if (!e) return;
    e.style.fontSize = "";
    var ps = getComputedStyle(e.parentElement);
    var room = e.parentElement.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) - 4;
    var fs = parseFloat(getComputedStyle(e).fontSize), n = 0;
    while (e.scrollWidth > room && fs > 11 && n++ < 80) { fs -= 1; e.style.fontSize = fs + "px"; }
  }
  fitEmail();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitEmail);
  addEventListener("resize", fitEmail);
  // the bookshelf itself is built by js/shelf.js

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.transitionDelay = (el.classList.contains("bk") ? (i % 4) * 80 : 0) + "ms";
    io.observe(el);
  });
})();
