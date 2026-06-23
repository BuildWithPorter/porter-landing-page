import { LegalLayout, Section, Sub, Contact, Footnote } from "./LegalLayout";

export function PrivacyPolicy() {
  return (
    <LegalLayout
      path="/privacy-policy"
      seoDescription="How Porter collects, uses, and protects your information. Covers QuickBooks data access, AI processing, security practices, retention, and your privacy rights."
      title="Privacy Policy"
      lastUpdated="January 14, 2026"
      intro={
        <>
          Porter Operations LLC ("Porter," "we," "us," or "our") is committed to
          protecting your privacy. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our financial
          automation platform and services (the "Service").
        </>
      }
    >
      <p>
        By using Porter, you agree to the collection and use of information in
        accordance with this Privacy Policy. If you do not agree with our policies
        and practices, please do not use our Service.
      </p>

      <Section title="1. Information We Collect">
        <Sub title="1.1 Information You Provide">
          <ul>
            <li><strong>Account information.</strong> When you create an account, we collect your name, email address, company name, and password.</li>
            <li><strong>Payment information.</strong> If you subscribe to paid features, our payment processor collects billing information. We do not store complete credit card numbers.</li>
            <li><strong>Communications.</strong> If you contact us, we collect the information you provide in your communications.</li>
          </ul>
        </Sub>
        <Sub title="1.2 Financial Data from QuickBooks Online">
          <p>When you connect Porter to your QuickBooks Online account, we access and store the following data with your explicit authorization:</p>
          <ul>
            <li>Company information</li>
            <li>Chart of accounts</li>
            <li>Transactions (invoices, bills, expenses, journal entries, etc.)</li>
            <li>Customers and vendors</li>
            <li>Bank account information and transactions</li>
            <li>Financial reports and balances</li>
            <li>Custom fields and tags</li>
          </ul>
        </Sub>
        <Sub title="1.3 Automatically Collected">
          <ul>
            <li><strong>Usage data.</strong> We collect information about how you interact with Porter, including features used, pages viewed, and time spent on the Service.</li>
            <li><strong>Device information.</strong> We collect information about the device and browser you use, including IP address, browser type, and operating system.</li>
            <li><strong>Cookies.</strong> We use cookies and similar tracking technologies to improve your experience. You can control cookie preferences through your browser settings.</li>
          </ul>
        </Sub>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve Porter's financial automation services</li>
          <li>Process and analyze your financial data to generate insights, reports, and recommendations</li>
          <li>Sync data between Porter and your QuickBooks Online account</li>
          <li>Identify and categorize transactions automatically</li>
          <li>Detect anomalies and provide variance analysis</li>
          <li>Send service-related notifications and updates</li>
          <li>Respond to your requests and provide customer support</li>
          <li>Monitor and analyze usage patterns to improve our Service</li>
          <li>Detect, prevent, and address technical issues and security threats</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="3. AI Processing & Third-Party Services">
        <Sub title="3.1 AI-Powered Features">
          <p>Porter uses artificial intelligence to analyze your financial data and provide insights. When you use AI-powered features:</p>
          <ul>
            <li>Your financial data may be processed by third-party AI service providers (including OpenAI and Anthropic)</li>
            <li>Data is transmitted securely and used solely to provide the requested analysis and insights</li>
            <li>AI providers are contractually prohibited from using your data to train their models or for any purpose other than providing services to Porter</li>
            <li>No personally identifiable information is shared beyond what is necessary to process your requests</li>
          </ul>
        </Sub>
        <Sub title="3.2 QuickBooks Online Integration">
          <p>Porter integrates with QuickBooks Online through Intuit's official API:</p>
          <ul>
            <li>We access your QuickBooks data only with your explicit OAuth 2.0 authorization</li>
            <li>You can revoke Porter's access at any time through QuickBooks' App Management settings</li>
            <li>We comply with Intuit's security requirements and developer terms of service</li>
            <li>Your QuickBooks credentials are never stored by Porter</li>
          </ul>
        </Sub>
        <Sub title="3.3 Other Third-Party Services">
          <p>We may use additional third-party services for:</p>
          <ul>
            <li>Payment processing (Stripe or similar)</li>
            <li>Analytics and monitoring</li>
            <li>Email delivery</li>
            <li>Cloud hosting and infrastructure</li>
          </ul>
        </Sub>
      </Section>

      <Section title="4. How We Share Your Information">
        <p>We do not sell your personal or financial information. We may share your information only in the following circumstances:</p>
        <Sub title="4.1 With Your Consent">
          <p>We may share your information when you explicitly authorize us to do so.</p>
        </Sub>
        <Sub title="4.2 Service Providers">
          <p>We share information with third-party service providers who perform services on our behalf, such as cloud hosting, AI providers, payment processors, analytics providers, and customer support tools. These providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>
        </Sub>
        <Sub title="4.3 Legal Requirements">
          <p>We may disclose your information if required by law or in response to valid requests by public authorities, including to comply with legal obligations, protect our rights, prevent wrongdoing, or protect the safety of users or the public.</p>
        </Sub>
        <Sub title="4.4 Business Transfers">
          <p>If Porter is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will provide notice before your information is transferred and becomes subject to a different privacy policy.</p>
        </Sub>
      </Section>

      <Section title="5. Data Security">
        <ul>
          <li><strong>Encryption.</strong> All data is encrypted in transit using TLS/SSL and at rest using AES-256.</li>
          <li><strong>Access controls.</strong> Strict access controls and authentication requirements for our systems.</li>
          <li><strong>Secure infrastructure.</strong> Reputable cloud providers with SOC 2 compliance.</li>
          <li><strong>Regular audits.</strong> Routine security assessments and vulnerability testing.</li>
          <li><strong>Employee training.</strong> Our team is trained on data protection and security best practices.</li>
        </ul>
        <p>While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>We retain your information for as long as necessary to provide our Service, comply with legal obligations, resolve disputes, and enforce our agreements. When you disconnect your QuickBooks account or delete your Porter account, we will delete or anonymize your financial data within 30 days, except where retention is required by law.</p>
      </Section>

      <Section title="7. Your Rights & Choices">
        <Sub title="7.1 Access & Correction">
          <p>You have the right to access and update your personal information through your Porter account settings.</p>
        </Sub>
        <Sub title="7.2 Data Portability">
          <p>You can export your data from Porter at any time through our data export feature.</p>
        </Sub>
        <Sub title="7.3 Deletion">
          <p>You can request deletion of your account and associated data by contacting us at the email below. We will respond within 30 days.</p>
        </Sub>
        <Sub title="7.4 QuickBooks Access">
          <p>You can revoke Porter's access to your QuickBooks data at any time through QuickBooks' Apps settings or by disconnecting within Porter.</p>
        </Sub>
        <Sub title="7.5 Marketing Communications">
          <p>You can opt out of marketing emails by clicking the "unsubscribe" link in any marketing email or by updating your communication preferences in your account.</p>
        </Sub>
        <Sub title="7.6 Cookies">
          <p>You can control cookies through your browser settings. Disabling cookies may affect functionality.</p>
        </Sub>
      </Section>

      <Section title="8. Children's Privacy">
        <p>Porter is not intended for use by individuals under 18. We do not knowingly collect personal information from children under 18. If we become aware that we have, we will take steps to delete it.</p>
      </Section>

      <Section title="9. International Data Transfers">
        <p>Porter is based in the United States. Your information may be transferred to and processed in the United States or other countries where our service providers operate. By using Porter, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules.</p>
      </Section>

      <Section title="10. California Privacy Rights">
        <p>If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):</p>
        <ul>
          <li><strong>Right to know.</strong> Request information about the personal information we collect, use, and disclose.</li>
          <li><strong>Right to delete.</strong> Request deletion of your personal information.</li>
          <li><strong>Right to opt out.</strong> We do not sell personal information.</li>
          <li><strong>Right to non-discrimination.</strong> We will not discriminate against you for exercising your privacy rights.</li>
        </ul>
      </Section>

      <Section title="11. European Privacy Rights">
        <p>If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the rights to access, rectify, erase, restrict processing, port your data, object, and withdraw consent. Our legal basis for processing includes consent, contract, and legitimate interests.</p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy here, updating the "Last Updated" date, and emailing you for significant changes. Continued use after changes become effective constitutes acceptance.</p>
      </Section>

      <Section title="13. Contact Us">
        <Contact>
          <p>If you have questions about this Privacy Policy or our privacy practices, please contact us:</p>
          <p>
            <strong>Porter Operations LLC</strong><br />
            Email: <a href="mailto:privacy@buildwithporter.com">privacy@buildwithporter.com</a><br />
            Mailing Address: New York, NY 10009, United States
          </p>
          <p>We will respond to your inquiry within 30 days.</p>
        </Contact>
      </Section>

      <Footnote>
        This Privacy Policy is effective as of the date stated above and applies
        to all users of Porter's services.
      </Footnote>
    </LegalLayout>
  );
}
