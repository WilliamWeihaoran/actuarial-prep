import { useState, useRef, useEffect } from "react";
import { C, styles } from "../constants";
import MistakeCard from "./shared/MistakeCard";
import CustomSelect from "./shared/CustomSelect";
import DateInput from "./shared/DateInput";
import ConfirmDialog from "./shared/ConfirmDialog";

const { inp, btn, btnP } = styles;

export default function MistakesTab({
  examId, mistakes, chapters,
  onAddMistake, onToggleMistake, onDeleteMistake, onEditMistake,
}) {
  const [showAdd,       setShowAdd]       = useState(false);
  const [selectedId,    setSelectedId]    = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resolvedOpen,  setResolvedOpen]  = useState(false);
  const today                             = new Date().toISOString().slice(0, 10);

  const topics     = chapters.filter(c => c.examId === examId).map(c => c.name);
  const [mf, setMf] = useState({ topic: topics[0] || "", description: "", source: "", date: today });

  const examMistakes = mistakes.filter(m => m.examId === examId);
  const unresolved   = examMistakes.filter(m => !m.resolved);
  const resolved     = examMistakes.filter(m => m.resolved);

  const selectedIdRef    = useRef(null);
  const examMistakesRef  = useRef(examMistakes);
  selectedIdRef.current   = selectedId;
  examMistakesRef.current = examMistakes;

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowAdd(true); return; }
      const sel = selectedIdRef.current;
      if (!sel) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onToggleMistake(sel); // Enter = mark resolved/unresolved
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDeleteConfirm(sel);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    if (!mf.description.trim()) return;
    onAddMistake({ ...mf, examId });
    setMf({ topic: topics[0] || "", description: "", source: "", date: today });
    setShowAdd(false);
  };

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete mistake?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { onDeleteMistake(deleteConfirm); setDeleteConfirm(null); setSelectedId(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />

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
        <div
          key={m.id}
          onClick={() => setSelectedId(id => id === m.id ? null : m.id)}
          style={{ borderRadius: 10, outline: selectedId === m.id ? `2px solid ${C.blueL}` : "none", outlineOffset: 1 }}
        >
          <MistakeCard
            m={m}
            topics={topics}
            onToggle={() => onToggleMistake(m.id)}
            onDelete={() => setDeleteConfirm(m.id)}
            onEdit={onEditMistake ? u => onEditMistake(m.id, u) : undefined}
          />
        </div>
      ))}

      {/* Resolved — collapsible */}
      {resolved.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setResolvedOpen(o => !o)}
            style={{ ...btn, fontSize: 12, padding: "4px 12px", borderStyle: "dashed", color: C.dim, marginBottom: resolvedOpen ? 8 : 0 }}
          >
            {resolvedOpen ? "▲" : "▼"} Resolved ({resolved.length})
          </button>
          {resolvedOpen && resolved.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedId(id => id === m.id ? null : m.id)}
              style={{ opacity: 0.65, borderRadius: 10, outline: selectedId === m.id ? `2px solid ${C.blueL}` : "none", outlineOffset: 1 }}
            >
              <MistakeCard
                m={m}
                topics={topics}
                onToggle={() => onToggleMistake(m.id)}
                onDelete={() => setDeleteConfirm(m.id)}
                onEdit={onEditMistake ? u => onEditMistake(m.id, u) : undefined}
              />
            </div>
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
