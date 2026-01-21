import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string; // e.g. "09:00～12:00", "9:00"
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
};

const padTime = (v: string) => {
  const t = v.trim();
  if (!t) return "";
  const [h, m] = t.split(":");
  if (!h || !m) return t;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
};

const parseInitial = (value: string | undefined): { from: string; to: string } => {
  const v = (value ?? "").trim();
  if (!v) return { from: "", to: "" };
  const m = v.match(/^(\d{1,2}:\d{2})\s*～\s*(\d{1,2}:\d{2})$/);
  if (m) return { from: padTime(m[1]), to: padTime(m[2]) };
  const one = v.match(/^(\d{1,2}:\d{2})$/);
  if (one) return { from: padTime(one[1]), to: "" };
  // その他文字列はそのまま扱いづらいので空にして編集させる（デモ）
  return { from: "", to: "" };
};

export const TimeRangeEditModal: React.FC<Props> = ({
  open,
  title = "時間 変更（デモ）",
  initialValue,
  onClose,
  onConfirm
}) => {
  const initial = useMemo(() => parseInitial(initialValue), [initialValue]);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  useEffect(() => {
    if (!open) return;
    setFrom(initial.from);
    setTo(initial.to);
  }, [open, initial.from, initial.to]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const preview = from && to ? `${padTime(from)}～${padTime(to)}` : from ? padTime(from) : "";
  const canConfirm = Boolean(from.trim());

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(520px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            「○○:○○～○○:○○」の時間を変更するデモモーダルです。開始だけ入力の場合は単一時刻として反映します。
          </p>
          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>開始</label>
              <input className="filter-input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>終了</label>
              <input className="filter-input" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
            反映プレビュー: <span style={{ fontWeight: 800 }}>{preview || "（未入力）"}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(preview)}
          >
            変更
          </button>
        </div>
      </div>
    </div>
  );
};

