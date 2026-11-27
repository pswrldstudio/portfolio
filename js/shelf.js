// The bookshelf: every album is a book standing on a shelf, with the camcorder on top.
// Hover a book: it lifts as if someone picked it up. Click: it comes off the shelf and opens.
(function () {
  // books kept inside the flat "Archives" book on the bottom shelf instead of standing on the shelves
  var ARCH = (function () { try { return JSON.parse((window.PSWRLD_TEXT || {}).archive || "null") || ["graduations", "cover-art", "djs", "concerts", "celebrations"]; } catch (e) { return []; } })();
  var archived = ((window.PSWRLD && window.PSWRLD.albums) || []).filter(function (a) { return ARCH.indexOf(a.slug) > -1; })
    .sort(function (a, b) { return ARCH.indexOf(a.slug) - ARCH.indexOf(b.slug); });
  var data = ((window.PSWRLD && window.PSWRLD.albums) || []).filter(function (a) { return !a.featured && !a.roll && a.slug !== "film" && ARCH.indexOf(a.slug) < 0; });   // Film feeds the film roll
  var videos = (window.PSWRLD && window.PSWRLD.videos) || [];
  var TX = window.PSWRLD_TEXT || {};
  var root = document.getElementById("shelf");
  if (!root) return;
  // Hand-drawn vector camcorder (not a photo). Side view + lens-end view make a 3D object.
  var SIDE_SVG = '<svg class="cam-svg" viewBox="0 0 260 150" aria-hidden="true">' +
    '<defs><linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3b39"/><stop offset="1" stop-color="#141312"/></linearGradient></defs>' +
    '<rect x="40" y="40" width="190" height="80" rx="12" fill="url(#cb)" stroke="#57534f"/>' +
    '<rect x="70" y="20" width="110" height="26" rx="7" fill="#262524" stroke="#4a4846"/>' +
    '<rect x="2" y="48" width="44" height="30" rx="5" fill="#1a1918" stroke="#4a4846"/>' +
    '<rect x="8" y="54" width="22" height="18" rx="3" fill="#0a0a0a"/>' +
    '<rect x="222" y="52" width="38" height="56" rx="8" fill="#1d1c1b" stroke="#4a4846"/>' +
    '<circle class="cam-rec" cx="200" cy="54" r="4" fill="#e8322f"/>' +
    '<text x="188" y="114" fill="#8d8a85" font-family="Arial" font-size="7" letter-spacing="1">HI8</text>' +
    '<rect x="50" y="120" width="160" height="6" rx="3" fill="#0c0c0c"/></svg>';
  var FRONT_SVG = '<svg class="cam-svg" viewBox="0 0 90 150" aria-hidden="true">' +
    '<defs><radialGradient id="lens" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#7f93bd"/><stop offset=".35" stop-color="#1b2233"/><stop offset="1" stop-color="#050506"/></radialGradient></defs>' +
    '<rect x="4" y="44" width="82" height="72" rx="12" fill="#1d1c1b" stroke="#57534f"/>' +
    '<rect x="16" y="22" width="58" height="22" rx="6" fill="#262524" stroke="#4a4846"/>' +
    '<circle cx="45" cy="80" r="28" fill="#0c0c0c" stroke="#666" stroke-width="2"/>' +
    '<circle cx="45" cy="80" r="21" fill="url(#lens)"/>' +
    '<circle cx="38" cy="72" r="6" fill="#fff" opacity=".35"/><circle cx="54" cy="89" r="2.5" fill="#fff" opacity=".2"/></svg>';

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // ---- the books ----
  var books = data.map(function (a, i) {
    var h = hash(a.slug);
    var thick = Math.round(Math.max(6, Math.min(18, 5 + a.photos.length * 0.25)));   // more photos = thicker book
    var el = document.createElement("a");
    el.className = "bk bk-face";
    el.href = "album.html?a=" + encodeURIComponent(a.slug);
    el.dataset.slug = a.slug;
    el.dataset.cursor = "Open";
    el.dataset.w = 200; el.dataset.h = 250;
    el.style.setProperty("--t", thick + "px");
    el.style.setProperty("--tilt", ((h % 5) - 2) * 0.4 + "deg");
    el.innerHTML =
      '<div class="bk-body">' +
        '<div class="bk-cover"' + (a.cover ? ' style="background-image:url(\'' + esc(a.cover) + '\')"' : "") + '>' +
          '<div class="bk-top"><span>' + String(i + 1).padStart(2, "0") + '</span><span>' + esc(a.year) + '</span></div>' +
          '<b class="bk-name">' + esc(a.title) + '</b>' +
        '</div>' +
      '</div>' +
      '<span class="bk-tag">' + esc(a.title) + '<small>' + (a.photos.length ? a.photos.length + " photographs" : "coming soon") + '</small></span>';
    el.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || document.body.classList.contains("editing")) return;
      e.preventDefault();
      pullOut(el, a);
    });
    return el;
  });

  // ---- the camcorder on top of the case ----
  var cam = document.createElement("button");
  cam.className = "cam";
  cam.dataset.cursor = videos.length ? "Play" : "Tapes";
  cam.setAttribute("aria-label", "Open the videos");
  cam.innerHTML =
    '<div class="cam-3d">' +
      '<div class="cam-side">' + SIDE_SVG +
        '<div class="cam-flap"><div class="flap-out"></div><div class="flap-in"><div class="flap-screen"><i>' +
        (videos.length ? "PLAY &#9654;" : "NO TAPE") + '</i></div></div></div>' +
      '</div>' +
      '<div class="cam-front">' + FRONT_SVG + '</div>' +
    '</div>' +
    '<span class="cam-tag"><span data-edit="cam_label">' + esc(TX.cam_label || "Creative Directed") + '</span>' + (videos.length ? " &middot; " + videos.length : "") + '</span>';
  // idle -> hover: turns to face you -> click: side screen flips out, then the films open from it
  cam.addEventListener("click", function () {
    if (cam.classList.contains("open")) return;
    cam.classList.add("open");
    setTimeout(function () { openVHS(cam.querySelector(".flap-screen").getBoundingClientRect()); }, 900);
  });


  // ---- the film roll on top of the bookcase (left): pull the film out of it (or tap it) and the strip unrolls ----
  // It shows the Film book's photos (or an album marked "roll": true), so editing the Film book edits the roll too.
  var ALL = (window.PSWRLD && window.PSWRLD.albums) || [];
  var ROLL = ALL.find(function (a) { return a.roll; }) || ALL.find(function (a) { return a.slug === "film"; });
  var ROLL_SVG = '<svg class="roll-svg" viewBox="0 0 132 150" aria-hidden="true">' +
    '<defs><linearGradient id="rlBody" x1="0" x2="1"><stop offset="0" stop-color="#0d0d0d"/><stop offset=".45" stop-color="#3a3836"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>' +
    '<linearGradient id="rlMetal" x1="0" x2="1"><stop offset="0" stop-color="#6d6b68"/><stop offset=".4" stop-color="#e6e3de"/><stop offset="1" stop-color="#5d5b58"/></linearGradient>' +
    '<linearGradient id="rlLabel" x1="0" x2="1"><stop offset="0" stop-color="#8f3a17"/><stop offset=".42" stop-color="#f07a3d"/><stop offset="1" stop-color="#7a3012"/></linearGradient></defs>' +
    '<g class="roll-leader"><path d="M70 64 H116 Q128 64 128 76 V94 Q128 104 116 104 H70 Z" fill="#2b2622"/>' +
    '<path d="M70 64 H116 Q128 64 128 76 V94 Q128 104 116 104 H70 Z" fill="none" stroke="#4a423b" stroke-width="1"/>' +
    [76, 86, 96, 106].map(function (x) { return '<rect x="' + x + '" y="67" width="5" height="5" rx="1" fill="#0b0b0b"/><rect x="' + x + '" y="96" width="5" height="5" rx="1" fill="#0b0b0b"/>'; }).join("") +
    '<rect x="74" y="75" width="40" height="19" fill="#5a3b22" opacity=".55"/></g>' +
    '<rect x="44" y="3" width="22" height="12" rx="2" fill="url(#rlMetal)"/>' +
    '<path d="M48 4v10M52 4v10M56 4v10M60 4v10" stroke="#55524e" stroke-width="1"/>' +
    '<rect x="14" y="13" width="82" height="13" rx="3" fill="url(#rlMetal)"/>' +
    '<rect x="18" y="25" width="74" height="104" fill="url(#rlBody)"/>' +
    '<rect x="18" y="42" width="74" height="70" fill="url(#rlLabel)"/>' +
    '<text x="55" y="62" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="600" font-size="11" fill="#111">PSWRLD</text>' +
    '<text x="55" y="88" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="26" fill="#111">400</text>' +
    '<text x="55" y="104" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="1" fill="#111">36 EXP</text>' +
    '<rect x="14" y="127" width="82" height="13" rx="3" fill="url(#rlMetal)"/></svg>';
  var roll = document.createElement("button");
  roll.className = "roll";
  roll.dataset.cursor = "Pull";
  roll.setAttribute("aria-label", "Open the film roll");
  roll.innerHTML = ROLL_SVG + '<span class="roll-tag"><span data-edit="roll_label">' + esc(TX.roll_label || "Shot on Film") + '</span>' +
    (ROLL && ROLL.photos.length ? " &middot; " + ROLL.photos.length : "") + '</span>';
  if (!ROLL || !ROLL.photos.length) roll.style.display = "none";
  // grab the canister and pull sideways: the film comes out under your finger. Let go far enough and it unrolls.
  var pull = null;
  roll.addEventListener("pointerdown", function (e) {
    if (e.target.closest("[data-edit]") || !ROLL) return;
    var r = roll.querySelector(".roll-svg").getBoundingClientRect();
    pull = { id: e.pointerId, x: e.clientX, y: e.clientY, d: 0, r: r, el: null, axis: null };
    try { roll.setPointerCapture(e.pointerId); } catch (er) {}
  });
  roll.addEventListener("pointermove", function (e) {
    if (!pull || e.pointerId !== pull.id) return;
    var dx = e.clientX - pull.x, dy = e.clientY - pull.y;
    if (!pull.axis && Math.hypot(dx, dy) > 8) pull.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (pull.axis !== "x") return;
    pull.d = Math.max(0, dx);
    if (!pull.el) {                                   // the film strip leaves the canister's slot
      var h = pull.r.height * 0.3;
      pull.el = document.createElement("div");
      pull.el.className = "roll-pull";
      pull.el.style.cssText = "left:" + (pull.r.left + pull.r.width * 0.66) + "px;top:" + (pull.r.top + pull.r.height * 0.56 - h / 2) + "px;height:" + h + "px;--ph:" + h + "px";
      pull.el.innerHTML = '<div class="rp-film">' + ROLL.photos.slice(0, 14).map(function (p) {
        return '<img alt="" draggable="false" src="' + esc(p.md || p.src) + '">'; }).join("") + '</div>';
      document.body.appendChild(pull.el);
      roll.classList.add("pulling");
    }
    pull.el.style.width = (pull.d + pull.r.width * 0.32) + "px";
  });
  function letGoRoll(e) {
    if (!pull || e.pointerId !== pull.id) return;
    var p = pull; pull = null;
    if (p.axis === "x" && p.el) {
      if (p.d > Math.min(110, innerWidth * 0.18)) {   // pulled far enough: the whole roll unrolls
        p.el.classList.add("gone"); setTimeout(function () { p.el.remove(); roll.classList.remove("pulling"); }, 300);
        openRoll();
      } else {                                        // not far enough: it winds back in
        p.el.classList.add("back"); p.el.style.width = "0px";
        setTimeout(function () { p.el.remove(); roll.classList.remove("pulling"); }, 420);
      }
      roll._noTap = true; setTimeout(function () { roll._noTap = false; }, 50);
    } else if (!p.axis && !e.target.closest("[data-edit]") && ROLL && e.type === "pointerup") {
      roll._noTap = true; setTimeout(function () { roll._noTap = false; }, 50);
      openRoll();                                     // a plain tap opens it too
    }
  }
  roll.addEventListener("pointerup", letGoRoll);
  roll.addEventListener("pointercancel", letGoRoll);
  roll.addEventListener("click", function (e) { e.preventDefault(); });

  function fitStyle(f) {
    if (!f) return "";
    var x = f.x == null ? 50 : f.x, y = f.y == null ? 50 : f.y, k = f.s || 1;
    return "object-position:" + x + "% " + y + "%;transform-origin:" + x + "% " + y + "%" + (k !== 1 ? ";transform:scale(" + k + ")" : "");
  }
  window.PSWRLD_OPEN_ROLL = function () { if (ROLL && ROLL.photos.length) openRoll(); };
  function rollFits() { try { return JSON.parse((window.PSWRLD_TEXT || {}).rollfit || "{}"); } catch (e) { return {}; } }
  function openRoll() {
    var P = ROLL.photos, RF = rollFits();
    P.forEach(function (p) { if (RF[p.name]) p.rollfit = RF[p.name]; });
    var editing = location.port === "5190" && document.body.classList.contains("editing");
    function framesHTML() {
      return P.map(function (p, i) {
        var r = p.w / p.h, tall = r < 0.92, sq = !tall && r < 1.08;   // square covers get square frames
        return '<div class="rf' + (tall ? " tall" : sq ? " sq" : "") + '" role="button" tabindex="0" data-i="' + i + '"><span class="rf-n">' + (i + 1) + '</span><span class="rf-a">' + (i + 1) + 'A &#9656;</span>' +
          '<span class="rf-pic"><img alt="" draggable="false" loading="' + (i < 6 ? "eager" : "lazy") + '" src="' + esc(p.md || p.src) + '" style="' + fitStyle(p.rollfit) + '"></span>' +
          (editing ? '<span class="rf-del" title="Remove from the roll">&times;</span><span class="rf-adj' + (p.rollfit ? " on" : "") + '" title="Scale and move this photo in its frame">&#10530;</span>' : "") + '</div>';
      }).join("") +
        (editing ? '<label class="rf rf-add tall"><input type="file" accept="image/*" multiple hidden><b>+</b><span>Add photos</span><small>or drop them here</small></label>' : "") +
        '<i class="rv-end"></i>';
    }
    var frames = framesHTML();
    var box = document.createElement("div");
    box.className = "roll-view";
    box.innerHTML =
      '<div class="rv-head"><b>' + esc(ROLL.title) + '</b><span>' + P.length + ' frames &middot; drag, scroll or swipe</span></div>' +
      '<div class="rv-scroll"><div class="rv-can">' + ROLL_SVG + '</div><div class="rv-strip">' + frames + '</div></div>' +
      '<button class="rv-x" aria-label="Close">&times;</button>';
    document.body.appendChild(box);
    document.body.classList.add("roll-open");
    var sc = box.querySelector(".rv-scroll");
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add("on"); }); });   // the strip unrolls
    // mouse: grab and throw the strip; wheel scrolls it sideways (fingers scroll it natively)
    var drag = null, glide = 0, movedPx = 0;
    sc.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      if (editing && e.target.closest(".rf")) return;   // editor: frames are picked up to move them instead
      cancelAnimationFrame(glide);
      drag = { x: e.clientX, s: sc.scrollLeft, lx: e.clientX, lt: performance.now(), v: 0 }; movedPx = 0;
      sc.classList.add("grabbing");
    });
    function onMove(e) {
      if (!drag) return;
      var now = performance.now();
      drag.v = 0.7 * drag.v + 0.3 * ((drag.lx - e.clientX) / Math.max(1, now - drag.lt));
      drag.lx = e.clientX; drag.lt = now;
      movedPx = Math.max(movedPx, Math.abs(e.clientX - drag.x));
      sc.scrollLeft = drag.s - (e.clientX - drag.x);
    }
    function onUp() {
      if (!drag) return;
      var v = performance.now() - drag.lt > 80 ? 0 : drag.v; drag = null; sc.classList.remove("grabbing");
      var last = performance.now();
      (function step(now) {
        var dt = now - last; last = now;
        sc.scrollLeft += v * dt; v *= Math.pow(0.996, dt);
        if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step);
      })(last);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    sc.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); cancelAnimationFrame(glide); sc.scrollLeft += e.deltaY; }
    }, { passive: false });
    if (editing) rollEditor();
    sc.addEventListener("click", function (e) {
      if (e.target.closest(".rf-del, .rf-add, .rf-adj, .rf-bar, .adjusting")) return;
      var f = e.target.closest(".rf");
      if (!f || movedPx > 6) return;
      bigFrame(+f.dataset.i);
    });
    // ---- editor only: x removes a photo from the roll, + adds new ones (saved straight into the Film book) ----
    function rollEditor() {
      box.classList.add("rv-editing");
      var strip = box.querySelector(".rv-strip"), info = box.querySelector(".rv-head span");
      function say(t) { info.textContent = t; }
      say("Editing: drag frames to reorder · × removes · + adds");
      function post(url, body, type) {
        return fetch(url, { method: "POST", headers: { "Content-Type": type || "application/json" }, body: body })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
      }
      function refresh() {                           // fresh photo list after the editor rebuilt the site data
        return fetch("albums.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
          if (adjusting) finishAdjust(true);
          var a = d.albums.find(function (x) { return x.slug === ROLL.slug; }), RF2 = rollFits();
          if (a) { ROLL.photos = a.photos; P = a.photos; P.forEach(function (p) { if (RF2[p.name]) p.rollfit = RF2[p.name]; }); }
          strip.innerHTML = framesHTML(); wire();
          var tag = roll.querySelector(".roll-tag"); if (tag) tag.lastChild.textContent = " · " + P.length;
          say(P.length + " frames · drag to reorder · × removes · + adds");
        });
      }
      function addFiles(list) {
        var files = [].filter.call(list, function (f) { return /^image\//.test(f.type); });
        if (!files.length) return;
        var names = [], k = 0;
        (function next() {
          if (k >= files.length) {
            say("Saving...");
            return post("/api/album", JSON.stringify({ slug: ROLL.slug, order: P.map(function (p) { return p.name; }).concat(names) }))
              .then(refresh).then(function () { sc.scrollTo({ left: sc.scrollWidth, behavior: "smooth" }); })
              .catch(function (er) { say("Not saved: " + er.message); });
          }
          var f = files[k++];
          say("Uploading " + k + " of " + files.length + "...");
          post("/api/upload?album=" + encodeURIComponent(ROLL.slug) + "&name=" + encodeURIComponent(f.name), f, "application/octet-stream")
            .then(function (j) { names.push(j.name); next(); })
            .catch(function (er) { say("Not added: " + er.message); });
        })();
      }
      function wire() {
        strip.querySelectorAll(".rf-del").forEach(function (x) {
          x.addEventListener("click", function (e) {
            e.stopPropagation(); e.preventDefault();
            var p = P[+x.closest(".rf").dataset.i];
            var ask = window.PSWRLD_CONFIRM || function (q) { return Promise.resolve(confirm(q)); };
            ask("Remove this photo from the roll? It moves to albums/_removed/" + ROLL.slug + ", so you can bring it back.", "Remove").then(function (ok) {
              if (!ok) return;
              say("Removing...");
              post("/api/album", JSON.stringify({ slug: ROLL.slug, remove: [p.name], order: P.filter(function (q) { return q !== p; }).map(function (q) { return q.name; }) }))
                .then(refresh).catch(function (er) { say("Not removed: " + er.message); });
            });
          });
        });
        strip.querySelectorAll(".rf-adj").forEach(function (x) {   // scale / move the photo right here in its frame
          x.addEventListener("click", function (e) {
            e.stopPropagation(); e.preventDefault();
            var f = x.closest(".rf");
            if (adjusting && adjusting.f === f) finishAdjust(true); else startAdjust(f);
          });
        });
        // drag a frame along the strip to move it; the new order saves when you let go
        var moving = null;
        strip.querySelectorAll(".rf[data-i]").forEach(function (f) {
          f.draggable = true;
          f.addEventListener("dragstart", function (e) {
            if (f.classList.contains("adjusting")) { e.preventDefault(); return; }
            moving = f; f.classList.add("moving");
            e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", f.dataset.i);
          });
          f.addEventListener("dragover", function (e) {
            if (!moving || moving === f) return;
            e.preventDefault();
            var r = f.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
            if (after ? f.nextSibling !== moving : f.previousSibling !== moving) strip.insertBefore(moving, after ? f.nextSibling : f);
          });
          f.addEventListener("dragend", function () {
            if (!moving) return;
            moving.classList.remove("moving");
            var order = [].map.call(strip.querySelectorAll(".rf[data-i]"), function (x) { return P[+x.dataset.i].name; });
            moving = null;
            if (order.join("|") === P.map(function (p) { return p.name; }).join("|")) return;
            say("Saving the new order...");
            post("/api/album", JSON.stringify({ slug: ROLL.slug, order: order })).then(refresh)
              .catch(function (er) { say("Not saved: " + er.message); });
          });
        });
        var add = strip.querySelector(".rf-add");
        if (add) add.querySelector("input").onchange = function (e) { addFiles(e.target.files); e.target.value = ""; };
      }
      // ---- scaling a frame in place: scroll = scale, drag = move, Whole / Reset / Done ----
      var adjusting = null;
      function startAdjust(f) {
        if (adjusting) finishAdjust(true);
        var p = P[+f.dataset.i], o = p.rollfit || {}, fit = { s: o.s || 1, x: o.x == null ? 50 : o.x, y: o.y == null ? 50 : o.y };
        var img = f.querySelector("img");
        f.classList.add("adjusting"); f.draggable = false;
        var bar = document.createElement("div");
        bar.className = "rf-bar";
        bar.innerHTML = '<button data-a="whole">Whole</button><button data-a="reset">Reset</button>' +
          '<input type="range" min="30" max="300" aria-label="Scale"><em></em><button data-a="done" class="rf-done">Done</button>';
        f.appendChild(bar);
        var range = bar.querySelector("input"), pct = bar.querySelector("em");
        function paint() { img.setAttribute("style", fitStyle(fit)); range.value = Math.round(fit.s * 100); pct.textContent = Math.round(fit.s * 100) + "%"; }
        paint();
        say("Frame " + (+f.dataset.i + 1) + ": scroll to scale, drag to move, then Done");
        function wheel(e) { e.preventDefault(); e.stopPropagation(); fit.s = Math.max(0.3, Math.min(3, fit.s * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); paint(); }
        var drag = null;
        function down(e) {
          if (e.target.closest(".rf-bar, .rf-del, .rf-adj")) return;
          e.preventDefault(); e.stopPropagation();
          try { f.setPointerCapture(e.pointerId); } catch (er) {}
          drag = { x: e.clientX, y: e.clientY, fx: fit.x, fy: fit.y };
        }
        function move(e) {
          if (!drag) return;
          var k = (fit.s < 1 ? 1 : -1) * 100 / Math.max(0.35, Math.abs(fit.s - 1) < 0.02 ? 1 : fit.s);   // the photo follows the mouse
          fit.x = Math.max(0, Math.min(100, drag.fx + (e.clientX - drag.x) / f.offsetWidth * k));
          fit.y = Math.max(0, Math.min(100, drag.fy + (e.clientY - drag.y) / f.offsetHeight * k));
          paint();
        }
        function up() { drag = null; }
        f.addEventListener("wheel", wheel, { passive: false });
        f.addEventListener("pointerdown", down);
        f.addEventListener("pointermove", move);
        f.addEventListener("pointerup", up);
        range.addEventListener("input", function () { fit.s = range.value / 100; paint(); });
        bar.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        bar.addEventListener("click", function (e) {
          e.stopPropagation(); e.preventDefault();
          var a = e.target.dataset && e.target.dataset.a;
          if (a === "whole") {                            // the whole photo inside the frame, nothing cropped
            var fr = f.offsetWidth / f.offsetHeight, r = p.w / p.h;
            fit = { s: Math.min(r / fr, fr / r), x: 50, y: 50 }; paint();
          }
          if (a === "reset") { fit = { s: 1, x: 50, y: 50 }; paint(); }
          if (a === "done") finishAdjust(true);
        });
        adjusting = { f: f, p: p, fit: function () { return fit; }, bar: bar, off: function () {
          f.removeEventListener("wheel", wheel); f.removeEventListener("pointerdown", down);
          f.removeEventListener("pointermove", move); f.removeEventListener("pointerup", up);
        } };
      }
      function finishAdjust(save) {
        var a = adjusting; if (!a) return;
        adjusting = null; a.off(); a.bar.remove();
        a.f.classList.remove("adjusting"); a.f.draggable = true;
        if (!save) return;
        var fit = a.fit(), plain = Math.abs(fit.s - 1) < 0.005 && Math.abs(fit.x - 50) < 0.5 && Math.abs(fit.y - 50) < 0.5;
        a.p.rollfit = plain ? undefined : { s: +fit.s.toFixed(3), x: +fit.x.toFixed(1), y: +fit.y.toFixed(1) };
        a.f.querySelector(".rf-adj").classList.toggle("on", !plain);
        var map = rollFits();                           // saved with the site text, so it works with any editor
        if (a.p.rollfit) map[a.p.name] = a.p.rollfit; else delete map[a.p.name];
        var json = JSON.stringify(map);
        say("Saving...");
        post("/api/text", JSON.stringify({ rollfit: json })).then(function () {
          (window.PSWRLD_TEXT = window.PSWRLD_TEXT || {}).rollfit = json;
          say("Frame " + (+a.f.dataset.i + 1) + " saved \u2713");
        }).catch(function (er) { say("Not saved: " + er.message); });
      }
      box.addEventListener("pointerdown", function (e) {   // clicking off the frame finishes it
        if (adjusting && !e.target.closest(".adjusting")) finishAdjust(true);
      }, true);
      wire();
      sc.addEventListener("dragover", function (e) {
        var edge = 90, x = e.clientX;
        if (x < edge) sc.scrollLeft -= (edge - x) * 0.4; else if (x > innerWidth - edge) sc.scrollLeft += (x - innerWidth + edge) * 0.4;
      });
      strip.addEventListener("dragover", function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, "Files") > -1) { e.preventDefault(); strip.classList.add("over"); } });
      strip.addEventListener("dragleave", function () { strip.classList.remove("over"); });
      strip.addEventListener("drop", function (e) { e.preventDefault(); strip.classList.remove("over"); addFiles(e.dataTransfer.files); });
    }
    function close() {
      document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp);
      document.removeEventListener("keydown", key);
      box.classList.remove("on"); box.classList.add("off");
      setTimeout(function () { box.remove(); document.body.classList.remove("roll-open"); }, 450);
    }
    function key(e) { if (e.key === "Escape" && !box.querySelector(".rv-big")) close(); }
    document.addEventListener("keydown", key);
    box.querySelector(".rv-x").onclick = close;
    box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("rv-head")) close(); });

    // one frame big: arrows / swipe / keys to move along the roll
    function bigFrame(i) {
      var b = document.createElement("div");
      b.className = "rv-big";
      b.innerHTML = '<img alt=""><button class="rv-bx" aria-label="Close">&times;</button>' +
        '<button class="rv-bp" aria-label="Previous">&larr;</button><button class="rv-bn" aria-label="Next">&rarr;</button><span class="rv-bc"></span>';
      box.appendChild(b);
      var img = b.querySelector("img"), cnt = b.querySelector(".rv-bc");
      function show(k) {
        i = (k + P.length) % P.length;
        img.src = P[i].src; cnt.textContent = String(i + 1).padStart(2, "0") + " / " + String(P.length).padStart(2, "0");
        var f = sc.querySelector('.rf[data-i="' + i + '"]');      // the strip follows along underneath
        if (f) sc.scrollTo({ left: f.offsetLeft - (sc.clientWidth - f.offsetWidth) / 2, behavior: "smooth" });
      }
      function shut() { b.remove(); document.removeEventListener("keydown", k2, true); }
      function k2(e) {
        if (e.key === "Escape") shut(); else if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); else return;
        e.preventDefault(); e.stopPropagation();
      }
      document.addEventListener("keydown", k2, true);
      b.querySelector(".rv-bx").onclick = shut;
      b.querySelector(".rv-bp").onclick = function () { show(i - 1); };
      b.querySelector(".rv-bn").onclick = function () { show(i + 1); };
      b.addEventListener("click", function (e) { if (e.target === b) shut(); });
      var sx = null;
      b.addEventListener("pointerdown", function (e) { sx = e.clientX; });
      b.addEventListener("pointerup", function (e) { if (sx == null) return; var d = e.clientX - sx; sx = null; if (d < -50) show(i + 1); else if (d > 50) show(i - 1); });
      show(i);
    }
  }

  // ---- bottom shelf: About me, profile, contact and socials as bright type-only books ----
  var T = window.PSWRLD_TEXT || {};
  if (/^\d+ books?$/.test(T.ib_sub_archives || "")) T.ib_sub_archives = archived.length + " books";   // the count stays right
  var INFO = [
    { key: "instagram", lean: "r", label: "Instagram", sub: "Socials", color: "#f4ec5c", w: 50, h: 250, tilt: 0, href: T.instagram_url, open: "contact", kind: "tag" },
    { key: "profile", label: "Personal Profile", sub: "2026", color: "#d8b8f5", w: 74, h: 210, open: "about", kind: "profile" },
    { key: "works", label: "My Photo Works", sub: "PSWRLD", color: "#e9f0d8", w: 52, h: 300, href: "#work", kind: "serif" },
    { key: "about", label: "About Me", sub: "PSWRLD", color: "#f29be0", w: 66, h: 290, open: "about", kind: "big" },
    { key: "contact", lean: "l", label: "Contact", sub: "Bookings", color: "#9fc3f5", w: 70, h: 236, open: "contact", kind: "big" },
    { key: "tiktok", stack: true, label: "TikTok", sub: "Socials", color: "#e6f4dc", w: 50, h: 276, href: T.tiktok_url, open: "contact", kind: "serif" },
    { key: "year", stack: true, label: "2022–" + new Date().getFullYear(), sub: "PSWRLD", color: "#4fa85c", w: 50, h: 262, href: "#top", kind: "year" },
    { key: "archives", stack: true, label: "Archives", sub: archived.length + " books", color: "#e8c27a", w: 54, h: 270, href: "#archives", kind: "serif", archive: true }
  ];
  var infoBooks = INFO.map(function (b) {
    var el = document.createElement("a");
    el.className = "bk ib ib-" + b.kind + (b.lean ? " lean-" + b.lean : "") + (b.stack ? " lying" : "");
    el.href = b.href || "#" + (b.open || "top");
    if (b.href && /^https?:/.test(b.href)) { el.target = "_blank"; el.rel = "noopener"; }
    el.dataset.cursor = b.open ? "Read" : "Go";
    el.dataset.w = b.w; el.dataset.h = b.h;
    el.style.setProperty("--tilt", (b.tilt || 0) + "deg");
    el.style.setProperty("--c", T["ib_color_" + b.key] || b.color);
    var icon = b.kind === "profile" ? '<i class="ib-clock"></i>' : b.kind === "tag" ? '<i class="ib-arrows">&#8645;</i>' : '<img class="ib-ring ib-mark" src="assets/pswrld-mark-black.svg" alt="">';
    el.innerHTML = '<div class="bk-body"><div class="ib-spine">' +
      '<span class="ib-sub" data-edit="ib_sub_' + b.key + '">' + esc(T["ib_sub_" + b.key] || b.sub) + '</span>' + icon +
      '<span class="ib-label" data-edit="ib_label_' + b.key + '">' + esc(T["ib_label_" + b.key] || b.label) + '</span>' +
      '<span class="ib-foot">PSWRLD</span></div></div>';
    if (b.archive) {                                  // opens the archive: its books laid out 2 x 2
      el.dataset.cursor = "Open";
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (document.body.classList.contains("editing") && e.target.closest("[data-edit]")) return;
        openArchive();
      });
    }
    if (b.open && !(b.href && /^https?:/.test(b.href))) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (document.body.classList.contains("editing")) return;
        openDrawer(b.open);
      });
    }
    return el;
  });

  // ---- the Archives book: pick one of the archived books from a 2 x 2 spread ----
  function openArchive() {
    if (!archived.length) return;
    var box = document.createElement("div");
    box.className = "archive-view";
    box.innerHTML = '<div class="av-head"><b>' + esc(T.ib_label_archives || "Archives") + '</b><span>' + archived.length + ' books</span></div>' +
      '<div class="av-grid" style="--cols:' + (archived.length > 4 ? 3 : 2) + ';--rows:' + Math.ceil(archived.length / (archived.length > 4 ? 3 : 2)) + '">' + archived.map(function (a, i) {
        return '<a class="av-book" href="album.html?a=' + encodeURIComponent(a.slug) + '" data-i="' + i + '" style="--d:' + (i * 70) + 'ms">' +
          '<span class="av-cover"' + (a.cover ? ' style="background-image:url(&quot;' + esc(a.cover) + '&quot;)"' : "") + '></span>' +
          '<span class="av-name">' + esc(a.title) + '</span><small>' + (a.year ? esc(a.year) + " &middot; " : "") + a.photos.length + ' photos</small></a>';
      }).join("") + '</div><button class="av-x" aria-label="Close">&times;</button>';
    document.body.appendChild(box);
    document.body.classList.add("archive-open");
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add("on"); }); });
    function close() {
      box.classList.remove("on");
      document.removeEventListener("keydown", key);
      setTimeout(function () { box.remove(); document.body.classList.remove("archive-open"); }, 350);
    }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    box.querySelector(".av-x").onclick = close;
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("av-grid")) return close();
      var bk = e.target.closest(".av-book");
      if (!bk || e.metaKey || e.ctrlKey || document.body.classList.contains("editing")) return;   // the editor opens the book page
      e.preventDefault();
      var a = archived[+bk.dataset.i];
      close();
      setTimeout(function () { openInPage(a); }, 250);   // the book opens on the page, music keeps going
    });
  }

  // About and Contact open as panels over the page
  function openDrawer(id) {
    var d = document.getElementById(id);
    if (!d) return;
    d.scrollIntoView({ behavior: "smooth", block: "start" });   // About / Contact live under the bookcase
    d.classList.add("flash"); setTimeout(function () { d.classList.remove("flash"); }, 1600);
    return;
    d.classList.add("drawer", "open");
    document.body.classList.add("drawer-open");
    if (!d.querySelector(".drawer-x")) {
      var x = document.createElement("button");
      x.className = "drawer-x"; x.innerHTML = "&times;"; x.setAttribute("aria-label", "Close");
      x.onclick = function () { closeDrawer(d); };
      d.appendChild(x);
      d.addEventListener("click", function (e) { if (e.target === d) closeDrawer(d); });
    }
  }
  function closeDrawer(d) { d.classList.remove("open"); document.body.classList.remove("drawer-open"); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") document.querySelectorAll(".drawer.open").forEach(closeDrawer); });
  ["about", "contact"].forEach(function (id) {
    var sec = document.getElementById(id);
    // (sections stay on the page)
    document.querySelectorAll('a[href="#' + id + '"]').forEach(function (a) {
      if (a.closest(".bk")) return;
      // normal anchor scroll
    });
  });

  // ---- the bookcase is split into sections; each book belongs to one (set by dragging in the editor) ----
  var CATS = [
    { key: "editorials", title: "Editorials", sub: "Personal projects, fashion stories and conceptual photography." },
    { key: "commissions", title: "Commissions", sub: "Paid collaborations, artist portraits, creative direction and commissioned photography." },
    { key: "commercial", title: "Commercial", sub: "Brand campaigns, e-commerce and advertising." }
  ];
  function catMap() { try { return JSON.parse(TX.shelf_cats || "{}"); } catch (e) { return {}; } }
  var CAT = catMap();
  function catOf(slug) { var c = CAT[slug]; return CATS.some(function (x) { return x.key === c; }) ? c : CATS[0].key; }
  function saveCats() {
    var json = JSON.stringify(CAT);
    TX.shelf_cats = json;
    return fetch("/api/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shelf_cats: json }) });
  }
  function catLabel(c) {
    var d = document.createElement("div");
    d.className = "case-label"; d.id = c.key; d.dataset.cat = c.key;
    d.innerHTML = '<h3 data-edit="cat_' + c.key + '">' + esc(TX["cat_" + c.key] || c.title) + '</h3>';
    return d;
  }

  // ---- lay the books onto shelves that fit the screen ----
  function layout() {
    root.innerHTML = "";
    var top = document.createElement("div");
    top.className = "case-top";
    top.appendChild(cam);
    top.appendChild(roll);
    root.appendChild(top);
    var small = root.clientWidth < 700, k = small ? 0.66 : 1;
    var avail = root.clientWidth - (small ? 24 : 48), row = [], used = 0;
    // album books grow to fill each shelf
    var gap = small ? 14 : 26;
    var per = small ? 2 : Math.max(3, Math.floor((avail + gap) / (240 + gap)));
    var bw = Math.floor((avail - gap * (per - 1) - (small ? 12 : 40)) / per), bh = Math.round(bw * 1.25);
    books.forEach(function (b, i) {
      b.style.setProperty("--w", bw + "px"); b.style.setProperty("--h", bh + "px");
      var num = b.querySelector(".bk-top span");   // number = its place on the shelf right now
      if (num) num.textContent = String(i + 1).padStart(2, "0");
    });
    // bottom-shelf books: shrink until the whole set fits on one shelf
    var HF = small ? 1.25 : 1.45;   // stand the books taller than wide so they read big
    var natural = 0, pileLen = 0;
    infoBooks.forEach(function (b) {
      if (b.classList.contains("lying")) pileLen = Math.max(pileLen, +b.dataset.h * 1.12 + 20);
      else natural += (+b.dataset.w) + 8 + (b.className.indexOf("lean-") > -1 ? b.dataset.h * HF * 0.16 : 0);
    });
    natural += pileLen;
    var ki = Math.min(small ? 1.1 : 2, (avail - 30) / natural);   // as big as fits on one shelf
    infoBooks.forEach(function (b) {
      b.style.setProperty("--w", Math.round(b.dataset.w * ki) + "px");
      b.style.setProperty("--h", Math.round(b.dataset.h * ki * HF) + "px");
    });
    function flush(isInfo) {
      if (!row.length) return;
      var r = document.createElement("div");
      r.className = "case-row reveal";
      var inner = document.createElement("div");
      inner.className = "case-books";
      if (!isInfo) inner.style.gap = gap + "px";
      row.forEach(function (b) { inner.appendChild(b); });
      r.appendChild(inner);
      r.insertAdjacentHTML("beforeend", '<div class="plank"></div>');
      root.appendChild(r);
      row = []; used = 0;
    }
    var shelfNo = 0;
    CATS.forEach(function (c) {                     // each section: its title, then its shelves
      root.appendChild(catLabel(c));
      var mine = books.filter(function (b) { return catOf(b.dataset.slug) === c.key; });
      mine.forEach(function (b) {
        var num = b.querySelector(".bk-top span");   // numbered in the order they stand on the shelves
        if (num) num.textContent = String(++shelfNo).padStart(2, "0");
        if (row.length >= per) flush();
        row.push(b);
      });
      if (!mine.length) {                           // an empty section still shows its shelf
        var r = document.createElement("div");
        r.className = "case-row case-empty"; r.dataset.cat = c.key;
        r.innerHTML = '<div class="case-books"></div><div class="plank"></div>';
        root.appendChild(r);
      }
      flush();
    });
    // bottom shelf: about / contact / socials (some lean, some lie in a pile)
    var pile = null;
    infoBooks.forEach(function (b) {
      if (b.classList.contains("lying")) {
        b.style.setProperty("--w", Math.round(b.dataset.h * ki * 1.12) + "px");   // lying down: long side is the width
        b.style.setProperty("--h", Math.round(b.dataset.w * ki) + "px");
        if (!pile) { pile = document.createElement("div"); pile.className = "ib-pile"; row.push(pile); }
        pile.insertBefore(b, pile.firstChild);
        return;
      }
      var w = parseInt(b.style.getPropertyValue("--w"), 10) + 6;
      if (used + w > avail) flush(true);
      row.push(b); used += w;
    });
    flush(true);
    // leaning books: space them so the top edge rests exactly on the neighbour
    var A = 9 * Math.PI / 180, GAP = 4;
    infoBooks.forEach(function (b) {
      var dir = b.classList.contains("lean-r") ? 1 : b.classList.contains("lean-l") ? -1 : 0;
      b.style.marginLeft = b.style.marginRight = "";
      if (!dir) return;
      var nb = dir > 0 ? b.nextElementSibling : b.previousElementSibling;
      if (!nb) return;
      var hb = parseFloat(b.style.getPropertyValue("--h")), hn = parseFloat(nb.style.getPropertyValue("--h")) || hb;
      var contact = Math.min(hb * Math.cos(A), hn);            // where the two books touch
      var gapPx = Math.max(0, contact * Math.tan(A) - GAP + 1);
      if (dir > 0) b.style.marginRight = gapPx + "px"; else b.style.marginLeft = gapPx + "px";
    });
    requestAnimationFrame(fitSpines);
    var rows = root.querySelectorAll(".case-row");
    if (rows.length) rows[rows.length - 1].classList.add("info-row");
    root.querySelectorAll(".reveal").forEach(function (r) { r.classList.add("in"); });
  }
  // ---- drag books to change the shelf order (editor only) ----
  if (location.port === "5190") {
    books.forEach(function (el, i) {
      var a = data[i];
      var x = document.createElement("button");
      x.className = "bk-del"; x.title = "Delete this book"; x.innerHTML = "&times;";
      x.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var ask = window.PSWRLD_CONFIRM || function (t) { return Promise.resolve(confirm(t)); };
        ask('Delete the book "' + a.title + '"? It moves to albums/_removed/_books, so you can bring it back later.', "Delete").then(function (ok) {
          if (!ok) return;
          fetch("/api/delete-album", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: a.slug }) })
            .then(function (r) {
              if (r.ok) { books.splice(books.indexOf(el), 1); data.splice(data.indexOf(a), 1); layout(); }
              else r.json().then(function (j) { (window.PSWRLD_CONFIRM || alert)("Not deleted: " + (j.error || r.status)); });
            });
        });
      });
      el.appendChild(x);
    });
    var dragSlug = null;
    // drop a book on a section's title (or its empty shelf) to move it to the end of that section
    root.addEventListener("dragover", function (e) {
      var t = e.target.closest && e.target.closest(".case-label, .case-empty");
      if (t && dragSlug) { e.preventDefault(); t.classList.add("drop-here"); }
    });
    root.addEventListener("dragleave", function (e) {
      var t = e.target.closest && e.target.closest(".case-label, .case-empty"); if (t) t.classList.remove("drop-here");
    });
    root.addEventListener("drop", function (e) {
      var t = e.target.closest && e.target.closest(".case-label, .case-empty");
      if (!t || !dragSlug) return;
      e.preventDefault(); t.classList.remove("drop-here");
      CAT[dragSlug] = t.dataset.cat;
      var from = books.findIndex(function (b) { return b.dataset.slug === dragSlug; });
      var moved = books.splice(from, 1)[0];
      var last = -1;
      books.forEach(function (b, k) { if (catOf(b.dataset.slug) === t.dataset.cat) last = k; });
      books.splice(last + 1, 0, moved);
      layout(); saveCats();
      fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: books.map(function (b) { return b.dataset.slug; }) }) });
    });
    books.forEach(function (el, i) {
      var slug = data[i].slug;
      el.dataset.slug = slug;
      el.draggable = true;
      el.addEventListener("dragstart", function (e) { dragSlug = slug; el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
      el.addEventListener("dragend", function () { el.classList.remove("dragging"); });
      el.addEventListener("dragover", function (e) { e.preventDefault(); el.classList.add("drop-here"); });
      el.addEventListener("dragleave", function () { el.classList.remove("drop-here"); });
      el.addEventListener("drop", function (e) {
        e.preventDefault(); el.classList.remove("drop-here");
        if (!dragSlug || dragSlug === slug) return;
        if (catOf(dragSlug) !== catOf(slug)) { CAT[dragSlug] = catOf(slug); saveCats(); }   // joins this book's section
        var from = books.findIndex(function (b) { return b.dataset.slug === dragSlug; });
        var moved = books.splice(from, 1)[0];
        var to = books.indexOf(el);
        var r = el.getBoundingClientRect();
        if (e.clientX > r.left + r.width / 2) to++;
        books.splice(to, 0, moved);
        layout();
        fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: books.map(function (b) { return b.dataset.slug; }) }) });
      });
    });
  }

  // shrink each spine label until the whole word fits
  function fitSpines() {
    root.querySelectorAll(".ib").forEach(function (b) {
      var sp = b.querySelector(".ib-spine"), lab = b.querySelector(".ib-label");
      if (!sp || !lab) return;
      lab.style.fontSize = "";
      b.classList.remove("tight", "tighter");
      var fs = parseFloat(getComputedStyle(lab).fontSize), guard = 0;
      var lying = b.classList.contains("lying");
      function over() {   // only the title's own room counts (the little top/bottom words may clip)
        return (lying ? sp.scrollWidth > sp.clientWidth + 1 : sp.scrollHeight > sp.clientHeight + 1) ||
          lab.scrollHeight > lab.clientHeight + 1 || lab.scrollWidth > lab.clientWidth + 1;
      }
      while (over() && fs > 7 && guard++ < 60) { fs -= 0.5; lab.style.fontSize = fs + "px"; }
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitSpines(); });

  var lastW = 0;
  window.addEventListener("resize", function () { if (Math.abs(root.clientWidth - lastW) > 40) { lastW = root.clientWidth; layout(); } });
  lastW = root.clientWidth; layout();

  // a cover with a white / light background behind the number and year: those turn dark so they stay readable
  books.forEach(function (el, i) {
    var a = data[i];
    if (!a || !a.cover) return;
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement("canvas"), w = 40, h = 50;
        c.width = w; c.height = h;
        var g = c.getContext("2d", { willReadFrequently: true });
        var r = w / h, iw = img.naturalWidth, ih = img.naturalHeight, sw = iw, sh = ih;   // same centred crop as the cover
        if (iw / ih > r) sw = ih * r; else sh = iw / r;
        g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
        var px = g.getImageData(0, 0, w, Math.round(h * 0.16)).data, sum = 0, cnt = 0;   // the strip the number and year sit on
        for (var k = 0; k < px.length; k += 4) { sum += 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]; cnt++; }
        if (sum / cnt > 150) el.classList.add("light-top");
      } catch (e) {}
    };
    img.src = a.cover;
  });

  // ---- click: the book comes off the shelf, turns to show its cover, then opens ----
  function pullOut(el, a) {
    var r = el.querySelector(".bk-body").getBoundingClientRect();
    var vw = innerWidth, vh = innerHeight;
    var H = Math.min(vh * 0.78, vw * 0.9 * 1.25), W = H * 0.8;
    var fly = document.createElement("div");
    fly.className = "fly";
    fly.innerHTML = '<div class="fly-cover"' + (a.cover ? ' style="background-image:url(\'' + esc(a.cover) + '\')"' : "") +
      '><b>' + esc(a.title) + '</b></div>';
    document.body.appendChild(fly);
    Object.assign(fly.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    el.classList.add("taken");
    var veil = document.createElement("div"); veil.className = "veil"; document.body.appendChild(veil);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      fly.classList.add("go");
      veil.classList.add("on");
      Object.assign(fly.style, { left: (vw - W) / 2 + "px", top: (vh - H) / 2 + "px", width: W + "px", height: H + "px" });
    }); });
    setTimeout(function () {
      if (!window.PSWRLD_FLICK) { location.href = el.href; return; }
      openInPage(a);                                   // the book opens right here, so the music never stops
      setTimeout(function () { fly.remove(); veil.remove(); el.classList.remove("taken"); }, 450);
    }, 900);
  }

  // ---- a book opened from the shelf sits on top of the home page (no page load) ----
  var FAV_IDS = ["stage", "prev", "next", "count", "hint", "zoomBtn"], view = null, homeURL = "", homeTitle = "";
  function openInPage(a) {
    if (view) return;
    FAV_IDS.forEach(function (id) {                    // the Favourites book steps aside while this one is open
      var e = document.getElementById(id);
      if (e) { e.dataset.favId = id; e.id = "fav-" + id; }
    });
    view = document.createElement("div");
    view.className = "album-view";
    view.innerHTML =
      '<header class="top av-top"><a class="backlink" href="index.html#work">&larr; All albums</a><span class="album-title" id="albumTitle"></span><span></span></header>' +
      '<div class="stage" id="stage"></div>' +
      '<div class="controls"><button id="prev" aria-label="Previous page">&larr;</button><span class="count" id="count"></span><button id="next" aria-label="Next page">&rarr;</button></div>' +
      '<p class="hint" id="hint">' + esc(TX.album_hint || "Drag, flick or swipe through the pages") + '</p>';
    document.body.appendChild(view);
    document.body.classList.add("album-open");
    view.querySelector(".backlink").addEventListener("click", function (e) { e.preventDefault(); closeAlbum(); });
    homeURL = location.href; homeTitle = document.title;
    try { history.pushState({ pswrldAlbum: a.slug }, "", "album.html?a=" + encodeURIComponent(a.slug)); } catch (e) {}
    window.__flickSlug = a.slug;
    window.PSWRLD_FLICK();
    document.getElementById("albumTitle").textContent = (window.PSWRLD_CURRENT || a).title;
    requestAnimationFrame(function () { view.classList.add("on"); });
  }
  function shut() {
    if (!view) return;
    view.remove(); view = null;
    document.body.classList.remove("album-open");
    document.title = homeTitle;
    document.querySelectorAll("[data-fav-id]").forEach(function (e) { e.id = e.dataset.favId; delete e.dataset.favId; });
    var fav = document.getElementById("stage");      // Favourites starts again
    if (fav) { var fresh = fav.cloneNode(false); fav.replaceWith(fresh); window.__flickSlug = null; window.PSWRLD_FLICK(); }
  }
  function closeAlbum() {
    if (history.state && history.state.pswrldAlbum) history.back();   // the back button closes it the same way
    else { try { history.replaceState(null, "", homeURL); } catch (e) {} shut(); }
  }
  window.PSWRLD_CLOSE_ALBUM = closeAlbum;
  window.addEventListener("popstate", function () {
    if (view && !(history.state && history.state.pswrldAlbum)) shut();
  });
  window.addEventListener("pageshow", function (e) { // coming back with the browser's back button
    if (e.persisted) { document.querySelectorAll(".fly,.veil").forEach(function (x) { x.remove(); }); books.forEach(function (b) { b.classList.remove("taken"); }); }
  });

  // ---- VHS player ----
  // film control icons: thin line style
  var PLAY_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
  var PAUSE_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/></svg>';
  function SKIP_SVG(d) {
    var flip = d < 0 ? ' transform="translate(24 0) scale(-1 1)"' : "";
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<g' + flip + '><path d="M19.2 9.5A8 8 0 1 0 20 13"/><path d="M19.6 4.8v4.9h-4.9"/></g>' +
      '<text x="12" y="15.6" text-anchor="middle" font-size="7.2" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">10</text></svg>';
  }
  function openVHS(from) {
    var box = document.createElement("div");
    box.className = "vhs";
    var tapes = videos.map(function (v, i) {
      var names = (TX.tapes || "").split("\n");
      return '<button class="tape" data-i="' + i + '"><span>' + esc((names[i] || "").trim() || v.title) + '</span></button>';
    }).join("");
    box.innerHTML =
      '<div class="vhs-screen"><video playsinline></video>' +
      '<div class="vhs-osd"><span class="rec">&#9679; REC</span><span class="tc">SP 00:00:00</span></div>' +
      '<div class="vhs-msg">' + (videos.length ? "PLAY &#9654;" : "NO TAPE<br><small>Put video files in pswrld-site/videos/ and run the add-photos script</small>") + '</div></div>' +
      (videos.length ? '<div class="vhs-ctl"><button class="vc-back" aria-label="Back 10 seconds">' + SKIP_SVG(-1) + '</button>' +
        '<button class="vc-play" aria-label="Play or pause"><span class="vc-i">' + PAUSE_SVG + '</span></button>' +
        '<button class="vc-fwd" aria-label="Forward 10 seconds">' + SKIP_SVG(1) + '</button>' +
        '<input class="vc-scrub" type="range" min="0" max="1000" value="0" aria-label="Scrub through the film">' +
        '<span class="vc-time">00:00 / 00:00</span></div>' : '') +
      '<div class="vhs-title">' + esc(TX.cam_label || "Creative Directed") + '</div><div class="vhs-tapes">' + tapes + '</div><button class="vhs-x" aria-label="Close">&times;</button>';
    document.body.appendChild(box);
    document.body.classList.add("vhs-open");
    var scr = box.querySelector(".vhs-screen");
    if (from && from.width) { // grow out of the camcorder's little screen
      var to = scr.getBoundingClientRect();
      scr.style.transformOrigin = "0 0";
      scr.style.transform = "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + (from.width / to.width) + "," + (from.height / to.height) + ")";
      scr.getBoundingClientRect();
      scr.style.transition = "transform .7s cubic-bezier(.22,.61,.36,1)";
      scr.style.transform = "none";
    }
    var vid = box.querySelector("video"), msg = box.querySelector(".vhs-msg"), tc = box.querySelector(".tc");
    function play(i) {
      box.querySelectorAll(".tape").forEach(function (t) { t.classList.toggle("on", +t.dataset.i === i); });
      vid.src = videos[i].src; vid.play().catch(function () {});
      msg.style.display = "none";
    }
    box.querySelectorAll(".tape").forEach(function (t) { t.onclick = function () { play(+t.dataset.i); }; });
    if (location.port === "5190") {   // editor: x on a tape removes that film
      box.querySelectorAll(".tape").forEach(function (t) {
        var x = document.createElement("i");
        x.className = "tape-del"; x.textContent = "\u00d7"; x.title = "Remove this film";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          var ask = window.PSWRLD_CONFIRM || function (q) { return Promise.resolve(confirm(q)); };
          var file = videos[+t.dataset.i].src.split("/").pop();
          ask("Remove the film \"" + t.textContent.replace("\u00d7", "").trim() + "\"? It moves to videos/_removed.", "Remove").then(function (ok) {
            if (!ok) return;
            fetch("/api/film-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: file }) })
              .then(function () { location.reload(); });
          });
        });
        t.appendChild(x);
      });
    }
    if (location.port === "5190") {   // editor: drag tapes to reorder them
      var dragI = null, row = box.querySelector(".vhs-tapes");
      box.querySelectorAll(".tape").forEach(function (t) {
        t.draggable = true;
        t.addEventListener("dragstart", function () { dragI = t; t.classList.add("dragging"); });
        t.addEventListener("dragend", function () { t.classList.remove("dragging"); });
        t.addEventListener("dragover", function (e) { e.preventDefault(); });
        t.addEventListener("drop", function (e) {
          e.preventDefault();
          if (!dragI || dragI === t) return;
          var r = t.getBoundingClientRect();
          row.insertBefore(dragI, e.clientX > r.left + r.width / 2 ? t.nextSibling : t);
          var tapesNow = [].slice.call(row.querySelectorAll(".tape"));
          var files = tapesNow.map(function (x) { return videos[+x.dataset.i].src.split("/").pop(); });
          var names = tapesNow.map(function (x) { return x.querySelector("span").textContent.trim(); });
          videos = tapesNow.map(function (x) { return videos[+x.dataset.i]; });
          tapesNow.forEach(function (x, k) { x.dataset.i = k; });
          TX.tapes = names.join(String.fromCharCode(10));
          try { vid.pause(); vid.removeAttribute("src"); vid.load(); } catch (er) {}   // release the file so it can be renamed
          fetch("/api/videos-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: files, names: names }) });
        });
      });
    }
    if (location.port === "5190") {   // editor: click a tape name to rename it, saved when you click away
      box.classList.add("naming");
      box.querySelectorAll(".tape span").forEach(function (sp) {
        sp.setAttribute("contenteditable", "plaintext-only");
        sp.addEventListener("click", function (e) { e.stopPropagation(); });
        sp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); sp.blur(); } });
        sp.addEventListener("blur", function () {
          var names = [].map.call(box.querySelectorAll(".tape span"), function (x) { return x.textContent.trim(); }).join(String.fromCharCode(10));
          TX.tapes = names;
          fetch("/api/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tapes: names }) });
        });
      });
    }
    // ---- controls: back / forward 10 s, play / pause, and a bar to scrub through the film ----
    var scrub = box.querySelector(".vc-scrub"), vtime = box.querySelector(".vc-time"), vplay = box.querySelector(".vc-play"), scrubbing = false;
    function mmss(t) { t = Math.max(0, Math.floor(t || 0)); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); }
    function showTime() {
      if (!scrub) return;
      var d = vid.duration || 0;
      if (!scrubbing) { scrub.value = d ? Math.round(vid.currentTime / d * 1000) : 0; }
      scrub.style.setProperty("--p", (scrub.value / 10) + "%");
      vtime.textContent = mmss(scrubbing && d ? scrub.value / 1000 * d : vid.currentTime) + " / " + mmss(d);
    }
    function skip(sec) { if (vid.duration) { vid.currentTime = Math.max(0, Math.min(vid.duration - 0.1, vid.currentTime + sec)); showTime(); } }
    function toggle() { if (vid.paused) vid.play().catch(function () {}); else vid.pause(); }
    function playIcon() { if (vplay) { vplay.querySelector(".vc-i").innerHTML = vid.paused ? PLAY_SVG : PAUSE_SVG; box.classList.toggle("paused", vid.paused); } }
    if (scrub) {
      box.querySelector(".vc-back").onclick = function () { skip(-10); };
      box.querySelector(".vc-fwd").onclick = function () { skip(10); };
      vplay.onclick = toggle;
      scrub.addEventListener("pointerdown", function () { scrubbing = true; });
      scrub.addEventListener("input", function () { scrubbing = true; if (vid.duration) vid.currentTime = scrub.value / 1000 * vid.duration; showTime(); });
      scrub.addEventListener("change", function () { scrubbing = false; showTime(); });
      scrub.addEventListener("pointerup", function () { scrubbing = false; });
      vid.addEventListener("play", playIcon); vid.addEventListener("pause", playIcon);
      vid.addEventListener("loadedmetadata", showTime); vid.addEventListener("durationchange", showTime);
    }
    vid.ontimeupdate = function () {
      var s = Math.floor(vid.currentTime), p = function (x) { return String(x).padStart(2, "0"); };
      tc.textContent = "SP " + p(Math.floor(s / 3600)) + ":" + p(Math.floor(s / 60) % 60) + ":" + p(s % 60);
      showTime();
    };
    vid.onclick = toggle;
    function close() { vid.pause(); box.remove(); document.body.classList.remove("vhs-open"); cam.classList.remove("open"); document.removeEventListener("keydown", esc2); }
    function esc2(e) {
      if (e.target.closest && e.target.closest("[contenteditable], input[type=text], textarea")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") { e.preventDefault(); skip(-10); }
      else if (e.key === "ArrowRight") { e.preventDefault(); skip(10); }
      else if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    }
    box.querySelector(".vhs-x").onclick = close;
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", esc2);
    if (videos.length) play(0);
  }

})();
