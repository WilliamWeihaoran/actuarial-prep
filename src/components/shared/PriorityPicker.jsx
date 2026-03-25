import { C, PRIO } from "../../constants";

const NONE = { l: "None", bg: "transparent", c: C.dim, ab: C.sur2, ab2: C.bdr2 };
const ALL  = [...PRIO, NONE];

// Row of colored buttons for selecting task priority (High / Medium / Low / None)
export default function PriorityPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {ALL.map(p => {
        const isNone   = p.l === "None";
        const active   = isNone ? value == null : value === p.l;
        const emitVal  = isNone ? null : p.l;
        return (
          <button
            key={p.l}
            onClick={() => onChange(emitVal)}
            style={{
              flex:        1,
              padding:     "6px 0",
              borderRadius: 8,
              fontSize:    12,
              fontWeight:  active ? 500 : 400,
              cursor:      "pointer",
              background:  active ? (isNone ? C.sur2 : p.ab)  : p.bg,
              color:       p.c,
              border:      active ? `1.5px solid ${isNone ? C.bdr2 : p.ab2}` : `1px solid ${isNone ? C.bdr2 : "transparent"}`,
              transition:  "all .15s",
            }}
          >
            {p.l}
          </button>
        );
      })}
    </div>
  );
}
