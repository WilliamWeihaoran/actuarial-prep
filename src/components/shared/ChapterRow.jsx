import { useState, useRef, useEffect, Fragment } from "react";
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

const TaskSeparator = () => (
  <div style={{ height: 2, background: C.blueL, borderRadius: 1, margin: "2px 0", opacity: 0.7 }} />
);

export default function ChapterRow({
  chap, tasks,
  onDoneToggle, onDelete, onEdit,
  onAddTask, onCompleteTask, onCancelTask, onSaveTask,
  onDragStart, onDragOver, onDrop,
  onFocusTask,
  open: openProp,
  onToggleOpen,
  openAddTask,
  selectedTaskId, onSelectTask, onReorderTasks,
  globalDragRef,
}) {
  const [openLocal,  setOpenLocal]  = useState(true);
  const open    = openProp !== undefined ? openProp : openLocal;
  const toggleOpen = onToggleOpen || (() => setOpenLocal(v => !v));
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal,    setNameVal]    = useState(chap.name);
  const [tf, setTf] = useState({ title: "", priority: "Medium", hours: 1, dueDate: "" });
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const hoursMenuRef   = useRef(null);
  const nameClickRef   = useRef(false);
  const nameClickTimer = useRef(null);
  const dragTaskIdRef  = useRef(null);
  const [taskDraggingId, setTaskDraggingId] = useState(null);
  const [taskInsertIdx,  setTaskInsertIdx]  = useState(-1);
  const [crossInsertIdx, setCrossInsertIdx] = useState(-1);

  useEffect(() => {
    if (!showHoursMenu) return;
    const h = (e) => { if (hoursMenuRef.current && !hoursMenuRef.current.contains(e.target)) setShowHoursMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showHoursMenu]);
  useEffect(() => { setNameVal(chap.name); }, [chap.name]);

  useEffect(() => {
    if (!openAddTask) return;
    setShowAdd(true);
  }, [openAddTask]);

  const active    = tasks.filter(t => t.status !== "Done" && t.status !== "Cancelled");
  const logbook   = tasks.filter(t => t.status === "Done" || t.status === "Cancelled");
  const eligible  = tasks.filter(t => t.status !== "Cancelled");
  const doneCount = tasks.filter(t => t.status === "Done").length;
  const pct       = eligible.length ? Math.round(doneCount / eligible.length * 100) : 0;

  const handleAddTask = () => {
    if (!tf.title.trim()) return;
    onAddTask({ ...tf, chapterId: chap.id });
    setTf({ title: "", priority: "Medium", hours: 1, dueDate: "" });
    setShowHoursMenu(false);
    setShowAdd(false);
  };

  const saveName = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== chap.name) onEdit({ name: trimmed });
    else setNameVal(chap.name);
    setEditingName(false);
  };

  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => { setDragging(true); onDragStart(e, chap.id); }}
      onDragEnd={() => setDragging(false)}
      onDragOver={e => { e.preventDefault(); onDragOver(e.currentTarget, e.clientY); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        marginBottom: 12,
        opacity: dragging ? 0.35 : chap.done ? 0.6 : 1,
      }}
    >
      {/* Chapter header — single line */}
      <div onDoubleClick={() => { if (!nameClickRef.current) toggleOpen(); }} style={{ background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 10, padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <span
                onClick={() => {
                  nameClickRef.current = true;
                  clearTimeout(nameClickTimer.current);
                  nameClickTimer.current = setTimeout(() => { nameClickRef.current = false; }, 500);
                  setEditingName(true);
                }}
                title="Click to rename"
                style={{ fontSize: 14, fontWeight: 500, color: chap.done ? C.dim : C.txt, textDecoration: chap.done ? "line-through" : "none", cursor: "text" }}>
                {chap.name}
              </span>
            )}
          </div>

          {/* Task count */}
          {eligible.length > 0 && (
            <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
              {doneCount}/{eligible.length}
            </span>
          )}

          <DateInput value={chap.dueDate || ""} onChange={v => onEdit({ dueDate: v || null })} placeholder="Due date" style={{ fontSize: 11 }} />

          <button
            onClick={e => { e.stopPropagation(); if (!open) toggleOpen(); setShowAdd(true); }}
            title="Add task"
            style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
          >+</button>

          <button onClick={onDelete} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
      </div>

      {/* Tasks list */}
      {open && (
        <div
          style={{ paddingLeft: 14, marginTop: 6 }}
          onDragOver={e => {
            if (!globalDragRef?.current || globalDragRef.current.fromChapId === chap.id) return;
            e.preventDefault();
            setCrossInsertIdx(active.length);
          }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget)) setCrossInsertIdx(-1);
          }}
          onDrop={e => {
            if (!globalDragRef?.current || globalDragRef.current.fromChapId === chap.id) return;
            e.preventDefault();
            onSaveTask(globalDragRef.current.taskId, { chapterId: chap.id });
            globalDragRef.current = null;
            setCrossInsertIdx(-1);
          }}
        >
          {active.map((t, idx) => (
            <Fragment key={t.id}>
              {taskInsertIdx === idx && <TaskSeparator />}
              {crossInsertIdx === idx && <TaskSeparator />}
              <div
                draggable
                onDragStart={e => {
                  e.stopPropagation();
                  setTaskDraggingId(t.id);
                  dragTaskIdRef.current = t.id;
                  if (globalDragRef) globalDragRef.current = { taskId: t.id, fromChapId: chap.id };
                }}
                onDragEnd={() => {
                  setTaskInsertIdx(-1); setTaskDraggingId(null);
                  setCrossInsertIdx(-1);
                  if (globalDragRef) globalDragRef.current = null;
                }}
                onDragOver={e => {
                  e.preventDefault(); e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  const insertPos = e.clientY < r.top + r.height / 2 ? idx : idx + 1;
                  if (globalDragRef?.current && globalDragRef.current.fromChapId !== chap.id) {
                    setCrossInsertIdx(insertPos);
                  } else {
                    setTaskInsertIdx(insertPos);
                  }
                }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation();
                  if (globalDragRef?.current && globalDragRef.current.fromChapId !== chap.id) {
                    onSaveTask(globalDragRef.current.taskId, { chapterId: chap.id });
                    globalDragRef.current = null;
                    setCrossInsertIdx(-1);
                    return;
                  }
                  const fromId = dragTaskIdRef.current;
                  if (fromId && taskInsertIdx >= 0 && onReorderTasks) {
                    const arr = [...active];
                    const fromIdx = arr.findIndex(t2 => t2.id === fromId);
                    if (fromIdx >= 0) {
                      const [moved] = arr.splice(fromIdx, 1);
                      arr.splice(taskInsertIdx > fromIdx ? taskInsertIdx - 1 : taskInsertIdx, 0, moved);
                      onReorderTasks([...arr, ...logbook]);
                    }
                  }
                  setTaskInsertIdx(-1); setTaskDraggingId(null); dragTaskIdRef.current = null;
                }}
                onClick={e => { e.stopPropagation(); onSelectTask?.(t.id === selectedTaskId ? null : t.id); }}
                style={{
                  opacity: taskDraggingId === t.id ? 0.35 : 1,
                  transition: "none",
                  borderRadius: 10,
                  outline: selectedTaskId === t.id ? `2px solid ${C.blueL}` : "none",
                  outlineOffset: 1,
                }}
              >
                <TaskCard
                  task={t}
                  onComplete={() => onCompleteTask(t.id)}
                  onCancel={() => onCancelTask(t.id)}
                  onSave={u => onSaveTask(t.id, u)}
                  onFocus={onFocusTask ? () => onFocusTask(t) : undefined}
                  onSelect={() => onSelectTask?.(t.id === selectedTaskId ? null : t.id)}
                />
              </div>
            </Fragment>
          ))}
          {taskInsertIdx === active.length && <TaskSeparator />}
          {crossInsertIdx === active.length && <TaskSeparator />}


          {showAdd && (
            <div
              onKeyDown={e => { if (e.key === "Enter" && e.target.tagName !== "INPUT") { e.preventDefault(); handleAddTask(); } }}
              style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}
            >
              {/* Row 1: title (5fr) + date (3fr) + hours (2fr) */}
              <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr 2fr", gap: 8, marginBottom: 8 }}>
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
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Due date</div>
                  <DateInput value={tf.dueDate} onChange={v => setTf({ ...tf, dueDate: v })} placeholder="Set date" block />
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
          )}
        </div>
      )}
    </div>
  );
}
