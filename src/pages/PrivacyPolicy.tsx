import { LegalLayout, Section, Sub, Contact, Footnote } from "./LegalLayout";
import {
  aiProcessing,
  analyticsTelemetry,
  dataRetention,
  legalLastUpdated,
  quickBooksDisconnect,
  tokenStorage,
} from "../legal/securityContent";

export function PrivacyPolicy() {
  return (
    <LegalLayout
      path="/privacy-policy"
      seoDescription="How Porter collects, uses, and protects your information. Covers QuickBooks data access, AI processing, security practices, retention, and your privacy rights."
      title="Privacy Policy"
      lastUpdated={legalLastUpdated.privacy}
      intro={
        <>
          Porter Agents Inc. ("Porter," "we," "us," or "our") is committed to
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
            <li><strong>Account information.</strong> When you create an account, we collect your name, email address, and company name. User authentication is handled through our identity provider; Porter does not store your password directly.</li>
            <li><strong>Payment information.</strong> If you subscribe to paid features, our payment processor collects billing information. We do not store complete credit card numbers.</li>
            <li><strong>Mobile phone and SMS consent information.</strong> If you enable SMS access, we collect your mobile phone number, SMS opt-in status, and SMS verification and consent records so Porter can verify the number, recognize inbound texts, and send service-related SMS messages.</li>
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
          <p>If you connect Gmail or Google Drive, we access the Google data described in Section 3.3.</p>
        </Sub>
        <Sub title="1.3 Automatically Collected">
          <ul>
            <li><strong>Usage data.</strong> We collect information about how you interact with Porter, including features used, pages viewed, time spent on the Service, and analytics/session telemetry.</li>
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
          <li>Send SMS messages you request or opt in to receive, including account, support, bookkeeping, finance workflow, receipt, document, and service-related messages</li>
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
            <li>Your financial data may be processed by third-party AI service providers, including OpenAI and Anthropic</li>
            <li>Data is transmitted securely and used solely to provide the requested analysis and insights</li>
            <li>AI providers are contractually prohibited from using your data to train their models or for any purpose other than providing services to Porter</li>
            <li>Temporary OpenAI document-extraction files are deleted after extraction</li>
            <li>No personally identifiable information is shared beyond what is necessary to process your requests</li>
          </ul>
        </Sub>
        <Sub title="3.2 QuickBooks Online Integration">
          <p>Porter integrates with QuickBooks Online through Intuit's official API:</p>
          <ul>
            <li>We access your QuickBooks data only with your explicit OAuth 2.0 authorization</li>
            <li>{quickBooksDisconnect}</li>
            <li>We comply with Intuit's security requirements and developer terms of service</li>
            <li>Your QuickBooks credentials are never stored by Porter</li>
          </ul>
        </Sub>
        {/* Reason (POR-5394): Google OAuth verification of the restricted Gmail
            read-only and Drive read-only scopes requires a public disclosure of
            Google user data use and the Limited Use affirmation. */}
        <Sub title="3.3 Google User Data">
          <p>If you connect a Google account, Porter requests only the access each connection needs, and only after you approve Google's consent screen:</p>
          <ul>
            <li><strong>Gmail (read-only).</strong> Porter reads messages and attachments in the connected mailbox to find financial documents such as vendor bills, invoices, receipts, bank and card statements, and payment notices. Porter stores the documents it captures and the details extracted from them in your workspace. Drafts, spam, and trash are skipped. Porter cannot send, change, or delete your email.</li>
            <li><strong>Google Drive (read-only).</strong> When you ask, Porter searches the names and contents of files your connected account can access, lists recent files, and reads file details and the contents of supported files so it can answer your request. Porter saves a copy of a Drive file to your Porter documents only when you approve that save. Porter cannot create, edit, share, or delete your Drive files.</li>
            <li><strong>Account identity.</strong> Porter receives the connected account's email address and Google account identifier to show which account is connected.</li>
          </ul>
          <p>Porter's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. Specifically:</p>
          <ul>
            <li>Porter uses Google user data only to provide and improve the user-facing features described above.</li>
            <li>Porter transfers Google user data to others only as needed to provide those features (for example, to our hosting and processing service providers, including the providers described in Section 3.1), to comply with applicable law, or as part of a merger, acquisition, or sale of assets with notice to you.</li>
            <li>Porter does not use or transfer Google user data for advertising, does not sell it, and does not use it to determine credit-worthiness or for lending.</li>
            <li>Porter does not use Google user data to develop, improve, or train generalized AI or machine learning models, and our providers are contractually prohibited from training their models on it.</li>
            <li>Porter personnel do not read Google user data unless you give us permission for specific data, it is necessary for security purposes such as investigating abuse, it is necessary to comply with applicable law, or it has been aggregated and anonymized for internal operations.</li>
          </ul>
          <p>Google OAuth tokens are encrypted before storage. You can disconnect Gmail or Google Drive at any time from Settings in Porter, or remove Porter's access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>. Disconnecting stops further access. Documents already saved to your workspace are kept under Section 6, and you can ask us to delete them by contacting <a href="mailto:privacy@buildwithporter.com">privacy@buildwithporter.com</a>.</p>
        </Sub>
        <Sub title="3.4 Other Third-Party Services">
          <p>We may use additional third-party services for:</p>
          <ul>
            <li>Payment processing (Stripe or similar)</li>
            <li>Analytics, session telemetry, error monitoring, and website performance measurement</li>
            <li>Email delivery</li>
            <li>Cloud hosting and infrastructure</li>
          </ul>
        </Sub>
      </Section>

      <Section title="4. How We Share Your Information">
        <p>We do not sell your personal or financial information. We may share your information only in the following circumstances:</p>
        <p><strong>SMS consent is not sold or shared for marketing.</strong> Porter does not sell, rent, or share mobile phone numbers, SMS opt-in data, or SMS consent with third parties or affiliates for marketing or promotional purposes.</p>
        <Sub title="4.1 With Your Consent">
          <p>We may share your information when you explicitly authorize us to do so.</p>
        </Sub>
        <Sub title="4.2 Service Providers">
          <p>We share information with third-party service providers who perform services on our behalf, such as cloud hosting, AI providers, payment processors, analytics/session telemetry providers, error monitoring providers, and customer support tools. These providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>
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
          <li><strong>Encryption.</strong> Product traffic is encrypted in transit, managed providers provide platform encryption at rest, and sensitive integration credentials are encrypted by the application before persistence.</li>
          <li><strong>Access controls.</strong> Porter enforces company-scoped role-based access controls and authentication requirements for our systems.</li>
          <li><strong>Token storage.</strong> {tokenStorage}</li>
          <li><strong>Secure infrastructure.</strong> Porter uses reputable cloud providers with recognized security attestations.</li>
          <li><strong>Security reviews.</strong> Porter performs recurring security reviews, targeted testing, access review, and vulnerability monitoring.</li>
        </ul>
        <p>While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>{dataRetention}</p>
      </Section>

      <Section title="7. Your Rights & Choices">
        <Sub title="7.1 Access & Correction">
          <p>You have the right to access and update your personal information through your Porter account settings.</p>
        </Sub>
        <Sub title="7.2 Data Portability">
          <p>You can export your data from Porter at any time through our data export feature.</p>
        </Sub>
        <Sub title="7.3 Deletion">
          <p>You can request deletion of your account and associated data by contacting us at the email below. We will respond within 30 days, subject to contractual, legal, accounting-history, and managed-backup retention requirements.</p>
        </Sub>
        <Sub title="7.4 QuickBooks Access">
          <p>{quickBooksDisconnect}</p>
        </Sub>
        <Sub title="7.5 Marketing Communications">
          <p>You can opt out of marketing emails by clicking the "unsubscribe" link in any marketing email or by updating your communication preferences in your account.</p>
        </Sub>
        {/* Reason: Twilio A2P reviewers require public SMS opt-in, opt-out, help, frequency, and rate disclosures. */}
        <Sub title="7.6 SMS Communications">
          <p>If you opt in to receive SMS messages from Porter, message frequency varies based on your requests and account activity. Message and data rates may apply. You can reply STOP to opt out or HELP for help. Opting out of SMS does not affect service emails or in-app notices that are necessary to provide Porter.</p>
        </Sub>
        <Sub title="7.7 Cookies">
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
            <strong>Porter Agents Inc.</strong><br />
            Email: <a href="mailto:privacy@buildwithporter.com">privacy@buildwithporter.com</a><br />
            Mailing Address: New York, NY 10009, United States
          </p>
          <p>We will respond to your inquiry within 30 days.</p>
        </Contact>
      </Section>

      <Footnote>
        This Privacy Policy is effective as of the date stated above and applies
        to all users of Porter's services. {aiProcessing} {analyticsTelemetry}
      </Footnote>
    </LegalLayout>
  );
}
