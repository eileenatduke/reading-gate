// Supabase Edge Function: verify-summary
//
// The anti-gaming check (build spec §11 "Future / v2"). The reading gate is only
// meaningful if the summary reflects a real read — Stefan and Max both flagged that
// today you can type random text without opening the article and set the goal to 1.
// This runs an AI check server-side: given the article the user was shown and the
// summary they wrote, decide whether the summary is a genuine, on-topic reflection of
// the article, or gibberish / filler / a copy of the blurb / off-topic text.
//
// WHY A SERVER FUNCTION: the extension is client-side and ships only the *public*
// anon key, so it cannot hold a paid LLM key. This function holds `ANTHROPIC_API_KEY`
// as a Supabase secret (never exposed to the client) and is called by the gate with
// the user's JWT. Supabase verifies that JWT before the function runs (verify_jwt is
// on by default), so only signed-in users can reach it.
//
// FAIL-OPEN: if the key is missing or the LLM call errors/times out, the function
// returns `{ verdict: "skip" }` so a backend/infra problem never traps a real reader
// behind the gate. The client treats "skip" as a pass. The check hardens the gate
// against casual gaming; it is not a hard security boundary.
//
// Deploy:  supabase functions deploy verify-summary
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional secrets:
//   VERIFY_MODEL     — model id (default: claude-haiku-4-5; a fast, low-cost
//                      classifier — this runs on every gate submit and the product
//                      targets a $0/near-$0 running cost, so a Haiku-tier model fits;
//                      swap to a larger model here if you want stricter judging)

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5";
const MIN_WORDS = 70;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// A "skip" result means: don't judge, let the reader through. Used for every path
// where we can't get a trustworthy verdict (no key, bad LLM response, network error).
function skip(reason: string): Response {
  return json({ verdict: "skip", checked: false, reason });
}

interface VerifyRequest {
  article?: { title?: string; source?: string; genre?: string; blurb?: string };
  summary?: string;
  signals?: { openedArticle?: boolean; dwellSeconds?: number };
}

const SYSTEM_PROMPT = `You are the integrity check for "Reading Gate", an app that makes a person read and summarize a news article before a distracting site unlocks. Your only job is to decide whether a submitted summary shows the person actually engaged with the article, or whether they are gaming the gate.

You are given the article's headline, source, genre, and short blurb, plus the summary the person wrote. You do NOT have the full article text — only the headline and blurb — so you must judge on topical consistency and authenticity, not on completeness.

Return verdict "fail" ONLY when there is clear evidence of gaming:
- Gibberish, keyboard mashing, or random characters ("asdf jkl", "aaaa bbbb").
- Repeated or padded filler to reach the word count ("this is a good article " repeated, lorem ipsum, copy-pasted sentences).
- Text that is clearly unrelated to the headline/blurb topic (writing about the weather when the article is about an election).
- A near-verbatim copy of the provided blurb with nothing of the person's own.
- Text that is plainly not a summary of a news article at all.

Return verdict "pass" when the summary is a plausible, on-topic, human-written summary of THIS article. Be generous:
- The person read the full article, so legitimate summaries will contain specifics, names, numbers, or opinions NOT present in the short blurb. That is a sign of real reading, not a reason to fail.
- Imperfect grammar, brevity, terseness, or a personal/opinionated tone are all fine.
- Reasonable paraphrase of the blurb PLUS the person's own framing is fine.
- When genuinely uncertain, pass. False accusations are worse than an occasional miss.

Weigh the behavioral signals (whether they opened the article, seconds spent) as weak supporting evidence only — never fail on signals alone if the text itself reads like a real summary.`;

async function judge(
  apiKey: string,
  model: string,
  article: VerifyRequest["article"],
  summary: string,
  signals: VerifyRequest["signals"],
): Promise<Response> {
  const userContent = [
    "ARTICLE",
    `Headline: ${article?.title || "(unknown)"}`,
    `Source: ${article?.source || "(unknown)"}`,
    `Genre: ${article?.genre || "(unknown)"}`,
    `Blurb: ${article?.blurb || "(none provided)"}`,
    "",
    "BEHAVIORAL SIGNALS",
    `Opened the article link: ${signals?.openedArticle ? "yes" : "no"}`,
    `Seconds between opening and submitting: ${
      Number.isFinite(signals?.dwellSeconds) ? Math.round(signals!.dwellSeconds!) : "unknown"
    }`,
    "",
    "SUMMARY THE PERSON WROTE",
    summary,
  ].join("\n");

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["pass", "fail"] },
                confidence: { type: "number" },
                reason: { type: "string" },
              },
              required: ["verdict", "confidence", "reason"],
              additionalProperties: false,
            },
          },
        },
      }),
      // Guard against a slow model response holding the reader hostage.
      signal: AbortSignal.timeout(12000),
    });
  } catch (e) {
    return skip("llm_request_failed: " + (e instanceof Error ? e.message : String(e)));
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error("[verify-summary] anthropic", resp.status, txt);
    return skip(`llm_status_${resp.status}`);
  }

  let data: { content?: Array<{ type: string; text?: string }> };
  try {
    data = await resp.json();
  } catch {
    return skip("llm_bad_json_envelope");
  }

  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock?.text) return skip("llm_no_text");

  let parsed: { verdict?: string; confidence?: number; reason?: string };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return skip("llm_unparseable_verdict");
  }

  const verdict = parsed.verdict === "fail" ? "fail" : "pass";
  return json({
    verdict,
    checked: true,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : verdict === "fail"
          ? "This doesn't look like a genuine summary of the article."
          : "",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  // No key configured → the gate keeps its existing behavior (word count + ratings).
  if (!apiKey) return skip("no_api_key");

  let payload: VerifyRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const summary = (payload.summary || "").trim();
  // Nothing to judge if the summary is empty or below the hard word minimum the
  // client already enforces — treat as skip rather than a fake "fail".
  const wordCount = (summary.match(/\S+/g) || []).length;
  if (!summary || wordCount < MIN_WORDS) return skip("below_min_words");

  const model = Deno.env.get("VERIFY_MODEL") || DEFAULT_MODEL;

  try {
    return await judge(apiKey, model, payload.article, summary, payload.signals);
  } catch (e) {
    console.error("[verify-summary]", e);
    return skip("unexpected_error");
  }
});
