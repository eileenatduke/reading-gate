# AI / MCP exemption (Spec §4)

**Requirement:** when an AI agent (e.g. Claude operating the computer via MCP)
opens a blocked site like Instagram, it must **not** hit the gate. Only humans get
gated.

## How it's done — architecturally, not by detection

The gate only exists where the extension is installed. Do **not** try to detect
automation (no `navigator.webdriver` sniffing — it's fragile and an anti-pattern).

Instead, **separate the browser profiles**:

- **Human profile:** install the Reading Gate extension here. This is the surface that
  gets gated.
- **AI / automation profile:** a *separate* Chrome/Chromium profile (or a
  Playwright/Puppeteer `userDataDir`) with the extension **not installed**. The AI
  operates here on an un-gated surface. There is nothing to detect and nothing to
  bypass.

Both surfaces can still use the same Supabase backend if needed — the exemption is
purely about where the gate is present.

## Concrete setup

### Option A — a dedicated Chrome profile for automation
1. Chrome → profile menu → **Add** → create e.g. "Automation".
2. Do **not** install Reading Gate in that profile.
3. Point your MCP/computer-use tooling at that profile
   (`--profile-directory="Profile N"` or a distinct `--user-data-dir`).

### Option B — Playwright/Puppeteer (already isolated)
A fresh `launch()` context has no extensions by default, so it's already un-gated:

```js
const ctx = await chromium.launchPersistentContext("/path/to/ai-profile", {
  headless: false,
  // no extension loaded here → no gate
});
```

Keep the extension only in your personal, day-to-day profile. That's the whole
mechanism.
