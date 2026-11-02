import {
  BOOKS_BEHIND_OPTIONS,
  BOOKS_CLEANUP_CHECKLIST,
  BOOKS_CLEANUP_CHECKLIST_FOOTER,
  BOOKS_CLEANUP_CHECKLIST_SUBTITLE,
  BOOKS_CLEANUP_CHECKLIST_TITLE,
  BOOKS_CLEANUP_URL,
} from "../src/content/booksCleanupChecklist.js";
import { checklistItemsHtml, handleChecklistLead, type ChecklistOffer } from "../server/checklistLead.js";

const BOOKS_BEHIND = new Set<string>(BOOKS_BEHIND_OPTIONS);

// Reason: Same shared lead flow as Sale-Ready (server/checklistLead.ts); only the
// answer, copy and event prefix differ. offer=books_cleanup separates this
// campaign's Leads from Sale-Ready's inside the shared Meta dataset.
export const BOOKS_CLEANUP_OFFER: ChecklistOffer = {
  label: "Books Cleanup",
  metaLeadEventPrefix: "books_cleanup_lead_",
  idempotencyPrefix: "books-cleanup",
  defaultPageUrl: BOOKS_CLEANUP_URL,
  // Reason: A contact can request the checklist before sharing qualification
  // details. Supplied answers still have to match the offer's choices.
  validAnswers: lead => lead.books_behind === undefined || lead.books_behind === "" || BOOKS_BEHIND.has(String(lead.books_behind)),
  answerRows: lead => [["How far behind", String(lead.books_behind || "Not provided")]],
  // Reason: Match the ad offer and identify Porter before personal follow-up.
  checklistSubject: "Porter | Your year-end books checklist",
  checklistHtml: () => `<div style="font-family:inherit;color:inherit"><h2 style="font-size:20px;font-weight:600">${BOOKS_CLEANUP_CHECKLIST_TITLE}</h2><p><em>${BOOKS_CLEANUP_CHECKLIST_SUBTITLE}</em></p><ol>${checklistItemsHtml(BOOKS_CLEANUP_CHECKLIST)}</ol><p>${BOOKS_CLEANUP_CHECKLIST_FOOTER}</p><p><a href="${BOOKS_CLEANUP_URL}">books-cleanup.buildwithporter.com</a></p></div>`,
  notificationSubject: "Porter | New Books Cleanup lead",
  // Reason: Ben could not find a captured contact because the notification only
  // targeted Support and Michael. Both operators need direct visibility.
  notificationRecipients: ["support@buildwithporter.com", "michael@buildwithporter.com", "ben@buildwithporter.com"],
  metaCustomData: { offer: "books_cleanup" },
};

export default function handler(request: Request): Promise<Response> {
  return handleChecklistLead(BOOKS_CLEANUP_OFFER, request);
}

export const config = { runtime: "edge" };
