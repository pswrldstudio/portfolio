// Album page: a book with a cover that opens and pages that turn.
(function () {
  var albums = (window.PSWRLD && window.PSWRLD.albums) || [];
  var stageEl = document.getElementById("stage");
  var embedded = !!stageEl.dataset.album; // the big Favourites book on the home page
  var slug = stageEl.dataset.album || new URLSearchParams(location.search).get("a");
  var idx = Math.max(0, albums.findIndex(function (a) { return a.slug === slug; }));
  var album = albums[idx];
  if (!album) { document.getElementById("stage").textContent = "No albums yet. Run tools/add_photos.py"; return; }
  var others = albums.filter(function (a) { return !a.featured; });
  var nextAlbum = others[(others.indexOf(album) + 1) % others.length] || others[0];

  if (!embedded) {
    document.title = album.title + " | PSWRLD";
    document.getElementById("albumTitle").textContent = album.title;
  }

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- build the list of pages ----
  var photos = album.photos.length ? album.photos : null;
  var pages = [];
  pages.push({ kind: "cover" });
  pages.push({ kind: "intro" });
  if (photos) photos.forEach(function (p, i) { pages.push({ kind: "photo", p: p, n: i + 1 }); });
  else for (var k = 1; k <= (album.featured ? 12 : 8); k++) pages.push({ kind: "placeholder", n: k });
  pages.push({ kind: "end" });
  if (pages.length % 2 === 0) pages.push({ kind: "blank" }); // back cover must be a sheet's back
  pages.push({ kind: "backcover" });

  function pageHTML(pg) {
    switch (pg.kind) {
      case "cover":
        return '<div class="cover book-cover" style="position:absolute;inset:0">' +
          '<div class="c-top"><span>PSWRLD</span><span>' + esc(album.year) + '</span></div>' +
          (album.cover ? '<div class="c-photo" style="background-image:url(\'' + esc(album.cover) + '\')"></div>' : '<div class="c-photo empty"></div>') +
          '<div><div class="c-title">' + esc(album.title) + '</div></div></div>';
      case "intro":
        return '<div class="paper intro" style="position:absolute;inset:0"><div><h1>' + esc(album.title) + '</h1><p>' +
          esc(album.subtitle || "Photographed by PSWRLD") + (album.year ? " &middot; " + esc(album.year) : "") + '</p></div></div>';
      case "photo":
        return '<div class="paper" style="position:absolute;inset:0"><div class="print"><img alt="' + esc(album.title) + ' photo ' + pg.n +
          '" data-src="' + esc(pg.p.src) + '" width="' + pg.p.w + '" height="' + pg.p.h + '"></div><span class="pno">' + String(pg.n).padStart(2, "0") + '</span></div>';
      case "placeholder":
        return '<div class="paper" style="position:absolute;inset:0"><div class="placeholder"><div><b>' + String(pg.n).padStart(2, "0") +
          '</b>Placeholder<br>Your photo goes here</div></div></div>';
      case "end":
        if (embedded) return '<div class="paper endpage" style="position:absolute;inset:0"><div>' +
          '<img src="assets/pswrld-mark-white.svg" alt="PSWRLD"><p style="margin:18px 0 26px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)">The end</p>' +
          '<a href="#work" data-nav>Keep looking<span class="next-t">All the albums</span></a></div></div>';
        return '<div class="paper endpage" style="position:absolute;inset:0"><div>' +
          '<img src="assets/pswrld-mark-white.svg" alt="PSWRLD"><p style="margin:18px 0 26px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)">The end</p>' +
          '<a href="album.html?a=' + encodeURIComponent(nextAlbum.slug) + '" data-nav>Next album<span class="next-t">' + esc(nextAlbum.title) + '</span></a></div></div>';
      case "backcover":
        return '<div class="cover backcover" style="position:absolute;inset:0"><img class="c-mark" src="assets/pswrld-mark-white.svg" alt=""></div>';
      default:
        return '<div class="paper" style="position:absolute;inset:0"></div>';
    }
  }

  // ---- build sheets (front = right-hand page, back = left-hand page once turned) ----
  var book = document.getElementById("book");
  var sheets = [];
  var n = pages.length / 2;
  for (var s = 0; s < n; s++) {
    var el = document.createElement("div");
    el.className = "sheet";
    el.style.zIndex = n - s;
    el.innerHTML = '<div class="face front">' + pageHTML(pages[2 * s]) + '</div><div class="face back">' + pageHTML(pages[2 * s + 1]) + '</div>';
    book.appendChild(el);
    sheets.push(el);
  }

  var cur = 0; // number of turned sheets
  var counter = document.getElementById("count");
  var prevBtn = document.getElementById("prev"), nextBtn = document.getElementById("next");
  var hint = document.getElementById("hint");
  var timers = [];

  function loadNear() { // only load photos close to the open spread
    for (var i = Math.max(0, cur - 2); i < Math.min(n, cur + 3); i++) {
      sheets[i].querySelectorAll("img[data-src]").forEach(function (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); });
    }
  }

  function render() {
    book.classList.toggle("closed", cur === 0);
    book.classList.toggle("ended", cur === n);
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === n;
    counter.textContent = cur === 0 ? "Cover" : cur === n ? "Back" : String(cur).padStart(2, "0") + " / " + String(n - 1).padStart(2, "0");
    loadNear();
  }

  function turn(i, forward) {
    var sh = sheets[i];
    clearTimeout(timers[i]);
    sh.style.zIndex = n + 10 + (forward ? i : n - i);
    sh.classList.add("turning");
    sh.classList.toggle("flipped", forward);
    timers[i] = setTimeout(function () {
      sh.classList.remove("turning");
      sh.style.zIndex = forward ? i + 1 : n - i;
    }, 1060);
  }

  function next() { if (cur < n) { turn(cur, true); cur++; render(); hint.classList.add("gone"); } }
  function prev() { if (cur > 0) { cur--; turn(cur, false); render(); } }

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  document.addEventListener("keydown", function (e) {
    if (embedded) { var r = stageEl.getBoundingClientRect(); if (r.bottom < 80 || r.top > innerHeight - 80) return; }
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") prev();
    if (e.key === "Escape") location.href = "index.html#work";
  });

  // click: right side turns forward, left side turns back
  var stage = document.getElementById("stage");
  var swiped = false;
  stage.addEventListener("click", function (e) {
    if (swiped) { swiped = false; return; }
    if (e.target.closest("[data-nav]")) return;
    var r = stage.getBoundingClientRect();
    var split = window.innerWidth <= 760 ? 0.35 : 0.5;
    (e.clientX - r.left > r.width * split || cur === 0) ? next() : prev();
  });

  // swipe on phones and tablets
  var x0 = null, y0 = null;
  stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; dx < 0 ? next() : prev(); setTimeout(function () { swiped = false; }, 400); }
    x0 = null;
  });

  render();
})();
