import { Link } from "react-router-dom";

// Privacy policy for the Chrome Web Store listing (required because the app
// stores an email + reading history). Content reflects what Reading Gate
// actually collects and how it's used. To show a concrete support address,
// set CONTACT_EMAIL; left null, the policy points at the Web Store contact.
const CONTACT_EMAIL = null; // e.g. "support@yourdomain.com"
const UPDATED = "July 2026";

export default function Privacy() {
  return (
    <div className="rg-about">
      <div className="rg-about-scroll">
        <article className="rg-legal">
          <header className="rg-legal-head">
            <Link className="rg-legal-back" to="/">← Back</Link>
            <h1>Privacy Policy</h1>
            <p className="rg-legal-meta">Last updated: {UPDATED}</p>
          </header>

          <p>
            Reading Gate is a browser extension and companion web dashboard that makes you read and
            summarize a news article before a distracting site unlocks, and tracks what you've read.
            This policy explains what we collect, why, and how it's handled.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account information</strong> — your email address when you create an account or sign in.</li>
            <li><strong>Reading activity</strong> — the summaries you write, the quality and interest ratings you give, and basic metadata about each article (title, source, genre, timestamp).</li>
            <li><strong>Gate activity</strong> — when the gate is triggered on a site you've chosen to block (the domain, a timestamp, and whether you completed the reading).</li>
            <li><strong>Your settings</strong> — the sites on your blocklist, your selected interests, any custom sources you add, your theme, and how many articles you require per unlock.</li>
          </ul>

          <h2>How we use it</h2>
          <p>
            We use this information only to provide the product: to enforce the gate on the sites you
            choose, recommend articles that match your interests, record your reading history, and show
            it back to you in your dashboard. We do <strong>not</strong> use it for advertising.
          </p>

          <h2>Where your data is stored</h2>
          <p>
            Your data is stored in <strong>Supabase</strong> (a hosted database and authentication
            service) on our behalf, over encrypted connections. Access is protected by row-level
            security so each account can only read and write its own data.
          </p>

          <h2>Sharing</h2>
          <p>
            We do <strong>not</strong> sell your personal information, and we do not share it with
            advertisers or data brokers. The only third party that processes your data is our backend
            provider (Supabase). Article content is fetched from public news sources (such as the BBC,
            NPR, and the Guardian); the extension requests publicly available articles from them and
            does not send your personal information to those sources.
          </p>

          <h2>Browser permissions</h2>
          <p>The extension requests only the permissions it needs to work:</p>
          <ul>
            <li><strong>tabs</strong> and <strong>webNavigation</strong> — to detect when you open or navigate to a site you've blocked, so the gate can appear.</li>
            <li><strong>storage</strong> — to keep your settings, sign-in session, and gate state on your device.</li>
            <li><strong>alarms</strong> — to time the grace period when you leave a tab.</li>
            <li><strong>host access</strong> — because you can block any site, the extension must be able to run on any site to enforce the gate and fetch public articles.</li>
          </ul>

          <h2>Retention and deletion</h2>
          <p>
            We keep your data for as long as your account is active. You can ask us to delete your
            account and associated data at any time using the contact below, and we will remove it.
          </p>

          <h2>Children</h2>
          <p>Reading Gate is not directed to children under 13, and we do not knowingly collect their data.</p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by the
            "Last updated" date above.
          </p>

          <h2>Contact</h2>
          <p>
            {CONTACT_EMAIL ? (
              <>Questions or deletion requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
            ) : (
              <>For questions or data-deletion requests, contact us at the developer email listed on the
              Reading Gate listing in the Chrome Web Store.</>
            )}
          </p>

          <p className="rg-legal-foot">
            <Link className="rg-pill" to="/">Back to home</Link>
          </p>
        </article>
      </div>
    </div>
  );
}
