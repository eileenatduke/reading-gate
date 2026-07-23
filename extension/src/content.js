// Content script (Spec §3): reports page foreground/background via the Page
// Visibility API as a backup to the background worker's focus tracking. The
// background is authoritative; this catches same-tab hide/show (e.g. the tab is
// covered, the OS minimizes the window) that window/tab focus events can miss.

function report() {
  try {
    chrome.runtime.sendMessage({ type: "VISIBILITY", hidden: document.hidden });
  } catch (e) {
    // background may be asleep; it will re-evaluate on the next focus event
  }
}

document.addEventListener("visibilitychange", report);
window.addEventListener("pagehide", () => {
  try { chrome.runtime.sendMessage({ type: "VISIBILITY", hidden: true }); } catch {}
});

// Report the current visibility once on load, too. A same-tab navigation to a blocked site
// fires no visibilitychange (the tab was already visible), so without this the background
// would have to rely on its focus tracking — which Chrome leaves stale when a Picture-in-
// Picture / screen-share window (e.g. during a Google Meet call) holds the OS focus. This
// initial report lets the gate evaluate as soon as a blocked page is actually on screen.
report();
