import { useState, useRef, useEffect } from "react";
import { C, styles } from "../../constants";

/**
 * Replacement for native <select> that matches the dark theme.
 * options: string[] | { value: string, label: string }[]
 */
export default function CustomSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const opts = options.map(o => typeof o === "string" ? { value: o, label: o } : o);
  const selected = opts.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...styles.inp,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          padding: "7px 10px",
          gap: 8,
        }}
      >
        <span style={{ color: selected ? C.txt : C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : (placeholder || "Select...")}
        </span>
        <span style={{ color: C.dim, fontSize: 9, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 200,
          background: C.sur2,
          border: `1px solid ${C.bdr2}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {opts.map(o => (
            <div
              key={o.value}
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                color: o.value === value ? C.blueL : C.txt,
                background: o.value === value ? C.blueBg : "transparent",
                cursor: "pointer",
                borderBottom: `1px solid ${C.bdr}`,
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = C.sur; }}
              onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? C.blueBg : "transparent"; }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
