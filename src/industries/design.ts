import type { IndustryContent } from "./types";

// Reason (POR-3087): copy is the reviewed Porter Design deck
// (https://claude.ai/artifact/1M7n4uebKfJQPt4TPG7vfk), written from what the one
// live design-studio customer actually asks Porter. Every claim below was traced
// to production evidence. Deliberately NOT claimed because Porter does not do it
// today: profit per project, generating procurement or true-up invoices, sales
// tax on product, a full order tracker for every project, and direct design-
// software integrations. Do not add them until they ship.
export const design: IndustryContent = {
  key: "design",
  path: "/design",
  host: "design.buildwithporter.com",
  brand: "Porter Design",
  auditBusinessType: "Interior design",
  seo: {
    title: "Porter Design | The finance team for interior design studios",
    description:
      "Porter keeps client deposits, procurement fees, and vendor orders straight, so you know what's yours, what your studio earned, and what you can pay yourself. Start with a free audit of your books.",
  },
  hero: {
    // Reason: Ben 2026-09-18 wanted an emotional draw (more money, less stress, more control, more peace).
    title: "Know what your studio really earned, and what you can pay yourself.",
    sub: "Porter is the finance team and accounting software for interior design studios. Client deposits stay separate from your fees, every vendor order lands on the right project, and you get plain-English answers instead of a midnight spreadsheet.",
  },
  pain: {
    title:
      "Most design studios run a business inside a pass-through account, and their books can't tell the two apart.",
    cards: [
      {
        quote: "My books say I had a huge month. I didn't.",
        body: "A client's furniture deposit landed and the P&L called it profit. Now your numbers, and maybe your tax bill, are inflated by money that belongs to vendors.",
        illustration: "books",
      },
      {
        quote: "I have no idea which projects actually make money.",
        body: "Design fees, hourly time, markup, freight, returns, restocking fees. It's all in one pile, so you guess.",
        illustration: "invoices",
      },
      {
        quote: "I'm retyping invoices at midnight.",
        body: "The spec tool, the invoicing tool, QuickBooks, and a spreadsheet to true up quoted against actual. Every order gets entered three times.",
        // Reason: this illustration is a stack of software subscriptions, which
        // is exactly the "spec tool, invoicing tool, QuickBooks" sprawl here.
        illustration: "tools",
      },
      {
        quote: "Order updates are buried in my inbox.",
        body: "Quotes, confirmations, shipping notices, vendor bills and deposit requests arrive by email, and the only tracking system is your memory.",
        illustration: "bookkeeper",
      },
    ],
  },
  does: {
    title: "A finance team that speaks procurement.",
    items: [
      {
        title: "Keeps client money separate from yours.",
        body: "Client deposits for furniture and product are held apart from your earnings, so your P&L shows only what you earned: design fees, procurement fees and hourly work.",
      },
      {
        title: "Splits every client payment the right way.",
        body: "When a client pays a procurement invoice, your fee is counted as income and the rest is set aside as client money for vendors.",
      },
      {
        title: "Reads your vendor mail so you don't have to.",
        body: "Porter sorts vendor email from noise, files quotes, order confirmations, shipping and delivery updates to the right project, and drafts vendor bills from invoices.",
      },
      {
        title: "Catches vendor bill surprises.",
        body: "When an invoice doesn't match what you agreed to, or a refund never shows up on your card, Porter flags it before you pay or forget.",
      },
      {
        title: "Tells you what you can safely pay yourself.",
        body: "Cash in the bank, minus client money, minus card balances, minus a cushion for overhead. A clear number, with the math shown.",
      },
      {
        title: "Closes your books every month.",
        body: "Statements matched, cards sorted, personal charges kept off the business, and a plain-English review of fees, overhead and cash.",
      },
      {
        title: "Answers questions by email.",
        body: "Ask \"what did we actually spend on overhead last month?\" and get the vendor-by-vendor answer, not an accounting report.",
      },
    ],
  },
  proof: {
    kind: "Residential interior design studio",
    icon: "chair",
    body: "Client furniture deposits were being counted as profit, and vendor orders lived in an inbox. Porter separated client money from fees, cleaned up a year of books, files vendor quotes, orders and deliveries to the right project, and tells the partners what they can pay themselves.",
  },
  faq: [
    {
      q: "Does Porter understand procurement and markup?",
      a: "Yes. Porter tracks each client payment as two things: your procurement fee or markup, which is income, and the client's money for the product itself, which is set aside until you pay the vendor. Your P&L shows only what your studio earned.",
    },
    {
      q: "How does Porter handle client deposits and retainers?",
      a: "Client deposits for product are held as client money, not income, until they're spent on the vendor order. Design fees and retainers count as your earnings when billed. You always see how much of your bank balance is actually yours.",
    },
    {
      q: "Can Porter handle flat fees, hourly billing and procurement fees on the same project?",
      a: "Yes. Design fees, hourly work, procurement fees and trade fees stay as separate income lines, so you can see which kind of work pays.",
    },
    {
      q: "Do I have to change how I work with vendors?",
      a: "No. Keep ordering the way you do. Connect your email and Porter picks up quotes, order confirmations, shipping notices and vendor invoices and files them to the right project.",
    },
    {
      q: "We already use design software for specs and client invoices. Does Porter replace it?",
      a: "No. Keep your spec and invoicing tool. Porter sits underneath it as your finance team and accounting system, connected to QuickBooks, your bank and your cards, and catches what those tools miss, like client payments that were recorded but never matched to a deposit.",
    },
    {
      q: "Our books are a mess. Can you fix past months?",
      a: "Yes. Client deposits counted as income and card charges that never made it into the books are among the most common problems in design studio books. We start with a free audit, then clean up the year so your numbers are ones you can trust.",
    },
    {
      q: "Will Porter tell me what I can pay myself?",
      a: "Yes. We take cash in the bank, subtract client money, upcoming card payments and a cushion for overhead, and give you a clear number with the math shown.",
    },
  ],
  finalCta: {
    eyebrow: "Get started",
    title: "Find out how much of your bank balance is actually yours.",
    body: "Connect QuickBooks and get six plain-English findings about your books, each with the evidence behind it. Free, and yours to keep.",
  },
};
