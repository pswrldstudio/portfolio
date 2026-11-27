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
    var linkFor = window.PSWRLD_LINK || function () { return "#work"; };
    var chunk = words.map(function (w) {
      return '<a class="mq-link" href="' + linkFor(w) + '"><span>' + w + "</span></a><i>" + STAR + "</i>";
    }).join("");
    var band = document.createElement("div");
    band.className = "marquee";
    band.innerHTML = '<div class="mq-track">' + chunk + chunk + chunk + chunk + "</div>";
    hero.after(band);
    var track = band.firstChild, x = 0, lastY = scrollY, boost = 0, half = 0, seen = true, prevT = 0;
    function measureBand() { half = track.scrollWidth / 2; }   // measured once, not every frame (that was costly)
    measureBand(); addEventListener("resize", measureBand);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureBand);
    new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }).observe(band);
    // grab the band and drag / swipe / throw it either way (trackpad sideways scroll too); it carries on by itself after
    var drag = null, fling = 0, dragged = 0;
    band.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      drag = { id: e.pointerId, x0: e.clientX, sx: x, lx: e.clientX, lt: performance.now(), v: 0 }; dragged = 0; fling = 0;
      band.classList.add("grabbing");
    });
    addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var now = performance.now();
      drag.v = 0.7 * drag.v + 0.3 * ((e.clientX - drag.lx) / Math.max(1, now - drag.lt) * 16.7);   // px per frame
      drag.lx = e.clientX; drag.lt = now;
      dragged = Math.max(dragged, Math.abs(e.clientX - drag.x0));
      if (dragged > 6 && !band.hasPointerCapture(e.pointerId)) { try { band.setPointerCapture(e.pointerId); } catch (er) {} }
      x = drag.sx + (e.clientX - drag.x0);
    });
    function letGo(e) {
      if (!drag || e.pointerId !== drag.id) return;
      fling = performance.now() - drag.lt > 80 ? 0 : drag.v;
      drag = null; band.classList.remove("grabbing");
    }
    addEventListener("pointerup", letGo); addEventListener("pointercancel", letGo);
    band.addEventListener("click", function (e) {
      if (dragged > 6) { e.preventDefault(); e.stopPropagation(); return; }   // a drag isn't a click
      var a = e.target.closest && e.target.closest("a[href^='#']"), id = a && a.getAttribute("href").slice(1);
      if (!id || id === "films" || id === "roll") return;                    // camcorder / film roll handle themselves
      var t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();                                                     // glide to that part of the bookcase
      t.scrollIntoView({ behavior: "smooth", block: "start" });
      try { history.replaceState(history.state, "", "#" + id); } catch (er) {}
    }, true);
    band.addEventListener("dragstart", function (e) { e.preventDefault(); });
    band.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // only sideways scrolling moves it; up/down still scrolls the page
      e.preventDefault(); x -= e.deltaX; fling = 0;
    }, { passive: false });
    (function run(now) {
      requestAnimationFrame(run);
      if (!seen || document.hidden || document.body.classList.contains("album-open")) { lastY = scrollY; prevT = now; return; }
      var k = prevT ? Math.min(3, (now - prevT) / 16.7) : 1; prevT = now;   // same speed on 60 and 120 Hz screens
      var dy = scrollY - lastY; lastY = scrollY;
      boost = boost * 0.92 + Math.abs(dy) * 0.06;
      if (!drag) { x += fling * k - (0.6 + boost) * k; fling *= Math.pow(0.95, k); if (Math.abs(fling) < 0.05) fling = 0; }
      if (half) { while (-x > half) x += half; while (x > 0) x -= half; }   // loops seamlessly both ways
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0) skewX(" + Math.max(-12, -boost * 1.5).toFixed(2) + "deg)";
    })(0);
  }

  // ---- starfield: big and small four-point stars plus speckles, behind the whole site ----
  var sky = document.createElement("div");
  sky.className = "drift";
  var html = "";
  var LITE = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  for (var i = 0; i < (LITE ? 12 : 18); i++) {
    var size = Math.random() < 0.18 ? 22 + Math.random() * 26 : 5 + Math.random() * 14;
    html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--s:' + size.toFixed(0) +
      'px;--d:' + (3.5 + Math.random() * 5).toFixed(1) + 's;--dl:' + (-Math.random() * 6).toFixed(1) + 's" data-depth="' + (0.2 + Math.random()).toFixed(2) + '">' + STAR + '</i>';
  }
  for (var j = 0; j < (LITE ? 40 : 60); j++) {
    html += '<b style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;--z:' + (1 + Math.random() * 1.8).toFixed(1) +
      'px;--d:' + (2 + Math.random() * 5).toFixed(1) + 's;--dl:' + (-Math.random() * 6).toFixed(1) + 's"></b>';
  }
  sky.innerHTML = html;
  document.body.prepend(sky);
  var layer = sky;
  if (hero) {
    var logo = hero.querySelector(".hero-logo");
    var starEls = [].slice.call(layer.querySelectorAll("i")), mp = null;
    hero.addEventListener("pointermove", function (e) {
      var first = !mp;
      mp = e;
      if (!first) return;
      requestAnimationFrame(function () {                // at most once per frame
        var px = mp.clientX / innerWidth - 0.5, py = mp.clientY / innerHeight - 0.5; mp = null;
        if (logo) logo.style.translate = (px * -18) + "px " + (py * -12) + "px";
        if (logo) logo.style.rotate = (px * 2) + "deg";
        starEls.forEach(function (s) { var d = s.dataset.depth; s.style.translate = (px * 50 * d) + "px " + (py * 40 * d) + "px"; });
      });
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
