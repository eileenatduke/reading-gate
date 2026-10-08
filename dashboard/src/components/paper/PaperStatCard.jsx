// Stat tile — layout from StatCard.dc.html, colors from the app theme (.stat class +
// CSS variables), so it follows the Settings theme/accent.
//   hint      — a static, non-interactive label pill (unchanged).
//   adornment — a node shown beside the value (e.g. a streak-mood emoji).
//   caption   — a plain muted line under the label (e.g. the streak mood).
export default function PaperStatCard({ value, label, hint, adornment, caption }) {
  return (
    <div
      className="stat"
      style={{
        height: "100%", padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 34, lineHeight: .95, color: "var(--text)" }}>{value}</div>
        {adornment}
        {hint && (
          <span style={{
            fontFamily: "'Source Sans 3',sans-serif", fontSize: 12.5, color: "var(--muted)", background: "var(--surface-2)",
            border: "1px solid var(--border)", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap",
          }}>{hint}</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{label}</div>
      {caption && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.35 }}>{caption}</div>
      )}
    </div>
  );
}
