import { StatusPill } from "../primitives/StatusPill";
import "./ProductDashboardCard.css";

const INVOICES = [
  { customer: "Bridgepoint Holdings", amount: "$24,500", age: "12 days", tone: "neutral" as const, label: "Sent" },
  { customer: "Northwind Logistics", amount: "$8,940", age: "28 days", tone: "attention" as const, label: "Follow-up drafted" },
  { customer: "Cedar & Vine LLC", amount: "$3,275", age: "3 days", tone: "done" as const, label: "Paid" },
  { customer: "Wakefield Co.", amount: "$16,800", age: "47 days", tone: "overdue" as const, label: "Overdue" },
];

export function ProductDashboardCard() {
  return (
    <div className="pdc" aria-hidden="true">
      <div className="pdc__panel pdc__panel--dashboard">
        <div className="pdc__panel-head">
          <span className="pdc__panel-label">Overview</span>
          <span className="pdc__panel-meta">May 2026</span>
        </div>
        <div className="pdc__metrics">
          <div className="pdc__metric">
            <div className="pdc__metric-label">Revenue</div>
            <div className="pdc__metric-value">$112,400</div>
            <div className="pdc__metric-delta">+12.4%</div>
          </div>
          <div className="pdc__metric">
            <div className="pdc__metric-label">Expenses</div>
            <div className="pdc__metric-value">$74,820</div>
            <div className="pdc__metric-delta">+4.1%</div>
          </div>
          <div className="pdc__metric">
            <div className="pdc__metric-label">Cash on hand</div>
            <div className="pdc__metric-value">$284,160</div>
            <div className="pdc__metric-delta pdc__metric-delta--muted">82 days runway</div>
          </div>
        </div>
      </div>

      <div className="pdc__panel pdc__panel--ask">
        <div className="pdc__panel-head">
          <span className="pdc__panel-label">Ask anything</span>
        </div>
        <div className="pdc__chat">
          <div className="pdc__chat-q">How much did we make last month, and what changed?</div>
          <div className="pdc__chat-a">
            You made <strong>$112,400</strong> in revenue and spent <strong>$74,820</strong>, for net income of <strong>$37,580</strong>. Revenue was up 12.4% versus April. The biggest mover: a new contract with Bridgepoint Holdings added $24,500 in recurring monthly billing.
          </div>
        </div>
      </div>

      <div className="pdc__panel pdc__panel--ar">
        <div className="pdc__panel-head">
          <span className="pdc__panel-label">Receivables</span>
          <span className="pdc__panel-meta">4 open invoices</span>
        </div>
        <div className="pdc__table">
          <div className="pdc__table-head">
            <span>Customer</span>
            <span className="pdc__num">Amount</span>
            <span className="pdc__num">Age</span>
            <span>Status</span>
          </div>
          {INVOICES.map((row) => (
            <div key={row.customer} className="pdc__table-row">
              <span className="pdc__cell">{row.customer}</span>
              <span className="pdc__cell pdc__num">{row.amount}</span>
              <span className="pdc__cell pdc__num pdc__muted">{row.age}</span>
              <span className="pdc__cell">
                <StatusPill tone={row.tone}>{row.label}</StatusPill>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
