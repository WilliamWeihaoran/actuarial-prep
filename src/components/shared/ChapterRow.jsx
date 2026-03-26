import { useState, useRef, useEffect } from "react";
import { C, styles } from "../../constants";
import TaskCard from "./TaskCard";
import DateInput from "./DateInput";
import PriorityPicker from "./PriorityPicker";

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

const { inp, btn, btnP } = styles;

const DonutChart = ({ pct, done }) => {
  const r = 9, circ = 2 * Math.PI * r;
  const fill  = done ? 100 : pct;
  const color = fill === 100 ? C.grnL : fill > 0 ? C.blueL : C.bdr2;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="13" cy="13" r={r} fill="none" stroke={C.bdr} strokeWidth="3.5" />
      {fill > 0 && (
        <circle cx="13" cy="13" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${(fill / 100) * circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 13 13)" style={{ transition: "stroke-dasharray 0.3s" }} />
      )}
    </svg>
  );
};

export default function ChapterRow({
  chap, tasks,
  onDoneToggle, onDelete, onEdit,
  onAddTask, onCycleTask, onDeleteTask, onSaveTask,
  onDragStart, onDragOver, onDrop,
  onFocusTask,
  open: openProp,
  onToggleOpen,
  openAddTask,
}) {
  const [openLocal,  setOpenLocal]  = useState(true);
  const open    = openProp !== undefined ? openProp : openLocal;
  const toggleOpen = onToggleOpen || (() => setOpenLocal(v => !v));
  const [logOpen,    setLogOpen]    = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal,    setNameVal]    = useState(chap.name);
  const [tf, setTf] = useState({ title: "", priority: "Medium", hours: 1 });
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const hoursMenuRef = useRef(null);
  const fadingIds    = useRef({});

  useEffect(() => {
    if (!showHoursMenu) return;
    const h = (e) => { if (hoursMenuRef.current && !hoursMenuRef.current.contains(e.target)) setShowHoursMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showHoursMenu]);
  const [, forceUpdate] = useState(0);

  useEffect(() => { setNameVal(chap.name); }, [chap.name]);

  useEffect(() => {
    if (!openAddTask) return;
    setShowAdd(true);
  }, [openAddTask]);

  const active = tasks.filter(t => t.status !== "Done");
  const done   = tasks.filter(t => t.status === "Done");
  const pct    = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  const cycleWithFade = (task) => {
    if (task.status === "In Progress") {
      fadingIds.current[task.id] = true;
      forceUpdate(n => n + 1);
      setTimeout(() => {
        onCycleTask(task.id);
        delete fadingIds.current[task.id];
        forceUpdate(n => n + 1);
      }, 2400);
    } else {
      onCycleTask(task.id);
    }
  };

  const handleAddTask = () => {
    if (!tf.title.trim()) return;
    onAddTask({ ...tf, chapterId: chap.id });
    setTf({ title: "", priority: "Medium", hours: 1 });
    setShowHoursMenu(false);
    setShowAdd(false);
  };

  const saveName = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== chap.name) onEdit({ name: trimmed });
    else setNameVal(chap.name);
    setEditingName(false);
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, chap.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(e.currentTarget, e.clientY); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        marginBottom: 12,
        opacity:      chap.done ? 0.6 : 1,
      }}
    >
      {/* Chapter header — single line */}
      <div style={{ background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 10, padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.dim, cursor: "grab", fontSize: 14, padding: "0 2px", flexShrink: 0 }}>⠿</span>

          <button onClick={toggleOpen}
            style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 11, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}>
            {open ? "▼" : "▶"}
          </button>

          {/* Donut — also acts as done toggle */}
          <button onClick={onDoneToggle}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <DonutChart pct={pct} done={chap.done} />
          </button>

          {/* Name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input autoFocus style={{ ...inp, padding: "2px 8px", fontSize: 14, fontWeight: 500 }}
                value={nameVal} onChange={e => setNameVal(e.target.value)} onBlur={saveName}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameVal(chap.name); setEditingName(false); } }} />
            ) : (
              <span onClick={() => setEditingName(true)} title="Click to rename"
                style={{ fontSize: 14, fontWeight: 500, color: chap.done ? C.dim : C.txt, textDecoration: chap.done ? "line-through" : "none", cursor: "text" }}>
                {chap.name}
              </span>
            )}
          </div>

          {/* Task count */}
          {tasks.length > 0 && (
            <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
              {done.length}/{tasks.length}
            </span>
          )}

          <DateInput value={chap.dueDate || ""} onChange={v => onEdit({ dueDate: v || null })} placeholder="Due date" style={{ fontSize: 11 }} />

          <button onClick={onDelete} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
      </div>

      {/* Tasks list */}
      {open && (
        <div style={{ paddingLeft: 14, marginTop: 6 }}>
          {active.map(t => (
            <div
              key={t.id}
              style={{ opacity: fadingIds.current[t.id] ? 0.2 : 1, transition: fadingIds.current[t.id] ? "opacity 2s" : "none" }}
            >
              <TaskCard
                task={t}
                onCycle={() => cycleWithFade(t)}
                onDelete={() => onDeleteTask(t.id)}
                onSave={u => onSaveTask(t.id, u)}
                onFocus={onFocusTask ? () => onFocusTask(t) : undefined}
              />
            </div>
          ))}

          {done.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <button
                onClick={() => setLogOpen(o => !o)}
                style={{ ...btn, fontSize: 11, padding: "3px 10px", marginBottom: logOpen ? 6 : 0, color: C.dim, borderStyle: "dashed" }}
              >
                {logOpen ? "▲" : "▼"} Logbook ({done.length})
              </button>
              {logOpen && done.map(t => (
                <div key={t.id} style={{ opacity: 0.45 }}>
                  <TaskCard
                    task={t}
                    onCycle={() => onCycleTask(t.id)}
                    onDelete={() => onDeleteTask(t.id)}
                    onSave={u => onSaveTask(t.id, u)}
                  />
                </div>
              ))}
            </div>
          )}

          {showAdd ? (
            <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}>
              {/* Row 1: title (7fr) + hours picker (3fr) */}
              <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Task title</div>
                  <input
                    style={inp}
                    placeholder="e.g. Practice 30 problems"
                    value={tf.title}
                    autoFocus
                    onChange={e => setTf({ ...tf, title: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handleAddTask()}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Est. hours</div>
                  <div ref={hoursMenuRef} style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowHoursMenu(v => !v)}
                      style={{ ...inp, textAlign: "left", cursor: "pointer" }}
                    >
                      {fmtHours(tf.hours)}
                    </button>
                    {showHoursMenu && (
                      <div style={{
                        position: "absolute", zIndex: 300, top: "calc(100% + 4px)", left: 0, right: 0,
                        background: C.sur2, border: `1px solid ${C.bdr2}`,
                        borderRadius: 8, overflow: "hidden",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                        maxHeight: 220, overflowY: "auto",
                      }}>
                        {HOUR_OPTIONS.map(opt => (
                          <div
                            key={opt.value}
                            onMouseDown={() => { setTf(f => ({ ...f, hours: opt.value })); setShowHoursMenu(false); }}
                            style={{
                              padding: "8px 12px", fontSize: 12, cursor: "pointer",
                              color: tf.hours === opt.value ? C.blueL : C.txt,
                              background: tf.hours === opt.value ? C.blueBg : "transparent",
                              borderBottom: `1px solid ${C.bdr}`,
                            }}
                            onMouseEnter={e => { if (tf.hours !== opt.value) e.currentTarget.style.background = C.sur; }}
                            onMouseLeave={e => { e.currentTarget.style.background = tf.hours === opt.value ? C.blueBg : "transparent"; }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Row 2: priority (flex) + Add/Cancel */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Priority</div>
                  <PriorityPicker value={tf.priority} onChange={v => setTf({ ...tf, priority: v })} />
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={btnP} onClick={handleAddTask}>Add</button>
                  <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              style={{ ...btn, fontSize: 12, padding: "5px 12px", color: C.dim, borderStyle: "dashed", marginBottom: 4 }}
            >
              + Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
