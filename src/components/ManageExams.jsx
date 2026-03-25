import { useState } from "react";
import { C, styles } from "../constants";

const { inp, btn, btnP } = styles;

export default function ManageExams({ exams, onSave, onClose }) {
  const [local, setLocal]   = useState(exams.map(e => ({ ...e })));
  const [adding, setAdding] = useState(false);
  const [nf, setNf]         = useState({ name: "", targetHours: 100, dueDate: "" });

  const upd = (id, field, val) =>
    setLocal(local.map(e => e.id === id ? { ...e, [field]: val } : e));

  const handleAdd = () => {
    if (!nf.name.trim()) return;
    const newExam = { ...nf, id: crypto.randomUUID(), archived: false };
    setLocal([...local, newExam]);
    setNf({ name: "", targetHours: 100, dueDate: "" });
    setAdding(false);
  };

  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr2}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Manage exams / projects</div>

      {/* One row per exam: name | target hours | due date | archive | delete */}
      {local.map(ex => (
        <div key={ex.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 130px 28px 28px", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            style={{ ...inp, opacity: ex.archived ? 0.45 : 1 }}
            value={ex.name}
            onChange={e => upd(ex.id, "name", e.target.value)}
          />
          <input
            type="number"
            style={inp}
            placeholder="hrs"
            value={ex.targetHours}
            onChange={e => upd(ex.id, "targetHours", parseInt(e.target.value) || 0)}
          />
          <input
            type="date"
            style={inp}
            value={ex.dueDate}
            onChange={e => upd(ex.id, "dueDate", e.target.value)}
          />
          {/* Archive toggle — archived exams are hidden from the nav but not deleted */}
          <button
            onClick={() => upd(ex.id, "archived", !ex.archived)}
            title={ex.archived ? "Restore" : "Archive"}
            style={{ ...btn, padding: "4px 6px", fontSize: 12, color: ex.archived ? C.grnL : C.dim }}
          >
            {ex.archived ? "↩" : "▣"}
          </button>
          <button
            onClick={() => setLocal(local.filter(e => e.id !== ex.id))}
            style={{ ...btn, padding: "4px 6px", fontSize: 14, color: C.redL }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add new exam form */}
      {adding ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 130px", gap: 8, marginTop: 10, marginBottom: 8 }}>
          <input style={inp} placeholder="Project name" value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} />
          <input type="number" style={inp} placeholder="hrs" value={nf.targetHours} onChange={e => setNf({ ...nf, targetHours: parseInt(e.target.value) || 0 })} />
          <input type="date" style={inp} value={nf.dueDate} onChange={e => setNf({ ...nf, dueDate: e.target.value })} />
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
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