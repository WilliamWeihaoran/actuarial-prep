import { useState, useRef, useEffect } from "react";
import { C, PRIO, styles } from "../constants";
import StatusCircle from "./shared/StatusCircle";

const { inp, btn, btnP } = styles;

const fmt = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const SNAP_MINS = [5, 10, 15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300];

function snapMinutes(totalMinutes) {
  if (totalMinutes <= 0) return SNAP_MINS[0];
  let best = SNAP_MINS[0], bestDiff = Math.abs(totalMinutes - best);
  for (const m of SNAP_MINS) {
    const diff = Math.abs(totalMinutes - m);
    if (diff < bestDiff) { best = m; bestDiff = diff; }
  }
  return best;
}

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
    const rawMins = Math.round(timer / 60);
    const snapped = snapMinutes(rawMins);
    setLogH(String(Math.floor(snapped / 60)));
    setLogM(String(snapped % 60));
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
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < today;

  const completedBlocks = Math.floor(timer / 1800);
  const hasPartial = timer % 1800 > 0 && timer > 0;
  const tickCount = completedBlocks + (hasPartial ? 1 : 0);
  const TICK_MAX = 12;

  // Layout detection
  const isLandscape  = winW > winH;
  const isPhoneLand  = isLandscape && winH < 500;   // phone landscape: wide + short
  const isTabletLand = isLandscape && winH >= 500 && winW < 1280; // tablet/iPad landscape

  // ── Log confirmation screen ────────────────────────────────────
  if (showLog) {
    const logLandscape = isPhoneLand; // use horizontal layout on phone landscape
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{
          background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 14,
          padding: logLandscape ? "16px 20px" : 32,
          maxWidth: logLandscape ? 680 : 420, width: "100%",
          display: logLandscape ? "flex" : "block", gap: logLandscape ? 24 : undefined, alignItems: logLandscape ? "center" : undefined,
        }}>
          {/* Left: timer + title */}
          <div style={{ textAlign: "center", flexShrink: 0, marginBottom: logLandscape ? 0 : 16 }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Focus session ended</div>
            <div style={{ fontFamily: "monospace", fontSize: logLandscape ? "clamp(32px, 9vh, 52px)" : "clamp(36px, 10vw, 52px)", fontWeight: 700, color: C.txt, letterSpacing: 3 }}>
              {fmt(timer)}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{task.title}</div>
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
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                padding: "10px 12px", borderRadius: 10, marginBottom: 12, textAlign: "left",
                background: markDone ? C.grnBg : C.sur2,
                border: `2px solid ${markDone ? C.grnL : C.bdr2}` }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${markDone ? C.grnL : C.bdr2}`,
                background: markDone ? C.grn : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {markDone && (
                  <svg width="11" height="11" viewBox="0 0 12 12">
                    <polyline points="2,6 5,9 10,3" stroke="#c8f0a0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: markDone ? C.grnL : C.txt }}>
                {markDone ? "Will mark as done" : "Mark task as complete"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnP, flex: 1, padding: "10px 0", fontSize: 13 }} onClick={confirmLog}>
                {markDone ? "Log & complete" : "Log & exit"}
              </button>
              <button style={{ ...btn, padding: "10px 14px", fontSize: 12, color: C.dim }} onClick={onExit}>
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Timer block (reused across layouts) ───────────────────────
  const timerFontSize = isPhoneLand
    ? "clamp(52px, 14vh, 82px)"
    : isTabletLand
      ? "clamp(90px, 16vw, 140px)"
      : "clamp(64px, 20vw, 108px)";

  const timerBg     = paused ? C.ambBg  : C.sur2;
  const timerBd     = paused ? C.amb    : C.bdr2;
  const timerColor  = paused ? C.ambL   : C.txt;
  const timerGlow   = paused ? `0 0 40px rgba(200,140,20,0.3)` : `0 0 48px rgba(37,99,235,0.14)`;

  const timerBlock = (
    <div style={{ textAlign: "center" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: isPhoneLand ? 12 : 24,
        background: timerBg, border: `1.5px solid ${timerBd}`,
        borderRadius: isPhoneLand ? 16 : 24,
        padding: isPhoneLand ? "16px 28px" : "28px 48px",
        boxShadow: timerGlow,
        width: "100%", boxSizing: "border-box", justifyContent: "center",
        transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
      }}>
        <div style={{
          width: isPhoneLand ? 10 : 14, height: isPhoneLand ? 10 : 14, borderRadius: "50%",
          background: paused ? C.ambL : C.grnL,
          boxShadow: paused ? `0 0 12px ${C.ambL}` : `0 0 16px ${C.grnL}`, flexShrink: 0,
          transition: "background 0.3s",
        }} />
        <span style={{
          fontFamily: "monospace", fontSize: timerFontSize, fontWeight: 700,
          color: timerColor, letterSpacing: "clamp(2px, 0.5vw, 8px)",
          transition: "color 0.3s",
        }}>
          {fmt(timer)}
        </span>
      </div>

      {tickCount > 0 && !isPhoneLand && (
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

  // ── Controls ──────────────────────────────────────────────────
  const controls = (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      <button onClick={togglePause}
        style={{ ...btn, minWidth: 110, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: paused ? C.ambL : C.mut, borderColor: paused ? C.amb : C.bdr2 }}>
        {paused ? "▶  Resume" : "⏸  Pause"}
      </button>
      <button onClick={handleEnd}
        style={{ ...btnP, minWidth: 110, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13 }}>
        End session
      </button>
    </div>
  );

  // ── Task info ─────────────────────────────────────────────────
  const taskInfo = (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <StatusCircle status={task.status} onClick={() => {}} />
        <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{task.title}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingLeft: 28 }}>
        {chapName && <span style={{ fontSize: 12, background: C.sur2, color: C.mut, padding: "2px 10px", borderRadius: 99 }}>{chapName}</span>}
        <span style={{ background: p.bg, color: p.c, fontSize: 12, padding: "2px 10px", borderRadius: 99 }}>{task.priority}</span>
        {task.dueDate && <span style={{ fontSize: 12, color: isOverdue ? C.redL : C.dim }}>Due {task.dueDate}</span>}
        <span style={{ fontSize: 12, color: C.dim }}>{task.hours}h est.</span>
        {task.actualHours > 0 && <span style={{ fontSize: 12, color: C.blueL }}>{task.actualHours}h logged</span>}
      </div>
    </div>
  );

  // ── Quick add section ─────────────────────────────────────────
  const quickAdd = (
    <div style={{ borderTop: isPhoneLand ? "none" : `1px solid ${C.bdr}`, paddingTop: isPhoneLand ? 0 : 14 }}>
      <div style={{ fontSize: 12, color: C.mut, marginBottom: 8 }}>Quick add task</div>
      {showAdd ? (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Task title</div>
              <input autoFocus style={inp} placeholder="Task title" value={tf.title}
                onChange={e => setTf({ ...tf, title: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAddTask()} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Est. hours</div>
              <input type="number" min={0} step={0.25} style={inp} value={tf.hours}
                onChange={e => setTf({ ...tf, hours: e.target.value })}
                onBlur={e => { const v = parseFloat(e.target.value); setTf(f => ({ ...f, hours: !isNaN(v) && v > 0 ? String(v) : "1" })); }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Priority</div>
              <div style={{ display: "flex", gap: 6 }}>
                {PRIO.map(pp => (
                  <button key={pp.l} onClick={() => setTf(f => ({ ...f, priority: pp.l }))}
                    style={{ flex: 1, fontSize: 11, fontWeight: 500, padding: "5px 0", borderRadius: 6, cursor: "pointer",
                      background: tf.priority === pp.l ? pp.bg : "transparent",
                      color:      tf.priority === pp.l ? pp.c  : C.dim,
                      border:     `1px solid ${tf.priority === pp.l ? pp.c : C.bdr2}` }}>
                    {pp.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={btnP} onClick={handleAddTask}>Add</button>
              <button style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ ...btn, fontSize: 12, borderStyle: "dashed", color: C.dim, marginBottom: addedTasks.length > 0 ? 8 : 0 }}>
          + Add task to this chapter
        </button>
      )}
      {addedTasks.map(t => {
        const pp = PRIO.find(x => x.l === t.priority) || PRIO[1];
        return (
          <div key={t._id} style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${C.bdr2}`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{t.title}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <span style={{ background: pp.bg, color: pp.c, fontSize: 11, padding: "1px 8px", borderRadius: 99 }}>{t.priority}</span>
                <span style={{ fontSize: 11, color: C.dim }}>{t.hours}h est.</span>
                <span style={{ fontSize: 11, color: C.grnL }}>✓ Added</span>
              </div>
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
      ← Back to tasks
    </button>
  );

  // ── Phone landscape: timer left (65%), sidebar right ────────
  if (isPhoneLand) {
    return (
      <div style={{ display: "flex", gap: 14, height: "100vh", boxSizing: "border-box", alignItems: "stretch", margin: "-1.25rem", padding: "10px 14px" }}>
        {/* Left: timer only, vertically centred */}
        <div style={{ flex: "0 0 62%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {timerBlock}
        </div>
        {/* Right: exit + controls + task info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, overflowY: "auto" }}>
          {exitBtn}
          {controls}
          {taskInfo}
        </div>
      </div>
    );
  }

  // ── Tablet/iPad landscape: big timer top-center, 2-col below ─
  if (isTabletLand) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {exitBtn}
        <div style={{ margin: "24px 0 28px" }}>
          {timerBlock}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {taskInfo}
            {controls}
          </div>
          <div>
            {quickAdd}
          </div>
        </div>
      </div>
    );
  }

  // ── Portrait / desktop: single-column layout ─────────────────
  return (
    <div style={{ padding: "0.5rem 0" }}>
      {exitBtn}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        {taskInfo}
      </div>
      <div style={{ marginBottom: 28 }}>
        {timerBlock}
      </div>
      <div style={{ marginBottom: 28 }}>
        {controls}
      </div>
      {quickAdd}
    </div>
  );
}
