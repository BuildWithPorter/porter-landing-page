import type { ReactNode } from "react";
import { MaterialIcon } from "../components/MaterialIcon";

function Figure({ alt, children }: { alt: string; children: ReactNode }) {
  return (
    <figure className="topic-viz">
      <div className="topic-viz__frame" role="img" aria-label={alt}>
        <div aria-hidden="true">{children}</div>
      </div>
      <figcaption>Illustrative example</figcaption>
    </figure>
  );
}

function Entity({ name, detail, tone = "default" }: { name: string; detail: string; tone?: "default" | "result" | "aside" }) {
  return (
    <div className={`topic-viz__entity topic-viz__entity--${tone}`}>
      <strong>{name}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function ConsolidationDiagram() {
  return (
    <Figure alt="Company A, Company B, and Company C each keep their own books. Those books meet in one group view. Activity between the companies is marked removed.">
      <p className="topic-viz__kicker">Group view</p>
      <div className="topic-viz__row">
        <Entity name="Company A" detail="Own books" />
        <Entity name="Company B" detail="Own books" />
        <Entity name="Company C" detail="Own books" />
      </div>
      <svg className="topic-viz__wires" viewBox="0 0 360 36" fill="none">
        <path d="M60 0C60 24 180 12 180 36" stroke="currentColor" />
        <path d="M180 0V36" stroke="currentColor" />
        <path d="M300 0C300 24 180 12 180 36" stroke="currentColor" />
      </svg>
      <Entity name="Group view" detail="Profit and loss, balance sheet" tone="result" />
      <Entity name="Between companies" detail="Removed" tone="aside" />
    </Figure>
  );
}

export function AcquisitionTimeline() {
  const stages = ["Close", "Catch up", "Monthly close", "Reports"];
  return (
    <Figure alt="Four stages in a row: close, catch up, monthly close, and reports.">
      <p className="topic-viz__kicker">After you close</p>
      <ol className="topic-viz__rail">
        {stages.map((stage, index) => (
          <li key={stage}>
            <span className="topic-viz__dot" />
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{stage}</span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

export function ReportingCard() {
  return (
    <Figure alt="An investor report card listing profit and loss, balance sheet, and the investor report, each marked ready.">
      <div className="topic-viz__report">
        <div className="topic-viz__report-head">
          <MaterialIcon name="summarize" />
          <strong>Investor report</strong>
        </div>
        {["Profit and loss", "Balance sheet", "Investor report"].map((row) => (
          <div key={row} className="topic-viz__report-row">
            <span>{row}</span>
            <em>Ready</em>
          </div>
        ))}
      </div>
    </Figure>
  );
}

const LOCATIONS = [
  { name: "Location 1", bars: [42, 58, 48, 72], food: 46 },
  { name: "Location 2", bars: [36, 44, 63, 55], food: 62 },
  { name: "Location 3", bars: [50, 38, 57, 80], food: 34 },
];

export function LocationDashboard() {
  return (
    <Figure alt="A dashboard for Location 1, Location 2, and Location 3. Each location has a weekly bar view and a food cost bar, with a group row beneath them.">
      <p className="topic-viz__kicker">Weekly view</p>
      <div className="topic-viz__locations">
        {LOCATIONS.map((location) => (
          <article key={location.name} className="topic-viz__location">
            <strong>{location.name}</strong>
            <div className="topic-viz__bars">
              {location.bars.map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="topic-viz__meter" title="Food cost">
              <span style={{ width: `${location.food}%` }} />
            </div>
            <em>Food cost</em>
          </article>
        ))}
      </div>
      <Entity name="Group" detail="Location 1, Location 2, Location 3" tone="result" />
    </Figure>
  );
}

export function FamilyStructure() {
  return (
    <Figure alt="A family office connected to Company A, Company B, and Company C, with one group view beneath them.">
      <p className="topic-viz__kicker">The group</p>
      <Entity name="Family office" detail="Operating companies" tone="result" />
      <svg className="topic-viz__wires" viewBox="0 0 360 36" fill="none">
        <path d="M180 0V16" stroke="currentColor" />
        <path d="M60 16H300" stroke="currentColor" />
        <path d="M60 16V36M180 16V36M300 16V36" stroke="currentColor" />
      </svg>
      <div className="topic-viz__row">
        <Entity name="Company A" detail="Own books" />
        <Entity name="Company B" detail="Own books" />
        <Entity name="Company C" detail="Own books" />
      </div>
      <Entity name="Group view" detail="Consolidated view" />
    </Figure>
  );
}

const ROLES = [
  { name: "Bookkeeper", detail: "Record and reconcile", icon: "menu_book" },
  { name: "Controller", detail: "Close and control", icon: "event_repeat" },
  { name: "CFO", detail: "Plan and decide", icon: "summarize" },
];

export function RoleComparison() {
  return (
    <Figure alt="Three roles side by side: bookkeeper, controller, and CFO.">
      <p className="topic-viz__kicker">At a glance</p>
      <ol className="topic-viz__roles">
        {ROLES.map((role) => (
          <li key={role.name}>
            <MaterialIcon name={role.icon} />
            <strong>{role.name}</strong>
            <span>{role.detail}</span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

const FAQ_ANCHORS = [
  { icon: "menu_book", label: "Bookkeeping" },
  { icon: "apartment", label: "Several companies" },
  { icon: "restaurant", label: "Restaurants" },
  { icon: "verified_user", label: "Security" },
];

export function FaqAnchors() {
  return (
    <Figure alt="Four topics: bookkeeping, several companies, restaurants, and security.">
      <ul className="topic-viz__anchors">
        {FAQ_ANCHORS.map((item) => (
          <li key={item.label}>
            <MaterialIcon name={item.icon} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

export function ReceiptThread() {
  return (
    <Figure alt="A text asking for a receipt from Location 1.">
      <p className="topic-viz__kicker">By text</p>
      <div className="topic-viz__thread">
        <div className="topic-viz__bubble topic-viz__bubble--in">
          <span>Porter</span>
          <strong>Receipt</strong>
          <em>Location 1</em>
        </div>
        <div className="topic-viz__bubble">
          <strong>Receipt</strong>
          <em>Location 1</em>
        </div>
      </div>
    </Figure>
  );
}

export function HeroVisual({ path }: { path: string }) {
  switch (path) {
    case "/search-funds":
      return <AcquisitionTimeline />;
    case "/multi-entity":
      return <ConsolidationDiagram />;
    case "/family-offices":
      return <FamilyStructure />;
    case "/restaurants":
      return <LocationDashboard />;
    case "/guides/fractional-cfo-vs-controller-vs-bookkeeper":
      return <RoleComparison />;
    case "/faq":
      return <FaqAnchors />;
    default:
      return null;
  }
}

export function SectionVisual({ path, title }: { path: string; title: string }) {
  if (path === "/search-funds" && title === "One group view across every company") return <ConsolidationDiagram />;
  if (path === "/search-funds" && title === "Investor and lender reporting") return <ReportingCard />;
  if (path === "/restaurants" && title === "What Porter does") return <ReceiptThread />;
  return null;
}
