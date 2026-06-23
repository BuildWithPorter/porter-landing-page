import { LegalLayout, Section, Sub, Important, Contact, Footnote } from "./LegalLayout";

export function TermsOfService() {
  return (
    <LegalLayout
      path="/terms-of-service"
      seoDescription="The terms governing your access to and use of Porter's accounting platform and managed finance services."
      title="Terms and Conditions"
      lastUpdated="January 14, 2026"
      intro={
        <>
          These Terms of Service ("Terms") govern your access to and use of
          Porter's financial automation platform and services (the "Service"),
          provided by Porter Operations LLC ("Porter," "we," "us," or "our").
        </>
      }
    >
      <Important>
        <span><strong>Important.</strong> By accessing or using Porter, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our Service.</span>
      </Important>

      <Section title="1. Acceptance of Terms">
        <p>By creating an account, accessing, or using Porter, you:</p>
        <ul>
          <li>Agree to be bound by these Terms and our <a href="/privacy-policy">Privacy Policy</a></li>
          <li>Represent that you are at least 18 years old</li>
          <li>Represent that you have the authority to bind your business to these Terms</li>
          <li>Agree to comply with all applicable laws and regulations</li>
        </ul>
      </Section>

      <Section title="2. Description of Service">
        <p>Porter is a financial automation platform that enhances QuickBooks Online with:</p>
        <ul>
          <li>Automated transaction review and categorization</li>
          <li>AI-powered business analysis and financial insights</li>
          <li>Financial schedules and reporting</li>
          <li>Variance analysis and anomaly detection</li>
          <li>Natural language financial queries</li>
          <li>Integration with QuickBooks Online accounting software</li>
        </ul>
        <p>We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice.</p>
      </Section>

      <Section title="3. Account Registration & Security">
        <Sub title="3.1 Account Creation">
          <p>To use Porter, you must create an account with accurate and complete information, connect your QuickBooks Online account via OAuth 2.0, maintain and update your account information, and keep your password secure.</p>
        </Sub>
        <Sub title="3.2 Account Responsibility">
          <p>You are responsible for all activity under your account, maintaining the security of your credentials, notifying us immediately of any unauthorized access, and all fees incurred through your account.</p>
        </Sub>
        <Sub title="3.3 Account Restrictions">
          <p>You may not share your account, create multiple accounts, use another person's account without permission, or sell, transfer, or assign your account.</p>
        </Sub>
      </Section>

      <Section title="4. QuickBooks Online Integration">
        <Sub title="4.1 Authorization">
          <p>By connecting Porter to your QuickBooks Online account, you authorize Porter to access your QuickBooks company data, read transactions and accounts, create and modify entries as directed by you, and sync data between Porter and QuickBooks Online.</p>
        </Sub>
        <Sub title="4.2 QuickBooks Requirements">
          <p>You must have an active QuickBooks Online subscription, comply with Intuit's QuickBooks Online Terms of Service, and maintain accurate and up-to-date data in QuickBooks.</p>
        </Sub>
        <Sub title="4.3 Disconnection">
          <p>You may disconnect Porter from your QuickBooks account at any time through Porter's account settings or QuickBooks Online's Apps management section.</p>
        </Sub>
      </Section>

      <Section title="5. Acceptable Use">
        <Sub title="5.1 Permitted Use">
          <p>You may use Porter for lawful business purposes to manage and analyze your financial data.</p>
        </Sub>
        <Sub title="5.2 Prohibited Activities">
          <p>You may not:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Reverse engineer, decompile, or disassemble any aspect of Porter</li>
            <li>Use automated systems (bots, scrapers) without authorization</li>
            <li>Resell or redistribute the Service without permission</li>
            <li>Use the Service to process data for third parties without authorization</li>
            <li>Remove, alter, or obscure any proprietary notices</li>
          </ul>
        </Sub>
      </Section>

      <Section title="6. Fees & Payment">
        <Sub title="6.1 Subscription Plans">
          <p>Porter offers various subscription plans with different features and pricing. Current pricing is available on our website.</p>
        </Sub>
        <Sub title="6.2 Billing">
          <ul>
            <li>Subscription fees are billed in advance on a monthly or annual basis</li>
            <li>Payment is due immediately upon invoice</li>
            <li>We use third-party payment processors and do not store your full credit card information</li>
            <li>You authorize us to charge your payment method for all fees incurred</li>
          </ul>
        </Sub>
        <Sub title="6.3 Price Changes">
          <p>We may change our fees at any time and will provide at least 30 days' notice of any price increases. Continued use after a price change constitutes acceptance of the new fees.</p>
        </Sub>
        <Sub title="6.4 Refunds">
          <p>Fees are non-refundable except as required by law or as otherwise specified in writing.</p>
        </Sub>
        <Sub title="6.5 Late Payment">
          <p>If payment is not received when due, we may suspend or terminate your access, you remain responsible for outstanding fees, and we may charge interest on overdue amounts at the lesser of 1.5% per month or the maximum rate permitted by law.</p>
        </Sub>
      </Section>

      <Section title="7. Data & Privacy">
        <Sub title="7.1 Your Data">
          <p>You retain all rights to your financial data. By using Porter, you grant us a limited license to access, store, and process your data to provide the Service, use your data to generate insights for you, and create anonymized, aggregated data for Service improvement.</p>
        </Sub>
        <Sub title="7.2 Privacy">
          <p>Our collection and use of your information is governed by our <a href="/privacy-policy">Privacy Policy</a>, which is incorporated into these Terms by reference.</p>
        </Sub>
        <Sub title="7.3 Data Accuracy">
          <p>You are responsible for the accuracy and completeness of data you provide, reviewing AI-generated insights before relying on them, and verifying all transactions and entries created by Porter.</p>
        </Sub>
      </Section>

      <Section title="8. Intellectual Property">
        <Sub title="8.1 Porter's Property">
          <p>Porter and its contents (excluding your data) are owned by Porter Operations LLC and protected by copyright, trademark, and other intellectual property laws.</p>
        </Sub>
        <Sub title="8.2 Limited License">
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to access and use Porter for your internal business purposes, subject to these Terms.</p>
        </Sub>
        <Sub title="8.3 Restrictions">
          <p>You may not copy, modify, or create derivative works of Porter, use Porter's name, logo, or trademarks without written permission, or use any proprietary information for competitive purposes.</p>
        </Sub>
      </Section>

      <Section title="9. AI & Machine Learning">
        <Sub title="9.1 AI-Generated Content">
          <p>Porter uses artificial intelligence to analyze your financial data. You acknowledge that AI-generated insights are for informational purposes only, you are responsible for reviewing and verifying all AI-generated content, AI may occasionally produce inaccurate or incomplete results, and Porter does not guarantee the accuracy of AI-generated insights.</p>
        </Sub>
        <Sub title="9.2 Professional Advice Disclaimer">
          <p>Porter does not provide financial advice, accounting advice, tax advice, or legal advice. You should consult with qualified professionals for specific advice regarding your situation.</p>
        </Sub>
      </Section>

      <Section title="10. Warranties & Disclaimers">
        <Sub title='10.1 "As Is"'>
          <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY, RELIABILITY, OR COMPLETENESS.</p>
        </Sub>
        <Sub title="10.2 No Guarantee">
          <p>We do not warrant that the Service will be uninterrupted, secure, or error-free; that defects will be corrected; that the Service is free from viruses; or that results will be accurate or reliable.</p>
        </Sub>
        <Sub title="10.3 Third-Party Services">
          <p>Porter integrates with third-party services (including QuickBooks Online). We are not responsible for the availability or performance of third-party services, changes to third-party APIs, or third-party terms of service or privacy policies.</p>
        </Sub>
      </Section>

      <Section title="11. Limitation of Liability">
        <Sub title="11.1 Exclusion of Damages">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PORTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, OR BUSINESS; LOSS OF DATA; BUSINESS INTERRUPTION; OR LOSS OF GOODWILL.</p>
        </Sub>
        <Sub title="11.2 Cap on Liability">
          <p>OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO PORTER IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100 IF NO FEES WERE PAID.</p>
        </Sub>
        <Sub title="11.3 Exceptions">
          <p>These limitations do not apply to our indemnification obligations, your payment obligations, or liability that cannot be excluded by law.</p>
        </Sub>
      </Section>

      <Section title="12. Indemnification">
        <p>You agree to indemnify, defend, and hold harmless Porter, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from your use of the Service, your violation of these Terms, your violation of any rights of another party, or your data or content.</p>
      </Section>

      <Section title="13. Term & Termination">
        <Sub title="13.1 Term">
          <p>These Terms begin when you first access Porter and continue until terminated.</p>
        </Sub>
        <Sub title="13.2 Termination by You">
          <p>You may terminate your account at any time by canceling your subscription through account settings or contacting our support team.</p>
        </Sub>
        <Sub title="13.3 Termination by Us">
          <p>We may suspend or terminate your account if you violate these Terms, if your payment is overdue, for any reason with 30 days' notice, or immediately for serious violations or legal requirements.</p>
        </Sub>
        <Sub title="13.4 Effect of Termination">
          <p>Upon termination, your right to access Porter immediately ceases, you remain responsible for any outstanding fees, we will delete your data within 30 days (except as required by law), and you may export your data before termination.</p>
        </Sub>
      </Section>

      <Section title="14. Dispute Resolution">
        <Sub title="14.1 Informal Resolution">
          <p>Before filing a claim, you agree to contact us at <a href="mailto:legal@buildwithporter.com">legal@buildwithporter.com</a> to attempt to resolve the dispute informally.</p>
        </Sub>
        <Sub title="14.2 Governing Law">
          <p>These Terms are governed by the laws of the State of New York, without regard to conflict of law principles.</p>
        </Sub>
        <Sub title="14.3 Jurisdiction">
          <p>Any legal action must be brought in the state or federal courts located in New York, NY.</p>
        </Sub>
      </Section>

      <Section title="15. General Provisions">
        <Sub title="15.1 Entire Agreement">
          <p>These Terms, together with our <a href="/privacy-policy">Privacy Policy</a>, constitute the entire agreement between you and Porter.</p>
        </Sub>
        <Sub title="15.2 Changes to Terms">
          <p>We may modify these Terms at any time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance.</p>
        </Sub>
        <Sub title="15.3 Severability">
          <p>If any provision is found to be unenforceable, the remaining provisions will remain in effect.</p>
        </Sub>
        <Sub title="15.4 Waiver">
          <p>Our failure to enforce any right or provision is not a waiver of that right or provision.</p>
        </Sub>
        <Sub title="15.5 Assignment">
          <p>You may not assign these Terms without our written consent. We may assign these Terms without restriction.</p>
        </Sub>
        <Sub title="15.6 Force Majeure">
          <p>We are not liable for delays or failures caused by circumstances beyond our reasonable control.</p>
        </Sub>
        <Sub title="15.7 Survival">
          <p>Sections that by their nature should survive termination will survive, including payment obligations, warranties, limitations of liability, indemnification, and dispute resolution.</p>
        </Sub>
      </Section>

      <Section title="16. Contact">
        <Contact>
          <p>For questions about these Terms, please contact us:</p>
          <p>
            <strong>Porter Operations LLC</strong><br />
            Email: <a href="mailto:legal@buildwithporter.com">legal@buildwithporter.com</a><br />
            Support: <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a><br />
            Mailing Address: New York, NY 10009, United States
          </p>
        </Contact>
      </Section>

      <Footnote>
        By using Porter, you acknowledge that you have read, understood, and
        agree to be bound by these Terms.
      </Footnote>
    </LegalLayout>
  );
}
