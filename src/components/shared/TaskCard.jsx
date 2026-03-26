import { useState, useEffect, useRef, useCallback } from "react";
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

function prioLabel(p) {
  if (p === "High")   return "H";
  if (p === "Medium") return "M";
  if (p === "Low")    return "L";
  return "N/A";
}

export default function TaskCard({ task, onCycle, onComplete, onCancel, onSave, chapName, onFocus, onSelect, chapters }) {
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [showPrioMenu,  setShowPrioMenu]  = useState(false);
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const [showChapMenu,  setShowChapMenu]  = useState(false);
  const [title,        setTitle]          = useState(task.title);
  const [visualState,  setVisualState]    = useState(null); // null | "done" | "cancelled"

  const prioMenuRef   = useRef(null);
  const hoursMenuRef  = useRef(null);
  const chapMenuRef   = useRef(null);
  const prePendingRef = useRef(null); // timeout waiting for double-tap (250ms)
  const pendingRef    = useRef(null); // { type, timerId } — 2400ms commit timer

  // Clean up timers on unmount
  useEffect(() => () => {
    if (prePendingRef.current) clearTimeout(prePendingRef.current);
    if (pendingRef.current)    clearTimeout(pendingRef.current.timerId);
  }, []);

  useEffect(() => { setTitle(task.title); }, [task.title]);

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

  const handleStatusClick = useCallback(() => {
    if (onComplete && onCancel) {
      // ── Undo: tap during 2400ms animation ─────────────────────
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId);
        pendingRef.current = null;
        setVisualState(null);
        return;
      }
      // ── Double-tap: second tap within 250ms → cancel ──────────
      if (prePendingRef.current) {
        clearTimeout(prePendingRef.current);
        prePendingRef.current = null;
        setVisualState("cancelled");
        pendingRef.current = {
          type: "cancelled",
          timerId: setTimeout(() => {
            pendingRef.current = null;
            setVisualState(null);
            onCancel();
          }, 2400),
        };
        return;
      }
      // ── Single tap: show green, wait 250ms for double-tap ─────
      setVisualState("done");
      prePendingRef.current = setTimeout(() => {
        prePendingRef.current = null;
        pendingRef.current = {
          type: "done",
          timerId: setTimeout(() => {
            pendingRef.current = null;
            setVisualState(null);
            onComplete();
          }, 2400),
        };
      }, 250);
    } else if (onCycle) {
      onCycle();
    }
  }, [onComplete, onCancel, onCycle]);

  const p = PRIO.find(x => x.l === task.priority) || { l: task.priority || "—", bg: C.sur2, c: C.dim };

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed) onSave({ title: trimmed });
    else setTitle(task.title);
    setEditingTitle(false);
  };

  const currentChap = chapters?.find(c => c.id === task.chapterId);

  // Visual overrides based on pending animation state
  const displayStatus = visualState === "done" ? "Done"
    : visualState === "cancelled" ? "Cancelled"
    : task.status;

  const isStruckThrough = task.status === "Done" || task.status === "Cancelled" || visualState === "cancelled";

  const cardBg     = visualState === "done" ? C.grnBg : visualState === "cancelled" ? "#1a1a22" : C.sur;
  const cardBorder = visualState === "done" ? C.grnL  : visualState === "cancelled" ? C.bdr2    : C.bdr;

  return (
    <div style={{
      background: cardBg, border: `1px solid ${cardBorder}`,
      borderRadius: 10, marginBottom: 6, padding: "7px 12px",
      display: "flex", alignItems: "center", gap: 8,
      transition: "background 0.25s, border-color 0.25s",
    }}>
      <StatusCircle status={displayStatus} onClick={handleStatusClick} />

      {/* Title — content-width, truncates; input takes flex:1 when editing */}
      {editingTitle ? (
        <input
          autoFocus
          style={{ ...inp, flex: 1, minWidth: 0, padding: "2px 8px", fontSize: 13, fontWeight: 500 }}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false); }
          }}
        />
      ) : (
        <>
          <span
            onClick={() => setEditingTitle(true)}
            title="Click to edit"
            style={{
              flex: "0 1 auto", minWidth: 60,
              fontSize: 13, fontWeight: 500, color: C.txt,
              textDecoration: isStruckThrough ? "line-through" : "none",
              cursor: "text",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {task.title}
          </span>

          {/* Blue select/focus zone */}
          <div
            onClick={e => { e.stopPropagation(); onSelect?.(); }}
            onDoubleClick={e => { e.stopPropagation(); onFocus?.(); }}
            style={{
              flex: "1 8 80px", minWidth: 20, height: 22, alignSelf: "center",
              background: "rgba(255,255,255,0.04)", borderRadius: 6, cursor: "pointer",
            }}
          />
        </>
      )}

      {/* Chapter / Topic */}
      {chapters && chapters.length > 0 && (
        <div ref={chapMenuRef} style={{ position: "relative", flex: "0 3 auto", minWidth: 40, maxWidth: 180 }}>
          <button onClick={() => setShowChapMenu(v => !v)} title="Change topic"
            style={{ background: C.sur2, color: C.mut, fontSize: 11, padding: "1px 7px", borderRadius: 99, border: `1px solid ${showChapMenu ? C.bdr2 : "transparent"}`, cursor: "pointer", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textAlign: "left" }}>
            {currentChap?.name || chapName || "—"}
          </button>
          {showChapMenu && (
            <div style={{ position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0, background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 170, maxHeight: 200, overflowY: "auto" }}>
              {chapters.map(c => (
                <div key={c.id} onMouseDown={() => { onSave({ chapterId: c.id }); setShowChapMenu(false); }}
                  style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: c.id === task.chapterId ? C.blueL : C.txt, background: c.id === task.chapterId ? C.blueBg : "transparent", borderBottom: `1px solid ${C.bdr}` }}
                  onMouseEnter={e => { if (c.id !== task.chapterId) e.currentTarget.style.background = C.sur; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.id === task.chapterId ? C.blueBg : "transparent"; }}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!chapters && chapName && (
        <span style={{ background: C.sur2, color: C.mut, fontSize: 11, padding: "1px 7px", borderRadius: 99, flex: "0 3 auto", minWidth: 40, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {chapName}
        </span>
      )}

      {/* Priority */}
      <div ref={prioMenuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={() => setShowPrioMenu(v => !v)} title="Change priority"
          style={{ background: p.bg, color: p.c, fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
          {prioLabel(task.priority)}
        </button>
        {showPrioMenu && (
          <div style={{ position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0, background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 110 }}>
            {PRIO_ALL.map(pp => (
              <div key={pp.l} onMouseDown={() => { onSave({ priority: pp.l === "None" ? null : pp.l }); setShowPrioMenu(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", background: (task.priority || null) === (pp.l === "None" ? null : pp.l) ? C.sur : "transparent", borderBottom: `1px solid ${C.bdr}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.sur}
                onMouseLeave={e => { e.currentTarget.style.background = (task.priority || null) === (pp.l === "None" ? null : pp.l) ? C.sur : "transparent"; }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: pp.c, flexShrink: 0 }} />
                <span style={{ color: pp.c }}>{pp.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time: logged/estimated */}
      <div ref={hoursMenuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={() => setShowHoursMenu(v => !v)} title="Change estimated hours"
          style={{ background: "none", border: "none", fontSize: 11, color: C.dim, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
          <span style={{ color: task.actualHours > 0 ? C.blueL : C.dim }}>{task.actualHours > 0 ? fmtHours(task.actualHours) : "—"}</span>/{fmtHours(task.hours)}
        </button>
        {showHoursMenu && (
          <div style={{ position: "absolute", zIndex: 200, top: "calc(100% + 4px)", right: 0, background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 100, maxHeight: 220, overflowY: "auto" }}>
            {HOUR_OPTIONS.map(opt => (
              <div key={opt.value} onMouseDown={() => { onSave({ hours: opt.value }); setShowHoursMenu(false); }}
                style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: task.hours === opt.value ? C.blueL : C.txt, background: task.hours === opt.value ? C.blueBg : "transparent", borderBottom: `1px solid ${C.bdr}` }}
                onMouseEnter={e => { if (task.hours !== opt.value) e.currentTarget.style.background = C.sur; }}
                onMouseLeave={e => { e.currentTarget.style.background = task.hours === opt.value ? C.blueBg : "transparent"; }}>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Due date */}
      <DateInput value={task.dueDate || ""} onChange={v => onSave({ dueDate: v || null })} placeholder="date" style={{ fontSize: 11, flexShrink: 0 }} />
    </div>
  );
}
