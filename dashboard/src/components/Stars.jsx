export default function Stars({ value, label }) {
  const full = Math.round(value);
  return (
    <span className="stars-inline" aria-label={label ? `${label}: ${value.toFixed(1)} of 5` : `${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "" : "off"}>★</span>
      ))}
    </span>
  );
}
