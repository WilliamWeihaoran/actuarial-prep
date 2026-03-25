import { useState, useRef, useEffect } from "react";
import { C } from "../../constants";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function fmtDate(val) {
  if (!val) return null;
  const [y, m, d] = val.split("-");
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

const CalIcon = ({ color }) => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1" y="2" width="10" height="9" rx="1.5" stroke={color} strokeWidth="1.2" />
    <path d="M4 1v2M8 1v2" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M1 5h10" stroke={color} strokeWidth="1.2" />
  </svg>
);

export default function DateInput({ value, onChange, placeholder = "Set date", style = {}, block = false }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = value && value < today;

  const initView = () => {
    if (value) return { year: parseInt(value.slice(0,4)), month: parseInt(value.slice(5,7)) - 1 };
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  const [open,      setOpen]      = useState(false);
  const [above,     setAbove]     = useState(false);
  const [viewYear,  setViewYear]  = useState(() => initView().year);
  const [viewMonth, setViewMonth] = useState(() => initView().month);
  const ref = useRef(null);

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0,4)));
      setViewMonth(parseInt(value.slice(5,7)) - 1);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const select = (day) => {
    if (!day) return;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const cells = buildCalendar(viewYear, viewMonth);
  const todayParts = today.split("-").map(Number);
  const selYear  = value ? parseInt(value.slice(0,4)) : null;
  const selMonth = value ? parseInt(value.slice(5,7)) - 1 : null;
  const selDay   = value ? parseInt(value.slice(8)) : null;

  const iconColor = value ? (isOverdue ? C.redL : C.mut) : C.dim;

  return (
    <div ref={ref} style={{ position: "relative", display: block ? "block" : "inline-flex", alignItems: "center", ...style }}>
      {/* Trigger button */}
      <button
        onMouseDown={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setAbove(window.innerHeight - rect.bottom < 290);
          }
          setOpen(o => !o);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          width: block ? "100%" : undefined,
          background: block ? C.sur2 : value ? C.sur2 : "transparent",
          border: `1px solid ${block ? C.bdr2 : value ? C.bdr2 : "transparent"}`,
          borderRadius: 8,
          padding: block ? "7px 10px" : "4px 8px",
          fontSize: block ? 13 : 12,
          color: value ? (isOverdue ? C.redL : C.txt) : C.dim,
          cursor: "pointer", whiteSpace: "nowrap",
          boxSizing: "border-box",
        }}
      >
        <CalIcon color={iconColor} />
        <span>{value ? fmtDate(value) : placeholder}</span>
        {value && (
          <span
            onMouseDown={e => { e.stopPropagation(); onChange(""); }}
            style={{ marginLeft: 2, color: C.dim, fontSize: 14, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </span>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: "absolute", zIndex: 400,
          ...(above ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
          left: 0,
          background: C.sur2, border: `1px solid ${C.bdr2}`,
          borderRadius: 12, padding: 14,
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
          minWidth: 230,
        }}>
          {/* Month / year nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button
              onClick={prevMonth}
              style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 6px", lineHeight: 1 }}
            >
              ‹
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 6px", lineHeight: 1 }}
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.dim, padding: "2px 0", fontWeight: 500 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday    = viewYear === todayParts[0] && viewMonth === todayParts[1] - 1 && day === todayParts[2];
              const isSelected = viewYear === selYear && viewMonth === selMonth && day === selDay;
              const dateStr    = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isPast     = dateStr < today;
              return (
                <button
                  key={i}
                  onClick={() => select(day)}
                  style={{
                    background: isSelected ? C.blue : isToday ? C.sur : "transparent",
                    border: isToday && !isSelected ? `1px solid ${C.bdr2}` : "1px solid transparent",
                    borderRadius: 6,
                    color: isSelected ? "#fff" : isPast ? C.dim : C.txt,
                    fontSize: 12, padding: "6px 2px", cursor: "pointer", textAlign: "center",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer: Today / Clear */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, borderTop: `1px solid ${C.bdr}`, paddingTop: 10 }}>
            <button
              onClick={() => { onChange(today); setOpen(false); }}
              style={{
                flex: 1, fontSize: 11, padding: "5px 0",
                background: C.sur, border: `1px solid ${C.bdr}`,
                borderRadius: 6, color: C.mut, cursor: "pointer",
              }}
            >
              Today
            </button>
            {value && (
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                style={{
                  flex: 1, fontSize: 11, padding: "5px 0",
                  background: "transparent", border: `1px solid ${C.bdr}`,
                  borderRadius: 6, color: C.dim, cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
