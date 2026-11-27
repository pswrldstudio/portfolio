// Background music on loop: your own mp3 (audio/music.mp3), or a YouTube track if no mp3 is set.
// One track loops the whole visit. Opening a book, swiping to the next one, zooming or playing a film
// never stops or restarts it. If a page does load fresh (e.g. album.html opened from a link) it picks
// up where it was. Browsers only allow sound after a visitor clicks, so the very first start waits
// for a click. The little sound button turns it on/off. Change the track in the editor ("Background music").
(function () {
  var T = window.PSWRLD_TEXT || {};
  var link = T.music_youtube || "https://www.youtube.com/watch?v=MSNNtIHCexE";
  var m = String(link).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (T.music_off === "1") return;
  var id = m ? m[1] : "", frame = null, on = false, wantOff = sessionStorage.getItem("pswrld-music") === "off";
  var wasOn = sessionStorage.getItem("pswrld-music") === "on";
  var btn = document.createElement("button");
  btn.className = "music-btn";
  btn.setAttribute("aria-label", "Sound on or off");
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i><i></i></span><em>Sound</em>';
  // volume slider for the music
  var wrap = document.createElement("div");
  wrap.className = "music-ctl";
  var vol = parseFloat(localStorage.getItem("pswrld-vol"));
  if (isNaN(vol)) vol = 0.7;
  wrap.innerHTML = '<input class="music-vol" type="range" min="0" max="100" aria-label="Music volume" value="' + Math.round(vol * 100) + '">';
  wrap.appendChild(btn);
  document.body.appendChild(wrap);
  var slider = wrap.querySelector(".music-vol");
  function setVol(v) {
    vol = v; localStorage.setItem("pswrld-vol", v);
    slider.style.setProperty("--v", Math.round(v * 100) + "%");
    if (frame && frame.pause) frame.volume = v;
    if (v === 0 && on) stop(); else if (v > 0 && !on && userStarted) start();
  }
  var userStarted = false;
  slider.style.setProperty("--v", Math.round(vol * 100) + "%");
  slider.addEventListener("input", function (e) { e.stopPropagation(); setVol(slider.value / 100); });
  slider.addEventListener("pointerdown", function (e) { e.stopPropagation(); userStarted = true; });
  var mp3 = T.music_file === undefined ? "audio/music.mp3" : T.music_file;   // your own track, played from the site

  // where the track was, so a fresh page carries on instead of starting again
  var KEY = "pswrld-music-at";
  function savePlace() {
    if (!frame || !frame.pause || !frame.duration) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ src: mp3, t: frame.currentTime, at: Date.now(), playing: on })); } catch (e) {}
  }
  function resumePlace(a) {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (!s || s.src !== mp3) return;
      var t = s.t + (s.playing ? Math.min(15, (Date.now() - s.at) / 1000) : 0);   // count the moment the page took to load
      var set = function () { a.currentTime = a.duration ? t % a.duration : t; };
      if (a.readyState >= 1) set(); else a.addEventListener("loadedmetadata", set, { once: true });
    } catch (e) {}
  }
  addEventListener("pagehide", savePlace);

  function track() {
    if (frame) return frame;
    frame = new Audio(mp3);
    frame.loop = true;
    frame.preload = "auto";
    resumePlace(frame);
    var last = 0;
    frame.addEventListener("timeupdate", function () { var now = Date.now(); if (now - last > 1000) { last = now; savePlace(); } });
    window.PSWRLD_MUSIC = frame;
    return frame;
  }
  function start() {
    if (on) return;
    if (mp3) {
      var a = track();
      a.volume = vol || 0.7;
      on = true; btn.classList.add("on"); sessionStorage.setItem("pswrld-music", "on");
      a.play().catch(function () {                   // the browser wants a click first: try again on it
        on = false; btn.classList.remove("on");
        waitForClick();
      });
      return;
    }
    frame = document.createElement("iframe");
    frame.className = "music-frame";
    frame.allow = "autoplay; encrypted-media";
    frame.title = "Background music";
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&loop=1&playlist=" + id + "&controls=0&playsinline=1";
    document.body.appendChild(frame);
    on = true; btn.classList.add("on"); sessionStorage.setItem("pswrld-music", "on");
  }
  function stop() {
    if (frame && frame.pause) frame.pause();          // mp3: pause (keeps its place)
    else { if (frame) frame.remove(); frame = null; }
    on = false; btn.classList.remove("on"); sessionStorage.setItem("pswrld-music", "off");
    savePlace();
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); userStarted = true; on ? stop() : start(); });
  var waiting = false;
  function waitForClick() {
    if (waiting) return;
    waiting = true;
    document.addEventListener("pointerdown", first, true);
    document.addEventListener("keydown", first, true);
  }
  function first(e) {
    if (e && e.target && e.target.closest && e.target.closest(".music-ctl")) return;   // the sound button handles itself
    document.removeEventListener("pointerdown", first, true);
    document.removeEventListener("keydown", first, true);
    waiting = false;
    userStarted = true;
    if (!wantOff && vol > 0) start();
  }
  // music was already playing on the last page: carry straight on if the browser allows it
  if (mp3 && wasOn && vol > 0) start();
  else waitForClick();
})();
