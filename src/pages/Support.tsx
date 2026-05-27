import { LegalLayout, Section, Contact } from "./LegalLayout";

export function Support() {
  return (
    <LegalLayout
      eyebrow="Support"
      title="Porter Support"
      intro={
        <>
          Need help with Porter or the Porter app for Slack? We&rsquo;re here. You
          can reach our team directly — no account or sign-up required.
        </>
      }
    >
      <Section title="Contact us">
        <p>
          Email <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a>{" "}
          with any question or issue. We respond to all support requests within{" "}
          <strong>2 business days</strong>, and usually sooner.
        </p>
      </Section>

      <Section title="What to include">
        <p>To help us resolve your issue quickly, please include:</p>
        <ul>
          <li>A short description of the problem or question</li>
          <li>What you expected to happen, and what happened instead</li>
          <li>Where you ran into it — the Porter app, Slack, or email</li>
          <li>Your Slack workspace name, if the issue is with the Slack app</li>
          <li>Screenshots, if they help explain the issue</li>
        </ul>
      </Section>

      <Section title="Security &amp; privacy">
        <p>
          To report a security concern, email{" "}
          <a href="mailto:security@buildwithporter.com">security@buildwithporter.com</a>.
          For details on how we handle your data, see our{" "}
          <a href="/privacy-policy">Privacy Policy</a> and our{" "}
          <a href="/legal/subprocessors">sub-processors</a>.
        </p>
      </Section>

      <Section title="Helpful links">
        <ul>
          <li><a href="/slack">Porter for Slack — overview &amp; install</a></li>
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/terms-of-service">Terms of Service</a></li>
          <li><a href="/legal/subprocessors">Sub-processors</a></li>
        </ul>
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
