import { useState, useRef, useEffect, Fragment } from "react";
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

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function localWeekEnd() {
  const d = new Date(); d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getDueDateGroup(dueDate) {
  if (!dueDate) return "No date";
  const today   = localToday();
  const weekStr = localWeekEnd();
  if (dueDate <= today) return "Overdue / Today";
  if (dueDate <= weekStr) return "This week";
  return "Future";
}

const DUE_GROUP_ORDER = ["Overdue / Today", "This week", "Future", "No date"];
const PRIO_GROUPS     = ["High", "Medium", "Low"];

const Separator = () => (
  <div style={{ height: 2, background: C.blueL, borderRadius: 1, margin: "2px 0", opacity: 0.7 }} />
);

export default function TasksTab({ examTasks, examChapters, chapters, onAddTask, onCompleteTask, onCancelTask, onResetTask, onDeleteTask, onSaveTask, onFocus, onReorderTasks }) {
  const [logOpen,        setLogOpen]        = useState(false);
  const [showAdd,        setShowAdd]        = useState(false);
  const [filter,         setFilter]         = useState("all");    // all | today | week
  const [groupBy,        setGroupBy]        = useState("none");   // none | topic | priority | dueDate
  const [sortBy,         setSortBy]         = useState("none");   // none | priority | dueDate
  const [selectedId,     setSelectedId]     = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showGroupMenu,  setShowGroupMenu]  = useState(false);
  const [showSortMenu,   setShowSortMenu]   = useState(false);
  const filterMenuRef = useRef(null);
  const groupMenuRef  = useRef(null);
  const sortMenuRef   = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to confirm-delete
  const [tf, setTf] = useState({ title: "", priority: "Medium", hours: 1, dueDate: "", chapterId: examChapters[0]?.id || "" });
  const [showHoursMenu, setShowHoursMenu] = useState(false);
  const hoursMenuRef = useRef(null);

  // Drag state
  const dragIdRef    = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [insertIdx,  setInsertIdx]  = useState(-1);

  useEffect(() => {
    if (!showHoursMenu) return;
    const h = (e) => { if (hoursMenuRef.current && !hoursMenuRef.current.contains(e.target)) setShowHoursMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showHoursMenu]);

  useEffect(() => {
    if (!showFilterMenu) return;
    const h = (e) => { if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setShowFilterMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFilterMenu]);

  useEffect(() => {
    if (!showGroupMenu) return;
    const h = (e) => { if (groupMenuRef.current && !groupMenuRef.current.contains(e.target)) setShowGroupMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showGroupMenu]);

  useEffect(() => {
    if (!showSortMenu) return;
    const h = (e) => { if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setShowSortMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSortMenu]);
  // Refs so keyboard handler always sees latest values without re-registering
  const selectedIdRef   = useRef(null);
  const examTasksRef    = useRef(examTasks);
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
        if (task && task.status !== "Done" && task.status !== "Cancelled") onCompleteTask(task.id);
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
    if (!tf.title.trim()) return;
    onAddTask({ ...tf });
    setTf({ title: "", priority: "Medium", hours: 1, dueDate: "", chapterId: examChapters[0]?.id || "" });
    setShowHoursMenu(false);
    setShowAdd(false);
  };

  const today   = localToday();
  const weekEnd = localWeekEnd();

  const active = examTasks.filter(t => {
    if (t.status === "Done" || t.status === "Cancelled") return false;
    if (filter === "all") return true;
    // overdue always included
    if (t.dueDate && t.dueDate < today) return true;
    if (filter === "today") return t.dueDate === today;
    if (filter === "week")  return t.dueDate && t.dueDate <= weekEnd;
    return false;
  });
  const done = examTasks.filter(t => t.status === "Done" || t.status === "Cancelled");

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

  // Pre-compute flat indices for drag
  const flatIdxMap = {};
  let globalIdx = 0;
  groups.forEach(({ tasks }) => tasks.forEach(t => { flatIdxMap[t.id] = globalIdx++; }));
  const totalVisible = globalIdx;

  const handleDrop = (e) => {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (fromId && insertIdx >= 0 && onReorderTasks) {
      const arr = [...sorted];
      const fromIdx = arr.findIndex(t => t.id === fromId);
      if (fromIdx >= 0) {
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
        onReorderTasks(arr);
      }
    }
    setInsertIdx(-1);
    setDraggingId(null);
    dragIdRef.current = null;
  };

  const renderTaskCard = (t, flatIdx) => {
    const isSelected = selectedId === t.id;
    const isDragging = draggingId === t.id;
    return (
      <Fragment key={t.id}>
        {insertIdx === flatIdx && <Separator />}
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); dragIdRef.current = t.id; setDraggingId(t.id); }}
          onDragEnd={() => { setInsertIdx(-1); setDraggingId(null); dragIdRef.current = null; }}
          onDragOver={e => {
            e.preventDefault(); e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            setInsertIdx(e.clientY < r.top + r.height / 2 ? flatIdx : flatIdx + 1);
          }}
          onDrop={handleDrop}
          onClick={() => setSelectedId(id => id === t.id ? null : t.id)}
          style={{
            opacity: isDragging ? 0.35 : 1,
            transition: "none",
            borderRadius: 10,
            outline: isSelected ? `2px solid ${C.blueL}` : "none",
            outlineOffset: 1,
          }}
        >
          <TaskCard
            task={t}
            chapters={examChapters}
            onComplete={() => onCompleteTask(t.id)}
            onCancel={() => onCancelTask(t.id)}
            onSave={u => onSaveTask(t.id, u)}
            onFocus={() => onFocus?.(t)}
            onSelect={() => setSelectedId(id => id === t.id ? null : t.id)}
          />
        </div>
      </Fragment>
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
      {/* Controls bar — compact single row */}
      {(() => {
        const filterOpts  = [["all", "All"], ["today", "Today"], ["week", "This week"]];
        const groupOpts   = [["none", "None"], ["topic", "Topic"], ["priority", "Priority"], ["dueDate", "Due date"]];
        const sortOpts    = [["none", "Default"], ["priority", "Priority"], ["dueDate", "Due date"]];
        const filterLabel = filterOpts.find(([v]) => v === filter)?.[1] ?? filter;
        const groupLabel  = groupOpts.find(([v]) => v === groupBy)?.[1] ?? groupBy;
        const sortLabel   = sortOpts.find(([v]) => v === sortBy)?.[1] ?? sortBy;
        const menuStyle   = { position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0, background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 120 };
        const itemBase    = { padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${C.bdr}`, whiteSpace: "nowrap" };
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "6px 14px" }}>
            {/* Filter */}
            <div ref={filterMenuRef} style={{ position: "relative" }}>
              <button onMouseDown={() => setShowFilterMenu(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: C.dim }}>filter:</span>
                <span style={{ fontSize: 11, color: C.txt, fontWeight: 500 }}>{filterLabel}</span>
              </button>
              {showFilterMenu && (
                <div style={menuStyle}>
                  {filterOpts.map(([val, lbl]) => (
                    <div key={val} onMouseDown={() => { setFilter(val); setShowFilterMenu(false); }}
                      style={{ ...itemBase, color: val === filter ? C.blueL : C.txt, background: val === filter ? C.blueBg : "transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.sur; }}
                      onMouseLeave={e => { e.currentTarget.style.background = val === filter ? C.blueBg : "transparent"; }}>
                      {lbl}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 14, background: C.bdr2 }} />
            {/* Group */}
            <div ref={groupMenuRef} style={{ position: "relative" }}>
              <button onMouseDown={() => setShowGroupMenu(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: C.dim }}>group:</span>
                <span style={{ fontSize: 11, color: C.txt, fontWeight: 500 }}>{groupLabel}</span>
              </button>
              {showGroupMenu && (
                <div style={menuStyle}>
                  {groupOpts.map(([val, lbl]) => (
                    <div key={val} onMouseDown={() => { setGroupBy(val); setShowGroupMenu(false); }}
                      style={{ ...itemBase, color: val === groupBy ? C.blueL : C.txt, background: val === groupBy ? C.blueBg : "transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.sur; }}
                      onMouseLeave={e => { e.currentTarget.style.background = val === groupBy ? C.blueBg : "transparent"; }}>
                      {lbl}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 14, background: C.bdr2 }} />
            {/* Sort */}
            <div ref={sortMenuRef} style={{ position: "relative" }}>
              <button onMouseDown={() => setShowSortMenu(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: C.dim }}>sort:</span>
                <span style={{ fontSize: 11, color: C.txt, fontWeight: 500 }}>{sortLabel}</span>
              </button>
              {showSortMenu && (
                <div style={menuStyle}>
                  {sortOpts.map(([val, lbl]) => (
                    <div key={val} onMouseDown={() => { setSortBy(val); setShowSortMenu(false); }}
                      style={{ ...itemBase, color: val === sortBy ? C.blueL : C.txt, background: val === sortBy ? C.blueBg : "transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.sur; }}
                      onMouseLeave={e => { e.currentTarget.style.background = val === sortBy ? C.blueBg : "transparent"; }}>
                      {lbl}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
              <CustomSelect
                value={tf.chapterId}
                options={[{ value: "", label: "No topic" }, ...examChapters.map(c => ({ value: c.id, label: c.name }))]}
                onChange={v => setTf({ ...tf, chapterId: v })}
              />
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
              <button style={btnP} onClick={handleAdd}>Add task</button>
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

      {/* Grouped task list with drag */}
      <div
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInsertIdx(-1); }}
        onDrop={handleDrop}
      >
        {groups.map(({ header, tasks }) => (
          <div key={header || "_all"}>
            {header && (
              <div style={{ fontSize: 11, fontWeight: 600, color: C.mut, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 8 }}>
                {header}
              </div>
            )}
            {tasks.map(t => renderTaskCard(t, flatIdxMap[t.id]))}
          </div>
        ))}
        {insertIdx === totalVisible && <Separator />}
      </div>

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
                  onCycle={() => onResetTask(t.id)}
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
