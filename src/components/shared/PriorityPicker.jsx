import { PRIO } from "../../constants";

// Row of 3 colored buttons for selecting task priority (High / Medium / Low)
export default function PriorityPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {PRIO.map(p => {
        const active = value === p.l;
        return (
          <button
            key={p.l}
            onClick={() => onChange(p.l)}
            style={{
              flex:        1,
              padding:     "6px 0",
              borderRadius: 8,
              fontSize:    12,
              fontWeight:  active ? 500 : 400,
              cursor:      "pointer",
              background:  active ? p.ab  : p.bg,
              color:       p.c,
              border:      active ? `1.5px solid ${p.ab2}` : "1px solid transparent",
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