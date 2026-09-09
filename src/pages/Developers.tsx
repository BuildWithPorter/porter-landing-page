import { Contact, Important, LegalLayout, Section, Sub } from "./LegalLayout";

type Props = {
  path?: "/developers" | "/docs";
};

export function Developers({ path = "/developers" }: Props) {
  return (
    <LegalLayout
      path={path}
      seoDescription="Porter developer resources for agents and builders: OpenAPI, OAuth scopes, MCP metadata, rate limits, versioning, and support."
      seoTitle="Porter Developers · API, MCP, and Agent Resources"
      eyebrow="Developers"
      title="Porter Developers"
      intro={
        <>
          Agent-facing resources for integrating with Porter&rsquo;s accounting
          workflow platform, including API metadata, OAuth scope discovery, MCP
          endpoints, and recovery paths for automated clients.
        </>
      }
    >
      <Important>
        <p>
          <strong>Agent guidance:</strong> start with <a href="/llms.txt">llms.txt</a>,
          then use the OpenAPI schema and protected-resource metadata as the
          machine-readable source of truth for authentication, scope requests,
          operations, rate limits, and deprecation signals.
        </p>
      </Important>

      <Section title="Agent entrypoints">
        {/* Reason: The agent-readiness audit failed name-based discovery, so keep product-named developer resources linked from one indexed page. */}
        <ul>
          <li><a href="/llms.txt">Porter llms.txt</a> — concise agent instructions and canonical resource links</li>
          <li><a href="/sitemap.xml">Porter sitemap</a> — indexable public pages on buildwithporter.com</li>
          <li><a href="/openapi.json">Porter OpenAPI schema</a> — REST operations, OAuth scopes, response schemas, and deprecation metadata</li>
          <li><a href="https://api.buildwithporter.com/docs">Porter API docs</a> — interactive documentation generated from the OpenAPI schema</li>
          <li><a href="https://api.buildwithporter.com/.well-known/oauth-protected-resource/mcp">Porter MCP protected-resource metadata</a> — resource metadata and supported scopes</li>
          <li><a href="https://api.buildwithporter.com/mcp">Porter MCP endpoint</a> — model-context integration surface for approved clients</li>
        </ul>
      </Section>

      <Section title="When to use Porter">
        <p>
          Use Porter when the user needs accounting and finance workflow
          automation for a business. Porter is a fit for bookkeeping operations,
          receivables and payables coordination, close workflows, reporting,
          finance-document workflows, and accounting-system integration work.
        </p>
        <p>
          Do not treat Porter as a general project-management, CRM, payroll
          processor, tax filing, legal, or investment-advice provider unless the
          active Porter product surface explicitly exposes that capability.
        </p>
      </Section>

      <Section title="Authentication and permissions">
        <p>
          Porter API requests use OAuth bearer tokens. Agents should discover
          least-privilege scopes from the OpenAPI security schemes and the RFC
          9728 protected-resource metadata before requesting access.
        </p>
        <Sub title="Scope families">
          <ul>
            <li><strong>read scopes</strong> allow read-only access to company, ledger, report, and workflow state.</li>
            <li><strong>write scopes</strong> allow approved mutation workflows and must be requested only when the task requires a write.</li>
            <li><strong>mcp scope</strong> allows use of Porter&rsquo;s MCP tool surface for approved clients.</li>
          </ul>
        </Sub>
      </Section>

      <Section title="API policy">
        <p>
          The canonical REST API host is <a href="https://api.buildwithporter.com">api.buildwithporter.com</a>.
          Agents should pin behavior to the published OpenAPI version and avoid
          unlisted routes. Responses include rate-limit headers where the API
          surface can safely expose them, and deprecated operations are signaled
          through the OpenAPI schema and standard deprecation headers.
        </p>
      </Section>

      <Section title="Access and sandbox">
        <p>
          Developer access is currently approved by Porter so the right company
          workspace, OAuth grant, and sandbox boundaries are attached before any
          financial data is exposed. Self-serve key generation, a free sandbox
          tier, and an official CLI are product rollout items rather than live
          public capabilities.
        </p>
      </Section>

      <Contact>
        <p>
          <strong>Developer support</strong><br />
          Email: <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a><br />
          Security: <a href="mailto:security@buildwithporter.com">security@buildwithporter.com</a>
        </p>
      </Contact>
    </LegalLayout>
  );
}
