import { Contact, LegalLayout, Section } from "./LegalLayout";

// Reason: The public page has no workspace ID. Porter's direct Ramp setup route requires one.
const RAMP_SETUP_URL = "https://app.buildwithporter.com/settings?tab=integrations";

export function RampApp() {
  return (
    <LegalLayout
      path="/ramp"
      seoTitle="Porter for Ramp | Setup and support"
      seoDescription="Connect Ramp to Porter to review settled card activity, Bill Pay bills and payments, and sync status."
      eyebrow="Porter for Ramp"
      title="Connect Ramp to Porter"
      intro="Bring Ramp card spending and bills alongside your books so your finance team can see what came in and what needs attention."
    >
      <Section title="What comes into Porter">
        <ul>
          <li>Settled Ramp card activity appears in Bank Activity for review and categorization.</li>
          <li>Ramp Bill Pay bills and their payments appear in Payables. Bills still awaiting approval in Ramp may need review before they appear in your books.</li>
          <li>The Ramp integration shows separate sync status for card activity and Bill Pay.</li>
        </ul>
        <p>Porter imports card activity after it settles, starting from the card sync start date shown in the Ramp integration. Ramp checking and investment activity are outside the transaction import.</p>
      </Section>

      <Section title="How to connect">
        <ol>
          <li>Sign in to Porter and select the workspace you want to connect.</li>
          <li>Go to <strong>Settings → Integrations → Ramp</strong> and select <strong>Connect</strong>.</li>
          <li>Sign in to Ramp and approve the requested access. A Ramp admin or business owner can authorize access for the business.</li>
          <li>Return to Porter and open Ramp again to review the connection and sync status.</li>
        </ol>
        <p style={{ marginTop: "1.5rem" }}>
          <a
            href={RAMP_SETUP_URL}
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
            Sign in to Porter to connect Ramp
          </a>
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Need a Porter account? <a href="/">Learn more about Porter</a>.
        </p>
      </Section>

      <Section title="Sync and reconnect">
        <p>
          Porter checks for card activity and Bill Pay updates separately. Open Ramp
          in Integrations to see the latest status for each. Select <strong>Sync</strong>{" "}
          to refresh card activity. If Porter prompts you to reconnect, select{" "}
          <strong>Reconnect</strong> and approve access in Ramp.
        </p>
      </Section>

      <Section title="Permissions, data and privacy">
        <p>
          Porter uses the access you approve to read Ramp data for your workspace.
          To stop future imports, open <strong>Settings → Integrations → Ramp</strong>{" "}
          and select <strong>Disconnect Ramp</strong>. For details on how Porter handles
          data, see the <a href="/privacy-policy">Privacy Policy</a>,{" "}
          <a href="/legal/subprocessors">sub-processors</a>, and{" "}
          <a href="/terms-of-service">Terms of Service</a>.
        </p>
      </Section>

      <Section title="Need help?">
        <p>
          If activity is missing, check the connection and the status of the
          relevant sync. For help, visit <a href="/support">Porter support</a> or
          email <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a>{" "}
          with your Ramp business name and the approximate date of the missing
          transaction or bill.
        </p>
      </Section>

      <Contact>
        <p>
          <strong>Porter Agents Inc.</strong><br />
          Email <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a><br />
          New York, NY, United States
        </p>
      </Contact>
    </LegalLayout>
  );
}
