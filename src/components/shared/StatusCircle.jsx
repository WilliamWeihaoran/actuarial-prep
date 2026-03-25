import { C } from "../../constants";

// Clickable circle that visually represents task status:
// Not Started = empty solid border
// In Progress  = dashed blue border
// Done         = filled green with checkmark
export default function StatusCircle({ status, onClick }) {
  const base = {
    width:          20,
    height:         20,
    borderRadius:   "50%",
    cursor:         "pointer",
    border:         "none",
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        0,
    background:     "transparent",
  };

  if (status === "Done") return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, background: C.grn, border: `1.5px solid ${C.grnL}` }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12">
        <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (status === "In Progress") return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, border: `1.5px dashed ${C.blueL}` }}
    />
  );

  // Not Started
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, border: `1.5px solid ${C.bdr2}` }}
    />
  );
}