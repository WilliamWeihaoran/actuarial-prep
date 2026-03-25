import PriorityPicker from "./PriorityPicker";
import { useState, useRef } from "react";
import { C, styles } from "../../constants";
import TaskCard from "./TaskCard";
import StatusCircle from "./StatusCircle";

const { inp, btn, btnP } = styles;

export default function ChapterRow({
  chap, tasks,
  onDoneToggle, onDelete, onEdit,
  onAddTask, onCycleTask, onDeleteTask, onSaveTask,
  onDragStart, onDragOver, onDrop,
}) {
  const [open, setOpen]         = useState(true);
  const [logOpen, setLogOpen]   = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ef, setEf]             = useState({ name: chap.name, dueDate: chap.dueDate });
  const [tf, setTf]             = useState({ title: "", priority: "Medium", hours: 2 });
  const fadingIds               = useRef({});
  const [, forceUpdate]         = useState(0);

  const active = tasks.filter(t => t.status !== "Done");
  const done   = tasks.filter(t => t.status === "Done");
  const pct    = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  // Cycle task status — if moving from In Progress → Done, fade out over 2.4s first
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
    setTf({ title: "", priority: "Medium", hours: 2 });
    setShowAdd(false);
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, chap.id)}
      onDragOver={e => { e.preventDefault(); setDragOver(true); onDragOver(e, chap.id); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { setDragOver(false); onDrop(e, chap.id); }}
      style={{
        marginBottom: 12,
        opacity:      chap.done ? 0.6 : 1,
        outline:      dragOver ? `2px dashed ${C.blueL}` : "none",
        borderRadius: 10,
      }}
    >
      {/* Chapter header */}
      <div style={{ background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 10, padding: "10px 14px" }}>
        {editOpen ? (
          // Edit mode — inline form to rename chapter and change due date
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Name</div>
              <input style={inp} value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Due date</div>
              <input type="date" style={inp} value={ef.dueDate} onChange={e => setEf({ ...ef, dueDate: e.target.value })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button style={btnP} onClick={() => { onEdit(ef); setEditOpen(false); }}>Save</button>
              <button style={btn} onClick={() => setEditOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          // Normal view — chapter title, progress bar, controls
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.dim, cursor: "grab", fontSize: 14, padding: "0 4px" }}>⠿</span>

            {/* Manual done toggle — chapter is only marked done by clicking this */}
            <button
              onClick={onDoneToggle}
              style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: chap.done ? C.grn : "transparent",
                border: chap.done ? `1.5px solid ${C.grnL}` : `1.5px solid ${C.bdr2}`,
              }}
            >
              {chap.done && (
                <svg width="10" height="10" viewBox="0 0 12 12">
                  <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 500,
                color: chap.done ? C.dim : C.txt,
                textDecoration: chap.done ? "line-through" : "none",
              }}>
                {chap.name}
              </div>

              {/* Progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                <div style={{ flex: 1, height: 4, background: C.bdr, borderRadius: 2 }}>
                  <div style={{
                    height: 4, width: `${pct}%`,
                    background: pct === 100 ? C.grn : C.blue,
                    borderRadius: 2, transition: "width .3s",
                  }} />
                </div>
                <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap" }}>
                  {pct}% · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
                {chap.dueDate && (
                  <span style={{ fontSize: 11, color: C.dim }}>Due {chap.dueDate}</span>
                )}
              </div>
            </div>

            <button onClick={() => setEditOpen(true)} style={{ ...btn, padding: "3px 10px", fontSize: 11 }}>Edit</button>
            <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, padding: "0 4px" }}>
              {open ? "▲" : "▼"}
            </button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
        )}
      </div>

      {/* Tasks list — only shown when chapter is expanded */}
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
              />
            </div>
          ))}

          {/* Collapsible logbook for completed tasks */}
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

          {/* Add task form */}
          {showAdd ? (
            <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Task title</div>
                  <input
                    style={inp}
                    placeholder="e.g. Practice 30 problems"
                    value={tf.title}
                    onChange={e => setTf({ ...tf, title: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handleAddTask()}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Est. hours</div>
                  <input
                    type="number" min={0.5} step={0.5}
                    style={inp}
                    value={tf.hours}
                    onChange={e => setTf({ ...tf, hours: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Priority</div>
                  <PriorityPicker value={tf.priority} onChange={v => setTf({ ...tf, priority: v })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnP} onClick={handleAddTask}>Add</button>
                <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
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