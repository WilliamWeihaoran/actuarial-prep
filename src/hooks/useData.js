import { useState, useEffect, useRef, useCallback } from "react";
import { loadData, saveData } from "../lib/github";

// Default empty state — used only if data.json in GitHub is empty or missing keys
const DEFAULT = {
  exams: [],
  chapters: [],
  tasks: [],
  mistakes: [],
  sessions: [],
};

export function useData() {
  const [data, setData]       = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  // sha is GitHub's file version token — we need to pass it back on every write
  // to prevent overwriting someone else's changes (in our case, another device)
  const shaRef = useRef(null);

  // Load data from GitHub on first render
  useEffect(() => {
    (async () => {
      try {
        const { data: loaded, sha } = await loadData();
        shaRef.current = sha;
        // Merge loaded data with defaults so missing keys don't break the app
        setData({ ...DEFAULT, ...loaded });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // update() is the single function all components use to change data.
  // It takes an updater function (like setState), applies it to the current data,
  // saves to GitHub, and updates the local sha for the next write.
  const update = useCallback(async (updaterFn) => {
    setSaving(true);
    try {
      const next = updaterFn(data);
      setData(next); // optimistic update — UI responds immediately
      const newSha = await saveData(next, shaRef.current);
      shaRef.current = newSha; // store the new sha for the next save
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [data]);

  return { data, update, loading, saving, error };
}