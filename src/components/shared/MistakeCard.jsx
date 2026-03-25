import { C } from "../../constants";
import Pill from "./Pill";

export default function MistakeCard({ m, onToggle, onDelete }) {
  return (
    <div style={{
      background:   C.sur,
      border:       `1px solid ${C.bdr}`,
      borderRadius: 10,
      padding:      "12px 14px",
      marginBottom: 8,
      display:      "flex",
      gap:          10,
      alignItems:   "flex-start",
    }}>
      {/* Resolved toggle circle */}
      <button
        onClick={onToggle}
        style={{
          width:          20,
          height:         20,
          borderRadius:   "50%",
          flexShrink:     0,
          cursor:         "pointer",
          border:         `1.5px solid ${m.resolved ? C.grnL : C.bdr2}`,
          background:     m.resolved ? C.grn : "transparent",
          marginTop:      2,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        0,
        }}
      >
        {m.resolved && (
          <svg width="10" height="10" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
          <Pill label={m.topic} bg={C.sur2} color={C.mut} />
          <Pill
            label={m.resolved ? "Resolved" : "Unresolved"}
            bg={m.resolved ? C.grnBg : C.redBg}
            color={m.resolved ? C.grnL : C.redL}
          />
          <span style={{ fontSize: 11, color: C.dim }}>{m.date}</span>
        </div>

        <div style={{ fontSize: 13, color: C.txt, marginBottom: 4 }}>{m.description}</div>

        {m.source && (
          <div style={{ fontSize: 12, color: C.dim }}>Source: {m.source}</div>
        )}
      </div>

      <button
        onClick={onDelete}
        style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}