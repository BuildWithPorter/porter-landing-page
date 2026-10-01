export const SERVICES = [
  { title: "Bookkeeping & accounting", body: "Current books, a clean monthly close, and financial reports you can use." },
  { title: "Accounts receivable", body: "We send invoices, follow up and match payments, so your work turns into cash." },
  { title: "Accounts payable", body: "Bills organized. Payments scheduled. You stay in control of what gets paid." },
  { title: "Payroll", body: "We handle payroll and keep every payment connected to your books." },
  { title: "Taxes", body: "Tax preparation and filing coordinated, with the supporting records in order." },
  { title: "Financial planning & analysis", body: "Budgets, cash forecasts and financial models to help you plan your next move." },
];
export const SITE_PAGES = {
  "/what-we-solve": { label: "What we solve", title: "Finance should do more for your business.", description: "For startups and small businesses, finance can feel like another chore: reports without guidance, providers who don’t know the business, and work that still falls to the owner." },
  "/services": { label: "What Porter does", title: "Your finance team. The work, handled.", description: "Porter provides bookkeeping, accounting, accounts receivable, accounts payable, payroll, tax, and financial planning and analysis services for startups and small businesses." },
  "/use-cases": { label: "Our software", title: "Your numbers. Within reach.", description: "Explore Porter's modern accounting software through 20 product demonstrations. Ask questions, manage cash, and work with your books in Porter, ChatGPT, Claude or Slack." },
  "/why-porter": { label: "Why Porter", title: "A finance team that grows with you.", description: "See how Porter scales from your first transaction to a full finance function. Explore customer stories across startups, home services, professional services and company groups." },
};
export const SITE_LINKS = Object.entries(SITE_PAGES).map(([href,page]) => ({href,label:page.label}));
