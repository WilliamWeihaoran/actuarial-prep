import { useState, useRef, useEffect } from "react";
import { C, styles } from "../constants";

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
import TaskCard from "./shared/TaskCard";
import PriorityPicker from "./shared/PriorityPicker";
import CustomSelect from "./shared/CustomSelect";
import DateInput from "./shared/DateInput";
import ConfirmDialog from "./shared/ConfirmDialog";
const { inp, btn, btnP } = styles;

const PRIO_ORDER = { High: 0, Medium: 1, Low: 2 };

function getDueDateGroup(dueDate) {
  if (!dueDate) return "No date";
  const today = new Date().toISOString().slice(0, 10);
  const week  = new Date(); week.setDate(week.getDate() + 7);
  const weekStr = week.toISOString().slice(0, 10);
  if (dueDate <= today) return "Overdue / Today";
  if (dueDate <= weekStr) return "This week";
  return "Future";
}

const DUE_GROUP_ORDER = ["Overdue / Today", "This week", "Future", "No date"];
const PRIO_GROUPS     = ["High", "Medium", "Low"];

export default function TasksTab({ examTasks, examChapters, chapters, onAddTask, onCycleTask, onDeleteTask, onSaveTask, onFocus }) {
  const [logOpen,      setLogOpen]      = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [groupBy,      setGroupBy]      = useState("none");   // none | topic | priority | dueDate
  const [sortBy,       setSortBy]       = useState("none");   // none | priority | dueDate
  const [selectedId,   setSelectedId]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to confirm-delete
  const [tf, setTf] = useState({ title: "", priority: "Medium", hours: 1, dueDate: "", chapterId: examChapters[0]?.id || "" });
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const hoursMenuRef = useRef(null);

  useEffect(() => {
    if (!showHoursMenu) return;
    const h = (e) => { if (hoursMenuRef.current && !hoursMenuRef.current.contains(e.target)) setShowHoursMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showHoursMenu]);
  const [fadingIds] = useState({});
  const [, forceUpdate] = useState(0);

  // Refs so keyboard handler always sees latest values without re-registering
  const selectedIdRef   = useRef(null);
  const examTasksRef    = useRef(examTasks);
  const cycleRef        = useRef(null);
  selectedIdRef.current = selectedId;
  examTasksRef.current  = examTasks;

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowAdd(true); return; }
      const sel = selectedIdRef.current;
      if (!sel) return;
      if (e.key === "Enter") {
        e.preventDefault();
        const task = examTasksRef.current.find(t => t.id === sel);
        if (task && cycleRef.current) cycleRef.current(task);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDeleteConfirm(sel);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    if (!tf.title.trim() || !tf.chapterId) return;
    onAddTask({ ...tf });
    setTf({ title: "", priority: "Medium", hours: 1, dueDate: "", chapterId: examChapters[0]?.id || "" });
    setShowHoursMenu(false);
    setShowAdd(false);
  };

  const cycleWithFade = (task) => {
    cycleRef.current = cycleWithFade; // keep ref in sync
    if (task.status === "In Progress") {
      fadingIds[task.id] = true;
      forceUpdate(n => n + 1);
      setTimeout(() => {
        onCycleTask(task.id);
        delete fadingIds[task.id];
        forceUpdate(n => n + 1);
      }, 2400);
    } else {
      onCycleTask(task.id);
    }
  };

  const active = examTasks.filter(t => t.status !== "Done");
  const done   = examTasks.filter(t => t.status === "Done");

  // Sort
  let sorted = [...active];
  if (sortBy === "priority") {
    sorted.sort((a, b) => (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1));
  } else if (sortBy === "dueDate") {
    sorted.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  // Group
  let groups = [];
  if (groupBy === "none") {
    groups = [{ header: null, tasks: sorted }];
  } else if (groupBy === "topic") {
    const map = {};
    sorted.forEach(t => {
      const chap = chapters.find(c => c.id === t.chapterId);
      const key  = chap?.name || "No topic";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    groups = Object.entries(map).map(([header, tasks]) => ({ header, tasks }));
  } else if (groupBy === "priority") {
    const map = { High: [], Medium: [], Low: [], Other: [] };
    sorted.forEach(t => {
      const key = PRIO_GROUPS.includes(t.priority) ? t.priority : "Other";
      map[key].push(t);
    });
    groups = [...PRIO_GROUPS, "Other"]
      .filter(k => map[k].length > 0)
      .map(header => ({ header, tasks: map[header] }));
  } else if (groupBy === "dueDate") {
    const map = { "Overdue / Today": [], "This week": [], "Future": [], "No date": [] };
    sorted.forEach(t => { map[getDueDateGroup(t.dueDate)].push(t); });
    groups = DUE_GROUP_ORDER
      .filter(k => map[k].length > 0)
      .map(header => ({ header, tasks: map[header] }));
  }

  const renderTaskCard = (t) => {
    const isSelected = selectedId === t.id;
    return (
      <div
        key={t.id}
        onClick={() => setSelectedId(id => id === t.id ? null : t.id)}
        style={{
          opacity: fadingIds[t.id] ? 0.2 : 1,
          transition: fadingIds[t.id] ? "opacity 2s" : "none",
          borderRadius: 10,
          outline: isSelected ? `2px solid ${C.blueL}` : "none",
          outlineOffset: 1,
        }}
      >
        <TaskCard
          task={t}
          chapters={examChapters}
          onCycle={() => cycleWithFade(t)}
          onDelete={() => setDeleteConfirm(t.id)}
          onSave={u => onSaveTask(t.id, u)}
          onFocus={() => onFocus?.(t)}
        />
      </div>
    );
  };

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete task?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { onDeleteTask(deleteConfirm); setDeleteConfirm(null); setSelectedId(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
      {/* Controls bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Group by */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.dim }}>Group:</span>
          {[["none", "None"], ["topic", "Topic"], ["priority", "Priority"], ["dueDate", "Due date"]].map(([val, label]) => (
            <button key={val} onClick={() => setGroupBy(val)}
              style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                background: groupBy === val ? C.sur2 : "transparent",
                color:      groupBy === val ? C.txt  : C.dim,
                border:     `1px solid ${groupBy === val ? C.bdr2 : "transparent"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: C.bdr }} />

        {/* Sort by */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.dim }}>Sort:</span>
          {[["none", "Default"], ["priority", "Priority"], ["dueDate", "Due date"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                background: sortBy === val ? C.sur2 : "transparent",
                color:      sortBy === val ? C.txt  : C.dim,
                border:     `1px solid ${sortBy === val ? C.bdr2 : "transparent"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          {/* Row 1: Title + Est. hours (70/30) */}
          <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Task title</div>
              <input
                style={inp}
                placeholder="e.g. Practice 30 problems"
                value={tf.title}
                autoFocus
                onChange={e => setTf({ ...tf, title: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
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
          {/* Row 2: Topic + Due date */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Topic</div>
              {examChapters.length > 0 ? (
                <CustomSelect
                  value={tf.chapterId}
                  options={examChapters.map(c => ({ value: c.id, label: c.name }))}
                  onChange={v => setTf({ ...tf, chapterId: v })}
                />
              ) : (
                <div style={{ fontSize: 12, color: C.redL }}>Add topics first in the Topics tab.</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Due date <span style={{ color: C.dim }}>(optional)</span></div>
              <DateInput value={tf.dueDate} onChange={v => setTf({ ...tf, dueDate: v })} placeholder="Set date" block />
            </div>
          </div>
          {/* Row 3: Priority + Add/Cancel */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Priority</div>
              <PriorityPicker value={tf.priority} onChange={v => setTf({ ...tf, priority: v })} />
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={btnP} onClick={handleAdd} disabled={!tf.chapterId}>Add task</button>
              <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ ...btn, fontSize: 12, borderStyle: "dashed", marginBottom: 14, color: C.dim }}
        >
          + Add task
        </button>
      )}

      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", color: C.dim, padding: "2rem", fontSize: 14 }}>
          No active tasks yet.
        </div>
      )}

      {/* Grouped task list */}
      {groups.map(({ header, tasks }) => (
        <div key={header || "_all"}>
          {header && (
            <div style={{ fontSize: 11, fontWeight: 600, color: C.mut, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 8 }}>
              {header}
            </div>
          )}
          {tasks.map(renderTaskCard)}
        </div>
      ))}

      {/* Logbook at the bottom */}
      {done.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setLogOpen(o => !o)}
            style={{ ...btn, fontSize: 12, padding: "4px 12px", borderStyle: "dashed", color: C.dim, marginBottom: logOpen ? 8 : 0 }}
          >
            {logOpen ? "▲" : "▼"} Logbook ({done.length})
          </button>
          {logOpen && done.map(t => {
            const chap = chapters.find(c => c.id === t.chapterId);
            return (
              <div key={t.id} style={{ opacity: 0.45 }}>
                <TaskCard
                  task={t}
                  chapName={chap?.name}
                  onCycle={() => onCycleTask(t.id)}
                  onDelete={() => setDeleteConfirm(t.id)}
                  onSave={u => onSaveTask(t.id, u)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
