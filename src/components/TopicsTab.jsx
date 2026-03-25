import { useState, useRef } from "react";
import { C, styles } from "../constants";
import ChapterRow from "./shared/ChapterRow";

const { inp, btn, btnP } = styles;

export default function TopicsTab({
  examId, chapters, tasks,
  onAddChapter, onEditChapter, onDeleteChapter, onDoneToggleChapter,
  onAddTask, onCycleTask, onDeleteTask, onSaveTask,
  onReorderChapters,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [cf, setCf]           = useState({ name: "", dueDate: "" });
  const dragChapId            = useRef(null);

  const examChaps = chapters
    .filter(c => c.examId === examId)
    .sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!cf.name.trim()) return;
    onAddChapter({ ...cf, examId, order: examChaps.length });
    setCf({ name: "", dueDate: "" });
    setShowAdd(false);
  };

  // Drag handlers — reorder chapters within the same exam
  const handleDragStart = (e, id) => { dragChapId.current = id; };
  const handleDragOver  = (e) => { e.preventDefault(); };
  const handleDrop      = (e, toId) => {
    e.preventDefault();
    const fromId = dragChapId.current;
    if (!fromId || fromId === toId) return;
    const arr  = [...examChaps];
    const from = arr.findIndex(c => c.id === fromId);
    const to   = arr.findIndex(c => c.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onReorderChapters(arr.map((c, i) => ({ ...c, order: i })));
    dragChapId.current = null;
  };

  return (
    <div>
      {/* Add chapter form */}
      {showAdd && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Chapter name</div>
              <input
                style={inp}
                placeholder="e.g. Derivatives"
                value={cf.name}
                onChange={e => setCf({ ...cf, name: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Due date</div>
              <input type="date" style={inp} value={cf.dueDate} onChange={e => setCf({ ...cf, dueDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnP} onClick={handleAdd}>Add chapter</button>
            <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ ...btn, fontSize: 12, borderStyle: "dashed", marginBottom: 14, color: C.dim }}
        >
          + New chapter
        </button>
      )}

      {examChaps.length === 0 && (
        <div style={{ textAlign: "center", color: C.dim, padding: "2rem", fontSize: 14 }}>
          No chapters yet — add one above.
        </div>
      )}

      {examChaps.map(chap => (
        <ChapterRow
          key={chap.id}
          chap={chap}
          tasks={tasks.filter(t => t.chapterId === chap.id)}
          onDoneToggle={() => onDoneToggleChapter(chap.id)}
          onDelete={() => onDeleteChapter(chap.id)}
          onEdit={u => onEditChapter(chap.id, u)}
          onAddTask={onAddTask}
          onCycleTask={onCycleTask}
          onDeleteTask={onDeleteTask}
          onSaveTask={onSaveTask}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}