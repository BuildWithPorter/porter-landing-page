import { LegalLayout, Section, Sub, Contact } from "./LegalLayout";
import "./SmsConsent.css";

export function SmsConsent() {
  return (
    <LegalLayout
      path="/sms-consent"
      seoDescription="Public proof of Porter's authenticated SMS opt-in flow, including the in-app profile screen, verification step, and SMS program disclosures."
      seoTitle="SMS Opt-In Proof · Porter"
      eyebrow="SMS Compliance"
      title="SMS Opt-In Proof"
      intro={
        <>
          Porter SMS access is available only to authenticated Porter customers
          who enter a mobile number in their profile and complete SMS
          verification before Porter stores the number for normal text access.
        </>
      }
    >
      {/* Reason: Twilio A2P reviewers need a public proof URL for the login-gated SMS opt-in flow. */}
      <Section title="Authenticated opt-in screen">
        <p>
          The SMS opt-in control lives inside the Porter app at{" "}
          <strong>Settings &gt; General &gt; Your Profile</strong>. A signed-in
          customer enters a mobile number in E.164 format and clicks{" "}
          <strong>Send Code</strong>. Porter sends a verification text to that
          number before using it for SMS access.
        </p>

        <figure className="sms-consent__figure">
          <img
            src="/sms-consent-profile.png"
            alt="Porter Settings profile screen showing the SMS Phone Number field, consent copy, and Send Code button"
          />
          <figcaption>
            Screenshot of the Porter profile SMS opt-in screen. The number shown
            is a non-customer test number used only for this public proof page.
          </figcaption>
        </figure>
      </Section>

      <Section title="Verification flow">
        <Sub title="Step 1">
          <p>
            The customer signs in at{" "}
            <a href="https://app.buildwithporter.com">app.buildwithporter.com</a>
            {" "}and opens Settings &gt; General &gt; Your Profile.
          </p>
        </Sub>
        <Sub title="Step 2">
          <p>
            The customer enters their mobile number and clicks{" "}
            <strong>Send Code</strong>. Porter sends a one-time SMS verification
            code to that number.
          </p>
        </Sub>
        <Sub title="Step 3">
          <p>
            The customer enters the verification code in Porter and clicks{" "}
            <strong>Verify</strong>. Porter stores the phone number only after
            Twilio Verify approves the code.
          </p>
        </Sub>
        <Sub title="Step 4">
          <p>
            Once verified, the customer can text the Porter number for service
            access related to finance questions, receipts, documents, support,
            and work on their books.
          </p>
        </Sub>
      </Section>

      <Section title="SMS program disclosures">
        <ul>
          <li>SMS access is only for authenticated Porter customers with active access.</li>
          <li>Message frequency varies based on customer requests and account activity.</li>
          <li>Message and data rates may apply.</li>
          <li>Reply STOP to opt out.</li>
          <li>Reply HELP for help.</li>
          <li>
            Mobile opt-in and text message consent are not shared with third
            parties or affiliates for marketing or promotional purposes.
          </li>
        </ul>
      </Section>

      <Section title="Public policy links">
        <ul>
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/terms-of-service">Terms and Conditions</a></li>
          <li><a href="/support">Support</a></li>
        </ul>
      </Section>

      <Contact>
        <p>
          <strong>Porter Agents Inc.</strong><br />
          Support: <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a><br />
          Website: <a href="https://buildwithporter.com">buildwithporter.com</a>
        </p>
      </Contact>
    </LegalLayout>
  );
}
