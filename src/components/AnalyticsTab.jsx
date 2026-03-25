import { useState, useRef } from "react";
import { C } from "../constants";

const fmtDuration = (s) => {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}m`;
};

const scoreColor = (s) => s >= 70 ? C.grnL : s >= 50 ? C.ambL : C.redL;
const scoreBg    = (s) => s >= 70 ? C.grn  : s >= 50 ? C.amb  : C.red;

// Parse YYYY-MM-DD safely without timezone issues
function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

// Get start-of-day date string for filter
function filterCutoff(filter) {
  const d = new Date();
  if (filter === "today") { d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
  if (filter === "week")  { d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }
  if (filter === "month") { d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }
  return null;
}

function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsTab({ examId, exam, doneHours = 0, chapters, sessions, mistakes, tasks = [] }) {
  const [timeFilter, setTimeFilter] = useState("all"); // all | today | week | month
  const printRef = useRef(null);

  const today       = new Date().toISOString().slice(0, 10);
  const cutoff      = filterCutoff(timeFilter);
  const filteredSessions = cutoff ? sessions.filter(s => s.date >= cutoff) : sessions;

  const examChapters = chapters.filter(c => c.examId === examId);
  const examMistakes = mistakes.filter(m => m.examId === examId);

  // ── Exam timeline (not affected by time filter) ────────────────
  const targetHours = exam?.targetHours || 100;
  const dueDate     = exam?.dueDate;
  const dueObj      = parseDate(dueDate);
  const todayObj    = parseDate(today);
  const daysLeft    = dueObj ? daysBetween(todayObj, dueObj) : null;
  const weeksLeft   = daysLeft !== null ? Math.max(0, daysLeft / 7) : null;
  const hoursLeft   = Math.max(0, targetHours - doneHours);
  const neededPace  = weeksLeft > 0 ? Math.round(hoursLeft / weeksLeft * 10) / 10 : null;

  // Recent pace: hours from sessions in last 7 days
  const lastWeekCutoff = dateOffset(7);
  const recentSessHours = sessions.filter(s => s.date >= lastWeekCutoff).reduce((sum, s) => sum + (s.duration || 0) / 3600, 0);
  const recentPace = Math.round(recentSessHours * 10) / 10;

  const onTrack = neededPace !== null && recentPace >= neededPace;
  const hasTracking = daysLeft !== null && daysLeft > 0;

  // ── Study streak (all sessions, any time) ──────────────────────
  const allStudyDates = new Set(sessions.map(s => s.date));
  let streak = 0;
  {
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().slice(0, 10);
      if (!allStudyDates.has(dateStr)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // ── Filtered session stats ─────────────────────────────────────
  const totalSessions = filteredSessions.length;
  const avgScore      = totalSessions > 0
    ? Math.round(filteredSessions.reduce((s, x) => s + (x.score || 0), 0) / totalSessions)
    : null;
  const totalTime    = filteredSessions.reduce((s, x) => s + (x.duration || 0), 0);
  const totalMistakes  = examMistakes.length;
  const resolvedCount  = examMistakes.filter(m => m.resolved).length;
  const resolveRate    = totalMistakes > 0 ? Math.round(resolvedCount / totalMistakes * 100) : null;

  // ── Score trend chart ──────────────────────────────────────────
  const W = 460, H = 130;
  const pL = 30, pR = 12, pT = 12, pB = 22;
  const iW = W - pL - pR, iH = H - pT - pB;

  const pts = filteredSessions.map((s, i) => ({
    x: pL + (filteredSessions.length > 1 ? i / (filteredSessions.length - 1) : 0.5) * iW,
    y: pT + (1 - (s.score || 0) / 100) * iH,
    score: s.score || 0,
    name: s.name,
  }));
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // ── Score distribution ─────────────────────────────────────────
  const scoreBuckets = [
    { label: "< 50%",  min: 0,  max: 50,  color: C.redL,  bg: C.redBg  },
    { label: "50–70%", min: 50, max: 70,  color: C.ambL,  bg: C.ambBg  },
    { label: "≥ 70%",  min: 70, max: 101, color: C.grnL,  bg: C.grnBg  },
  ].map(b => ({
    ...b,
    count: filteredSessions.filter(s => (s.score || 0) >= b.min && (s.score || 0) < b.max).length,
  }));
  const maxBucket = Math.max(...scoreBuckets.map(b => b.count), 1);

  // ── Last 14-day activity ───────────────────────────────────────
  const last14 = Array.from({ length: 14 }, (_, i) => dateOffset(13 - i));
  const sessByDay = {};
  sessions.forEach(s => { sessByDay[s.date] = (sessByDay[s.date] || 0) + 1; });
  const maxDaySess = Math.max(...last14.map(d => sessByDay[d] || 0), 1);

  // ── Confidence accuracy ────────────────────────────────────────
  const newSessions = filteredSessions.filter(s => s.grid?.length > 0 && typeof s.grid[0] === "object");
  let confStats = null;
  if (newSessions.length > 0) {
    const agg = { confident: { correct: 0, total: 0 }, unsure: { correct: 0, total: 0 }, none: { correct: 0, total: 0 } };
    newSessions.forEach(s => {
      s.grid.forEach(q => {
        if (q.correct === null) return;
        const key = q.confidence === 1 ? "confident" : q.confidence === 2 ? "unsure" : "none";
        agg[key].total++;
        if (q.correct) agg[key].correct++;
      });
    });
    confStats = agg;
  }

  // ── Mistakes by topic ──────────────────────────────────────────
  const byTopic = {};
  examChapters.forEach(c => { byTopic[c.name] = { total: 0, resolved: 0 }; });
  examMistakes.forEach(m => {
    const key = m.topic || "Other";
    if (!byTopic[key]) byTopic[key] = { total: 0, resolved: 0 };
    byTopic[key].total++;
    if (m.resolved) byTopic[key].resolved++;
  });
  const topicRows = Object.entries(byTopic).filter(([, v]) => v.total > 0).sort(([, a], [, b]) => b.total - a.total);
  const maxCount  = topicRows.length > 0 ? topicRows[0][1].total : 1;

  // ── Weakest areas ──────────────────────────────────────────────
  // For each topic: open mistakes + practice accuracy (if < 70%)
  const topicScores = {};
  examChapters.forEach(c => { topicScores[c.name] = { open: 0, sessions: [], name: c.name }; });
  examMistakes.forEach(m => {
    const key = m.topic || "Other";
    if (!topicScores[key]) topicScores[key] = { open: 0, sessions: [], name: key };
    if (!m.resolved) topicScores[key].open++;
  });
  sessions.filter(s => s.type === "topic" && s.topic && s.score != null).forEach(s => {
    if (!topicScores[s.topic]) topicScores[s.topic] = { open: 0, sessions: [], name: s.topic };
    topicScores[s.topic].sessions.push(s.score);
  });
  const weakestAreas = Object.values(topicScores)
    .map(t => {
      const avgAcc = t.sessions.length > 0
        ? Math.round(t.sessions.reduce((a, b) => a + b, 0) / t.sessions.length)
        : null;
      const score = t.open * 2 + (avgAcc != null && avgAcc < 70 ? (70 - avgAcc) : 0);
      return { ...t, avgAcc, score };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // ── Avg time per Q trend (sessions with qTimes) ─────────────────
  const timedSessions = sessions.filter(s => s.qTimes?.some(t => t > 0));
  const timePerQTrend = timedSessions.slice(-12).map(s => {
    const secs = s.qTimes.filter(t => t > 0);
    const avg  = secs.length > 0 ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length / 1000) : 0;
    return { name: s.name, avg };
  });
  const maxTrendSec = Math.max(...timePerQTrend.map(s => s.avg), 1);

  // ── Most-missed Q# ─────────────────────────────────────────────
  const missedByQNum = {};
  sessions.forEach(s => {
    if (!s.grid || !s.startFrom) return;
    s.grid.forEach((q, i) => {
      const correct = typeof q === "object" ? q.correct : (q === 2 ? false : q === 1 ? true : null);
      if (correct === false) {
        const qNum = (s.startFrom || 1) + i;
        missedByQNum[qNum] = (missedByQNum[qNum] || 0) + 1;
      }
    });
  });
  const mostMissed = Object.entries(missedByQNum)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([qNum, count]) => ({ qNum: parseInt(qNum), count }));
  const maxMissedCount = mostMissed.length > 0 ? mostMissed[0].count : 1;

  // ── Chapter completion ─────────────────────────────────────────
  const chapDone  = examChapters.filter(c => c.done).length;
  const chapTotal = examChapters.length;

  // ── Time breakdown ─────────────────────────────────────────────
  const examTasks     = tasks.filter(t => examChapters.some(c => c.id === t.chapterId));
  const practiceTimeH = filteredSessions.reduce((s, x) => s + (x.duration || 0) / 3600, 0);
  const taskTimeH     = examTasks.reduce((s, t) => s + (t.actualHours || 0), 0);
  const totalTimeH    = practiceTimeH + taskTimeH;

  // Time by topic
  const timeByTopic = {};
  examChapters.forEach(c => { timeByTopic[c.name] = 0; });
  examTasks.forEach(t => {
    const chap = examChapters.find(c => c.id === t.chapterId);
    if (chap) timeByTopic[chap.name] = (timeByTopic[chap.name] || 0) + (t.actualHours || 0);
  });
  filteredSessions.forEach(s => {
    if (s.type === "topic" && s.topic) {
      timeByTopic[s.topic] = (timeByTopic[s.topic] || 0) + (s.duration || 0) / 3600;
    }
  });
  const topicTimeRows = Object.entries(timeByTopic).filter(([, h]) => h > 0).sort(([, a], [, b]) => b - a);
  const maxTopicH = topicTimeRows.length > 0 ? topicTimeRows[0][1] : 1;

  const handleExport = () => window.print();

  return (
    <div>
      {/* Time filter + export */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.dim }}>Period:</span>
        {[["all", "All time"], ["month", "This month"], ["week", "This week"], ["today", "Today"]].map(([val, label]) => (
          <button key={val} onClick={() => setTimeFilter(val)}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
              background: timeFilter === val ? C.sur2 : "transparent",
              color:      timeFilter === val ? C.txt  : C.dim,
              border:     `1px solid ${timeFilter === val ? C.bdr2 : "transparent"}`,
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleExport}
          style={{ fontSize: 11, padding: "3px 12px", borderRadius: 6, cursor: "pointer",
            background: C.sur2, color: C.mut, border: `1px solid ${C.bdr2}` }}>
          ⬇ Export PDF
        </button>
      </div>

      {/* ── Exam timeline ── */}
      {(dueDate || hoursLeft > 0) && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Exam progress</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: hasTracking ? 14 : 0 }}>
            {[
              daysLeft !== null && { label: daysLeft > 0 ? "Days left" : "Days past", value: Math.abs(daysLeft), color: daysLeft <= 7 ? C.redL : daysLeft <= 30 ? C.ambL : C.grnL },
              weeksLeft !== null && daysLeft > 0 && { label: "Weeks left", value: Math.round(weeksLeft * 10) / 10, color: C.txt },
              { label: "Hours logged", value: doneHours, color: C.blueL },
              { label: "Hours left",   value: Math.round(hoursLeft * 10) / 10, color: hoursLeft > 0 ? C.ambL : C.grnL },
              chapTotal > 0 && { label: "Topics done", value: `${chapDone}/${chapTotal}`, color: chapDone === chapTotal ? C.grnL : C.txt },
            ].filter(Boolean).map(({ label, value, color }) => (
              <div key={label} style={{ background: C.sur2, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {hasTracking && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {neededPace !== null && (
                <div style={{ fontSize: 12, color: C.dim }}>
                  Need <strong style={{ color: C.txt }}>{neededPace}h/week</strong> to finish
                </div>
              )}
              {recentPace > 0 && (
                <div style={{ fontSize: 12, color: C.dim }}>
                  Recent pace: <strong style={{ color: C.txt }}>{recentPace}h/week</strong>
                </div>
              )}
              {neededPace !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                  background: onTrack ? C.grnBg : C.redBg,
                  color:      onTrack ? C.grnL  : C.redL,
                  border:     `1px solid ${onTrack ? C.grn : C.red}`,
                }}>
                  {onTrack ? "On track" : "Behind pace"}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Summary stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Sessions",   value: totalSessions,                                        color: C.txt   },
          { label: "Avg score",  value: avgScore !== null ? `${avgScore}%` : "—",             color: avgScore !== null ? scoreColor(avgScore) : C.dim },
          { label: "Total time", value: totalTime > 0 ? fmtDuration(totalTime) : "—",         color: C.blueL },
          { label: "Mistakes",   value: totalMistakes,                                        color: totalMistakes > 0 ? C.redL : C.mut },
          { label: "Resolved",   value: resolveRate !== null ? `${resolveRate}%` : "—",       color: resolveRate !== null ? scoreColor(resolveRate) : C.dim },
          { label: "Streak",     value: streak > 0 ? `${streak}d` : "—",              color: streak >= 7 ? C.grnL : streak >= 3 ? C.ambL : C.txt,
            sub: streak >= 7 ? "on fire" : streak >= 3 ? "keep going" : streak > 0 ? "going" : "start today" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{label}</div>
            {sub && <div style={{ fontSize: 10, color, marginTop: 2, opacity: 0.7 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── 14-day activity heatmap ── */}
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>
          Activity — last 14 days
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          {last14.map(date => {
            const count = sessByDay[date] || 0;
            const pct   = count / maxDaySess;
            const isToday = date === today;
            const weekday = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
            const dayNum  = parseInt(date.slice(8));
            return (
              <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={`${date}: ${count} session${count !== 1 ? "s" : ""}`}
                  style={{
                    width: "100%", height: 60,
                    background: count === 0
                      ? C.sur2
                      : `rgba(37,99,235,${0.2 + pct * 0.8})`,
                    border: `1px solid ${isToday ? C.blueL : count > 0 ? C.blue : C.bdr}`,
                    borderRadius: 6,
                    display: "flex", alignItems: "flex-end", justifyContent: "center",
                    paddingBottom: 4,
                    position: "relative",
                  }}
                >
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", opacity: 0.9 }}>{count}</span>
                  )}
                </div>
                <div style={{ fontSize: 9, color: isToday ? C.blueL : C.dim, textAlign: "center", lineHeight: 1.2 }}>
                  <div>{weekday}</div>
                  <div>{dayNum}</div>
                </div>
              </div>
            );
          })}
        </div>
        {sessions.length === 0 && (
          <div style={{ textAlign: "center", color: C.dim, fontSize: 12, marginTop: 8 }}>No sessions yet.</div>
        )}
      </div>

      {/* ── Score trend ── */}
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>
          Score trend
          {timeFilter !== "all" && filteredSessions.length === 0 && (
            <span style={{ fontSize: 11, color: C.dim, marginLeft: 8 }}>no sessions in this period</span>
          )}
        </div>
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", color: C.dim, padding: "1.5rem", fontSize: 13 }}>No sessions yet.</div>
        ) : filteredSessions.length === 1 ? (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <span style={{ color: scoreColor(filteredSessions[0].score), fontSize: 28, fontWeight: 600 }}>{filteredSessions[0].score}%</span>
            <div style={{ marginTop: 4, color: C.dim, fontSize: 11 }}>{filteredSessions[0].name}</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <svg width={W} height={H} style={{ display: "block" }}>
              {[0, 25, 50, 70, 100].map(pct => {
                const y = pT + (1 - pct / 100) * iH;
                const isPass = pct === 70;
                return (
                  <g key={pct}>
                    <line x1={pL} y1={y} x2={W - pR} y2={y} stroke={isPass ? C.grn : C.bdr} strokeWidth={1} strokeDasharray={isPass ? "4 3" : "none"} opacity={isPass ? 0.7 : 1} />
                    <text x={pL - 4} y={y + 4} fill={isPass ? C.grnL : C.dim} fontSize={9} textAnchor="end" opacity={isPass ? 0.8 : 1}>{pct}</text>
                  </g>
                );
              })}
              <polyline points={polyline} fill="none" stroke={C.blue} strokeWidth={2} opacity={0.7} />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={5} fill={scoreBg(p.score)} stroke={scoreColor(p.score)} strokeWidth={2} />
                  <title>{p.name}: {p.score}%</title>
                  {(pts.length <= 12 || i % Math.ceil(pts.length / 12) === 0) && (
                    <text x={p.x} y={H - 5} fill={C.dim} fontSize={8} textAnchor="middle">{i + 1}</text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}
        {filteredSessions.length > 1 && (
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>x-axis = session # · dashed = 70% pass mark</div>
        )}
      </div>

      {/* ── Score distribution ── */}
      {filteredSessions.length > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Score distribution</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {scoreBuckets.map(b => (
              <div key={b.label} style={{ background: b.bg, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: b.color }}>{b.count}</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{b.label}</div>
                <div style={{ height: 4, background: C.bdr, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(b.count / maxBucket) * 100}%`, background: b.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confidence accuracy ── */}
      {confStats && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Accuracy by confidence</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { key: "confident", label: "Confident",  dot: C.grnL, bg: C.grnBg, bd: C.grn  },
              { key: "unsure",    label: "Unsure",     dot: C.ambL, bg: C.ambBg, bd: C.amb  },
              { key: "none",      label: "Unanswered", dot: C.dim,  bg: C.sur2,  bd: C.bdr2 },
            ].map(({ key, label, dot, bg, bd }) => {
              const { correct, total } = confStats[key];
              const pct = total > 0 ? Math.round(correct / total * 100) : null;
              return (
                <div key={key} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
                    <span style={{ fontSize: 11, color: C.mut }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: pct !== null ? scoreColor(pct) : C.dim }}>
                    {pct !== null ? `${pct}%` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{correct}/{total} correct</div>
                  {total > 0 && (
                    <div style={{ height: 4, background: C.bdr, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: dot, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Practice vs Study time ── */}
      {totalTimeH > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Time breakdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Practice sessions", value: practiceTimeH, color: C.ambL, bg: C.ambBg },
              { label: "Task study time",   value: taskTimeH,     color: C.blueL, bg: C.blueBg },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color }}>{Math.round(value * 10) / 10}h</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Stacked bar */}
          <div style={{ height: 10, background: C.bdr, borderRadius: 5, overflow: "hidden", display: "flex" }}>
            {practiceTimeH > 0 && (
              <div style={{ width: `${(practiceTimeH / totalTimeH) * 100}%`, background: C.ambL, borderRadius: "5px 0 0 5px" }} />
            )}
            {taskTimeH > 0 && (
              <div style={{ flex: 1, background: C.blue, borderRadius: practiceTimeH > 0 ? "0 5px 5px 0" : 5 }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: C.ambL }}>■ Practice {Math.round(practiceTimeH / totalTimeH * 100)}%</span>
            <span style={{ fontSize: 10, color: C.blueL }}>■ Study {Math.round(taskTimeH / totalTimeH * 100)}%</span>
          </div>
        </div>
      )}

      {/* ── Time by topic ── */}
      {topicTimeRows.length > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Time by topic</div>
          {topicTimeRows.map(([topic, hours], idx) => {
            const colors = [C.blueL, C.grnL, C.ambL, C.redL, C.mut];
            const col = colors[idx % colors.length];
            return (
              <div key={topic} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.txt }}>{topic}</span>
                  <span style={{ fontSize: 11, color: col }}>{Math.round(hours * 10) / 10}h</span>
                </div>
                <div style={{ height: 7, background: C.bdr, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(hours / maxTopicH) * 100}%`, background: col, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Mistakes by topic ── */}
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Mistakes by topic</div>
        {topicRows.length === 0 ? (
          <div style={{ textAlign: "center", color: C.dim, padding: "1.5rem", fontSize: 13 }}>No mistakes logged yet.</div>
        ) : (
          topicRows.map(([topic, { total, resolved }]) => {
            const unresolvedPct = (total - resolved) / maxCount * 100;
            const resolvedPct   = resolved / maxCount * 100;
            return (
              <div key={topic} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: C.txt }}>{topic}</span>
                  <span style={{ fontSize: 11, color: C.dim }}>
                    {resolved > 0 && <span style={{ color: C.grnL }}>{resolved} resolved · </span>}
                    {total - resolved} open
                  </span>
                </div>
                <div style={{ height: 8, background: C.bdr, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${unresolvedPct + resolvedPct}%`, background: C.red, borderRadius: 4 }} />
                  {resolved > 0 && (
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${resolvedPct}%`, background: C.grn, borderRadius: 4 }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Weakest areas ── */}
      {weakestAreas.length > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 4 }}>Weakest areas</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>Based on open mistakes + practice accuracy below 70%</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {weakestAreas.map((t, rank) => (
              <div key={t.name} style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: "12px 14px", position: "relative" }}>
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 18, fontWeight: 700, color: C.red, opacity: 0.3 }}>#{rank + 1}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.redL, marginBottom: 6, paddingRight: 22 }}>{t.name}</div>
                {t.open > 0 && (
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 3 }}>
                    <span style={{ color: C.redL, fontWeight: 600 }}>{t.open}</span> open mistake{t.open > 1 ? "s" : ""}
                  </div>
                )}
                {t.avgAcc != null && (
                  <div style={{ fontSize: 11, color: C.dim }}>
                    Avg accuracy: <span style={{ color: scoreColor(t.avgAcc) }}>{t.avgAcc}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Avg time per Q trend ── */}
      {timePerQTrend.length > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 4 }}>Avg time per question (keyboard-tracked)</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>Last {timePerQTrend.length} sessions with per-Q timing · bar = seconds</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
            {timePerQTrend.map((s, i) => {
              const pct = s.avg / maxTrendSec;
              const label = s.avg >= 60 ? `${Math.floor(s.avg/60)}m${s.avg%60 > 0 ? `${s.avg%60}s` : ""}` : `${s.avg}s`;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                  <div style={{ fontSize: 9, color: C.dim, lineHeight: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div title={`${s.name}: ${label}/Q`}
                      style={{ width: "100%", height: `${Math.max(pct * 100, 8)}%`, background: C.blue, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>x-axis = session order (most recent on right)</div>
        </div>
      )}

      {/* ── Most-missed Q# ── */}
      {mostMissed.length > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 12 }}>Most-missed question numbers</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {mostMissed.map(({ qNum, count }) => {
              const intensity = count / maxMissedCount;
              const bg = `rgba(153,60,29,${0.15 + intensity * 0.65})`;
              const bd = `rgba(240,149,117,${0.2 + intensity * 0.6})`;
              return (
                <div key={qNum} title={`Q${qNum}: missed ${count}×`}
                  style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.redL }}>Q{qNum}</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{count}×</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
