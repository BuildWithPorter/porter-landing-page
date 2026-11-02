const ORIGIN = "https://buildwithporter.com";

export type TopicLink = { href: string; label: string };
export type TopicFaq = { q: string; a: string; more?: TopicLink };
export type TopicSection =
  | { kind: "prose"; title: string; paragraphs: string[] }
  | { kind: "list"; title: string; items: string[] }
  | { kind: "points"; title: string; items: { lead: string; body: string }[] }
  | { kind: "steps"; title: string; items: string[] }
  | { kind: "table"; title: string; columns: string[]; rows: string[][] };

export type TopicPage = {
  path: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  campaign?: boolean;
  sections: TopicSection[];
  faqs: TopicFaq[];
  related: TopicLink[];
};

const services = { href: "/services", label: "What Porter does" };
const multiEntity = { href: "/multi-entity", label: "Multi-entity accounting" };
const booksCleanup = { href: "/books-cleanup", label: "Books cleanup" };
const saleReady = { href: "/sale-ready", label: "Sale-ready books" };
const searchFunds = { href: "/search-funds", label: "Search funds and roll-ups" };
const familyOffices = { href: "/family-offices", label: "Family offices" };
const restaurants = { href: "/restaurants", label: "Restaurants" };
const security = { href: "/security", label: "Security" };
const slack = { href: "/slack", label: "Porter for Slack" };
const guide = { href: "/guides/fractional-cfo-vs-controller-vs-bookkeeper", label: "Fractional CFO vs controller vs bookkeeper" };
const everyCompany = { href: "/use-cases/every-company", label: "Every company, one set of numbers" };
const countedOnce = { href: "/use-cases/counted-once", label: "Nothing counted twice" };
const software = { href: "/use-cases", label: "Our software" };
const whyPorter = { href: "/why-porter", label: "Why Porter" };
const textBooks = { href: "/use-cases/text-your-books", label: "Do your books by text" };
const chatgpt = { href: "/use-cases/works-where-you-work", label: "Porter, inside ChatGPT and Claude" };
const invoices = { href: "/use-cases/invoice-nobody-billed", label: "The invoice nobody sent" };
const switchBookkeepers = { href: "/blog/how-to-switch-bookkeepers", label: "How to switch bookkeepers" };

export const MULTI_ENTITY_PAGE: TopicPage = {
  path: "/multi-entity",
  label: "Multi-entity accounting",
  title: "Multi-Entity Accounting and Consolidation | Porter",
  description: "Porter is a finance team plus software for groups with more than one company: separate books, consolidated reports, and intercompany activity removed.",
  h1: "Multi-entity accounting and consolidation, handled",
  lede: "Porter is a finance team plus accounting software for businesses with more than one company: each entity keeps its own books, and Porter rolls them into consolidated Profit and Loss and Balance Sheet reports with activity between your companies removed. Connect QuickBooks Online to work alongside it, or move your books into Porter.",
  campaign: true,
  sections: [
    {
      kind: "list",
      title: "Who this is for",
      items: [
        "Owners and operators running several companies, LLCs or locations with separate books.",
        "Holdcos, search fund and roll-up operators, and family offices.",
        "Groups whose consolidated numbers live in a spreadsheet built by hand each month.",
      ],
    },
    {
      kind: "points",
      title: "The challenges",
      items: [
        {
          lead: "You can see each company, but not the group at a glance.",
          body: "Results get gathered from separate books before leadership sees the whole picture.",
        },
        {
          lead: "A group total does not tell you who drove the change.",
          body: "Without company detail beside the consolidated view, finding where revenue or spending moved takes extra work.",
        },
        {
          lead: "Activity between your companies clouds the picture.",
          body: "Internal sales can look like outside growth until both sides are linked and match.",
        },
        {
          lead: "Reporting gaps show up at close.",
          body: "Unmapped accounts and unmatched amounts leave group figures closer to a sum than a consolidated view.",
        },
      ],
    },
    {
      kind: "steps",
      title: "How Porter consolidates",
      items: [
        "Each company keeps its own books, in Porter or in QuickBooks Online.",
        "Our team closes each company every month.",
        "Porter rolls every company into group Profit and Loss and Balance Sheet reports as the books update.",
        "When both sides of an intercompany transaction are mapped and match, it is removed from the group report. Amounts without a match stay visible for review.",
        "Drill from the consolidated result into any member company to see where a figure came from.",
        "Porter flags when group mappings, company access or unmatched amounts limit the consolidation.",
      ],
    },
    {
      kind: "prose",
      title: "The finance team behind it",
      paragraphs: [
        "Our team handles the work across six connected areas: bookkeeping and accounting, accounts receivable, accounts payable, payroll, taxes, and financial planning and analysis.",
      ],
    },
    {
      kind: "prose",
      title: "An example",
      paragraphs: [
        "A family office with dozens of operating companies in very different industries rolled them up by hand in spreadsheets. Porter brings every company into one place, rolls them into group numbers, and takes out the business the companies do with each other. (Anonymous customer story, as published on the homepage.)",
      ],
    },
  ],
  faqs: [
    {
      q: "What is multi-entity accounting?",
      a: "Multi-entity accounting keeps separate books for each legal company in a group and combines them into consolidated reports. Transactions between the companies are removed so the group total reflects only business with outside parties.",
    },
    {
      q: "Can Porter handle more than one company?",
      a: "Yes. Keep each company's books separate and see the group together. Porter brings company results into group reports and removes matching activity between your companies.",
    },
    {
      q: "How does Porter handle intercompany transactions?",
      a: "When both sides of an intercompany transaction are mapped and the amounts match, Porter removes it from the consolidated report. Amounts that do not match stay visible so the team can review them.",
    },
    {
      q: "Do I need to leave QuickBooks Online for consolidation?",
      a: "No. Connect each QuickBooks Online company and have Porter work alongside it, or move the books into Porter and use it as your accounting system.",
    },
    {
      q: "Which consolidated reports does Porter produce?",
      a: "Consolidated Profit and Loss and Balance Sheet reports across the companies in your group, with the ability to move into each member company's reporting.",
    },
    {
      q: "Is Porter software or a service?",
      a: "Both. Porter is a finance team that does the work plus software you use to see the numbers and ask questions, in the Porter app, Slack, text, ChatGPT or Claude.",
    },
  ],
  related: [
    searchFunds,
    familyOffices,
    everyCompany,
    countedOnce,
    { href: "/use-cases/split-shared-bills", label: "Split shared bills" },
    services,
  ],
};

export const TOPIC_PAGES: TopicPage[] = [
  {
    path: "/search-funds",
    label: "Search funds, ETA and PE roll-ups",
    title: "Accounting for Search Funds, ETA and PE Roll-Ups | Porter",
    description: "Porter is a finance team plus software for search funds and roll-ups: clean books after close, every entity consolidated, and reports ready for investors and lenders.",
    h1: "Accounting and finance for search funds, ETA operators and PE roll-ups",
    lede: "Porter gives search fund, ETA and PE roll-up operators a finance team plus accounting software: we clean up the books of each company you acquire, keep every entity closed monthly, and roll them into one consolidated view with investor reports ready when you need them. You stay on QuickBooks Online or move your books into Porter.",
    sections: [
      {
        kind: "list",
        title: "Who this is for",
        items: [
          "Searchers and ETA operators who just closed on a business and inherited books of uneven quality.",
          "Roll-ups and holdcos adding companies one acquisition at a time, each with its own books.",
          "Operators who report to investors and lenders and do not have an in-house finance department yet.",
        ],
      },
      {
        kind: "prose",
        title: "What changes after you close",
        paragraphs: [
          "A new acquisition usually arrives with books kept for the previous owner and their tax return, not for an investor board. Porter catches the books up, reconciles every bank and card account, fixes categories and fills in missing months, then keeps them current with a monthly close. Our cleanup work takes less than 2 weeks from the day we have access to the books and documents.",
        ],
      },
      {
        kind: "list",
        title: "One group view across every company",
        items: [
          "Each company keeps its own books.",
          "Consolidated Profit and Loss and Balance Sheet reports across the group.",
          "Activity between your companies is removed from the consolidated report when both sides are mapped and match. Unmatched amounts stay visible for review.",
          "Move from the group result into any member company to see what drove a change.",
          "Porter shows when mappings, company access or unmatched internal amounts limit how much a report can consolidate.",
        ],
      },
      {
        kind: "prose",
        title: "Investor and lender reporting",
        paragraphs: [
          "Porter keeps investor reports ready to send and keeps the books current enough to answer diligence and lender questions. For companies funded by a credit line, Porter tracks interest by draw.",
        ],
      },
      {
        kind: "prose",
        title: "The work our team handles",
        paragraphs: [
          "Bookkeeping and accounting, accounts receivable, accounts payable, payroll, taxes, and financial planning and analysis. Start with the books and add the rest as the portfolio grows, without a hiring cycle.",
        ],
      },
      {
        kind: "prose",
        title: "How you work with Porter",
        paragraphs: [
          "Ask questions in the Porter app, in Slack, by text, or inside ChatGPT or Claude. The answer links to the chart or transaction behind it.",
        ],
      },
      {
        kind: "prose",
        title: "Getting ready to sell later",
        paragraphs: [
          "If an exit is on the horizon, Porter keeps the books tied to the bank and filed tax returns so diligence starts from numbers you can stand behind. We do not sell quality of earnings reports or certify anything. See [Sale-ready books](/sale-ready).",
        ],
      },
    ],
    faqs: [
      {
        q: "Can Porter handle the books for a business I just acquired?",
        a: "Yes. Porter catches up the books of a newly acquired company, reconciling every account and filling in missing months, then closes them every month. Cleanup takes less than 2 weeks from the day we have access to the books and documents.",
      },
      {
        q: "Can Porter consolidate several portfolio companies?",
        a: "Yes. Each company keeps its own books, and Porter rolls them into consolidated Profit and Loss and Balance Sheet reports. Activity between your companies is removed when both sides are mapped and match, and unmatched amounts stay visible for review.",
      },
      {
        q: "Does Porter prepare investor reports?",
        a: "Yes. Porter keeps investor reports current and ready to send, built on books that close every month.",
      },
      {
        q: "Do I have to leave QuickBooks Online?",
        a: "No. Connect your existing QuickBooks Online account and have Porter work alongside it, or move your books into Porter and use it as your accounting system.",
      },
      {
        q: "Is Porter a fractional CFO?",
        a: "Porter is a finance team plus software. The team covers bookkeeping, receivables, payables, payroll, taxes, and financial planning and analysis, so many operators use it in place of hiring a finance department.",
      },
    ],
    related: [
      multiEntity,
      saleReady,
      booksCleanup,
      everyCompany,
      countedOnce,
      { href: "/use-cases/investor-updates", label: "Investor updates" },
      guide,
    ],
  },
  MULTI_ENTITY_PAGE,
  {
    path: "/family-offices",
    label: "Family offices",
    title: "Family Office Accounting and Consolidated Reporting | Porter",
    description: "Porter gives family offices a finance team plus software: separate books for every company, one consolidated view, and intercompany activity removed.",
    h1: "Accounting and consolidated reporting for family offices",
    lede: "Porter gives family offices a finance team plus accounting software that keeps separate books for every operating company and entity, rolls them into one consolidated view, and removes the business the companies do with each other. Our team handles the bookkeeping, payables, receivables and payroll across the group.",
    sections: [
      {
        kind: "list",
        title: "Who this is for",
        items: [
          "Family offices holding several operating companies, often in very different industries.",
          "Offices where group numbers are rolled up by hand in spreadsheets.",
          "Principals who want current numbers for each company and the whole group without waiting for month end.",
        ],
      },
      {
        kind: "list",
        title: "What Porter does for a family office",
        items: [
          "Separate books for each company, closed every month by our team.",
          "Consolidated Profit and Loss and Balance Sheet reports across the group.",
          "Activity between your companies removed when both sides are mapped and match.",
          "Drill from the group total into any company.",
          "Bills paid, invoices sent and payroll overseen across entities.",
        ],
      },
      {
        kind: "prose",
        title: "An anonymous example",
        paragraphs: [
          "One family office had dozens of operating companies in very different industries, each with its own books, rolled up by hand in spreadsheets. Porter brings every company into one place, rolls them into group numbers, and takes out the business the companies do with each other.",
        ],
      },
      {
        kind: "prose",
        title: "Privacy and security",
        paragraphs: [
          "Porter encrypts traffic in transit, relies on managed providers with platform encryption at rest, encrypts sensitive integration credentials at the application layer, and enforces company-scoped role-based access controls. Porter does not sell customer data, and its AI providers are contractually prohibited from training models on customer information.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Porter work with family offices?",
        a: "Yes. Porter keeps each company's books separate, closes them every month, and rolls them into consolidated group reports with intercompany activity removed.",
      },
      {
        q: "How do principals see the numbers?",
        a: "In the Porter app, in Slack, by text, or inside ChatGPT or Claude. You can ask a question and follow the answer to the chart or transaction behind it.",
      },
      {
        q: "Is family office data kept private?",
        a: "Access is company-scoped and role-based, sensitive credentials are encrypted, and Porter does not sell customer data. Porter's AI providers are contractually prohibited from training on customer information.",
      },
    ],
    related: [multiEntity, everyCompany, countedOnce, security, services],
  },
  {
    path: "/restaurants",
    label: "Restaurants",
    title: "Restaurant Bookkeeping and Accounting for Restaurant Groups | Porter",
    description: "Porter is a finance team plus software for restaurants and restaurant groups: sales and sales tax recorded, receipts chased by text, and a weekly profit and food-cost view.",
    h1: "Bookkeeping and accounting for restaurants and restaurant groups",
    lede: "Porter gives restaurants and restaurant groups a finance team plus software that records sales, sales tax and payroll, chases missing receipts by text, and sends a weekly profit report with a food-cost view. Each location can keep its own books and roll into one group view.",
    sections: [
      {
        kind: "list",
        title: "Who this is for",
        items: [
          "Independent restaurants and food shops.",
          "Owners running several locations, each with its own books.",
          "Operators who bought a restaurant and want numbers they can manage from every week.",
        ],
      },
      {
        kind: "list",
        title: "The challenges",
        items: [
          "Sales, sales tax and payroll typed in by hand.",
          "Card receipts that go missing.",
          "Profit and food cost known only at month end, or later.",
        ],
      },
      {
        kind: "list",
        title: "What Porter does",
        items: [
          "Records sales, sales tax and payroll.",
          "Collects receipts by text, so the team does not have to chase paper.",
          "Sends a weekly profit report with a food-cost view.",
          "Closes the books every month.",
          "Pays bills and oversees payroll.",
        ],
      },
      {
        kind: "prose",
        title: "Multiple locations",
        paragraphs: [
          "Each location keeps its own books. Porter rolls them into consolidated group reports and removes activity between your companies, so you see each location and the whole group. See [multi-entity accounting](/multi-entity).",
        ],
      },
      {
        kind: "prose",
        title: "An anonymous example",
        paragraphs: [
          "Porter checked a restaurant's books to the penny in two days, chases receipts by text, and sends a weekly profit report with a food-cost view. (Anonymous customer story, as published on the homepage.)",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Porter work with restaurants?",
        a: "Yes. Porter records sales, sales tax and payroll, chases receipts by text, and sends a weekly profit report with a food-cost view.",
      },
      {
        q: "Can Porter handle a restaurant group with several locations?",
        a: "Yes. Each location can keep its own books, and Porter rolls them into one group view with activity between your companies removed.",
      },
      {
        q: "How fast can Porter catch up behind restaurant books?",
        a: "Porter's cleanup work takes less than 2 weeks from the day we have access to your books and documents.",
      },
      {
        q: "Does Porter work with QuickBooks Online?",
        a: "Yes. Connect your QuickBooks Online account and have Porter work alongside it, or move your books into Porter.",
      },
      {
        q: "Does Porter track food cost?",
        a: "Yes. Porter sends a weekly profit report that includes a food-cost view.",
      },
    ],
    related: [
      booksCleanup,
      multiEntity,
      textBooks,
      { href: "/use-cases/cash-before-payroll", label: "Cash before payroll" },
      services,
    ],
  },
  {
    path: "/guides/fractional-cfo-vs-controller-vs-bookkeeper",
    label: "Fractional CFO vs controller vs bookkeeper",
    title: "Fractional CFO vs Controller vs Bookkeeper: Which You Need | Porter",
    description: "What a bookkeeper, controller and fractional CFO each do, the signs you need each one, and how a finance team plus software can cover all three roles.",
    h1: "Fractional CFO vs controller vs bookkeeper: what each does and when you need which",
    lede: "A bookkeeper records transactions and keeps accounts reconciled, a controller owns the monthly close, controls and accurate reporting, and a CFO uses those numbers to plan, forecast and raise money. Most small businesses need a bookkeeper first, a controller once the close and multiple entities get complex, and CFO-level planning when decisions about cash, hiring or financing get larger.",
    sections: [
      {
        kind: "table",
        title: "At a glance",
        columns: ["Role", "Main job", "Typical outputs", "You need it when"],
        rows: [
          ["Bookkeeper", "Record and reconcile", "Categorized transactions, reconciled accounts, invoices and bills entered", "You have real transactions and no one keeping the books current"],
          ["Controller", "Close and control", "Monthly close, accruals, approval rules, accurate financial statements, consolidation", "The close slips, there are several entities, or lenders and investors rely on your numbers"],
          ["CFO (fractional or full time)", "Plan and decide", "Forecasts, budgets, cash planning, fundraising and lender support", "Big decisions on hiring, pricing, financing or acquisitions depend on the numbers"],
        ],
      },
      {
        kind: "prose",
        title: "What a bookkeeper does",
        paragraphs: [
          "Categorizes transactions, reconciles bank and card accounts, records invoices and bills, and keeps the books current. Good bookkeeping is the foundation everything else depends on.",
        ],
      },
      {
        kind: "prose",
        title: "What a controller does",
        paragraphs: [
          "Owns the monthly close, accounting policies, approval rules and the accuracy of the financial statements. In a multi-entity business, the controller usually owns consolidation and intercompany activity.",
        ],
      },
      {
        kind: "prose",
        title: "What a fractional CFO does",
        paragraphs: [
          "A fractional CFO works part time on forecasting, budgeting, cash planning and conversations with investors and lenders. The role depends on reliable books and a reliable close; a CFO working from unreconciled books is guessing.",
        ],
      },
      {
        kind: "list",
        title: "Signs you need more than a bookkeeper",
        items: [
          "You have stopped looking at the reports, or stopped trusting them.",
          "The monthly close regularly runs more than 30 days late.",
          "You run more than one company.",
          "A lender, investor or buyer is about to look at your numbers.",
        ],
      },
      {
        kind: "prose",
        title: "How Porter fits",
        paragraphs: [
          "Porter is a finance team plus software that covers work across these roles: bookkeeping and accounting, accounts receivable, accounts payable, payroll, taxes, and financial planning and analysis. Start with the books and add controls and planning as you grow, without a hiring cycle.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the difference between a bookkeeper and a controller?",
        a: "A bookkeeper records and reconciles transactions. A controller owns the monthly close, accounting controls and the accuracy of the financial statements, and reviews the bookkeeper's work.",
      },
      {
        q: "What is the difference between a controller and a CFO?",
        a: "A controller looks backward and makes sure the numbers are right. A CFO looks forward and uses those numbers to plan, forecast and finance the business.",
      },
      {
        q: "When does a small business need a fractional CFO?",
        a: "When large decisions on hiring, pricing, financing or an acquisition depend on a forecast, and the books are already current and reliable enough to support one.",
      },
      {
        q: "Can one provider cover bookkeeping, controller and CFO work?",
        a: "Yes. Some providers, including Porter, combine bookkeeping, close, payables, receivables, payroll and financial planning in one team, so you add scope as you grow instead of hiring each role.",
      },
      {
        q: "Should I hire a CFO before my books are clean?",
        a: "Usually not. Forecasts built on unreconciled books are unreliable, so most businesses get the books current first.",
      },
      {
        q: "Do I need a controller if I have multiple entities?",
        a: "Often yes. Consolidation and intercompany activity are controller-level work, whether done in house or by an outsourced team.",
      },
    ],
    related: [
      services,
      multiEntity,
      { href: "/use-cases/before-you-hire", label: "Before you hire" },
      switchBookkeepers,
      searchFunds,
    ],
  },
  {
    path: "/faq",
    label: "Common questions",
    title: "Porter FAQ: Finance Team, Bookkeeping, Multi-Entity and More | Porter",
    description: "Direct answers to common questions about Porter, a finance team plus accounting software: services, QuickBooks, multi-entity, cleanup, security and getting started.",
    h1: "Porter: common questions",
    lede: "Porter is a finance team plus accounting software that handles bookkeeping, receivables, payables, payroll, taxes and financial planning for growing businesses, including groups with more than one company. Below are direct answers to the questions buyers ask most.",
    sections: [
      {
        kind: "prose",
        title: "How to use this page",
        paragraphs: [
          "Answers are grouped below as one FAQ list so each question can be quoted on its own. Each answer links back to the page with more detail.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is Porter?",
        a: "Porter is a finance team plus the software you use to work with them. The team handles your books and day-to-day finances, and you get current numbers, clear answers and people who know your business.",
        more: whyPorter,
      },
      {
        q: "Is Porter just software?",
        a: "No. Porter is a finance team plus accounting software. The team does the work, and the software lets you see the numbers and ask questions.",
        more: software,
      },
      {
        q: "Who is Porter for?",
        a: "Founders and operators who want their finances handled. Porter works with startups, service businesses, restaurants, studios, search fund and roll-up operators, family offices, and groups with more than one company.",
        more: whyPorter,
      },
      {
        q: "What services does Porter provide?",
        a: "Bookkeeping and accounting, accounts receivable, accounts payable, payroll, taxes, and financial planning and analysis. Start with what you need and add more as you grow.",
        more: services,
      },
      {
        q: "Does Porter replace QuickBooks?",
        a: "It can. Use Porter as your accounting system, or connect your existing QuickBooks Online account and have Porter work alongside it.",
        more: software,
      },
      {
        q: "Can Porter handle more than one company?",
        a: "Yes. Each company keeps its own books, and Porter rolls them into consolidated Profit and Loss and Balance Sheet reports with matching activity between your companies removed.",
        more: multiEntity,
      },
      {
        q: "How does Porter handle intercompany transactions?",
        a: "When both sides are mapped and the amounts match, Porter removes them from the consolidated report. Unmatched amounts stay visible for review.",
        more: multiEntity,
      },
      {
        q: "How fast can Porter catch up behind books?",
        a: "Less than 2 weeks from the day we have access to your books and documents, whether you are two months behind or several years.",
        more: booksCleanup,
      },
      {
        q: "What does a books cleanup include?",
        a: "Every bank and card account reconciled, categories fixed, missing months filled in, nothing left uncategorized, and loans and equipment recorded properly. Then a monthly close keeps the books current.",
        more: booksCleanup,
      },
      {
        q: "Can Porter get my books ready for a sale?",
        a: "Yes. Porter cleans up the books, ties them to your bank statements and filed tax returns, and keeps them current through the letter of intent, diligence and closing. Porter does not sell quality of earnings reports or certify anything.",
        more: saleReady,
      },
      {
        q: "Does Porter work with search funds and PE roll-ups?",
        a: "Yes. Porter catches up the books of each acquired company, closes every entity monthly, consolidates the group, and keeps investor reports ready.",
        more: searchFunds,
      },
      {
        q: "Does Porter work with family offices?",
        a: "Yes. Porter keeps separate books for each company, rolls them into one consolidated view, and removes the business the companies do with each other.",
        more: familyOffices,
      },
      {
        q: "Does Porter work with restaurants?",
        a: "Yes. Porter records sales, sales tax and payroll, chases receipts by text, and sends a weekly profit report with a food-cost view.",
        more: restaurants,
      },
      {
        q: "Does Porter work with startups?",
        a: "Yes. Porter closes the books every month, keeps investor reports ready, and schedules revenue by contract so it lands in the month it is earned.",
        more: whyPorter,
      },
      {
        q: "Can I use Porter in ChatGPT or Claude?",
        a: "Yes. Connect Porter to ChatGPT or Claude and ask questions about your books in the chat you already use. You can also use the Porter app, Slack or text.",
        more: chatgpt,
      },
      {
        q: "Can I ask Porter questions in Slack?",
        a: "Yes. Porter for Slack lets you ask about your books where your team already works.",
        more: slack,
      },
      {
        q: "Can I do my books by text?",
        a: "Yes. Porter can ask about unclear transactions and collect receipts by text, and you can reply from your phone.",
        more: textBooks,
      },
      {
        q: "Does Porter chase unpaid invoices?",
        a: "Yes. Porter sends invoices, follows up on money you are owed, and matches each payment to its invoice.",
        more: invoices,
      },
      {
        q: "Does Porter run payroll?",
        a: "Yes. Porter runs or oversees payroll, including bonuses and commissions, and can pay teams overseas.",
        more: services,
      },
      {
        q: "How is Porter priced?",
        a: "Your plan reflects the services your business needs. Tell us what you want handled and the team will recommend a scope and price.",
        more: services,
      },
      {
        q: "How do I get started with Porter?",
        a: "Tell us about your business and what you want help with. The Porter team will recommend a plan, connect your systems, and work through the move with you.",
        more: services,
      },
      {
        q: "Is my financial data secure with Porter?",
        a: "Porter encrypts traffic in transit, relies on managed providers with platform encryption at rest, encrypts sensitive integration credentials, and enforces company-scoped role-based access. Porter does not sell customer data.",
        more: security,
      },
      {
        q: "Does Porter train AI on my data?",
        a: "No. Porter's AI providers are contractually prohibited from training models on customer information.",
        more: security,
      },
      {
        q: "Does Porter replace my accountant or CPA?",
        a: "No. Porter keeps your books current and hands your accountant books they can work from.",
        more: booksCleanup,
      },
      {
        q: "What is the difference between a bookkeeper and a controller?",
        a: "A bookkeeper records and reconciles transactions. A controller owns the monthly close, controls and the accuracy of the financial statements.",
        more: guide,
      },
      {
        q: "How do I switch bookkeepers without losing data?",
        a: "Export your general ledger and prior statements, confirm you keep access to your accounting file, and have the next provider catch up any months that are behind before the monthly close starts.",
        more: switchBookkeepers,
      },
    ],
    related: [services, multiEntity, booksCleanup, saleReady, searchFunds, familyOffices, restaurants, security, slack],
  },
];

function absoluteLinks(text: string) {
  return text.replace(/\]\((\/[^)]+)\)/g, `](${ORIGIN}$1)`);
}

export function topicMarkdownBody(page: TopicPage): string[] {
  const lines: string[] = [page.lede, ""];
  for (const section of page.sections) {
    lines.push(`## ${section.title}`, "");
    if (section.kind === "prose") {
      for (const paragraph of section.paragraphs) lines.push(absoluteLinks(paragraph), "");
    } else if (section.kind === "list") {
      for (const item of section.items) lines.push(`- ${item}`);
      lines.push("");
    } else if (section.kind === "points") {
      for (const item of section.items) lines.push(`- **${item.lead}** ${item.body}`);
      lines.push("");
    } else if (section.kind === "steps") {
      section.items.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
      lines.push("");
    } else {
      lines.push(`| ${section.columns.join(" | ")} |`);
      lines.push(`| ${section.columns.map(() => "---").join(" | ")} |`);
      for (const row of section.rows) lines.push(`| ${row.join(" | ")} |`);
      lines.push("");
    }
  }
  lines.push("## Common questions", "");
  for (const faq of page.faqs) {
    lines.push(`### ${faq.q}`, "", faq.a, "");
    if (faq.more) lines.push(`[${faq.more.label}](${ORIGIN}${faq.more.href})`, "");
  }
  lines.push("## Related", "");
  for (const item of page.related) lines.push(`- [${item.label}](${ORIGIN}${item.href})`);
  lines.push("", "Tell us about your business and what you want handled. The Porter team will recommend a plan and a scope.");
  return lines;
}
