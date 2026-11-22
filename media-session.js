"use strict";

const playerSystem = (() => {
  const session = navigator.mediaSession;
  let lastTrack, lastSecond;

  function controls(handlers) {
    if (!session) return;
    for (const [name, action] of Object.entries(handlers)) {
      try { session.setActionHandler(name, action); }
      catch { /* This action is unavailable in this browser. */ }
    }
  }

  function update(track, playing, position, duration) {
    if (!session) return;
    try {
      if (track?.id !== lastTrack) {
        lastTrack = track?.id;
        lastSecond = undefined;
        session.metadata = track && typeof MediaMetadata === "function" ? new MediaMetadata({
          title:track.title, artist:track.artist, album:track.album || "",
          artwork:[{src:new URL("iconos/mi-musica-512.png", location.href).href, sizes:"512x512", type:"image/png"}]
        }) : null;
      }
      session.playbackState = track ? (playing ? "playing" : "paused") : "none";
      const seconds = Math.floor(position);
      if (track && Number.isFinite(duration) && duration > 0 && seconds !== lastSecond) {
        lastSecond = seconds;
        session.setPositionState?.({ duration, playbackRate:1, position:Math.min(duration, Math.max(0, position)) });
      } else if (!track) session.setPositionState?.();
    } catch { /* Audio remains available with the in-app controls. */ }
  }

  return { controls, update };
})();

