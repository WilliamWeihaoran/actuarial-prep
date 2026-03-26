import { useState, useRef, useEffect } from "react";
import { C, PRIO, styles, fmtRelDate } from "../constants";

const { inp, btn, btnP } = styles;

const fmt = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};


export default function FocusMode({ task, chapName, onAddTask, onSaveTask, onExit }) {
  const [timer,      setTimer]     = useState(0);
  const [paused,     setPaused]    = useState(false);
  const [showAdd,    setShowAdd]   = useState(false);
  const [addedTasks, setAddedTasks] = useState([]);
  const [tf,         setTf]        = useState({ title: "", priority: "Medium", hours: "1" });
  const [showLog,    setShowLog]   = useState(false);
  const [logH,       setLogH]      = useState("0");
  const [logM,       setLogM]      = useState("0");
  const [markDone,   setMarkDone]  = useState(false);
  const [winW,       setWinW]      = useState(() => window.innerWidth);
  const [winH,       setWinH]      = useState(() => window.innerHeight);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const h = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "p" || e.key === "P") { e.preventDefault(); togglePause(); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePause = () => {
    if (paused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      setPaused(false);
    } else {
      clearInterval(timerRef.current);
      setPaused(true);
    }
  };

  const handleEnd = () => {
    clearInterval(timerRef.current);
    const mins = Math.ceil(timer / 60);
    setLogH(String(Math.floor(mins / 60)));
    setLogM(String(mins % 60));
    setShowLog(true);
  };

  const confirmLog = () => {
    const h = (parseInt(logH) || 0) + (parseInt(logM) || 0) / 60;
    const updates = { actualHours: Math.round(((task.actualHours || 0) + h) * 100) / 100 };
    if (markDone) updates.status = "Done";
    if (h > 0 || markDone) onSaveTask(task.id, updates);
    onExit();
  };

  const handleAddTask = () => {
    if (!tf.title.trim()) return;
    const hrs = parseFloat(tf.hours) || 1;
    const newTask = { ...tf, hours: hrs, chapterId: task.chapterId };
    onAddTask(newTask);
    setAddedTasks(prev => [...prev, { ...newTask, _id: Date.now() }]);
    setTf({ title: "", priority: "Medium", hours: "1" });
    setShowAdd(false);
  };

  const p = PRIO.find(x => x.l === task.priority) || PRIO[1];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const isOverdue = task.dueDate && task.dueDate < today;

  const completedBlocks = Math.floor(timer / 1800);
  const hasPartial = timer % 1800 > 0 && timer > 0;
  const tickCount = completedBlocks + (hasPartial ? 1 : 0);
  const TICK_MAX = 12;

  // Layout detection
  const isLandscape  = winW > winH;
  const isPhoneLand  = isLandscape && winH < 500;
  const isTabletLand = isLandscape && winH >= 500 && winW < 1400;
  const isMobileLand = isPhoneLand || isTabletLand;
  const isPhonePort  = !isLandscape && winW < 500;

  // Reset zoom to 1 in landscape so the fixed layout isn't over-zoomed
  useEffect(() => {
    if (!isMobileLand) return;
    const prev = document.documentElement.style.zoom || "1";
    document.documentElement.style.zoom = "1";
    return () => { document.documentElement.style.zoom = prev; };
  }, [isMobileLand]);

  // ── Log confirmation screen ────────────────────────────────────
  if (showLog) {
    const logLandscape = isMobileLand;
    return (
      <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: logLandscape ? 0 : "0 16px", zIndex: 200, overflow: "hidden" }}>
        <div style={{
          background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 16,
          padding: logLandscape ? "20px 28px" : "32px 36px",
          maxWidth: logLandscape ? 860 : 560, width: "100%",
          display: logLandscape ? "flex" : "block", gap: logLandscape ? 32 : undefined, alignItems: logLandscape ? "center" : undefined,
        }}>
          {/* Left: timer + title */}
          <div style={{ textAlign: "center", flexShrink: 0, marginBottom: logLandscape ? 0 : 20 }}>
            <div style={{ fontSize: 12, color: C.mut, marginBottom: 8 }}>Focus session ended</div>
            <div style={{ fontFamily: "monospace", fontSize: logLandscape ? "clamp(36px, 10vh, 64px)" : "clamp(44px, 8vw, 68px)", fontWeight: 700, color: C.txt, letterSpacing: 3 }}>
              {fmt(timer)}
            </div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 6, fontWeight: 500 }}>{task.title}</div>
          </div>

          {/* Right: controls */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>Hours</div>
                <input type="number" min={0} step={1} style={inp} value={logH}
                  onChange={e => setLogH(e.target.value)}
                  onBlur={e => setLogH(String(Math.max(0, parseInt(e.target.value) || 0)))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>Minutes</div>
                <input type="number" min={0} max={59} step={1} style={inp} value={logM}
                  onChange={e => setLogM(e.target.value)}
                  onBlur={e => setLogM(String(Math.min(59, Math.max(0, parseInt(e.target.value) || 0))))} />
              </div>
            </div>

            <div onClick={() => setMarkDone(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                padding: "14px 16px", borderRadius: 10, marginBottom: 14, textAlign: "left",
                background: markDone ? C.grnBg : C.sur2,
                border: `2px solid ${markDone ? C.grnL : C.bdr2}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                border: `2px solid ${markDone ? C.grnL : C.bdr2}`,
                background: markDone ? C.grn : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {markDone && (
                  <svg width="13" height="13" viewBox="0 0 12 12">
                    <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: markDone ? C.grnL : C.txt }}>
                {markDone ? "Will mark as done" : "Mark task as complete"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnP, flex: 1, padding: "14px 0", fontSize: 15, fontWeight: 600 }} onClick={confirmLog}>
                {markDone ? "Log & complete" : "Log & exit"}
              </button>
              <button style={{ ...btn, padding: "14px 20px", fontSize: 14, color: C.redL }} onClick={onExit}>
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Timer block ────────────────────────────────────────────────
  const timerFontSize = isMobileLand
    ? "clamp(60px, min(35vh, calc((100vw - 140px) / 5.2)), 220px)"
    : isPhonePort
      ? "clamp(32px, calc((100vw - 60px) / 5.2), 70px)"
      : "clamp(40px, 15vw, 108px)";

  const timerBg     = paused ? C.ambBg  : C.sur2;
  const timerBd     = paused ? C.amb    : C.bdr2;
  const timerColor  = paused ? C.ambL   : C.txt;
  const timerGlow   = paused ? `0 0 40px rgba(200,140,20,0.3)` : `0 0 48px rgba(37,99,235,0.14)`;

  const timerBlock = (
    <div style={{ textAlign: "center", width: "100%" }} onClick={togglePause}>
      <div style={{
        display: "flex", alignItems: "center", gap: isMobileLand ? 24 : isPhonePort ? 10 : 24,
        background: timerBg, border: `1.5px solid ${timerBd}`,
        borderRadius: isMobileLand ? 16 : 24,
        padding: isMobileLand ? "18px" : isPhonePort ? "12px 16px" : "20px 24px",
        boxShadow: timerGlow,
        width: "100%", boxSizing: "border-box", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
        transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
      }}>
        {!isPhonePort && (
          <div style={{
            width: isMobileLand ? 10 : 14, height: isMobileLand ? 10 : 14, borderRadius: "50%",
            background: paused ? C.ambL : C.grnL,
            boxShadow: paused ? `0 0 12px ${C.ambL}` : `0 0 16px ${C.grnL}`, flexShrink: 0,
            transition: "background 0.3s",
          }} />
        )}
        <span style={{
          fontFamily: "monospace", fontSize: timerFontSize, fontWeight: 700,
          color: timerColor, letterSpacing: isPhonePort ? "1px" : "clamp(2px, 0.3vw, 6px)",
          transition: "color 0.3s",
        }}>
          {fmt(timer)}
        </span>
      </div>

      {tickCount > 0 && !isMobileLand && (
        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          {Array.from({ length: Math.min(tickCount, TICK_MAX) }).map((_, i) => {
            const isFull = (i + 1) * 1800 <= timer;
            return (
              <div key={i} title={`${(i + 1) * 30} min`} style={{
                width: 9, height: 9, borderRadius: "50%",
                background: isFull ? C.grnL : "transparent",
                border: `1.5px solid ${isFull ? C.grnL : C.bdr2}`,
              }} />
            );
          })}
          {tickCount > TICK_MAX && <span style={{ fontSize: 10, color: C.dim, alignSelf: "center" }}>+{tickCount - TICK_MAX}</span>}
        </div>
      )}
    </div>
  );

  // ── Quick add section ─────────────────────────────────────────
  const quickAdd = (
    <div style={{ borderTop: isMobileLand ? "none" : `1px solid ${C.bdr}`, paddingTop: isMobileLand ? 0 : 14 }}>
      {showAdd ? (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: isMobileLand ? "8px 10px" : 12, marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input autoFocus style={{ ...inp, fontSize: 16, flex: 1 }} placeholder="Task title" value={tf.title}
              onChange={e => setTf({ ...tf, title: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleAddTask()} />
            <input type="number" min={0} step={0.25} style={{ ...inp, fontSize: 16, width: 64 }} placeholder="hrs" value={tf.hours}
              onChange={e => setTf({ ...tf, hours: e.target.value })}
              onBlur={e => { const v = parseFloat(e.target.value); setTf(f => ({ ...f, hours: !isNaN(v) && v > 0 ? String(v) : "1" })); }} />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {PRIO.map(pp => (
              <button key={pp.l} onClick={() => setTf(f => ({ ...f, priority: pp.l }))}
                style={{ flex: 1, fontSize: 11, fontWeight: 500, padding: "4px 0", borderRadius: 6, cursor: "pointer",
                  background: tf.priority === pp.l ? pp.bg : "transparent",
                  color:      tf.priority === pp.l ? pp.c  : C.dim,
                  border:     `1px solid ${tf.priority === pp.l ? pp.c : C.bdr2}` }}>
                {pp.l}
              </button>
            ))}
            <button style={{ ...btnP, padding: "4px 12px", fontSize: 12 }} onClick={handleAddTask}>Add</button>
            <button style={{ ...btn, padding: "4px 10px", fontSize: 12 }} onClick={() => setShowAdd(false)}>✕</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ ...btn, fontSize: 11, padding: "4px 12px", borderStyle: "dashed", color: C.dim, marginBottom: addedTasks.length > 0 ? 6 : 0 }}>
          + Add task
        </button>
      )}
      {addedTasks.map(t => {
        const pp = PRIO.find(x => x.l === t.priority) || PRIO[1];
        return (
          <div key={t._id} style={{ display: "flex", alignItems: "center", padding: "3px 0", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
              <span style={{ background: pp.bg, color: pp.c, fontSize: 10, padding: "1px 7px", borderRadius: 99 }}>{t.priority}</span>
              <span style={{ fontSize: 10, color: C.dim }}>{t.hours}h</span>
              <span style={{ fontSize: 10, color: C.grnL }}>✓</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Exit button ───────────────────────────────────────────────
  const exitBtn = (
    <button onClick={() => { clearInterval(timerRef.current); onExit(); }}
      style={{ ...btn, fontSize: 12, padding: "3px 10px", color: C.dim }}>
      Cancel session
    </button>
  );

  // ── Mobile landscape layout (phone + tablet) ──────────────────
  if (isMobileLand) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: C.bg,
        display: "flex", flexDirection: "column",
        padding: isPhoneLand ? "8px 14px 6px" : "12px 20px 10px",
        boxSizing: "border-box", overflow: "hidden", zIndex: 100,
      }}>
        {/* Task info row — compact, centered, above timer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: isPhoneLand ? 12 : 14, fontWeight: 700, color: C.txt }}>{task.title}</span>
          {chapName && (
            <span style={{ fontSize: isPhoneLand ? 10 : 11, fontWeight: 600, color: C.mut,
              background: C.sur2, padding: "1px 8px", borderRadius: 99 }}>{chapName}</span>
          )}
          <span style={{ background: p.bg, color: p.c, fontSize: isPhoneLand ? 10 : 11,
            fontWeight: 700, padding: "1px 8px", borderRadius: 99 }}>{task.priority}</span>
          {task.dueDate && (
            <span style={{ fontSize: isPhoneLand ? 10 : 11, fontWeight: 600,
              color: isOverdue ? C.redL : C.dim }}>Due {fmtRelDate(task.dueDate)}</span>
          )}
          {task.actualHours > 0 && (
            <span style={{ fontSize: isPhoneLand ? 10 : 11, fontWeight: 600,
              color: C.blueL }}>{task.actualHours}h logged</span>
          )}
          {paused && (
            <span style={{ fontSize: isPhoneLand ? 10 : 11, fontWeight: 700,
              color: C.ambL }}>PAUSED</span>
          )}
        </div>

        {/* Timer — fills remaining height, clickable */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "0 12px" }}>
          {timerBlock}
        </div>

        {/* Quick add — below timer */}
        <div style={{ flexShrink: 0, marginTop: 8 }}>
          {quickAdd}
        </div>

        {/* Bottom bar — back left, end right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexShrink: 0 }}>
          {exitBtn}
          <button onClick={handleEnd}
            style={{ ...btnP, height: 44, padding: "0 24px", fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            End session
          </button>
        </div>
      </div>
    );
  }

  // ── Portrait / desktop: single-column layout ──────────────────
  return (
    <div style={{ padding: "0.5rem 0" }}>
      {exitBtn}
      {/* Compact task summary — same style as landscape, always consistent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{task.title}</span>
        {chapName && <span style={{ fontSize: 11, fontWeight: 600, color: C.mut, background: C.sur2, padding: "1px 8px", borderRadius: 99 }}>{chapName}</span>}
        <span style={{ background: p.bg, color: p.c, fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 99 }}>{task.priority}</span>
        {task.dueDate && <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? C.redL : C.dim }}>Due {fmtRelDate(task.dueDate)}</span>}
        {task.hours && <span style={{ fontSize: 11, color: C.dim }}>{task.hours}h est.</span>}
        {task.actualHours > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: C.blueL }}>{task.actualHours}h logged</span>}
        {paused && <span style={{ fontSize: 11, fontWeight: 700, color: C.ambL }}>PAUSED</span>}
      </div>
      <div style={{ marginBottom: 28 }}>
        {timerBlock}
      </div>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <span style={{ fontSize: 11, color: C.dim }}>Tap timer to {paused ? "resume" : "pause"}</span>
      </div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
        <button onClick={handleEnd}
          style={{ ...btnP, minWidth: 140, height: 44, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13 }}>
          End session
        </button>
      </div>
      {quickAdd}
    </div>
  );
}
