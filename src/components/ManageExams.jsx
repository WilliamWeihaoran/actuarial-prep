import { useState } from "react";
import { C, styles } from "../constants";
import DateInput from "./shared/DateInput";
import ConfirmDialog from "./shared/ConfirmDialog";

const { inp, btn, btnP } = styles;

export default function ManageExams({ exams, onSave, onClose }) {
  const [local, setLocal]   = useState(exams.map(e => ({ ...e })));
  const [adding, setAdding] = useState(false);
  const [nf, setNf]         = useState({ name: "", targetHours: 100, dueDate: "" });
  const [confirm, setConfirm] = useState(null);

  const upd = (id, field, val) =>
    setLocal(local.map(e => e.id === id ? { ...e, [field]: val } : e));

  const handleDelete = (id, name) => {
    setConfirm({
      title: "Delete project?",
      message: `"${name}" will be permanently deleted. This cannot be undone.`,
      onConfirm: () => { setLocal(local.filter(e => e.id !== id)); setConfirm(null); },
    });
  };

  const handleAdd = () => {
    if (!nf.name.trim()) return;
    const newExam = { ...nf, id: crypto.randomUUID(), archived: false };
    setLocal([...local, newExam]);
    setNf({ name: "", targetHours: 100, dueDate: "" });
    setAdding(false);
  };

  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr2}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Manage exams / projects</div>

      {/* One card per exam: name on top row, hours/date/actions on second row */}
      {local.map(ex => (
        <div key={ex.id} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          <input
            style={{ ...inp, opacity: ex.archived ? 0.45 : 1 }}
            value={ex.name}
            onChange={e => upd(ex.id, "name", e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              style={{ ...inp, width: 64, flexShrink: 0 }}
              placeholder="hrs"
              value={ex.targetHours ?? ""}
              onChange={e => {
                const raw = e.target.value;
                upd(ex.id, "targetHours", raw === "" ? "" : parseInt(raw) || 0);
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <DateInput
                value={ex.dueDate || ""}
                onChange={v => upd(ex.id, "dueDate", v || "")}
                placeholder="Due date"
                block
              />
            </div>
            {/* Archive toggle — archived exams are hidden from the nav but not deleted */}
            <button
              onClick={() => upd(ex.id, "archived", !ex.archived)}
              title={ex.archived ? "Restore" : "Archive"}
              style={{ ...btn, padding: "4px 6px", fontSize: 12, color: ex.archived ? C.grnL : C.dim, flexShrink: 0 }}
            >
              {ex.archived ? "↩" : "▣"}
            </button>
            <button
              onClick={() => handleDelete(ex.id, ex.name)}
              style={{ ...btn, padding: "4px 6px", fontSize: 14, color: C.redL, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {/* Add new exam form */}
      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, marginBottom: 8 }}>
          <input style={inp} placeholder="Project name" value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="text" inputMode="numeric" style={{ ...inp, width: 64, flexShrink: 0 }} placeholder="hrs" value={nf.targetHours ?? ""} onChange={e => { const raw = e.target.value; setNf({ ...nf, targetHours: raw === "" ? "" : parseInt(raw) || 0 }); }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <DateInput value={nf.dueDate} onChange={v => setNf({ ...nf, dueDate: v })} placeholder="Due date" block />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnP} onClick={handleAdd}>Add</button>
            <button style={btn} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button style={{ ...btn, fontSize: 12, borderStyle: "dashed", marginTop: 4 }} onClick={() => setAdding(true)}>
          + New project
        </button>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={btnP} onClick={() => onSave(local)}>Save changes</button>
        <button style={btn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
