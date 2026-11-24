// Ambient motion: custom cursor, marquee band, drifting stars, mouse parallax,
// letter-by-letter headings and magnetic buttons. Respects reduced motion.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var STAR = '<svg viewBox="-10 -10 20 20"><path d="M0 -10 Q1.4 -1.4 10 0 Q1.4 1.4 0 10 Q-1.4 1.4 -10 0 Q-1.4 -1.4 0 -10Z" fill="currentColor"/></svg>';

  if (reduce) return;

  // ---- marquee band under the hero; speeds up while you scroll ----
  var hero = document.querySelector(".hero");
  if (hero) {
    var words = ((window.PSWRLD_TEXT || {}).marquee || "Fashion, Music, DJs, Concerts, Events, Film, Creative Direction, Lookbooks")
      .split(",").map(function (w) { return w.trim().replace(/</g, "&lt;"); }).filter(Boolean);
    var chunk = words.map(function (w) { return "<span>" + w + "</span><i>" + STAR + "</i>"; }).join("");
    var band = document.createElement("div");
    band.className = "marquee";
    band.innerHTML = '<div class="mq-track">' + chunk + chunk + chunk + chunk + "</div>";
    hero.after(band);
    var track = band.firstChild, x = 0, lastY = scrollY, boost = 0;
    (function run() {
      var dy = scrollY - lastY; lastY = scrollY;
      boost = boost * 0.92 + Math.abs(dy) * 0.06;
      x -= 0.6 + boost;
      var half = track.scrollWidth / 2;
      if (-x > half) x += half;
      track.style.transform = "translateX(" + x + "px) skewX(" + Math.max(-12, -boost * 1.5) + "deg)";
      requestAnimationFrame(run);
    })();
  }

  // ---- starfield: big and small four-point stars plus speckles, behind the whole site ----
  var sky = document.createElement("div");
  sky.className = "drift";
  var html = "";
  var LITE = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  for (var i = 0; i < (LITE ? 14 : 34); i++) {
    var size = Math.random() < 0.18 ? 22 + Math.random() * 26 : 5 + Math.random() * 14;
    html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--s:' + size.toFixed(0) +
      'px;--d:' + (8 + Math.random() * 14).toFixed(1) + 's;--dl:' + (-Math.random() * 12).toFixed(1) + 's" data-depth="' + (0.2 + Math.random()).toFixed(2) + '">' + STAR + '</i>';
  }
  for (var j = 0; j < (LITE ? 45 : 160); j++) {
    html += '<b style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;--z:' + (1 + Math.random() * 1.8).toFixed(1) +
      'px;--d:' + (2 + Math.random() * 5).toFixed(1) + 's;--dl:' + (-Math.random() * 6).toFixed(1) + 's"></b>';
  }
  sky.innerHTML = html;
  document.body.prepend(sky);
  var layer = sky;
  if (hero) {
    var logo = hero.querySelector(".hero-logo");
    hero.addEventListener("pointermove", function (e) {
      var px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
      if (logo) logo.style.translate = (px * -18) + "px " + (py * -12) + "px";
      if (logo) logo.style.rotate = (px * 2) + "deg";
      layer.querySelectorAll("i").forEach(function (s) { var d = s.dataset.depth; s.style.translate = (px * 50 * d) + "px " + (py * 40 * d) + "px"; });
    });
    addEventListener("scroll", function () {
      var y = scrollY;
      if (y < innerHeight && logo) logo.style.scale = String(1 - y / innerHeight * 0.15);
    }, { passive: true });
  }

  // ---- big headings rise in letter by letter ----
  document.querySelectorAll(".section-head h2").forEach(function (h) {
    if (h.closest("[contenteditable]") || h.hasAttribute("contenteditable")) return;
    var text = h.textContent;
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split("").map(function (ch, i) {
      return '<span class="ch" aria-hidden="true" style="--i:' + i + '">' + (ch === " " ? "&nbsp;" : ch) + "</span>";
    }).join("");
    h.classList.add("split");
    new IntersectionObserver(function (en, io) {
      if (en[0].isIntersecting) { h.classList.add("go"); io.disconnect(); }
    }, { threshold: 0.4 }).observe(h);
  });
  // keep editable headings editable: restore plain text when edit mode starts
  new MutationObserver(function () {
    if (document.body.classList.contains("editing")) {
      document.querySelectorAll("h2.split").forEach(function (h) { h.textContent = h.getAttribute("aria-label"); h.classList.remove("split"); });
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  // ---- magnetic buttons and links ----
  if (fine) {
    document.querySelectorAll(".top nav a, .controls button, .contact-links a, .backlink").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.3) + "px " + ((e.clientY - r.top - r.height / 2) * 0.3) + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = ""; });
    });
  }
})();
