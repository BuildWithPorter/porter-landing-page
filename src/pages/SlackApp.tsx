import { LegalLayout, Section, Contact, Important } from "./LegalLayout";

// Reason: Porter's Slack install is account-bound — the bot returns the
// customer's own Porter data, so installation begins inside Porter after
// sign-in (POST /{company_id}/connect requires an authenticated owner/admin),
// not from a public "Add to Slack" OAuth link. CONFIRM this points at the
// production app URL before shipping.
const PORTER_APP_URL = "https://app.buildwithporter.com";

export function SlackApp() {
  return (
    <LegalLayout
      path="/slack"
      seoDescription="Ask Porter anything about your company's finances right inside Slack — bookkeeping questions, cash position, past-due invoices, payroll details. No tab-switching."
      seoTitle="Porter for Slack — finance answers in Slack"
      eyebrow="Porter for Slack"
      title="Porter AI for Slack"
      intro={
        <>
          Porter is an AI-native finance platform. The Porter app for Slack lets
          you and your team ask Porter anything about your company's finances —
          right from the Slack conversations you're already in. It is read-only
          to your Porter data: ask questions and get answers, with nothing in
          your books changed from Slack.
        </>
      }
    >
      {/* AI accuracy disclaimer — required by Slack Marketplace preliminary
         review. /slack uses LegalLayout, which has no global footer, so the
         disclaimer lives here (as a visible callout near the top of the page). */}
      <Important>
        Porter AI uses generative AI. Its responses, summaries, and other
        outputs can be incomplete or inaccurate, and should be verified before
        you rely on them.
      </Important>

      <Section title="What you can do">
        <p>Message Porter AI in Slack to get instant answers about your books, including:</p>
        <ul>
          <li>How a transaction was, or should be, categorized</li>
          <li>What&rsquo;s outstanding in receivables and payables</li>
          <li>Current cash balances across your accounts</li>
          <li>Insights, trends, and variance questions about your financials</li>
        </ul>
        <p>Porter answers from your connected Porter data and never edits your books from Slack.</p>
      </Section>

      <Section title="How it works in Slack">
        <ul>
          <li><strong>Direct message Porter AI.</strong> Open a DM with the Porter AI app and ask a question in plain language — Porter replies privately.</li>
          <li><strong>Mention it in a channel.</strong> Add Porter AI to a channel and @mention it; it reads only the message that mentions it and replies in thread.</li>
          <li><strong>Follow up naturally.</strong> Porter keeps the context of your conversation, so you can ask follow-up questions like &ldquo;what about last quarter?&rdquo;</li>
        </ul>
      </Section>

      <Section title="How to install">
        <p>
          Because Porter for Slack returns your company&rsquo;s own financial
          data, you connect it from inside Porter after signing in. This securely
          links your Slack workspace to your Porter account.
        </p>
        <ol>
          <li>Sign in to your Porter account.</li>
          <li>Go to <strong>Settings → Integrations → Slack</strong>.</li>
          <li>Click <strong>Connect Slack</strong> and choose your workspace.</li>
          <li>Review and approve the requested permissions.</li>
          <li>In Slack, message <strong>@Porter AI</strong> or add it to a channel, then start asking.</li>
        </ol>
        <p style={{ marginTop: "1.5rem" }}>
          <a
            href={PORTER_APP_URL}
            style={{
              display: "inline-block",
              background: "#1b1b1f",
              color: "#fff",
              padding: "0.8rem 1.6rem",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Sign in to Porter to add Slack
          </a>
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Don&rsquo;t have a Porter account yet? <a href="/">Learn more about Porter</a>.
        </p>
      </Section>

      <Section title="Permissions, data &amp; privacy">
        <p>
          The Porter Slack app is read-only with respect to your finances and
          follows the principle of least privilege. For details on the data we
          access and how we protect it, see our{" "}
          <a href="/privacy-policy">Privacy Policy</a>, our{" "}
          <a href="/legal/subprocessors">sub-processors</a>, and our{" "}
          <a href="/terms-of-service">Terms of Service</a>.
        </p>
      </Section>

      <Section title="Need help?">
        <p>
          Visit our <a href="/support">support page</a> or email{" "}
          <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a>.
          We respond within 2 business days — no account required.
        </p>
      </Section>

      <Contact>
        <p>
          <strong>Porter Operations LLC</strong><br />
          Email: <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a><br />
          New York, NY, United States
        </p>
      </Contact>
    </LegalLayout>
  );
}
