import { useState, useRef, useEffect } from "react";
import { C, styles } from "../constants";

const { inp, btn, btnP } = styles;

export default function PracticeTab({ examId, chapters, onAddMistake }) {
  const topics = chapters.filter(c => c.examId === examId).map(c => c.name);

  // Session config — set before starting
  const [cfg, setCfg] = useState({ type: "full", topic: topics[0] || "", count: 30 });

  // mode: "setup" | "active" | "done"
  const [mode, setMode] = useState("setup");

  // grid holds status for each question: 0 = untouched, 1 = correct, 2 = wrong
  const [grid, setGrid] = useState([]);

  const [timer, setTimer]   = useState(0);
  const timerRef            = useRef(null);
  const today               = new Date().toISOString().slice(0, 10);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startSession = () => {
    const n = Math.max(1, parseInt(cfg.count) || 30);
    setGrid(Array(n).fill(0));
    setTimer(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    setMode("active");
  };

  const finish = () => {
    clearInterval(timerRef.current);
    // Auto-log each red question as a mistake entry
    grid.forEach((v, i) => {
      if (v === 2) {
        onAddMistake({
          examId,
          topic:       cfg.type === "topic" ? cfg.topic : "General",
          description: `Q${i + 1} missed in practice session`,
          source:      `Practice · ${today}`,
          date:        today,
        });
      }
    });
    setMode("done");
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setGrid([]);
    setMode("setup");
  };

  // Cycle question state: untouched → correct → wrong → untouched
  const cycleQ = (i) => setGrid(g => {
    const next = [...g];
    next[i] = (next[i] + 1) % 3;
    return next;
  });

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const correct = grid.filter(x => x === 1).length;
  const wrong   = grid.filter(x => x === 2).length;
  const skipped = grid.filter(x => x === 0).length;
  const score   = grid.length ? Math.round(correct / grid.length * 100) : 0;

  // Grid columns — square-ish layout based on question count
  const cols = Math.ceil(Math.sqrt(cfg.count));

  // ── Setup screen ──────────────────────────────────────────────
  if (mode === "setup") return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.txt, marginBottom: 16 }}>Set up practice session</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Session type</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setCfg({ ...cfg, type: "full" })}
              style={{ ...btn, flex: 1, background: cfg.type === "full" ? C.blueBg : "transparent", color: cfg.type === "full" ? C.blueL : C.mut, borderColor: cfg.type === "full" ? C.blueBd : C.bdr2 }}
            >
              Full exam
            </button>
            <button
              onClick={() => setCfg({ ...cfg, type: "topic" })}
              style={{ ...btn, flex: 1, background: cfg.type === "topic" ? C.blueBg : "transparent", color: cfg.type === "topic" ? C.blueL : C.mut, borderColor: cfg.type === "topic" ? C.blueBd : C.bdr2 }}
            >
              By topic
            </button>
          </div>
        </div>

        {/* Topic selector — only shown when "by topic" is selected */}
        {cfg.type === "topic" && topics.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Topic</div>
            <select style={inp} value={cfg.topic} onChange={e => setCfg({ ...cfg, topic: e.target.value })}>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 6 }}>Number of questions</div>
          <input
            type="number" min={1} max={120}
            style={inp}
            value={cfg.count}
            onChange={e => setCfg({ ...cfg, count: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>

        <button style={{ ...btnP, width: "100%", padding: "10px 0", fontSize: 14 }} onClick={startSession}>
          Start session
        </button>
      </div>
    </div>
  );

  // ── Active session ─────────────────────────────────────────────
  if (mode === "active") return (
    <div style={{ padding: "1rem 0" }}>
      {/* Header bar — session info + timer + controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: C.mut }}>
          {cfg.type === "topic" ? cfg.topic : "Full exam"} · {grid.length} questions
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 16, color: C.blueL }}>{fmt(timer)}</span>
          <button style={{ ...btnP, padding: "5px 14px" }} onClick={finish}>Finish</button>
          <button style={{ ...btn, padding: "5px 10px", color: C.redL, borderColor: C.redBg }} onClick={reset}>✕</button>
        </div>
      </div>

      {/* Live score counters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ background: C.grnBg, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: C.grnL }}>✓ {correct}</div>
        <div style={{ background: C.redBg, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: C.redL }}>✗ {wrong}</div>
        <div style={{ background: C.sur2,  borderRadius: 8, padding: "6px 14px", fontSize: 13, color: C.mut }}>— {skipped}</div>
      </div>

      {/* Question grid — each circle cycles through untouched / correct / wrong */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {grid.map((v, i) => {
          const bg  = v === 1 ? C.grn  : v === 2 ? C.red  : C.sur2;
          const col = v === 1 ? C.grnL : v === 2 ? C.redL : C.mut;
          const bd  = v === 1 ? C.grnL : v === 2 ? C.redL : C.bdr2;
          return (
            <button
              key={i}
              onClick={() => cycleQ(i)}
              style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 8, color: col, fontSize: 13, fontWeight: 500, padding: "10px 4px", cursor: "pointer", transition: "all .1s" }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: C.dim, textAlign: "center" }}>
        Click once = correct · twice = mistake · three times = reset
      </div>
    </div>
  );

  // ── Results screen ─────────────────────────────────────────────
  if (mode === "done") return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: C.txt, marginBottom: 20 }}>Session complete</div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: C.grnBg, border: `1px solid ${C.grn}`, borderRadius: 10, padding: "16px 24px" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: C.grnL }}>{correct}</div>
            <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Correct</div>
          </div>
          <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: "16px 24px" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: C.redL }}>{wrong}</div>
            <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Mistakes</div>
          </div>
          <div style={{ background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 10, padding: "16px 24px" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: C.mut }}>{skipped}</div>
            <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Skipped</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: C.mut, marginBottom: 4 }}>Time: {fmt(timer)}</div>
        <div style={{ fontSize: 13, color: C.mut, marginBottom: 4 }}>Score: {score}%</div>

        {wrong > 0 && (
          <div style={{ fontSize: 12, color: C.ambL, marginTop: 8, marginBottom: 4 }}>
            {wrong} mistake{wrong !== 1 ? "s" : ""} auto-logged to the Mistakes tab.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button style={btnP} onClick={() => setMode("setup")}>New session</button>
          <button style={btn} onClick={reset}>Back</button>
        </div>
      </div>
    </div>
  );
}