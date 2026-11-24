// Background music: a YouTube track (official embed, nothing downloaded) on loop.
// Browsers only allow sound after a visitor clicks, so it starts on the first click anywhere.
// The little sound button turns it on/off. Change the track in the editor ("Background music").
(function () {
  var T = window.PSWRLD_TEXT || {};
  var link = T.music_youtube || "https://www.youtube.com/watch?v=MSNNtIHCexE";
  var m = String(link).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (!m || T.music_off === "1") return;
  var id = m[1], frame = null, on = false, wantOff = sessionStorage.getItem("pswrld-music") === "off";
  var btn = document.createElement("button");
  btn.className = "music-btn";
  btn.setAttribute("aria-label", "Sound on or off");
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i><i></i></span><em>Sound</em>';
  document.body.appendChild(btn);
  function start() {
    if (on) return;
    frame = document.createElement("iframe");
    frame.className = "music-frame";
    frame.allow = "autoplay; encrypted-media";
    frame.title = "Background music";
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&loop=1&playlist=" + id + "&controls=0&playsinline=1";
    document.body.appendChild(frame);
    on = true; btn.classList.add("on"); sessionStorage.setItem("pswrld-music", "on");
  }
  function stop() {
    if (frame) frame.remove();
    frame = null; on = false; btn.classList.remove("on"); sessionStorage.setItem("pswrld-music", "off");
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); on ? stop() : start(); });
  function first() {
    document.removeEventListener("pointerdown", first, true);
    if (!wantOff) start();
  }
  document.addEventListener("pointerdown", first, true);
})();
