import { getConfig } from "./lib/config.js";
import { signIn, signUp, getSession, currentUser } from "./lib/sb.js";

const $ = (id) => document.getElementById(id);
const show = (id) => {
  ["create", "done"].forEach((x) => $(x).classList.toggle("hidden", x !== id));
};

// true = create account, false = log in. The welcome page defaults to sign-up because
// this tab only opens on a fresh install, but we let returning users switch to log in.
let isSignup = true;

async function dashboardBase() {
  const cfg = await getConfig();
  return (cfg.DASHBOARD_URL || "https://reading-gate.vercel.app").replace(/\/$/, "");
}

// Open the web dashboard's Settings page in this same tab, handing off the current Supabase
// session in the URL hash so the user arrives already signed in — no second login. The hash
// (not the query string) keeps the tokens off the wire; the dashboard adopts and strips them
// on load (see dashboard/src/lib/auth.jsx). Mirrors popup.js:openDashboard.
async function goToSettings() {
  const base = await dashboardBase();
  const session = await getSession();
  let url = base + "/settings";
  if (session?.access_token && session?.refresh_token) {
    const frag = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    url += "#" + frag.toString();
  }
  window.location.assign(url);
}

function applyMode() {
  if (isSignup) {
    $("create-title").textContent = "Create your account";
    $("create-lead").textContent = "Sign up with an email and password to get started.";
    $("submit").textContent = "Create account";
    $("password").setAttribute("autocomplete", "new-password");
    $("switch-text").textContent = "Already have an account?";
    $("switch-mode").textContent = "Log in";
  } else {
    $("create-title").textContent = "Welcome back";
    $("create-lead").textContent = "Log in with your email and password.";
    $("submit").textContent = "Log in";
    $("password").setAttribute("autocomplete", "current-password");
    $("switch-text").textContent = "Need an account?";
    $("switch-mode").textContent = "Create one";
  }
  $("create-err").textContent = "";
}

async function submit() {
  $("create-err").textContent = "";
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) {
    $("create-err").textContent = "Enter an email and password.";
    return;
  }

  $("submit").disabled = true;
  try {
    const session = await (isSignup ? signUp : signIn)(email, password);
    // signUp returns null when the project requires email confirmation (no session yet).
    if (!session) {
      $("create-err").textContent =
        "Check your email to confirm your account, then log in here.";
      isSignup = false;
      applyMode();
      return;
    }
    // Prime the article pool and blocklist for the new account, same as the popup does.
    try { await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKLIST" }); } catch {}
    try { await chrome.runtime.sendMessage({ type: "REFILL_POOL" }); } catch {}
    show("done");
  } catch (e) {
    $("create-err").textContent = e.message;
  } finally {
    $("submit").disabled = false;
  }
}

async function init() {
  // If this account is already signed in (e.g. the tab was reopened), skip straight to
  // the "all set" step rather than asking them to sign up again.
  const user = await currentUser();
  if (user) show("done");
  else show("create");

  $("submit").addEventListener("click", submit);
  $("password").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  $("switch-mode").addEventListener("click", () => { isSignup = !isSignup; applyMode(); });
  $("go-settings").addEventListener("click", goToSettings);
}

init();
