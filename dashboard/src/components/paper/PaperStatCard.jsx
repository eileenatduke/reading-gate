// Warm-paper stat tile — ported from StatCard.dc.html, wired to real values.
export default function PaperStatCard({ value, label, hint, onClick }) {
  return (
    <div style={{
      height: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #e7e3db",
      borderRadius: 18, padding: "14px 20px", fontFamily: "'Instrument Sans',system-ui,sans-serif",
      boxShadow: "0 1px 2px rgba(30,25,15,.03)", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 34, lineHeight: .95, color: "#1b1a17" }}>{value}</div>
        {hint && (
          <button type="button" onClick={onClick} style={{
            fontFamily: "'Instrument Sans',sans-serif", fontSize: 12.5, color: "#5c584e", background: "#efece4",
            border: "1px solid #e5e1d7", borderRadius: 999, padding: "5px 11px", cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap",
          }}>{hint}</button>
        )}
      </div>
      <div style={{ fontSize: 13, color: "#8b877d", marginTop: 8 }}>{label}</div>
    </div>
  );
}
