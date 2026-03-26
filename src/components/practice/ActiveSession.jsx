import { C, styles } from "../../constants";
import ConfirmDialog from "../shared/ConfirmDialog";

const { btn, btnP } = styles;
const CHOICES = ["A", "B", "C", "D", "E"];

const fmt = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

export default function ActiveSession({
  cfg,
  grid,
  timer,
  paused,
  activeQ,
  keyBufDisplay,
  startFromNum,
  timerLimit,
  timeDisplay,
  timerWarning,
  timerCritical,
  confidentCount,
  unsureCount,
  flaggedCount,
  answeredCount,
  winWidth,
  winHeight,
  confirm, setConfirm,
  togglePause,
  clickChoice,
  toggleFlag,
  finish,
  reset,
}) {
  const isActiveLand = winWidth > winHeight && winWidth >= 500;
  const leftW = winHeight < 500 ? 170 : winHeight < 700 ? 240 : 260;

  const timerBg    = paused ? C.ambBg : timerCritical ? C.redBg : C.sur2;
  const timerBd    = paused ? C.amb   : timerCritical ? C.red   : timerWarning ? C.amb : C.bdr2;
  const timerCol   = paused ? C.ambL  : timerCritical ? C.redL  : timerWarning ? C.ambL : C.txt;
  const dotColor   = paused ? C.ambL  : timerCritical ? C.redL  : timerWarning ? C.ambL : C.grnL;
  const glowShadow = paused
    ? `0 0 18px rgba(200,140,20,0.35)`
    : timerCritical ? `0 0 18px rgba(153,60,29,0.4)`
    : timerWarning  ? `0 0 18px rgba(133,79,11,0.35)`
    : `0 0 18px rgba(37,99,235,0.18)`;

  const isWide = winWidth >= 800;
  const half   = Math.ceil(grid.length / 2);
  const compactStats = winWidth < 500;

  const colHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: 4, paddingBottom: 4, marginBottom: 2, borderBottom: `1px solid ${C.bdr}` }}>
      <div style={{ width: 34, fontSize: 10, color: C.dim, textAlign: "center", flexShrink: 0 }}>Q#</div>
      {CHOICES.map(ch => (
        <div key={ch} style={{ flex: 1, fontSize: 10, color: C.dim, textAlign: "center" }}>{ch}</div>
      ))}
    </div>
  );

  const renderRow = (q, i, localIdx = i) => {
    const isActive = i === activeQ;
    return (
      <div key={i} id={`q-row-${i}`}>
        {localIdx > 0 && localIdx % 5 === 0 && (
          <div style={{ height: 2, background: C.bdr2, margin: "10px 0 8px", borderRadius: 1 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
          <button onClick={() => toggleFlag(i)}
            style={{ width: 34, height: 36, borderRadius: 6, fontSize: 11, fontWeight: 600, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              background: isActive ? C.blue  : q.flagged ? C.redBg : C.sur2,
              color:      isActive ? "#fff"  : q.flagged ? C.redL  : q.choice ? C.txt : C.dim,
              border:     `1px solid ${isActive ? C.blue : q.flagged ? C.red : C.bdr}`,
              boxShadow:  isActive ? `0 0 8px ${C.blue}88` : "none" }}>
            {startFromNum + i}
          </button>
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
    );
  };

  // ── Landscape: fixed two-column layout ───────────────────────
  if (isActiveLand) return (
    <div style={{
      position: "fixed", inset: 0, background: C.bg,
      display: "flex", flexDirection: "row",
      boxSizing: "border-box", overflow: "hidden", zIndex: 100,
    }}>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Cancel session"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Left panel: timer + controls */}
      <div style={{
        width: leftW, flexShrink: 0,
        display: "flex", flexDirection: "column",
        padding: winHeight < 500 ? "8px 8px" : "12px 16px",
        borderRight: `1px solid ${C.bdr}`,
        overflow: "hidden",
      }}>
        {/* Session name */}
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 6, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cfg.name.trim() || (cfg.type === "topic" ? cfg.topic : "Exam")} · {grid.length}Q
          {timerLimit != null && <span style={{ color: timerWarning ? C.ambL : C.dim }}> · {fmt(timerLimit)}</span>}
        </div>

        {/* Timer — click to pause */}
        <div onClick={togglePause} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: timerBg, border: `1px solid ${timerBd}`,
          borderRadius: 10, padding: "8px 10px",
          boxShadow: glowShadow, cursor: "pointer", marginBottom: 8,
          transition: "background 0.3s, border-color 0.3s",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
          <span style={{
            fontFamily: "monospace", fontSize: "clamp(18px, 5vh, 28px)",
            fontWeight: 700, letterSpacing: "2px",
            color: timerCol, whiteSpace: "nowrap",
          }}>
            {fmt(timeDisplay)}
          </span>
        </div>

        {/* Warning */}
        {(timerCritical || timerWarning) && !paused && (
          <div style={{ textAlign: "center", fontSize: 10, color: timerCritical ? C.redL : C.ambL, marginBottom: 6 }}>
            {timerCritical ? "Almost out of time!" : "Under 5 min left"}
          </div>
        )}

        {/* Stats — stacked vertically */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          <span style={{ background: C.grnBg, color: C.grnL, fontSize: 11, padding: "3px 8px", borderRadius: 99, textAlign: "center" }}>● {confidentCount} confident</span>
          <span style={{ background: C.ambBg, color: C.ambL, fontSize: 11, padding: "3px 8px", borderRadius: 99, textAlign: "center" }}>● {unsureCount} unsure</span>
          <span style={{ background: C.redBg, color: C.redL, fontSize: 11, padding: "3px 8px", borderRadius: 99, textAlign: "center" }}>⚑ {flaggedCount} flagged</span>
          <span style={{ background: C.sur2,  color: C.mut,  fontSize: 11, padding: "3px 8px", borderRadius: 99, textAlign: "center" }}>{answeredCount}/{grid.length} answered</span>
        </div>

        {/* Active Q / key buffer hint */}
        {keyBufDisplay ? (
          <div style={{ textAlign: "center", fontSize: 11, color: C.blueL, fontFamily: "monospace", fontWeight: 600, marginBottom: 4 }}>
            ⌨ Q{keyBufDisplay}…
          </div>
        ) : activeQ !== null ? (
          <div style={{ textAlign: "center", fontSize: 10, color: C.blueL, marginBottom: 4 }}>
            Q{startFromNum + activeQ} active
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        {/* Finish + Cancel */}
        <button style={{ ...btnP, width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, marginBottom: 6 }} onClick={finish}>
          Finish
        </button>
        <button
          style={{ ...btn, width: "100%", padding: "8px 0", fontSize: 12, color: C.redL, borderColor: C.red }}
          onClick={() => setConfirm({
            title: "Cancel session?",
            message: "All progress will be lost. This cannot be undone.",
            onConfirm: () => { setConfirm(null); reset(); },
          })}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Right panel: scrollable question grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: winHeight < 500 ? "8px 8px" : "10px 16px", opacity: paused ? 0.45 : 1, pointerEvents: paused ? "none" : "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            {colHeader}
            {grid.slice(0, half).map((q, i) => renderRow(q, i))}
          </div>
          <div>
            {colHeader}
            {grid.slice(half).map((q, i) => renderRow(q, i + half, i))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Portrait: sticky header + scrollable grid ─────────────────
  return (
    <div style={{ padding: "1rem 0" }}>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Cancel session"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: C.bg, paddingBottom: 10, paddingTop: 6,
        borderBottom: `1px solid ${C.bdr}`, marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, textAlign: "center" }}>
          {cfg.name.trim() || (cfg.type === "topic" ? cfg.topic : "Exam")} · {grid.length}Q
          {timerLimit != null && <span style={{ color: timerWarning ? C.ambL : C.dim }}> · {fmt(timerLimit)}</span>}
        </div>

        <div onClick={togglePause} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: timerBg, border: `1px solid ${timerBd}`,
          borderRadius: 10, padding: "10px 14px",
          boxShadow: glowShadow, overflow: "hidden", cursor: "pointer", marginBottom: 6,
          transition: "background 0.3s, border-color 0.3s",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: dotColor, boxShadow: `0 0 8px ${dotColor}`, transition: "background 0.3s" }} />
          <span style={{
            fontFamily: "monospace", fontSize: "clamp(24px, 9vw, 48px)",
            fontWeight: 700, letterSpacing: "clamp(1px, 0.6vw, 4px)",
            color: timerCol, whiteSpace: "nowrap", transition: "color 0.3s",
          }}>
            {fmt(timeDisplay)}
          </span>
        </div>

        <div style={{ height: 18, textAlign: "center" }}>
          {timerCritical && !paused && <span style={{ fontSize: 11, color: C.redL }}>Almost out of time!</span>}
          {timerWarning && !timerCritical && !paused && <span style={{ fontSize: 11, color: C.ambL }}>Under 5 min left</span>}
        </div>

        <div style={{ display: "flex", gap: compactStats ? 4 : 8, flexWrap: "nowrap", justifyContent: "center", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          <span style={{ background: C.grnBg, color: C.grnL, fontSize: 11, padding: compactStats ? "3px 8px" : "4px 12px", borderRadius: 99, flexShrink: 0, whiteSpace: "nowrap" }}>● {confidentCount}{!compactStats && " confident"}</span>
          <span style={{ background: C.ambBg, color: C.ambL, fontSize: 11, padding: compactStats ? "3px 8px" : "4px 12px", borderRadius: 99, flexShrink: 0, whiteSpace: "nowrap" }}>● {unsureCount}{!compactStats && " unsure"}</span>
          <span style={{ background: C.redBg, color: C.redL, fontSize: 11, padding: compactStats ? "3px 8px" : "4px 12px", borderRadius: 99, flexShrink: 0, whiteSpace: "nowrap" }}>⚑ {flaggedCount}{!compactStats && " flagged"}</span>
          <span style={{ background: C.sur2,  color: C.mut,  fontSize: 11, padding: compactStats ? "3px 8px" : "4px 12px", borderRadius: 99, flexShrink: 0, whiteSpace: "nowrap" }}>{answeredCount}/{grid.length}{!compactStats && " answered"}</span>
        </div>

        {keyBufDisplay ? (
          <div style={{ textAlign: "center", marginTop: 5, fontSize: 12, color: C.blueL, fontFamily: "monospace", fontWeight: 600 }}>
            ⌨ Q{keyBufDisplay}…
          </div>
        ) : activeQ !== null ? (
          <div style={{ textAlign: "center", marginTop: 5, fontSize: 11, color: C.blueL }}>
            Q{startFromNum + activeQ} active · A-E or !@#$% · F = flag · Enter = next
          </div>
        ) : null}
      </div>

      {/* Question grid */}
      <div style={{ opacity: paused ? 0.45 : 1, pointerEvents: paused ? "none" : "auto" }}>
        {isWide ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              {colHeader}
              {grid.slice(0, half).map((q, i) => renderRow(q, i))}
            </div>
            <div>
              {colHeader}
              {grid.slice(half).map((q, i) => renderRow(q, i + half, i))}
            </div>
          </div>
        ) : (
          grid.map((q, i) => renderRow(q, i))
        )}
      </div>

      {/* Finish + Cancel */}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...btnP, flex: 1, padding: "13px 0", fontSize: 15, fontWeight: 700 }} onClick={finish}>
          Finish
        </button>
        <button
          style={{ ...btn, padding: "13px 20px", color: C.redL, borderColor: C.red }}
          onClick={() => setConfirm({
            title: "Cancel session?",
            message: "All progress will be lost. This cannot be undone.",
            onConfirm: () => { setConfirm(null); reset(); },
          })}
        >
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}
