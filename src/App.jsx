import { useState, useEffect } from "react";
import { useData } from "./hooks/useData";
import { C, styles } from "./constants";
import ManageExams   from "./components/ManageExams";
import FocusMode     from "./components/FocusMode";
import TasksTab      from "./components/TasksTab";
import TopicsTab     from "./components/TopicsTab";
import MistakesTab   from "./components/MistakesTab";
import PracticeTab   from "./components/PracticeTab";
import AnalyticsTab  from "./components/AnalyticsTab";

const { btn, btnP } = styles;
const TABS = ["Tasks", "Topics", "Mistakes", "Practice", "Analytics"];

export default function App() {
  const { data, update, loading, saving, error } = useData();
  const [activeExamId, setActiveExamId]       = useState(null);
  const [subTab, setSubTab]                   = useState("Tasks");
  const [showManage, setShowManage]           = useState(false);
  const [focusTask, setFocusTask]             = useState(null);
  const [practiceFullscreen, setPracticeFullscreen] = useState(false);
  const [zoom, setZoom] = useState(() => parseFloat(localStorage.getItem("appZoom") || "1.15"));
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [winH, setWinH] = useState(() => window.innerHeight);

  // ── Derived state ──────────────────────────────────────────────
  const visibleExams = data.exams.filter(e => !e.archived);

  // Default to first exam once data loads
  const examId = activeExamId ?? visibleExams[0]?.id ?? null;
  const exam   = data.exams.find(e => e.id === examId);

  const examChapters = data.chapters.filter(c => c.examId === examId);
  const examTasks    = data.tasks.filter(t => t.examId === examId);

  const practiceHours = (data.sessions || [])
    .filter(s => s.examId === examId)
    .reduce((sum, s) => sum + (s.duration || 0) / 3600, 0);
  // Done tasks: use actual or estimated hours.
  // Active tasks with logged focus time: count their actualHours too (time already spent).
  const doneHours  = Math.round((
    examTasks.reduce((sum, t) => {
      if (t.status === "Done") return sum + (t.actualHours || t.hours);
      return sum + (t.actualHours || 0);
    }, 0) + practiceHours
  ) * 10) / 10;
  const targetHours = exam?.targetHours || 100;
  const hourPct    = Math.min(100, Math.round(doneHours / targetHours * 100));

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

  // ── Task actions ───────────────────────────────────────────────
  const addTask = (task) =>
    update(d => ({ ...d, tasks: [...d.tasks, { ...task, id: crypto.randomUUID(), examId, status: "Not Started" }] }));

  const cycleTask = (id) =>
    update(d => ({
      ...d,
      tasks: d.tasks.map(t => {
        if (t.id !== id) return t;
        const next = t.status === "Not Started" ? "In Progress" : t.status === "In Progress" ? "Done" : "Not Started";
        return { ...t, status: next };
      }),
    }));

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

  if (error) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.redL, fontSize: 14, padding: 24, textAlign: "center" }}>
      Error: {error}
    </div>
  );

  if (visibleExams.length === 0) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "1.25rem", fontFamily: "system-ui, sans-serif", color: C.txt }}>
      <button style={btnP} onClick={() => setShowManage(true)}>+ Add your first exam</button>
      {showManage && <ManageExams exams={data.exams} onSave={saveExams} onClose={() => setShowManage(false)} />}
    </div>
  );

  const pad = winW < 500 ? "0.5rem 0.75rem" : "1.25rem";
  const isPhoneLand = winW > winH && winH < 500;

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
            <span style={{ fontSize: 11, color: C.mut, whiteSpace: "nowrap" }}>
              <strong style={{ color: C.txt }}>{doneHours}</strong>/{targetHours}h
            </span>
            <div style={{ width: 48, height: 4, background: C.bdr, borderRadius: 2, flexShrink: 0 }}>
              <div style={{ height: 4, width: `${hourPct}%`, background: hourPct >= 80 ? C.grn : C.blue, borderRadius: 2, transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: hourPct >= 80 ? C.grnL : C.txt, whiteSpace: "nowrap" }}>{hourPct}%</span>
            {exam?.dueDate && <span style={{ fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>· {exam.dueDate}</span>}
          </div>
          {/* Controls */}
          {saving && <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>Saving…</span>}
          <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 10, padding: "2px 6px", flexShrink: 0 }}>A−</button>
          <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 10, padding: "2px 6px", flexShrink: 0 }}>A+</button>
          <button onClick={() => setShowManage(v => !v)} style={{ ...btn, fontSize: 11, padding: "3px 10px", flexShrink: 0 }}>Edit</button>
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
          <button onClick={() => setZoom(z => Math.max(0.75, Math.round((z - 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A−</button>
          <button onClick={() => setZoom(z => Math.min(1.5,  Math.round((z + 0.1) * 10) / 10))} style={{ ...btn, fontSize: 11, padding: "3px 8px" }}>A+</button>
          <button onClick={() => setShowManage(v => !v)} style={{ ...btn, fontSize: 12, padding: "4px 12px" }}>
            Edit projects
          </button>
        </div>

        {/* Hours bar */}
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: C.mut }}>
              <strong style={{ color: C.txt }}>{doneHours}</strong>/{targetHours} hrs
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: hourPct >= 80 ? C.grnL : C.txt }}>{hourPct}%</span>
            {exam?.dueDate && <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Due {exam.dueDate}</span>}
          </div>
          <div style={{ height: 5, background: C.bdr, borderRadius: 3 }}>
            <div style={{ height: 5, width: `${hourPct}%`, background: hourPct >= 80 ? C.grn : C.blue, borderRadius: 3, transition: "width .3s" }} />
          </div>
        </div>
      </>)}

      {/* Manage exams panel */}
      {showManage && <ManageExams exams={data.exams} onSave={saveExams} onClose={() => setShowManage(false)} />}

      {/* Sub-tabs — horizontally scrollable on narrow screens */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map(tab => (
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

      {/* Tab content */}
      {subTab === "Tasks" && (
        <TasksTab
          examTasks={examTasks}
          examChapters={examChapters}
          onAddTask={addTask}
          chapters={data.chapters}
          onCycleTask={cycleTask}
          onDeleteTask={deleteTask}
          onSaveTask={saveTask}
          onFocus={setFocusTask}
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
          onAddTask={addTask}
          onCycleTask={cycleTask}
          onDeleteTask={deleteTask}
          onSaveTask={saveTask}
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