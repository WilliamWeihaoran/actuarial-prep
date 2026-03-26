import { useState, useRef, useEffect } from "react";
import { C, styles } from "../../constants";
import SessionSetup from "./SessionSetup";
import ActiveSession from "./ActiveSession";
import ReviewSession from "./ReviewSession";

const { btnP } = styles;
const defaultQ = () => ({ confidence: 0, choice: null, flagged: false });

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
      // auto-add to log when marked wrong
      setDetails(prev => prev[i] ? prev : {
        ...prev,
        [i]: { topic: cfg.type === "topic" ? cfg.topic : (topics[0] || "General"), description: "", flagged: grid[i]?.flagged || false, open: false, logged: false },
      });
    } else if (val === true) {
      // remove from log if not yet committed when marked correct
      setDetails(prev => {
        if (prev[i] && !prev[i].logged) {
          const next = { ...prev };
          delete next[i];
          return next;
        }
        return prev;
      });
    }
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
  const loggableIdxs   = Object.keys(details).map(Number).sort((a, b) => a - b);

  // ── Setup mode ─────────────────────────────────────────────────
  if (mode === "setup") return (
    <SessionSetup
      cfg={cfg}
      setCfg={setCfg}
      topics={topics}
      sessions={sessions}
      showHistory={showHistory}
      setShowHistory={setShowHistory}
      expandedId={expandedId}
      setExpandedId={setExpandedId}
      historyLog={historyLog}
      setHistoryLog={setHistoryLog}
      confirm={confirm}
      setConfirm={setConfirm}
      winWidth={winWidth}
      winHeight={winHeight}
      startSession={startSession}
      onDeleteSession={onDeleteSession}
      onAddMistake={onAddMistake}
      examId={examId}
      mistakes={mistakes}
    />
  );

  // ── Active session mode ────────────────────────────────────────
  if (mode === "active") return (
    <ActiveSession
      cfg={cfg}
      grid={grid}
      timer={timer}
      paused={paused}
      activeQ={activeQ}
      keyBufDisplay={keyBufDisplay}
      startFromNum={startFromNum}
      timerLimit={timerLimit}
      timeDisplay={timeDisplay}
      timerWarning={timerWarning}
      timerCritical={timerCritical}
      confidentCount={confidentCount}
      unsureCount={unsureCount}
      flaggedCount={flaggedCount}
      answeredCount={answeredCount}
      winWidth={winWidth}
      winHeight={winHeight}
      confirm={confirm}
      setConfirm={setConfirm}
      togglePause={togglePause}
      clickChoice={clickChoice}
      toggleFlag={toggleFlag}
      finish={finish}
      reset={reset}
    />
  );

  // ── Review / done screen ───────────────────────────────────────
  if (mode === "done") return (
    <ReviewSession
      cfg={cfg}
      setCfg={setCfg}
      grid={grid}
      timer={timer}
      marks={marks}
      markQ={markQ}
      details={details}
      setDetails={setDetails}
      loggableIdxs={loggableIdxs}
      startFromNum={startFromNum}
      today={today}
      topics={topics}
      winWidth={winWidth}
      confirm={confirm}
      setConfirm={setConfirm}
      editingName={editingName}
      setEditingName={setEditingName}
      logMistake={logMistake}
      setDetail={setDetail}
      handleSaveAndFinish={handleSaveAndFinish}
      reset={reset}
    />
  );

  // ── Summary screen ─────────────────────────────────────────────
  if (mode === "summary" && summaryData) {
    const d = summaryData;
    const scoreColor = d.score >= 70 ? C.grnL : d.score >= 50 ? C.ambL : C.redL;
    const scoreBg    = d.score >= 70 ? C.grnBg : d.score >= 50 ? C.ambBg : C.redBg;
    const scoreBd    = d.score >= 70 ? C.grn : d.score >= 50 ? C.amb : C.red;

    const fmt = (s) => {
      const h  = Math.floor(s / 3600);
      const m  = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    };

    const statCards = [
      { label: "Correct",  value: d.correct,  bg: C.grnBg, bd: C.grn,  c: C.grnL },
      { label: "Wrong",    value: d.wrong,    bg: C.redBg, bd: C.red,  c: C.redL },
      { label: "Skipped",  value: d.skipped,  bg: C.sur2,  bd: C.bdr2, c: C.mut  },
      { label: "Score",    value: `${d.score}%`, bg: scoreBg, bd: scoreBd, c: scoreColor },
    ];

    const isSumLand = winWidth > winHeight && winHeight < 500;
    const fmtSec = (s) => s != null ? (s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`) : "—";
    const timeRows = d.timeStats ? [
      { label: "Overall avg", value: d.timeStats.overall,   color: C.blueL, bg: C.blueBg, bd: C.blueBd },
      { label: "Confident",   value: d.timeStats.confident, color: C.grnL,  bg: C.grnBg,  bd: C.grn    },
      { label: "Unsure",      value: d.timeStats.unsure,    color: C.ambL,  bg: C.ambBg,  bd: C.amb    },
      { label: "Correct qs",  value: d.timeStats.correct,   color: C.grnL,  bg: C.grnBg,  bd: C.grn    },
      { label: "Wrong qs",    value: d.timeStats.wrong,     color: C.redL,  bg: C.redBg,  bd: C.red    },
    ].filter(r => r.value != null) : [];

    if (isSumLand) return (
      <div style={{ padding: "8px 0" }}>
        {/* Header + Done button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{d.date} · {fmt(d.duration)} · {d.questionCount}Q</div>
          </div>
          <button style={{ ...btnP, padding: "8px 20px", flexShrink: 0 }} onClick={reset}>Done</button>
        </div>

        {/* 4 stat cards in one row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
          {statCards.map(({ label, value, bg, bd, c }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{value}</div>
              <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy bar + Flagged + Mistakes in one row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginBottom: timeRows.length ? 10 : 0 }}>
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.mut }}>Accuracy</span>
              <span style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>{d.score}%</span>
            </div>
            <div style={{ height: 6, background: C.bdr, borderRadius: 3 }}>
              <div style={{ height: 6, width: `${d.score}%`, background: scoreColor, borderRadius: 3, transition: "width .4s" }} />
            </div>
          </div>
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "10px 14px", minWidth: 90 }}>
            <div style={{ fontSize: 10, color: C.mut, marginBottom: 4 }}>Flagged</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: d.flagged > 0 ? C.redL : C.grnL }}>{d.flagged}</div>
          </div>
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "10px 14px", minWidth: 110 }}>
            <div style={{ fontSize: 10, color: C.mut, marginBottom: 4 }}>Mistakes logged</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: d.logged > 0 ? C.ambL : C.grnL }}>{d.logged}</div>
          </div>
        </div>

        {/* Time stats — all in one row */}
        {timeRows.length > 0 && (
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Avg time / question · {d.timeStats.count} of {d.questionCount} tracked</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${timeRows.length}, 1fr)`, gap: 6 }}>
              {timeRows.map(({ label, value, color, bg, bd }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmtSec(value)}</div>
                  <div style={{ fontSize: 9, color: C.mut, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div style={{ padding: "1rem 0" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{d.date} · {fmt(d.duration)}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{d.name}</div>
          <div style={{ display: "inline-block", fontSize: 42, fontWeight: 700, color: scoreColor, padding: "8px 0" }}>
            {d.score}%
          </div>
          <div style={{ fontSize: 12, color: C.mut }}>{d.questionCount} questions · {fmt(d.duration)}</div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {statCards.map(({ label, value, bg, bd, c }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
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
        {timeRows.length > 0 && (
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 4 }}>Avg time per question</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>{d.timeStats.count} of {d.questionCount} questions tracked</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(timeRows.length, 3)}, 1fr)`, gap: 8 }}>
              {timeRows.map(({ label, value, color, bg, bd }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtSec(value)}</div>
                  <div style={{ fontSize: 10, color: C.mut, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button style={{ ...btnP, width: "100%", padding: "10px 0", fontSize: 14 }} onClick={reset}>
          Done
        </button>
      </div>
    );
  }
}
