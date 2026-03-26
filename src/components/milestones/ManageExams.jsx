import { useState, useEffect, useRef } from "react";
import { C, styles } from "../../constants";
import DateInput from "../shared/DateInput";
import ConfirmDialog from "../shared/ConfirmDialog";
import StatusCircle from "../shared/StatusCircle";
import CustomSelect from "../shared/CustomSelect";

const { inp, btn, btnP } = styles;

const TYPE_OPTIONS = [
  { value: "exam",    label: "Exam"    },
  { value: "project", label: "Project" },
];

function MilestoneRow({ ex, onUpd, onUpdMulti, onDelete }) {
  const fillRef    = useRef(null);
  const pendingRef = useRef(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => () => { if (pendingRef.current) clearTimeout(pendingRef.current); }, []);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    if (animating) {
      el.style.background = "rgba(60, 200, 80, 0.18)";
      el.style.transition = "none";
      el.style.width = "0%";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (fillRef.current) {
          fillRef.current.style.transition = "width 2s linear";
          fillRef.current.style.width = "100%";
        }
      }));
    } else {
      el.style.transition = "none";
      el.style.width = "0%";
    }
  }, [animating]);

  const handleComplete = () => {
    if (ex.completed) {
      onUpdMulti(ex.id, { completed: false, archived: false });
      return;
    }
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
      setAnimating(false);
      return;
    }
    setAnimating(true);
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      setAnimating(false);
      onUpdMulti(ex.id, { completed: true, archived: true });
    }, 2000);
  };

  const circleStatus = (ex.completed || animating) ? "Done" : "Not Started";

  return (
    <div style={{ position: "relative", background: C.sur2, borderRadius: 8, marginBottom: 8, border: `1px solid ${C.bdr}` }}>
      <div ref={fillRef} style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "0%", zIndex: 3, pointerEvents: "none", borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 8px", position: "relative", zIndex: 2 }}>
        {/* Completion circle */}
        <StatusCircle status={circleStatus} onClick={handleComplete} />

        {/* Name */}
        <input
          style={{ ...inp, flex: 1, minWidth: 0, opacity: ex.completed ? 0.5 : 1, textDecoration: ex.completed ? "line-through" : "none" }}
          value={ex.name}
          onChange={e => onUpd(ex.id, "name", e.target.value)}
        />

        {/* Due date */}
        <DateInput
          value={ex.dueDate || ""}
          onChange={v => onUpd(ex.id, "dueDate", v || "")}
          placeholder="Due date"
        />

        {/* Type picker */}
        <div style={{ width: 96, flexShrink: 0 }}>
          <CustomSelect
            value={ex.type || "exam"}
            options={TYPE_OPTIONS}
            onChange={v => onUpd(ex.id, "type", v)}
          />
        </div>

        {/* Hours (hidden for project type) */}
        {(ex.type || "exam") === "exam" && (
          <input
            type="text"
            inputMode="numeric"
            style={{ ...inp, width: 52, flexShrink: 0, textAlign: "center", opacity: ex.completed ? 0.5 : 1 }}
            placeholder="hrs"
            value={ex.targetHours ?? ""}
            onChange={e => {
              const raw = e.target.value;
              onUpd(ex.id, "targetHours", raw === "" ? "" : parseInt(raw) || 0);
            }}
          />
        )}

        {/* Hide / Show — disabled for completed milestones */}
        <button
          onClick={() => onUpd(ex.id, "archived", !ex.archived)}
          title={ex.archived ? "Show in nav" : "Hide from nav"}
          disabled={ex.completed}
          style={{ ...btn, padding: "4px 7px", fontSize: 11, flexShrink: 0,
            color: ex.completed ? C.dim : ex.archived ? C.mut : C.dim,
            opacity: ex.completed ? 0.35 : 1,
          }}
        >
          {ex.archived && !ex.completed ? "Show" : "Hide"}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(ex.id, ex.name)}
          style={{ ...btn, padding: "4px 6px", fontSize: 14, color: C.redL, flexShrink: 0 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function ManageExams({ exams, onSave, onClose }) {
  const original              = useState(() => JSON.stringify(exams))[0];
  const [local, setLocal]     = useState(exams.map(e => ({ ...e })));
  const [addingType, setAddingType] = useState(null); // "exam" | "project" | null
  const [nf, setNf]           = useState({ name: "", targetHours: 100, dueDate: "" });
  const [confirm, setConfirm] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [examOpen, setExamOpen]       = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);

  const isDirty = JSON.stringify(local) !== original;

  const upd = (id, field, val) =>
    setLocal(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));

  const updMulti = (id, fields) =>
    setLocal(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));

  const handleDelete = (id, name) => {
    setConfirm({
      title: "Delete milestone?",
      message: `"${name}" will be permanently deleted. This cannot be undone.`,
      onConfirm: () => { setLocal(prev => prev.filter(e => e.id !== id)); setConfirm(null); },
    });
  };

  const handleAdd = () => {
    if (!nf.name.trim()) return;
    const newExam = { ...nf, type: addingType, id: crypto.randomUUID(), archived: false, completed: false };
    setLocal(prev => [...prev, newExam]);
    setNf({ name: "", targetHours: 100, dueDate: "" });
    setAddingType(null);
  };

  const activeExams    = local.filter(e => !e.completed && (e.type || "exam") === "exam");
  const activeProjects = local.filter(e => !e.completed && e.type === "project");
  const completed      = local.filter(e => e.completed);

  const AddForm = ({ type }) => (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
      <input
        style={{ ...inp, flex: 1, minWidth: 120 }}
        placeholder="Name"
        value={nf.name}
        onChange={e => setNf({ ...nf, name: e.target.value })}
        onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAddingType(null); }}
        autoFocus
      />
      <DateInput value={nf.dueDate} onChange={v => setNf({ ...nf, dueDate: v })} placeholder="Due date" />
      {type === "exam" && (
        <input
          type="text" inputMode="numeric"
          style={{ ...inp, width: 52, flexShrink: 0, textAlign: "center" }}
          placeholder="hrs"
          value={nf.targetHours ?? ""}
          onChange={e => { const raw = e.target.value; setNf({ ...nf, targetHours: raw === "" ? "" : parseInt(raw) || 0 }); }}
        />
      )}
      <button style={btnP} onClick={handleAdd}>Add</button>
      <button style={btn} onClick={() => setAddingType(null)}>Cancel</button>
    </div>
  );

  const SectionHeader = ({ label, type, open, onToggle }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, marginTop: 4 }}>
      <button onClick={onToggle} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>
        {open ? "▾" : "▸"}
      </button>
      <div onClick={onToggle} style={{ fontSize: 11, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", flex: 1, cursor: "pointer" }}>
        {label}
      </div>
      <button
        onClick={() => { setAddingType(type); setNf({ name: "", targetHours: 100, dueDate: "" }); }}
        style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px", visibility: open ? "visible" : "hidden" }}
      >+</button>
    </div>
  );

  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr2}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || "Delete"}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      {/* Header row: title + confirm + cancel */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.txt, flex: 1 }}>Manage milestones</div>
        <button
          onClick={() => isDirty && onSave(local)}
          style={{ background: "none", border: `1px solid ${isDirty ? C.grnL : C.bdr}`, borderRadius: 7, cursor: isDirty ? "pointer" : "default", fontSize: 13, fontWeight: 600, color: isDirty ? C.grnL : C.dim, padding: "4px 10px", opacity: isDirty ? 1 : 0.35 }}
        >
          ✓ Confirm
        </button>
        <button
          onClick={() => {
            if (!isDirty) { onClose(); return; }
            setConfirm({ title: "Discard changes?", message: "Your unsaved changes will be lost.", confirmLabel: "Discard", onConfirm: onClose });
          }}
          style={{ background: "none", border: `1px solid ${C.redL}`, borderRadius: 7, cursor: "pointer", fontSize: 13, color: C.redL, padding: "4px 10px" }}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Exams section */}
      <SectionHeader label="Exams" type="exam" open={examOpen} onToggle={() => setExamOpen(v => !v)} />
      {examOpen && activeExams.map(ex => (
        <MilestoneRow key={ex.id} ex={ex} onUpd={upd} onUpdMulti={updMulti} onDelete={handleDelete} />
      ))}
      {examOpen && addingType === "exam" && <AddForm type="exam" />}

      {/* Projects section */}
      <div style={{ marginTop: 10 }}>
        <SectionHeader label="Projects" type="project" open={projectOpen} onToggle={() => setProjectOpen(v => !v)} />
        {projectOpen && activeProjects.map(ex => (
          <MilestoneRow key={ex.id} ex={ex} onUpd={upd} onUpdMulti={updMulti} onDelete={handleDelete} />
        ))}
        {projectOpen && addingType === "project" && <AddForm type="project" />}
      </div>

      {/* Completed milestones (collapsed by default) */}
      {completed.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.bdr}`, paddingTop: 10 }}>
          <button
            onClick={() => setShowCompleted(v => !v)}
            style={{ ...btn, fontSize: 12, marginBottom: showCompleted ? 10 : 0 }}
          >
            {showCompleted ? "▾" : "▸"} Completed ({completed.length})
          </button>
          {showCompleted && completed.map(ex => (
            <MilestoneRow key={ex.id} ex={ex} onUpd={upd} onUpdMulti={updMulti} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
