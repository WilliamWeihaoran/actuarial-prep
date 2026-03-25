import { useState, useRef, useEffect } from "react";
import { C, styles } from "../constants";
import CustomSelect from "./shared/CustomSelect";

const { inp, btn, btnP } = styles;
const CHOICES = ["A", "B", "C", "D", "E"];

const fmt = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const defaultQ = () => ({ confidence: 0, choice: null, flagged: false });

const miniColor = (v) => {
  const c = typeof v === "number"
    ? (v === 1 ? true : v === 2 ? false : null)
    : (v?.correct ?? null);
  return {
    bg:  c === true ? C.grn  : c === false ? C.red  : C.sur2,
    col: c === true ? C.grnL : c === false ? C.redL : C.mut,
    bd:  c === true ? C.grnL : c === false ? C.redL : C.bdr2,
  };
};

// Mistake logging card inside review — click card body to expand details
const MissedCard = ({ idx, d, topics, onToggleOpen, onSetDetail, onLog, onRemove }) => (
  <div
    onClick={!d.logged ? onToggleOpen : undefined}
    style={{
      background: d.logged ? C.sur2 : C.redBg,
      border: `1px solid ${d.logged ? C.bdr : C.red}`,
      borderRadius: 10, marginBottom: 8, overflow: "hidden",
      cursor: d.logged ? "default" : "pointer",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: d.logged ? C.mut : C.redL }}>Q{idx + 1}</span>
        {d.flagged && <span style={{ fontSize: 11, color: C.ambL }}>⚑ flagged</span>}
        {!d.logged && (
          <span style={{ fontSize: 10, color: C.dim }}>{d.open ? "▲" : "▼"}</span>
        )}
      </div>
      {d.logged ? (
        <span style={{ fontSize: 11, color: C.grnL }}>✓ Logged</span>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onLog(); }} style={{ ...btn, fontSize: 11, padding: "3px 10px", color: C.redL, borderColor: C.red }}>
            Log
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove from log" style={{ ...btn, fontSize: 11, padding: "3px 8px", color: C.dim }}>
            ✕
          </button>
        </div>
      )}
    </div>
    {d.open && !d.logged && (
      <div onClick={e => e.stopPropagation()} style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Topic</div>
          {topics.length > 0 ? (
            <CustomSelect value={d.topic} options={topics} onChange={v => onSetDetail("topic", v)} />
          ) : (
            <input style={inp} value={d.topic} onChange={e => onSetDetail("topic", e.target.value)} />
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>What went wrong</div>
          <textarea
            style={{ ...inp, resize: "vertical", minHeight: 56 }}
            placeholder="Describe the mistake..."
            value={d.description}
            onChange={e => onSetDetail("description", e.target.value)}
          />
        </div>
        <button style={{ ...btnP, alignSelf: "flex-start" }} onClick={e => { e.stopPropagation(); onLog(); }}>Log mistake</button>
      </div>
    )}
  </div>
);

export default function PracticeTab({ examId, chapters, sessions = [], mistakes = [], onAddMistake, onAddSession, onDeleteSession }) {
  const topics = chapters.filter(c => c.examId === examId).map(c => c.name);
  const today  = new Date().toISOString().slice(0, 10);

  const [cfg, setCfg]         = useState({ name: "", type: "exam", topic: topics[0] || "", count: "30" });
  const [mode, setMode]       = useState("setup");
  const [grid, setGrid]       = useState([]);
  const [timer, setTimer]     = useState(0);
  const [paused, setPaused]   = useState(false);
  const [marks, setMarks]     = useState({});
  const [details, setDetails] = useState({});
  const [showHistory, setShowHistory]     = useState(false);
  const [expandedId, setExpandedId]       = useState(null);
  const [historyLog, setHistoryLog]       = useState(null);  // { sid, qi, topic, description }
  const timerRef    = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Active session helpers ─────────────────────────────────────
  const clickChoice = (i, ch) => setGrid(g => {
    const n = [...g];
    const q = n[i];
    if (q.choice === ch) {
      n[i] = q.confidence === 2
        ? { ...q, choice: null, confidence: 0 }
        : { ...q, confidence: q.confidence + 1 };
    } else {
      n[i] = { ...q, choice: ch, confidence: 1 };
    }
    return n;
  });

  const toggleFlag = (i) => setGrid(g => {
    const n = [...g];
    n[i] = { ...n[i], flagged: !n[i].flagged };
    return n;
  });

  // ── Session flow ───────────────────────────────────────────────
  const startSession = () => {
    const n = Math.min(100, Math.max(1, parseInt(cfg.count) || 30));
    sessionIdRef.current = crypto.randomUUID();
    setGrid(Array.from({ length: n }, defaultQ));
    setTimer(0);
    setMarks({});
    setDetails({});
    setPaused(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    setMode("active");
  };

  const togglePause = () => {
    if (paused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      setPaused(false);
    } else {
      clearInterval(timerRef.current);
      setPaused(true);
    }
  };

  const finish = () => {
    clearInterval(timerRef.current);
    const init = {};
    grid.forEach((q, i) => {
      if (q.flagged) {
        init[i] = { topic: cfg.type === "topic" ? cfg.topic : (topics[0] || "General"), description: "", flagged: true, open: false, logged: false };
      }
    });
    setDetails(init);
    setMode("done");
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setGrid([]);
    setMarks({});
    setDetails({});
    setPaused(false);
    setMode("setup");
  };

  // ── Review / done helpers ──────────────────────────────────────
  const markQ = (i, val) => {
    setMarks(m => ({ ...m, [i]: m[i] === val ? null : val }));
    if (val === false) {
      setDetails(prev => prev[i] ? prev : {
        ...prev,
        [i]: { topic: cfg.type === "topic" ? cfg.topic : (topics[0] || "General"), description: "", flagged: grid[i]?.flagged || false, open: false, logged: false },
      });
    }
  };

  // Toggle: add if absent, remove if present (and not yet formally logged)
  const toggleLog = (i) => {
    setDetails(prev => {
      if (prev[i] && !prev[i].logged) {
        const next = { ...prev };
        delete next[i];
        return next;
      }
      if (!prev[i]) {
        return {
          ...prev,
          [i]: { topic: cfg.type === "topic" ? cfg.topic : (topics[0] || "General"), description: "", flagged: grid[i]?.flagged || false, open: false, logged: false },
        };
      }
      return prev; // already logged — leave it
    });
  };

  const logMistake = (i) => {
    const d = details[i];
    const sessionName = cfg.name.trim() || `Practice - ${today}`;
    onAddMistake({
      examId,
      topic:        d.topic,
      description:  d.description.trim() || `Q${i + 1} missed in practice session`,
      source:       `Q${i + 1} · ${sessionName}`,
      date:         today,
      sessionId:    sessionIdRef.current,
      questionIdx:  i,
    });
    setDetails(prev => ({ ...prev, [i]: { ...prev[i], logged: true, open: false } }));
  };

  const setDetail = (i, field, val) =>
    setDetails(prev => ({ ...prev, [i]: { ...prev[i], [field]: val } }));

  const saveAndFinish = () => {
    const correctCount = Object.values(marks).filter(v => v === true).length;
    const wrongCount   = Object.values(marks).filter(v => v === false).length;
    const score        = grid.length ? Math.round(correctCount / grid.length * 100) : 0;
    onAddSession({
      id:            sessionIdRef.current || crypto.randomUUID(),
      examId,
      name:          cfg.name.trim() || `${cfg.type === "topic" ? cfg.topic : "Exam"} - ${today}`,
      type:          cfg.type,
      topic:         cfg.topic,
      date:          today,
      duration:      timer,
      questionCount: grid.length,
      correct:       correctCount,
      wrong:         wrongCount,
      skipped:       grid.length - correctCount - wrongCount,
      score,
      grid:          grid.map((q, i) => ({ ...q, correct: marks[i] ?? null })),
    });
    reset();
  };

  // ── History helpers ────────────────────────────────────────────
  // Find an already-logged mistake for a given session + question
  const findLoggedMistake = (sid, qi) =>
    mistakes.find(m => m.sessionId === sid && m.questionIdx === qi);

  const logHistoryMistake = (s) => {
    onAddMistake({
      examId,
      topic:       historyLog.topic,
      description: historyLog.description.trim() || `Q${historyLog.qi + 1} from ${s.name}`,
      source:      s.name,
      date:        s.date,
      sessionId:   s.id,
      questionIdx: historyLog.qi,
    });
    setHistoryLog(null);
  };

  // ── Derived values ─────────────────────────────────────────────
  const confidentCount = grid.filter(q => q.confidence === 1).length;
  const unsureCount    = grid.filter(q => q.confidence === 2).length;
  const flaggedCount   = grid.filter(q => q.flagged).length;
  const answeredCount  = grid.filter(q => q.choice !== null).length;
  const markedCorrect  = Object.values(marks).filter(v => v === true).length;
  const markedWrong    = Object.values(marks).filter(v => v === false).length;
  const loggableIdxs   = Object.keys(details).map(Number).sort((a, b) => a - b);

  // ── Setup ──────────────────────────────────────────────────────
  if (mode === "setup") return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.txt, marginBottom: 16 }}>Set up practice session</div>

        {/* Name + question count in one row */}
        <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Session name <span style={{ color: C.dim }}>(optional)</span></div>
            <input style={inp} placeholder="e.g. Mock exam 3" value={cfg.name} onChange={e => setCfg({ ...cfg, name: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Questions <span style={{ color: C.dim }}>(max 100)</span></div>
            <input type="number" style={inp} value={cfg.count}
              onChange={e => setCfg({ ...cfg, count: e.target.value })}
              onBlur={() => {
                const n = Math.min(100, Math.max(1, parseInt(cfg.count) || 30));
                setCfg(c => ({ ...c, count: String(n) }));
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Session type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["exam", "Exam"], ["topic", "By topic"]].map(([val, label]) => (
              <button key={val} onClick={() => setCfg({ ...cfg, type: val })}
                style={{ ...btn, flex: 1, background: cfg.type === val ? C.sur2 : "transparent", color: cfg.type === val ? C.txt : C.mut, borderColor: C.bdr2, fontWeight: cfg.type === val ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {cfg.type === "topic" && topics.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Topic</div>
            <CustomSelect value={cfg.topic} options={topics} onChange={v => setCfg({ ...cfg, topic: v })} />
          </div>
        )}

        <button style={{ ...btnP, width: "100%", padding: "10px 0", fontSize: 14 }} onClick={startSession}>Start session</button>
      </div>

      <button onClick={() => setShowHistory(h => !h)}
        style={{ ...btn, fontSize: 12, padding: "5px 14px", marginBottom: showHistory ? 10 : 0 }}>
        {showHistory ? "▲ Hide history" : `▼ See history (${sessions.length})`}
      </button>

      {showHistory && (
        <div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: "center", color: C.dim, padding: "1.5rem", fontSize: 14 }}>No sessions yet.</div>
          ) : (
            [...sessions].reverse().map(s => {
              const expanded     = expandedId === s.id;
              const scoreColor   = s.score >= 70 ? C.grnL : s.score >= 50 ? C.ambL : C.redL;
              const sCols        = (s.questionCount || 0) <= 35 ? 5 : 10;
              const missedInSess = (s.grid || []).map((v, i) => {
                const c = typeof v === "number" ? (v === 1 ? true : v === 2 ? false : null) : (v?.correct ?? null);
                return c === false ? i : -1;
              }).filter(i => i >= 0);
              const flaggedInSess = (s.grid || []).map((v, i) =>
                (typeof v === "object" && v?.flagged) ? i : -1
              ).filter(i => i >= 0);

              return (
                <div key={s.id} style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                  <div onClick={() => setExpandedId(expanded ? null : s.id)}
                    style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 3 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {s.date} · {s.type === "topic" ? s.topic : "Exam"} · {s.questionCount}Q · {fmt(s.duration)}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: scoreColor, minWidth: 38, textAlign: "right" }}>{s.score}%</span>
                    <button
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Delete session "${s.name}"?`)) onDeleteSession(s.id); }}
                      title="Delete session"
                      style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                    >×</button>
                  </div>

                  {expanded && (
                    <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.bdr}` }}>
                      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12, flexWrap: "wrap" }}>
                        <span style={{ background: C.grnBg, color: C.grnL, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>✓ {s.correct}</span>
                        <span style={{ background: C.redBg, color: C.redL, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>✗ {s.wrong}</span>
                        <span style={{ background: C.sur2,  color: C.mut,  fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>— {s.skipped}</span>
                        <span style={{ color: C.dim, fontSize: 11, alignSelf: "center" }}>{fmt(s.duration)}</span>
                      </div>

                      {s.grid && (
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${sCols}, 1fr)`, gap: 5, marginBottom: 12 }}>
                          {s.grid.map((v, i) => {
                            const { bg, col, bd } = miniColor(v);
                            const ch = typeof v === "object" ? v.choice : null;
                            return (
                              <div key={i} title={ch ? `Q${i+1}: ${ch}` : `Q${i+1}`}
                                style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 6, color: col, fontSize: 10, fontWeight: 600, padding: "4px 2px", textAlign: "center" }}>
                                {ch || (i + 1)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Clickable missed Q# pills */}
                      {missedInSess.length > 0 && (
                        <div style={{ marginBottom: flaggedInSess.length > 0 ? 8 : 0 }}>
                          <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Missed — click to log:</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {missedInSess.map(qi => {
                              const existing = findLoggedMistake(s.id, qi);
                              const isOpen   = historyLog?.sid === s.id && historyLog?.qi === qi;
                              return (
                                <button key={qi}
                                  onClick={() => {
                                    if (existing) return; // already logged — pill is just informational
                                    setHistoryLog(isOpen ? null : { sid: s.id, qi, topic: topics[0] || "", description: "" });
                                  }}
                                  style={{
                                    background: existing ? C.grnBg : C.redBg,
                                    color:      existing ? C.grnL  : C.redL,
                                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                                    border: `1px solid ${existing ? C.grn : isOpen ? C.redL : C.red}`,
                                    cursor: existing ? "default" : "pointer",
                                    outline: isOpen ? `2px solid ${C.redL}` : "none", outlineOffset: 1,
                                  }}>
                                  {existing ? `✓ Q${qi+1}` : `Q${qi+1}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Clickable flagged Q# pills */}
                      {flaggedInSess.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Flagged — click to log:</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {flaggedInSess.map(qi => {
                              const existing = findLoggedMistake(s.id, qi);
                              const isOpen   = historyLog?.sid === s.id && historyLog?.qi === qi;
                              return (
                                <button key={qi}
                                  onClick={() => {
                                    if (existing) return;
                                    setHistoryLog(isOpen ? null : { sid: s.id, qi, topic: topics[0] || "", description: "" });
                                  }}
                                  style={{
                                    background: existing ? C.grnBg : C.ambBg,
                                    color:      existing ? C.grnL  : C.ambL,
                                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                                    border: `1px solid ${existing ? C.grn : isOpen ? C.ambL : C.amb}`,
                                    cursor: existing ? "default" : "pointer",
                                    outline: isOpen ? `2px solid ${C.ambL}` : "none", outlineOffset: 1,
                                  }}>
                                  {existing ? `✓ Q${qi+1}` : `⚑ Q${qi+1}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inline log form — or existing mistake details */}
                      {historyLog?.sid === s.id && (() => {
                        const existing = findLoggedMistake(s.id, historyLog.qi);
                        if (existing) return (
                          <div style={{ background: C.grnBg, border: `1px solid ${C.grn}`, borderRadius: 8, padding: 12, marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: C.grnL, marginBottom: 6 }}>
                              Q{historyLog.qi + 1} — already logged
                            </div>
                            <div style={{ fontSize: 12, color: C.mut, marginBottom: 2 }}>{existing.topic}</div>
                            <div style={{ fontSize: 13, color: C.txt }}>{existing.description}</div>
                            <button style={{ ...btn, fontSize: 11, padding: "4px 12px", marginTop: 10 }} onClick={() => setHistoryLog(null)}>Close</button>
                          </div>
                        );
                        return (
                          <div style={{ background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 8, padding: 12, marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: C.txt, marginBottom: 10 }}>
                              Log Q{historyLog.qi + 1} as mistake
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Topic</div>
                              {topics.length > 0 ? (
                                <CustomSelect value={historyLog.topic} options={topics}
                                  onChange={v => setHistoryLog(l => ({ ...l, topic: v }))} />
                              ) : (
                                <input style={inp} value={historyLog.topic}
                                  onChange={e => setHistoryLog(l => ({ ...l, topic: e.target.value }))} />
                              )}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>What went wrong</div>
                              <textarea style={{ ...inp, resize: "vertical", minHeight: 48 }}
                                placeholder="Describe the mistake..."
                                value={historyLog.description}
                                onChange={e => setHistoryLog(l => ({ ...l, description: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button style={{ ...btnP, fontSize: 11, padding: "4px 14px" }} onClick={() => logHistoryMistake(s)}>Log mistake</button>
                              <button style={{ ...btn, fontSize: 11, padding: "4px 12px" }} onClick={() => setHistoryLog(null)}>Cancel</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  // ── Active session ─────────────────────────────────────────────
  if (mode === "active") return (
    <div style={{ padding: "1rem 0" }}>
      {/* ── STICKY HEADER ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: C.bg, paddingBottom: 12, paddingTop: 4,
        borderBottom: `1px solid ${C.bdr}`, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, color: C.mut, marginBottom: 10, textAlign: "center" }}>
          {cfg.name.trim() || (cfg.type === "topic" ? cfg.topic : "Exam")} · {grid.length} questions
        </div>

        {/* Big timer */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 16,
            background: C.sur2, border: `1px solid ${C.bdr2}`,
            borderRadius: 16, padding: "16px 36px",
            boxShadow: paused ? "none" : `0 0 32px rgba(37,99,235,0.18)`,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: paused ? C.ambL : C.grnL,
              boxShadow: paused ? "none" : `0 0 12px ${C.grnL}`,
            }} />
            <span style={{ fontFamily: "monospace", fontSize: 52, fontWeight: 700, color: C.txt, letterSpacing: 5 }}>
              {fmt(timer)}
            </span>
          </div>
          {paused && <div style={{ marginTop: 6, fontSize: 12, color: C.ambL }}>Paused</div>}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={togglePause}
            style={{ ...btn, minWidth: 110, textAlign: "center", padding: "8px 0", color: paused ? C.blueL : C.mut, borderColor: paused ? C.blueBd : C.bdr2 }}>
            {paused ? "▶  Resume" : "⏸  Pause"}
          </button>
          <button style={{ ...btnP, padding: "8px 32px", fontSize: 15 }} onClick={finish}>
            Finish
          </button>
          <button
            style={{ ...btn, padding: "8px 14px", color: C.redL, borderColor: C.red }}
            onClick={() => { if (window.confirm("Cancel this session? All progress will be lost.")) reset(); }}
          >
            ✕ Cancel
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ background: C.grnBg, color: C.grnL, fontSize: 11, padding: "4px 12px", borderRadius: 99 }}>● {confidentCount} confident</span>
          <span style={{ background: C.ambBg, color: C.ambL, fontSize: 11, padding: "4px 12px", borderRadius: 99 }}>● {unsureCount} unsure</span>
          <span style={{ background: C.sur2,  color: C.mut,  fontSize: 11, padding: "4px 12px", borderRadius: 99 }}>{answeredCount}/{grid.length} answered</span>
          {flaggedCount > 0 && <span style={{ background: C.ambBg, color: C.ambL, fontSize: 11, padding: "4px 12px", borderRadius: 99 }}>⚑ {flaggedCount} flagged</span>}
        </div>

        {paused && (
          <div style={{ textAlign: "center", marginTop: 10, padding: "6px 14px", fontSize: 12, color: C.ambL, background: C.ambBg, border: `1px solid ${C.amb}`, borderRadius: 8 }}>
            Session paused — choices visible but locked
          </div>
        )}

        {/* Column header */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingBottom: 6, marginTop: 12, borderBottom: `1px solid ${C.bdr}` }}>
          <div style={{ width: 32, flexShrink: 0 }} />
          <div style={{ width: 38, fontSize: 10, color: C.dim, textAlign: "center", flexShrink: 0 }}>Q#</div>
          {CHOICES.map(ch => (
            <div key={ch} style={{ flex: 1, fontSize: 10, color: C.dim, textAlign: "center" }}>{ch}</div>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE QUESTION GRID ── */}
      <div style={{ opacity: paused ? 0.45 : 1, pointerEvents: paused ? "none" : "auto" }}>
        {grid.map((q, i) => (
          <div key={i}>
            {/* Group separator every 5 questions */}
            {i > 0 && i % 5 === 0 && (
              <div style={{ height: 1, background: C.bdr2, margin: "6px 0", opacity: 0.6 }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
              <button onClick={() => toggleFlag(i)}
                style={{ width: 32, height: 36, borderRadius: 6, fontSize: 13, flexShrink: 0,
                  background: q.flagged ? C.ambBg : "transparent",
                  color:      q.flagged ? C.ambL  : C.dim,
                  border:     `1px solid ${q.flagged ? C.amb : C.bdr2}`,
                  cursor: "pointer" }}>
                ⚑
              </button>
              <div style={{ width: 38, height: 36, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: C.sur2, color: q.choice ? C.txt : C.dim, border: `1px solid ${C.bdr}` }}>
                {i + 1}
              </div>
              {CHOICES.map(ch => {
                const sel = q.choice === ch;
                const bg  = sel && q.confidence === 1 ? C.grn  : sel && q.confidence === 2 ? C.amb  : C.sur2;
                const col = sel && q.confidence === 1 ? C.grnL : sel && q.confidence === 2 ? C.ambL : C.dim;
                const bd  = sel && q.confidence === 1 ? C.grnL : sel && q.confidence === 2 ? C.ambL : C.bdr2;
                return (
                  <button key={ch} onClick={() => clickChoice(i, ch)}
                    style={{ flex: 1, height: 36, borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: bg, color: col, border: `1px solid ${bd}`, cursor: "pointer" }}>
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: C.dim, textAlign: "center" }}>
        Click letter once = confident (green) · twice = unsure (amber) · three times = clear · ⚑ to flag
      </div>
    </div>
  );

  // ── Review / done screen ───────────────────────────────────────
  if (mode === "done") {
    const half    = Math.ceil(grid.length / 2);
    const leftQs  = grid.slice(0, half).map((q, i) => ({ q, i }));
    const rightQs = grid.slice(half).map((q, i) => ({ q, i: i + half }));
    const totalMarked = markedCorrect + markedWrong;
    const score   = grid.length ? Math.round(markedCorrect / grid.length * 100) : 0;

    const renderRow = (q, i) => {
      const isCorrect = marks[i] === true;
      const isWrong   = marks[i] === false;
      const inLog     = !!details[i];
      const isLogged  = details[i]?.logged;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 6, marginBottom: 2,
          background: isCorrect ? C.grnBg : isWrong ? C.redBg : "transparent",
          border: `1px solid ${isCorrect ? C.grn : isWrong ? C.red : "transparent"}` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: q.confidence === 1 ? C.grnL : q.confidence === 2 ? C.ambL : C.bdr2 }} />
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 24, color: isCorrect ? C.grnL : isWrong ? C.redL : C.txt }}>
            Q{i + 1}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, minWidth: 18, textAlign: "center",
            background: q.choice ? C.blueBg : C.sur2, color: q.choice ? C.blueL : C.dim }}>
            {q.choice || "—"}
          </span>
          {q.flagged && <span style={{ fontSize: 10, color: C.ambL, flexShrink: 0 }}>⚑</span>}
          <div style={{ flex: 1 }} />
          {/* + / dot button — toggles add/remove from log */}
          <button
            onClick={() => toggleLog(i)}
            title={inLog ? (isLogged ? "Already logged" : "Remove from log") : "Add to log"}
            style={{
              width: 20, height: 26, borderRadius: 4, fontSize: 12, fontWeight: 700,
              background: inLog  ? (isLogged ? C.grnBg : C.ambBg) : "transparent",
              color:      inLog  ? (isLogged ? C.grnL  : C.ambL)  : C.dim,
              border:     `1px solid ${inLog ? (isLogged ? C.grn : C.amb) : C.bdr2}`,
              cursor: isLogged ? "default" : "pointer", flexShrink: 0,
            }}
          >
            {inLog ? (isLogged ? "✓" : "•") : "+"}
          </button>
          <button onClick={() => markQ(i, true)}
            style={{ width: 36, height: 30, borderRadius: 6, fontSize: 14, fontWeight: 700,
              background: isCorrect ? C.grn  : C.sur2,
              color:      isCorrect ? C.grnL : C.dim,
              border:     `1px solid ${isCorrect ? C.grnL : C.bdr2}`,
              cursor: "pointer", flexShrink: 0 }}>✓</button>
          <button onClick={() => markQ(i, false)}
            style={{ width: 36, height: 30, borderRadius: 6, fontSize: 14, fontWeight: 700,
              background: isWrong ? C.red  : C.sur2,
              color:      isWrong ? C.redL : C.dim,
              border:     `1px solid ${isWrong ? C.redL : C.bdr2}`,
              cursor: "pointer", flexShrink: 0 }}>✗</button>
        </div>
      );
    };

    const renderCol = (qs) => qs.map(({ q, i }, idx) => (
      <div key={i}>
        {idx > 0 && idx % 5 === 0 && <div style={{ height: 8 }} />}
        {renderRow(q, i)}
      </div>
    ));

    return (
      <div style={{ padding: "1rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.txt }}>Review answers</div>
          <div style={{ fontSize: 12, color: C.dim }}>{fmt(timer)} · {totalMarked}/{grid.length} marked</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { n: markedCorrect,             label: "Correct",  bg: C.grnBg, bd: C.grn,  c: C.grnL },
            { n: markedWrong,               label: "Wrong",    bg: C.redBg, bd: C.red,  c: C.redL },
            { n: grid.length - totalMarked, label: "Unmarked", bg: C.sur2,  bd: C.bdr2, c: C.txt  },
          ].map(({ n, label, bg, bd, c }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "12px 20px", textAlign: "center", flex: 1, minWidth: 72 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: c }}>{n}</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{label}</div>
            </div>
          ))}
          {totalMarked > 0 && (
            <div style={{ background: score >= 70 ? C.grnBg : score >= 50 ? C.ambBg : C.redBg, border: `1px solid ${score >= 70 ? C.grn : score >= 50 ? C.amb : C.red}`, borderRadius: 10, padding: "12px 20px", textAlign: "center", flex: 1, minWidth: 72 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: score >= 70 ? C.grnL : score >= 50 ? C.ambL : C.redL }}>{score}%</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Score</div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10 }}>
          Use + on any row to add it to the log section below. Click the dot to remove.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>{renderCol(leftQs)}</div>
          <div>{renderCol(rightQs)}</div>
        </div>

        {loggableIdxs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 10 }}>Log mistakes</div>
            {loggableIdxs.map(i => details[i] && (
              <MissedCard
                key={i}
                idx={i}
                d={details[i]}
                topics={topics}
                onToggleOpen={() => setDetail(i, "open", !details[i]?.open)}
                onSetDetail={(field, val) => setDetail(i, field, val)}
                onLog={() => logMistake(i)}
                onRemove={() => setDetails(prev => {
                  if (prev[i]?.logged) return prev;
                  const next = { ...prev };
                  delete next[i];
                  return next;
                })}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnP} onClick={saveAndFinish}>Save & finish</button>
          <button style={btn} onClick={reset}>Discard</button>
        </div>
      </div>
    );
  }
}
