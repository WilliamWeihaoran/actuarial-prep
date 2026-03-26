import { useRef, useEffect, useState } from "react";
import { C, styles, fmtRelDate } from "../../constants";

const { btn } = styles;

export default function MilestoneNav({
  visibleExams,
  examId,
  onSwitch,
  zoom,
  setZoom,
  onManage,
  saving,
  winW,
  winH,
  practiceFullscreen,
  // phone-landscape inline progress props
  examType,
  doneHours,
  targetHours,
  hourPct,
  doneTasks,
  eligibleTasks,
  taskPct,
  dueDate,
}) {
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const dotsMenuRef = useRef(null);

  useEffect(() => {
    if (!showDotsMenu) return;
    const h = (e) => { if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target)) setShowDotsMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotsMenu]);

  if (practiceFullscreen) return null;

  const isPhoneLand = winW > winH && winH < 500;

  if (isPhoneLand) return (
    <>
      {/* Phone landscape: single compact row — exam tabs + inline progress + controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 6 }}>
        {/* Exam buttons — scrollable */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {visibleExams.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSwitch(ex.id)}
              style={{
                flexShrink: 0, padding: "4px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer",
                fontWeight:  examId === ex.id ? 500 : 400,
                background:  examId === ex.id ? C.blueBg : "transparent",
                color:       examId === ex.id ? C.blueL  : C.mut,
                border:      examId === ex.id ? `1px solid ${C.blueBd}` : "1px solid transparent",
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>
        {/* Inline compact progress */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          {examType === "project" ? (
            <span style={{ fontSize: 12, color: C.mut, whiteSpace: "nowrap" }}>
              <strong style={{ color: C.txt }}>{doneTasks.length}</strong>/{eligibleTasks.length} tasks
            </span>
          ) : (
            <span style={{ fontSize: 12, color: C.mut, whiteSpace: "nowrap" }}>
              <strong style={{ color: C.txt }}>{doneHours}</strong>/{targetHours}h
            </span>
          )}
          <div style={{ width: 56, height: 6, background: C.bdr, borderRadius: 3, flexShrink: 0 }}>
            <div style={{ height: 6, width: `${examType === "project" ? taskPct : hourPct}%`, background: (examType === "project" ? taskPct : hourPct) >= 80 ? C.grn : C.blue, borderRadius: 3, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: (examType === "project" ? taskPct : hourPct) >= 80 ? C.grnL : C.txt, whiteSpace: "nowrap" }}>{examType === "project" ? taskPct : hourPct}%</span>
          {dueDate && <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap" }}>· {fmtRelDate(dueDate)}</span>}
        </div>
        {/* Controls */}
        {saving && <span style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>Saving…</span>}
        <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 12, padding: "3px 8px", flexShrink: 0 }}>A−</button>
        <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 12, padding: "3px 8px", flexShrink: 0 }}>A+</button>
        <button onClick={() => onManage(v => !v)} style={{ ...btn, fontSize: 12, padding: "4px 12px", flexShrink: 0 }}>Edit</button>
      </div>
    </>
  );

  return (
    <>
      {/* Default: exam nav row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 10, flexWrap: "wrap" }}>
        {visibleExams.map(ex => (
          <button
            key={ex.id}
            onClick={() => onSwitch(ex.id)}
            style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
              fontWeight:  examId === ex.id ? 500 : 400,
              background:  examId === ex.id ? C.blueBg : "transparent",
              color:       examId === ex.id ? C.blueL  : C.mut,
              border:      examId === ex.id ? `1px solid ${C.blueBd}` : "1px solid transparent",
            }}
          >
            {ex.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 11, color: C.dim }}>Saving...</span>}
        {winW < 500 ? (
          <div ref={dotsMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDotsMenu(v => !v)}
              style={{ ...btn, fontSize: 16, padding: "2px 10px", letterSpacing: 1 }}
            >···</button>
            {showDotsMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 300,
                background: C.sur2, border: `1px solid ${C.bdr2}`, borderRadius: 10,
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)", overflow: "hidden", minWidth: 160,
              }}>
                <button onMouseDown={() => { setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10)); }}
                  style={{ ...btn, width: "100%", textAlign: "left", borderRadius: 0, border: "none", borderBottom: `1px solid ${C.bdr}`, padding: "10px 14px", fontSize: 13 }}>
                  A− &nbsp;<span style={{ color: C.dim, fontSize: 11 }}>Decrease text size</span>
                </button>
                <button onMouseDown={() => { setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 10) / 10)); }}
                  style={{ ...btn, width: "100%", textAlign: "left", borderRadius: 0, border: "none", borderBottom: `1px solid ${C.bdr}`, padding: "10px 14px", fontSize: 13 }}>
                  A+ &nbsp;<span style={{ color: C.dim, fontSize: 11 }}>Increase text size</span>
                </button>
                <button onMouseDown={() => { onManage(v => !v); setShowDotsMenu(false); }}
                  style={{ ...btn, width: "100%", textAlign: "left", borderRadius: 0, border: "none", padding: "10px 14px", fontSize: 13 }}>
                  Edit milestones
                </button>
              </div>
            )}
          </div>
        ) : (<>
          <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A−</button>
          <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A+</button>
          <button onClick={() => onManage(v => !v)} style={{ ...btn, fontSize: 12, padding: "4px 12px" }}>
            Edit milestones
          </button>
        </>)}
      </div>
    </>
  );
}
