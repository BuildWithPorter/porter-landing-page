// Reason: The thank-you screen and the delivery email must show the same eight
// items. One content source keeps the promised checklist identical in both.
// Copy is Michael's final handoff (2026-09-29); do not edit wording here without him.
export const BOOKS_CLEANUP_CHECKLIST_TITLE = "The Year-End Books Checklist";
export const BOOKS_CLEANUP_CHECKLIST_SUBTITLE = "Eight things to have in order before your accountant asks for the books";
export const BOOKS_CLEANUP_CHECKLIST_FOOTER = "Behind on any of these? Porter gets your books caught up in less than 2 weeks and keeps them current every month after.";
export const BOOKS_CLEANUP_URL = "https://books-cleanup.buildwithporter.com/";

export const BOOKS_CLEANUP_CHECKLIST = [
  ["Every bank and credit card account is reconciled, every month.", "The balance in your books matches the statement month by month, not just in December."],
  ["Nothing is sitting in \"uncategorized\" or \"ask my accountant.\"", "Every one of those is a question you'll be answering in January."],
  ["Every loan is recorded, and the balance matches the lender's statement.", ""],
  ["Sales tax you collected is recorded as money owed to the state, not as an expense.", "Booked wrong, it makes good months look like losses."],
  ["Equipment and vehicles you bought this year are on the books.", ""],
  ["Personal and business spending are separated.", ""],
  ["Payroll in the books matches your payroll reports.", ""],
  ["The list of money you're owed matches your open invoices.", "Old invoices nobody will pay should be cleared out before the year closes."],
] as const;

// Reason: The form, the API validator and the operator notification must agree
// on the exact answer set, so it lives beside the checklist they all import.
export const BOOKS_BEHIND_OPTIONS = ["Up to date", "1 to 3 months", "3 to 12 months", "More than a year", "Not sure"] as const;
