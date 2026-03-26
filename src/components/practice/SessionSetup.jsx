import { C, styles } from "../../constants";
import CustomSelect from "../shared/CustomSelect";
import ConfirmDialog from "../shared/ConfirmDialog";

const { inp, btn, btnP } = styles;

const TIMER_OPTIONS = [
  { label: "15 min", minutes: 15  },
  { label: "30 min", minutes: 30  },
  { label: "45 min", minutes: 45  },
  { label: "1 hr",   minutes: 60  },
  { label: "2 hr",   minutes: 120 },
  { label: "3 hr",   minutes: 180 },
];

export default function SessionSetup({
  cfg, setCfg,
  topics,
  sessions,
  showHistory, setShowHistory,
  expandedId, setExpandedId,
  historyLog, setHistoryLog,
  confirm, setConfirm,
  winWidth, winHeight,
  startSession,
  onDeleteSession,
  onAddMistake,
  examId,
  mistakes,
}) {
  const isSetupLand = winWidth > winHeight && winHeight < 500;

  const fmt = (s) => {
    const h  = Math.floor(s / 3600);
    const m  = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

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

  return (
    <div style={{ padding: isSetupLand ? "8px 0" : "1rem 0" }}>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* ── Setup card ── */}
      <div style={{
        background: C.sur, borderRadius: 14,
        border: `1px solid ${C.bdr}`,
        borderTop: `3px solid ${C.blue}`,
        marginBottom: 14,
      }}>
        {/* Card header */}
        {!isSetupLand && (
          <div style={{ padding: "16px 18px 0", marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>New session</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Configure and start a practice round</div>
          </div>
        )}

        {isSetupLand ? (
          /* ── Landscape: compact inline-row layout ── */
          <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Name + Qs + StartFrom all on one row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div style={{ width: 44, fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Name</div>
              <input style={{ ...inp, flex: 1, minWidth: 0 }} placeholder="Session name (optional)" value={cfg.name}
                onChange={e => setCfg({ ...cfg, name: e.target.value })} />
              <input type="number" style={{ ...inp, width: 52, textAlign: "center", flexShrink: 0 }} value={cfg.count}
                onChange={e => setCfg({ ...cfg, count: e.target.value })}
                onBlur={() => { const n = Math.min(100, Math.max(1, parseInt(cfg.count) || 30)); setCfg(c => ({ ...c, count: String(n) })); }} />
              <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>Qs from</span>
              <input type="number" style={{ ...inp, width: 52, textAlign: "center", flexShrink: 0 }} value={cfg.startFrom}
                onChange={e => setCfg({ ...cfg, startFrom: e.target.value })}
                onBlur={() => { const n = Math.max(1, parseInt(cfg.startFrom) || 1); setCfg(c => ({ ...c, startFrom: String(n) })); }} />
            </div>

            {/* Setup + Timer rows — simple 2-col grid, full 1fr for content */}
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", columnGap: 7, rowGap: 8, alignItems: "center" }}>

              {/* Setup: label */}
              <div style={{ fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Setup</div>
              {/* Setup: Exam/Topic + topic select */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                {[["exam", "Exam"], ["topic", "Topic"]].map(([val, label]) => {
                  const sel = cfg.type === val;
                  return (
                    <button key={val} onClick={() => setCfg({ ...cfg, type: val })}
                      style={{ padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: sel ? 600 : 400, flexShrink: 0,
                        background: sel ? C.blueBg : C.sur2, color: sel ? C.blueL : C.mut,
                        border: `1px solid ${sel ? C.blueBd : C.bdr2}`, cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
                {topics.length > 0 && (
                  <div style={{ flex: 1, minWidth: 0, opacity: cfg.type === "topic" ? 1 : 0.3, pointerEvents: cfg.type === "topic" ? "auto" : "none", transition: "opacity 0.15s" }}>
                    <CustomSelect value={cfg.topic} options={topics} onChange={v => setCfg({ ...cfg, topic: v })} />
                  </div>
                )}
              </div>

              {/* Timer: label */}
              <div style={{ fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Timer</div>
              {/* Timer: Untimed/Timed + time options inline */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                {[["untimed", "Untimed", C.blueBg, C.blueL, C.blueBd], ["timed", "Timed", C.ambBg, C.ambL, C.amb]].map(([val, label, sbg, sc, sbd]) => {
                  const sel = cfg.timerMode === val;
                  return (
                    <button key={val} onClick={() => setCfg({ ...cfg, timerMode: val })}
                      style={{ padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: sel ? 600 : 400, flexShrink: 0,
                        background: sel ? sbg : C.sur2, color: sel ? sc : C.mut,
                        border: `1px solid ${sel ? sbd : C.bdr2}`, cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
                <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 0, opacity: cfg.timerMode === "timed" ? 1 : 0.3, pointerEvents: cfg.timerMode === "timed" ? "auto" : "none", transition: "opacity 0.15s" }}>
                  {TIMER_OPTIONS.map(({ label, minutes }) => {
                    const sel = cfg.timerDuration === minutes;
                    return (
                      <button key={minutes} onClick={() => setCfg({ ...cfg, timerDuration: minutes })}
                        style={{ flex: 1, minWidth: 0, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: sel ? 600 : 400,
                          background: sel ? C.ambBg : C.sur2, color: sel ? C.ambL : C.mut,
                          border: `1px solid ${sel ? C.amb : C.bdr2}`, cursor: "pointer" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Start */}
            <button onClick={startSession}
              style={{ width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 700,
                background: C.grnBg, border: `1px solid ${C.grn}`, color: C.grnL,
                borderRadius: 10, cursor: "pointer", letterSpacing: "0.02em" }}>
              Start session
            </button>
          </div>
        ) : (
          /* ── Portrait: row-based layout ── */
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Name + Qs + StartFrom on one row; wraps to second line if screen is very narrow */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ width: 46, fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Name</div>
              <input style={{ ...inp, flex: 1, minWidth: 80 }} placeholder="Session name (optional)" value={cfg.name}
                onChange={e => setCfg({ ...cfg, name: e.target.value })} />
              <input type="number" style={{ ...inp, width: 60, textAlign: "center", flexShrink: 0 }} value={cfg.count}
                onChange={e => setCfg({ ...cfg, count: e.target.value })}
                onBlur={() => { const n = Math.min(100, Math.max(1, parseInt(cfg.count) || 30)); setCfg(c => ({ ...c, count: String(n) })); }} />
              <span style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>Qs from</span>
              <input type="number" style={{ ...inp, width: 60, textAlign: "center", flexShrink: 0 }} value={cfg.startFrom}
                onChange={e => setCfg({ ...cfg, startFrom: e.target.value })}
                onBlur={() => { const n = Math.max(1, parseInt(cfg.startFrom) || 1); setCfg(c => ({ ...c, startFrom: String(n) })); }} />
            </div>

            <div style={{ height: 1, background: C.bdr }} />

            {/* Setup + Timer — 4-col grid: label | btn1 | btn2 | flexible content
                Buttons share columns so they auto-align vertically */}
            <div style={{ display: "grid", gridTemplateColumns: "46px auto auto 1fr", columnGap: 8, rowGap: 12, alignItems: "center" }}>

              {/* Setup row */}
              <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Setup</div>
              {[["exam", "Full exam"], ["topic", "By topic"]].map(([val, label]) => {
                const sel = cfg.type === val;
                return (
                  <button key={val} onClick={() => setCfg({ ...cfg, type: val })}
                    style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: sel ? 600 : 400,
                      background: sel ? C.blueBg : C.sur2, color: sel ? C.blueL : C.mut,
                      border: `1px solid ${sel ? C.blueBd : C.bdr2}`, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                );
              })}
              <div style={{ minWidth: 0, opacity: cfg.type === "topic" ? 1 : 0.3, pointerEvents: cfg.type === "topic" ? "auto" : "none", transition: "opacity 0.15s" }}>
                {topics.length > 0 && <CustomSelect value={cfg.topic} options={topics} onChange={v => setCfg({ ...cfg, topic: v })} />}
              </div>

              {/* Divider spanning all columns */}
              <div style={{ gridColumn: "1 / -1", height: 1, background: C.bdr }} />

              {/* Timer row */}
              <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.05em" }}>Timer</div>
              {[["untimed", "Untimed"], ["timed", "Timed"]].map(([val, label]) => {
                const sel = cfg.timerMode === val;
                return (
                  <button key={val} onClick={() => setCfg({ ...cfg, timerMode: val })}
                    style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: sel ? 600 : 400,
                      background: sel ? C.blueBg : C.sur2, color: sel ? C.blueL : C.mut,
                      border: `1px solid ${sel ? C.blueBd : C.bdr2}`, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                );
              })}
              {/* Timer presets — scrollable when they don't fit */}
              <div style={{ minWidth: 0, opacity: cfg.timerMode === "timed" ? 1 : 0.3, pointerEvents: cfg.timerMode === "timed" ? "auto" : "none", transition: "opacity 0.15s" }}>
                <div style={{ overflowX: "auto" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {TIMER_OPTIONS.map(({ label, minutes }) => {
                      const sel = cfg.timerDuration === minutes;
                      return (
                        <button key={minutes} onClick={() => setCfg({ ...cfg, timerDuration: minutes })}
                          style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: sel ? 600 : 400,
                            background: sel ? C.blueBg : C.sur2, color: sel ? C.blueL : C.mut,
                            border: `1px solid ${sel ? C.blueBd : C.bdr2}`, cursor: "pointer" }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Start */}
            <button onClick={startSession}
              style={{ width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700,
                background: C.grnBg, border: `1px solid ${C.grn}`, color: C.grnL,
                borderRadius: 10, cursor: "pointer", letterSpacing: "0.02em" }}>
              Start session
            </button>
          </div>
        )}
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
              const sStart       = s.startFrom || 1;
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
                      onClick={e => {
                        e.stopPropagation();
                        setConfirm({
                          title: "Delete session?",
                          message: `"${s.name}" will be permanently deleted.`,
                          onConfirm: () => { onDeleteSession(s.id); setConfirm(null); },
                        });
                      }}
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
                            const qNum = sStart + i;
                            return (
                              <div key={i}
                                style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 6, color: col, padding: "5px 2px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <span style={{ fontSize: 8, opacity: 0.65, lineHeight: 1 }}>Q{qNum}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{ch || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Missed Q# pills */}
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
                                    if (existing) return;
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
                                  {existing ? `✓ Q${sStart + qi}` : `Q${sStart + qi}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Flagged Q# pills */}
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
                                    background: existing ? C.grnBg : C.redBg,
                                    color:      existing ? C.grnL  : C.redL,
                                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                                    border: `1px solid ${existing ? C.grn : isOpen ? C.redL : C.red}`,
                                    cursor: existing ? "default" : "pointer",
                                    outline: isOpen ? `2px solid ${C.redL}` : "none", outlineOffset: 1,
                                  }}>
                                  {existing ? `✓ Q${sStart + qi}` : `⚑ Q${sStart + qi}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inline log form */}
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
}
