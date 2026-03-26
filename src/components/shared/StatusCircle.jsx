import { C } from "../../constants";

export default function StatusCircle({ status, onClick }) {
  const base = {
    width: 20, height: 20, borderRadius: "50%",
    cursor: "pointer", border: "none", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, background: "transparent",
  };

  if (status === "Done") return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, background: C.grn, border: `1.5px solid ${C.grnL}` }}>
      <svg width="10" height="10" viewBox="0 0 12 12">
        <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (status === "Cancelled") return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, background: C.sur2, border: `1.5px solid ${C.dim}` }}>
      <svg width="10" height="10" viewBox="0 0 12 12">
        <line x1="3" y1="3" x2="9" y2="9" stroke={C.dim} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="9" y1="3" x2="3" y2="9" stroke={C.dim} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (status === "In Progress") return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, border: `1.5px dashed ${C.blueL}` }} />
  );

  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ ...base, border: `1.5px solid ${C.bdr2}` }} />
  );
}
