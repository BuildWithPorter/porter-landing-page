export const SERVICES = [
  { title: "Bookkeeping & accounting", body: "We keep your books current, close each month, and prepare financial reports you can use to run your business." },
  { title: "Accounts receivable", body: "We handle customer invoices, match incoming payments, and follow up on outstanding balances so work turns into cash." },
  { title: "Accounts payable", body: "We organize vendor bills, manage payment schedules, and keep you in control of what gets paid and when." },
  { title: "Payroll", body: "We manage payroll operations and keep the records connected to your books, so your people and your numbers stay in sync." },
  { title: "Taxes", body: "We coordinate tax preparation and filing, with the books and supporting records in order before deadlines arrive." },
  { title: "Financial planning & analysis", body: "We build budgets, cash forecasts and financial models, explain changes in performance, and help you plan your next move." },
];
export const SITE_PAGES = {
  "/what-we-solve": { label: "What we solve", title: "Finance should move you forward.", description: "Understand your numbers, stop chasing answers, and keep invoices and bills from slipping through the cracks. See the business challenges Porter solves." },
  "/services": { label: "What Porter does", title: "Your finance team. The work, handled.", description: "Porter provides bookkeeping, accounting, accounts receivable, accounts payable, payroll, tax, and financial planning and analysis services for startups and small businesses." },
  "/use-cases": { label: "Our software", title: "Your numbers. Within reach.", description: "Explore Porter's modern accounting software through 20 product demonstrations. Ask questions, manage cash, and work with your books in Porter, ChatGPT, Claude or Slack." },
  "/why-porter": { label: "Why Porter", title: "A finance team that grows with you.", description: "See how Porter scales from your first transaction to a full finance function. Explore customer stories across startups, home services, professional services and company groups." },
};
export const SITE_LINKS = Object.entries(SITE_PAGES).map(([href,page]) => ({href,label:page.label}));
