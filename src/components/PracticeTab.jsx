import { useState, useRef, useEffect } from "react";
import { C, styles } from "../constants";
import CustomSelect from "./shared/CustomSelect";
import ConfirmDialog from "./shared/ConfirmDialog";

const { inp, btn, btnP } = styles;
const CHOICES = ["A", "B", "C", "D", "E"];

const TIMER_OPTIONS = [
  { label: "15 min", minutes: 15  },
  { label: "30 min", minutes: 30  },
  { label: "45 min", minutes: 45  },
  { label: "1 hr",   minutes: 60  },
  { label: "2 hr",   minutes: 120 },
  { label: "3 hr",   minutes: 180 },
];

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
const MissedCard = ({ qNum, d, topics, onToggleOpen, onSetDetail, onLog, onRemove }) => (
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
        <span style={{ fontSize: 13, fontWeight: 600, color: d.logged ? C.mut : C.redL }}>Q{qNum}</span>
        {d.flagged && <span style={{ fontSize: 11, color: C.redL }}>⚑ flagged</span>}
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

export default function PracticeTab({ examId, chapters, sessions = [], mistakes = [], onAddMistake, onAddSession, onDeleteSession, onModeChange }) {
  const topics = chapters.filter(c => c.examId === examId).map(c => c.name);
  const today  = new Date().toISOString().slice(0, 10);

  const [cfg, setCfg]         = useState({ name: "", type: "exam", topic: topics[0] || "", count: "30", startFrom: "1", timerMode: "untimed", timerDuration: 30 });
  const [mode, setMode]       = useState("setup");
  const [grid, setGrid]       = useState([]);
  const [timer, setTimer]     = useState(0);
  const [paused, setPaused]   = useState(false);
  const [marks, setMarks]     = useState({});
  const [details, setDetails] = useState({});
  const [showHistory, setShowHistory]     = useState(false);
  const [expandedId, setExpandedId]       = useState(null);
  const [historyLog, setHistoryLog]       = useState(null);
  const [summaryData, setSummaryData]     = useState(null);
  const [confirm, setConfirm]             = useState(null);
  const [editingName, setEditingName]     = useState(false);
  const [winWidth,  setWinWidth]  = useState(() => window.innerWidth);
  const [winHeight, setWinHeight] = useState(() => window.innerHeight);
  const timerRef    = useRef(null);
  const sessionIdRef = useRef(null);

  // ── Keyboard / time-tracking refs ─────────────────────────────
  const [activeQ, setActiveQ]             = useState(null);
  const [keyBufDisplay, setKeyBufDisplay] = useState("");
  const activeQRef    = useRef(null);
  const pausedRef     = useRef(false);
  const keyBufRef     = useRef("");
  const bufTimerRef   = useRef(null);
  const qTimesRef     = useRef([]);
  const qTimeStartRef = useRef(null);
  const sessionCfgRef = useRef({ startFromNum: 1, gridLen: 0 });

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    const handler = () => { setWinWidth(window.innerWidth); setWinHeight(window.innerHeight); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (mode === "done" || mode === "summary") window.scrollTo(0, 0);
  }, [mode]);

  const changeActiveQ = (newIdx) => {
    if (activeQRef.current !== null && qTimeStartRef.current !== null) {
      qTimesRef.current[activeQRef.current] = (qTimesRef.current[activeQRef.current] || 0) + (Date.now() - qTimeStartRef.current);
    }
    activeQRef.current = newIdx;
    qTimeStartRef.current = (newIdx !== null && !pausedRef.current) ? Date.now() : null;
    setActiveQ(newIdx);
  };

  const startFromNum  = Math.max(1, parseInt(cfg.startFrom) || 1);
  const timerLimit    = cfg.timerMode === "timed" ? cfg.timerDuration * 60 : null;
  const timeDisplay   = timerLimit != null ? Math.max(0, timerLimit - timer) : timer;
  const timerWarning  = timerLimit != null && timeDisplay < 300;
  const timerCritical = timerLimit != null && timeDisplay < 60;

  // Auto-finish when countdown hits 0
  useEffect(() => {
    if (mode === "active" && timerLimit != null && timer >= timerLimit) finish();
  }, [timer]); // eslint-disable-line react-hooks/exhaustive-deps

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
    pausedRef.current = false;
    // Reset keyboard / time-tracking state
    clearTimeout(bufTimerRef.current);
    keyBufRef.current = "";
    setKeyBufDisplay("");
    qTimesRef.current = Array.from({ length: n }, () => 0);
    qTimeStartRef.current = null;
    activeQRef.current = null;
    setActiveQ(null);
    sessionCfgRef.current = { startFromNum: Math.max(1, parseInt(cfg.startFrom) || 1), gridLen: n };
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    setMode("active");
    onModeChange?.(true);
  };

  const togglePause = () => {
    if (paused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      setPaused(false);
      pausedRef.current = false;
      if (activeQRef.current !== null) qTimeStartRef.current = Date.now();
    } else {
      if (activeQRef.current !== null && qTimeStartRef.current !== null) {
        qTimesRef.current[activeQRef.current] = (qTimesRef.current[activeQRef.current] || 0) + (Date.now() - qTimeStartRef.current);
        qTimeStartRef.current = null;
      }
      clearInterval(timerRef.current);
      setPaused(true);
      pausedRef.current = true;
    }
  };

  const finish = () => {
    clearInterval(timerRef.current);
    // Stop timing current active question
    if (activeQRef.current !== null && qTimeStartRef.current !== null) {
      qTimesRef.current[activeQRef.current] = (qTimesRef.current[activeQRef.current] || 0) + (Date.now() - qTimeStartRef.current);
      qTimeStartRef.current = null;
    }
    activeQRef.current = null;
    setActiveQ(null);
    clearTimeout(bufTimerRef.current);
    keyBufRef.current = "";
    setKeyBufDisplay("");
    const init = {};
    grid.forEach((q, i) => {
      if (q.flagged) {
        init[i] = { topic: cfg.type === "topic" ? cfg.topic : (topics[0] || "General"), description: "", flagged: true, open: false, logged: false };
      }
    });
    setDetails(init);
    setMode("done");
    // keep fullscreen during done/grading
  };

  const reset = () => {
    clearInterval(timerRef.current);
    clearTimeout(bufTimerRef.current);
    keyBufRef.current = "";
    setKeyBufDisplay("");
    activeQRef.current = null;
    setActiveQ(null);
    qTimesRef.current = [];
    qTimeStartRef.current = null;
    pausedRef.current = false;
    setGrid([]);
    setMarks({});
    setDetails({});
    setPaused(false);
    setSummaryData(null);
    setEditingName(false);
    setCfg(c => ({ ...c, name: "", startFrom: "1" }));
    setMode("setup");
    onModeChange?.(false);
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
      return prev;
    });
  };

  const logMistake = (i) => {
    const d = details[i];
    const sessionName = cfg.name.trim() || `Practice - ${today}`;
    const qDisp = startFromNum + i;
    onAddMistake({
      examId,
      topic:        d.topic,
      description:  d.description.trim() || `Q${qDisp} missed in practice session`,
      source:       `Q${qDisp} · ${sessionName}`,
      date:         today,
      sessionId:    sessionIdRef.current,
      questionIdx:  i,
    });
    setDetails(prev => ({ ...prev, [i]: { ...prev[i], logged: true, open: false } }));
  };

  const setDetail = (i, field, val) =>
    setDetails(prev => ({ ...prev, [i]: { ...prev[i], [field]: val } }));

  const saveAndFinish = () => {
    const correctCount  = Object.values(marks).filter(v => v === true).length;
    const wrongCount    = Object.values(marks).filter(v => v === false).length;
    const score         = grid.length ? Math.round(correctCount / grid.length * 100) : 0;
    const sessionName   = cfg.name.trim() || `${cfg.type === "topic" ? cfg.topic : "Exam"} - ${today}`;
    const gridWithMarks = grid.map((q, i) => ({ ...q, correct: marks[i] ?? null }));

    // ── Time stats (keyboard-tracked questions only) ──────────────
    const qTimeSec = qTimesRef.current.map(ms => ms / 1000);
    const timedQs  = qTimeSec.filter(t => t > 0);
    const avgOf    = arr => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t, 0) / arr.length) : null;
    let timeStats  = null;
    if (timedQs.length > 0) {
      const byConf   = { confident: [], unsure: [], none: [] };
      const byResult = { correct: [], wrong: [] };
      gridWithMarks.forEach((q, i) => {
        const t = qTimeSec[i]; if (!t) return;
        byConf[q.confidence === 1 ? "confident" : q.confidence === 2 ? "unsure" : "none"].push(t);
        if (q.correct === true)  byResult.correct.push(t);
        if (q.correct === false) byResult.wrong.push(t);
      });
      timeStats = {
        overall:   Math.round(timedQs.reduce((s, t) => s + t, 0) / timedQs.length),
        confident: avgOf(byConf.confident),
        unsure:    avgOf(byConf.unsure),
        correct:   avgOf(byResult.correct),
        wrong:     avgOf(byResult.wrong),
        count:     timedQs.length,
      };
    }

    const summary = {
      name:          sessionName,
      date:          today,
      duration:      timer,
      questionCount: grid.length,
      correct:       correctCount,
      wrong:         wrongCount,
      skipped:       grid.length - correctCount - wrongCount,
      score,
      flagged:       grid.filter(q => q.flagged).length,
      logged:        Object.values(details).filter(d => d.logged).length,
      timeStats,
    };

    onAddSession({
      id:            sessionIdRef.current || crypto.randomUUID(),
      examId,
      name:          sessionName,
      type:          cfg.type,
      topic:         cfg.topic,
      date:          today,
      duration:      timer,
      questionCount: grid.length,
      startFrom:     startFromNum,
      correct:       correctCount,
      wrong:         wrongCount,
      skipped:       grid.length - correctCount - wrongCount,
      score,
      grid:          gridWithMarks,
      qTimes:        qTimesRef.current.slice(),
    });

    setSummaryData(summary);
    clearInterval(timerRef.current);
    setGrid([]);
    setMarks({});
    setDetails({});
    setPaused(false);
    setEditingName(false);
    setMode("summary");
  };

  // Check readiness before save & finish
  const handleSaveAndFinish = () => {
    const totalMarked   = Object.values(marks).filter(v => v !== null).length;
    const unloggedCount = Object.values(details).filter(d => !d.logged).length;
    const unmarkedCount = grid.length - totalMarked;

    const issues = [];
    if (unmarkedCount > 0) issues.push(`${unmarkedCount} question${unmarkedCount > 1 ? "s" : ""} not yet graded`);
    if (unloggedCount > 0) issues.push(`${unloggedCount} mistake${unloggedCount > 1 ? "s" : ""} not yet logged`);

    if (issues.length > 0) {
      setConfirm({
        title: "Save anyway?",
        message: `${issues.join(" and ")}. You can still save, but you may want to finish first.`,
        onConfirm: () => { setConfirm(null); saveAndFinish(); },
      });
    } else {
      saveAndFinish();
    }
  };

  // ── History helpers ────────────────────────────────────────────
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

  // ── Keyboard shortcuts (active session only) ───────────────────
  useEffect(() => {
    if (mode !== "active") return;

    const flushBuf = () => {
      clearTimeout(bufTimerRef.current);
      keyBufRef.current = "";
      setKeyBufDisplay("");
    };

    const resolveTarget = () => {
      if (!keyBufRef.current) return activeQRef.current;
      const dispNum = parseInt(keyBufRef.current);
      const idx     = dispNum - sessionCfgRef.current.startFromNum;
      flushBuf();
      if (idx >= 0 && idx < sessionCfgRef.current.gridLen) {
        changeActiveQ(idx);
        document.getElementById(`q-row-${idx}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        return idx;
      }
      return activeQRef.current;
    };

    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;

      // ── Shift+1-5 → A-E (e.g. ! = A, @ = B, # = C, $ = D, % = E) ──
      const SHIFT_NUM = { "!": "A", "@": "B", "#": "C", "$": "D", "%": "E" };
      if (SHIFT_NUM[key]) {
        e.preventDefault(); e.stopImmediatePropagation();
        const ch2 = SHIFT_NUM[key];
        const targetQ = resolveTarget();
        if (targetQ !== null) {
          setGrid(g => {
            const n = [...g]; const q = n[targetQ];
            if (q.choice === ch2) {
              n[targetQ] = q.confidence === 2
                ? { ...q, choice: null, confidence: 0 }
                : { ...q, confidence: 2 };
            } else {
              n[targetQ] = { ...q, choice: ch2, confidence: 1 };
            }
            return n;
          });
        }
        return;
      }

      // ── Digits: build question number ──
      if (key >= "0" && key <= "9") {
        e.preventDefault(); e.stopImmediatePropagation();
        keyBufRef.current += key;
        setKeyBufDisplay(keyBufRef.current);
        clearTimeout(bufTimerRef.current);
        const dispNum = parseInt(keyBufRef.current);
        const idx     = dispNum - sessionCfgRef.current.startFromNum;
        if (idx >= 0 && idx < sessionCfgRef.current.gridLen) {
          changeActiveQ(idx);
          document.getElementById(`q-row-${idx}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        bufTimerRef.current = setTimeout(flushBuf, 1500);
        return;
      }

      // ── A–E: cycle choice/confidence (same letter: green→yellow→clear) ──
      const ch = key.toUpperCase();
      if (["A","B","C","D","E"].includes(ch)) {
        e.preventDefault(); e.stopImmediatePropagation();
        const targetQ = resolveTarget();
        if (targetQ !== null) {
          setGrid(g => {
            const n = [...g]; const q = n[targetQ];
            if (q.choice === ch) {
              n[targetQ] = q.confidence === 2
                ? { ...q, choice: null, confidence: 0 }
                : { ...q, confidence: 2 };
            } else {
              n[targetQ] = { ...q, choice: ch, confidence: 1 };
            }
            return n;
          });
        }
        return;
      }

      // ── F: flag/unflag ──
      if (ch === "F") {
        e.preventDefault(); e.stopImmediatePropagation();
        const targetQ = resolveTarget();
        if (targetQ !== null)
          setGrid(g => { const n = [...g]; n[targetQ] = { ...n[targetQ], flagged: !n[targetQ].flagged }; return n; });
        return;
      }

      // ── Enter: advance to next question ──
      if (key === "Enter") {
        e.preventDefault(); e.stopImmediatePropagation();
        const cur = activeQRef.current;
        if (cur !== null && cur + 1 < sessionCfgRef.current.gridLen) {
          changeActiveQ(cur + 1);
          document.getElementById(`q-row-${cur + 1}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return;
      }

      // ── P: toggle pause/resume ──
      if (key === "p" || key === "P") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!pausedRef.current) {
          if (activeQRef.current !== null && qTimeStartRef.current !== null) {
            qTimesRef.current[activeQRef.current] = (qTimesRef.current[activeQRef.current] || 0) + (Date.now() - qTimeStartRef.current);
            qTimeStartRef.current = null;
          }
          clearInterval(timerRef.current);
          setPaused(true);
          pausedRef.current = true;
        } else {
          timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
          setPaused(false);
          pausedRef.current = false;
          if (activeQRef.current !== null) qTimeStartRef.current = Date.now();
        }
        return;
      }

      // ── Escape: clear buffer + deselect ──
      if (key === "Escape") { e.stopImmediatePropagation(); flushBuf(); changeActiveQ(null); }
    };

    document.addEventListener("keydown", handleKey, true);
    return () => { document.removeEventListener("keydown", handleKey, true); clearTimeout(bufTimerRef.current); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────
  const confidentCount = grid.filter(q => q.confidence === 1).length;
  const unsureCount    = grid.filter(q => q.confidence === 2).length;
  const flaggedCount   = grid.filter(q => q.flagged).length;
  const answeredCount  = grid.filter(q => q.choice !== null).length;
  const markedCorrect  = Object.values(marks).filter(v => v === true).length;
  const markedWrong    = Object.values(marks).filter(v => v === false).length;
  const loggableIdxs   = Object.keys(details).map(Number).sort((a, b) => a - b);
  const compactStats   = winWidth < 500;

  // ── Setup ──────────────────────────────────────────────────────
  if (mode === "setup") return (
    <div style={{ padding: "1rem 0" }}>
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
        overflow: "hidden", marginBottom: 14,
      }}>
        {/* Card header */}
        <div style={{ padding: "16px 18px 0", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>New session</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Configure and start a practice round</div>
        </div>

        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Session name — full width */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Session name</div>
            <input style={inp} placeholder="e.g. Mock exam 3  (optional)" value={cfg.name}
              onChange={e => setCfg({ ...cfg, name: e.target.value })} />
          </div>

          {/* Questions + Starting # — equal halves */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Questions</div>
              <input type="number" style={inp} value={cfg.count}
                onChange={e => setCfg({ ...cfg, count: e.target.value })}
                onBlur={() => {
                  const n = Math.min(100, Math.max(1, parseInt(cfg.count) || 30));
                  setCfg(c => ({ ...c, count: String(n) }));
                }}
              />
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>max 100</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Starting #</div>
              <input type="number" style={inp} value={cfg.startFrom}
                onChange={e => setCfg({ ...cfg, startFrom: e.target.value })}
                onBlur={() => {
                  const n = Math.max(1, parseInt(cfg.startFrom) || 1);
                  setCfg(c => ({ ...c, startFrom: String(n) }));
                }}
              />
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>first Q number</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.bdr }} />

          {/* Session type */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["exam", "Full exam"], ["topic", "By topic"]].map(([val, label]) => {
                const sel = cfg.type === val;
                return (
                  <button key={val} onClick={() => setCfg({ ...cfg, type: val })}
                    style={{
                      padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: sel ? 600 : 400,
                      background: sel ? C.blueBg : C.sur2,
                      color:      sel ? C.blueL  : C.mut,
                      border:     `1px solid ${sel ? C.blueBd : C.bdr2}`,
                      cursor: "pointer",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic picker (conditional) */}
          {cfg.type === "topic" && topics.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Topic</div>
              <CustomSelect value={cfg.topic} options={topics} onChange={v => setCfg({ ...cfg, topic: v })} />
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: C.bdr }} />

          {/* Timer */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.mut, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Timer</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: cfg.timerMode === "timed" ? 12 : 0 }}>
              {[["untimed", "Untimed", C.blueBg, C.blueL, C.blueBd], ["timed", "Timed", C.ambBg, C.ambL, C.amb]].map(([val, label, sbg, sc, sbd]) => {
                const sel = cfg.timerMode === val;
                return (
                  <button key={val} onClick={() => setCfg({ ...cfg, timerMode: val })}
                    style={{
                      padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: sel ? 600 : 400,
                      background: sel ? sbg  : C.sur2,
                      color:      sel ? sc   : C.mut,
                      border:     `1px solid ${sel ? sbd : C.bdr2}`,
                      cursor: "pointer",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {cfg.timerMode === "timed" && (
              <div style={{ display: "grid", gridTemplateColumns: winWidth > winHeight ? "repeat(6, 1fr)" : "repeat(3, 1fr)", gap: 8 }}>
                {TIMER_OPTIONS.map(({ label, minutes }) => {
                  const sel = cfg.timerDuration === minutes;
                  return (
                    <button key={minutes} onClick={() => setCfg({ ...cfg, timerDuration: minutes })}
                      style={{
                        padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: sel ? 600 : 400,
                        background: sel ? C.ambBg : C.sur2,
                        color:      sel ? C.ambL  : C.mut,
                        border:     `1px solid ${sel ? C.amb : C.bdr2}`,
                        cursor: "pointer",
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start button */}
          <button
            onClick={startSession}
            style={{
              width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700,
              background: C.grnBg, border: `1px solid ${C.grn}`, color: C.grnL,
              borderRadius: 10, cursor: "pointer", letterSpacing: "0.02em",
            }}
          >
            Start session
          </button>
        </div>
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

  // ── Active session ─────────────────────────────────────────────
  if (mode === "active") {
    const isActiveLand = winWidth > winHeight && winWidth >= 500;
    const leftW = winHeight < 500 ? 190 : winHeight < 700 ? 240 : 260;

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

    const colHeader = (
      <div style={{ display: "flex", alignItems: "center", gap: 5, paddingBottom: 4, marginBottom: 2, borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{ width: 32, flexShrink: 0 }} />
        <div style={{ width: 38, fontSize: 10, color: C.dim, textAlign: "center", flexShrink: 0 }}>Q#</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
            <button onClick={() => toggleFlag(i)}
              style={{ width: 32, height: 36, borderRadius: 6, fontSize: 13, flexShrink: 0,
                background: q.flagged ? C.redBg : "transparent",
                color:      q.flagged ? C.redL  : C.dim,
                border:     `1px solid ${q.flagged ? C.red : C.bdr2}`,
                cursor: "pointer" }}>
              ⚑
            </button>
            <div style={{ width: 38, height: 36, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
              background: isActive ? C.blue  : C.sur2,
              color:      isActive ? "#fff"  : q.choice ? C.txt : C.dim,
              border:     `1px solid ${isActive ? C.blue : C.bdr}`,
              boxShadow:  isActive ? `0 0 8px ${C.blue}88` : "none" }}>
              {startFromNum + i}
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
          padding: winHeight < 500 ? "8px 12px" : "12px 16px",
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
            <span style={{ fontSize: 9, fontWeight: 600, color: C.ambL, visibility: paused ? "visible" : "hidden", flexShrink: 0 }}>PAUSED</span>
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
        <div style={{ flex: 1, overflowY: "auto", padding: winHeight < 500 ? "8px 12px" : "10px 16px", opacity: paused ? 0.45 : 1, pointerEvents: paused ? "none" : "auto" }}>
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
            <span style={{ fontSize: 10, fontWeight: 600, color: C.ambL, visibility: paused ? "visible" : "hidden", flexShrink: 0 }}>PAUSED</span>
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

  // ── Review / done screen ───────────────────────────────────────
  if (mode === "done") {
    const reviewCols  = winWidth >= 900 ? 3 : winWidth >= 500 ? 2 : 1;
    const colSize     = Math.ceil(grid.length / reviewCols);
    const colQs       = Array.from({ length: reviewCols }, (_, ci) =>
      grid.slice(ci * colSize, (ci + 1) * colSize).map((q, j) => ({ q, i: ci * colSize + j }))
    );
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
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32, color: isCorrect ? C.grnL : isWrong ? C.redL : C.txt }}>
            Q{startFromNum + i}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, minWidth: 18, textAlign: "center",
            background: q.choice ? C.blueBg : C.sur2, color: q.choice ? C.blueL : C.dim }}>
            {q.choice || "—"}
          </span>
          {q.flagged && <span style={{ fontSize: 10, color: C.redL, flexShrink: 0 }}>⚑</span>}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => toggleLog(i)}
            title={inLog ? (isLogged ? "Already logged" : "Remove from log") : "Add to log"}
            style={{
              width: 28, height: 34, borderRadius: 6, fontSize: 14, fontWeight: 700,
              background: inLog  ? (isLogged ? C.grnBg : C.ambBg) : "transparent",
              color:      inLog  ? (isLogged ? C.grnL  : C.ambL)  : C.dim,
              border:     `1px solid ${inLog ? (isLogged ? C.grn : C.amb) : C.bdr2}`,
              cursor: isLogged ? "default" : "pointer", flexShrink: 0,
            }}
          >
            {inLog ? (isLogged ? "✓" : "•") : "+"}
          </button>
          <button onClick={() => markQ(i, true)}
            style={{ width: 40, height: 34, borderRadius: 6, fontSize: 16, fontWeight: 700,
              background: isCorrect ? C.grn  : C.sur2,
              color:      isCorrect ? C.grnL : C.dim,
              border:     `1px solid ${isCorrect ? C.grnL : C.bdr2}`,
              cursor: "pointer", flexShrink: 0 }}>✓</button>
          <button onClick={() => markQ(i, false)}
            style={{ width: 40, height: 34, borderRadius: 6, fontSize: 16, fontWeight: 700,
              background: isWrong ? C.red  : C.sur2,
              color:      isWrong ? C.redL : C.dim,
              border:     `1px solid ${isWrong ? C.redL : C.bdr2}`,
              cursor: "pointer", flexShrink: 0 }}>✗</button>
        </div>
      );
    };

    const renderCol = (qs) => qs.map(({ q, i }, idx) => (
      <div key={i}>
        {idx > 0 && idx % 5 === 0 && <div style={{ height: 16 }} />}
        {renderRow(q, i)}
      </div>
    ));

    const reviewGrid = (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${reviewCols}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {colQs.map((qs, ci) => <div key={ci}>{renderCol(qs)}</div>)}
      </div>
    );

    return (
      <div style={{ padding: "1rem 0" }}>
        <ConfirmDialog
          open={!!confirm}
          title={confirm?.title}
          message={confirm?.message}
          confirmLabel={confirm?.confirmLabel || "Confirm"}
          danger={confirm?.danger !== false}
          onConfirm={confirm?.onConfirm}
          onCancel={() => setConfirm(null)}
        />

        {/* ── Sticky stats header ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.bg, paddingBottom: 10, paddingTop: 6, borderBottom: `1px solid ${C.bdr}`, marginBottom: 14 }}>
          {/* Session name + timer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <input autoFocus style={{ ...inp, fontSize: 14, fontWeight: 500, padding: "3px 8px" }}
                  value={cfg.name} onChange={e => setCfg(c => ({ ...c, name: e.target.value }))}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }} />
              ) : (
                <span onClick={() => setEditingName(true)} title="Click to rename"
                  style={{ fontSize: 14, fontWeight: 500, color: C.txt, cursor: "text" }}>
                  {cfg.name.trim() || `${cfg.type === "topic" ? cfg.topic : "Exam"} - ${today}`}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.dim, flexShrink: 0, marginLeft: 12 }}>{fmt(timer)} · {totalMarked}/{grid.length}</div>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { n: markedCorrect,             label: "Correct",  bg: C.grnBg, bd: C.grn,  c: C.grnL },
              { n: markedWrong,               label: "Wrong",    bg: C.redBg, bd: C.red,  c: C.redL },
              { n: grid.length - totalMarked, label: "Unmarked", bg: C.sur2,  bd: C.bdr2, c: C.txt  },
              { n: `${score}%`,               label: "Score",
                bg: score >= 70 ? C.grnBg : score >= 50 ? C.ambBg : C.redBg,
                bd: score >= 70 ? C.grn   : score >= 50 ? C.amb   : C.red,
                c:  score >= 70 ? C.grnL  : score >= 50 ? C.ambL  : C.redL },
            ].map(({ n, label, bg, bd, c }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", flex: 1, minWidth: 60 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: c }}>{n}</div>
                <div style={{ fontSize: 10, color: C.mut, marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {reviewGrid}

        {loggableIdxs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 10 }}>Log mistakes</div>
            {loggableIdxs.map(i => details[i] && (
              <MissedCard
                key={i}
                qNum={startFromNum + i}
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

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={{ ...btn, color: C.redL, borderColor: C.red }}
            onClick={() => setConfirm({
              title: "Discard session?",
              message: "All grading and log entries will be lost.",
              confirmLabel: "Discard",
              danger: true,
              onConfirm: () => { setConfirm(null); reset(); },
            })}>
            Discard
          </button>
          <button style={btnP} onClick={handleSaveAndFinish}>Save & finish</button>
        </div>
      </div>
    );
  }

  // ── Summary screen ─────────────────────────────────────────────
  if (mode === "summary" && summaryData) {
    const d = summaryData;
    const scoreColor = d.score >= 70 ? C.grnL : d.score >= 50 ? C.ambL : C.redL;
    const scoreBg    = d.score >= 70 ? C.grnBg : d.score >= 50 ? C.ambBg : C.redBg;
    const scoreBd    = d.score >= 70 ? C.grn : d.score >= 50 ? C.amb : C.red;

    const statCards = [
      { label: "Correct",  value: d.correct,  bg: C.grnBg, bd: C.grn,  c: C.grnL },
      { label: "Wrong",    value: d.wrong,    bg: C.redBg, bd: C.red,  c: C.redL },
      { label: "Skipped",  value: d.skipped,  bg: C.sur2,  bd: C.bdr2, c: C.mut  },
      { label: "Score",    value: `${d.score}%`, bg: scoreBg, bd: scoreBd, c: scoreColor },
    ];

    return (
      <div style={{ padding: "1rem 0" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{d.date} · {fmt(d.duration)}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{d.name}</div>
          <div style={{
            display: "inline-block", fontSize: 42, fontWeight: 700,
            color: scoreColor, padding: "8px 0",
          }}>
            {d.score}%
          </div>
          <div style={{ fontSize: 12, color: C.mut }}>{d.questionCount} questions · {fmt(d.duration)}</div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {statCards.map(({ label, value, bg, bd, c }) => (
            <div key={label} style={{ flex: 1, minWidth: 72, background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{value}</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy bar */}
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.mut }}>Accuracy</span>
            <span style={{ fontSize: 12, color: scoreColor, fontWeight: 600 }}>{d.score}%</span>
          </div>
          <div style={{ height: 8, background: C.bdr, borderRadius: 4 }}>
            <div style={{ height: 8, width: `${d.score}%`, background: scoreColor, borderRadius: 4, transition: "width .4s" }} />
          </div>
        </div>

        {/* Additional info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Flagged</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: d.flagged > 0 ? C.redL : C.grnL }}>{d.flagged}</div>
          </div>
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Mistakes logged</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: d.logged > 0 ? C.ambL : C.grnL }}>{d.logged}</div>
          </div>
        </div>

        {/* Time per question stats */}
        {d.timeStats && (() => {
          const ts = d.timeStats;
          const fmtSec = (s) => s != null ? (s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`) : "—";
          const rows = [
            { label: "Overall avg",   value: ts.overall,    color: C.blueL,  bg: C.blueBg, bd: C.blueBd },
            { label: "Confident",     value: ts.confident,  color: C.grnL,   bg: C.grnBg,  bd: C.grn    },
            { label: "Unsure",        value: ts.unsure,     color: C.ambL,   bg: C.ambBg,  bd: C.amb    },
            { label: "Correct qs",   value: ts.correct,    color: C.grnL,   bg: C.grnBg,  bd: C.grn    },
            { label: "Wrong qs",     value: ts.wrong,      color: C.redL,   bg: C.redBg,  bd: C.red    },
          ].filter(r => r.value != null);
          return (
            <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 4 }}>Avg time per question</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>{ts.count} of {d.questionCount} questions tracked</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8 }}>
                {rows.map(({ label, value, color, bg, bd }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtSec(value)}</div>
                    <div style={{ fontSize: 10, color: C.mut, marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <button style={{ ...btnP, width: "100%", padding: "10px 0", fontSize: 14 }} onClick={reset}>
          Done
        </button>
      </div>
    );
  }
}
