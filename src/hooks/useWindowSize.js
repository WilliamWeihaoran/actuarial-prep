import { useState, useEffect } from "react";
export function useWindowSize() {
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [winH, setWinH] = useState(() => window.innerHeight);
  useEffect(() => {
    const h = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { winW, winH };
}
