import { useState, useEffect, useRef } from "react";
import { C, PRIO, styles } from "../../constants";
import StatusCircle from "./StatusCircle";
import DateInput from "./DateInput";

const { inp } = styles;

const PRIO_ALL = [
  ...PRIO,
  { l: "None", bg: C.sur2, c: C.dim },
];

const HOUR_OPTIONS = [
  { label: "5 min",  value: 0.0833 },
  { label: "15 min", value: 0.25   },
  { label: "30 min", value: 0.5    },
  { label: "45 min", value: 0.75   },
  { label: "1h",     value: 1      },
  { label: "1.5h",   value: 1.5    },
  { label: "2h",     value: 2      },
];

function fmtHours(h) {
  if (!h) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h}h`;
}

export default function TaskCard({ task, onCycle, onDelete, onSave, chapName, onFocus, chapters }) {
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [showPrioMenu,  setShowPrioMenu]  = useState(false);
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const [showChapMenu,  setShowChapMenu]  = useState(false);
  const [title, setTitle] = useState(task.title);
  const prioMenuRef  = useRef(null);
  const hoursMenuRef = useRef(null);
  const chapMenuRef  = useRef(null);

  useEffect(() => { setTitle(task.title); }, [task.title]);

  // Outside-click handlers for all menus
  useEffect(() => {
    if (!showPrioMenu) return;
    const h = (e) => { if (prioMenuRef.current && !prioMenuRef.current.contains(e.target)) setShowPrioMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPrioMenu]);

  useEffect(() => {
    if (!showHoursMenu) return;
    const h = (e) => { if (hoursMenuRef.current && !hoursMenuRef.current.contains(e.target)) setShowHoursMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showHoursMenu]);

  useEffect(() => {
    if (!showChapMenu) return;
    const h = (e) => { if (chapMenuRef.current && !chapMenuRef.current.contains(e.target)) setShowChapMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showChapMenu]);

  const p = PRIO.find(x => x.l === task.priority) || { l: task.priority || "—", bg: C.sur2, c: C.dim };

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed) onSave({ title: trimmed });
    else setTitle(task.title);
    setEditingTitle(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "Done";

  const currentChap = chapters?.find(c => c.id === task.chapterId);

  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, marginBottom: 6, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
      <StatusCircle status={task.status} onClick={onCycle} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            style={{ ...inp, padding: "2px 8px", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false); }
            }}
          />
        ) : (
          <div style={{ marginBottom: 4 }}>
            <span
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
              style={{
                fontSize: 13, fontWeight: 500, color: C.txt,
                textDecoration: task.status === "Done" ? "line-through" : "none",
                cursor: "text",
              }}
            >
              {task.title}
            </span>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>

          {/* Chapter picker (only when chapters list is provided) */}
          {chapters && chapters.length > 0 && (
            <div ref={chapMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowChapMenu(v => !v)}
                title="Change topic"
                style={{
                  background: C.sur2, color: C.mut,
                  fontSize: 11, padding: "2px 8px", borderRadius: 99,
                  border: `1px solid ${showChapMenu ? C.bdr2 : "transparent"}`,
                  cursor: "pointer",
                }}
              >
                {currentChap?.name || chapName || "—"}
              </button>
              {showChapMenu && (
                <div style={{
                  position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0,
                  background: C.sur2, border: `1px solid ${C.bdr2}`,
                  borderRadius: 8, overflow: "hidden",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 170,
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {chapters.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => { onSave({ chapterId: c.id }); setShowChapMenu(false); }}
                      style={{
                        padding: "8px 12px", fontSize: 12, cursor: "pointer",
                        color: c.id === task.chapterId ? C.blueL : C.txt,
                        background: c.id === task.chapterId ? C.blueBg : "transparent",
                        borderBottom: `1px solid ${C.bdr}`,
                      }}
                      onMouseEnter={e => { if (c.id !== task.chapterId) e.currentTarget.style.background = C.sur; }}
                      onMouseLeave={e => { e.currentTarget.style.background = c.id === task.chapterId ? C.blueBg : "transparent"; }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* When chapters not passed but chapName provided, show as static pill */}
          {!chapters && chapName && (
            <span style={{ background: C.sur2, color: C.mut, fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>
              {chapName}
            </span>
          )}

          {/* Priority dropdown */}
          <div ref={prioMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowPrioMenu(v => !v)}
              title="Change priority"
              style={{
                background: p.bg, color: p.c,
                fontSize: 11, fontWeight: 500, padding: "2px 8px",
                borderRadius: 99, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {task.priority || "—"}
            </button>
            {showPrioMenu && (
              <div style={{
                position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0,
                background: C.sur2, border: `1px solid ${C.bdr2}`,
                borderRadius: 8, overflow: "hidden",
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 110,
              }}>
                {PRIO_ALL.map(pp => (
                  <div
                    key={pp.l}
                    onMouseDown={() => { onSave({ priority: pp.l === "None" ? null : pp.l }); setShowPrioMenu(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", fontSize: 12, cursor: "pointer",
                      background: (task.priority || null) === (pp.l === "None" ? null : pp.l) ? C.sur : "transparent",
                      borderBottom: `1px solid ${C.bdr}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.sur}
                    onMouseLeave={e => { e.currentTarget.style.background = (task.priority || null) === (pp.l === "None" ? null : pp.l) ? C.sur : "transparent"; }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pp.c, flexShrink: 0 }} />
                    <span style={{ color: pp.c }}>{pp.l}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimated hours — clickable picker */}
          <div ref={hoursMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowHoursMenu(v => !v)}
              title="Change estimated hours"
              style={{
                background: "none", border: "none", fontSize: 11, color: C.dim,
                cursor: "pointer", padding: 0, whiteSpace: "nowrap",
              }}
            >
              {fmtHours(task.hours)} est.
            </button>
            {showHoursMenu && (
              <div style={{
                position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0,
                background: C.sur2, border: `1px solid ${C.bdr2}`,
                borderRadius: 8, overflow: "hidden",
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 100,
                maxHeight: 220, overflowY: "auto",
              }}>
                {HOUR_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onMouseDown={() => { onSave({ hours: opt.value }); setShowHoursMenu(false); }}
                    style={{
                      padding: "7px 12px", fontSize: 12, cursor: "pointer",
                      color: task.hours === opt.value ? C.blueL : C.txt,
                      background: task.hours === opt.value ? C.blueBg : "transparent",
                      borderBottom: `1px solid ${C.bdr}`,
                    }}
                    onMouseEnter={e => { if (task.hours !== opt.value) e.currentTarget.style.background = C.sur; }}
                    onMouseLeave={e => { e.currentTarget.style.background = task.hours === opt.value ? C.blueBg : "transparent"; }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actual hours from focus sessions */}
          {task.actualHours > 0 && (
            <span style={{ fontSize: 11, color: C.blueL }}>{task.actualHours}h actual</span>
          )}

          {/* Due date */}
          <DateInput
            value={task.dueDate || ""}
            onChange={v => onSave({ dueDate: v || null })}
            placeholder="Add date"
            style={{ fontSize: 11 }}
          />
          {isOverdue && (
            <span style={{ fontSize: 11, color: C.redL }}>Overdue</span>
          )}
        </div>
      </div>

      {/* Focus button */}
      {onFocus && task.status !== "Done" && (
        <button
          onClick={e => { e.stopPropagation(); onFocus(); }}
          title="Start focus session"
          style={{
            background: C.blueBg, border: `1px solid ${C.blueBd}`,
            color: C.blueL, fontSize: 11, padding: "3px 9px",
            borderRadius: 6, cursor: "pointer", flexShrink: 0,
          }}
        >
          Focus
        </button>
      )}

      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
      >
        ×
      </button>
    </div>
  );
}
