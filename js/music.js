// Background music on loop: your own mp3 (audio/music.mp3), or a YouTube track if no mp3 is set.
// Browsers only allow sound after a visitor clicks, so it starts on the first click anywhere.
// The little sound button turns it on/off. Change the track in the editor ("Background music").
(function () {
  var T = window.PSWRLD_TEXT || {};
  var link = T.music_youtube || "https://www.youtube.com/watch?v=MSNNtIHCexE";
  var m = String(link).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (T.music_off === "1") return;
  var id = m ? m[1] : "", frame = null, on = false, wantOff = sessionStorage.getItem("pswrld-music") === "off";
  var btn = document.createElement("button");
  btn.className = "music-btn";
  btn.setAttribute("aria-label", "Sound on or off");
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i><i></i></span><em>Sound</em>';
  // volume slider for the music (page-turn sounds always play)
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
  function start() {
    if (on) return;
    if (mp3) {
      if (!frame) { frame = new Audio(mp3); frame.loop = true; }
      frame.volume = vol || 0.7;
      frame.play().catch(function () {});
      on = true; btn.classList.add("on"); sessionStorage.setItem("pswrld-music", "on");
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
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); on ? stop() : start(); });
  function first() {
    document.removeEventListener("pointerdown", first, true);
    userStarted = true;
    if (!wantOff && vol > 0) start();
  }
  document.addEventListener("pointerdown", first, true);
})();
