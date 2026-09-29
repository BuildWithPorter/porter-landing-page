// Reason: The thank-you page and delivery email must show the same ten items.
// A single content source prevents the promised checklist from drifting between channels.
export const SALE_READY_CHECKLIST = [
  ["Every bank and credit card account is reconciled, every month.", "The balance in your books matches the statement, month by month, not just at year-end."],
  ["Your books agree with the tax returns you filed.", "If revenue or profit on the return differs from the books, a buyer will ask why."],
  ["Nothing is sitting in \"uncategorized\" or \"ask my accountant.\"", "Unexplained balances read as unknown risk."],
  ["Every loan is recorded, and the balance matches the lender's statement.", "A missing loan changes what the business is worth."],
  ["Sales tax you collected is recorded as money owed to the state, not as an expense.", "Booked wrong, it makes profitable months look like losses."],
  ["Equipment and vehicles are on the books, and depreciation matches your return.", ""],
  ["Personal and business spending are separated.", "Buyers need to see what the business really costs to run."],
  ["Payroll in the books matches your payroll reports.", ""],
  ["The list of money you're owed matches your open invoices.", "Old invoices nobody will pay should be cleared out."],
  ["Each month is closed within a few weeks of month-end.", "Current numbers are what carry you through diligence."],
] as const;
