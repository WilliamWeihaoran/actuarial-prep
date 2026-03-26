import { useState, useEffect, useRef } from "react";
import { useData } from "./hooks/useData";
import { C, styles, fmtRelDate } from "./constants";
import ManageExams   from "./components/ManageExams";
import FocusMode     from "./components/FocusMode";
import TasksTab      from "./components/TasksTab";
import TopicsTab     from "./components/TopicsTab";
import MistakesTab   from "./components/MistakesTab";
import PracticeTab   from "./components/PracticeTab";
import AnalyticsTab  from "./components/AnalyticsTab";

const { btn, btnP } = styles;
const EXAM_TABS    = ["Tasks", "Topics", "Mistakes", "Practice", "Analytics"];
const PROJECT_TABS = ["Tasks", "Topics", "Analytics"];

export default function App() {
  const { data, update, loading, saving, loadError, saveError } = useData();
  const [activeExamId, setActiveExamId]       = useState(null);
  const [subTab, setSubTab]                   = useState("Tasks");
  const [showManage, setShowManage]           = useState(false);
  const [focusTask, setFocusTask]             = useState(null);
  const [practiceFullscreen, setPracticeFullscreen] = useState(false);
  const [zoom, setZoom] = useState(() => parseFloat(localStorage.getItem("appZoom") || "1.3"));
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const dotsMenuRef = useRef(null);
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [winH, setWinH] = useState(() => window.innerHeight);

  // ── Derived state ──────────────────────────────────────────────
  const visibleExams = data.exams.filter(e => !e.archived);

  // Default to first exam once data loads
  const examId = activeExamId ?? visibleExams[0]?.id ?? null;
  const exam   = data.exams.find(e => e.id === examId);

  const examType     = exam?.type ?? "exam";
  const visibleTabs  = examType === "project" ? PROJECT_TABS : EXAM_TABS;

  const examChapters = data.chapters.filter(c => c.examId === examId);
  const examTasks    = data.tasks.filter(t => t.examId === examId);

  const practiceHours = (data.sessions || [])
    .filter(s => s.examId === examId)
    .reduce((sum, s) => sum + (s.duration || 0) / 3600, 0);
  // Done tasks: use actual or estimated hours.
  // Active tasks with logged focus time: count their actualHours too (time already spent).
  const doneHours  = Math.round((
    examTasks.reduce((sum, t) => {
      if (t.status === "Cancelled") return sum;
      if (t.status === "Done") return sum + (t.actualHours || t.hours);
      return sum + (t.actualHours || 0);
    }, 0) + practiceHours
  ) * 10) / 10;
  const targetHours = exam?.targetHours || 100;
  const hourPct    = Math.min(100, Math.round(doneHours / targetHours * 100));

  // Project: progress = tasks done / total eligible (non-cancelled)
  const eligibleTasks = examTasks.filter(t => t.status !== "Cancelled");
  const doneTasks     = eligibleTasks.filter(t => t.status === "Done");
  const taskPct       = eligibleTasks.length > 0 ? Math.round(doneTasks.length / eligibleTasks.length * 100) : 0;

  // ── Exam actions ───────────────────────────────────────────────
  const saveExams = (updated) => {
    update(d => ({ ...d, exams: updated }));
    // If active exam was archived or deleted, fall back to first visible
    if (!updated.find(e => e.id === examId && !e.archived)) {
      setActiveExamId(updated.find(e => !e.archived)?.id ?? null);
    }
    setShowManage(false);
  };

  const switchExam = (id) => { setActiveExamId(id); setSubTab("Tasks"); setShowManage(false); };

  // If current subTab is not available for this milestone type, reset to Tasks
  useEffect(() => {
    if (!visibleTabs.includes(subTab)) setSubTab("Tasks");
  }, [examType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chapter actions ────────────────────────────────────────────
  const addChapter = (chap) =>
    update(d => ({ ...d, chapters: [...d.chapters, { ...chap, id: crypto.randomUUID(), done: false }] }));

  const editChapter = (id, updates) =>
    update(d => ({ ...d, chapters: d.chapters.map(c => c.id === id ? { ...c, ...updates } : c) }));

  const deleteChapter = (id) =>
    update(d => ({
      ...d,
      chapters: d.chapters.filter(c => c.id !== id),
      tasks:    d.tasks.filter(t => t.chapterId !== id), // also delete child tasks
    }));

  const toggleChapterDone = (id) =>
    update(d => ({ ...d, chapters: d.chapters.map(c => c.id === id ? { ...c, done: !c.done } : c) }));

  const reorderChapters = (reordered) =>
    update(d => ({ ...d, chapters: d.chapters.map(c => reordered.find(r => r.id === c.id) || c) }));

  const reorderTasks = (reordered) =>
    update(d => {
      const ids = new Set(reordered.map(t => t.id));
      return { ...d, tasks: [...d.tasks.filter(t => !ids.has(t.id)), ...reordered] };
    });

  // ── Task actions ───────────────────────────────────────────────
  const addTask = (task) =>
    update(d => ({ ...d, tasks: [...d.tasks, { ...task, id: crypto.randomUUID(), examId, status: "Not Started" }] }));

  const completeTask = (id) =>
    update(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: "Done" } : t) }));

  const cancelTask = (id) =>
    update(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: "Cancelled" } : t) }));

  const resetTask = (id) =>
    update(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: "Not Started" } : t) }));

  const deleteTask = (id) =>
    update(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));

  const saveTask = (id, updates) =>
    update(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }));

  // ── Session actions ────────────────────────────────────────────
  const addSession = (session) =>
    update(d => ({ ...d, sessions: [...(d.sessions || []), { ...session, id: session.id || crypto.randomUUID() }] }));

  const deleteSession = (id) =>
    update(d => ({ ...d, sessions: (d.sessions || []).filter(s => s.id !== id) }));

  // ── Mistake actions ────────────────────────────────────────────
  const addMistake = (mistake) =>
    update(d => ({ ...d, mistakes: [...d.mistakes, { ...mistake, id: crypto.randomUUID(), resolved: false }] }));

  const toggleMistake = (id) =>
    update(d => ({ ...d, mistakes: d.mistakes.map(m => m.id === id ? { ...m, resolved: !m.resolved } : m) }));

  const editMistake = (id, updates) =>
    update(d => ({ ...d, mistakes: d.mistakes.map(m => m.id === id ? { ...m, ...updates } : m) }));

  const deleteMistake = (id) =>
    update(d => ({ ...d, mistakes: d.mistakes.filter(m => m.id !== id) }));

  // ── Window resize ──────────────────────────────────────────────
  useEffect(() => {
    const h = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Dots menu outside-click ────────────────────────────────────
  useEffect(() => {
    if (!showDotsMenu) return;
    const h = (e) => { if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target)) setShowDotsMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotsMenu]);

  // ── Zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    localStorage.setItem("appZoom", zoom);
  }, [zoom]);

  useEffect(() => {
    const handleZoomKey = (e) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 10) / 10));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1.15);
      }
    };
    document.addEventListener("keydown", handleZoomKey);
    return () => document.removeEventListener("keydown", handleZoomKey);
  }, []);

  // ── Tab keyboard shortcuts (T/C/M/P/A) ────────────────────────
  useEffect(() => {
    if (focusTask) return;
    const TAB_MAP = { t: "Tasks", c: "Topics", m: "Mistakes", p: "Practice", a: "Analytics" };
    const handleKey = (e) => {
      if (e.defaultPrevented) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
const target = TAB_MAP[e.key.toLowerCase()];
      if (target) { e.preventDefault(); setSubTab(target); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [focusTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error states ─────────────────────────────────────
  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.mut, fontSize: 14 }}>
      Loading...
    </div>
  );

  if (loadError) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.redL, fontSize: 14, padding: 24, textAlign: "center" }}>
      Error loading data: {loadError}
    </div>
  );

  if (visibleExams.length === 0) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "1.25rem", fontFamily: "system-ui, sans-serif", color: C.txt }}>
      <button style={btnP} onClick={() => setShowManage(true)}>+ Add your first exam</button>
    </div>
  );

  const pad = winW < 500 ? "0.5rem 0.75rem" : "1.25rem";
  const isPhoneLand = winW > winH && winH < 500;

  // ── Manage milestones: full-screen page ───────────────────────
  if (showManage) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: pad, fontFamily: "system-ui, sans-serif", color: C.txt, boxSizing: "border-box" }}>
      <ManageExams exams={data.exams} onSave={saveExams} onClose={() => setShowManage(false)} />
    </div>
  );

  // ── Focus mode: full-screen, hides all nav/chrome ─────────────
  if (focusTask) {
    const chap = data.chapters.find(c => c.id === focusTask.chapterId);
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: pad, fontFamily: "system-ui, sans-serif", color: C.txt, boxSizing: "border-box" }}>
        <FocusMode
          task={focusTask}
          chapName={chap?.name}
          onAddTask={addTask}
          onSaveTask={saveTask}
          onExit={() => setFocusTask(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: pad, fontFamily: "system-ui, sans-serif", color: C.txt, boxSizing: "border-box" }}>

      {/* Nav chrome hidden when practice session is active/done */}
      {!(subTab === "Practice" && practiceFullscreen) && (<>

      {isPhoneLand ? (<>
        {/* Phone landscape: single compact row — exam tabs + inline progress + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 6 }}>
          {/* Exam buttons — scrollable */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
            {visibleExams.map(ex => (
              <button
                key={ex.id}
                onClick={() => switchExam(ex.id)}
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
            {exam?.dueDate && <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap" }}>· {fmtRelDate(exam.dueDate)}</span>}
          </div>
          {/* Controls */}
          {saving && <span style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>Saving…</span>}
          <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 12, padding: "3px 8px", flexShrink: 0 }}>A−</button>
          <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 12, padding: "3px 8px", flexShrink: 0 }}>A+</button>
          <button onClick={() => setShowManage(v => !v)} style={{ ...btn, fontSize: 12, padding: "4px 12px", flexShrink: 0 }}>Edit</button>
        </div>
      </>) : (<>
        {/* Default: exam nav row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 10, flexWrap: "wrap" }}>
          {visibleExams.map(ex => (
            <button
              key={ex.id}
              onClick={() => switchExam(ex.id)}
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
                  <button onMouseDown={() => { setShowManage(v => !v); setShowDotsMenu(false); }}
                    style={{ ...btn, width: "100%", textAlign: "left", borderRadius: 0, border: "none", padding: "10px 14px", fontSize: 13 }}>
                    Edit milestones
                  </button>
                </div>
              )}
            </div>
          ) : (<>
            <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A−</button>
            <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A+</button>
            <button onClick={() => setShowManage(v => !v)} style={{ ...btn, fontSize: 12, padding: "4px 12px" }}>
              Edit milestones
            </button>
          </>)}
        </div>

        {/* Progress bar */}
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
          {examType === "project" ? (<>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: C.mut }}>
                <strong style={{ color: C.txt }}>{doneTasks.length}</strong>/{eligibleTasks.length} tasks
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: taskPct >= 80 ? C.grnL : C.txt }}>{taskPct}%</span>
              {exam?.dueDate && <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Due {fmtRelDate(exam.dueDate)}</span>}
            </div>
            <div style={{ height: 5, background: C.bdr, borderRadius: 3 }}>
              <div style={{ height: 5, width: `${taskPct}%`, background: taskPct >= 80 ? C.grn : C.blue, borderRadius: 3, transition: "width .3s" }} />
            </div>
          </>) : (<>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: C.mut }}>
                <strong style={{ color: C.txt }}>{doneHours}</strong>/{targetHours} hrs
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: hourPct >= 80 ? C.grnL : C.txt }}>{hourPct}%</span>
              {exam?.dueDate && <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Due {fmtRelDate(exam.dueDate)}</span>}
            </div>
            <div style={{ height: 5, background: C.bdr, borderRadius: 3 }}>
              <div style={{ height: 5, width: `${hourPct}%`, background: hourPct >= 80 ? C.grn : C.blue, borderRadius: 3, transition: "width .3s" }} />
            </div>
          </>)}
        </div>
      </>)}

      {/* Sub-tabs — horizontally scrollable on narrow screens */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {visibleTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            style={{
              flexShrink: 0,
              padding: "4px 11px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: subTab === tab ? C.sur  : "transparent",
              color:      subTab === tab ? C.txt  : C.dim,
              border:     subTab === tab ? `1px solid ${C.bdr2}` : "1px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      </>)}

      {/* Save error banner */}
      {saveError && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: C.redL }}>
          Save failed: {saveError}
        </div>
      )}

      {/* Tab content */}
      {subTab === "Tasks" && (
        <TasksTab
          examTasks={examTasks}
          examChapters={examChapters}
          onAddTask={addTask}
          chapters={data.chapters}
          onCompleteTask={completeTask}
          onCancelTask={cancelTask}
          onResetTask={resetTask}
          onDeleteTask={deleteTask}
          onSaveTask={saveTask}
          onFocus={setFocusTask}
          onReorderTasks={reorderTasks}
        />
      )}
      {subTab === "Topics" && (
        <TopicsTab
          examId={examId}
          chapters={data.chapters}
          tasks={data.tasks}
          onAddChapter={addChapter}
          onEditChapter={editChapter}
          onDeleteChapter={deleteChapter}
          onDoneToggleChapter={toggleChapterDone}
          onReorderChapters={reorderChapters}
          onReorderTasks={reorderTasks}
          onAddTask={addTask}
          onCompleteTask={completeTask}
          onCancelTask={cancelTask}
          onResetTask={resetTask}
          onDeleteTask={deleteTask}
          onSaveTask={saveTask}
          onFocus={setFocusTask}
        />
      )}
      {subTab === "Mistakes" && (
        <MistakesTab
          examId={examId}
          mistakes={data.mistakes}
          chapters={data.chapters}
          onAddMistake={addMistake}
          onToggleMistake={toggleMistake}
          onDeleteMistake={deleteMistake}
          onEditMistake={editMistake}
        />
      )}
      {subTab === "Practice" && (
        <PracticeTab
          examId={examId}
          chapters={data.chapters}
          sessions={(data.sessions || []).filter(s => s.examId === examId)}
          mistakes={data.mistakes}
          onAddMistake={addMistake}
          onAddSession={addSession}
          onDeleteSession={deleteSession}
          onModeChange={setPracticeFullscreen}
        />
      )}
      {subTab === "Analytics" && (
        <AnalyticsTab
          examId={examId}
          exam={exam}
          doneHours={doneHours}
          chapters={data.chapters}
          sessions={(data.sessions || []).filter(s => s.examId === examId)}
          mistakes={data.mistakes}
          tasks={examTasks}
        />
      )}
    </div>
  );
}