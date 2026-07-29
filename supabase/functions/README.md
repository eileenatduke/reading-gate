# supabase/functions/

Supabase Edge Functions (Deno) — server-side code that holds secrets the client can't.

## `verify-summary` — the AI anti-gaming check (Spec §11 v2)

The reading gate is only meaningful if the summary reflects a real read. Without this,
a user can type random text without opening the article (and most set their article
goal to 1 to get past fast), so the dashboard would measure nothing real. This function
runs an AI check on submit: given the article the reader was shown and the summary they
wrote, it decides whether the summary is a genuine, on-topic reflection of the article,
or gibberish / filler / a copy of the blurb / off-topic text.

**Why a function and not the extension:** the extension ships only the *public* anon
key, so it can't hold a paid LLM key. The key lives here as a Supabase secret and is
never exposed to the client. Supabase verifies the caller's JWT before the function
runs (`verify_jwt` is on by default), so only signed-in users can reach it.

**Fail-open:** if the key is missing or the LLM call errors/times out, the function
returns `{ verdict: "skip" }` and the gate keeps its v1 behavior (70 words + both
ratings). A backend hiccup never traps a real reader. Only an explicit `fail` verdict
holds the gate.

### Deploy

```bash
# 1. Set the LLM key (kept server-side; never in the extension)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2. (optional) pick the judging model — defaults to a fast, low-cost classifier
supabase secrets set VERIFY_MODEL=claude-haiku-4-5

# 3. Deploy
supabase functions deploy verify-summary
```

The extension finds the function automatically at
`<SUPABASE_URL>/functions/v1/verify-summary`. Override with the `VERIFY_URL` config
value, or turn the check off entirely with `AI_SUMMARY_CHECK: false` (extension
Options → config). If you never set `ANTHROPIC_API_KEY`, everything still works — the
gate simply behaves as it did before the check existed.

### Request / response

```jsonc
// POST body
{
  "article": { "title": "...", "source": "BBC", "genre": "Technology", "blurb": "..." },
  "summary": "the reader's ≥70-word summary",
  "signals": { "openedArticle": true, "dwellSeconds": 143 }
}

// Response
{ "verdict": "pass" | "fail" | "skip", "checked": true, "confidence": 0.9, "reason": "..." }
```
