export const legalLastUpdated = {
  privacy: "June 25, 2026",
  security: "June 25, 2026",
  subprocessors: "June 25, 2026",
  terms: "June 25, 2026",
} as const;

export const securitySummary =
  "Porter is built to handle sensitive financial and operational data. Our security approach focuses on limiting production access, enforcing company-scoped role-based authorization in the product, encrypting sensitive integration credentials, using private document storage with short-lived signed URLs, requiring manual production releases, monitoring key infrastructure and vendor surfaces, maintaining backup and restore procedures, and documenting incident response.";

export const soc2Status =
  "Porter does not represent that it has a completed SOC 2, ISO 27001, or PCI DSS report today. Porter is in active SOC 2 readiness work, with SOC 2 Type I targeted first and SOC 2 Type II planned to follow after the required observation period.";

export const tenantIsolation =
  "Customer workspace routes validate the authenticated user against the requested company before returning or mutating company data. Tenant data access is scoped by company identifier at the application and repository boundary. Porter describes this as application-level and repository-level tenant isolation.";

export const operatorAccess =
  "Internal operator access is limited to named Porter operators with documented business need and is treated as privileged production access.";

export const tokenStorage =
  "Third-party OAuth and API tokens are encrypted before persistence using an application-managed encryption key stored as a deployment-level environment secret. Disconnect and revocation behavior is provider-specific, and tokens are never exposed to the browser.";

export const analyticsTelemetry =
  "Porter uses analytics/session telemetry to operate and improve the product. Browser analytics and session-replay claims depend on live vendor masking, capture-scope, retention, and member-access settings.";

export const dataRetention =
  "Porter retains active workspace data as needed to provide the Service. After workspace termination, primary accounting records and uploaded documents are retained for seven years by default unless the customer contract, legal hold, or applicable law requires a different period. Deletion requests are handled within 30 days, subject to those retention requirements and managed backup expiry.";

export const terminationEffect =
  "Upon termination, your right to access Porter immediately ceases, you remain responsible for any outstanding fees, and you may export your data before termination. Porter retains or deletes data according to the Privacy Policy, including the default seven-year retention period for primary accounting records and uploaded documents unless a contract, legal hold, or applicable law requires a different period.";

export const quickBooksDisconnect =
  "You may revoke Porter's future access to QuickBooks data through QuickBooks' App Management settings or by disconnecting within Porter. Previously ingested accounting history remains subject to Porter's retention and deletion policy.";

export const aiProcessing =
  "Porter uses AI providers where product features require it. AI providers are contractually prohibited from using customer data to train their models, and temporary OpenAI document-extraction files are deleted after extraction.";

export const securityFaqAnswer =
  "Porter encrypts traffic in transit, relies on managed providers with platform encryption at rest, encrypts sensitive integration credentials at the application layer, and enforces company-scoped role-based access controls. We do not sell customer data, and our AI providers are contractually prohibited from training models on customer information.";

export const subprocessorCategories = [
  {
    title: "2.1 Infrastructure & hosting",
    items: [
      {
        name: "Supabase",
        description: "Managed PostgreSQL database, secrets database, and private file storage. United States.",
      },
      {
        name: "Render",
        description: "Application and API hosting. United States.",
      },
      {
        name: "Vercel",
        description: "Frontend hosting, web delivery, website analytics, and speed insights. United States.",
      },
    ],
  },
  {
    title: "2.2 AI processing",
    items: [
      {
        name: "Anthropic",
        description: "Large language model inference for selected AI-powered workflows. Contractually prohibited from using customer data to train its models.",
      },
      {
        name: "OpenAI",
        description: "Large language model inference, document extraction, parsing, embeddings, and assistant features. Contractually prohibited from using customer data to train its models.",
      },
      {
        name: "Langfuse / Helicone",
        description: "LLM observability where enabled; prompt content is masked or minimized under Porter's security policy.",
      },
    ],
  },
  {
    title: "2.3 Financial data connectivity",
    items: [
      {
        name: "Intuit (QuickBooks Online)",
        description: "Customer-authorized accounting data synchronization via Intuit's official API.",
      },
      {
        name: "Plaid",
        description: "Bank account and transaction data ingestion.",
      },
    ],
  },
  {
    title: "2.4 Payments",
    items: [
      {
        name: "Stripe",
        description: "Subscription billing and payment processing. Porter does not store complete card numbers.",
      },
      {
        name: "Helcim",
        description: "Payment processing and transaction ingestion. Porter does not store complete card numbers.",
      },
    ],
  },
  {
    title: "2.5 Identity & authentication",
    items: [
      {
        name: "Kinde",
        description: "User authentication, sign-in, and single sign-on.",
      },
    ],
  },
  {
    title: "2.6 Operations, analytics & communications",
    items: [
      {
        name: "Sentry",
        description: "Application error monitoring and performance diagnostics.",
      },
      {
        name: "PostHog",
        description: "Product analytics and session telemetry. Live masking, session replay, retention, and member settings must be verified before Porter makes narrower no-payload claims.",
      },
      {
        name: "Microsoft Clarity",
        description: "Marketing-site behavior analytics when enabled for the public website.",
      },
      {
        name: "Postmark",
        description: "Transactional and service-related email delivery.",
      },
    ],
  },
] as const;
