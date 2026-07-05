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
