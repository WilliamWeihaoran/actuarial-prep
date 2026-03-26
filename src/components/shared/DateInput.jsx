import { useState, useRef, useEffect } from "react";
import { C, fmtRelDate } from "../../constants";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

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

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function DateInput({ value, onChange, placeholder = "Set date", style = {}, block = false }) {
  const today = localDateStr();
  const isOverdue = value && value < today;

  const initView = () => {
    if (value) return { year: parseInt(value.slice(0,4)), month: parseInt(value.slice(5,7)) - 1 };
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  const [open,     setOpen]    = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
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

  // Keyboard shortcuts when picker is open: T = today, M = tomorrow
  // Use capture phase so this fires before any bubble-phase handlers (e.g. tab switcher in App.jsx)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        e.stopPropagation();
        onChange(today);
        setOpen(false);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        e.stopPropagation();
        const d = new Date();
        d.setDate(d.getDate() + 1);
        onChange(localDateStr(d));
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, today, onChange]);

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
            const popupW = 240;
            const popupH = 300;
            // visualViewport matches the coordinate space that position:fixed uses
            const availW = window.visualViewport?.width ?? window.innerWidth;
            const availH = window.visualViewport?.height ?? window.innerHeight;
            const top = availH - rect.bottom >= popupH
              ? rect.bottom + 6
              : rect.top - popupH - 6;
            // Right-align popup with trigger's right edge; clamp to screen bounds
            const left = Math.max(4, Math.min(rect.right - popupW, availW - popupW - 8));
            setPopupPos({ top: Math.max(4, top), left });
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
        <span>{value ? fmtRelDate(value) : placeholder}</span>
      </button>

      {/* Calendar popup — fixed so no ancestor overflow can clip it */}
      {open && (
        <div style={{
          position: "fixed", zIndex: 400,
          top: popupPos.top, left: popupPos.left,
          background: C.sur2, border: `1px solid ${C.bdr2}`,
          borderRadius: 12, padding: 14,
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
          width: 240,
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
