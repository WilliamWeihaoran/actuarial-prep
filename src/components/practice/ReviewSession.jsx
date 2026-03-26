import { C, styles } from "../../constants";
import CustomSelect from "../shared/CustomSelect";
import ConfirmDialog from "../shared/ConfirmDialog";

const { inp, btn, btnP } = styles;

const fmt = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
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

export default function ReviewSession({
  cfg, setCfg,
  grid,
  timer,
  marks, markQ,
  details, setDetails,
  loggableIdxs,
  startFromNum,
  today,
  topics,
  winWidth,
  confirm, setConfirm,
  editingName, setEditingName,
  logMistake,
  setDetail,
  handleSaveAndFinish,
  reset,
}) {
  const reviewCols  = winWidth >= 900 ? 3 : winWidth >= 500 ? 2 : 1;
  const colSize     = Math.ceil(grid.length / reviewCols);
  const colQs       = Array.from({ length: reviewCols }, (_, ci) =>
    grid.slice(ci * colSize, (ci + 1) * colSize).map((q, j) => ({ q, i: ci * colSize + j }))
  );
  const markedCorrect  = Object.values(marks).filter(v => v === true).length;
  const markedWrong    = Object.values(marks).filter(v => v === false).length;
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
        {/* Q# — red border/text when flagged */}
        <div style={{ width: 36, height: 32, borderRadius: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600,
          background: C.sur2,
          color: isCorrect ? C.grnL : isWrong ? C.redL : q.flagged ? C.redL : C.txt,
          border: `1px solid ${q.flagged ? C.red : C.bdr}` }}>
          Q{startFromNum + i}
        </div>
        {/* Choice badge — green = confident, amber = unsure */}
        <div style={{ width: 30, height: 32, borderRadius: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
          background: q.choice ? (q.confidence === 1 ? C.grn : C.amb) : C.sur2,
          color:      q.choice ? (q.confidence === 1 ? C.grnL : C.ambL) : C.dim,
          border:     `1px solid ${q.choice ? (q.confidence === 1 ? C.grnL : C.ambL) : C.bdr2}` }}>
          {q.choice || "—"}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
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
          }}
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
