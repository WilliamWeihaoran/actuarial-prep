import { C, fmtRelDate } from "../../constants";

export default function ProgressBar({ examType, doneHours, targetHours, hourPct, doneTasks, eligibleTasks, taskPct, dueDate }) {
  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
      {examType === "project" ? (<>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: C.mut }}>
            <strong style={{ color: C.txt }}>{doneTasks.length}</strong>/{eligibleTasks.length} tasks
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: taskPct >= 80 ? C.grnL : C.txt }}>{taskPct}%</span>
          {dueDate && <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Due {fmtRelDate(dueDate)}</span>}
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
          {dueDate && <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Due {fmtRelDate(dueDate)}</span>}
        </div>
        <div style={{ height: 5, background: C.bdr, borderRadius: 3 }}>
          <div style={{ height: 5, width: `${hourPct}%`, background: hourPct >= 80 ? C.grn : C.blue, borderRadius: 3, transition: "width .3s" }} />
        </div>
      </>)}
    </div>
  );
}
