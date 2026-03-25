import { useState } from "react";
import { C, PRIO, styles } from "../../constants";
import Pill from "./Pill";
import StatusCircle from "./StatusCircle";
import PriorityPicker from "./PriorityPicker";

const { inp, btn, btnP } = styles;

export default function TaskCard({ task, onCycle, onDelete, onSave, chapName }) {
  const [open, setOpen] = useState(false);
  const [ed, setEd]     = useState({ ...task }); // local edit state, only saved on confirm

  const p = PRIO.find(x => x.l === task.priority) || PRIO[1];

  const handleSave = () => {
    onSave(ed);
    setOpen(false);
  };

  return (
    <div style={{
      background:   C.sur,
      border:       `1px solid ${C.bdr}`,
      borderRadius: 10,
      marginBottom: 6,
    }}>
      {/* Collapsed row — click anywhere to expand */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      >
        <StatusCircle status={task.status} onClick={onCycle} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:       13,
            fontWeight:     500,
            color:          C.txt,
            textDecoration: task.status === "Done" ? "line-through" : "none",
            marginBottom:   3,
          }}>
            {task.title}
          </div>

          {/* Pills row — shows chapter name (in flat/tasks view), priority, hours */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {chapName && <Pill label={chapName} bg={C.sur2} color={C.mut} />}
            <Pill label={task.priority} bg={p.bg} color={p.c} />
            <span style={{ fontSize: 11, color: C.dim }}>{task.hours}h</span>
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
        >
          ×
        </button>
      </div>

      {/* Expanded edit form */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ borderTop: `1px solid ${C.bdr}`, padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Title</div>
            <input
              style={inp}
              value={ed.title}
              onChange={e => setEd({ ...ed, title: e.target.value })}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Hours</div>
            <input
              type="number" min={0.5} step={0.5}
              style={inp}
              value={ed.hours}
              onChange={e => setEd({ ...ed, hours: parseFloat(e.target.value) || 1 })}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Priority</div>
            <PriorityPicker value={ed.priority} onChange={v => setEd({ ...ed, priority: v })} />
          </div>

          <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, marginTop: 4 }}>
            <button style={btnP} onClick={handleSave}>Save</button>
            <button style={btn} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}