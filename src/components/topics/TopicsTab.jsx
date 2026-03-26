import { useState, useRef, useEffect, Fragment } from "react";
import { C, styles } from "../../constants";
import ChapterRow from "../shared/ChapterRow";
import TaskCard from "../shared/TaskCard";
import DateInput from "../shared/DateInput";
import ConfirmDialog from "../shared/ConfirmDialog";

const { inp, btn, btnP } = styles;

// Module-level: persists across tab navigation (unmount/remount)
const openMapCache = {};

export default function TopicsTab({
  examId, chapters, tasks,
  onAddChapter, onEditChapter, onDeleteChapter, onDoneToggleChapter,
  onAddTask, onCompleteTask, onCancelTask, onResetTask, onDeleteTask, onSaveTask, onFocus,
  onReorderChapters, onReorderTasks,
}) {
  const [showAdd,       setShowAdd]       = useState(false);
  const [cf, setCf]                       = useState({ name: "", dueDate: "" });
  const [openMap, setOpenMap]             = useState(() => ({ ...openMapCache }));
  const [insertIdx, setInsertIdx]         = useState(-1);
  const [selectedChapId, setSelectedChapId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addTaskSignal, setAddTaskSignal] = useState(0);
  const [deleteConfirm,     setDeleteConfirm]     = useState(null);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState(null);
  const [logOpen,           setLogOpen]           = useState(false);
  const dragChapId    = useRef(null);
  const globalDragRef = useRef(null);

  const selectedChapIdRef = useRef(null);
  selectedChapIdRef.current = selectedChapId;
  const selectedTaskIdRef = useRef(null);
  selectedTaskIdRef.current = selectedTaskId;

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        const sel = selectedChapIdRef.current;
        if (sel) {
          setChapOpen(sel, true);
          setAddTaskSignal(s => s + 1);
        } else {
          setShowAdd(true);
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedTaskIdRef.current) {
          setDeleteTaskConfirm(selectedTaskIdRef.current);
        } else if (selectedChapIdRef.current) {
          setDeleteConfirm(selectedChapIdRef.current);
        }
        return;
      }
      const sel = selectedChapIdRef.current;
      if (!sel) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onDoneToggleChapter(sel);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const examChaps = chapters
    .filter(c => c.examId === examId)
    .sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!cf.name.trim()) return;
    onAddChapter({ ...cf, examId, order: examChaps.length });
    setCf({ name: "", dueDate: "" });
    setShowAdd(false);
  };

  // ── Open state helpers ─────────────────────────────────────────
  const setChapOpen = (id, val) => {
    openMapCache[id] = val;
    setOpenMap(m => ({ ...m, [id]: val }));
  };

  const allCollapsed = examChaps.length > 0 && examChaps.every(c => openMap[c.id] === false);

  const toggleAllOpen = () => {
    const next = allCollapsed; // if all collapsed → expand all; otherwise collapse all
    examChaps.forEach(c => { openMapCache[c.id] = next; });
    setOpenMap(m => {
      const updated = { ...m };
      examChaps.forEach(c => { updated[c.id] = next; });
      return updated;
    });
  };

  // ── Drag-and-drop handlers ─────────────────────────────────────
  const handleDragStart = (_e, id) => { dragChapId.current = id; };

  const handleDragOver = (target, clientY, idx) => {
    const rect = target.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    setInsertIdx(clientY < mid ? idx : idx + 1);
  };

  const handleDrop = () => {
    const fromId = dragChapId.current;
    if (fromId && insertIdx >= 0) {
      const arr     = [...examChaps];
      const fromIdx = arr.findIndex(c => c.id === fromId);
      if (fromIdx >= 0) {
        const [moved]   = arr.splice(fromIdx, 1);
        const toIdx     = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
        arr.splice(toIdx, 0, moved);
        onReorderChapters(arr.map((c, i) => ({ ...c, order: i })));
      }
    }
    setInsertIdx(-1);
    dragChapId.current = null;
  };

  const Separator = () => (
    <div style={{ height: 3, background: C.blueL, borderRadius: 2, margin: "4px 0", opacity: 0.8 }} />
  );

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete topic?"
        message="This will also delete all tasks under this topic. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { onDeleteChapter(deleteConfirm); setDeleteConfirm(null); setSelectedChapId(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmDialog
        open={!!deleteTaskConfirm}
        title="Delete task?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { onDeleteTask(deleteTaskConfirm); setDeleteTaskConfirm(null); setSelectedTaskId(null); }}
        onCancel={() => setDeleteTaskConfirm(null)}
      />

      {/* Add topic form */}
      {showAdd && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          {/* Name + Due date in one row */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Topic name</div>
              <input
                style={inp}
                placeholder="e.g. Derivatives"
                value={cf.name}
                autoFocus
                onChange={e => setCf({ ...cf, name: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Due date <span style={{ color: C.dim }}>(optional)</span></div>
              <DateInput value={cf.dueDate} onChange={v => setCf({ ...cf, dueDate: v })} placeholder="Set date" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnP} onClick={handleAdd}>Add topic</button>
            <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Top controls row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            style={{ ...btn, fontSize: 12, borderStyle: "dashed", color: C.dim }}
          >
            + New topic
          </button>
        )}
        {examChaps.length > 1 && (
          <button
            onClick={toggleAllOpen}
            style={{ ...btn, fontSize: 12, padding: "4px 12px", color: C.dim }}
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        )}
      </div>

      {examChaps.length === 0 && (
        <div style={{ textAlign: "center", color: C.dim, padding: "2rem", fontSize: 14 }}>
          No topics yet — add one above.
        </div>
      )}

      {/* Chapter list with drag separators */}
      <div
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setInsertIdx(-1);
        }}
        onDrop={handleDrop}
      >
        {examChaps.map((chap, idx) => (
          <Fragment key={chap.id}>
            {insertIdx === idx && <Separator />}
            <div
              onClick={(e) => {
                if (e.target.closest("button, input, select, textarea, a")) return;
                setAddTaskSignal(0);
                setSelectedTaskId(null);
                setSelectedChapId(id => id === chap.id ? null : chap.id);
              }}
              style={{ borderRadius: 10, outline: selectedChapId === chap.id ? `2px solid ${C.blueL}` : "none", outlineOffset: 1 }}
            >
              <ChapterRow
                chap={chap}
                tasks={tasks.filter(t => t.chapterId === chap.id)}
                open={openMap[chap.id] !== undefined ? openMap[chap.id] : true}
                onToggleOpen={() => setChapOpen(chap.id, !(openMap[chap.id] !== false))}
                openAddTask={selectedChapId === chap.id ? addTaskSignal : 0}
                onDoneToggle={() => onDoneToggleChapter(chap.id)}
                onDelete={() => setDeleteConfirm(chap.id)}
                onEdit={u => onEditChapter(chap.id, u)}
                onAddTask={onAddTask}
                onCompleteTask={onCompleteTask}
                onCancelTask={onCancelTask}
                onSaveTask={onSaveTask}
                onFocusTask={onFocus ? t => onFocus(t) : undefined}
                onDragStart={handleDragStart}
                onDragOver={(target, clientY) => handleDragOver(target, clientY, idx)}
                onDrop={handleDrop}
                selectedTaskId={selectedTaskId}
                onSelectTask={id => { setSelectedTaskId(id); setSelectedChapId(null); }}
                onReorderTasks={onReorderTasks}
                globalDragRef={globalDragRef}
              />
            </div>
            {insertIdx === examChaps.length && idx === examChaps.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>

      {/* Unified logbook — all Done/Cancelled tasks across all topics */}
      {(() => {
        const chapIds = new Set(examChaps.map(c => c.id));
        const logTasks = tasks.filter(t => chapIds.has(t.chapterId) && (t.status === "Done" || t.status === "Cancelled"));
        if (logTasks.length === 0) return null;
        return (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setLogOpen(o => !o)}
              style={{ ...btn, fontSize: 12, padding: "4px 12px", borderStyle: "dashed", color: C.dim, marginBottom: logOpen ? 10 : 0 }}
            >
              {logOpen ? "▲" : "▼"} Logbook ({logTasks.length})
            </button>
            {logOpen && examChaps.map(chap => {
              const chapLog = logTasks.filter(t => t.chapterId === chap.id);
              if (chapLog.length === 0) return null;
              return (
                <div key={chap.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.mut, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {chap.name}
                  </div>
                  {chapLog.map(t => (
                    <div key={t.id} style={{ opacity: 0.5 }}>
                      <TaskCard
                        task={t}
                        onCycle={() => onResetTask(t.id)}
                        onSave={u => onSaveTask(t.id, u)}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
