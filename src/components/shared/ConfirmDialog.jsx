import { C, styles } from "../../constants";
const { btn } = styles;

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  danger       = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: C.sur2, border: `1px solid ${C.bdr2}`,
        borderRadius: 14, padding: "24px 28px",
        maxWidth: 380, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 8 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 13, color: C.mut, marginBottom: 22, lineHeight: 1.6 }}>
            {message}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...btn, padding: "8px 18px" }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...btn,
              padding: "8px 18px",
              background: danger ? C.redBg : C.blueBg,
              border: `1px solid ${danger ? C.red : "#2d5a8f"}`,
              color: danger ? C.redL : "#7eb8f7",
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
