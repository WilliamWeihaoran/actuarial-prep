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
  const [data, setData]         = useState(DEFAULT);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving]     = useState(false);

  // sha is GitHub's file version token — we need to pass it back on every write
  const shaRef      = useRef(null);
  // Always tracks the latest data so saves never use a stale closure
  const latestRef   = useRef(DEFAULT);
  // Whether a save is currently in-flight
  const isSavingRef = useRef(false);
  // Whether data changed while a save was in-flight (needs another save afterward)
  const dirtyRef    = useRef(false);

  // Load data from GitHub on first render
  useEffect(() => {
    (async () => {
      try {
        const { data: loaded, sha } = await loadData();
        shaRef.current = sha;
        const merged = { ...DEFAULT, ...loaded };
        latestRef.current = merged;
        setData(merged);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // flush() serializes saves: if a save is already running, it marks dirty and
  // the running save loop picks up the latest data afterward. This prevents
  // concurrent saves that would conflict on the sha token.
  const flush = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      do {
        dirtyRef.current = false;
        const newSha = await saveData(latestRef.current, shaRef.current);
        shaRef.current = newSha;
        setSaveError(null);
      } while (dirtyRef.current);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, []);

  // update() applies changes synchronously to latestRef and React state,
  // then triggers a serialized save.
  const update = useCallback((updaterFn) => {
    const next = updaterFn(latestRef.current);
    latestRef.current = next;
    setData(next);
    if (isSavingRef.current) {
      dirtyRef.current = true; // running save will re-save after it finishes
    } else {
      flush();
    }
  }, [flush]);

  return { data, update, loading, saving, loadError, saveError };
}