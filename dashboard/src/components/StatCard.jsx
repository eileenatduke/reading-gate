export default function StatCard({ value, label, delta, deltaAccent, onClick }) {
  return (
    <div
      className={"stat" + (onClick ? " clickable" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <div className="top">
        <div className="value">{value}</div>
        {delta != null && (
          <span
            className="delta"
            style={{
              color: deltaAccent ? "var(--accent)" : "var(--muted)",
              background: deltaAccent ? "rgba(var(--accent-rgb),.14)" : "transparent",
            }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="label">{label}</div>
    </div>
  );
}
