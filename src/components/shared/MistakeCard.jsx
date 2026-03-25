import { useState, useEffect, useRef } from "react";
import { C, styles } from "../../constants";
const { inp } = styles;

export default function MistakeCard({ m, topics = [], onToggle, onDelete, onEdit }) {
  const [expanded,    setExpanded]    = useState(false);
  const [editDesc,    setEditDesc]    = useState(false);
  const [editSource,  setEditSource]  = useState(false);
  const [editTopic,   setEditTopic]   = useState(false);
  const [desc,        setDesc]        = useState(m.description);
  const [source,      setSource]      = useState(m.source || "");
  const topicRef = useRef(null);

  useEffect(() => { setDesc(m.description);    }, [m.description]);
  useEffect(() => { setSource(m.source || ""); }, [m.source]);

  // Close topic dropdown on outside click
  useEffect(() => {
    if (!editTopic) return;
    const handler = (e) => { if (topicRef.current && !topicRef.current.contains(e.target)) setEditTopic(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editTopic]);

  const saveDesc = () => {
    const trimmed = desc.trim();
    if (trimmed && trimmed !== m.description) onEdit?.({ description: trimmed });
    else setDesc(m.description);
    setEditDesc(false);
  };

  const saveSource = () => {
    if (source.trim() !== (m.source || "")) onEdit?.({ source: source.trim() });
    setEditSource(false);
  };

  const isFromSession = !!m.sessionId;

  // Clicking the face expands; buttons stop propagation so they still work independently
  const handleFaceClick = () => setExpanded(v => !v);

  return (
    <div style={{
      background: C.sur, border: `1px solid ${C.bdr}`,
      borderRadius: 10, marginBottom: 8, overflow: "hidden",
    }}>
      {/* Card face — click anywhere to expand */}
      <div
        onClick={handleFaceClick}
        style={{ padding: "12px 14px", cursor: "pointer" }}
      >
        {/* Header row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          {/* Resolved toggle */}
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              cursor: "pointer", border: `1.5px solid ${m.resolved ? C.grnL : C.bdr2}`,
              background: m.resolved ? C.grn : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >
            {m.resolved && (
              <svg width="10" height="10" viewBox="0 0 12 12">
                <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* Inline topic selector */}
          <div ref={topicRef} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit && topics.length > 0 && setEditTopic(v => !v)}
              title={onEdit ? "Click to change topic" : undefined}
              style={{
                background: C.sur2, color: C.mut,
                fontSize: 11, padding: "2px 8px", borderRadius: 99,
                border: `1px solid ${editTopic ? C.bdr2 : "transparent"}`,
                cursor: onEdit && topics.length > 0 ? "pointer" : "default",
              }}
            >
              {m.topic || "—"}
            </button>
            {editTopic && (
              <div style={{
                position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0,
                background: C.sur2, border: `1px solid ${C.bdr2}`,
                borderRadius: 8, overflow: "hidden",
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)", minWidth: 160,
                maxHeight: 200, overflowY: "auto",
              }}>
                {topics.map(t => (
                  <div
                    key={t}
                    onMouseDown={() => { onEdit?.({ topic: t }); setEditTopic(false); }}
                    style={{
                      padding: "8px 12px", fontSize: 13, cursor: "pointer",
                      color: t === m.topic ? C.blueL : C.txt,
                      background: t === m.topic ? C.blueBg : "transparent",
                      borderBottom: `1px solid ${C.bdr}`,
                    }}
                    onMouseEnter={e => { if (t !== m.topic) e.currentTarget.style.background = C.sur; }}
                    onMouseLeave={e => { e.currentTarget.style.background = t === m.topic ? C.blueBg : "transparent"; }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Q# badge for mistakes logged from a practice session */}
          {m.questionIdx != null && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: C.redBg, color: C.redL, border: `1px solid ${C.red}`,
              flexShrink: 0,
            }}>
              Q{m.questionIdx + 1}
            </span>
          )}

          {/* Resolved badge */}
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 99,
            background: m.resolved ? C.grnBg : C.redBg,
            color: m.resolved ? C.grnL : C.redL,
          }}>
            {m.resolved ? "Resolved" : "Open"}
          </span>

          <span style={{ fontSize: 11, color: C.dim }}>{m.date}</span>
          <div style={{ flex: 1 }} />

          {/* Expand indicator */}
          <span style={{ fontSize: 10, color: C.dim, padding: "0 4px" }}>
            {expanded ? "▲" : "▼"}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Description — click directly on text to edit; empty area expands the card */}
        {editDesc ? (
          <textarea
            autoFocus
            style={{ ...inp, resize: "vertical", minHeight: 60, fontSize: 13 }}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={saveDesc}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveDesc(); }
              if (e.key === "Escape") { setDesc(m.description); setEditDesc(false); }
            }}
          />
        ) : (
          <div style={{
            fontSize: 13, color: C.txt, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: expanded ? "none" : 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            <span
              onClick={e => { e.stopPropagation(); if (onEdit) setEditDesc(true); }}
              title={onEdit ? "Click to edit description" : undefined}
              style={{ cursor: onEdit ? "text" : "default" }}
            >
              {m.description}
            </span>
          </div>
        )}
      </div>

      {/* Expanded panel — source only */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.bdr}`, padding: "10px 14px", paddingLeft: 42 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.mut, flexShrink: 0 }}>Source:</span>
            {isFromSession ? (
              <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>{m.source}</span>
            ) : editSource ? (
              <input
                autoFocus
                style={{ ...inp, padding: "2px 8px", fontSize: 12, flex: 1 }}
                value={source}
                onChange={e => setSource(e.target.value)}
                onBlur={saveSource}
                onKeyDown={e => {
                  if (e.key === "Enter") saveSource();
                  if (e.key === "Escape") { setSource(m.source || ""); setEditSource(false); }
                }}
              />
            ) : (
              <span
                onClick={() => onEdit && setEditSource(true)}
                style={{ fontSize: 12, color: m.source ? C.dim : C.bdr2, cursor: onEdit ? "text" : "default" }}
              >
                {m.source || (onEdit ? "click to add..." : "—")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
