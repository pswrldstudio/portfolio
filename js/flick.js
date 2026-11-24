// Open-book flick-through (Paper-app style sketchbook).
// The book lies fully open: two flat pages side by side. The other pages fan out as
// slivers off the outer edges. Drag / flick / swipe turns pages around the spine;
// arrow keys, trackpad scroll and the buttons work too.
(function () {
  var albums = (window.PSWRLD && window.PSWRLD.albums) || [];
  var stage = document.getElementById("stage");
  if (!stage) return;
  if (!stage.dataset.album) { // album page: apply edited page text
    var PT = window.PSWRLD_TEXT || {};
    document.querySelectorAll("[data-edit]").forEach(function (el) { if (PT[el.dataset.edit]) el.textContent = PT[el.dataset.edit]; });
    applyTextStyles(PT);
  }
  var embedded = !!stage.dataset.album;
  var slug = stage.dataset.album || new URLSearchParams(location.search).get("a");
  var album = albums.find(function (a) { return a.slug === slug; }) || albums.find(function (a) { return !a.featured; });
  if (!album) { stage.textContent = "No albums yet. Run tools/add_photos.py"; return; }
  window.PSWRLD_CURRENT = album;
  var others = albums.filter(function (a) { return !a.featured; });
  var nextAlbum = others[(others.indexOf(album) + 1) % others.length] || others[0];
  if (!embedded) {
    document.title = album.title + " | PSWRLD";
    var t = document.getElementById("albumTitle"); if (t) t.textContent = album.title;
  }

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
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // page shape follows the album's photos so they fill the page with little cropping
  var ratios = album.photos.map(function (p) { return p.w / p.h; }).sort(function (a, b) { return a - b; });
  var aspect = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0.8;
  aspect = Math.min(1.25, Math.max(0.7, aspect));

  // ---- pages: cover, inside title, photos, end, (blank), back cover ----
  var coverImg = album.cover || (album.photos[0] && album.photos[0].src) || "";
  var pages = [{ kind: "cover" }, { kind: "intro" }];
  if (album.photos.length) album.photos.forEach(function (p, i) { pages.push({ kind: "photo", p: p, n: i + 1 }); });
  else for (var k = 1; k <= (album.featured ? 12 : 8); k++) pages.push({ kind: "placeholder", n: k });
  pages.push({ kind: "end" });
  if (pages.length % 2 === 0) pages.push({ kind: "blank" });
  pages.push({ kind: "backcover" });

  function pageHTML(pg) {
    switch (pg.kind) {
      case "cover":
        return (coverImg ? '<img class="fill" alt="" src="' + esc(coverImg) + '" draggable="false">' : '<div class="fill cloth"></div>') +
          '<div class="spine"></div><div class="cover-text"><span>PSWRLD</span><b>' + esc(album.title) + '</b>' +
          (album.year ? '<span>' + esc(album.year) + '</span>' : '') + '</div>';
      case "intro":
        return '<div class="introleaf"><h1>' + esc(album.title) + '</h1><p>' + esc(album.subtitle || "Photographed by PSWRLD") +
          (album.year ? " &middot; " + esc(album.year) : "") + '</p>' +
          (album.description ? '<div class="concept">' + esc(album.description) + '</div>' : '') + '</div>';
      case "photo":
        return '<img class="fill" alt="' + esc(album.title) + ' ' + pg.n + '" data-src="' + esc(pg.p.src) + '" draggable="false">';
      case "placeholder":
        return '<div class="ph"><b>' + String(pg.n).padStart(2, "0") + '</b>Placeholder<br>your photo goes here</div>';
      case "end":
        return '<div class="endleaf"><img src="assets/pswrld-mark-white.svg" alt="PSWRLD">' +
          (embedded ? '<a href="#work" data-nav>See all albums</a>'
                    : '<a href="album.html?a=' + encodeURIComponent(nextAlbum.slug) + '" data-nav>Next: ' + esc(nextAlbum.title) + '</a>') + '</div>';
      case "backcover":
        return '<div class="fill cloth"></div><img class="backmark" src="assets/pswrld-mark-white.svg" alt="">';
      default:
        return "";
    }
  }

  var book = document.createElement("div");
  book.className = "obook";
  stage.appendChild(book);
  // Each page is a chain of thin strips so it can bend like paper while it turns.
  var STRIPS = 10;
  var n = pages.length / 2, sheets = [], stripsOf = [], bendOf = [];
  for (var s = 0; s < n; s++) {
    var el = document.createElement("div");
    el.className = "osheet";
    var fHTML = pageHTML(pages[2 * s]), bHTML = pageHTML(pages[2 * s + 1]);
    var fCls = "pg front-pg" + (s === 0 ? " is-cover" : ""), bCls = "pg back-pg" + (s === n - 1 ? " is-cover" : "");
    var parent = el, list = [];
    for (var i = 0; i < STRIPS; i++) {
      var st = document.createElement("div");
      st.className = "ostrip" + (i ? " nested" : "");
      st.innerHTML =
        '<div class="sf"><div class="' + fCls + '" style="left:calc(var(--W) * ' + (-i / STRIPS) + ')">' + fHTML + '</div><i class="lit"></i></div>' +
        '<div class="sf back"><div class="' + bCls + '" style="left:calc(var(--W) * ' + (-(STRIPS - 1 - i) / STRIPS) + ')">' + bHTML + '</div><i class="lit"></i></div>';
      parent.appendChild(st);
      parent = st;
      list.push(st);
    }
    book.appendChild(el);
    sheets.push(el); stripsOf.push(list); bendOf.push(null);
  }
  // bend: positive = page curls away from the reader, negative = edge lifts towards the left
  function bendSheet(j, B, light) {
    var key = B.toFixed(1) + "|" + light.toFixed(2);
    if (bendOf[j] === key) return;
    bendOf[j] = key;
    var list = stripsOf[j], tri = STRIPS * (STRIPS - 1) / 2;
    for (var i = 0; i < STRIPS; i++) {
      list[i].style.transform = i ? "rotateY(" + (B * i / tri).toFixed(2) + "deg)" : "";
      list[i].style.setProperty("--lit", (light * (0.35 + 0.65 * i / STRIPS)).toFixed(3));
    }
  }

  // ---- geometry ----
  var W, H, sliver;
  function measure() {
    var vw = stage.clientWidth, vh = stage.clientHeight, phone = vw < 760;
    W = Math.min(vw * (phone ? 0.485 : 0.455), vh * (phone ? 0.8 : 0.94) * aspect);
    H = W / aspect;
    sliver = Math.max(5, W * (phone ? 0.035 : 0.045));
    stage.style.setProperty("--W", W + "px");
    stage.style.setProperty("--H", H + "px");
  }

  var pos = embedded ? 1 : 0;   // turned sheets, continuous (0 = closed on the cover)
  var fan = 0;   // 0 = pages squared up, 1 = fanned out
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var lastPos = 0, dir = 1;
  function place() {
    if (pos !== lastPos) dir = pos > lastPos ? 1 : -1;
    lastPos = pos;
    var shift = -W / 2 * (1 - clamp(pos, 0, 1)) + W / 2 * clamp(pos - (n - 1), 0, 1);
    book.style.transform = "translateX(" + shift.toFixed(1) + "px)";
    for (var j = 0; j < n; j++) {
      var t = clamp(pos - j, 0, 1), x = 0, ry = -180 * t, z, B = 0, light = 0, el = sheets[j];
      if (t <= 0) {            // still to come: fanned slivers off the right edge, gently curled
        var k = j - pos;
        x = k * sliver * fan; ry = Math.min(k * 4, 34) * fan; z = 100 + n - j;
        B = Math.min(k, 1) * 14 * fan; light = Math.min(k * 0.08, 0.3) * fan;
      } else if (t >= 1) {     // already seen: fanned off the left edge
        var k2 = pos - (j + 1);
        x = -k2 * sliver * fan; ry = -180 - Math.min(k2 * 4, 34) * fan; z = 100 + j;
        B = -Math.min(k2, 1) * 14 * fan; light = Math.min(k2 * 0.08, 0.3) * fan;
      } else {                 // the page in the air: it bends, the free edge leads
        var lift = Math.sin(Math.PI * t);
        B = -dir * 70 * lift;
        ry += dir * 26 * lift;
        light = 0.45 * lift; z = 1000;
      }
      el.style.transform = "translateX(" + x.toFixed(1) + "px) rotateY(" + ry.toFixed(2) + "deg)";
      el.style.zIndex = z;
      bendSheet(j, B, light);
      var far = Math.min(Math.abs(j - pos), Math.abs(j + 1 - pos));
      el.style.visibility = far > 16 ? "hidden" : "visible";
      if (far < 8) el.querySelectorAll("img[data-src]").forEach(function (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); });
    }
    var cur = Math.round(pos);
    if (counter) counter.textContent = cur === 0 ? "Cover" : cur === n ? "Back" : String(cur).padStart(2, "0") + " / " + String(n - 1).padStart(2, "0");
    if (prevBtn) prevBtn.disabled = cur <= 0;
    if (nextBtn) nextBtn.disabled = cur >= n;
  }

  // ---- animation ----
  var anim = null, tgt = 0, running = false;
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function animateTo(target, ms) {
    target = embedded ? clamp(target, 1, n - 1) : clamp(target, 0, n); tgt = target; running = true;
    var from = pos, start = performance.now();
    ms = ms || Math.min(1100, 520 + Math.abs(target - from) * 70);
    cancelAnimationFrame(anim);
    (function step(now) {
      var t = Math.min(1, (now - start) / ms);
      pos = from + (target - from) * ease(t);
      place();
      if (t < 1) anim = requestAnimationFrame(step); else running = false;
    })(start);
  }
  function go(d) { if (typeof clearPeel === "function") clearPeel(); hideHint(); animateTo((running ? tgt : Math.round(pos)) + d); }

  // ---- corner peel: lift any corner to peek at the next page before turning ----
  var peelLayer = document.createElement("div");
  peelLayer.className = "peel";
  peelLayer.innerHTML = '<div class="peel-under"></div><div class="peel-flapwrap"><div class="peel-flap"></div></div>';
  book.appendChild(peelLayer);
  var pUnder = peelLayer.querySelector(".peel-under"), pFlap = peelLayer.querySelector(".peel-flap");
  var peel = { on: false, held: false, side: 0, C: null, P: null, key: "" };
  function loaded(html) { return html.replace(/data-src=/g, "src="); }
  function atRest() { return !running && !dragging && fan > 0.99 && Math.abs(pos - Math.round(pos)) < 0.01; }
  function pageLocal(e, side) { // pointer in page coords (0..W, 0..H) of the right (1) or left (-1) page
    var r = book.getBoundingClientRect();
    return { x: e.clientX - r.left + (side < 0 ? W : 0), y: e.clientY - r.top + H / 2 };
  }
  function cornerHit(e, radius) {
    var cur = Math.round(pos), sides = [];
    if (cur < n) sides.push(1);
    if (cur > 0) sides.push(-1);
    for (var s = 0; s < sides.length; s++) {
      var side = sides[s], L = pageLocal(e, side), cx = side > 0 ? W : 0;
      var corners = [{ x: cx, y: 0 }, { x: cx, y: H }];
      for (var c = 0; c < 2; c++) {
        var C = corners[c];
        if (Math.hypot(L.x - C.x, L.y - C.y) < radius) return { side: side, C: C, L: L };
      }
    }
    return null;
  }
  function setupPeel(side, C) {
    var cur = Math.round(pos), key = side + ":" + cur;
    peel.side = side; peel.C = C;
    peelLayer.style.left = (side > 0 ? 0 : -W) + "px";
    if (peel.key !== key) {
      peel.key = key;
      var under = side > 0 ? (cur + 1 < n ? pages[2 * (cur + 1)] : null) : (cur - 2 >= 0 ? pages[2 * (cur - 2) + 1] : null);
      var flap = side > 0 ? pages[2 * cur + 1] : pages[2 * (cur - 1)];
      pUnder.innerHTML = under ? '<div class="pg ' + (side > 0 ? "front-pg" : "back-pg") + '" style="left:0">' + loaded(pageHTML(under)) + '</div>' : "";
      pFlap.innerHTML = '<div class="pg ' + (side > 0 ? "back-pg" : "front-pg") + '" style="left:0">' + loaded(pageHTML(flap)) + '</div><i class="peel-gloss"></i>';
    }
  }
  function clipRect(fn) { // page rectangle clipped to the half-plane fn(X) <= 0
    var R = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], out = [];
    for (var i = 0; i < 4; i++) {
      var a = R[i], b = R[(i + 1) % 4], fa = fn(a), fb = fn(b);
      if (fa <= 0) out.push(a);
      if ((fa < 0) !== (fb < 0)) { var t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
    }
    return out;
  }
  function poly(pts) { return "polygon(" + pts.map(function (p) { return p.x.toFixed(1) + "px " + p.y.toFixed(1) + "px"; }).join(",") + ")"; }
  function drawPeel(P) {
    var C = peel.C, A = { x: peel.side > 0 ? 0 : W, y: C.y };   // spine corner on the same edge
    var dA = Math.hypot(P.x - A.x, P.y - A.y);
    if (dA > W) P = { x: A.x + (P.x - A.x) * W / dA, y: A.y + (P.y - A.y) * W / dA }; // paper can't stretch
    var dx = P.x - C.x, dy = P.y - C.y, len = Math.hypot(dx, dy);
    peel.P = P;
    if (len < 2) { peelLayer.classList.remove("on"); return; }
    var nx = dx / len, ny = dy / len, md = ((C.x + P.x) / 2) * nx + ((C.y + P.y) / 2) * ny;
    var region = clipRect(function (X) { return X.x * nx + X.y * ny - md; });
    if (region.length < 3) { peelLayer.classList.remove("on"); return; }
    pUnder.style.clipPath = poly(region);
    // flap = the back of the page, mirrored and folded over the crease
    var a = -(1 - 2 * nx * nx), b = 2 * nx * ny, c = -2 * nx * ny, d = 1 - 2 * ny * ny;
    var e = W * (1 - 2 * nx * nx) + 2 * md * nx, f = -2 * nx * ny * W + 2 * md * ny;
    pFlap.style.transform = "matrix(" + [a, b, c, d, e, f].map(function (v) { return v.toFixed(4); }).join(",") + ")";
    pFlap.style.clipPath = poly(region.map(function (q) { return { x: W - q.x, y: q.y }; }));
    pFlap.style.setProperty("--lift", Math.min(1, len / W).toFixed(3));
    peelLayer.classList.add("on");
  }
  var peelAnim = null;
  function peelBack() {
    cancelAnimationFrame(peelAnim);
    if (!peel.P) { clearPeel(); return; }
    var from = peel.P, C = peel.C, start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / 260), k = ease(t);
      drawPeel({ x: from.x + (C.x - from.x) * k, y: from.y + (C.y - from.y) * k });
      if (t < 1) peelAnim = requestAnimationFrame(step); else clearPeel();
    })(start);
  }
  function clearPeel() { cancelAnimationFrame(peelAnim); peel.on = peel.held = false; peel.P = null; peelLayer.classList.remove("on"); }

  // ---- drag & flick ----
  var dragging = false, x0 = 0, p0 = 0, lastX = 0, lastT = 0, vel = 0, moved = 0;
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest("[data-nav]")) return;
    if (atRest() || peel.on) {   // grabbed a corner: peel it instead of flicking
      var hit = cornerHit(e, Math.min(W, H) * (e.pointerType === "mouse" ? 0.22 : 0.3));
      if (hit) {
        cancelAnimationFrame(peelAnim);
        setupPeel(hit.side, hit.C); peel.on = peel.held = true; drawPeel(hit.L);
        stage.setPointerCapture(e.pointerId); hideHint();
        return;
      }
    }
    clearPeel();
    dragging = true; moved = 0; x0 = lastX = e.clientX; p0 = pos; lastT = performance.now(); vel = 0;
    cancelAnimationFrame(anim); running = false;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (peel.held) { drawPeel(pageLocal(e, peel.side)); return; }
    if (!dragging) {             // mouse hover near a corner lifts it a little
      if (e.pointerType !== "mouse" || !atRest()) return;
      var hit = cornerHit(e, Math.min(W, H) * 0.22);
      if (hit) { cancelAnimationFrame(peelAnim); setupPeel(hit.side, hit.C); peel.on = true; drawPeel(hit.L); }
      else if (peel.on) peelBack();
      return;
    }
    var now = performance.now(), dx = e.clientX - x0;
    moved = Math.max(moved, Math.abs(dx));
    pos = clamp(p0 - dx / (W * 1.1), -0.15, n + 0.15);
    vel = 0.8 * vel + 0.2 * ((e.clientX - lastX) / Math.max(1, now - lastT));
    lastX = e.clientX; lastT = now;
    place();
  });
  function release(e) {
    if (peel.held) {
      peel.held = false;
      var P = peel.P || peel.C, side = peel.side;
      var turned = side > 0 ? P.x < W * 0.45 : P.x > W * 0.55;
      if (turned) { clearPeel(); go(side > 0 ? 1 : -1); }
      else peelBack();
      return;
    }
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      var r = stage.getBoundingClientRect();
      go(pos < 0.5 || e.clientX > r.left + r.width / 2 ? 1 : -1);
      return;
    }
    hideHint();
    var throwPages = -vel * 240 / (W * 1.1);
    var target = Math.abs(throwPages) < 0.35 ? Math.round(pos) : (throwPages > 0 ? Math.ceil(pos + throwPages) : Math.floor(pos + throwPages));
    animateTo(target, Math.min(1300, 480 + Math.abs(target - pos) * 110));
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("pointerleave", function (e) { if (!peel.held && peel.on && e.pointerType === "mouse") peelBack(); });

  var wheelT = null;
  stage.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); cancelAnimationFrame(anim); running = false;
    pos = clamp(pos + e.deltaX / (W * 1.1), 0, n);
    place(); hideHint();
    clearTimeout(wheelT); wheelT = setTimeout(function () { animateTo(Math.round(pos), 320); }, 120);
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("[contenteditable], input, textarea")) return;
    if (embedded) { var r = stage.getBoundingClientRect(); if (r.bottom < 80 || r.top > innerHeight - 80) return; }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "Escape" && !embedded) location.href = "index.html#work";
  });

  var counter = document.getElementById("count"), prevBtn = document.getElementById("prev"), nextBtn = document.getElementById("next");
  var hint = document.getElementById("hint");
  function hideHint() { if (hint) hint.classList.add("gone"); }
  if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });
  window.addEventListener("resize", function () { measure(); place(); });
  // the Favourites book on the home page stays open and flicks through by itself
  var auto = null, idle = null, hovering = false;
  function startAuto() {
    if (!embedded || auto) return;
    auto = setInterval(function () {
      if (dragging || peel.held || document.hidden) return;   // only pauses while you're holding a page
      if (Math.round(pos) >= n - 1) animateTo(1, 1600); else go(1);
    }, 2800);
  }
  function stopAuto() { clearInterval(auto); auto = null; }
  if (embedded) {
    stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
    stage.addEventListener("pointerleave", function () { hovering = false; });
    stage.addEventListener("pointerdown", function () {   // you took over: pause, resume after a while
      stopAuto(); clearTimeout(idle); idle = setTimeout(startAuto, 2500);
    });
  }

  measure(); place();

  // when the book comes into view: pages fan out, then the cover opens all the way
  function intro() {
    var start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / 900);
      fan = ease(t); place();
      if (t < 1) requestAnimationFrame(step);
      else if (pos === 0) setTimeout(function () { animateTo(1, 1000); setTimeout(startAuto, 1200); }, 150);
      else startAuto();
    })(start);
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { fan = 1; pos = 1; place(); }
  else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); setTimeout(intro, 300); }
    }, { threshold: 0.4 });
    io.observe(stage);
  } else { fan = 1; place(); }
})();
