export const CATEGORIES = ["All", "Get paid", "Cash", "Answers", "Month end", "More than one company", "Planning"] as const;
export type Category = typeof CATEGORIES[number];
export type UseCase = { id: number; slug: string; title: string; category: Category; before: string; during: string; result: string; alt: string };
export const USE_CASES: UseCase[] = [
  {
    "id": 1,
    "slug": "text-your-books",
    "title": "Do your books by text",
    "category": "Answers",
    "before": "Questions about your books pile up until month end.",
    "during": "Porter texts you. Reply in your own words.",
    "result": "Booked, and remembered next time.",
    "alt": "Do your books by text. Porter texts you. Reply in your own words. Booked, and remembered next time."
  },
  {
    "id": 2,
    "slug": "ask-your-books",
    "title": "Ask your books anything",
    "category": "Answers",
    "before": "Gross profit drops and the report won't say why.",
    "during": "Ask Porter in plain English.",
    "result": "The reason, and a chart if you want one.",
    "alt": "Ask your books anything. Ask Porter in plain English. The reason, and a chart if you want one."
  },
  {
    "id": 3,
    "slug": "invoice-nobody-billed",
    "title": "The invoice nobody sent",
    "category": "Get paid",
    "before": "A finished job never gets invoiced.",
    "during": "Porter checks every job against what you billed.",
    "result": "Money you're owed, on its way.",
    "alt": "The invoice nobody sent. Porter checks every job against what you billed. Money you're owed, on its way."
  },
  {
    "id": 4,
    "slug": "before-you-hire",
    "title": "Know the cost before you commit",
    "category": "Planning",
    "before": "Big decisions, with no CFO to ask.",
    "during": "Porter runs the decision through your plan.",
    "result": "See what it does to your cash first.",
    "alt": "Know the cost before you commit. Porter runs the decision through your plan. See what it does to your cash first."
  },
  {
    "id": 5,
    "slug": "every-company",
    "title": "Every company, one set of numbers",
    "category": "More than one company",
    "before": "Group numbers arrive four weeks after month end.",
    "during": "Porter rolls each company into the parent as the books update.",
    "result": "The whole group, today.",
    "alt": "Every company, one set of numbers. Porter rolls each company into the parent as the books update. The whole group, today."
  },
  {
    "id": 6,
    "slug": "works-where-you-work",
    "title": "Porter, inside ChatGPT and Claude",
    "category": "Answers",
    "before": "Your numbers live in one app. You work in another.",
    "during": "Connect Porter to ChatGPT or Claude. Ask about your business in the chat you already use.",
    "result": "Your books, in the conversation.",
    "alt": "Porter, inside ChatGPT and Claude. Connect Porter to ChatGPT or Claude. Ask about your business in the chat you already use. Your books, in the conversation."
  },
  {
    "id": 7,
    "slug": "reports-by-asking",
    "title": "Reports without the wait",
    "category": "Answers",
    "before": "A new report means days of waiting.",
    "during": "Tell Porter what you want to see.",
    "result": "The view you need, today.",
    "alt": "Reports without the wait. Tell Porter what you want to see. The view you need, today."
  },
  {
    "id": 8,
    "slug": "cash-before-payroll",
    "title": "See cash problems before payday",
    "category": "Cash",
    "before": "Cash looks fine until payroll.",
    "during": "Porter sees the gap weeks ahead and tells you which invoices to send.",
    "result": "Payroll covered, with room to spare.",
    "alt": "See cash problems before payday. Porter sees the gap weeks ahead and tells you which invoices to send. Payroll covered, with room to spare."
  },
  {
    "id": 9,
    "slug": "one-payment-three-invoices",
    "title": "Know who paid, and for what",
    "category": "Get paid",
    "before": "A payment lands and nobody knows what it covers.",
    "during": "Porter matches it to the invoices it pays.",
    "result": "Marked paid. No digging.",
    "alt": "Know who paid, and for what. Porter matches it to the invoices it pays. Marked paid. No digging."
  },
  {
    "id": 10,
    "slug": "split-shared-bills",
    "title": "Shared bills, split for you",
    "category": "More than one company",
    "before": "One bill, split by hand across companies every month.",
    "during": "Tell Porter the split once.",
    "result": "Booked that way every month.",
    "alt": "Shared bills, split for you. Tell Porter the split once. Booked that way every month."
  },
  {
    "id": 11,
    "slug": "what-changed",
    "title": "What changed this month, and why",
    "category": "Answers",
    "before": "Your numbers show what happened, never why.",
    "during": "Porter tells you what moved and what drove it.",
    "result": "Your month, explained.",
    "alt": "What changed this month, and why. Porter tells you what moved and what drove it. Your month, explained."
  },
  {
    "id": 12,
    "slug": "where-the-money-goes",
    "title": "Where the money goes",
    "category": "Cash",
    "before": "Costs creep up one vendor at a time.",
    "during": "Ask Porter who you're buying more from.",
    "result": "Found before the next bill.",
    "alt": "Where the money goes. Ask Porter who you're buying more from. Found before the next bill."
  },
  {
    "id": 13,
    "slug": "learns-your-way",
    "title": "It learns how you do things",
    "category": "Month end",
    "before": "You explain how things get booked, again and again.",
    "during": "Porter watches how you do it and does it the same way.",
    "result": "Booked your way. Nothing to set up.",
    "alt": "It learns how you do things. Porter watches how you do it and does it the same way. Booked your way. Nothing to set up."
  },
  {
    "id": 14,
    "slug": "set-a-policy-once",
    "title": "Tell it your rules once",
    "category": "Month end",
    "before": "Big purchases get handled differently every time.",
    "during": "Tell Porter your policy in one sentence.",
    "result": "Handled the same way, every month.",
    "alt": "Tell it your rules once. Tell Porter your policy in one sentence. Handled the same way, every month."
  },
  {
    "id": 15,
    "slug": "thin-month-ahead",
    "title": "See a thin month coming",
    "category": "Cash",
    "before": "You find out a month was slow after it's over.",
    "during": "Porter lists every invoice due in the next 30 days.",
    "result": "Spotted while there's time to act.",
    "alt": "See a thin month coming. Porter lists every invoice due in the next 30 days. Spotted while there's time to act."
  },
  {
    "id": 16,
    "slug": "month-end-handled",
    "title": "Month end, handled",
    "category": "Month end",
    "before": "Month end drags on for weeks.",
    "during": "Porter matches every account to the bank and closes the month.",
    "result": "Closed, with nothing left hanging.",
    "alt": "Month end, handled. Porter matches every account to the bank and closes the month. Closed, with nothing left hanging."
  },
  {
    "id": 17,
    "slug": "ask-in-slack",
    "title": "Ask your books in Slack",
    "category": "Answers",
    "before": "A simple question means someone logging in to check.",
    "during": "Ask Porter in Slack.",
    "result": "Answered in the channel.",
    "alt": "Ask your books in Slack. Ask Porter in Slack. Answered in the channel."
  },
  {
    "id": 18,
    "slug": "deposits-arent-income",
    "title": "Know what you really made",
    "category": "Cash",
    "before": "A client deposit gets counted as income.",
    "during": "Porter tracks it as work you still owe.",
    "result": "Revenue you actually earned.",
    "alt": "Know what you really made. Porter tracks it as work you still owe. Revenue you actually earned."
  },
  {
    "id": 19,
    "slug": "investor-updates",
    "title": "Investor updates, ready when you are",
    "category": "Planning",
    "before": "Every quarter you rebuild the same investor update.",
    "during": "Save the quarter in Porter and send it from there.",
    "result": "Same numbers as your books.",
    "alt": "Investor updates, ready when you are. Save the quarter in Porter and send it from there. Same numbers as your books."
  },
  {
    "id": 20,
    "slug": "counted-once",
    "title": "Nothing counted twice",
    "category": "More than one company",
    "before": "Sales between your own companies get stripped out by hand.",
    "during": "Porter finds them and takes them out of the group total.",
    "result": "Group numbers you can trust.",
    "alt": "Nothing counted twice. Porter finds them and takes them out of the group total. Group numbers you can trust."
  }
];
export const FEATURED_IDS = [3, 2, 1, 4, 5, 6];
export const FEATURED_CASES = FEATURED_IDS.map(id => USE_CASES.find(item => item.id === id)!);
