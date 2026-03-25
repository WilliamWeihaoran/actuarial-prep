import { useState, useRef, Fragment } from "react";
import { C, styles } from "../constants";
import ChapterRow from "./shared/ChapterRow";
import DateInput from "./shared/DateInput";

const { inp, btn, btnP } = styles;

// Module-level: persists across tab navigation (unmount/remount)
const openMapCache = {};

export default function TopicsTab({
  examId, chapters, tasks,
  onAddChapter, onEditChapter, onDeleteChapter, onDoneToggleChapter,
  onAddTask, onCycleTask, onDeleteTask, onSaveTask,
  onReorderChapters,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [cf, setCf]           = useState({ name: "", dueDate: "" });
  const [openMap, setOpenMap] = useState(() => ({ ...openMapCache }));
  const [insertIdx, setInsertIdx] = useState(-1);
  const dragChapId = useRef(null);

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
            <ChapterRow
              chap={chap}
              tasks={tasks.filter(t => t.chapterId === chap.id)}
              open={openMap[chap.id] !== undefined ? openMap[chap.id] : true}
              onToggleOpen={() => setChapOpen(chap.id, !(openMap[chap.id] !== false))}
              onDoneToggle={() => onDoneToggleChapter(chap.id)}
              onDelete={() => onDeleteChapter(chap.id)}
              onEdit={u => onEditChapter(chap.id, u)}
              onAddTask={onAddTask}
              onCycleTask={onCycleTask}
              onDeleteTask={onDeleteTask}
              onSaveTask={onSaveTask}
              onDragStart={handleDragStart}
              onDragOver={(target, clientY) => handleDragOver(target, clientY, idx)}
              onDrop={handleDrop}
            />
            {insertIdx === examChaps.length && idx === examChaps.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
