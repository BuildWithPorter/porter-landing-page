import { LegalLayout, Section, Sub, Contact } from "./LegalLayout";

export function Security() {
  return (
    <LegalLayout
      title="Security Policy"
      lastUpdated="May 28, 2026"
      intro={
        <>
          This document describes the security controls Porter Operations LLC
          ("Porter," "we," "us," or "our") has in place to protect customer
          data, third-party integration credentials, and the production
          environment that powers our financial automation platform.
          It is published publicly so customers, prospects, and integration
          partners can review our practices.
        </>
      }
    >
      <p>
        Porter is built to handle sensitive financial and operational data. Our
        security approach focuses on limiting production access, enforcing
        role-based authorization in the product, requiring manual production
        releases, monitoring key infrastructure and vendor surfaces,
        maintaining backup and restore procedures, and documenting incident
        response.
      </p>
      <p>
        As of the date above, Porter has implemented a set of core technical
        controls and is actively maturing the surrounding audit and readiness
        program. Porter does not represent that it has a completed SOC 2,
        ISO 27001, or PCI DSS report today. Porter is in active SOC 2
        readiness work, with SOC 2 Type I targeted first and SOC 2 Type II to
        follow.
      </p>

      <Section title="1. Compliance Status">
        <ul>
          <li><strong>SOC 2 Type I.</strong> In readiness work (targeted).</li>
          <li><strong>SOC 2 Type II.</strong> Planned to follow Type I.</li>
          <li><strong>ISO 27001.</strong> Not pursued at this time.</li>
          <li><strong>PCI DSS (direct).</strong> Out of scope — see Payment Data Scope below.</li>
        </ul>
      </Section>

      <Section title="2. Access Control">
        <ul>
          <li>Production system access is restricted to a small number of internal operators.</li>
          <li>Inside the product, Porter uses role-based authorization for <strong>member</strong>, <strong>admin</strong>, and <strong>owner</strong> boundaries. An <strong>investor</strong> role is read-only and explicitly allow-listed against specific surfaces.</li>
          <li>A production-backed authorization smoke test was run on April 22, 2026 and passed 24/24 checks on sensitive company-admin routes.</li>
          <li>All tenant data is scoped by company identifier at the database query level. Cross-tenant access is structurally impossible in the production application; there is no admin "switch company" backdoor.</li>
          <li>Access reviews are part of Porter's operating security program across source code, infrastructure, identity, and other core vendors.</li>
        </ul>
      </Section>

      <Section title="3. Authentication">
        <ul>
          <li>User authentication is delegated to Kinde, a SOC 2 Type 2 certified identity provider. Porter does not handle user passwords directly.</li>
          <li>Every authenticated API request is gated by a server-side role check using an identity-provider-issued token and per-company role verification.</li>
          <li>All product traffic is TLS 1.2 or higher with HSTS enforced; there are no plaintext endpoints.</li>
        </ul>
      </Section>

      <Section title="4. Secrets And Token Storage">
        <ul>
          <li>Third-party OAuth tokens — including Ramp, QuickBooks Online, Plaid, Stripe, and Helcim — are AES-256-CBC encrypted at rest using an application-managed encryption key stored as a deployment-level environment secret.</li>
          <li>Plaintext tokens never appear in application logs, error tracking, or analytics telemetry.</li>
          <li>Token refresh and revocation are handled server-side; tokens are never exposed to the browser.</li>
        </ul>
      </Section>

      <Section title="5. Payment Data Scope">
        <ul>
          <li>Porter does not store cardholder primary account numbers (PAN), CVV, or magstripe data.</li>
          <li>Card-present and card-not-present transactions are handled by PCI DSS attested payment processors (Stripe, Helcim) via tokenized integrations. Porter receives only post-tokenization transaction references and metadata such as last four digits, brand, and processor transaction identifier.</li>
          <li>This keeps Porter outside the direct PCI DSS scope while still enabling card-platform integrations for customer accounting workflows.</li>
        </ul>
      </Section>

      <Section title="6. Change Management And Release Control">
        <ul>
          <li>Production releases do not happen automatically from code pushes.</li>
          <li>Frontend and backend production deploys are manual release actions.</li>
          <li>High-risk changes are validated through code review, targeted testing, and security checks before release.</li>
        </ul>
      </Section>

      <Section title="7. Infrastructure And Data Protection">
        <ul>
          <li>Porter runs on managed cloud infrastructure (Render) with the application database on Supabase Postgres.</li>
          <li>Sensitive operational logs and audit trails are minimized to avoid storing raw secrets or unnecessary freeform payloads.</li>
          <li>Production database exposure posture and live deployment configuration are part of the recurring security review process.</li>
        </ul>
      </Section>

      <Section title="8. Monitoring And Detection">
        <ul>
          <li>Porter reviews code and dependency alerts from core source-control tooling.</li>
          <li>Porter reviews infrastructure and data-platform security posture, including deployment configuration and database exposure.</li>
          <li>Application errors are captured in our error tracker with personally identifiable information scrubbing enabled.</li>
          <li>Application and vendor alerts are part of the ongoing security program where configured and relevant.</li>
        </ul>
      </Section>

      <Section title="9. Backup And Recovery">
        <ul>
          <li>Porter maintains database backups and a documented restore procedure.</li>
          <li>A full production-backup restore drill was completed on April 22, 2026 against a scratch environment and successfully recovered the application schema and representative production data.</li>
        </ul>
      </Section>

      <Section title="10. Incident Response">
        <ul>
          <li>Porter maintains a written incident, token-compromise, and restore runbook.</li>
          <li>The runbook covers containment, credential rotation, evidence preservation, rollback, and customer communication expectations.</li>
          <li>Porter also maintains a tabletop template for sensitive-data and token-compromise scenarios.</li>
        </ul>
      </Section>

      <Section title="11. Vendor And AI Data Handling">
        <ul>
          <li>Porter uses a small set of service providers to operate the product, including infrastructure, identity, payments, observability, analytics, and AI services.</li>
          <li>AI and other subprocessors are treated as part of the security review program, with explicit attention to what data leaves Porter, how long it is retained, and who can access it.</li>
          <li>Porter is continuing to formalize the written vendor-disclosure and retention sign-off materials as part of current security readiness work.</li>
          <li>The current list of named subprocessors is published at <a href="/legal/subprocessors">/legal/subprocessors</a>.</li>
        </ul>
      </Section>

      <Section title="12. Reporting A Security Issue">
        <p>
          If you believe you have discovered a vulnerability or security issue
          in Porter, please email{" "}
          <a href="mailto:security@buildwithporter.com">security@buildwithporter.com</a>.
          We will acknowledge receipt within one business day.
          Investigations are led by Porter's founder. Please do not publicly
          disclose suspected vulnerabilities until we have had a reasonable
          opportunity to investigate and remediate.
        </p>
      </Section>

      <Section title="13. Frequently Asked Questions">
        <Sub title="Who can access production data?">
          <p>
            Production access is restricted to a small number of internal
            operators, and access is reviewed across core systems. Within the
            product, role-based controls separate member, admin, owner, and
            investor actions.
          </p>
        </Sub>
        <Sub title="How do you prevent unauthorized actions in the product?">
          <p>
            Porter enforces role-based authorization at the application layer,
            and production-backed smoke tests are run against sensitive
            company-admin routes to verify those boundaries.
          </p>
        </Sub>
        <Sub title="How do you control production releases?">
          <p>
            Production deploys are manual. Code pushes alone do not
            automatically release frontend or backend changes to customers.
          </p>
        </Sub>
        <Sub title="Do you back up customer data?">
          <p>
            Yes. Porter maintains backups and has a documented restore
            procedure. A recent restore drill successfully recovered the
            application schema and representative production data into a
            scratch environment.
          </p>
        </Sub>
        <Sub title="Do you monitor security issues?">
          <p>
            Yes. Porter's security program includes recurring review of code
            and dependency alerts, infrastructure posture, database exposure,
            deployment configuration, access review, and incident-readiness
            artifacts.
          </p>
        </Sub>
        <Sub title="Do you use AI vendors?">
          <p>
            Yes, where product features require it. Porter treats AI providers
            as subprocessors and reviews those data flows as part of the
            vendor security program.
          </p>
        </Sub>
        <Sub title="Are you SOC 2 compliant?">
          <p>
            Porter does not represent that it has a completed SOC 2 report
            today. Porter is in active SOC 2 readiness work, with SOC 2 Type I
            targeted first and SOC 2 Type II to follow.
          </p>
        </Sub>
        <Sub title="Are you PCI DSS compliant?">
          <p>
            Porter is outside the direct PCI DSS scope. Card data is handled
            by PCI DSS attested payment processors (Stripe, Helcim); Porter
            does not store PAN, CVV, or magstripe data.
          </p>
        </Sub>
      </Section>

      <Contact>
        <p>
          Questions about this security policy or Porter's security program?
          Email{" "}
          <a href="mailto:security@buildwithporter.com">security@buildwithporter.com</a>.
        </p>
      </Contact>
    </LegalLayout>
  );
}
