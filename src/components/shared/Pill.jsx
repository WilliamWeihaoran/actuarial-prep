// Small colored label badge used for priority, status, topic tags, etc.
export default function Pill({ label, bg, color }) {
  return (
    <span style={{
      background:   bg,
      color:        color,
      fontSize:     11,
      fontWeight:   500,
      padding:      "2px 8px",
      borderRadius: 99,
      whiteSpace:   "nowrap",
    }}>
      {label}
    </span>
  );
}