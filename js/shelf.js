// The bookshelf: every album is a book standing on a shelf, with the camcorder on top.
// Hover a book: it lifts as if someone picked it up. Click: it comes off the shelf and opens.
(function () {
  var data = ((window.PSWRLD && window.PSWRLD.albums) || []).filter(function (a) { return !a.featured; });
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


  // ---- bottom shelf: About me, profile, contact and socials as bright type-only books ----
  var T = window.PSWRLD_TEXT || {};
  var INFO = [
    { key: "instagram", lean: "r", label: "Instagram", sub: "Socials", color: "#f4ec5c", w: 50, h: 250, tilt: 0, href: T.instagram_url, open: "contact", kind: "tag" },
    { key: "profile", label: "Personal Profile", sub: "2026", color: "#d8b8f5", w: 74, h: 210, open: "about", kind: "profile" },
    { key: "works", label: "My Photo Works", sub: "PSWRLD", color: "#e9f0d8", w: 52, h: 300, href: "#work", kind: "serif" },
    { key: "about", label: "About Me", sub: "PSWRLD", color: "#f29be0", w: 66, h: 290, open: "about", kind: "big" },
    { key: "contact", lean: "l", label: "Contact", sub: "Bookings", color: "#9fc3f5", w: 70, h: 236, open: "contact", kind: "big" },
    { key: "tiktok", stack: true, label: "TikTok", sub: "Socials", color: "#e6f4dc", w: 50, h: 276, href: T.tiktok_url, open: "contact", kind: "serif" },
    { key: "year", stack: true, label: "2022–" + new Date().getFullYear(), sub: "PSWRLD", color: "#4fa85c", w: 50, h: 262, href: "#top", kind: "year" }
  ];
  var infoBooks = INFO.map(function (b) {
    var el = document.createElement("a");
    el.className = "bk ib ib-" + b.kind + (b.lean ? " lean-" + b.lean : "") + (b.stack ? " lying" : "");
    el.href = b.href || "#" + (b.open || "top");
    if (b.href && /^https?:/.test(b.href)) { el.target = "_blank"; el.rel = "noopener"; }
    el.dataset.cursor = b.open ? "Read" : "Go";
    el.dataset.w = b.w; el.dataset.h = b.h;
    el.style.setProperty("--tilt", (b.tilt || 0) + "deg");
    el.style.setProperty("--c", b.color);
    var icon = b.kind === "profile" ? '<i class="ib-clock"></i>' : b.kind === "tag" ? '<i class="ib-arrows">&#8645;</i>' : '<img class="ib-ring ib-mark" src="assets/pswrld-mark-black.svg" alt="">';
    el.innerHTML = '<div class="bk-body"><div class="ib-spine">' +
      '<span class="ib-sub" data-edit="ib_sub_' + b.key + '">' + esc(T["ib_sub_" + b.key] || b.sub) + '</span>' + icon +
      '<span class="ib-label" data-edit="ib_label_' + b.key + '">' + esc(T["ib_label_" + b.key] || b.label) + '</span>' +
      '<span class="ib-foot">PSWRLD</span></div></div>';
    if (b.open && !(b.href && /^https?:/.test(b.href))) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (document.body.classList.contains("editing")) return;
        openDrawer(b.open);
      });
    }
    return el;
  });

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

  // ---- lay the books onto shelves that fit the screen ----
  function layout() {
    root.innerHTML = "";
    var top = document.createElement("div");
    top.className = "case-top";
    top.appendChild(cam);
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
    books.forEach(function (b) {
      if (row.length >= per) flush();
      row.push(b);
    });
    flush();
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
    setTimeout(function () { location.href = el.href; }, 900);
  }
  window.addEventListener("pageshow", function (e) { // coming back with the browser's back button
    if (e.persisted) { document.querySelectorAll(".fly,.veil").forEach(function (x) { x.remove(); }); books.forEach(function (b) { b.classList.remove("taken"); }); }
  });

  // ---- VHS player ----
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
    vid.ontimeupdate = function () {
      var s = Math.floor(vid.currentTime), p = function (x) { return String(x).padStart(2, "0"); };
      tc.textContent = "SP " + p(Math.floor(s / 3600)) + ":" + p(Math.floor(s / 60) % 60) + ":" + p(s % 60);
    };
    vid.onclick = function () { vid.paused ? vid.play() : vid.pause(); };
    function close() { vid.pause(); box.remove(); document.body.classList.remove("vhs-open"); cam.classList.remove("open"); document.removeEventListener("keydown", esc2); }
    function esc2(e) { if (e.key === "Escape") close(); }
    box.querySelector(".vhs-x").onclick = close;
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", esc2);
    if (videos.length) play(0);
  }

})();
