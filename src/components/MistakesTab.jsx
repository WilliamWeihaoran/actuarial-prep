import { useState } from "react";
import { C, styles } from "../constants";
import MistakeCard from "./shared/MistakeCard";
import CustomSelect from "./shared/CustomSelect";
import DateInput from "./shared/DateInput";

const { inp, btn, btnP } = styles;

export default function MistakesTab({
  examId, mistakes, chapters,
  onAddMistake, onToggleMistake, onDeleteMistake, onEditMistake,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const today                 = new Date().toISOString().slice(0, 10);

  const topics     = chapters.filter(c => c.examId === examId).map(c => c.name);
  const [mf, setMf] = useState({ topic: topics[0] || "", description: "", source: "", date: today });

  const examMistakes = mistakes.filter(m => m.examId === examId);
  const unresolved   = examMistakes.filter(m => !m.resolved);
  const resolved     = examMistakes.filter(m => m.resolved);

  const handleAdd = () => {
    if (!mf.description.trim()) return;
    onAddMistake({ ...mf, examId });
    setMf({ topic: topics[0] || "", description: "", source: "", date: today });
    setShowAdd(false);
  };

  return (
    <div>
      {/* Add mistake form */}
      {showAdd && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Topic</div>
              {topics.length > 0 ? (
                <CustomSelect value={mf.topic} options={topics} onChange={v => setMf({ ...mf, topic: v })} />
              ) : (
                <input style={inp} placeholder="Topic name" value={mf.topic} onChange={e => setMf({ ...mf, topic: e.target.value })} />
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Date</div>
              <DateInput value={mf.date} onChange={v => setMf({ ...mf, date: v || today })} block />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>What went wrong</div>
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 68 }}
                placeholder="Describe the mistake or misunderstanding..."
                value={mf.description}
                onChange={e => setMf({ ...mf, description: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Source</div>
              <input style={inp} placeholder="e.g. ACTEX Ch.4, SOA Q32" value={mf.source} onChange={e => setMf({ ...mf, source: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={btnP} onClick={handleAdd}>Log mistake</button>
            <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ ...btn, fontSize: 12, borderStyle: "dashed", marginBottom: 14, color: C.dim }}
        >
          + Log mistake
        </button>
      )}

      {/* Unresolved */}
      {unresolved.map(m => (
        <MistakeCard
          key={m.id}
          m={m}
          topics={topics}
          onToggle={() => onToggleMistake(m.id)}
          onDelete={() => onDeleteMistake(m.id)}
          onEdit={onEditMistake ? u => onEditMistake(m.id, u) : undefined}
        />
      ))}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>Resolved ({resolved.length})</div>
          {resolved.map(m => (
            <MistakeCard
              key={m.id}
              m={m}
              topics={topics}
              onToggle={() => onToggleMistake(m.id)}
              onDelete={() => onDeleteMistake(m.id)}
              onEdit={onEditMistake ? u => onEditMistake(m.id, u) : undefined}
            />
          ))}
        </div>
      )}

      {examMistakes.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", color: C.dim, padding: "2rem", fontSize: 14 }}>
          No mistakes logged yet.
        </div>
      )}
    </div>
  );
}
