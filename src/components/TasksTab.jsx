import { useState, useRef } from "react";
import { C, styles } from "../constants";
import TaskCard from "./shared/TaskCard";

const { btn } = styles;

export default function TasksTab({ examTasks, chapters, onCycleTask, onDeleteTask, onSaveTask }) {
  const [logOpen, setLogOpen] = useState(false);
  const fadingIds             = useRef({});
  const [, forceUpdate]       = useState(0);

  const active = examTasks.filter(t => t.status !== "Done");
  const done   = examTasks.filter(t => t.status === "Done");

  // Fade out a task over 2.4s before moving it to the logbook
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

  return (
    <div>
      {active.length === 0 && (
        <div style={{ textAlign: "center", color: C.dim, padding: "2rem", fontSize: 14 }}>
          No active tasks — add them via the Topics tab.
        </div>
      )}

      {/* Active tasks — show chapter name as a pill since this is a flat list */}
      {active.map(t => {
        const chap = chapters.find(c => c.id === t.chapterId);
        return (
          <div
            key={t.id}
            style={{
              opacity:    fadingIds.current[t.id] ? 0.2 : 1,
              transition: fadingIds.current[t.id] ? "opacity 2s" : "none",
            }}
          >
            <TaskCard
              task={t}
              chapName={chap?.name}
              onCycle={() => cycleWithFade(t)}
              onDelete={() => onDeleteTask(t.id)}
              onSave={u => onSaveTask(t.id, u)}
            />
          </div>
        );
      })}

      {/* Collapsible logbook at the bottom */}
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
                  onDelete={() => onDeleteTask(t.id)}
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