export default function StatCard({ value, label, onClick }) {
  return (
    <div
      className={"card stat" + (onClick ? " clickable" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <span className="value">{value}</span>
      <span className="label">{label}</span>
    </div>
  );
}
