// Color palette — all dark mode values
export const C = {
  bg:     "#0f1117",
  sur:    "#1a1d27",
  sur2:   "#20232f",
  bdr:    "#2e3348",
  bdr2:   "#424762",
  txt:    "#e2e8f0",
  mut:    "#aab8cc",
  dim:    "#8898ae",
  blue:   "#2563eb",
  blueL:  "#7eb8f7",
  blueBg: "#1e2d45",
  blueBd: "#2d5a8f",
  grn:    "#3B6D11",
  grnL:   "#97c459",
  grnBg:  "#1a2e12",
  red:    "#993C1D",
  redL:   "#f09575",
  redBg:  "#3d1a12",
  amb:    "#854F0B",
  ambL:   "#efc06a",
  ambBg:  "#3d2d0a",
};

// Priority options with their display colors
export const PRIO = [
  { l: "High",   bg: C.redBg, c: C.redL, ab: "#5a2010", ab2: C.redL   },
  { l: "Medium", bg: C.ambBg, c: C.ambL, ab: "#5a3d10", ab2: C.ambL   },
  { l: "Low",    bg: C.grnBg, c: C.grnL, ab: "#1a3d10", ab2: C.grnL   },
];

// Relative date formatter — within ±6 days shows relative label, otherwise absolute
const _MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const _DL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export function fmtRelDate(val) {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  const date  = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((date - today) / 86400000);
  if (diff ===  0) return "Today";
  if (diff ===  1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff >=  2 && diff <=  6) return _DL[date.getDay()];
  if (diff <= -2 && diff >= -6) return `Last ${_DL[date.getDay()]}`;
  return `${_MS[m - 1]} ${d}, ${y}`;
}

// Shared base styles reused across components
export const styles = {
  inp: {
    background:    C.sur2,
    border:        `1px solid ${C.bdr2}`,
    borderRadius:  8,
    color:         C.txt,
    padding:       "7px 10px",
    fontSize:      13,
    width:         "100%",
    boxSizing:     "border-box",
    outline:       "none",
  },
  btn: {
    background:   "transparent",
    border:       `1px solid ${C.bdr2}`,
    borderRadius: 8,
    color:        C.mut,
    padding:      "6px 14px",
    fontSize:     13,
    cursor:       "pointer",
  },
  btnP: {
    background:   C.blueBg,
    border:       `1px solid ${C.blueBd}`,
    borderRadius: 8,
    color:        C.blueL,
    padding:      "6px 16px",
    fontSize:     13,
    cursor:       "pointer",
    fontWeight:   500,
  },
};