// Anti-gaming summary check (build spec §11 "Future / v2").
//
// Calls the `verify-summary` Supabase Edge Function, which runs an AI check on the
// summary the reader wrote against the article they were shown. The paid LLM key
// lives server-side in that function (never in the extension), so all we send from
// here is the article context + summary + a couple of behavioral signals, signed
// with the user's access token.
//
// FAIL-OPEN: any problem reaching or reading the function (not configured, network
// down, non-JSON, etc.) resolves to `{ ok: true, checked: false }` — a backend
// hiccup must never trap a real reader behind the gate. The function itself also
// returns verdict "skip" for the same reason. Only an explicit "fail" verdict
// blocks the submit.

import { getConfig } from "./config.js";
import { accessToken } from "./sb.js";

function verifyUrl(cfg) {
  if (cfg.VERIFY_URL) return cfg.VERIFY_URL.replace(/\/$/, "");
  if (!cfg.SUPABASE_URL) return null;
  return `${cfg.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/verify-summary`;
}

// Returns { ok: boolean, checked: boolean, reason?: string }.
//  - ok:false  → block the submit and show `reason` to the reader.
//  - ok:true, checked:true  → the AI check passed.
//  - ok:true, checked:false → the check was skipped (disabled / unavailable); allow.
export async function verifySummary({ article, summary, signals }) {
  const cfg = await getConfig();

  // Explicit off-switch for anyone who wants the pre-AI behavior.
  if (cfg.AI_SUMMARY_CHECK === false) return { ok: true, checked: false };

  const url = verifyUrl(cfg);
  if (!url || !cfg.SUPABASE_ANON_KEY) return { ok: true, checked: false };

  let token;
  try {
    token = await accessToken();
  } catch {
    token = null;
  }
  if (!token) return { ok: true, checked: false };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        article: {
          title: article?.title,
          source: article?.source,
          genre: article?.genre,
          blurb: article?.blurb,
        },
        summary,
        signals,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn("[gate:verify] check unavailable", res.status);
      return { ok: true, checked: false };
    }

    const data = await res.json();
    if (data.verdict === "fail") {
      return {
        ok: false,
        checked: true,
        reason:
          data.reason ||
          "That summary doesn't look like a genuine read of the article. Open it, then write what it was actually about.",
      };
    }
    // "pass" or "skip" (or anything unexpected) → let the reader through.
    return { ok: true, checked: data.verdict === "pass" };
  } catch (e) {
    console.warn("[gate:verify] check failed, allowing", e.message);
    return { ok: true, checked: false };
  }
}
