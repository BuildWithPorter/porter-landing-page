import { LegalLayout, Section, Sub, Contact, Footnote } from "./LegalLayout";
import { legalLastUpdated, subprocessorCategories } from "../legal/securityContent";

export function SubProcessors() {
  return (
    <LegalLayout
      path="/legal/subprocessors"
      seoDescription="The third-party providers Porter uses to deliver its accounting and finance services — hosting, AI processing, QuickBooks connectivity, payments, identity, and operations."
      title="Sub-processors"
      lastUpdated={legalLastUpdated.subprocessors}
      intro={
        <>
          Porter Operations LLC ("Porter," "we," "us," or "our") uses a small set
          of trusted third-party service providers ("sub-processors") to help
          deliver our financial automation platform and services (the "Service").
          This page lists those sub-processors, the function each performs, and
          how we govern their access to your data. It supplements our{" "}
          <a href="/privacy-policy">Privacy Policy</a>.
        </>
      }
    >
      <Section title="1. What is a sub-processor">
        <p>
          A sub-processor is a third party that Porter engages to process
          customer data on our behalf in order to provide the Service. We engage
          sub-processors only where necessary, and each one is bound by a written
          agreement (including a Data Processing Addendum where applicable) that
          requires it to protect customer data, use it solely to perform the
          services we specify, and meet confidentiality and security obligations
          consistent with our own.
        </p>
      </Section>

      <Section title="2. Current sub-processors">
        {subprocessorCategories.map((category) => (
          <Sub key={category.title} title={category.title}>
            <ul>
              {category.items.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}.</strong> {item.description}
                </li>
              ))}
            </ul>
          </Sub>
        ))}
      </Section>

      <Section title="3. Data location">
        <p>
          Porter is based in the United States, and customer data is stored and
          processed in the United States. Some sub-processors may process limited
          data in other regions where they operate; in all cases data is
          transferred and handled in accordance with our{" "}
          <a href="/privacy-policy">Privacy Policy</a> and applicable data
          protection laws.
        </p>
      </Section>

      <Section title="4. How we govern sub-processors">
        <ul>
          <li>Each sub-processor receives only the data necessary to perform its specific function.</li>
          <li>Each is bound by contractual confidentiality and security obligations, including a Data Processing Addendum where applicable.</li>
          <li>We assess the security posture of sub-processors that handle customer data and prefer providers with recognized certifications (e.g., SOC 2).</li>
          <li>All customer data is encrypted in transit (TLS/SSL) and at rest (AES-256).</li>
        </ul>
      </Section>

      <Section title="5. Changes to this list">
        <p>
          We may add or replace sub-processors as the Service evolves. When we
          make a material change to this list, we will update this page and the
          "Last updated" date above. Customers may subscribe to notifications of
          changes by contacting us at the address below, and we will provide
          advance notice of new sub-processors where required by contract or
          applicable law.
        </p>
      </Section>

      <Section title="6. Contact us">
        <Contact>
          <p>Questions about our sub-processors or data practices can be sent to:</p>
          <p>
            <strong>Porter Operations LLC</strong><br />
            Email: <a href="mailto:privacy@buildwithporter.com">privacy@buildwithporter.com</a><br />
            Mailing Address: New York, NY 10009, United States
          </p>
        </Contact>
      </Section>

      <Footnote>
        This sub-processor list is effective as of the date stated above and
        supplements Porter's Privacy Policy.
      </Footnote>
    </LegalLayout>
  );
}
