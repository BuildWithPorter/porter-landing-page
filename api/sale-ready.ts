import { SALE_READY_CHECKLIST } from "../src/content/saleReadyChecklist.js";
import { checklistItemsHtml, handleChecklistLead, type ChecklistOffer } from "../server/checklistLead.js";

const TIMEFRAMES = new Set(["In the next 6 months", "6 to 12 months", "12 to 24 months", "Not sure yet"]);
const BOOKS_STATUS = new Set(["Up to date", "One or two months behind", "Three or more months behind", "Not sure"]);
const HELP = new Set(["Catch up missing months", "Tie books to bank statements", "Prepare numbers for buyers", "Keep books current through closing"]);

// Reason: The delivery, idempotency and Meta dedupe flow is shared with the other
// checklist campaigns in server/checklistLead.ts; this file owns only Sale-Ready's
// answers and copy.
export const SALE_READY_OFFER: ChecklistOffer = {
  label: "Sale-Ready",
  // Reason: Separate the checklist offer inside the shared Meta dataset.
  metaCustomData: { offer: "sale_ready" },
  metaLeadEventPrefix: "sale_ready_lead_",
  idempotencyPrefix: "sale-ready",
  defaultPageUrl: "https://sale-ready.buildwithporter.com/",
  validAnswers: lead => TIMEFRAMES.has(String(lead.timeframe)) && BOOKS_STATUS.has(String(lead.books_status))
    && Array.isArray(lead.help_with) && lead.help_with.every(x => HELP.has(String(x))),
  answerRows: lead => [["Selling timeframe", String(lead.timeframe)], ["Books status", String(lead.books_status)], ["Help wanted", (lead.help_with as string[]).join(", ") || "No selection"]],
  checklistSubject: "Your Sale-Ready Books Checklist",
  checklistHtml: () => `<div style="max-width:660px;margin:auto;font-family:Georgia,serif;color:#0c211a"><h1>The Sale-Ready Books Checklist</h1><p><em>Ten things a buyer's accountant checks first</em></p><ol>${checklistItemsHtml(SALE_READY_CHECKLIST)}</ol><p>Porter cleans up your books in less than 2 weeks and keeps them current until you close.</p><p><a href="https://sale-ready.buildwithporter.com/">sale-ready.buildwithporter.com</a></p></div>`,
  notificationSubject: "New Sale-Ready Books lead",
  // Reason: Match the Books Cleanup operator delivery so a captured contact is
  // visible directly to both operators, including Ben.
  notificationRecipients: ["support@buildwithporter.com", "michael@buildwithporter.com", "ben@buildwithporter.com"],
};

export default function handler(request: Request): Promise<Response> {
  return handleChecklistLead(SALE_READY_OFFER, request);
}

export const config = { runtime: "edge" };
