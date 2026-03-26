import { C } from "../../constants";

const scoreColor = (s) => s >= 70 ? C.grnL : s >= 50 ? C.ambL : C.redL;
const scoreBg    = (s) => s >= 70 ? C.grn  : s >= 50 ? C.amb  : C.red;

export default function ScoreChart({ filteredSessions, timeFilter }) {
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

  return (
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
  );
}
