// Edit mode. Only switches on when the site is opened through tools/edit_site.py.
// On the published site /api/ping doesn't exist, so this does nothing.
(function () {
  if (location.port !== "5190") return; // edit mode only inside tools/edit_site.py
  fetch("/api/ping", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.edit) start(); }).catch(function () {});

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function post(url, body, type) {
    return fetch(url, { method: "POST", headers: { "Content-Type": type || "application/json" }, body: body })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function start() {
    document.body.classList.add("editing");
    document.head.appendChild(el("style", {}, CSS));
    if (document.getElementById("stage") && !document.getElementById("stage").dataset.album) albumEditor();
    else homeEditor();
  }

  // ---------------- home page: click text to edit ----------------
  function homeEditor() {
    var T = window.PSWRLD_TEXT || {};
    document.querySelectorAll("[data-edit]").forEach(function (e) {
      e.setAttribute("contenteditable", "plaintext-only");
      e.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      e.addEventListener("keydown", function (ev) { ev.stopPropagation(); });
    });
    initStyleBar();
    var favSec = document.getElementById("favourites");
    if (favSec) {
      var fb = el("a", { class: "ed-libbtn ed-fav-float", href: "album.html?a=favourites&lib=1" }, "+ Select from library");
      favSec.appendChild(fb);
    }
    var list = document.querySelector("[data-edit-list]");
    var bar = el("div", { class: "ed-bar" },
      '<b class="ed-toggle">Edit mode <small>(click to show / hide)</small></b><span>Click any text on the page to change it.</span>' +
      '<label>Instagram link <input id="ed-ig" placeholder="https://instagram.com/..."></label>' +
      '<label>TikTok link <input id="ed-tt" placeholder="https://tiktok.com/@..."></label>' +
      '<label>Skills (comma separated) <input id="ed-skills"></label>' +
      '<label>Moving words band (comma separated) <input id="ed-marquee"></label>' +
      '<label>Tape names (one per line, in order) <textarea id="ed-tapes" rows="4"></textarea></label>' +
      '<a href="album.html?a=favourites">Edit the Favourites book &rarr;</a>' +
      '<span class="ed-tip">To change an album, open it from the shelf.</span>' +
      '<button id="ed-save">Save text</button>' +
      '<button id="ed-publish" class="ed-pub">Publish to web</button><em id="ed-msg"></em>');
    document.body.appendChild(bar);
    bar.classList.add("min");
    bar.querySelector(".ed-toggle").onclick = function () { bar.classList.toggle("min"); };
    document.getElementById("ed-ig").value = T.instagram_url || "";
    document.getElementById("ed-tt").value = T.tiktok_url || "";
    document.getElementById("ed-marquee").value = T.marquee || "Fashion, Music, DJs, Concerts, Events, Film, Creative Direction, Lookbooks";
    document.getElementById("ed-tapes").value = T.tapes || ((window.PSWRLD && window.PSWRLD.videos) || []).map(function (v) { return v.title; }).join("\n");
    document.getElementById("ed-skills").value = T.disciplines ||
      [].map.call(list ? list.querySelectorAll("li") : [], function (li) { return li.textContent; }).join(", ");
    document.getElementById("ed-publish").onclick = publishSite;
    document.getElementById("ed-save").onclick = function () {
      var data = {};
      document.querySelectorAll("[data-edit]").forEach(function (e) {
        var v = e.textContent.trim();
        if (!/^\[.*\]$/.test(v)) data[e.dataset.edit] = v; // leave [ADD ...] placeholders unsaved
      });
      collectStyles(data);
      data.instagram_url = document.getElementById("ed-ig").value.trim();
      data.tiktok_url = document.getElementById("ed-tt").value.trim();
      data.disciplines = document.getElementById("ed-skills").value.trim();
      data.marquee = document.getElementById("ed-marquee").value.trim();
      data.tapes = document.getElementById("ed-tapes").value.trim();
      msg("Saving...");
      post("/api/text", JSON.stringify(data)).then(function () { msg("Saved ✓"); })
        .catch(function (e) { msg("Not saved: " + e.message); });
    };
  }

  // ---------------- album page: title, cover, order, add / remove ----------------
  function albumEditor() {
    var A = window.PSWRLD_CURRENT;
    if (!A) return;
    initStyleBar();
    document.querySelectorAll("[data-edit]").forEach(function (e) {   // page text (back link, hint)
      e.setAttribute("contenteditable", "plaintext-only");
      e.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      e.addEventListener("keydown", function (ev) { ev.stopPropagation(); });
    });
    var photos = A.photos.map(function (p) { return { name: p.name, src: p.src }; });
    var coverName = (A.cover && A.photos.length) ? null : "";
    var removed = {}, newFiles = [];
    var info = A; // title / subtitle / year
    var favAlbum = (window.PSWRLD.albums || []).find(function (a) { return a.featured; });
    var picks = {};
    ((favAlbum && favAlbum.picks) || []).forEach(function (k) { picks[k] = true; });

    var panel = el("aside", { class: "ed-panel" },
      '<div class="ed-head"><b>Edit album</b><button class="ed-x" title="Hide">&times;</button></div>' +
      '<label>Title <input id="ed-title"></label>' +
      '<label>Subtitle <input id="ed-sub" placeholder="e.g. Shot for ..."></label>' +
      '<label>Description <textarea id="ed-desc" rows="6" placeholder="The concept behind this book..."></textarea></label>' +
      '<label>Year <input id="ed-year"></label>' +
      '<p class="ed-tip">Drag photos to change the order. Click a photo to make it the cover. &times; removes it.' +
      (A.featured ? ' Photos you starred in other albums show here too.' : ' &#9733; adds a photo to your Favourites book.') + '</p>' +
      '<div class="ed-grid" id="ed-grid"></div>' +
      (A.featured ? '<button id="ed-lib" class="ed-libbtn">+ Select from library</button>' : '') +
      '<label class="ed-drop" id="ed-drop">+ Add photos<br><small>drop files here or click</small><input type="file" id="ed-file" multiple accept="image/*" hidden></label>' +
      '<button id="ed-save">Save album</button><em id="ed-msg"></em>' +
      '<button id="ed-publish2" class="ed-pub">Publish to web</button>' +
      (A.featured ? '' : '<button id="ed-delete" class="ed-danger">Delete this book</button>'));
    document.body.appendChild(panel);
    var tab = el("button", { class: "ed-tab" }, "Edit album");
    document.body.appendChild(tab);
    tab.onclick = function () { panel.classList.remove("hidden"); };
    panel.querySelector(".ed-x").onclick = function () { panel.classList.add("hidden"); };

    document.getElementById("ed-publish2").onclick = publishSite;
    var libBtn = document.getElementById("ed-lib");
    if (libBtn) libBtn.onclick = openLibrary;
    if (libBtn && /[?&]lib=1/.test(location.search)) setTimeout(openLibrary, 300);
    // every photo from every book; tick the ones you want in Favourites
    function openLibrary() {
      var chosen = ((favAlbum && favAlbum.picks) || []).slice();
      var set = {}; chosen.forEach(function (k) { set[k] = true; });
      var box = el("div", { class: "ed-lib" });
      var html = '<div class="ed-lib-head"><b>Select from library</b><span id="ed-lib-n"></span>' +
        '<button id="ed-lib-cancel" class="ed-ghost">Cancel</button><button id="ed-lib-done">Done</button></div><div class="ed-lib-body">';
      (window.PSWRLD.albums || []).forEach(function (a) {
        if (a.featured || !a.photos.length) return;
        html += '<h4>' + esc(a.title) + '<small>' + a.photos.length + '</small></h4><div class="ed-lib-grid">';
        a.photos.forEach(function (p) {
          var key = a.slug + "/" + p.name;
          html += '<button class="ed-lib-th' + (set[key] ? " sel" : "") + '" data-key="' + esc(key) + '"><img loading="lazy" src="' + esc(p.src) + '" alt=""><i>&#10003;</i></button>';
        });
        html += '</div>';
      });
      box.innerHTML = html + '</div>';
      document.body.appendChild(box);
      function count() { box.querySelector("#ed-lib-n").textContent = chosen.length + " selected"; }
      count();
      box.querySelectorAll(".ed-lib-th").forEach(function (t) {
        t.onclick = function () {
          var k = t.dataset.key;
          if (set[k]) { delete set[k]; chosen = chosen.filter(function (x) { return x !== k; }); }
          else { set[k] = true; chosen.push(k); }
          t.classList.toggle("sel", !!set[k]); count();
        };
      });
      box.querySelector("#ed-lib-cancel").onclick = function () { box.remove(); };
      box.querySelector("#ed-lib-done").onclick = function () {
        this.disabled = true; this.textContent = "Saving...";
        post("/api/picks", JSON.stringify({ picks: chosen })).then(function () { location.href = "album.html?a=favourites"; })
          .catch(function (e) { alert("Not saved: " + e.message); box.remove(); });
      };
    }
    var delBtn = document.getElementById("ed-delete");
    if (delBtn) delBtn.onclick = function () {
      askConfirm('Delete the book "' + A.title + '"? It moves to albums/_removed/_books, so you can bring it back later.', "Delete").then(function (ok) {
        if (!ok) return;
        msg("Deleting...");
        post("/api/delete-album", JSON.stringify({ slug: A.slug }))
          .then(function () { location.href = "index.html#work"; })
          .catch(function (e) { msg("Not deleted: " + e.message); });
      });
    };
    document.getElementById("ed-title").value = info.title || "";
    document.getElementById("ed-sub").value = info.subtitle || "";
    document.getElementById("ed-desc").value = info.description || "";
    document.getElementById("ed-year").value = info.year || "";
    // which photo is the cover now: the one whose name matches the cover file, else the first
    var currentCover = (window.PSWRLD_COVER_FROM) || (photos[0] && photos[0].name) || "";
    if (A.coverFrom) currentCover = A.coverFrom;

    var grid = document.getElementById("ed-grid"), dragI = -1;
    function draw() {
      grid.innerHTML = "";
      var all = photos.concat(newFiles.map(function (f) { return { name: f.file.name, src: f.url, isNew: true }; }));
      all.forEach(function (p, i) {
        var d = el("div", { class: "ed-th" + (removed[p.name] ? " gone" : "") + (p.name === currentCover ? " cover" : ""), draggable: "true" },
          '<img src="' + esc(p.src) + '" alt=""><button class="ed-del" title="Remove">&times;</button>' +
          (!A.featured && !p.isNew ? '<button class="ed-fav' + (picks[A.slug + "/" + p.name] ? " on" : "") + '" title="Favourite">&#9733;</button>' : "") +
          (p.name === currentCover ? '<span class="ed-badge">Cover</span>' : "") + (p.isNew ? '<span class="ed-badge new">New</span>' : ""));
        d.querySelector(".ed-del").onclick = function (e) {
          e.stopPropagation();
          if (p.isNew) newFiles.splice(i - photos.length, 1); else removed[p.name] = !removed[p.name];
          draw();
        };
        var fb = d.querySelector(".ed-fav");
        if (fb) fb.onclick = function (e) {
          e.stopPropagation();
          var key = A.slug + "/" + p.name, on = !picks[key];
          fb.classList.toggle("on", on);
          post("/api/fav", JSON.stringify({ slug: A.slug, name: p.name, on: on }))
            .then(function () { picks[key] = on; msg(on ? "Added to Favourites \u2605" : "Removed from Favourites"); })
            .catch(function (er) { fb.classList.toggle("on", !on); msg("Not saved: " + er.message); });
        };
        d.onclick = function () { if (!p.isNew) { currentCover = p.name; draw(); } };
        if (!p.isNew) {
          d.addEventListener("dragstart", function () { dragI = i; d.classList.add("drag"); });
          d.addEventListener("dragover", function (e) { e.preventDefault(); });
          d.addEventListener("drop", function (e) {
            e.preventDefault();
            if (dragI < 0 || dragI >= photos.length || dragI === i) return;
            var moved = photos.splice(dragI, 1)[0];
            photos.splice(i, 0, moved); dragI = -1; draw();
          });
        }
        grid.appendChild(d);
      });
    }
    draw();

    function addFiles(list) {
      [].forEach.call(list, function (f) { if (/^image\//.test(f.type)) newFiles.push({ file: f, url: URL.createObjectURL(f) }); });
      draw();
    }
    var drop = document.getElementById("ed-drop");
    document.getElementById("ed-file").onchange = function (e) { addFiles(e.target.files); };
    ["dragover", "dragenter"].forEach(function (t) { drop.addEventListener(t, function (e) { if (e.dataTransfer && e.dataTransfer.types.indexOf("Files") > -1) { e.preventDefault(); drop.classList.add("over"); } }); });
    drop.addEventListener("dragleave", function () { drop.classList.remove("over"); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); });

    document.getElementById("ed-save").onclick = function () {
      var btn = this; btn.disabled = true;
      var uploaded = [], i = 0;
      function next() {
        if (i >= newFiles.length) return Promise.resolve();
        var f = newFiles[i++];
        msg("Uploading " + i + " of " + newFiles.length + "...");
        return post("/api/upload?album=" + encodeURIComponent(A.slug) + "&name=" + encodeURIComponent(f.file.name), f.file, "application/octet-stream")
          .then(function (j) { uploaded.push(j.name); return next(); });
      }
      next().then(function () {
        msg("Saving...");
        var pageText = {};
        document.querySelectorAll("[data-edit]").forEach(function (e) { pageText[e.dataset.edit] = e.textContent.trim(); });
        collectStyles(pageText);
        return post("/api/text", JSON.stringify(pageText));
      }).then(function () {
        var order = photos.filter(function (p) { return !removed[p.name]; }).map(function (p) { return p.name; }).concat(uploaded);
        return post("/api/album", JSON.stringify({
          slug: A.slug, title: document.getElementById("ed-title").value, subtitle: document.getElementById("ed-sub").value, description: document.getElementById("ed-desc").value,
          year: document.getElementById("ed-year").value, cover: currentCover && !removed[currentCover] ? currentCover : "",
          order: order, remove: Object.keys(removed).filter(function (k) { return removed[k]; })
        }));
      }).then(function () { msg("Saved ✓ Reloading..."); setTimeout(function () { location.reload(); }, 500); })
        .catch(function (e) { msg("Not saved: " + e.message); btn.disabled = false; });
    };
  }

  // ---- style bar: size, alignment and position for the text you're editing ----
  var styleBar = null, styleEl = null;
  function readSt(e) { try { return JSON.parse(e.dataset.st || "{}"); } catch (x) { return {}; } }
  function writeSt(e, st) {
    e.dataset.st = JSON.stringify(st);
    e.style.zoom = st.z && st.z !== 1 ? st.z : "";
    e.style.textAlign = st.a || "";
    if (st.a && getComputedStyle(e).display === "inline") e.style.display = "inline-block";
    if (st.x || st.y) { if (!e.style.position) e.style.position = "relative"; e.style.translate = (st.x || 0) + "px " + (st.y || 0) + "px"; }
    else e.style.translate = "";
  }
  function initStyleBar() {
    styleBar = el("div", { class: "ed-style" },
      '<button data-k="smaller" title="Smaller">A&minus;</button><button data-k="bigger" title="Bigger">A+</button>' +
      '<button data-k="left" title="Align left">&#8676;</button><button data-k="center" title="Centre">&#8596;</button><button data-k="right" title="Align right">&#8677;</button>' +
      '<button data-k="move" class="ed-move" title="Hold and drag to move">&#10021; Move</button><button data-k="reset" title="Reset">Reset</button>');
    document.body.appendChild(styleBar);
    styleBar.addEventListener("mousedown", function (e) { e.preventDefault(); });   // keep the text focused
    styleBar.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!styleEl) return;
        var st = readSt(styleEl), k = b.dataset.k;
        if (k === "smaller") st.z = Math.max(0.3, Math.round(((st.z || 1) - 0.1) * 100) / 100);
        if (k === "bigger") st.z = Math.min(3, Math.round(((st.z || 1) + 0.1) * 100) / 100);
        if (k === "left" || k === "center" || k === "right") st.a = k;
        if (k === "reset") st = {};
        writeSt(styleEl, st); placeBar(); dirty();
      });
    });
    // drag to move
    var mv = styleBar.querySelector(".ed-move"), sx, sy, st0;
    mv.addEventListener("pointerdown", function (e) {
      if (!styleEl) return;
      sx = e.clientX; sy = e.clientY; st0 = readSt(styleEl);
      mv.setPointerCapture(e.pointerId);
      function move(ev) {
        var z = st0.z || 1, st = Object.assign({}, st0);
        st.x = Math.round((st0.x || 0) + (ev.clientX - sx) / z); st.y = Math.round((st0.y || 0) + (ev.clientY - sy) / z);
        writeSt(styleEl, st);
      }
      function up() { mv.removeEventListener("pointermove", move); mv.removeEventListener("pointerup", up); placeBar(); dirty(); }
      mv.addEventListener("pointermove", move); mv.addEventListener("pointerup", up);
    });
    document.addEventListener("focusin", function (e) {
      var t = e.target.closest && e.target.closest("[data-edit][contenteditable]");
      if (t) { styleEl = t; placeBar(); }
    });
    addEventListener("scroll", placeBar, { passive: true });
  }
  function placeBar() {
    if (!styleBar || !styleEl) return;
    var r = styleEl.getBoundingClientRect();
    styleBar.style.display = "flex";
    styleBar.style.left = Math.max(8, Math.min(innerWidth - styleBar.offsetWidth - 8, r.left)) + "px";
    styleBar.style.top = Math.max(8, r.top - styleBar.offsetHeight - 10) + "px";
  }
  // size / alignment / move changes save straight away and say Done
  var doneT = null;
  function dirty() {
    if (!styleEl) return;
    var data = {};
    data["style_" + styleEl.dataset.edit] = styleEl.dataset.st === "{}" ? "" : styleEl.dataset.st;
    flag("Saving...");
    post("/api/text", JSON.stringify(data))
      .then(function () { flag("Done ✓"); msg("Done ✓"); })
      .catch(function (e) { flag("Not saved"); msg("Not saved: " + e.message); });
  }
  function flag(t) {
    if (!styleBar) return;
    var f = styleBar.querySelector(".ed-flag");
    if (!f) { f = el("span", { class: "ed-flag" }); styleBar.appendChild(f); }
    f.textContent = t; f.classList.add("on");
    clearTimeout(doneT); doneT = setTimeout(function () { f.classList.remove("on"); }, 1800);
  }
  function collectStyles(data) {
    document.querySelectorAll("[data-edit]").forEach(function (e) {
      if (e.dataset.st !== undefined) data["style_" + e.dataset.edit] = e.dataset.st === "{}" ? "" : e.dataset.st;
    });
    return data;
  }

  function askConfirm(text, okLabel) {
    return new Promise(function (resolve) {
      var box = el("div", { class: "ed-confirm" },
        '<div class="ed-confirm-card"><p></p><div><button class="ed-ghost2">Cancel</button><button class="ed-ok">' + (okLabel || "OK") + '</button></div></div>');
      box.querySelector("p").textContent = text;
      document.body.appendChild(box);
      function done(v) { box.remove(); resolve(v); }
      box.querySelector(".ed-ok").onclick = function () { done(true); };
      box.querySelector(".ed-ghost2").onclick = function () { done(false); };
      box.addEventListener("click", function (e) { if (e.target === box) done(false); });
    });
  }
  window.PSWRLD_CONFIRM = askConfirm;

  function publishSite() {
    askConfirm("Publish the site live at petterm15.github.io/pswrld? Save your changes first. Visitors see the new version about a minute later.", "Publish").then(function (ok) {
      if (!ok) return;
      msg("Publishing... (this can take a minute)");
      post("/api/publish", "{}").then(function (j) {
        msg("Published \u2713 " + j.url);
      }).catch(function (e) { msg("Not published: " + e.message); });
    });
  }

  function msg(t) { var m = document.getElementById("ed-msg"); if (m) m.textContent = t; }

  var CSS = [
    ".editing [contenteditable]{outline:1px dashed rgba(239,235,228,.45);outline-offset:4px;cursor:text;border-radius:2px}",
    ".editing [contenteditable]:focus{outline:1px solid #efebe4;background:rgba(239,235,228,.06)}",
    ".ed-bar{position:fixed;left:16px;bottom:16px;z-index:200;width:min(330px,calc(100vw - 32px));display:grid;gap:10px;padding:16px;background:#151515f2;border:1px solid rgba(239,235,228,.18);border-radius:14px;font-size:12px;color:#efebe4;box-shadow:0 20px 50px rgba(0,0,0,.6)}",
    ".ed-bar.min>*:not(.ed-toggle):not(#ed-save):not(#ed-msg){display:none}",
    ".ed-toggle{cursor:pointer}.ed-toggle small{font-weight:400;color:#8d8a85}",
    ".ed-bar span,.ed-tip{color:#8d8a85;font-size:12px}",
    ".ed-bar label,.ed-panel label{display:grid;gap:4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8d8a85}",
    ".ed-panel textarea{background:#0b0b0b;border:1px solid rgba(239,235,228,.18);border-radius:8px;color:#efebe4;padding:8px 10px;font:14px/1.5 var(--sans);text-transform:none;letter-spacing:0;resize:vertical}",
    ".ed-bar textarea{background:#0b0b0b;border:1px solid rgba(239,235,228,.18);border-radius:8px;color:#efebe4;padding:8px 10px;font:13px/1.4 var(--sans);resize:vertical}",
    ".ed-bar{max-height:calc(100vh - 32px);overflow:auto}",
    ".ed-bar input,.ed-panel input{background:#0b0b0b;border:1px solid rgba(239,235,228,.18);border-radius:8px;color:#efebe4;padding:8px 10px;font:14px var(--sans);text-transform:none;letter-spacing:0}",
    ".ed-bar a{text-decoration:underline}",
    ".ed-bar button,.ed-panel #ed-save{background:#efebe4;color:#0b0b0b;border:0;border-radius:99px;padding:10px 16px;font-weight:600;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-size:12px}",
    ".ed-bar em,.ed-panel em{font-style:normal;color:#8d8a85}",
    ".ed-panel{position:fixed;top:0;right:0;bottom:0;z-index:200;width:min(360px,100vw);overflow:auto;padding:18px;display:grid;align-content:start;gap:12px;background:#121212f7;border-left:1px solid rgba(239,235,228,.15);color:#efebe4;transition:transform .35s}",
    ".ed-panel.hidden{transform:translateX(105%)}",
    ".ed-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.16em;text-transform:uppercase}",
    ".ed-x{background:none;border:0;color:#efebe4;font-size:24px;cursor:pointer}",
    ".ed-tab{position:fixed;right:16px;bottom:16px;z-index:150;background:#efebe4;color:#0b0b0b;border:0;border-radius:99px;padding:10px 16px;font-weight:600;cursor:pointer}",
    ".ed-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
    ".ed-th{position:relative;aspect-ratio:4/5;border-radius:6px;overflow:hidden;cursor:grab;outline:2px solid transparent}",
    ".ed-th img{width:100%;height:100%;object-fit:cover;pointer-events:none}",
    ".ed-th.cover{outline-color:#efebe4}.ed-th.gone{opacity:.25}.ed-th.drag{opacity:.5}",
    ".ed-del{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:0;background:#000b;color:#fff;cursor:pointer;line-height:1}",
    ".ed-fav{position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;border:0;background:#000b;color:#fff;cursor:pointer;font-size:13px;line-height:1}",
    ".ed-fav.on{background:#f4c84a;color:#000}",
    ".ed-danger{background:none;border:1px solid #c0392b;color:#ff6b5b;border-radius:99px;padding:9px 14px;cursor:pointer;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-top:10px}",
    ".ed-danger:hover{background:#c0392b;color:#fff}",
    ".bk-del{position:absolute;top:-10px;right:-10px;z-index:6;width:28px;height:28px;border-radius:50%;border:0;background:#c0392b;color:#fff;font-size:17px;line-height:1;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.6)}",
    ".ed-libbtn{background:#f4c84a;color:#000;border:0;border-radius:10px;padding:14px;font-weight:700;cursor:pointer;font-size:13px;letter-spacing:.04em}",
    ".ed-lib{position:fixed;inset:0;z-index:600;background:#0b0b0bf7;display:flex;flex-direction:column;color:#efebe4}",
    ".ed-lib-head{display:flex;align-items:center;gap:14px;padding:16px 22px;border-bottom:1px solid rgba(239,235,228,.15);font-size:13px;letter-spacing:.08em;text-transform:uppercase}",
    ".ed-lib-head span{color:#8d8a85;margin-right:auto}",
    ".ed-lib-head button{background:#efebe4;color:#000;border:0;border-radius:99px;padding:9px 18px;font-weight:700;cursor:pointer}",
    ".ed-lib-head .ed-ghost{background:none;color:#efebe4;border:1px solid rgba(239,235,228,.3)}",
    ".ed-lib-body{overflow:auto;padding:10px 22px 40px}",
    ".ed-lib-body h4{margin:22px 0 10px;font:400 italic 24px var(--serif)}.ed-lib-body h4 small{margin-left:10px;font:12px var(--sans);color:#8d8a85;font-style:normal}",
    ".ed-lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}",
    ".ed-lib-th{position:relative;aspect-ratio:4/5;border:0;padding:0;border-radius:6px;overflow:hidden;cursor:pointer;background:#1a1918;outline:3px solid transparent;outline-offset:-3px}",
    ".ed-lib-th img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s,opacity .3s}",
    ".ed-lib-th i{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:#000a;border:1.5px solid #fff;color:transparent;font-style:normal;font-size:14px;line-height:21px}",
    ".ed-lib-th.sel{outline-color:#f4c84a}.ed-lib-th.sel img{transform:scale(.92);opacity:.85}",
    ".ed-lib-th.sel i{background:#f4c84a;border-color:#f4c84a;color:#000}",
    ".ed-fav-float{position:absolute;right:clamp(18px,4vw,48px);top:30px;z-index:20;text-decoration:none}",
    ".ed-style{position:fixed;z-index:700;display:none;gap:4px;padding:5px;background:#efebe4;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.6)}",
    ".ed-style button{background:#0b0b0b;color:#efebe4;border:0;border-radius:7px;padding:7px 10px;font:600 12px/1 var(--sans);cursor:pointer;white-space:nowrap}",
    ".ed-style button:hover{background:#333}.ed-style .ed-move{cursor:grab;touch-action:none}",
    ".ed-confirm{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.7);display:grid;place-items:center}",
    ".ed-confirm-card{background:#151515;border:1px solid rgba(239,235,228,.2);border-radius:14px;padding:22px;max-width:380px;color:#efebe4;font:15px/1.5 var(--sans);box-shadow:0 30px 60px rgba(0,0,0,.7)}",
    ".ed-confirm-card div{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}",
    ".ed-confirm-card button{border-radius:99px;padding:9px 18px;font-weight:700;cursor:pointer;border:0}",
    ".ed-ghost2{background:none!important;color:#efebe4;border:1px solid rgba(239,235,228,.3)!important}",
    ".ed-ok{background:#c0392b;color:#fff}",
    ".ed-flag{align-self:center;padding:0 10px;font:700 12px/1 var(--sans);color:#0b0b0b;opacity:0;transition:opacity .25s;white-space:nowrap}.ed-flag.on{opacity:1}",
    ".ed-pub{background:#4fa85c!important;color:#fff!important;border:0;border-radius:99px;padding:10px 16px;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-size:12px}",
    ".ed-badge{position:absolute;left:4px;bottom:4px;background:#efebe4;color:#000;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;border-radius:99px}",
    ".ed-badge.new{left:auto;right:4px;background:#7de0a0}",
    ".ed-drop{border:1px dashed rgba(239,235,228,.35);border-radius:10px;padding:18px;text-align:center;cursor:pointer;color:#efebe4!important;font-size:13px!important}",
    ".ed-drop.over{background:rgba(239,235,228,.08)}"
  ].join("\n");
})();
