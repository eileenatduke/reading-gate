// Dashboard → extension session bridge.
//
// The web dashboard keeps its Supabase session in this origin's localStorage; the extension
// keeps its own copy in chrome.storage.local. When you log in or switch accounts ON the
// dashboard, this content script mirrors that session back into the extension, so the account
// shown in the popup (and enforced by the gate) follows the one you're using on the web.
//
// The reverse direction — extension → dashboard — is handled by the URL-hash handoff in
// popup.js (openDashboard / syncOpenDashboards), which calls supabase.auth.setSession and so
// updates the dashboard's live client reliably. This bridge deliberately only READS the page's
// session and writes it to the extension; it never writes the page, and never force-logs-out
// the gate when the dashboard is merely logged out.

(function () {
  const EXT_KEY = "sb_session";

  // Supabase stores its session under `sb-<project-ref>-auth-token`. Find it without needing
  // to know the ref, so this keeps working if the configured project changes.
  function readPageSession() {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.*-auth-token$/.test(k)) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (v && v.access_token && v.refresh_token) return v;
      } catch { /* not the entry we want */ }
    }
    return null;
  }

  async function mirrorToExtension() {
    const page = readPageSession();
    if (!page) return; // dashboard logged out — leave the gate's session alone
    try {
      const { [EXT_KEY]: ext } = await chrome.storage.local.get(EXT_KEY);
      if (ext && ext.refresh_token === page.refresh_token) return; // already in sync
      await chrome.storage.local.set({
        [EXT_KEY]: {
          access_token: page.access_token,
          refresh_token: page.refresh_token,
          expires_at: page.expires_at,
          user: page.user,
        },
      });
    } catch { /* extension context gone — ignore */ }
  }

  mirrorToExtension();
  // A login/switch on this same tab won't fire a storage event, so poll as well.
  setInterval(mirrorToExtension, 2000);
  // Catch changes made in other tabs of the same origin.
  window.addEventListener("storage", mirrorToExtension);
})();
