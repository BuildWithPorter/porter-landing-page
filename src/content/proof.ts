// Reason: a story's short summary and illustration belong to the story. They used to be
// parallel arrays in ScalesWithYou matched to CASES by position, so reordering CASES
// silently paired a story with another story's summary and chart. Industry proof cases
// carry neither field and render their body alone.
export type Case = { kind: string; body: string; icon: string; summary?: string; art?: { name: string; alt: string } };
export const CASES: Case[] = [
  {
    "kind": "Family office with dozens of companies",
    "icon": "apartment",
    "body": "Dozens of operating companies in very different industries, each with its own books, rolled up by hand in spreadsheets. Porter brings every company into one place, rolls them into group numbers, and takes out the business the companies do with each other.",
    "summary": "Separate company books. One consolidated view, with intercompany activity removed.",
    "art": {
      "name": "proof-1",
      "alt": "Company revenue combines to 290, then 30 of intercompany revenue is removed for a group total of 260."
    }
  },
  {
    "kind": "Home services business",
    "icon": "home_work",
    "body": "Estimates were copied into invoices by hand, and payments were recorded one at a time. Porter now sends the invoices, takes the payments, records them every week, oversees payroll, and closes the books every month.",
    "summary": "Completed work becomes invoices. Payments are matched. The books stay current.",
    "art": {
      "name": "proof-2",
      "alt": "Completed jobs connect to sent invoices and matched payments."
    }
  },
  {
    "kind": "Executive search firm in two countries",
    "icon": "business_center",
    "body": "Three companies, a team overseas, and everything run in spreadsheets with no approval rules. Porter runs payroll with bonuses and commissions, sends invoices and chases the money they're owed, pays the overseas team, and cut the subscriptions nobody used.",
    "summary": "Payroll, commissions and payments across two countries, handled by one finance team.",
    "art": {
      "name": "proof-3",
      "alt": "Payroll, bonuses and commissions are recorded for home and overseas teams."
    }
  },
  {
    "kind": "Restaurants and food shops",
    "icon": "restaurant",
    "body": "Sales, sales tax, and payroll were typed in by hand, and card receipts went missing. Porter checked a restaurant's books to the penny in two days, chases receipts by text, and sends a weekly profit report with a food-cost view.",
    "summary": "Receipts collected. Sales recorded. A weekly view of profit and food costs.",
    "art": {
      "name": "proof-4",
      "alt": "Sales less food costs, payroll and other costs equals profit."
    }
  },
  {
    "kind": "Series B software company",
    "icon": "rocket_launch",
    "body": "Annual plans and older contracts on different terms. Porter runs the whole finance function, from payroll and bills to invoicing and month end, with a revenue schedule for every contract so revenue lands in the month it's earned.",
    "summary": "Annual contracts become monthly revenue, with the full finance function behind them.",
    "art": {
      "name": "proof-5",
      "alt": "A 120,000 annual contract is recognized as 10,000 of revenue each month."
    }
  },
  {
    "kind": "Interior design studio",
    "icon": "chair",
    "body": "Client furniture deposits were being counted as profit, and vendor orders lived in an inbox. Porter keeps client money separate from the studio's fees, matches every vendor bill to the client invoice it belongs to, and closes the books every month.",
    "summary": "Client deposits stay separate from studio fees. Every vendor bill connects to its project.",
    "art": {
      "name": "proof-6",
      "alt": "Furniture deposits are held for client purchases, separate from earned studio fees."
    }
  },
  {
    "kind": "Startup funded by a credit line",
    "icon": "account_balance",
    "body": "Advances money to contractors from a credit line, and moved its books over from a large accounting firm. Porter picked up where the old firm left off, tracks interest on every draw, schedules revenue by contract, and matches each payment to its invoice.",
    "summary": "Interest tracked by draw. Revenue scheduled by contract. Payments matched to invoices.",
    "art": {
      "name": "proof-7",
      "alt": "Each credit-line draw has its own interest calculation."
    }
  },
  {
    "kind": "Online and wholesale beauty brand",
    "icon": "storefront",
    "body": "Sells online, in stores, wholesale, and through workshops, and the books hadn't been caught up all year. Porter cleaned up the past months and splits revenue by channel, so the owner sees what each one really brings in.",
    "summary": "Past months caught up. Revenue separated by channel, so every line of business is clear.",
    "art": {
      "name": "proof-8",
      "alt": "Revenue is broken out across online, wholesale, store and workshop channels."
    }
  },
  {
    "kind": "Seed-stage startups getting ready to raise",
    "icon": "query_stats",
    "body": "Books had to hold up to investor questions, and one had privacy rules that ruled out connected apps. Porter cleaned up the past year, closes every month, asks the team about anything unclear, and keeps investor reports ready to send.",
    "summary": "Current books and a reliable monthly close. Investor reports ready when you need them.",
    "art": {
      "name": "proof-9",
      "alt": "Current books and a monthly close support investor reporting."
    }
  },
  {
    "kind": "Therapy practice",
    "icon": "sentiment_satisfied",
    "body": "Payouts from the practice's billing system landed on different days than sessions were billed, and some clients paid outside it. Porter matches every payout to the bank and keeps the books current from the first month.",
    "summary": "Sessions, payouts and bank records brought together. Books current from the first month.",
    "art": {
      "name": "proof-10",
      "alt": "Billed sessions connect to payouts and matching bank records."
    }
  }
];
